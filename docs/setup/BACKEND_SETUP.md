# ADAM Platform - Backend Setup Guide

This guide will help you set up the Nova backend infrastructure for the ADAM Platform.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ADAM Platform (Frontend)                  │
│  React UI + Terminal + Visualization + Hardware Showcase    │
└─────────────────┬───────────────────────────────────────────┘
                  │ REST API / WebSocket
                  ↓
┌─────────────────────────────────────────────────────────────┐
│                    Nova Backend                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          API Gateway (Port 3200)                     │   │
│  │  • REST endpoints                                    │   │
│  │  • WebSocket real-time updates                      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Nova Orchestrator (Port 3100)               │   │
│  │  • Multi-agent coordination                          │   │
│  │  • Workflow execution                                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Infrastructure Services                             │   │
│  │  • PostgreSQL (5432) - Main database                 │   │
│  │  • TimescaleDB (5433) - Time-series data             │   │
│  │  • Qdrant (6333) - Vector database                   │   │
│  │  • NATS (4222) - Message broker                      │   │
│  │  • Redis (6379) - Cache                              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Monitoring                                          │   │
│  │  • Prometheus (9090) - Metrics                       │   │
│  │  • Grafana (3001) - Dashboards                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- **Docker Desktop** (or Docker Engine + Docker Compose)
- **Node.js 18+** (for local development)
- **npm** or **yarn**

## Quick Start

### 1. Clone and Setup

```bash
cd adam-platform

# Copy environment variables
cp .env.backend.example .env.backend

# Edit .env.backend and add your API keys
# Required: OPENAI_API_KEY or GEMINI_API_KEY
# Optional: DESKTOP_METAL_API_KEY (for hardware integration)
```

### 2. Start Infrastructure with Docker Compose

```bash
# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

This will start:
- ✅ PostgreSQL (port 5432)
- ✅ TimescaleDB (port 5433)
- ✅ Qdrant Vector DB (port 6333)
- ✅ NATS messaging (port 4222)
- ✅ Redis cache (port 6379)
- ✅ Prometheus (port 9090)
- ✅ Grafana (port 3001)
- ⚠️ Nova Orchestrator (port 3100) - placeholder
- ✅ API Gateway (port 3200)

### 3. Verify Services

```bash
# PostgreSQL
docker-compose exec postgres psql -U nova -c "SELECT COUNT(*) FROM users;"

# TimescaleDB
docker-compose exec timescaledb psql -U timescale -c "\dx"

# Qdrant
curl http://localhost:6333/health

# NATS
curl http://localhost:8222/healthz

# API Gateway
curl http://localhost:3200/health

# Nova Orchestrator
curl http://localhost:3100/health

# Grafana
open http://localhost:3001
# Login: admin / admin
```

### 4. Access Monitoring

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **NATS Monitor**: http://localhost:8222
- **Qdrant Dashboard**: http://localhost:6333/dashboard

## Development Workflow

### Local Development (Without Docker)

If you want to run services locally for development:

```bash
# Install dependencies for API Gateway
cd backend/api-gateway
npm install

# Start in dev mode (with hot reload)
npm run dev

# In another terminal, install dependencies for Nova Orchestrator
cd backend/nova
npm install
npm run dev
```

You'll still need the infrastructure services (PostgreSQL, NATS, etc.) running via Docker:

```bash
# Start only infrastructure services
docker-compose up -d postgres timescaledb qdrant nats redis
```

### Testing API Endpoints

```bash
# Get all experiments
curl http://localhost:3200/api/experiments

# Create an experiment
curl -X POST http://localhost:3200/api/experiments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rare-Earth-Free Magnet Test",
    "hypothesis": "Iron-cobalt alloy with optimized grain structure will achieve 90% of NdFeB performance",
    "description": "Testing novel composition for sustainable magnets"
  }'

# Get hardware fleet
curl http://localhost:3200/api/hardware

# Get agent activities
curl http://localhost:3200/api/agents/activities
```

### WebSocket Testing

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3200/ws');

ws.onopen = () => {
  console.log('Connected to ADAM Platform');

  // Subscribe to experiment updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    payload: { topic: 'experiments' }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

## Database Management

### Access PostgreSQL

```bash
# Via Docker
docker-compose exec postgres psql -U nova -d nova

# Common queries
SELECT * FROM experiments ORDER BY created_at DESC LIMIT 10;
SELECT * FROM hardware WHERE status = 'idle';
SELECT * FROM agent_activities WHERE status = 'in_progress';
```

### Access TimescaleDB

```bash
# Via Docker
docker-compose exec timescaledb psql -U timescale -d timescale

# Time-series queries
SELECT * FROM measurements WHERE experiment_id = 'xxx' ORDER BY time DESC LIMIT 100;
SELECT * FROM hardware_telemetry WHERE hardware_id = 'xxx' AND time > NOW() - INTERVAL '1 hour';
```

### Backup & Restore

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U nova nova > backup_$(date +%Y%m%d).sql

# Restore PostgreSQL
docker-compose exec -T postgres psql -U nova nova < backup_20250123.sql
```

## Troubleshooting

### Services Won't Start

```bash
# Check Docker is running
docker --version
docker-compose --version

# Check port conflicts
lsof -i :5432  # PostgreSQL
lsof -i :3200  # API Gateway
lsof -i :3100  # Orchestrator

# Reset everything
docker-compose down -v  # WARNING: Deletes all data
docker-compose up -d
```

### Database Connection Issues

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres pg_isready -U nova

# Reset database
docker-compose down postgres
docker volume rm adam-platform_postgres_data
docker-compose up -d postgres
```

### API Gateway Issues

```bash
# View logs
docker-compose logs api-gateway

# Restart service
docker-compose restart api-gateway

# Rebuild service
docker-compose build api-gateway
docker-compose up -d api-gateway
```

## Next Steps

### 1. Integrate Actual Nova Code

The current setup includes a placeholder Nova Orchestrator. To integrate the real Nova code:

```bash
cd backend/nova

# Clone the actual Nova repository
git clone https://github.com/arc-pbc-co/nova.git temp-nova

# Copy core orchestrator files
cp -r temp-nova/src/* ./src/
cp temp-nova/package.json ./package.json

# Update configuration
# Edit src/config.ts to use ADAM environment variables

# Rebuild
docker-compose build graph-orchestrator
docker-compose up -d graph-orchestrator
```

See [backend/nova/README.md](backend/nova/README.md) for detailed integration steps.

### 2. Update Frontend to Use API Gateway

Replace the frontend's direct Gemini API calls with Nova API Gateway calls:

```typescript
// Old: services/geminiService.ts
import { GoogleGenAI } from '@google/genai';

// New: services/novaService.ts
import axios from 'axios';

const API_BASE = 'http://localhost:3200/api';

export async function createExperiment(data) {
  const response = await axios.post(`${API_BASE}/experiments`, data);
  return response.data;
}

export async function getExperimentStatus(id) {
  const response = await axios.get(`${API_BASE}/experiments/${id}`);
  return response.data;
}
```

### 3. Add Desktop Metal Integration

Once you have Desktop Metal credentials:

```bash
# Add to .env.backend
DESKTOP_METAL_API_KEY=your_key_here
DESKTOP_METAL_API_URL=https://live.desktopmetal.com/api/v1

# Restart services
docker-compose restart
```

### 4. Set Up Production Deployment

For production deployment to Kubernetes:

```bash
cd infrastructure/k8s

# Apply configurations
kubectl apply -f namespace.yaml
kubectl apply -f postgres-deployment.yaml
kubectl apply -f api-gateway-deployment.yaml
# ... etc
```

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OPENAI_API_KEY` | OpenAI API key for agents | - | Yes* |
| `GEMINI_API_KEY` | Google Gemini API key | - | Yes* |
| `DESKTOP_METAL_API_KEY` | Desktop Metal Live Suite key | - | No |
| `DATABASE_URL` | PostgreSQL connection string | auto | No |
| `TIMESCALE_URL` | TimescaleDB connection string | auto | No |
| `VECTOR_DB_URL` | Qdrant URL | auto | No |
| `NATS_URL` | NATS connection URL | auto | No |
| `REDIS_URL` | Redis connection URL | auto | No |
| `JWT_SECRET` | Secret for JWT tokens | auto | No |
| `LOG_LEVEL` | Logging level | `debug` | No |

*At least one AI provider (OpenAI or Gemini) is required.

## Support

For issues or questions:
- Check logs: `docker-compose logs -f [service-name]`
- Review documentation in `/backend/*/README.md`
- Open an issue on GitHub

## License

© 2025 Arc Public Benefit Corp. All rights reserved.
