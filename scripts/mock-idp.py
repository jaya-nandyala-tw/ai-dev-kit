#!/usr/bin/env python3
"""
mock-idp.py — Minimal mock SAML IdP + auto-login for local dev.

Serves two endpoints:
  GET  /saml/metadata  → Valid SAML IdP metadata XML
  GET  /dev-login      → Creates session + sets auth_token cookie + redirects to /home

Runs on port 8100 by default.

GENERICIZED TEMPLATE — this assumes the same `users` / `user_roles` /
`user_sessions` Postgres schema as dev-login.py, and an optional
"lambda proxy" mode that forwards non-auth requests to a real backend
function when USE_REAL_AWS=true (handy for integration testing against a
real deployed environment while still bypassing SSO locally). Fill in
ROUTER_FUNCTION with your own backend entry-point function name, or delete
the lambda-proxy branch entirely if you don't need it.
"""

import os
import sys
import time
import uuid
import json
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

# Load env
script_dir = Path(__file__).resolve().parent
root_dir = script_dir.parent
env_file = root_dir / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

service_env = root_dir / "codebase" / "<service-name>" / "service" / ".env"
if service_env.exists():
    for line in service_env.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

import jwt

try:
    import psycopg2
except ImportError:
    print("psycopg2 not found. Install: pip install psycopg2-binary")
    sys.exit(1)

EMAIL = os.getenv("DEV_EMAIL", "local.dev@example.com")
SECRET_KEY = os.getenv("SECRET_KEY", "local-dev-secret-key")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_CONNECTION_PORT", "5432"))
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASSWORD", "postgres")
DB_NAME = os.getenv("DB_NAME", "app_db")
PORT = int(os.getenv("MOCK_IDP_PORT", "8100"))

SESSION_MINUTES = 480
SAML_HOURS = 24

# Optional: proxy non-auth requests to a real deployed backend function
# instead of returning stub JSON. Delete this block if not needed.
USE_REAL_AWS = os.getenv("USE_REAL_AWS", "").lower() == "true"
AWS_REGION = os.getenv("AWS_REGION", "us-west-2")
ROUTER_FUNCTION = "<your-router-function-name>"

lambda_client = None
if USE_REAL_AWS:
    try:
        import boto3
        lambda_client = boto3.client("lambda", region_name=AWS_REGION)
        sts = boto3.client("sts", region_name=AWS_REGION)
        identity = sts.get_caller_identity()
        print(f"  [lambda-proxy] AWS identity: {identity['Arn']}")
        print(f"  [lambda-proxy] Target: {ROUTER_FUNCTION}")
    except Exception as e:
        print(f"  [lambda-proxy] WARNING: AWS init failed: {e}")
        print(f"  [lambda-proxy] Falling back to mock responses")
        lambda_client = None

ENTITY_ID = f"http://localhost:{PORT}/saml"

SAML_METADATA = f"""<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                  entityID="{ENTITY_ID}">
  <IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <SingleSignOnService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
      Location="{ENTITY_ID}/sso"/>
    <SingleSignOnService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="{ENTITY_ID}/sso"/>
  </IDPSSODescriptor>
</EntityDescriptor>"""


def create_session_and_token(email):
    """Insert user + session into DB, return JWT token."""
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS, dbname=DB_NAME
    )
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute(
        "INSERT INTO users (email, preferences) VALUES (%s, %s) ON CONFLICT (email) DO NOTHING",
        (email, '{"theme": "light", "notifications": true}'),
    )
    cur.execute("SELECT 1 FROM user_roles WHERE email = %s AND role = 'admin'", (email,))
    if not cur.fetchone():
        cur.execute("INSERT INTO user_roles (email, role) VALUES (%s, 'admin')", (email,))

    session_id = uuid.uuid4()
    now = int(time.time())
    session_expiry = now + (SESSION_MINUTES * 60)
    saml_expiry = now + (SAML_HOURS * 3600)

    cur.execute(
        """INSERT INTO user_sessions (id, user_email, session_expiry_time, saml_expiry_time, is_deleted, created_at)
           VALUES (%s, %s, %s, %s, false, %s)""",
        (str(session_id), email, session_expiry, saml_expiry, now),
    )
    cur.close()
    conn.close()

    parts = email.split("@")[0].split(".")
    first_name = parts[0] if parts else "Dev"
    last_name = parts[1] if len(parts) > 1 else "User"

    token = jwt.encode(
        {
            "user_email": email,
            "role": "admin",
            "first_name": first_name,
            "last_name": last_name,
            "sid": str(session_id),
            "saml_expiry_time": saml_expiry,
            "exp": session_expiry,
        },
        SECRET_KEY,
        algorithm="HS256",
    )
    return token


class MockIdPHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"  [mock-idp] {args[0]}")

    def _json_response(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _is_saml_path(self):
        saml_paths = ("/saml/", "/sso/", "/adfs/", "/auth/")
        return any(self.path.startswith(p) for p in saml_paths)

    def _is_local_only_path(self):
        return self.path in ("/health", "/saml/metadata") or \
               self.path.startswith("/dev-login") or \
               self._is_saml_path()

    def _invoke_lambda(self, method, body=None):
        """Proxy the request to ROUTER_FUNCTION with an API Gateway-style event."""
        if not lambda_client:
            return None  # Fall back to mock

        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query, keep_blank_values=True)
        single_qs = {k: v[0] for k, v in qs.items()} if qs else None

        headers = {k: v for k, v in self.headers.items()}

        event = {
            "httpMethod": method,
            "path": path,
            "resource": path,
            "headers": headers,
            "queryStringParameters": single_qs,
            "pathParameters": None,
            "body": body,
            "isBase64Encoded": False,
            "requestContext": {
                "httpMethod": method,
                "path": path,
                "stage": "dev",
                "identity": {"sourceIp": "127.0.0.1"},
            },
        }

        try:
            tag = f"{method} {path}"
            print(f"  [lambda-proxy] → {tag}")
            resp = lambda_client.invoke(
                FunctionName=ROUTER_FUNCTION,
                InvocationType="RequestResponse",
                Payload=json.dumps(event).encode(),
            )
            payload = json.loads(resp["Payload"].read())

            status_code = payload.get("statusCode", 200)
            resp_body = payload.get("body", "{}")
            resp_headers = payload.get("headers", {})

            print(f"  [lambda-proxy] ← {tag} → {status_code}")

            self.send_response(status_code)
            self.send_header("Content-Type", resp_headers.get("Content-Type", "application/json"))
            self.send_header("Access-Control-Allow-Origin", "*")
            encoded = resp_body.encode() if isinstance(resp_body, str) else json.dumps(resp_body).encode()
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)
            return True

        except Exception as e:
            print(f"  [lambda-proxy] ERROR invoking {ROUTER_FUNCTION}: {e}")
            return None  # Fall back to mock

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def _proxy_or_mock(self, method, has_body=True):
        body = None
        if has_body:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode() if content_length > 0 else None
        if USE_REAL_AWS and not self._is_local_only_path():
            if self._invoke_lambda(method, body):
                return
        self._json_response({"status": "ok", "message": "mock"})

    def do_POST(self):
        self._proxy_or_mock("POST")

    def do_PUT(self):
        self._proxy_or_mock("PUT")

    def do_PATCH(self):
        self._proxy_or_mock("PATCH")

    def do_DELETE(self):
        self._proxy_or_mock("DELETE", has_body=False)

    def do_GET(self):
        if self.path == "/saml/metadata":
            self.send_response(200)
            self.send_header("Content-Type", "application/xml")
            self.end_headers()
            self.wfile.write(SAML_METADATA.encode())

        elif self.path.startswith("/dev-login"):
            try:
                token = create_session_and_token(EMAIL)
                self.send_response(302)
                cookie = f"auth_token={token}; Path=/; Domain=localhost; Max-Age={SESSION_MINUTES * 60}; Secure; SameSite=None"
                self.send_header("Set-Cookie", cookie)
                self.send_header("Location", "https://localhost:3000/home")
                self.end_headers()
                print(f"  [mock-idp] Dev login: {EMAIL} → redirecting to /home")
            except Exception as e:
                self._json_response({"error": str(e)}, 500)

        elif self.path == "/health":
            self._json_response({"status": "ok"})

        elif self._is_saml_path():
            self.send_response(302)
            self.send_header("Location", f"http://localhost:{PORT}/dev-login")
            self.end_headers()

        elif USE_REAL_AWS and self._invoke_lambda("GET"):
            return

        else:
            print(f"  [mock-idp] Unhandled path: {self.path} → 404")
            self._json_response({"error": "not found"}, 404)


def main():
    mode = "LAMBDA PROXY (→ real backend)" if (USE_REAL_AWS and lambda_client) else "MOCK (stub responses)"
    print(f"""
  ╔══════════════════════════════════════════╗
  ║           Mock IdP Server               ║
  ╠══════════════════════════════════════════╣
  ║  Mode:          {mode:<25s}║
  ║  SAML Metadata: localhost:{PORT}/saml/metadata ║
  ║  Dev Login:     localhost:{PORT}/dev-login     ║
  ║  User:          {EMAIL:<25s}║
  ╚══════════════════════════════════════════╝
""")
    server = HTTPServer(("0.0.0.0", PORT), MockIdPHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    server.server_close()


if __name__ == "__main__":
    main()
