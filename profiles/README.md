# ============================================
# Developer Profiles
# ============================================
# Each profile is its own .env file in this directory. `scripts/profile.sh`
# applies one to your root .env, preserving your personal settings
# (DEV_EMAIL, AWS_ENV, AWS_PROFILE) across profile switches.
#
# Usage:
#   ./scripts/profile.sh list              # List available profiles
#   ./scripts/profile.sh apply <name>      # Apply a profile to .env
#   ./scripts/profile.sh show <name>       # Show profile contents
#   ./scripts/profile.sh current           # Show current active profile
# ============================================

GENERICIZED TEMPLATE — the profiles below are illustrative examples matching a
"local docker-compose stack with a START_MODE switch" pattern. Adjust or
replace the variables inside each `<name>.env` file to match your own
project's local dev toggles; the mechanism (one file per profile, `# Profile:
<name>` as the first comment line, applied on top of a base `.env`) is what's
reusable.

Each profile file's first line must be `# Profile: <name>` — `profile.sh`
reads it to build the list/show output.

## Included example profiles

| Profile | What it's for |
|---|---|
| `fullstack` | Everything local: DB + service + UI + mocks (the usual default) |
| `fullstack-docker` | Same, but the service runs in a Docker container |
| `backend` | Backend-only: DB + service + mocks (no UI) |
| `frontend` | Frontend-only: UI pointing at a deployed/shared backend |
| `lambda` | Worker/lambda development: DB + mocks only |
| `integration` | Points at real deployed AWS services instead of mocks |
| `aws-login` | Just runs your AWS/Okta login flow, nothing else |

Delete the ones that don't apply to your stack and add your own.
