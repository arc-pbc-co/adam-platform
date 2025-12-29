# Multi-Agent System

The Nova Orchestrator implements a **multi-agent AI system** where specialized agents collaborate to plan, design, execute, and analyze materials science experiments. This architecture enables complex reasoning while maintaining modularity and extensibility.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Nova Orchestrator                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │  Planning   │───►│   Design    │───►│ Simulation  │             │
│  │   Agent     │    │   Agent     │    │   Agent     │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│         │                                      │                     │
│         │                                      ▼                     │
│         │           ┌─────────────┐    ┌─────────────┐             │
│         │           │  Analyzer   │◄───│ Controller  │             │
│         │           │   Agent     │    │   Agent     │             │
│         │           └─────────────┘    └─────────────┘             │
│         │                  │                  │                     │
│         ▼                  ▼                  ▼                     │
│  ┌─────────────────────────────────────────────────────┐           │
│  │              Shared Context & Memory                 │           │
│  │  • Experiment State    • Vector Store (Qdrant)      │           │
│  │  • Workflow Progress   • Historical Learnings       │           │
│  └─────────────────────────────────────────────────────┘           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Agent Types

### Planning Agent

**Purpose**: Generates experiment plans from research hypotheses.

**Inputs**:
- Research hypothesis
- Material constraints
- Available equipment
- Historical learnings

**Outputs**:
- Experiment objectives
- Success criteria
- Phase breakdown
- Resource requirements

**Example**:
```typescript
const planningAgent = new PlanningAgent({
  name: 'PlanningAgent',
  model: 'gpt-4o-mini',
  temperature: 0.2,  // Low for consistency
  maxTokens: 4000,
});

const plan = await planningAgent.run(context, {
  hypothesis: 'Increasing sintering temperature improves density',
  constraints: { maxBudget: 1000, maxIterations: 10 }
});
```

### Design Agent

**Purpose**: Creates detailed process specifications and Design of Experiments (DOE).

**Inputs**:
- Experiment plan
- Material properties
- Equipment capabilities
- Previous results

**Outputs**:
- Process parameters
- DOE matrix
- Equipment settings
- Safety protocols

**Key Features**:
- Generates statistically valid DOE matrices
- Considers parameter interactions
- Applies domain-specific constraints

### Simulation Agent

**Purpose**: Predicts experiment outcomes using physics-based and ML models.

**Inputs**:
- Process design
- Material models
- Historical data

**Outputs**:
- Predicted outcomes
- Confidence intervals
- Risk assessment
- Optimization suggestions

**Models Used**:
- Thermal simulation for sintering
- Mechanical property prediction
- Defect probability estimation

### Controller Agent

**Purpose**: Translates designs into executable equipment commands.

**Inputs**:
- Process specification
- Equipment APIs
- Safety limits

**Outputs**:
- Work orders
- Equipment commands
- Timing sequences
- Monitoring parameters

**INTERSECT Integration**:
```typescript
const controllerAgent = new ControllerAgent({
  name: 'ControllerAgent',
  model: 'gpt-4o-mini',
  temperature: 0.0,  // Deterministic for safety
});

// Generates INTERSECT-compatible activity requests
const workOrder = await controllerAgent.run(context, {
  design: processDesign,
  controllers: availableControllers
});
```

### Analyzer Agent

**Purpose**: Interprets results and generates insights.

**Inputs**:
- Measurement data
- Expected outcomes
- Historical comparisons

**Outputs**:
- Statistical analysis
- Hypothesis validation
- Recommendations
- Learning summaries

## Agent Communication

Agents communicate through a shared context that maintains:

1. **Experiment State** - Current phase and progress
2. **Workflow State** - Activity tracking and history
3. **Accumulated Results** - Data from completed phases
4. **Error Context** - Failure information for recovery

```typescript
interface ExperimentContext {
  experimentId: string;
  hypothesis: string;
  objective: string;
  constraints: ExperimentConstraints;
  materials: Material[];
  parameters: Record<string, any>;
  history: ExperimentHistory[];
}
```

## Agent Configuration

Each agent is configured with:

| Parameter | Description | Typical Values |
|-----------|-------------|----------------|
| `model` | LLM model identifier | `gpt-4o-mini`, `gemini-pro` |
| `temperature` | Randomness (0-1) | 0.0-0.3 for deterministic |
| `maxTokens` | Response length limit | 2000-4000 |
| `timeout` | Request timeout (seconds) | 45-60 |
| `retries` | Retry attempts on failure | 2-3 |

## Extensibility

New agents can be added by implementing the `BaseAgent` interface:

```typescript
class CustomAgent extends BaseAgent {
  async run(
    context: ExperimentContext,
    inputs: CustomInputs
  ): Promise<AgentResponse<CustomOutputs>> {
    // Agent-specific reasoning
  }
}
```

---

*Next: [Experiment Lifecycle](experiment-lifecycle.md) - Planning through analysis*

