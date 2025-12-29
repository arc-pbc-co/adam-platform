#!/bin/bash
# Register an INTERSECT Controller with the ADAM Platform
# Usage: ./register-controller.sh <controller-id> <endpoint-url> [health-endpoint]

set -e

CONTROLLER_ID="${1:-}"
ENDPOINT_URL="${2:-}"
HEALTH_ENDPOINT="${3:-/health}"

if [ -z "$CONTROLLER_ID" ] || [ -z "$ENDPOINT_URL" ]; then
  echo "Usage: $0 <controller-id> <endpoint-url> [health-endpoint]"
  echo ""
  echo "Examples:"
  echo "  $0 desktop-metal-x25 http://192.168.1.100:8090"
  echo "  $0 furnace-sinter500 http://192.168.1.101:8091 /api/health"
  exit 1
fi

# Default gateway URL (can be overridden with INTERSECT_GATEWAY_URL env var)
GATEWAY_URL="${INTERSECT_GATEWAY_URL:-http://localhost:3300}"

echo "=== Registering INTERSECT Controller ==="
echo "Controller ID: $CONTROLLER_ID"
echo "Endpoint:      $ENDPOINT_URL"
echo "Health:        $HEALTH_ENDPOINT"
echo "Gateway:       $GATEWAY_URL"
echo ""

# Register the controller
RESPONSE=$(curl -s -X POST "$GATEWAY_URL/api/v1/controllers/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"controllerId\": \"$CONTROLLER_ID\",
    \"endpoint\": \"$ENDPOINT_URL\",
    \"healthEndpoint\": \"$HEALTH_ENDPOINT\"
  }")

echo "Response: $RESPONSE"
echo ""

# Verify registration by checking health
echo "Verifying controller health..."
HEALTH_RESPONSE=$(curl -s "$GATEWAY_URL/api/v1/controllers/$CONTROLLER_ID/health")
echo "Health: $HEALTH_RESPONSE"

echo ""
echo "Done! Controller $CONTROLLER_ID registered."

