#!/bin/bash

# ADAM Platform - Backend Startup Script

echo "🚀 Starting ADAM Platform Backend..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if .env.backend exists
if [ ! -f .env.backend ]; then
    echo "⚠️  .env.backend not found. Copying from example..."
    cp .env.backend.example .env.backend
    echo "✅ Created .env.backend"
    echo "⚠️  Please edit .env.backend and add your API keys before continuing."
    echo ""
    read -p "Press Enter to continue once you've updated .env.backend, or Ctrl+C to exit..."
fi

# Load environment variables
export $(cat .env.backend | grep -v '^#' | xargs)

# Check for required API keys
if [ -z "$OPENAI_API_KEY" ] && [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  Warning: No AI API keys found in .env.backend"
    echo "   At least one of OPENAI_API_KEY or GEMINI_API_KEY is required."
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Start Docker Compose services
echo ""
echo "📦 Starting Docker Compose services..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "🏥 Checking service health..."

services=(
    "postgres:5432:PostgreSQL"
    "timescaledb:5433:TimescaleDB"
    "qdrant:6333:Qdrant"
    "nats:8222:NATS"
    "redis:6379:Redis"
    "api-gateway:3200:API Gateway"
    "graph-orchestrator:3100:Nova Orchestrator"
)

all_healthy=true

for service_info in "${services[@]}"; do
    IFS=':' read -r service port name <<< "$service_info"

    if docker-compose ps | grep -q "$service.*Up"; then
        echo "✅ $name is running"
    else
        echo "❌ $name is not running"
        all_healthy=false
    fi
done

echo ""

if [ "$all_healthy" = true ]; then
    echo "✅ All services are running!"
    echo ""
    echo "📡 Service URLs:"
    echo "   • API Gateway:        http://localhost:3200"
    echo "   • Nova Orchestrator:  http://localhost:3100"
    echo "   • Grafana Dashboard:  http://localhost:3001 (admin/admin)"
    echo "   • Prometheus:         http://localhost:9090"
    echo "   • NATS Monitor:       http://localhost:8222"
    echo "   • Qdrant Dashboard:   http://localhost:6333/dashboard"
    echo ""
    echo "🧪 Test the API:"
    echo "   curl http://localhost:3200/health"
    echo "   curl http://localhost:3200/api/experiments"
    echo ""
    echo "📋 View logs:"
    echo "   docker-compose logs -f"
    echo ""
    echo "🛑 Stop services:"
    echo "   docker-compose down"
else
    echo "⚠️  Some services failed to start. Check logs with:"
    echo "   docker-compose logs"
    exit 1
fi
