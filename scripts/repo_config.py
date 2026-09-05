#!/usr/bin/env python3
"""
repo_config.py — single reader for config/repos.json.

This is the one place that knows the shape of config/repos.json. Every other
script either imports this module (workspace.py, select-repos.py) or shells
out to it as a CLI (clone-repos.sh, pull-all.sh — both bash, kept dependency-free
by going through python3 rather than requiring jq).

CLI usage:
  repo_config.py org             # github.org value
  repo_config.py protocol        # github.protocol value ("ssh" or "https")
  repo_config.py core-repos      # core-tier repo names, one per line
  repo_config.py worker-repos    # worker-tier repo names, one per line
  repo_config.py all-paths       # codebase/<name> or codebase/workers/<name>, one per line
"""
import json
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
CONFIG_FILE = ROOT_DIR / "config" / "repos.json"


def load():
    if not CONFIG_FILE.exists():
        sys.exit(
            f"✗ Missing {CONFIG_FILE}.\n"
            f"  Edit config/repos.json by hand, or run: ./scripts/clone-repos.sh --select"
        )
    with open(CONFIG_FILE) as f:
        return json.load(f)


def core_repos(cfg=None):
    cfg = cfg or load()
    return [r["name"] for r in cfg.get("repos", []) if r.get("tier") == "core"]


def worker_repos(cfg=None):
    cfg = cfg or load()
    return [r["name"] for r in cfg.get("repos", []) if r.get("tier") == "worker"]


def org(cfg=None):
    cfg = cfg or load()
    return cfg.get("github", {}).get("org", "")


def protocol(cfg=None):
    cfg = cfg or load()
    return cfg.get("github", {}).get("protocol", "ssh")


def groups(cfg=None):
    """Return {group_name: {"desc": str, "workers": [repo_name, ...]}} — matches the
    shape workspace.py's WORKER_GROUPS used to be hand-maintained as."""
    cfg = cfg or load()
    result = {name: {"desc": desc, "workers": []} for name, desc in cfg.get("groups", {}).items()}
    for r in cfg.get("repos", []):
        if r.get("tier") == "worker" and r.get("group"):
            result.setdefault(r["group"], {"desc": r["group"], "workers": []})
            result[r["group"]]["workers"].append(r["name"])
    return result


def all_paths(cfg=None):
    cfg = cfg or load()
    paths = []
    for r in cfg.get("repos", []):
        if r.get("tier") == "worker":
            paths.append(f"codebase/workers/{r['name']}")
        else:
            paths.append(f"codebase/{r['name']}")
    return paths


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    handlers = {
        "org": lambda: print(org()),
        "protocol": lambda: print(protocol()),
        "core-repos": lambda: print("\n".join(core_repos())),
        "worker-repos": lambda: print("\n".join(worker_repos())),
        "all-paths": lambda: print("\n".join(all_paths())),
    }
    if cmd not in handlers:
        sys.exit(f"Usage: repo_config.py [{'|'.join(handlers)}]")
    handlers[cmd]()


if __name__ == "__main__":
    main()
