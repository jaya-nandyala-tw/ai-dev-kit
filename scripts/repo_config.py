#!/usr/bin/env python3
"""
repo_config.py — single reader for config/repos.json.

This is the one place that knows the shape of config/repos.json. Every other
script either imports this module (select-repos.py) or shells out to it as a
CLI (clone-repos.sh, pull-all.sh — both bash, kept dependency-free by going
through python3 rather than requiring jq).

CLI usage:
  repo_config.py org             # github.org value
  repo_config.py protocol        # github.protocol value ("ssh" or "https")
  repo_config.py core-repos      # core-tier repo names, one per line
  repo_config.py worker-repos    # worker-tier repo names, one per line
  repo_config.py all-paths       # codebase/<name> or codebase/workers/<name>, one per line
  repo_config.py dependency-paths-for-repo <path>  # configured ui/service layer paths
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


def all_paths(cfg=None):
    cfg = cfg or load()
    paths = []
    for r in cfg.get("repos", []):
        if r.get("tier") == "worker":
            paths.append(f"codebase/workers/{r['name']}")
        else:
            paths.append(f"codebase/{r['name']}")
    return paths


def dependency_paths_for_repo(path, cfg=None):
    if not path:
        sys.exit("✗ Usage: repo_config.py dependency-paths-for-repo <repo_path>")
    cfg = cfg or load()
    requested = Path(path).expanduser().resolve()
    matches = []
    for repo in cfg.get("repos", []):
        if not isinstance(repo, dict) or not isinstance(repo.get("name"), str):
            continue
        if repo.get("tier") not in ("core", "worker"):
            continue
        relative_repo = (
            Path("codebase") / "workers" / repo["name"]
            if repo["tier"] == "worker"
            else Path("codebase") / repo["name"]
        )
        if (ROOT_DIR / relative_repo).resolve() == requested:
            matches.append(repo)
    if len(matches) > 1:
        sys.exit(f"✗ Multiple config/repos.json entries resolve to repository path '{requested}'.")
    if not matches:
        return {}

    repo = matches[0]
    paths = {}
    for role in ("ui", "service"):
        configured = repo.get(role)
        if configured is None:
            paths[role] = None
            continue
        if (
            not isinstance(configured, str)
            or not configured.strip()
            or configured != configured.strip()
            or configured.startswith(("/", "~"))
            or "\\" in configured
            or any(ord(char) < 32 or ord(char) == 127 for char in configured)
        ):
            sys.exit(
                f"✗ config/repos.json repos[] entry '{repo['name']}' field "
                f"'{role}' must be a non-empty repository-relative path or null."
            )
        layer = Path(configured)
        if layer.is_absolute() or ".." in layer.parts:
            sys.exit(
                f"✗ config/repos.json repos[] entry '{repo['name']}' field '{role}' "
                "must stay inside the repository."
            )
        paths[role] = layer.as_posix()
    return paths


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    handlers = {
        "org": lambda: print(org()),
        "protocol": lambda: print(protocol()),
        "core-repos": lambda: print("\n".join(core_repos())),
        "worker-repos": lambda: print("\n".join(worker_repos())),
        "all-paths": lambda: print("\n".join(all_paths())),
        "dependency-paths-for-repo": lambda: print(
            json.dumps(dependency_paths_for_repo(sys.argv[2] if len(sys.argv) > 2 else ""))
        ),
    }
    if cmd not in handlers:
        sys.exit(f"Usage: repo_config.py [{'|'.join(handlers)}] [repo_path]")
    handlers[cmd]()


if __name__ == "__main__":
    main()
