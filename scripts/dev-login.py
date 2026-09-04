#!/usr/bin/env python3
"""
dev-login.py — Generate a local dev session + auth_token cookie.

Bypasses SAML/OIDC entirely by:
1. Inserting a user + session directly into the local PostgreSQL
2. Minting a valid JWT with the same SECRET_KEY the service uses
3. Printing a curl command / browser cookie you can paste

Usage:
  python3 dev-login.py                    # uses DEV_EMAIL from .env
  python3 dev-login.py user@example.com   # explicit email

Requires: pip install PyJWT psycopg2-binary python-dotenv

GENERICIZED TEMPLATE — this assumes your backend has `users`, `user_roles`,
and `user_sessions` tables with the columns used below, and issues JWTs
signed with a shared SECRET_KEY. Adjust the SQL and JWT claims to match
your own auth schema; the overall mechanism (bypass SSO locally by writing
a session directly and minting a matching token) is what's reusable.
"""

import os
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Load .env from repo root
script_dir = Path(__file__).resolve().parent
root_dir = script_dir.parent
env_file = root_dir / ".env"
if env_file.exists():
    from dotenv import load_dotenv

    load_dotenv(env_file)

# Also load your service's own .env for SECRET_KEY, if it lives elsewhere
service_env = root_dir / "codebase" / "<service-name>" / "service" / ".env"
if service_env.exists():
    from dotenv import load_dotenv

    load_dotenv(service_env, override=True)

import jwt
import psycopg2

# ── Config ──
EMAIL = (
    sys.argv[1] if len(sys.argv) > 1 else os.getenv("DEV_EMAIL", "local.dev@example.com")
)
SECRET_KEY = os.getenv("SECRET_KEY", "local-dev-secret-key")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_CONNECTION_PORT", "5432"))
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASSWORD", "postgres")
DB_NAME = os.getenv("DB_NAME", "app_db")

SESSION_MINUTES = 480  # 8 hours
SAML_HOURS = 24


def main():
    print(f"\n  Dev Login: {EMAIL}\n")

    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS, dbname=DB_NAME
    )
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute(
        "INSERT INTO users (email, preferences) VALUES (%s, %s) ON CONFLICT (email) DO NOTHING",
        (EMAIL, '{"theme": "light", "notifications": true}'),
    )

    cur.execute(
        "SELECT 1 FROM user_roles WHERE email = %s AND role = 'admin'", (EMAIL,)
    )
    if not cur.fetchone():
        cur.execute(
            "INSERT INTO user_roles (email, role) VALUES (%s, 'admin')", (EMAIL,)
        )

    session_id = uuid.uuid4()
    now = int(time.time())
    session_expiry = now + (SESSION_MINUTES * 60)
    saml_expiry = now + (SAML_HOURS * 3600)

    cur.execute(
        """INSERT INTO user_sessions (id, user_email, session_expiry_time, saml_expiry_time, is_deleted, created_at)
           VALUES (%s, %s, %s, %s, false, %s)""",
        (str(session_id), EMAIL, session_expiry, saml_expiry, now),
    )

    cur.close()
    conn.close()

    jwt_expiry = now + (SESSION_MINUTES * 60)
    token_data = {
        "user_email": EMAIL,
        "role": "admin",
        "first_name": EMAIL.split(".")[0] if "." in EMAIL else "Dev",
        "last_name": EMAIL.split(".")[1].split("@")[0] if "." in EMAIL else "User",
        "sid": str(session_id),
        "saml_expiry_time": saml_expiry,
        "exp": jwt_expiry,
    }
    token = jwt.encode(token_data, SECRET_KEY, algorithm="HS256")

    print("  Session created successfully!\n")
    print("  ── Option 1: Browser DevTools ──")
    print(f"  Paste in Console (on your frontend's local URL):\n")
    print(
        f'  document.cookie = "auth_token={token}; path=/; max-age={SESSION_MINUTES * 60}";'
    )
    print(f'  window.location.href = "/home";')
    print()
    print("  ── Option 2: curl ──")
    print(f'  curl -b "auth_token={token}" http://localhost:8000/api/v1/auth/me')
    print()
    print(
        f"  Token expires: {datetime.fromtimestamp(jwt_expiry, tz=timezone.utc).isoformat()}"
    )
    print(f"  Session ID:    {session_id}")
    print()


if __name__ == "__main__":
    main()
