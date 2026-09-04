#!/usr/bin/env python3
"""
Generic Lambda/worker debug runner.

Given any file inside a worker repo, this script:
  1. Walks up directory ancestors until it finds a `setup.cfg` (the worker root).
  2. Discovers the package directory (the one containing `main.py`).
  3. Runs in one of two modes:
       pytest  — full test suite for that worker (breakpoints in test and source files work)
       invoke  — calls lambda_handler directly with a JSON event (breakpoints in handler work)

Event resolution for invoke mode (first match wins):
  --event <path>                     explicit path supplied via launch config
  <worker_root>/debug_event.json     per-worker sample event (git-ignored by convention)
  {}                                 empty event as last resort

Usage (wired automatically by VS Code launch configs):
  python scripts/debug_lambda.py <any_file_in_worker> [--mode pytest|invoke] [--event path.json]

GENERICIZED TEMPLATE — fill in _TABLE_ENV_KEYS below with your own DynamoDB
table-name env vars if you use moto to stub tables for offline invoke mode.
If your workers use a different datastore, adjust _start_moto_mock accordingly.
"""

import argparse
import glob
import importlib
import json
import os
import subprocess
import sys
import tempfile

# ---------------------------------------------------------------------------
# Discovery helpers
# ---------------------------------------------------------------------------


def find_lambda_root(start_path):
    """Walk up from start_path until a directory with setup.cfg is found."""
    path = os.path.abspath(start_path)
    if os.path.isfile(path):
        path = os.path.dirname(path)
    while True:
        if os.path.exists(os.path.join(path, "setup.cfg")):
            return path
        parent = os.path.dirname(path)
        if parent == path:
            return None
        path = parent


def find_package_name(lambda_root):
    """Return the name of the sub-directory inside lambda_root containing main.py."""
    _skip = {"dist", "build", "test", "tests", ".git", ".github"}
    for entry in sorted(os.scandir(lambda_root), key=lambda e: e.name):
        if (
            entry.is_dir()
            and not entry.name.startswith(".")
            and not entry.name.startswith("_")
            and entry.name not in _skip
        ):
            if os.path.exists(os.path.join(entry.path, "main.py")):
                return entry.name
    return None


# ---------------------------------------------------------------------------
# Dependency bootstrap
# ---------------------------------------------------------------------------


def _add_venv_site_packages(venv_dir):
    for sp in sorted(glob.glob(os.path.join(venv_dir, "lib", "python*", "site-packages")), reverse=True):
        if sp not in sys.path:
            sys.path.insert(0, sp)


def _ensure_lambda_deps(lambda_root):
    """
    Ensure the worker's dependencies are on sys.path before importing.

    Resolution order:
      1. Reuse <lambda_root>/.venv if it already exists.
      2. Create a fresh .venv and install requirements.txt / requirements_dev.txt
         (lines with unresolved '${' tokens, e.g. private package URLs, are skipped),
         falling back to a setup.cfg editable install.

    If you have a shared library repo (a "layer") that workers import from
    source rather than a packaged dependency, add it to sys.path here — see
    the commented example.
    """
    # Example: a sibling shared-library repo resolved from source instead of a
    # packaged dependency:
    # shared_lib_root = os.path.normpath(os.path.join(lambda_root, "..", "<shared-lib-repo>"))
    # if os.path.isdir(shared_lib_root) and shared_lib_root not in sys.path:
    #     sys.path.insert(0, shared_lib_root)

    venv_dir = os.path.join(lambda_root, ".venv")

    if os.path.isdir(venv_dir):
        _add_venv_site_packages(venv_dir)
        print(f"Deps       : {venv_dir} (reusing existing venv)")
        return

    print(f"Deps       : creating .venv in {lambda_root} ...")
    subprocess.run([sys.executable, "-m", "venv", venv_dir], check=True)
    pip = os.path.join(venv_dir, "bin", "pip")

    req_txt = os.path.join(lambda_root, "requirements.txt")
    req_dev_txt = os.path.join(lambda_root, "requirements_dev.txt")
    setup_cfg = os.path.join(lambda_root, "setup.cfg")

    if os.path.isfile(req_txt):
        subprocess.run([pip, "install", "-q", "-r", req_txt], check=True)
        print("Deps       : installed runtime deps (requirements.txt)")

    if os.path.isfile(req_dev_txt):
        installable = []
        with open(req_dev_txt) as fh:
            for raw in fh:
                line = raw.strip()
                if not line or line.startswith("#") or line.startswith("-r ") or "${" in line:
                    if "${" in line:
                        print(f"Deps       : skipping (token required): {line}")
                    continue
                installable.append(line)
        if installable:
            with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as tf:
                tf.write("\n".join(installable))
                tmp = tf.name
            try:
                subprocess.run([pip, "install", "-q", "-r", tmp], check=True)
                print(f"Deps       : installed {len(installable)} dev deps (requirements_dev.txt)")
            finally:
                os.unlink(tmp)
    elif os.path.isfile(setup_cfg):
        subprocess.run([pip, "install", "-q", "-e", lambda_root], check=True)
        print("Deps       : installed from setup.cfg")

    _add_venv_site_packages(venv_dir)


# ---------------------------------------------------------------------------
# Modes
# ---------------------------------------------------------------------------


def run_pytest(lambda_root):
    """cd to worker root and run the full test suite under debugpy."""
    try:
        import pytest
    except ImportError:
        print(
            "ERROR: pytest is not installed in the active Python environment.\n"
            "Install it with:  pip install pytest",
            file=sys.stderr,
        )
        sys.exit(1)

    os.chdir(lambda_root)
    sys.exit(pytest.main(["-xvs"]))


# Env var keys that hold DynamoDB table names across your workers — fill in your own.
_TABLE_ENV_KEYS = [
    "TABLE_NAME",
    # "<YOUR_TABLE_ENV_VAR>",
]


def _start_moto_mock(region):
    """
    Start a moto AWS mock and pre-create stub DynamoDB tables for every table
    env var in _TABLE_ENV_KEYS that is set. Returns the active mock so the
    caller can stop it.

    Uses stub tables (single `id` hash key) so module-level boto3 calls at
    import time don't crash. Tests that need real table shapes should use
    the pytest mode instead (which has proper fixtures in conftest.py).
    """
    try:
        import boto3 as _boto3
        import moto
    except ImportError:
        print(
            "WARNING: moto is not installed in this environment.\n"
            "AWS calls in the handler will hit real AWS (or fail).\n"
            "Install with:  pip install moto[dynamodb]",
        )
        return None

    mock = moto.mock_aws()
    mock.start()

    ddb = _boto3.resource("dynamodb", region_name=region)

    for key in _TABLE_ENV_KEYS:
        table_name = os.environ.get(key, "")
        if not table_name:
            continue
        try:
            ddb.create_table(
                TableName=table_name,
                KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
                AttributeDefinitions=[{"AttributeName": "id", "AttributeType": "S"}],
                BillingMode="PAY_PER_REQUEST",
            )
        except Exception:
            pass  # already exists or not needed

    return mock


def invoke_handler(lambda_root, package_name, event_file, real_aws=False):
    """
    Import lambda_handler and call it with a mock event.

    real_aws=False  — start a moto mock (default; works offline, no real data)
    real_aws=True   — skip moto; boto3 uses real AWS credentials from the
                      environment (requires aws-auth.sh to have been run first)
    """
    region = os.environ.get("AWS_DEFAULT_REGION", "us-west-2")

    if lambda_root not in sys.path:
        sys.path.insert(0, lambda_root)

    mock = None
    if not real_aws:
        print("AWS mode   : moto mock (offline)")
        mock = _start_moto_mock(region)
    else:
        profile = os.environ.get("AWS_PROFILE", "default")
        env_val = os.environ.get("AWS_ENV", "dev")
        print(f"AWS mode   : real AWS  (profile={profile}, env={env_val})")
        print(
            "             Ensure aws-auth.sh has been run and credentials are\n"
            "             current before starting this debug session.\n"
        )

    try:
        resolved_event_path = None
        if event_file and os.path.exists(event_file):
            resolved_event_path = event_file
        else:
            default = os.path.join(lambda_root, "debug_event.json")
            if os.path.exists(default):
                resolved_event_path = default

        if resolved_event_path:
            with open(resolved_event_path) as fh:
                event = json.load(fh)
            print(f"Event      : {resolved_event_path}")
        else:
            event = {}
            print(
                f"No debug_event.json found in {lambda_root}.\n"
                "Invoking with an empty event — create debug_event.json in the\n"
                "worker root to provide a realistic sample event.\n"
            )

        try:
            module = importlib.import_module(f"{package_name}.main")
        except Exception as exc:
            print(f"ERROR: Could not import {package_name}.main — {exc}", file=sys.stderr)
            sys.exit(1)

        handler_fn = getattr(module, "lambda_handler", None) or getattr(module, "handler", None)
        if not handler_fn:
            print(
                f"ERROR: Neither lambda_handler nor handler found in {package_name}.main",
                file=sys.stderr,
            )
            sys.exit(1)

        result = handler_fn(event, None)
        print(json.dumps(result, indent=2, default=str))
    finally:
        if mock:
            mock.stop()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target_file")
    parser.add_argument("--mode", choices=["pytest", "invoke"], default="invoke")
    parser.add_argument("--event", default=None)
    parser.add_argument("--real-aws", action="store_true")
    args = parser.parse_args()

    lambda_root = find_lambda_root(args.target_file)
    if not lambda_root:
        print(f"ERROR: no setup.cfg found walking up from {args.target_file}", file=sys.stderr)
        sys.exit(1)

    package_name = find_package_name(lambda_root)
    if not package_name:
        print(f"ERROR: no package with main.py found in {lambda_root}", file=sys.stderr)
        sys.exit(1)

    print(f"Worker root: {lambda_root}")
    print(f"Package    : {package_name}")

    _ensure_lambda_deps(lambda_root)

    if args.mode == "pytest":
        run_pytest(lambda_root)
    else:
        invoke_handler(lambda_root, package_name, args.event, real_aws=args.real_aws)


if __name__ == "__main__":
    main()
