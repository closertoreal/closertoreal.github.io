#!/usr/bin/env python3
"""Validate a *new* trusted approval without permitting any site or guard changes.

Used only for setup/approval-<id> branches. The approved JSON is added to master
after the user's manual decision to merge the approval-only PR.
"""
from __future__ import annotations

import argparse
import json
import re
import sys

from change_scope_guard import git, manifest, valid_path

APPROVAL_ID_RE = re.compile(r"^[a-z][a-z0-9-]{2,63}$")
MAX_REPLACEMENTS = 20


def check(base: str, head: str, approval_id: str) -> int:
    try:
        if not APPROVAL_ID_RE.fullmatch(approval_id):
            raise ValueError("Invalid approval ID")
        approved_path = f".change-control/approvals/{approval_id}.json"
        before, after = manifest(base), manifest(head)
        if approved_path in before:
            raise ValueError("Approval already exists in trusted base; editing approvals is forbidden")
        changed = {p for p in set(before) | set(after) if before.get(p) != after.get(p)}
        if changed != {approved_path}:
            raise ValueError(
                "Approval PR must add exactly one approval JSON; actual changed files: "
                + ", ".join(sorted(changed))
            )
        if after.get(approved_path, ())[:2] != ("100644", "blob"):
            raise ValueError("Approval must be a regular JSON file")
        data = git("show", f"{head}:{approved_path}")
        if len(data) > 256_000:
            raise ValueError("Approval JSON is too large")
        approval = json.loads(data.decode("utf-8"))
        if not isinstance(approval, dict) or set(approval) != {"replacements"}:
            raise ValueError("Approval must have only the 'replacements' key")
        replacements = approval["replacements"]
        if not isinstance(replacements, list) or not (1 <= len(replacements) <= MAX_REPLACEMENTS):
            raise ValueError(f"Allowed replacement count: 1..{MAX_REPLACEMENTS}")
        expected_text = {}
        for idx, item in enumerate(replacements, 1):
            if not isinstance(item, dict) or set(item) != {"path", "old", "new"}:
                raise ValueError(f"Entry {idx} must contain only path, old, new")
            path, old, new = item["path"], item["old"], item["new"]
            if (not isinstance(path, str) or not valid_path(path) or
                    not isinstance(old, str) or not isinstance(new, str) or
                    not old or old == new):
                raise ValueError(f"Invalid exact replacement {idx}")
            if path not in before or before[path][:2] != ("100644", "blob"):
                raise ValueError(f"Target must be a regular tracked text file: {path}")
            if path not in expected_text:
                raw = git("show", f"{base}:{path}")
                try:
                    expected_text[path] = raw.decode("utf-8")
                except UnicodeDecodeError:
                    raise ValueError(f"Target is not UTF-8: {path}") from None
            if expected_text[path].count(old) != 1:
                raise ValueError(
                    f"{path}: source text must appear exactly once in approved target (entry {idx})"
                )
            expected_text[path] = expected_text[path].replace(old, new, 1)
        print(
            f"PASS: approval-only PR adds {approved_path}; "
            f"{len(replacements)} well-formed exact replacement(s), "
            f"no changes to website, scripts or workflows."
        )
        return 0
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        print(f"FAIL: {exc}")
        return 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--head", required=True)
    parser.add_argument("--name", required=True)
    options = parser.parse_args()
    sys.exit(check(options.base, options.head, options.name))
