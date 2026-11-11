#!/usr/bin/env python3
"""
select-repos.py — discover repos via the GitHub CLI and write your picks into
config/repos.json (the single source of truth read by clone-repos.sh and
pull-all.sh).

Usage:
  ./scripts/select-repos.py --org my-org                    # browse & multi-select from an org
  ./scripts/select-repos.py --org my-org --query billing    # filter by substring first
  ./scripts/select-repos.py --project 12 --owner my-org     # pull repos linked from a GitHub Project (v2)
  ./scripts/select-repos.py --org my-org --dry-run          # preview without writing

Requires the GitHub CLI installed and authenticated: https://cli.github.com/, then `gh auth login`.
This is the only script in this harness that talks to `gh` — everything else just reads the config
file this one writes. You can always skip this entirely and edit config/repos.json by hand instead.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
CONFIG_FILE = ROOT_DIR / "config" / "repos.json"


def die(msg):
    print(f"✗ {msg}", file=sys.stderr)
    sys.exit(1)


def validate_layer_path(path, repo_name, role):
    if path is None:
        return
    if (
        not isinstance(path, str)
        or not path.strip()
        or path != path.strip()
        or path.startswith(("/", "~"))
        or "\\" in path
        or any(ord(char) < 32 or ord(char) == 127 for char in path)
        or ".." in Path(path).parts
    ):
        die(
            f"Invalid {role} layer path for '{repo_name}': use a non-empty repository-relative "
            "path without '..' segments, or clear it with '-'."
        )


def check_gh():
    if subprocess.run(["which", "gh"], capture_output=True).returncode != 0:
        die("GitHub CLI ('gh') not found. Install it from https://cli.github.com/, then run "
            "'gh auth login'.")
    result = subprocess.run(["gh", "auth", "status"], capture_output=True, text=True)
    if result.returncode != 0:
        die("'gh' is installed but not authenticated. Run 'gh auth login' first.")


def fetch_org_repos(org, query=None):
    cmd = ["gh", "repo", "list", org, "--limit", "500",
           "--json", "name,description,isPrivate,updatedAt"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        die(f"Failed to list repos for org '{org}':\n{result.stderr.strip()}")
    repos = json.loads(result.stdout)
    if query:
        q = query.lower()
        repos = [r for r in repos if q in r["name"].lower() or q in (r.get("description") or "").lower()]
    return sorted(repos, key=lambda r: r["name"].lower())


def fetch_project_repos(project_number, owner):
    """GitHub Projects (v2) items don't always carry a clean 'repository' field — this
    best-effort extracts the repo name from the linked issue/PR's content URL."""
    cmd = ["gh", "project", "item-list", str(project_number), "--owner", owner,
           "--format", "json", "--limit", "500"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        die(f"Failed to list items for project {project_number} (owner {owner}):\n{result.stderr.strip()}")
    data = json.loads(result.stdout)
    seen = {}
    for item in data.get("items", []):
        content = item.get("content", {})
        url = content.get("url", "")
        name = None
        parts = url.split("/")
        if "github.com" in parts:
            idx = parts.index("github.com")
            if len(parts) > idx + 2:
                name = parts[idx + 2]
        if name and name not in seen:
            seen[name] = {"name": name, "description": content.get("title", "")}
    if not seen:
        die("No repos could be resolved from that project's items. GitHub Projects (v2) items "
            "don't always link a repository cleanly — use --org instead.")
    return sorted(seen.values(), key=lambda r: r["name"].lower())


def prompt_multiselect(repos):
    print(f"\nFound {len(repos)} repo(s):\n")
    for i, r in enumerate(repos, 1):
        desc = f" — {r['description']}" if r.get("description") else ""
        print(f"  {i:>3}) {r['name']}{desc}")
    print("\nSelect repos to add: comma-separated numbers, ranges (e.g. 1,3,5-8), or 'all'.")
    try:
        raw = input("> ").strip()
    except (EOFError, KeyboardInterrupt):
        print()
        return []
    if not raw:
        return []
    if raw.lower() == "all":
        return repos
    picks = set()
    for chunk in raw.split(","):
        chunk = chunk.strip()
        if "-" in chunk:
            lo, hi = chunk.split("-", 1)
            if lo.strip().isdigit() and hi.strip().isdigit():
                picks.update(range(int(lo), int(hi) + 1))
        elif chunk.isdigit():
            picks.add(int(chunk))
    return [repos[i - 1] for i in sorted(picks) if 1 <= i <= len(repos)]


def prompt_tier(selected, existing_entries):
    print("\nFor each repo: core service (always cloned) or worker/lambda (cloned unless "
          "--core-only)?")
    default = input("Default for all — [c]ore or [w]orker? (Enter = w): ").strip().lower() or "w"
    existing_by_name = {r["name"]: r for r in existing_entries}
    entries = []
    for r in selected:
        existing = existing_by_name.get(r["name"], {})
        tier_in = input(
            f"  {r['name']} [c/w] (Enter = {existing.get('tier', default)}): "
        ).strip().lower() or existing.get("tier", default)
        tier = "core" if tier_in.startswith("c") else "worker"
        entry = {"name": r["name"], "tier": tier}
        for role in ("ui", "service"):
            current = existing.get(role)
            default_path = current if isinstance(current, str) else ""
            answer = input(
                f"    {role} layer path relative to repo (Enter = "
                f"{default_path or 'none'}, '-' = clear): "
            ).strip()
            entry[role] = None if answer == "-" else answer if answer else (default_path or None)
            validate_layer_path(entry[role], r["name"], role)
        entries.append(entry)
    return entries


def load_config():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            cfg = json.load(f)
    else:
        cfg = {"github": {"org": "", "protocol": "ssh"}, "repos": []}
    for role in ("ui", "service"):
        legacy_path = cfg.pop(role, None)
        if legacy_path is None:
            continue
        if not isinstance(legacy_path, str) or not legacy_path.strip():
            die(f"Legacy top-level '{role}' must be a repository path or null.")
        resolved_legacy_path = Path(legacy_path).expanduser()
        if not resolved_legacy_path.is_absolute():
            resolved_legacy_path = ROOT_DIR / resolved_legacy_path
        resolved_legacy_path = resolved_legacy_path.resolve()
        matches = []
        for repo in cfg.get("repos", []):
            repo_path = (
                ROOT_DIR / "codebase" / "workers" / repo["name"]
                if repo.get("tier") == "worker"
                else ROOT_DIR / "codebase" / repo["name"]
            )
            if repo_path.resolve() == resolved_legacy_path:
                matches.append(repo)
        if len(matches) != 1:
            die(
                f"Could not migrate legacy top-level '{role}' path '{legacy_path}' to one "
                "configured repo. Set the role path inside the matching repos[] entry manually."
            )
        if role not in matches[0]:
            matches[0][role] = "."
    return cfg


def save_config(cfg):
    CONFIG_FILE.parent.mkdir(exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(cfg, f, indent=2)
        f.write("\n")


def merge(cfg, new_entries, org):
    if org:
        cfg.setdefault("github", {})["org"] = org
    by_name = {r["name"]: r for r in cfg.get("repos", [])}
    for e in new_entries:
        by_name[e["name"]] = {**by_name.get(e["name"], {}), **e}
    cfg["repos"] = list(by_name.values())
    return cfg


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--org", help="GitHub org to browse repos from")
    p.add_argument("--query", help="Filter org repos by substring in name/description")
    p.add_argument("--project", type=int, help="GitHub Project (v2) number to pull repos from")
    p.add_argument("--owner", help="Owner (user or org login) of --project")
    p.add_argument("--dry-run", action="store_true", help="Print the result, don't write config/repos.json")
    args = p.parse_args()

    if not args.org and not args.project:
        die("Pass --org <org> to browse an org's repos, or --project <number> --owner <owner> "
            "for a GitHub Project.")

    check_gh()

    if args.project:
        if not args.owner:
            die("--project requires --owner")
        repos = fetch_project_repos(args.project, args.owner)
    else:
        repos = fetch_org_repos(args.org, args.query)

    if not repos:
        die("No repos matched.")

    cfg = load_config()
    selected = prompt_multiselect(repos)
    if not selected:
        print("Nothing selected — config/repos.json left unchanged.")
        return

    entries = prompt_tier(selected, cfg.get("repos", []))
    cfg = merge(cfg, entries, args.org)

    if args.dry_run:
        print("\n--dry-run — would write config/repos.json:\n")
        print(json.dumps(cfg, indent=2))
        return

    save_config(cfg)
    print(f"\n✓ Wrote {len(entries)} repo(s) to config/repos.json")
    print("  Run ./scripts/clone-repos.sh to clone them.")


if __name__ == "__main__":
    main()
