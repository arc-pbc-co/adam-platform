# ADAM Platform - Quick Reference Card

## 🚀 Start/Stop Commands

```bash
# Start everything
./scripts/start-backend.sh

# Stop everything
./scripts/stop-backend.sh

# Reset everything (deletes data!)
./scripts/reset-backend.sh

# View logs
docker-compose logs -f [service-name]

# Check status
docker-compose ps
```

## 🔗 Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| API Gateway | http://localhost:3200 | - |
| Nova Orchestrator | http://localhost:3100 | - |
| Grafana | http://localhost:3001 | admin/admin |
| Prometheus | http://localhost:9090 | - |
| NATS Monitor | http://localhost:8222 | - |
| Qdrant Dashboard | http://localhost:6333/dashboard | - |
| PostgreSQL | localhost:5432 | nova/nova_dev_password |
| TimescaleDB | localhost:5433 | timescale/timescale_dev_password |
| Redis | localhost:6379 | - |

## 📡 API Endpoints

### Health Checks
```bash
curl http://localhost:3200/health
curl http://localhost:3100/health
```

### Experiments
```bash
# List experiments
curl http://localhost:3200/api/experiments

# Create experiment
curl -X POST http://localhost:3200/api/experiments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Experiment",
    "hypothesis": "Testing hypothesis",
    "description": "Description here"
  }'

# Get experiment by ID
curl http://localhost:3200/api/experiments/{id}

# Approve experiment
curl -X POST http://localhost:3200/api/experiments/{id}/approve \
  -H "Content-Type: application/json" \
  -d '{"approved": true, "comments": "Looks good"}'

# Cancel experiment
curl -X POST http://localhost:3200/api/experiments/{id}/cancel \
  -H "Content-Type: application/json" \
  -d '{"reason": "Testing cancelled"}'
```

### Hardware
```bash
# List all hardware
curl http://localhost:3200/api/hardware

# Get hardware by ID
curl http://localhost:3200/api/hardware/{id}

# Submit job to hardware
curl -X POST http://localhost:3200/api/hardware/{id}/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "experiment_id": "uuid-here",
    "job_type": "print",
    "parameters": {}
  }'
```

### Agents
```bash
# Get agent activities
curl http://localhost:3200/api/agents/activities

# Get agent metrics
curl http://localhost:3200/api/agents/metrics
```

### Users
```bash
# List users
curl http://localhost:3200/api/users

# Get user by ID
curl http://localhost:3200/api/users/{id}
```

## 🔌 WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:3200/ws');

ws.onopen = () => {
  console.log('Connected');

  // Subscribe to experiments
  ws.send(JSON.stringify({
    type: 'subscribe',
    payload: { topic: 'experiments' }
  }));

  // Subscribe to hardware
  ws.send(JSON.stringify({
    type: 'subscribe',
    payload: { topic: 'hardware' }
  }));

  // Subscribe to all
  ws.send(JSON.stringify({
    type: 'subscribe',
    payload: { topic: '*' }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

// Ping/pong
ws.send(JSON.stringify({ type: 'ping' }));
```

## 💾 Database Access

### PostgreSQL
```bash
# Connect via Docker
docker-compose exec postgres psql -U nova -d nova

# Common queries
SELECT * FROM experiments ORDER BY created_at DESC LIMIT 10;
SELECT * FROM hardware WHERE status = 'idle';
SELECT * FROM agent_activities WHERE status = 'in_progress';
SELECT * FROM jobs WHERE experiment_id = 'uuid-here';
```

### TimescaleDB
```bash
# Connect via Docker
docker-compose exec timescaledb psql -U timescale -d timescale

# Time-series queries
SELECT * FROM measurements
WHERE experiment_id = 'uuid-here'
ORDER BY time DESC LIMIT 100;

SELECT * FROM hardware_telemetry
WHERE hardware_id = 'uuid-here'
AND time > NOW() - INTERVAL '1 hour';

SELECT * FROM agent_metrics
WHERE agent_type = 'planner'
AND time > NOW() - INTERVAL '24 hours';
```

### Redis
```bash
# Connect via Docker
docker-compose exec redis redis-cli

# Commands
KEYS *
GET key_name
SET key_name value
DEL key_name
```

## 📊 Prometheus Queries

Access: http://localhost:9090

```promql
# Request rate
rate(http_requests_total[5m])

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status_code=~"5.."}[5m])

# Request by endpoint
sum(rate(http_requests_total[5m])) by (route)
```

## 🎨 Grafana Dashboards

Access: http://localhost:3001 (admin/admin)

Pre-configured datasources:
- Prometheus (metrics)
- PostgreSQL (application data)
- TimescaleDB (time-series data)

## 🐛 Troubleshooting

### Services won't start
```bash
# Check Docker
docker --version
docker-compose --version

# Check ports
lsof -i :3200  # API Gateway
lsof -i :3100  # Orchestrator
lsof -i :5432  # PostgreSQL

# Reset everything
docker-compose down -v
docker-compose up -d
```

### Database connection issues
```bash
# Check PostgreSQL
docker-compose logs postgres
docker-compose exec postgres pg_isready -U nova

# Restart database
docker-compose restart postgres
```

### API Gateway issues
```bash
# View logs
docker-compose logs api-gateway

# Restart
docker-compose restart api-gateway

# Rebuild
docker-compose build api-gateway
docker-compose up -d api-gateway
```

## 📂 Important Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Service orchestration |
| `.env.backend` | Environment variables |
| `backend/docker/init-db.sql` | PostgreSQL schema |
| `backend/docker/init-timescale.sql` | TimescaleDB schema |
| `backend/api-gateway/src/routes/` | API endpoints |
| `backend/config/default.json` | App configuration |
| `BACKEND_SETUP.md` | Full setup guide |
| `PHASE_1_COMPLETE.md` | Architecture details |

## 🔐 Environment Variables

Edit `.env.backend`:

```bash
# Required
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...

# Optional
DESKTOP_METAL_API_KEY=...
JWT_SECRET=change-this-in-production

# Auto-configured
DATABASE_URL=postgresql://nova:nova_dev_password@localhost:5432/nova
TIMESCALE_URL=postgresql://timescale:timescale_dev_password@localhost:5433/timescale
VECTOR_DB_URL=http://localhost:6333
NATS_URL=nats://localhost:4222
REDIS_URL=redis://localhost:6379
```

## 📖 Documentation

- [README.md](README.md) - Main documentation
- [BACKEND_SETUP.md](BACKEND_SETUP.md) - Setup guide
- [PHASE_1_COMPLETE.md](PHASE_1_COMPLETE.md) - Architecture
- [backend/nova/README.md](backend/nova/README.md) - Nova integration

## 💡 Tips

1. **Always check logs first**: `docker-compose logs -f`
2. **Use Grafana for monitoring**: http://localhost:3001
3. **Test endpoints with curl** before integrating
4. **Subscribe to WebSocket events** for real-time updates
5. **Back up data regularly**: `docker-compose exec postgres pg_dump -U nova nova > backup.sql`

## 🎯 Next Steps

1. ✅ Backend infrastructure complete
2. ⏳ Integrate actual Nova orchestrator code
3. ⏳ Update frontend to use API Gateway
4. ⏳ Connect Desktop Metal hardware
5. ⏳ Deploy to production (Kubernetes)

---

Need help? Check [BACKEND_SETUP.md](BACKEND_SETUP.md) or review logs with `docker-compose logs -f`
