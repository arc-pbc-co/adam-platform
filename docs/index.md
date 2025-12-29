# ADAM Platform Documentation

**Autonomous Discovery and Advancement of Materials**

Version 2.0 | December 2024

---

## Architecture Overview

- [Introduction](overview/introduction.md) - Platform vision and objectives
- [Concept](overview/concept.md) - Architectural approach and design philosophy
- [About](overview/about.md) - Project background and team

## Architecture Specification

### Nova Orchestrator

- [Multi-Agent System](architecture/nova/multi-agent-system.md) - AI agent architecture
- [Experiment Lifecycle](architecture/nova/experiment-lifecycle.md) - Planning through analysis
- [Learning System](architecture/nova/learning-system.md) - Vector-based knowledge retention

### INTERSECT Integration

- [Controller Integration](architecture/intersect/controller-integration.md) - Instrument controller protocol
- [Event Bridge](architecture/intersect/event-bridge.md) - NATS-based event streaming
- [Correlation & Tracing](architecture/intersect/correlation-tracing.md) - End-to-end experiment tracking
- [Orchestration Patterns](architecture/intersect/orchestration-patterns.md) - Scheduler-Agent-Supervisor

### System Architecture

- [System-of-Systems](architecture/system/system-of-systems.md) - Component architecture
- [Data Architecture](architecture/system/data-architecture.md) - PostgreSQL, TimescaleDB, Qdrant
- [Security Architecture](architecture/system/security.md) - mTLS, authorization, secrets

## Deployment

- [Local Development](deployment/local-development.md) - Docker Compose setup
- [Kubernetes Deployment](deployment/kubernetes.md) - Production deployment guide
- [Edge Deployment](deployment/edge-deployment.md) - Controller proxy configuration

## API Reference

- [REST API](api/rest-api.md) - HTTP endpoints
- [Event Reference](api/events.md) - NATS event schemas
- [Type Definitions](api/types.md) - TypeScript interfaces

## Guides

- [Getting Started](guides/getting-started.md) - Quick start guide
- [Creating Experiments](guides/creating-experiments.md) - Experiment workflow
- [Integrating Controllers](guides/integrating-controllers.md) - Adding new instruments
- [Troubleshooting](guides/troubleshooting.md) - Common issues and solutions

## Appendix

- [Glossary](appendix/glossary.md) - Terms and definitions
- [Bibliography](appendix/bibliography.md) - References and citations
- [Changelog](appendix/changelog.md) - Version history

---

## Quick Links

| Resource | Description |
|----------|-------------|
| [GitHub Repository](https://github.com/adam-platform/adam) | Source code |
| [API Playground](https://api.adam.example.com/docs) | Interactive API docs |
| [Status Dashboard](https://status.adam.example.com) | System health |

---

*ADAM Platform is developed for autonomous materials science research.*

