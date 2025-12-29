#!/bin/bash
# ADAM Platform Deployment Script
# Usage: ./deploy.sh [environment] [action]
# Environments: local, staging, production
# Actions: up, down, build, logs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
DEPLOYMENT_DIR="$ROOT_DIR/deployment"

ENVIRONMENT="${1:-local}"
ACTION="${2:-up}"

echo "=== ADAM Platform Deployment ==="
echo "Environment: $ENVIRONMENT"
echo "Action: $ACTION"
echo ""

case $ENVIRONMENT in
  local)
    case $ACTION in
      up)
        echo "Starting local development stack..."
        docker-compose -f "$DEPLOYMENT_DIR/docker-compose.yml" up -d
        echo ""
        echo "Services started. Access points:"
        echo "  - API Gateway:      http://localhost:3200"
        echo "  - Nova Orchestrator: http://localhost:3100"
        echo "  - INTERSECT Gateway: http://localhost:3300"
        echo "  - Grafana:          http://localhost:3000 (admin/admin)"
        echo "  - Prometheus:       http://localhost:9090"
        echo "  - NATS Monitor:     http://localhost:8222"
        ;;
      down)
        echo "Stopping local development stack..."
        docker-compose -f "$DEPLOYMENT_DIR/docker-compose.yml" down
        ;;
      build)
        echo "Building Docker images..."
        docker-compose -f "$DEPLOYMENT_DIR/docker-compose.yml" build
        ;;
      logs)
        docker-compose -f "$DEPLOYMENT_DIR/docker-compose.yml" logs -f
        ;;
      *)
        echo "Unknown action: $ACTION"
        exit 1
        ;;
    esac
    ;;
  
  staging)
    case $ACTION in
      up)
        echo "Deploying to staging..."
        kubectl apply -k "$DEPLOYMENT_DIR/kubernetes/overlays/staging"
        echo "Waiting for deployments..."
        kubectl -n adam-platform rollout status deployment/api-gateway
        kubectl -n adam-platform rollout status deployment/nova-orchestrator
        kubectl -n adam-platform rollout status deployment/intersect-gateway
        echo "Staging deployment complete!"
        ;;
      down)
        echo "Removing staging deployment..."
        kubectl delete -k "$DEPLOYMENT_DIR/kubernetes/overlays/staging"
        ;;
      *)
        echo "Unknown action: $ACTION"
        exit 1
        ;;
    esac
    ;;
  
  production)
    case $ACTION in
      up)
        echo "Deploying to production..."
        echo "WARNING: This will deploy to production!"
        read -p "Continue? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
          echo "Deployment cancelled."
          exit 0
        fi
        kubectl apply -k "$DEPLOYMENT_DIR/kubernetes/overlays/production"
        echo "Waiting for deployments..."
        kubectl -n adam-platform rollout status deployment/api-gateway
        kubectl -n adam-platform rollout status deployment/nova-orchestrator
        kubectl -n adam-platform rollout status deployment/intersect-gateway
        kubectl -n adam-edge rollout status deployment/intersect-ambassador
        echo "Production deployment complete!"
        ;;
      down)
        echo "ERROR: Cannot remove production deployment via script."
        echo "Please use kubectl directly with appropriate safeguards."
        exit 1
        ;;
      *)
        echo "Unknown action: $ACTION"
        exit 1
        ;;
    esac
    ;;
  
  *)
    echo "Unknown environment: $ENVIRONMENT"
    echo "Valid environments: local, staging, production"
    exit 1
    ;;
esac

echo ""
echo "Done!"

