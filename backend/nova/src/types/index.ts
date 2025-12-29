// Core type definitions for ADAM Nova Orchestrator

export interface ExperimentContext {
  experimentId: string;
  hypothesis: string;
  objective: string;
  constraints: ExperimentConstraints;
  materials: Material[];
  parameters: Record<string, any>;
  history: ExperimentEvent[];
}

export interface ExperimentConstraints {
  maxBudget: number;
  maxDuration: number; // hours
  maxIterations: number;
  safetyLevel: 'R1' | 'R2' | 'R3';
  materials: string[]; // allowed materials
}

export interface Material {
  id: string;
  name: string;
  composition: Record<string, number>;
  properties: Record<string, any>;
  safetyData: SafetyData;
}

export interface SafetyData {
  hazards: string[];
  precautions: string[];
  disposal: string;
  toxicity: 'low' | 'medium' | 'high';
}

export interface ExperimentEvent {
  timestamp: Date;
  type: string;
  agent: string;
  data: any;
  status: 'success' | 'failure' | 'pending';
}

export interface AgentResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    agent: string;
    timestamp: Date;
    durationMs: number;
    tokensUsed?: number;
    cost?: number;
  };
}

export interface PlanningResult {
  plan: ExperimentPlan;
  rationale: string;
  alternativePlans: ExperimentPlan[];
  estimatedCost: number;
  estimatedDuration: number; // hours
  riskAssessment: RiskAssessment;
}

export interface ExperimentPlan {
  phases: Phase[];
  materials: MaterialSpec[];
  equipment: EquipmentSpec[];
  measurements: MeasurementSpec[];
  successCriteria: string[];
}

export interface Phase {
  name: string;
  description: string;
  steps: Step[];
  estimatedDuration: number; // minutes
}

export interface Step {
  action: string;
  parameters: Record<string, any>;
  equipment?: string;
  validations: string[];
}

export interface MaterialSpec {
  materialId: string;
  quantity: number;
  unit: string;
  role: string; // base, additive, coating, etc.
  purity?: number;
}

export interface EquipmentSpec {
  equipmentId: string;
  usage: string;
  settings: Record<string, any>;
}

export interface MeasurementSpec {
  type: string;
  method: string;
  frequency: string;
  expectedRange?: [number, number];
}

export interface RiskAssessment {
  overallRisk: 'R1' | 'R2' | 'R3';
  riskFactors: RiskFactor[];
  mitigations: Mitigation[];
  approvalRequired: boolean;
  approvalLevel: 'none' | 'supervisor' | 'team';
}

export interface RiskFactor {
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  likelihood: 'low' | 'medium' | 'high';
}

export interface Mitigation {
  riskFactor: string;
  strategy: string;
  implementation: string;
}

export interface DesignOfExperiments {
  designType: 'factorial' | 'response_surface' | 'mixture' | 'taguchi';
  factors: Factor[];
  responses: Response[];
  runs: Run[];
  analysisMethod: string;
}

export interface Factor {
  name: string;
  type: 'continuous' | 'discrete' | 'categorical';
  unit?: string;
  levels: any[];
  lowValue?: number;
  highValue?: number;
}

export interface Response {
  name: string;
  unit: string;
  targetValue?: number;
  targetRange?: [number, number];
  optimization: 'maximize' | 'minimize' | 'target';
}

export interface Run {
  runNumber: number;
  factorValues: Record<string, any>;
  predictedResponses?: Record<string, number>;
  actualResponses?: Record<string, number>;
}

export interface SimulationResult {
  predictedOutcomes: PredictedOutcome[];
  confidence: number;
  assumptions: string[];
  limitations: string[];
  recommendations: string[];
}

export interface PredictedOutcome {
  property: string;
  value: number;
  unit: string;
  confidence: number;
  range: [number, number];
}

export interface ExecutionPlan {
  jobId: string;
  experimentId: string;
  equipmentId: string;
  jobType: 'print' | 'sinter' | 'measure' | 'analyze';
  parameters: Record<string, any>;
  files?: string[];
  estimatedTime: number; // minutes
}

export interface AnalysisResult {
  measurements: Measurement[];
  insights: Insight[];
  comparison: Comparison;
  nextSteps: string[];
  learnings: Learning[];
}

export interface Measurement {
  type: string;
  value: number;
  unit: string;
  uncertainty: number;
  method: string;
  timestamp: Date;
}

export interface Insight {
  category: string;
  finding: string;
  significance: 'low' | 'medium' | 'high';
  actionable: boolean;
}

export interface Comparison {
  vsTarget: number; // percentage difference
  vsBaseline: number;
  ranking: number; // among all experiments
  improvement: boolean;
}

export interface Learning {
  topic: string;
  knowledge: string;
  applicability: string[];
  confidence: number;
}

export interface WorkflowState {
  experimentId: string;
  currentPhase: WorkflowPhase;
  status: WorkflowStatus;
  startTime: Date;
  checkpoints: Checkpoint[];
  agentActivities: AgentActivity[];
  /** INTERSECT activities currently being executed */
  intersectActivities?: IntersectActivityState[];
  /** Progress through execution phase (0-100) */
  executionProgress?: number;
}

export type WorkflowPhase = 'planning' | 'designing' | 'simulating' | 'approving' | 'executing' | 'analyzing' | 'complete';
export type WorkflowStatus = 'active' | 'paused' | 'waiting_approval' | 'waiting_execution' | 'failed' | 'success';

export interface Checkpoint {
  phase: WorkflowPhase;
  timestamp: Date;
  state: any;
}

export interface AgentActivity {
  agentType: AgentType;
  action: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

/**
 * Tracks an INTERSECT activity within a workflow
 */
export interface IntersectActivityState {
  activityId: string;
  controllerId: string;
  activityName: string;
  phase: WorkflowPhase;
  runNumber?: number;
  stepIndex?: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  dataProducts?: string[];
  retryCount?: number;
}

export type AgentType = 'planner' | 'designer' | 'simulator' | 'controller' | 'analyzer';

export interface AgentConfig {
  name: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number; // seconds
  retries: number;
}
