#!/bin/bash

# ADAM Platform - Backend Reset Script

echo "⚠️  WARNING: This will delete all data and reset the backend!"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Reset cancelled"
    exit 0
fi

echo ""
echo "🛑 Stopping services..."
docker-compose down

echo ""
echo "🗑️  Removing volumes..."
docker-compose down -v

echo ""
echo "🏗️  Rebuilding services..."
docker-compose build

echo ""
echo "✅ Reset complete!"
echo ""
echo "To start the backend again, run:"
echo "   ./scripts/start-backend.sh"
