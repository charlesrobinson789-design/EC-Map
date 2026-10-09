"""Executive Capacity intake: receives the landing-page form and emails it to INTAKE_TO.

Standard library only. Behind Caddy at POST /api/intake. Env:
  SMTP_HOST (default smtp.hostinger.com), SMTP_PORT (465 = SSL), SMTP_USER, SMTP_PASSWORD,
  INTAKE_TO (recipient), SMTP_STARTTLS=1 for port 587, SMTP_NO_TLS=1 for local testing only.
"""
import json
import os
import re
import smtplib
import ssl
import time
from email.message import EmailMessage
from email.utils import formataddr
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.hostinger.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
INTAKE_TO = os.environ.get("INTAKE_TO", SMTP_USER)

QUESTIONS = [
    ("q1", "Practice or business, and who you serve"),
    ("q2", "Weekly hours on admin and operations"),
    ("q3", "Task that drains the most energy"),
    ("q4", "Where things slip through the cracks"),
    ("q5", "Tools running the business today"),
    ("q6", "Comfort with AI tools (1-5)"),
    ("q7", "Set up with Claude and Hostinger"),
    ("q8", "One workflow to run on its own in six weeks"),
    ("q9", "Can commit ~3 focused hours a week"),
    ("q10", "What would make it an unmistakable win"),
]
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MAX_BODY = 32_000
RATE_LIMIT, RATE_WINDOW = 5, 3600  # submissions per IP per hour
hits = {}


def rate_limited(ip):
    now = time.time()
    recent = [t for t in hits.get(ip, []) if now - t < RATE_WINDOW]
    hits[ip] = recent + [now]
    return len(recent) >= RATE_LIMIT


def clean(value, limit):
    return re.sub(r"[\r\x00]", "", str(value or "")).strip()[:limit]


def send(data):
    msg = EmailMessage()
    msg["Subject"] = f"New Executive Capacity intake: {data['name']} ({data['role']})"
    msg["From"] = formataddr(("Executive Capacity Map", SMTP_USER))
    msg["To"] = INTAKE_TO
    msg["Reply-To"] = formataddr((data["name"], data["email"]))
    lines = [f"Name: {data['name']}", f"Email: {data['email']}", f"Role: {data['role']}", ""]
    for i, (key, label) in enumerate(QUESTIONS, start=1):
        lines += [f"{i}. {label}", data[key], ""]
    lines.append("Reply to this email to respond directly.")
    msg.set_content("\n".join(lines))

    if os.environ.get("SMTP_NO_TLS") == "1":
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as s:
            if SMTP_USER:
                s.login(SMTP_USER, SMTP_PASSWORD)
            s.send_message(msg)
    elif os.environ.get("SMTP_STARTTLS") == "1":
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as s:
            s.starttls(context=ssl.create_default_context())
            s.login(SMTP_USER, SMTP_PASSWORD)
            s.send_message(msg)
    else:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ssl.create_default_context(), timeout=20) as s:
            s.login(SMTP_USER, SMTP_PASSWORD)
            s.send_message(msg)


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.reply(200, {"ok": True}) if self.path == "/healthz" else self.reply(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/api/intake":
            return self.reply(404, {"error": "not found"})
        ip = (self.headers.get("X-Forwarded-For") or self.client_address[0]).split(",")[0].strip()
        if rate_limited(ip):
            return self.reply(429, {"error": "rate limited"})
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self.reply(400, {"error": "invalid size"})
        try:
            raw = json.loads(self.rfile.read(length))
        except ValueError:
            return self.reply(400, {"error": "invalid json"})
        if not isinstance(raw, dict):
            return self.reply(400, {"error": "invalid json"})
        if raw.get("company"):  # honeypot: humans never fill this
            return self.reply(200, {"ok": True})
        data = {k: clean(raw.get(k), 200) for k in ("name", "email", "role")}
        data.update({k: clean(raw.get(k), 1500) for k, _ in QUESTIONS})
        missing = [k for k, v in data.items() if not v]
        if missing or not EMAIL_RE.match(data["email"]):
            return self.reply(400, {"error": "missing or invalid fields", "fields": missing})
        try:
            send(data)
        except Exception as e:  # noqa: BLE001 - report any SMTP failure as 502, keep details in logs
            print(f"intake send failed: {type(e).__name__}: {e}", flush=True)
            return self.reply(502, {"error": "could not send"})
        print("intake sent", flush=True)
        self.reply(200, {"ok": True})

    def log_message(self, fmt, *args):
        pass  # no access logs: they would contain visitor IPs


if __name__ == "__main__":
    print(f"intake listening on :8000, delivering to {INTAKE_TO or '(INTAKE_TO not set)'}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
