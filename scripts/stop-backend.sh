#!/bin/bash

# ADAM Platform - Backend Stop Script

echo "🛑 Stopping ADAM Platform Backend..."

# Stop Docker Compose services
docker-compose down

echo "✅ All services stopped"
echo ""
echo "💡 To remove all data volumes, run:"
echo "   docker-compose down -v"
