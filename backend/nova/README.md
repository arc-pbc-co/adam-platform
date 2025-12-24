# ADAM Nova Orchestrator

This is a placeholder for the Nova orchestrator service. The full Nova implementation from the [arc-pbc-co/nova](https://github.com/arc-pbc-co/nova) repository should be integrated here.

## Core Responsibilities

The Nova Orchestrator is the central workflow execution engine that:

1. **Manages Multi-Agent System**
   - Planning Agent: Hypothesis generation and experimental design
   - Design Agent: DOE creation and parameter optimization
   - Simulation Agent: Predictive modeling before printing
   - Controller Agent: Direct printer integration
   - Analyzer Agent: Result interpretation and learning

2. **Orchestrates Workflows**
   - Event-driven architecture for agent coordination
   - Built-in reflection patterns for self-improvement
   - State management across experiment lifecycle

3. **Safety & Risk Management**
   - R1/R2/R3 risk classification
   - Automated approval for R1 (low risk)
   - Human-in-the-loop for R2/R3 (medium/high risk)
   - Material safety constraints validation

4. **Hardware Integration**
   - Desktop Metal Live Suite connectors
   - Job submission and monitoring
   - Equipment status tracking

5. **Knowledge Management**
   - Materials database with vector embeddings
   - Experiment history and learnings
   - Performance optimization over time

## Integration Steps

To integrate the actual Nova codebase:

1. Clone the Nova repository:
   ```bash
   git clone https://github.com/arc-pbc-co/nova.git
   cd nova
   ```

2. Copy the core orchestrator code into this directory

3. Update configuration to match ADAM platform environment

4. Implement NATS event handlers for:
   - `EXPERIMENTS.experiment.created`
   - `EXPERIMENTS.experiment.approved`
   - `HARDWARE.job.submitted`
   - etc.

5. Connect to shared PostgreSQL, TimescaleDB, and Vector DB

## Placeholder Implementation

For now, a basic placeholder service is provided that:
- Listens for experiment events from NATS
- Provides health check endpoint
- Logs received events
- Can be extended with actual Nova logic

## API Endpoints

- `GET /health` - Health check
- `POST /experiments/:id/plan` - Trigger planning agent
- `POST /experiments/:id/design` - Trigger design agent
- `POST /experiments/:id/simulate` - Trigger simulation agent
- `POST /experiments/:id/execute` - Trigger execution
- `GET /experiments/:id/status` - Get experiment status

## Environment Variables

See [/backend/config/default.json](../config/default.json) and [/.env.backend.example](../../.env.backend.example)
