#!/usr/bin/env python3
"""Apply a CRM blueprint (email groups, templates, segments, pipelines, sequences) to a LeadCMS instance.

Idempotent: records are matched by name; missing ones are created, existing ones are left alone.
Templates marked "replace": true are always brought in line with the blueprint (system emails).
--update also overwrites every other template's subject/body from the blueprint.

Usage (from crm/):
  python3 blueprint/apply.py                       # reads .env, targets http://127.0.0.1:8080
  python3 blueprint/apply.py --dry-run
  python3 blueprint/apply.py --blueprint blueprint/ecmap.json --url https://crm.example.com
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))


def load_env(path):
    env = {}
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


class Api:
    def __init__(self, base, dry_run=False):
        self.base = base.rstrip("/")
        self.token = None
        self.dry_run = dry_run

    def call(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base + path, data=data, method=method)
        req.add_header("Content-Type", "application/json")
        if self.token:
            req.add_header("Authorization", "Bearer " + self.token)
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                raw = res.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="replace")[:500]
            raise SystemExit(f"{method} {path} -> {e.code}: {detail}")

    def write(self, method, path, body):
        if self.dry_run:
            print(f"    (dry-run) {method} {path}")
            return {"id": -1}
        return self.call(method, path, body)

    def login(self, email, password):
        self.token = self.call("POST", "/api/identity/login", {"email": email, "password": password})["token"]

    def find(self, path, **match):
        for item in self.call("GET", path) or []:
            if all(item.get(k) == v for k, v in match.items()):
                return item
        return None


def ensure_subscribable(group_id, name, dry_run, note):
    """/api/subscribe/confirm requires an email_schedule row for the group, and LeadCMS has no API
    to create one. The row is only a subscription anchor (nothing sends from it), so insert it directly."""
    if dry_run or group_id == -1:
        print(f"    (dry-run) ensure email_schedule for {name}")
        return
    sql = ("INSERT INTO email_schedule (schedule, group_id, created_at, source) "
           f"SELECT '{{}}', {int(group_id)}, now(), 'blueprint' "
           f"WHERE NOT EXISTS (SELECT 1 FROM email_schedule WHERE group_id = {int(group_id)}) RETURNING id;")
    out = subprocess.run(
        ["docker", "compose", "exec", "-T", "postgres", "psql", "-qtA", "-U", "postgres", "-d", "leadcms", "-c", sql],
        cwd=os.path.join(HERE, ".."), capture_output=True, text=True)
    if out.returncode != 0:
        raise SystemExit(f"email_schedule insert failed for {name}: {out.stderr.strip()}")
    note("subscription anchor", name, "created" if out.stdout.strip() else "unchanged")


def same_rules(current, wanted):
    """Compare segment definitions by their (field, operator, value) rules only, ignoring ids and casing."""
    def flat(d, side):
        group = (d or {}).get(side) or {}
        return sorted((str(r.get("fieldId")).lower(), str(r.get("operator")).lower(), str(r.get("value")))
                      for r in group.get("rules") or [])
    return all(flat(current, side) == flat(wanted, side) for side in ("includeRules", "excludeRules"))


def tag_rules(tags, prefix):
    return [{"id": f"{prefix}-{i}", "fieldId": "tags", "operator": "Contains", "value": t} for i, t in enumerate(tags)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--blueprint", default=os.path.join(HERE, "ecmap.json"))
    ap.add_argument("--env", default=os.path.join(HERE, "..", ".env"))
    ap.add_argument("--url", default="http://127.0.0.1:8080")
    ap.add_argument("--update", action="store_true", help="overwrite subject/body of all blueprint templates")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    bp = json.load(open(args.blueprint, encoding="utf-8"))
    env = load_env(args.env)
    lang = bp.get("language", "en")
    sender = bp["sender"]

    api = Api(args.url, args.dry_run)
    api.login(env["DEFAULTUSERS__0__EMAIL"], env["DEFAULTUSERS__0__PASSWORD"])
    summary = {"created": 0, "updated": 0, "unchanged": 0}

    def note(kind, name, action):
        summary[action] += 1
        print(f"  [{action}] {kind}: {name}")

    print("Email groups")
    groups = {}
    for g in bp["emailGroups"]:
        found = api.find("/api/email-groups", name=g["name"], language=lang)
        if found:
            note("group", g["name"], "unchanged")
        else:
            found = api.write("POST", "/api/email-groups", {"name": g["name"], "language": lang})
            note("group", g["name"], "created")
        groups[g["key"]] = found["id"]
        if g.get("subscribable"):
            ensure_subscribable(found["id"], g["name"], args.dry_run, note)

    print("Email templates")
    templates = {}
    for t in bp["templates"]:
        body = {
            "name": t["name"], "subject": t["subject"], "bodyTemplate": t["body"],
            "fromEmail": sender["fromEmail"], "fromName": sender["fromName"],
            "language": lang, "emailGroupId": groups[t["group"]],
        }
        found = api.find("/api/email-templates", name=t["name"], language=lang)
        if not found:
            found = api.write("POST", "/api/email-templates", body)
            note("template", t["name"], "created")
        elif t.get("replace") or args.update:
            api.write("PATCH", f"/api/email-templates/{found['id']}", body)
            note("template", t["name"], "updated")
        else:
            note("template", t["name"], "unchanged")
        templates[t["key"]] = found["id"]

    # Segments are routing logic (who gets which sequence), so the blueprint owns them: definitions are
    # re-synced on every run. Build ad-hoc segments in the admin UI under different names.
    print("Segments")
    segments = {}
    for s in bp["segments"]:
        definition = {"includeRules": {"id": "include", "connector": "Or", "rules": tag_rules(s["anyTags"], "inc"), "groups": []}}
        if s.get("noneTags"):
            definition["excludeRules"] = {"id": "exclude", "connector": "Or", "rules": tag_rules(s["noneTags"], "exc"), "groups": []}
        found = api.find("/api/segments", name=s["name"])
        if not found:
            found = api.write("POST", "/api/segments", {
                "name": s["name"], "description": s.get("description"), "type": "Dynamic", "definition": definition,
            })
            note("segment", s["name"], "created")
        elif same_rules(found.get("definition"), definition) and found.get("description") == s.get("description"):
            note("segment", s["name"], "unchanged")
        else:
            api.write("PATCH", f"/api/segments/{found['id']}", {"description": s.get("description"), "definition": definition})
            note("segment", s["name"], "updated")
        segments[s["key"]] = found["id"]

    print("Deal pipelines")
    for p in bp["pipelines"]:
        found = api.find("/api/deal-pipelines", name=p["name"])
        if found:
            note("pipeline", p["name"], "unchanged")
        else:
            found = api.write("POST", "/api/deal-pipelines", {"name": p["name"]})
            note("pipeline", p["name"], "created")
        existing = {} if args.dry_run and found["id"] == -1 else {
            s["name"]: s for s in api.call("GET", "/api/deal-pipeline-stages") or [] if s.get("dealPipelineId") == found["id"]
        }
        for order, stage in enumerate(p["stages"], start=1):
            if stage in existing:
                note("stage", f"{p['name']} / {stage}", "unchanged")
            else:
                api.write("POST", "/api/deal-pipeline-stages", {"name": stage, "dealPipelineId": found["id"], "order": order})
                note("stage", f"{p['name']} / {stage}", "created")

    print("Sequences")
    for q in bp["sequences"]:
        found = api.find("/api/sequences", name=q["name"])
        if found:
            note("sequence", q["name"], "unchanged")
            continue
        steps = [{
            "name": f"Step {i}: {next(t['name'] for t in bp['templates'] if t['key'] == st['template'])}",
            "emailTemplateId": templates[st["template"]], "type": "Email",
            "timing": {"delay": {"value": st["delay"][0], "unit": st["delay"][1]}},
        } for i, st in enumerate(q["steps"], start=1)]
        created = api.write("POST", "/api/sequences", {
            "name": q["name"], "description": q.get("description"), "language": lang,
            "stopOnReply": q.get("stopOnReply", True), "useContactTimeZone": False, "timeZone": 0,
            "enrollment": {"modes": ["segment", "api", "manual"],
                           "includeSegmentIds": [segments[k] for k in q["segments"]],
                           "reentryPolicy": "OnceEver"},
            "steps": steps,
        })
        api.write("POST", f"/api/sequences/{created['id']}/activate", None)
        note("sequence", q["name"] + " (activated)", "created")

    print(f"\nDone: {summary['created']} created, {summary['updated']} updated, {summary['unchanged']} unchanged.")


if __name__ == "__main__":
    sys.exit(main())
