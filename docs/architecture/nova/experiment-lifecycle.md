# Experiment Lifecycle

The Nova Orchestrator manages experiments through a well-defined lifecycle with five distinct phases. Each phase is handled by a specialized agent and produces artifacts that feed into subsequent phases.

## Lifecycle Phases

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Planning │───►│ Designing│───►│Simulating│───►│Executing │───►│Analyzing │
│          │    │          │    │          │    │          │    │          │
│  Agent:  │    │  Agent:  │    │  Agent:  │    │  Agent:  │    │  Agent:  │
│ Planning │    │  Design  │    │Simulation│    │Controller│    │ Analyzer │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │               │               │
     ▼               ▼               ▼               ▼               ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   Plan   │    │   DOE    │    │Predictions│   │ Results  │    │ Insights │
│ Document │    │  Matrix  │    │  Report   │   │   Data   │    │  Report  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

## Phase 1: Planning

**Objective**: Transform research hypothesis into actionable experiment plan.

**Inputs**:
- Research hypothesis (e.g., "Higher sintering temperature improves density")
- Constraints (budget, time, safety)
- Available materials and equipment
- Historical learnings from similar experiments

**Process**:
1. Parse and validate hypothesis
2. Query vector store for relevant past experiments
3. Generate experiment objectives and success criteria
4. Define phase structure and dependencies
5. Estimate resource requirements

**Outputs**:
```typescript
interface ExperimentPlan {
  objectives: string[];
  successCriteria: Criterion[];
  phases: Phase[];
  estimatedDuration: number;
  requiredMaterials: MaterialSpec[];
  requiredEquipment: EquipmentSpec[];
}
```

## Phase 2: Designing

**Objective**: Create detailed process parameters and Design of Experiments (DOE).

**Inputs**:
- Experiment plan
- Material properties database
- Equipment capability specifications
- Domain constraints

**Process**:
1. Identify key process parameters
2. Determine parameter ranges and levels
3. Generate DOE matrix (factorial, response surface, etc.)
4. Define measurement points
5. Create safety protocols

**Outputs**:
```typescript
interface DesignOfExperiments {
  parameters: Parameter[];
  levels: Record<string, number[]>;
  experimentMatrix: ExperimentRun[];
  measurementSpec: MeasurementSpec[];
}
```

**DOE Types Supported**:
| Type | Use Case | Runs |
|------|----------|------|
| Full Factorial | Complete exploration | k^n |
| Fractional Factorial | Screening | k^(n-p) |
| Central Composite | Response surface | 2^n + 2n + center |
| Latin Hypercube | Space-filling | Configurable |

## Phase 3: Simulating

**Objective**: Predict outcomes and identify potential issues before execution.

**Inputs**:
- DOE matrix
- Physics-based models
- Historical measurement data
- Material property models

**Process**:
1. Run thermal simulations for each DOE point
2. Predict mechanical properties
3. Estimate defect probabilities
4. Calculate confidence intervals
5. Flag high-risk parameter combinations

**Outputs**:
```typescript
interface SimulationResults {
  predictions: PredictedOutcome[];
  confidenceIntervals: Record<string, [number, number]>;
  riskAssessment: RiskItem[];
  recommendations: string[];
}
```

## Phase 4: Executing

**Objective**: Run physical experiments through instrument controllers.

**Inputs**:
- DOE matrix with simulation-validated parameters
- Controller endpoints
- Safety limits

**Process**:
1. Map DOE runs to work orders
2. Schedule work orders by priority
3. Execute via INTERSECT protocol
4. Monitor progress and telemetry
5. Handle failures and retries

**Work Order Mapping**:
```typescript
// DOE run → INTERSECT activity
const mapping = adapter.mapWorkOrderToActivity(workOrder);
// Result: { controllerId, activityName, options, timeout }
```

**Activity States**:
```
PENDING → RUNNING → COMPLETED
              │
              └─────► FAILED → (retry or escalate)
```

## Phase 5: Analyzing

**Objective**: Extract insights from experimental results.

**Inputs**:
- Measurement data from TimescaleDB
- DOE matrix
- Simulation predictions
- Historical baselines

**Process**:
1. Load and validate measurement data
2. Compute statistical analyses
3. Compare to predictions
4. Validate/refute hypothesis
5. Generate recommendations
6. Store learnings in vector database

**Outputs**:
```typescript
interface AnalysisResults {
  statistics: StatisticalSummary;
  hypothesisValidation: ValidationResult;
  insights: Insight[];
  recommendations: Recommendation[];
  nextSteps: string[];
}
```

## State Management

Experiment state is tracked in the database:

```sql
-- Experiment record
UPDATE experiments SET
  status = 'executing',
  current_phase = 'Phase 3: Printing',
  progress = 0.45,
  updated_at = NOW()
WHERE id = $experimentId;
```

## Error Handling

Each phase implements error recovery:

| Error Type | Recovery Strategy |
|------------|------------------|
| Transient | Retry with exponential backoff |
| Agent Failure | Fallback to simpler model |
| Controller Timeout | Supervisor intervention |
| Data Validation | Human review queue |

---

*Next: [Learning System](learning-system.md) - Vector-based knowledge retention*

