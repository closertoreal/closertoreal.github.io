#!/usr/bin/env python3
"""Run a real-site model-change scenario against an isolated temporary Git repository.

This test NEVER modifies the production website or checks in altered model content.
"""
from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
GUARD = ROOT / "tools" / "change_scope_guard.py"
SITE = ROOT / "new" / "index.html"


def git(repo: Path, *args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=repo, check=True, text=True,
        capture_output=True,
    ).stdout.strip()


class RealSiteChangeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.repo = Path(self.tmp.name) / "candidate"
        self.repo.mkdir()
        git(self.repo, "init", "-q")
        git(self.repo, "config", "user.email", "tests@example.org")
        git(self.repo, "config", "user.name", "Scope Guard CI")
        self.copy = self.repo / "new" / "index.html"
        self.copy.parent.mkdir()
        self.original = SITE.read_text(encoding="utf-8")
        self.copy.write_text(self.original, encoding="utf-8")
        git(self.repo, "add", ".")
        git(self.repo, "commit", "-qm", "baseline")
        self.base = git(self.repo, "rev-parse", "HEAD")
        model_line = next(line for line in self.original.splitlines() if line.startswith("const MODEL="))
        self.model = json.loads(model_line[len("const MODEL="):].rstrip(";"))
        step = next(s for s in self.model["steps"] if str(s["code"]) == "17")
        old = '"input":' + json.dumps(step["input"], ensure_ascii=False, separators=(",", ":"))
        changed = step["input"] + "\n[ТЕСТ: НЕ ПУБЛИКОВАТЬ]"
        new = '"input":' + json.dumps(changed, ensure_ascii=False, separators=(",", ":"))
        self.assertEqual(self.original.count(old), 1, "Real step-17 input is not unique")
        self.expected = self.original.replace(old, new, 1)
        self.approval = Path(self.tmp.name) / "approved.json"
        self.approval.write_text(json.dumps({"replacements": [{
            "path": "new/index.html", "old": old, "new": new
        }]}, ensure_ascii=False), encoding="utf-8")

    def check(self, source: str):
        self.copy.write_text(source, encoding="utf-8")
        git(self.repo, "add", ".")
        git(self.repo, "commit", "-qm", "candidate")
        head = git(self.repo, "rev-parse", "HEAD")
        return subprocess.run([
            sys.executable, str(GUARD), "--base", self.base,
            "--head", head, "--spec", str(self.approval)
        ], cwd=self.repo, capture_output=True, text=True)

    def test_real_site_step_17_single_field_passes(self):
        result = self.check(self.expected)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("PASS", result.stdout)

    def test_real_site_extra_change_in_same_html_is_rejected(self):
        self.assertIn("<title>", self.original)
        candidate = self.expected.replace("<title>", "<title>НЕСОГЛАСОВАННО: ", 1)
        result = self.check(candidate)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("FAIL", result.stdout)


if __name__ == "__main__":
    unittest.main()
