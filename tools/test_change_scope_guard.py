#!/usr/bin/env python3
"""Offline regression tests for the exact-change guard. Run: python3 -m unittest discover -s tools -p 'test_change_scope_guard.py' -v"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

GUARD = Path(__file__).resolve().parent / "change_scope_guard.py"


def git(cwd, *args):
    r = subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True, text=True)
    return r.stdout.strip()


class ScopeGuardTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.repo = Path(self.tmp.name)
        git(self.repo, "init", "-q")
        git(self.repo, "config", "user.name", "Test")
        git(self.repo, "config", "user.email", "test@example.org")
        (self.repo / "model.txt").write_text("title=old\ninput=unchanged\n", encoding="utf-8")
        (self.repo / "other.txt").write_text("protected content\n", encoding="utf-8")
        git(self.repo, "add", ".")
        git(self.repo, "commit", "-qm", "base")
        self.base = git(self.repo, "rev-parse", "HEAD")
        self.spec = self.repo / "approved.json"
        self.spec.write_text(json.dumps({"replacements": [
            {"path": "model.txt", "old": "title=old", "new": "title=new"}
        ]}), encoding="utf-8")

    def commit(self):
        git(self.repo, "add", "-A")
        git(self.repo, "commit", "-qm", "candidate")
        return git(self.repo, "rev-parse", "HEAD")

    def check(self, head):
        return subprocess.run(
            [sys.executable, str(GUARD), "--base", self.base, "--head", head, "--spec", str(self.spec)],
            cwd=self.repo, capture_output=True, text=True, check=False,
        )

    def test_exact_change_passes(self):
        (self.repo / "model.txt").write_text("title=new\ninput=unchanged\n", encoding="utf-8")
        run = self.check(self.commit())
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        self.assertIn("PASS", run.stdout)

    def test_unapproved_change_in_same_file_fails(self):
        (self.repo / "model.txt").write_text("title=new\ninput=rewritten\n", encoding="utf-8")
        self.assertNotEqual(self.check(self.commit()).returncode, 0)

    def test_unapproved_other_file_fails(self):
        (self.repo / "model.txt").write_text("title=new\ninput=unchanged\n", encoding="utf-8")
        (self.repo / "other.txt").write_text("changed\n", encoding="utf-8")
        self.assertNotEqual(self.check(self.commit()).returncode, 0)

    def test_new_file_fails(self):
        (self.repo / "model.txt").write_text("title=new\ninput=unchanged\n", encoding="utf-8")
        (self.repo / "unexpected.txt").write_text("surprise\n", encoding="utf-8")
        self.assertNotEqual(self.check(self.commit()).returncode, 0)

    def test_deleted_file_fails(self):
        (self.repo / "model.txt").write_text("title=new\ninput=unchanged\n", encoding="utf-8")
        (self.repo / "other.txt").unlink()
        self.assertNotEqual(self.check(self.commit()).returncode, 0)

    def test_unchanged_file_fails(self):
        # A commit changing only unrelated content must not pass as completed approved edit
        (self.repo / "other.txt").write_text("changed\n", encoding="utf-8")
        self.assertNotEqual(self.check(self.commit()).returncode, 0)

    def test_ambiguous_old_text_fails(self):
        (self.repo / "model.txt").write_text("title=new\ninput=unchanged\n", encoding="utf-8")
        self.spec.write_text(json.dumps({"replacements": [
            {"path": "model.txt", "old": "n", "new": "x"}
        ]}), encoding="utf-8")
        self.assertNotEqual(self.check(self.commit()).returncode, 0)

    def test_protected_workflow_cannot_be_approved(self):
        (self.repo / "model.txt").write_text("title=new\ninput=unchanged\n", encoding="utf-8")
        self.spec.write_text(json.dumps({"replacements": [
            {"path": ".github/workflows/change-scope-guard.yml", "old": "a", "new": "b"}
        ]}), encoding="utf-8")
        self.assertNotEqual(self.check(self.commit()).returncode, 0)

    def test_modified_spec_in_pr_fails(self):
        (self.repo / "model.txt").write_text("title=new\ninput=unchanged\n", encoding="utf-8")
        spec_in_repo = self.repo / ".change-control" / "approvals"
        spec_in_repo.mkdir(parents=True, exist_ok=True)
        (spec_in_repo / "pr-99.json").write_text('{"replacements":[]}', encoding="utf-8")
        self.assertNotEqual(self.check(self.commit()).returncode, 0)


if __name__ == "__main__":
    unittest.main()
