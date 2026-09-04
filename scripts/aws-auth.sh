#!/usr/bin/env bash
set -euo pipefail

# ============================================
# AWS auth setup via okta-awscli
# ============================================
# Authenticates with Okta, fetches all IAM roles
# available in the SAML assertion, and lets you
# pick the one you need.
#
# Usage: ./aws-auth.sh [email] [--env dev|tst]
#
# GENERICIZED TEMPLATE — fill in your own Okta org's base URL, app link, and
# email domain below. If your org doesn't use Okta, replace this script's
# body with your own IdP's CLI auth flow; the surrounding contract (write
# credentials to an AWS profile, verify with sts get-caller-identity) is
# reusable regardless of IdP.
# ============================================

OKTA_CONFIG="$HOME/.okta-aws"
OKTA_BASE_URL="<your-okta-domain>.okta.com"          # e.g. gsso.example.com
OKTA_APP_LINK="https://<your-okta-domain>.okta.com/home/amazon_aws/<app-id>/<id>"
OKTA_PROFILE_NAME="<your-org>-okta"                  # e.g. acme-okta
AWS_PROFILE_NAME="<your-org>-okta"
EMAIL_DOMAIN="<your-company>.com"                    # e.g. example.com
DURATION=3600

# ── Load .env if present ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

EMAIL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) shift 2 ;;  # accepted but ignored — role ARN encodes the account
    --help|-h)
      echo "Usage: ./aws-auth.sh [email]"
      echo ""
      echo "  email   Your company email (or set DEV_EMAIL / AWS_AUTH_EMAIL env var)"
      echo ""
      echo "  Authenticates via Okta MFA, then lists all IAM roles available"
      echo "  in your SAML assertion so you can pick the one you need."
      exit 0
      ;;
    *) EMAIL="$1"; shift ;;
  esac
done

# ── Get email ──
if [[ -z "$EMAIL" ]]; then EMAIL="${DEV_EMAIL:-${AWS_AUTH_EMAIL:-}}"; fi
if [[ -z "$EMAIL" ]]; then read -rp "Enter your company email: " EMAIL; fi

if [[ ! "$EMAIL" =~ ^[a-zA-Z0-9._%+-]+@${EMAIL_DOMAIN//./\\.}$ ]]; then
  echo "Error: Must be a @${EMAIL_DOMAIN} address."
  exit 1
fi

echo ""
echo "  AWS auth (Okta) — $EMAIL"
echo ""

# ── Check aws CLI installed ──
if ! command -v aws &> /dev/null; then
  echo "  aws CLI not found. Installing via Homebrew..."
  if ! command -v brew &> /dev/null; then
    echo "  Error: Homebrew not found. Install the AWS CLI manually: https://awscli.amazonaws.com/AWSCLIV2.pkg"
    exit 1
  fi
  brew install awscli
fi

# ── Check okta-awscli installed ──
if ! command -v okta-awscli &> /dev/null; then
  echo "  okta-awscli not found. Installing..."
  pip3 install okta-awscli
fi

# ── Write ~/.okta-aws (no hardcoded role — okta-awscli will list all) ──
if [[ -f "$OKTA_CONFIG" ]]; then
  cp "$OKTA_CONFIG" "${OKTA_CONFIG}.bak"
fi

cat > "$OKTA_CONFIG" << EOF
[${OKTA_PROFILE_NAME}]
base-url = ${OKTA_BASE_URL}
profile = ${AWS_PROFILE_NAME}
username = ${EMAIL}
app-link = ${OKTA_APP_LINK}
duration = ${DURATION}
EOF

chmod 600 "$OKTA_CONFIG"
echo "  ✓ ~/.okta-aws written"

# ── Ensure AWS config profile exists ──
AWS_CONFIG="$HOME/.aws/config"
mkdir -p "$HOME/.aws"
if ! grep -q "\[profile ${AWS_PROFILE_NAME}\]" "$AWS_CONFIG" 2>/dev/null; then
  cat >> "$AWS_CONFIG" << AWSCFG

[profile ${AWS_PROFILE_NAME}]
region = us-west-2
output = json
AWSCFG
  echo "  ✓ AWS config profile [${AWS_PROFILE_NAME}] created"
fi

# ── Authenticate and select role (grouped by account) ──
OKTA_PROFILE_NAME="$OKTA_PROFILE_NAME" AWS_PROFILE_NAME="$AWS_PROFILE_NAME" \
  python3 "$SCRIPT_DIR/aws-role-picker.py"

# ── Verify ──
# Newly assumed-role STS credentials can take a couple seconds to propagate,
# so retry briefly instead of failing on the first check.
VERIFIED=false
for attempt in 1 2 3 4 5; do
  if IDENTITY=$(aws sts get-caller-identity --profile "$AWS_PROFILE_NAME" --output text --query 'Arn' 2>/dev/null); then
    echo "  ✓ Credentials valid — $IDENTITY"
    VERIFIED=true
    break
  fi
  sleep 2
done

if [[ "$VERIFIED" != true ]]; then
  echo "  ⚠ Could not verify credentials. Re-run if needed."
fi
