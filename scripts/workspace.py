#!/usr/bin/env python3
"""
workspace.py — Toggle worker/lambda folders in a VS Code multi-root workspace.

Usage:
  ./workspace.sh                     # Interactive group picker
  ./workspace.sh core                # Core services only (hide all workers)
  ./workspace.sh reset               # Show all folders
  ./workspace.sh group <name>        # Show a specific worker domain group
  ./workspace.sh add <partial-name>  # Add a worker matching partial name

Groups and folders are read from config/repos.json (via repo_config.py) — the
same source of truth clone-repos.sh and pull-all.sh use. Edit config/repos.json
(by hand or via ./scripts/clone-repos.sh --select) to change what shows up here;
nothing in this file needs editing.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import repo_config

ROOT_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_FILE = ROOT_DIR / "ai-workspace.code-workspace"
WORKERS_DIR = ROOT_DIR / "codebase" / "workers"

# ── Worker domain groups — sourced from config/repos.json's "groups"/"repos" ──
WORKER_GROUPS = repo_config.groups()

GROUP_ORDER = list(WORKER_GROUPS.keys())

# ── Base workspace folders (always present) — core-tier repos from config/repos.json ──
BASE_FOLDERS = [
    {"name": "── AI Context ───", "path": "."},
    {"name": "📋 Specs", "path": "specs"},
] + [{"name": name, "path": f"codebase/{name}"} for name in repo_config.core_repos()]

WORKER_FOLDER = {"name": "Workers", "path": "codebase/workers"}

# ── Colors ──
GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
CYAN = "\033[0;36m"
RED = "\033[0;31m"
NC = "\033[0m"


def info(msg):
    print(f"{GREEN}[workspace]{NC} {msg}")


def warn(msg):
    print(f"{YELLOW}[workspace]{NC} {msg}")


def error(msg):
    print(f"{RED}[workspace]{NC} {msg}")


def read_workspace():
    with open(WORKSPACE_FILE) as f:
        return json.load(f)


def get_all_worker_dirs():
    if not WORKERS_DIR.is_dir():
        return []
    return sorted([d.name for d in WORKERS_DIR.iterdir() if d.is_dir()])


def get_current_workers():
    ws = read_workspace()
    settings = ws.get("settings", {})
    excludes = settings.get("files.exclude", {})
    all_dirs = get_all_worker_dirs()
    return [d for d in all_dirs if not excludes.get(d, False)]


def write_workspace(visible_workers):
    ws = read_workspace()
    settings = ws.get("settings", {})

    folders = list(BASE_FOLDERS)
    if visible_workers:
        folders.append(WORKER_FOLDER)

    old_excludes = settings.get("files.exclude", {})
    new_excludes = {}

    all_dirs = set(get_all_worker_dirs())
    managed_patterns = set()
    for d in all_dirs:
        managed_patterns.add(d)
        managed_patterns.add(f"codebase/workers/{d}")
    managed_patterns.add("codebase/workers")

    for pattern, value in old_excludes.items():
        if pattern not in managed_patterns:
            new_excludes[pattern] = value

    visible_set = set(visible_workers)
    if not visible_workers:
        new_excludes["codebase/workers"] = True
    else:
        for dirname in sorted(all_dirs):
            if dirname not in visible_set:
                new_excludes[dirname] = True
                new_excludes[f"codebase/workers/{dirname}"] = True

    settings["files.exclude"] = new_excludes
    ws_data = {"folders": folders, "settings": settings}

    with open(WORKSPACE_FILE, "w") as f:
        json.dump(ws_data, f, indent=2)
        f.write("\n")

    if visible_workers:
        info(f"Showing {len(visible_workers)} worker(s). VS Code will reload.")
    else:
        info("All workers hidden. VS Code will reload.")


def cmd_core():
    info("Core-only mode (no workers)")
    write_workspace([])


def cmd_reset():
    info("Resetting to all folders...")
    write_workspace(get_all_worker_dirs())


def cmd_group(group_name):
    if group_name not in WORKER_GROUPS:
        error(f"Unknown group: {group_name}")
        print("\nAvailable groups:")
        for name in GROUP_ORDER:
            print(f"  {CYAN}{name:<15}{NC} {WORKER_GROUPS[name]['desc']}")
        sys.exit(1)

    workers = list(WORKER_GROUPS[group_name]["workers"])
    info(f"Showing group: {group_name}")
    write_workspace(workers)


def cmd_add(partial_name):
    if not partial_name:
        error("Usage: ./workspace.sh add <worker-name>")
        sys.exit(1)

    matches = [
        d for d in get_all_worker_dirs() if partial_name.lower() in d.lower()
    ]
    if not matches:
        error(f"No worker folder matching: {partial_name}")
        sys.exit(1)

    current = set(get_current_workers())
    for m in matches:
        current.add(m)
        info(f"Adding: {m}")

    write_workspace(sorted(current))


def cmd_interactive():
    print(f"\n{CYAN}Toggle worker groups in workspace:{NC}\n")

    current_workers = set(get_current_workers())

    for i, name in enumerate(GROUP_ORDER, 1):
        group = WORKER_GROUPS[name]
        active = ""
        if any(w in current_workers for w in group["workers"]):
            active = f" {GREEN}✓{NC}"
        print(f"  {YELLOW}{i:>2}){NC} {CYAN}{name:<15}{NC} {group['desc']}{active}")

    core_idx = len(GROUP_ORDER) + 1
    all_idx = core_idx + 1

    print(f"\n  {YELLOW}{core_idx:>2}){NC} {CYAN}{'core-only':<15}{NC} Hide all workers")
    print(f"  {YELLOW}{all_idx:>2}){NC} {CYAN}{'all':<15}{NC} Show everything (reset)")
    print(f"\n  Pick groups (comma-separated, e.g. {CYAN}1,2{NC}): ", end="", flush=True)

    try:
        choices = input().strip()
    except (EOFError, KeyboardInterrupt):
        print()
        return

    if not choices:
        info("No changes.")
        return

    selected = []
    for pick in choices.split(","):
        pick = pick.strip()
        if not pick.isdigit():
            warn(f"Invalid choice: {pick}")
            continue
        pick = int(pick)
        if pick == core_idx:
            cmd_core()
            return
        if pick == all_idx:
            cmd_reset()
            return
        if 1 <= pick <= len(GROUP_ORDER):
            gname = GROUP_ORDER[pick - 1]
            selected.extend(WORKER_GROUPS[gname]["workers"])
            info(f"Including: {gname}")
        else:
            warn(f"Invalid choice: {pick}")

    seen = set()
    unique = [w for w in selected if not (w in seen or seen.add(w))]
    write_workspace(unique)


def main():
    args = sys.argv[1:]
    cmd = args[0] if args else ""

    if cmd == "core":
        cmd_core()
    elif cmd == "reset":
        cmd_reset()
    elif cmd == "group":
        cmd_group(args[1] if len(args) > 1 else "")
    elif cmd == "add":
        cmd_add(args[1] if len(args) > 1 else "")
    elif cmd == "":
        cmd_interactive()
    else:
        print("""Usage: ./workspace.sh [core|reset|group <name>|add <worker>]

Commands:
  (no args)       Interactive group picker
  core            Core services only (no workers)
  reset           Show all folders
  group <name>    Show a specific worker domain group
  add <name>      Add a worker to current workspace""")
        sys.exit(1)


if __name__ == "__main__":
    main()
