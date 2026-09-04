#!/usr/bin/env python3
"""
aws-role-picker.py — Interactive AWS role picker for Okta SAML auth.

Authenticates via Okta, fetches all IAM roles from the SAML assertion,
groups them by AWS account with friendly environment names, and lets
you pick the role to assume.

Credentials are written to ~/.aws/credentials under the profile named by
AWS_PROFILE_NAME (see aws-auth.sh).

GENERICIZED TEMPLATE — ACCOUNT_ENVS below is empty; fill in your own AWS
account ID -> environment name mapping (dev/tst/val/prd, or whatever your
org calls them) so the role picker can group and sort roles sensibly.
Unmapped account IDs still work — they just get grouped under a raw
account ID label and sorted last.
"""

import base64
import glob
import logging
import os
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict, namedtuple

# ── Account ID → environment name — fill in your own accounts ──
ACCOUNT_ENVS = {
    # "111111111111": "dev",
    # "222222222222": "tst",
    # "333333333333": "val",
    # "444444444444": "prd",
}

ENV_ORDER = ["dev", "tst", "val", "prd"]

OKTA_PROFILE = os.environ.get("OKTA_PROFILE_NAME", "okta")
AWS_PROFILE = os.environ.get("AWS_PROFILE_NAME", "okta")


# ── Bootstrap: add okta-awscli's bundled site-packages to sys.path ──
def _find_okta_site_packages():
    import shutil
    import subprocess

    # Prefer asking Homebrew directly. `okta-awscli` on PATH may resolve to a
    # pyenv/asdf shim rather than the real Cellar binary, which breaks the
    # realpath-based lookup below even when the brew formula is installed.
    if shutil.which("brew"):
        try:
            prefix = subprocess.run(
                ["brew", "--prefix", "okta-awscli"],
                capture_output=True,
                text=True,
                check=True,
            ).stdout.strip()
        except (subprocess.CalledProcessError, OSError):
            prefix = None
        if prefix:
            patterns = glob.glob(
                os.path.join(prefix, "libexec", "lib", "python*", "site-packages")
            )
            if patterns:
                return patterns[0]

    okta_bin = shutil.which("okta-awscli")
    if not okta_bin:
        return None
    real_bin = os.path.realpath(okta_bin)
    libexec_dir = os.path.dirname(os.path.dirname(real_bin))
    patterns = glob.glob(
        os.path.join(libexec_dir, "lib", "python*", "site-packages")
    )
    return patterns[0] if patterns else None


try:
    import oktaawscli  # noqa: F401
except ImportError:
    _site = _find_okta_site_packages()
    if _site and _site not in sys.path:
        sys.path.insert(0, _site)

try:
    from oktaawscli.aws_auth import AwsAuth
    from oktaawscli.okta_auth import OktaAuth
    from oktaawscli.okta_auth_config import OktaAuthConfig
except ImportError as exc:
    print(f"  Error: cannot import oktaawscli: {exc}")
    print("  Ensure okta-awscli is installed:  brew install okta-awscli")
    sys.exit(1)


# ── Role extraction ──

RoleTuple = namedtuple("RoleTuple", ["principal_arn", "role_arn"])


def _extract_roles(assertion):
    """Parse all (principal_arn, role_arn) pairs from a base64-encoded SAML assertion."""
    aws_role_attr = "https://aws.amazon.com/SAML/Attributes/Role"
    attr_value_urn = "{urn:oasis:names:tc:SAML:2.0:assertion}AttributeValue"
    roles = []
    root = ET.fromstring(base64.b64decode(assertion))
    for attr in root.iter("{urn:oasis:names:tc:SAML:2.0:assertion}Attribute"):
        if attr.get("Name") == aws_role_attr:
            for val in attr.iter(attr_value_urn):
                parts = val.text.strip().split(",")
                if parts[0].split(":")[5].startswith("role/"):
                    roles.append(RoleTuple(*reversed(parts)))
                else:
                    roles.append(RoleTuple(*parts))
    return roles


def _account_id(arn):
    return arn.split(":")[4]


def _role_name(arn):
    return arn.split("/")[-1]


# ── Grouped display ──


def _display_roles(roles):
    """Print roles grouped by account, return flat ordered list matching display indices."""
    by_account = defaultdict(list)
    for role in roles:
        by_account[_account_id(role.role_arn)].append(role)

    flat = []
    idx = 1

    def _env_sort_key(account_id):
        env = ACCOUNT_ENVS.get(account_id, account_id)
        try:
            return ENV_ORDER.index(env)
        except ValueError:
            return len(ENV_ORDER)  # unknown envs go last

    for account_id in sorted(by_account.keys(), key=_env_sort_key):
        env = ACCOUNT_ENVS.get(account_id, account_id)
        label = f"{env.upper()}  (account: {account_id})"
        bar = "─" * (len(label) + 4)
        print(f"  ┌{bar}┐")
        print(f"  │  {label}  │")
        print(f"  └{bar}┘")
        for role in sorted(by_account[account_id], key=lambda r: r.role_arn):
            print(f"    {idx:>2})  {_role_name(role.role_arn)}")
            flat.append(role)
            idx += 1
        print()
    return flat


# ── Main ──


def main():
    logger = logging.getLogger("aws-role-picker")
    logger.setLevel(logging.WARNING)
    logger.addHandler(logging.StreamHandler())

    okta_auth_config = OktaAuthConfig(logger)

    print("  Connecting to Okta — complete MFA if prompted...")
    print()

    okta = OktaAuth(
        okta_profile=OKTA_PROFILE,
        verbose=False,
        logger=logger,
        totp_token="",
        okta_auth_config=okta_auth_config,
        username=None,
        password=None,
    )

    try:
        _, assertion = okta.get_assertion()
    except SystemExit:
        print("  Okta authentication failed.")
        sys.exit(1)
    except Exception as exc:
        print(f"  Okta error: {exc}")
        sys.exit(1)

    roles = _extract_roles(assertion)
    if not roles:
        print("  No roles found in SAML assertion.")
        sys.exit(1)

    print()
    flat = _display_roles(roles)

    # ── Selection ──
    try:
        raw = input(f"  Select role [1-{len(flat)}]: ").strip()
        choice = int(raw) if raw else 1
        if not (1 <= choice <= len(flat)):
            raise ValueError
    except (ValueError, EOFError):
        print("  Invalid selection.")
        sys.exit(1)

    selected = flat[choice - 1]
    env = ACCOUNT_ENVS.get(_account_id(selected.role_arn), "unknown")

    print()
    print(f"  Assuming: {_role_name(selected.role_arn)}  [{env}]")
    print()

    # ── STS assume-role ──
    duration = okta_auth_config.duration_for(OKTA_PROFILE) or 3600
    try:
        creds = AwsAuth.get_sts_token(
            selected.role_arn,
            selected.principal_arn,
            assertion,
            duration=duration,
            logger=logger,
        )
    except SystemExit:
        print("  STS assume-role failed. Check role permissions.")
        sys.exit(1)
    except Exception as exc:
        print(f"  STS error: {exc}")
        sys.exit(1)

    # ── Write credentials ──
    aws_auth = AwsAuth(AWS_PROFILE, OKTA_PROFILE, False, False, logger)
    aws_auth.write_sts_token(
        creds["AccessKeyId"],
        creds["SecretAccessKey"],
        creds["Expiration"],
        creds["SessionToken"],
    )

    print(f"  ✓ Credentials written to [{AWS_PROFILE}]")
    print()
    print(f"    export AWS_PROFILE={AWS_PROFILE}")
    print(f"    aws sts get-caller-identity")
    print()


if __name__ == "__main__":
    main()
