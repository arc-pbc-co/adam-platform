# Developer Setup Guide

Follow this guide to set up your local development environment for the ADAM platform.

## Prerequisites

- **Node.js**: v18 or higher
- **Docker & Docker Compose**: For running backend services
- **Python**: v3.9+ (Required for the INTERSECT simulator)
- **Git**

## 1. Environment Configuration

### Backend
The backend relies on several environment variables. Copy the example file:

```bash
cp .env.backend.example .env.backend
```

Open `.env.backend` and verify the settings. For local development, the defaults usually work, but ensure you have a valid `GEMINI_API_KEY` if you plan to use AI features.

### Frontend
Copy the frontend example file:

```bash
cd frontend
cp .env.example .env.local
```

## 2. Starting Infrastructure & Backend

We use Docker Compose to spin up the database, message bus, and backend services.

```bash
# From the project root
./scripts/start-backend.sh
```

This script wraps `docker-compose up` and ensures all required containers are started:
- `adam-postgres` (Port 5432)
- `adam-timescaledb` (Port 5433)
- `adam-qdrant` (Port 6333/6334)
- `adam-nats` (Port 4222)
- `adam-redis` (Port 6379)
- `adam-graph-orchestrator` (Port 3100)
- `adam-api-gateway` (Port 3200)

**Verify**: Visit [http://localhost:3200/health](http://localhost:3200/health) (or equivalent endpoint) to check if the gateway is up.

## 3. Starting the INTERSECT Simulator

To test hardware integration without physical printers, run the Python simulator.

```bash
cd contract-test-scaffold/simulator/python

# Install dependencies
pip install -r requirements.txt

# Run the simulator
uvicorn app.main:app --port 8090
```

The simulator will listen on `http://localhost:8090`.

## 4. Starting the Frontend

Run the React application locally:

```bash
cd frontend
npm install
npm run dev
```

Access the app at [http://localhost:3000](http://localhost:3000).

## Troubleshooting

### "Container name already in use"
If `start-backend.sh` fails because containers exist, remove them:
```bash
docker-compose down
# OR forcefully remove specific containers
docker rm -f adam-postgres adam-nats ...
```

### Database Connection Issues
Ensure no local PostgreSQL instance is running on port 5432 that might conflict with the Docker container.

### Simulator Dependencies
If `pip install` fails, try using a virtual environment:
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
