"""Tests for intake.py. Run: python3 -m unittest consulting/test_intake.py"""
import importlib.util
import json
import os
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
# Local test servers only: never route them through an HTTP proxy from the environment.
os.environ["no_proxy"] = os.environ["NO_PROXY"] = "127.0.0.1,localhost"


def load_intake(**env):
    for key in ("SMTP_PASSWORD", "SMTP_NO_TLS", "DATA_DIR", "NOTIFY_URL"):
        os.environ.pop(key, None)
    os.environ.update({"SMTP_USER": "charles@example.com", "SMTP_PASSWORD_FILE": "/nonexistent", **env})
    spec = importlib.util.spec_from_file_location("intake", os.path.join(HERE, "intake.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def valid_form(**overrides):
    form = {"name": "Dana Lee", "email": "dana@example.com", "role": "Clinician"}
    form.update({f"q{i}": f"answer {i}" for i in range(1, 11)})
    form.update(overrides)
    return form


class Notified(BaseHTTPRequestHandler):
    received = []

    def do_POST(self):
        Notified.received.append(json.loads(self.rfile.read(int(self.headers["Content-Length"]))))
        self.send_response(200)
        self.end_headers()

    def log_message(self, *args):
        pass


class IntakeTest(unittest.TestCase):
    def start(self, module):
        server = ThreadingHTTPServer(("127.0.0.1", 0), module.Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        return f"http://127.0.0.1:{server.server_address[1]}/api/intake"

    def post(self, url, payload):
        req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                     headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=5) as res:
                return res.status
        except urllib.error.HTTPError as e:
            return e.code

    def test_saves_and_accepts_when_email_is_not_configured(self):
        # The Oct 9 outage: no SMTP password. The lead must be kept, not dropped.
        data_dir = tempfile.mkdtemp()
        intake = load_intake(DATA_DIR=data_dir)
        self.assertEqual(self.post(self.start(intake), valid_form()), 200)
        path = os.path.join(data_dir, "submissions.jsonl")
        with open(path, encoding="utf-8") as f:
            records = [json.loads(line) for line in f]
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["email"], "dana@example.com")
        self.assertEqual(records[0]["q10"], "answer 10")
        self.assertTrue(records[0]["id"] and records[0]["received_at"])
        self.assertEqual(os.stat(path).st_mode & 0o777, 0o600)

    def test_rejects_when_neither_save_nor_email_works(self):
        intake = load_intake()  # no DATA_DIR, no SMTP password
        self.assertEqual(self.post(self.start(intake), valid_form()), 502)

    def test_accepts_when_email_works_but_save_does_not(self):
        intake = load_intake()
        intake.send = lambda data: None
        self.assertEqual(self.post(self.start(intake), valid_form()), 200)

    def test_notifies_webhook_with_saved_record(self):
        hook = ThreadingHTTPServer(("127.0.0.1", 0), Notified)
        threading.Thread(target=hook.serve_forever, daemon=True).start()
        self.addCleanup(hook.server_close)
        self.addCleanup(hook.shutdown)
        Notified.received = []
        intake = load_intake(DATA_DIR=tempfile.mkdtemp(),
                             NOTIFY_URL=f"http://127.0.0.1:{hook.server_address[1]}/webhook/ecm-intake")
        self.assertEqual(self.post(self.start(intake), valid_form()), 200)
        for _ in range(50):
            if Notified.received:
                break
            time.sleep(0.05)
        self.assertEqual(len(Notified.received), 1)
        self.assertEqual(Notified.received[0]["name"], "Dana Lee")
        self.assertIn("id", Notified.received[0])

    def test_unreachable_webhook_does_not_affect_the_visitor(self):
        intake = load_intake(DATA_DIR=tempfile.mkdtemp(), NOTIFY_URL="http://127.0.0.1:9/unreachable")
        self.assertEqual(self.post(self.start(intake), valid_form()), 200)

    def test_honeypot_and_validation(self):
        data_dir = tempfile.mkdtemp()
        url = self.start(load_intake(DATA_DIR=data_dir))
        self.assertEqual(self.post(url, valid_form(company="Spam Inc")), 200)
        self.assertEqual(self.post(url, valid_form(email="not-an-email")), 400)
        self.assertEqual(self.post(url, valid_form(q3="")), 400)
        self.assertFalse(os.path.exists(os.path.join(data_dir, "submissions.jsonl")))


if __name__ == "__main__":
    unittest.main()
