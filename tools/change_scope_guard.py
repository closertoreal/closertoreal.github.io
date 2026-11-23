#!/usr/bin/env python3
"""Strict guard: HEAD must equal BASE with only explicitly approved replacements."""
from __future__ import annotations
import argparse
import json
import subprocess
import sys
from pathlib import PurePosixPath

PROTECTED = (".github/", ".change-control/", "tools/change_scope_guard.py")


def git(*args: str) -> bytes:
    p = subprocess.run(["git", *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if p.returncode:
        raise ValueError(f"git {' '.join(args[:3])} failed: {p.stderr.decode('utf-8', 'replace').strip()}")
    return p.stdout


def manifest(rev: str) -> dict[str, tuple[str, str, str]]:
    result = {}
    raw = git("ls-tree", "-r", "-z", rev)
    for rec in raw.split(b"\0"):
        if not rec:
            continue
        attr, name = rec.split(b"\t", 1)
        mode, kind, sha = attr.decode("ascii").split(" ")
        path = name.decode("utf-8")
        result[path] = (mode, kind, sha)
    return result


def valid_path(p: str) -> bool:
    parts = PurePosixPath(p).parts
    return (p and not p.startswith("/") and "\\" not in p
            and all(x not in ("", ".", "..") for x in parts)
            and all(not p.startswith(prefix) for prefix in PROTECTED))


def run(base: str, head: str, spec_file: str) -> int:
    try:
        with open(spec_file, encoding="utf-8") as f:
            policy = json.load(f)
        if set(policy) != {"replacements"}:
            raise ValueError("Spec must contain only 'replacements'.")
        edits = policy["replacements"]
        if not isinstance(edits, list) or not edits:
            raise ValueError("At least one replacement must be approved.")
        mbase, mhead = manifest(base), manifest(head)
        expected = {}
        for i, e in enumerate(edits, start=1):
            if not isinstance(e, dict) or set(e) != {"path", "old", "new"}:
                raise ValueError(f"Replacement {i} must have path, old, new.")
            path, old, new = e["path"], e["old"], e["new"]
            if (not isinstance(path, str) or not valid_path(path)
                    or not isinstance(old, str) or not isinstance(new, str)
                    or not old or old == new):
                raise ValueError(f"Invalid replacement {i} (path/old/new).")
            if path not in mbase or mbase[path][1] != "blob" or mbase[path][0] != "100644":
                raise ValueError(f"Target file must be a regular tracked text file: {path}")
            if path not in expected:
                original = git("show", f"{base}:{path}")
                try:
                    expected[path] = original.decode("utf-8")
                except UnicodeDecodeError:
                    raise ValueError(f"Cannot edit non-UTF8 file: {path}") from None
            n = expected[path].count(old)
            if n != 1:
                raise ValueError(f"{path}: approved old text found {n} times (need exactly 1) at replacement {i}.")
            expected[path] = expected[path].replace(old, new, 1)

        all_paths = set(mbase) | set(mhead)
        unexpected = sorted(p for p in all_paths if p not in expected and mbase.get(p) != mhead.get(p))
        modified = sorted(p for p in expected if mbase.get(p) != mhead.get(p))
        if unexpected:
            print("FAIL: unapproved file changes:")
            for p in unexpected:
                print(" -", p)
        if set(modified) != set(expected):
            print("FAIL: approved replacements were not all applied:")
            for p in sorted(set(expected) - set(modified)):
                print(" -", p)
        mismatched = []
        for p, intended in expected.items():
            if p not in mhead or mhead[p][:2] != mbase[p][:2]:
                mismatched.append(p + " (missing file or changed mode)")
                continue
            actual = git("show", f"{head}:{p}")
            if actual != intended.encode("utf-8"):
                mismatched.append(p)
        if mismatched:
            print("FAIL: changed file differs from the exact approved result:")
            for p in mismatched:
                print(" -", p)
        if unexpected or mismatched or set(modified) != set(expected):
            return 1
        print(f"PASS: {len(edits)} exact replacement(s) in {len(expected)} file(s); all other tracked bytes/modes unchanged.")
        return 0
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        print(f"FAIL: {exc}")
        return 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--base", required=True, help="Trusted base Git commit")
    ap.add_argument("--head", required=True, help="Candidate Git commit")
    ap.add_argument("--spec", required=True, help="Approved JSON file obtained from the trusted base")
    args = ap.parse_args()
    sys.exit(run(args.base, args.head, args.spec))
