#!/usr/bin/env python3
"""Offline tests for admission of new approval-only PRs."""
from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

CHECKER = Path(__file__).resolve().parent / "validate_scope_approval.py"


def git(root, *args):
    return subprocess.run(["git", *args], cwd=root, capture_output=True, text=True, check=True).stdout.strip()


class ApprovalScopeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / "repo"
        self.root.mkdir()
        git(self.root, "init", "-q")
        git(self.root, "config", "user.name", "Guard")
        git(self.root, "config", "user.email", "guard@example.org")
        (self.root / "model.txt").write_text("step=old\nother=stable\n", encoding="utf-8")
        git(self.root, "add", ".")
        git(self.root, "commit", "-qm", "base")
        self.base = git(self.root, "rev-parse", "HEAD")
        self.approval_dir = self.root / ".change-control" / "approvals"
        self.approval_dir.mkdir(parents=True, exist_ok=True)
        self.approval_file = self.approval_dir / "test-approval.json"
        self.valid = {"replacements": [{
            "path": "model.txt", "old": "step=old", "new": "step=new"
        }]}

    def trial(self, data=None, extra=False, approval_id="test-approval"):
        self.approval_file.write_text(json.dumps(self.valid if data is None else data), encoding="utf-8")
        if extra:
            (self.root / "model.txt").write_text("step=old\nother=changed\n", encoding="utf-8")
        git(self.root, "add", "-A")
        git(self.root, "commit", "-qm", "candidate")
        head = git(self.root, "rev-parse", "HEAD")
        return subprocess.run([
            sys.executable, str(CHECKER), "--base", self.base,
            "--head", head, "--name", approval_id
        ], cwd=self.root, capture_output=True, text=True)

    def test_valid_approval_only_passes(self):
        result = self.trial()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("PASS", result.stdout)

    def test_extra_model_change_fails(self):
        result = self.trial(extra=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("FAIL", result.stdout)

    def test_invalid_schema_fails(self):
        result = self.trial(data={"replacements": [], "extra": True})
        self.assertNotEqual(result.returncode, 0)

    def test_unapproved_target_fails(self):
        result = self.trial(data={"replacements": [{
            "path": "tools/change_scope_guard.py", "old": "x", "new": "y"
        }]})
        self.assertNotEqual(result.returncode, 0)

    def test_missing_old_text_fails(self):
        result = self.trial(data={"replacements": [{
            "path": "model.txt", "old": "nonexistent", "new": "new"
        }]})
        self.assertNotEqual(result.returncode, 0)

    def test_duplicate_old_text_fails(self):
        result = self.trial(data={"replacements": [{
            "path": "model.txt", "old": "o", "new": "x"
        }]})
        self.assertNotEqual(result.returncode, 0)

    def test_wrong_approval_branch_id_fails(self):
        result = self.trial(approval_id="wrong-name")
        self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
