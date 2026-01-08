# Backend Services

The ADAM backend is composed of two primary Node.js microservices and a suite of infrastructure components.

## 1. Nova Orchestrator

**Location**: `backend/nova`
**Entry Point**: `src/index.ts`

The Nova Orchestrator is the "brain" of the ADAM platform. It is responsible for managing the lifecycle of experiments, coordinating the multi-agent system, and scheduling tasks on hardware.

### Key Responsibilities
- **Agent Management**: Initializes and monitors 5 specialized AI agents (`PlanningAgent`, `DesignAgent`, `SimulationAgent`, `ControllerAgent`, `AnalyzerAgent`).
- **NATS Subscription**: Listens for events on `EXPERIMENTS.*` and `HARDWARE.*` to react to state changes in real-time.
- **Health Monitoring**: Exposes a detailed health check at `/health` reporting the status of all active agents.

```typescript
// Example: Orchestrator Initialization
orchestrator = new NovaOrchestrator();
logger.info('Nova Orchestrator initialized');
```

## 2. API Gateway

**Location**: `backend/api-gateway`
**Entry Point**: `src/index.ts`

The API Gateway is the primary interface for the frontend (React) and external clients. It unifies REST endpoints and WebSocket connections into a single service.

### Key Features
- **Security**: Implements `helmet` for headers and `cors` for cross-origin requests.
- **WebSocket Server**: `InitializeWebSocket` handles real-time bidirectional communication at `/ws`.
- **Infrastructure Connection**: Manages connections to:
    - **PostgreSQL**: Primary data store.
    - **Redis**: Cache layer.
    - **NATS**: Event bus.

## 3. Infrastructure Components

### NATS (Message Broker)
ADAM uses NATS for loosely coupled, event-driven communication.
- **JetStream**: Enabled for message persistence (ensures no events are lost if a service is down).
- **Subjects**:
    - `intersect.events.>`: All hardware events.
    - `adam.event`: Normalized platform events.

### Databases
- **PostgreSQL**: Stores relational data like Users, Organizations, and Experiments.
- **TimescaleDB**: A PostgreSQL extension for high-frequency sensor data (temperatures, pressure readings).
- **Qdrant**: A vector database used by the AI agents to store embeddings of scientific papers and past experiments for semantic retrieval.
