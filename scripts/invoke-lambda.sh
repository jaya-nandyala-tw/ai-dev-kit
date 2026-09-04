#!/bin/bash
set -e

# Guard: re-exec under bash if invoked via sh/zsh
if [[ -z "${BASH_VERSION:-}" ]]; then
  exec bash "$0" "$@"
fi

# ============================================
# Lambda/worker invoke helper
# ============================================
# Invoke any worker function locally (via Python handler) or remotely (via AWS CLI).
#
# Usage:
#   ./invoke-lambda.sh <worker-dir> [options]
#
# Modes:
#   --local           Run handler locally in a Python subprocess (default)
#   --remote          Invoke the deployed lambda via aws lambda invoke
#
# Options:
#   --event <file>    JSON event file (default: events/<handler-name>.json)
#   --event-stdin     Read event JSON from stdin
#   --env <env>       AWS environment for remote: dev|tst|val|prd (default: $AWS_ENV or dev)
#   --tail            Tail CloudWatch logs after remote invoke
#   --dry-run         Print what would happen without executing
#   --generate-event  Generate a sample event file and exit
#   -h, --help        Show this help
#
# GENERICIZED TEMPLATE — fill in:
#   - The env vars exported in invoke_local() with your own table/resource names.
#   - resolve_function_name() with your own repo-dir → deployed-function-name mapping.
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CODEBASE_DIR="$ROOT_DIR/codebase/workers"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  set -a; source .env; set +a
fi

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${GREEN}[invoke]${NC} $1"; }
warn()  { echo -e "${YELLOW}[invoke]${NC} $1"; }
error() { echo -e "${RED}[invoke]${NC} $1"; }

usage() {
  head -25 "$0" | grep '^#' | sed 's/^# \?//'
  exit 0
}

LAMBDA_DIR=""
MODE="local"
EVENT_FILE=""
EVENT_STDIN=false
AWS_TARGET_ENV="${AWS_ENV:-dev}"
TAIL_LOGS=false
DRY_RUN=false
GENERATE_EVENT=false
FN_NAME_OVERRIDE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --local)        MODE="local"; shift ;;
    --remote)       MODE="remote"; shift ;;
    --event)        EVENT_FILE="$2"; shift 2 ;;
    --event-stdin)  EVENT_STDIN=true; shift ;;
    --env)          AWS_TARGET_ENV="$2"; shift 2 ;;
    --fn-name)      FN_NAME_OVERRIDE="$2"; shift 2 ;;
    --tail)         TAIL_LOGS=true; shift ;;
    --dry-run)      DRY_RUN=true; shift ;;
    --generate-event) GENERATE_EVENT=true; shift ;;
    -h|--help)      usage ;;
    -*)             error "Unknown option: $1"; usage ;;
    *)
      if [[ -z "$LAMBDA_DIR" ]]; then
        LAMBDA_DIR="$1"
      else
        error "Unexpected argument: $1"
        usage
      fi
      shift
      ;;
  esac
done

if [[ -z "$LAMBDA_DIR" ]]; then
  error "Worker directory is required."
  echo ""
  echo "Available workers:"
  for d in "$CODEBASE_DIR"/*/; do
    [[ -d "$d" ]] && echo "  $(basename "$d")"
  done
  echo ""
  echo "Usage: ./invoke-lambda.sh <worker-dir> [options]"
  exit 1
fi

LAMBDA_PATH="$CODEBASE_DIR/$LAMBDA_DIR"
if [[ ! -d "$LAMBDA_PATH" ]]; then
  error "Directory not found: $LAMBDA_PATH"
  exit 1
fi

HANDLER_PKG=""
for pkg_dir in "$LAMBDA_PATH"/*/; do
  if [[ -f "$pkg_dir/__init__.py" ]]; then
    HANDLER_PKG="$(basename "$pkg_dir")"
    break
  fi
done

if [[ -z "$HANDLER_PKG" ]]; then
  error "No Python package found in $LAMBDA_DIR (no __init__.py)"
  exit 1
fi

HANDLER_MODULE="$HANDLER_PKG.main"
HANDLER_FN="lambda_handler"

if [[ ! -f "$LAMBDA_PATH/$HANDLER_PKG/main.py" ]]; then
  if [[ -f "$LAMBDA_PATH/$HANDLER_PKG/handler.py" ]]; then
    HANDLER_MODULE="$HANDLER_PKG.handler"
  else
    error "No main.py or handler.py found in $HANDLER_PKG"
    exit 1
  fi
fi

info "Worker: $LAMBDA_DIR"
info "Handler: $HANDLER_MODULE.$HANDLER_FN"

detect_event_type() {
  if grep -q "APIGatewayRestResolver\|APIGatewayHttpResolver" "$LAMBDA_PATH/$HANDLER_PKG/main.py" 2>/dev/null; then
    echo "apigw"
  elif grep -q "taskStep\|myTaskToken\|step_function" "$LAMBDA_PATH/$HANDLER_PKG/main.py" 2>/dev/null; then
    echo "sfn"
  else
    echo "plain"
  fi
}

EVENT_TYPE="$(detect_event_type)"
info "Event type: $EVENT_TYPE"

generate_sample_event() {
  local event_type="$1"
  local out_dir="$ROOT_DIR/events"
  mkdir -p "$out_dir"
  local out_file="$out_dir/${LAMBDA_DIR}.json"

  case "$event_type" in
    apigw)
      cat > "$out_file" <<'EVEOF'
{
  "resource": "/example",
  "path": "/example",
  "httpMethod": "GET",
  "headers": {
    "Content-Type": "application/json",
    "Correlation-Id": "local-test-001"
  },
  "queryStringParameters": null,
  "pathParameters": null,
  "body": null,
  "isBase64Encoded": false,
  "requestContext": {
    "resourcePath": "/example",
    "httpMethod": "GET",
    "identity": { "sourceIp": "127.0.0.1" }
  }
}
EVEOF
      ;;
    sfn)
      cat > "$out_file" <<'EVEOF'
{
  "taskStep": "SampleStep",
  "myTaskToken": "local-test-token",
  "Payload": {
    "requestId": "req-local-001",
    "env": "dev"
  },
  "Input": {}
}
EVEOF
      ;;
    plain)
      cat > "$out_file" <<'EVEOF'
{
  "source": "local-invoke",
  "detail-type": "test",
  "detail": {}
}
EVEOF
      ;;
  esac

  info "Generated sample event: $out_file"
  cat "$out_file"
}

if [[ "$GENERATE_EVENT" == true ]]; then
  generate_sample_event "$EVENT_TYPE"
  exit 0
fi

if [[ "$EVENT_STDIN" == true ]]; then
  EVENT_JSON="$(cat)"
elif [[ -n "$EVENT_FILE" ]]; then
  if [[ ! -f "$EVENT_FILE" ]]; then
    error "Event file not found: $EVENT_FILE"
    exit 1
  fi
  EVENT_JSON="$(cat "$EVENT_FILE")"
else
  DEFAULT_EVENT="$ROOT_DIR/events/${LAMBDA_DIR}.json"
  if [[ -f "$DEFAULT_EVENT" ]]; then
    EVENT_JSON="$(cat "$DEFAULT_EVENT")"
    info "Using default event: $DEFAULT_EVENT"
  else
    warn "No event file found. Generating sample event..."
    generate_sample_event "$EVENT_TYPE"
    EVENT_JSON="$(cat "$ROOT_DIR/events/${LAMBDA_DIR}.json")"
  fi
fi

# ──────────────────────────────────────
#  LOCAL invoke
# ──────────────────────────────────────
invoke_local() {
  info "Invoking locally..."

  # ── Env vars the handler expects — fill in your own table/resource names ──
  export TABLE_NAME="${TABLE_NAME:-<your-table-name>}"
  export DEPLOYED_REGION="${DEPLOYED_REGION:-us-west-2}"
  export DEPLOYED_ENV="${AWS_TARGET_ENV}"
  export ENV="${AWS_TARGET_ENV}"
  export AWS_DEFAULT_REGION="us-west-2"
  # Mock AWS credentials for moto/local testing
  export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-testing}"
  export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-testing}"
  export AWS_SECURITY_TOKEN="${AWS_SECURITY_TOKEN:-testing}"
  export AWS_SESSION_TOKEN="${AWS_SESSION_TOKEN:-testing}"

  # Build PYTHONPATH: worker dir + shared layer (if you have one)
  local layer_dir="$CODEBASE_DIR/<shared-layer-repo>"
  local py_path="$LAMBDA_PATH"
  if [[ -d "$layer_dir" ]]; then
    py_path="$LAMBDA_PATH:$layer_dir"
  fi

  local python_bin="python3"
  local lambda_venv="$LAMBDA_PATH/.venv"
  if [[ ! -d "$lambda_venv" && -f "$LAMBDA_PATH/requirements.txt" ]]; then
    info "Installing worker dependencies into local venv..."
    $python_bin -m venv "$lambda_venv"
    "$lambda_venv/bin/pip" install -q -r "$LAMBDA_PATH/requirements.txt" 2>&1 | tail -3
    if [[ -d "$layer_dir" && -f "$layer_dir/requirements.txt" ]]; then
      "$lambda_venv/bin/pip" install -q -r "$layer_dir/requirements.txt" 2>&1 | tail -3
    fi
  fi
  if [[ -d "$lambda_venv" ]]; then
    python_bin="$lambda_venv/bin/python3"
  fi

  if [[ "$DRY_RUN" == true ]]; then
    info "[DRY RUN] Would run:"
    echo "  PYTHONPATH=$py_path $python_bin -c \"...\""
    echo "  Event: $(echo "$EVENT_JSON" | head -5)..."
    return
  fi

  local start_time
  start_time=$(python3 -c "import time; print(int(time.time()*1000))")

  local output
  output=$(PYTHONPATH="$py_path" "$python_bin" -c "
import json, sys, os

try:
    from unittest.mock import patch, MagicMock
    import moto
    _mock_dynamodb = moto.mock_aws()
    _mock_dynamodb.start()
    import boto3
    ddb = boto3.resource('dynamodb', region_name='us-west-2')
    tbl = os.getenv('TABLE_NAME', '')
    if tbl:
        try:
            ddb.create_table(
                TableName=tbl,
                KeySchema=[{'AttributeName':'id','KeyType':'HASH'}],
                AttributeDefinitions=[{'AttributeName':'id','AttributeType':'S'}],
                BillingMode='PAY_PER_REQUEST'
            )
        except Exception:
            pass
except ImportError:
    pass

from $HANDLER_MODULE import $HANDLER_FN

event = json.loads(sys.stdin.read())

class FakeContext:
    function_name = '$LAMBDA_DIR'
    memory_limit_in_mb = 512
    invoked_function_arn = 'arn:aws:lambda:us-west-2:000000000000:function:$LAMBDA_DIR'
    aws_request_id = 'local-$(date +%s)'
    log_group_name = '/aws/lambda/$LAMBDA_DIR'
    log_stream_name = 'local'
    def get_remaining_time_in_millis(self):
        return 30000

result = $HANDLER_FN(event, FakeContext())
print(json.dumps(result, indent=2, default=str))
" <<< "$EVENT_JSON" 2>&1) || true

  local end_time
  end_time=$(python3 -c "import time; print(int(time.time()*1000))")
  local duration=$(( end_time - start_time ))

  echo ""
  echo -e "${CYAN}── Response ──${NC}"
  echo "$output"
  echo ""
  info "Duration: ${duration}ms"
}

# ──────────────────────────────────────
#  REMOTE invoke
# ──────────────────────────────────────

# Map repo directory name → deployed AWS Lambda function name — fill in your own.
resolve_function_name() {
  local dir="$1"
  case "$dir" in
    # <your-worker-repo-name>)  echo "<your-deployed-function-name>" ;;
    # Fallback: strip -lambda suffix and convert dashes to underscores
    *) echo "$dir" | sed 's/-lambda$//' | tr '-' '_' ;;
  esac
}

invoke_remote() {
  local fn_name
  if [[ -n "$FN_NAME_OVERRIDE" ]]; then
    fn_name="$FN_NAME_OVERRIDE"
  else
    fn_name="$(resolve_function_name "$LAMBDA_DIR")"
  fi

  info "Invoking remote: $fn_name (env: $AWS_TARGET_ENV)"

  if ! command -v aws &>/dev/null; then
    error "AWS CLI not found. Install: brew install awscli"
    exit 1
  fi

  export AWS_PROFILE="${AWS_PROFILE:-default}"
  if ! aws sts get-caller-identity &>/dev/null 2>&1; then
    warn "No valid AWS session. Run ./aws-auth.sh first."
    exit 1
  fi
  local caller_id
  caller_id=$(aws sts get-caller-identity --query 'Arn' --output text 2>/dev/null)
  info "AWS identity: $caller_id"

  local out_file
  out_file=$(mktemp /tmp/lambda-resp.XXXXXXXX)

  if [[ "$DRY_RUN" == true ]]; then
    info "[DRY RUN] Would run:"
    echo "  aws lambda invoke --function-name $fn_name --payload '...' $out_file"
    return
  fi

  info "Sending event..."
  local invoke_output
  invoke_output=$(aws lambda invoke \
    --function-name "$fn_name" \
    --payload "$EVENT_JSON" \
    --cli-binary-format raw-in-base64-out \
    --log-type Tail \
    --region us-west-2 \
    "$out_file" 2>&1)

  echo "$invoke_output" | while read -r line; do
    echo -e "${CYAN}[aws]${NC} $line"
  done

  local log_result
  log_result=$(echo "$invoke_output" | python3 -c "
import sys, json, base64
try:
    data = json.load(sys.stdin)
    if 'LogResult' in data:
        print(base64.b64decode(data['LogResult']).decode('utf-8', errors='replace'))
except: pass
" 2>/dev/null)
  if [[ -n "$log_result" ]]; then
    echo ""
    echo -e "${YELLOW}── Lambda Logs ──${NC}"
    echo "$log_result"
  fi

  echo ""
  echo -e "${CYAN}── Response ──${NC}"
  cat "$out_file" | python3 -m json.tool 2>/dev/null || cat "$out_file"
  rm -f "$out_file"

  if [[ "$TAIL_LOGS" == true ]]; then
    echo ""
    info "Tailing CloudWatch logs for /aws/lambda/$fn_name ..."
    aws logs tail "/aws/lambda/$fn_name" --since 1m --follow 2>&1 | while read -r line; do
      echo -e "${YELLOW}[logs]${NC} $line"
    done
  fi
}

case "$MODE" in
  local)  invoke_local ;;
  remote) invoke_remote ;;
esac
