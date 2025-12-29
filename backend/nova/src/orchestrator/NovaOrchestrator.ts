import { Pool } from 'pg';
import { connect, NatsConnection, JetStreamClient, JetStreamManager, StringCodec, consumerOpts, RetentionPolicy, StorageType, createInbox } from 'nats';
import { QdrantClient } from '@qdrant/js-client-rest';
import { PlanningAgent } from '../agents/PlanningAgent';
import { DesignAgent } from '../agents/DesignAgent';
import { SimulationAgent } from '../agents/SimulationAgent';
import { ControllerAgent } from '../agents/ControllerAgent';
import { AnalyzerAgent} from '../agents/AnalyzerAgent';
import {
  ExperimentContext,
  WorkflowState,
  PlanningResult,
  DesignOfExperiments,
  SimulationResult,
  ExecutionPlan,
  AgentActivity,
  Material,
  Learning,
  Step,
  IntersectActivityState,
  WorkflowPhase,
} from '../types';
import { logger } from '../utils/logger';
import {
  IntersectWorkflowAdapter,
  createWorkflowAdapter,
  createGatewayService,
  createEventBridge,
  createCorrelationStore,
  ICorrelationStore,
  IIntersectGatewayService,
  IIntersectEventBridge,
  GatewayConfig,
  StepExecutionResult,
  ActivityCorrelation,
  // Orchestration
  IScheduler,
  createScheduler,
  Agent,
  createAgent,
  Supervisor,
  createSupervisor,
  EscalationEvent,
} from '../integrations';

export class NovaOrchestrator {
  private db: Pool;
  private timescaleDb: Pool;
  private qdrant: QdrantClient;
  private nats?: NatsConnection;
  private jetstream?: JetStreamClient;
  private sc = StringCodec();

  private static LEARNINGS_COLLECTION = 'materials_knowledge';

  // Agents
  private planningAgent: PlanningAgent;
  private designAgent: DesignAgent;
  private simulationAgent: SimulationAgent;
  private controllerAgent: ControllerAgent;
  private analyzerAgent: AnalyzerAgent;

  // Workflow states
  private workflows: Map<string, WorkflowState> = new Map();

  // INTERSECT integration
  private intersectGateway?: IIntersectGatewayService;
  private intersectEventBridge?: IIntersectEventBridge;
  private intersectCorrelationStore?: ICorrelationStore;
  private workflowAdapter?: IntersectWorkflowAdapter;
  private intersectEnabled: boolean = false;

  // Orchestration (Scheduler-Agent-Supervisor)
  private scheduler?: IScheduler;
  private agent?: Agent;
  private supervisor?: Supervisor;

  // Phase completion tracking
  private phaseCompletionPromises: Map<string, {
    resolve: () => void;
    reject: (error: Error) => void;
    expectedActivities: number;
    completedActivities: number;
    failedActivities: number;
  }> = new Map();

  constructor() {
    // Initialize main database
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Initialize TimescaleDB for time-series data
    this.timescaleDb = new Pool({
      connectionString: process.env.TIMESCALE_URL || process.env.DATABASE_URL,
    });

    // Initialize Qdrant vector database
    const qdrantUrl = process.env.VECTOR_DB_URL || 'http://localhost:6333';
    this.qdrant = new QdrantClient({ url: qdrantUrl });
    this.initializeQdrant();

    // Initialize agents - using gpt-4o-mini by default (widely available)
    this.planningAgent = new PlanningAgent({
      name: 'PlanningAgent',
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 4000,
      timeout: 60,
      retries: 3,
    });

    this.designAgent = new DesignAgent({
      name: 'DesignAgent',
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 4000,
      timeout: 60,
      retries: 3,
    });

    this.simulationAgent = new SimulationAgent({
      name: 'SimulationAgent',
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 3000,
      timeout: 60,
      retries: 3,
    });

    this.controllerAgent = new ControllerAgent({
      name: 'ControllerAgent',
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      temperature: 0.0,
      maxTokens: 2000,
      timeout: 45,
      retries: 3,
    });

    this.analyzerAgent = new AnalyzerAgent({
      name: 'AnalyzerAgent',
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 3000,
      timeout: 60,
      retries: 3,
    });

    this.initializeNATS();
    this.initializeIntersect();
  }

  /**
   * Initialize INTERSECT integration services
   */
  private initializeIntersect(): void {
    // Check if INTERSECT is enabled
    const intersectEnabled = process.env.INTERSECT_ENABLED === 'true';
    if (!intersectEnabled) {
      logger.info('INTERSECT integration disabled');
      return;
    }

    try {
      // Parse controller configuration from environment
      const controllers = this.parseControllerConfig();

      // Create gateway configuration
      const gatewayConfig: GatewayConfig = {
        natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
        controllers,
        defaultTimeout: parseInt(process.env.INTERSECT_TIMEOUT || '300000', 10),
        retryConfig: {
          maxRetries: 3,
          baseDelayMs: 1000,
          maxDelayMs: 30000,
        },
      };

      // Initialize services
      this.intersectCorrelationStore = createCorrelationStore('memory');
      this.intersectGateway = createGatewayService(gatewayConfig);
      this.intersectEventBridge = createEventBridge({
        natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
      });

      // Initialize orchestration components (Scheduler-Agent-Supervisor)
      this.initializeOrchestration();

      // Create workflow adapter with optional scheduler
      this.workflowAdapter = createWorkflowAdapter(
        this.intersectGateway,
        this.intersectEventBridge,
        this.intersectCorrelationStore,
        {
          defaultControllerId: process.env.INTERSECT_DEFAULT_CONTROLLER || 'simulated-controller',
          defaultTimeout: parseInt(process.env.INTERSECT_TIMEOUT || '300000', 10),
          useScheduler: process.env.INTERSECT_USE_SCHEDULER === 'true',
        },
        this.scheduler
      );

      // Register callbacks for activity events
      this.workflowAdapter.onActivityComplete((result) => {
        this.handleIntersectActivityComplete(result);
      });

      this.workflowAdapter.onActivityFailed((result) => {
        this.handleIntersectActivityFailed(result);
      });

      this.workflowAdapter.onActivityProgress((activityId, progress) => {
        this.handleIntersectActivityProgress(activityId, progress);
      });

      // Start event bridge
      this.intersectEventBridge.start().catch((error) => {
        logger.error('Failed to start INTERSECT event bridge:', error);
      });

      this.intersectEnabled = true;
      logger.info('INTERSECT integration initialized', {
        controllers: controllers.length,
        schedulerEnabled: !!this.scheduler,
      });
    } catch (error) {
      logger.error('Failed to initialize INTERSECT integration:', error);
    }
  }

  /**
   * Initialize orchestration components (Scheduler-Agent-Supervisor pattern)
   */
  private initializeOrchestration(): void {
    const useScheduler = process.env.INTERSECT_USE_SCHEDULER === 'true';
    if (!useScheduler) {
      logger.info('INTERSECT orchestration (Scheduler-Agent-Supervisor) disabled');
      return;
    }

    if (!this.intersectGateway || !this.intersectEventBridge || !this.intersectCorrelationStore) {
      logger.warn('Cannot initialize orchestration: INTERSECT services not ready');
      return;
    }

    try {
      // Create scheduler
      this.scheduler = createScheduler({
        defaultMaxRetries: parseInt(process.env.INTERSECT_MAX_RETRIES || '3', 10),
        baseRetryDelayMs: parseInt(process.env.INTERSECT_RETRY_DELAY || '5000', 10),
        maxRetryDelayMs: parseInt(process.env.INTERSECT_MAX_RETRY_DELAY || '60000', 10),
      });

      // Create agent
      this.agent = createAgent(
        this.scheduler,
        this.intersectCorrelationStore,
        this.intersectGateway,
        this.intersectEventBridge,
        {
          pollIntervalMs: parseInt(process.env.INTERSECT_POLL_INTERVAL || '5000', 10),
          maxConcurrent: parseInt(process.env.INTERSECT_MAX_CONCURRENT || '10', 10),
          agentId: `nova-agent-${process.env.HOSTNAME || Date.now()}`,
          verbose: process.env.INTERSECT_VERBOSE === 'true',
        }
      );

      // Create supervisor
      this.supervisor = createSupervisor(
        this.scheduler,
        this.intersectCorrelationStore,
        this.intersectGateway,
        {
          monitorIntervalMs: parseInt(process.env.INTERSECT_MONITOR_INTERVAL || '30000', 10),
          staleThresholdMs: parseInt(process.env.INTERSECT_STALE_THRESHOLD || '600000', 10),
          activityTimeoutMs: parseInt(process.env.INTERSECT_ACTIVITY_TIMEOUT || '3600000', 10),
          autoRetryEnabled: process.env.INTERSECT_AUTO_RETRY !== 'false',
          escalationEnabled: process.env.INTERSECT_ESCALATION !== 'false',
          healthCheckIntervalMs: parseInt(process.env.INTERSECT_HEALTH_CHECK_INTERVAL || '60000', 10),
        }
      );

      // Register escalation handler
      this.supervisor.onEscalation(async (event: EscalationEvent) => {
        await this.handleEscalation(event);
      });

      // Start agent and supervisor
      this.agent.start();
      this.supervisor.start();

      logger.info('INTERSECT orchestration initialized (Scheduler-Agent-Supervisor)');
    } catch (error) {
      logger.error('Failed to initialize INTERSECT orchestration:', error);
    }
  }

  /**
   * Handle escalation events from the supervisor
   */
  private async handleEscalation(event: EscalationEvent): Promise<void> {
    logger.warn('INTERSECT escalation event', event);

    // Publish escalation to NATS for external handling
    await this.publishEvent('EXPERIMENTS', 'experiment.escalation', {
      type: event.type,
      experimentRunId: event.experimentRunId,
      activityId: event.activityId,
      controllerId: event.controllerId,
      error: event.error,
      retryCount: event.retryCount,
      timestamp: event.timestamp,
    });

    // Handle specific escalation types
    switch (event.type) {
      case 'controller_offline':
        logger.error(`Controller ${event.controllerId} is offline`, event);
        // Could trigger workflow pause or failover logic
        break;
      case 'repeated_failures':
        logger.error(`Repeated failures for experiment ${event.experimentRunId}`, event);
        // Could mark experiment as failed
        if (event.experimentRunId) {
          const workflow = this.workflows.get(event.experimentRunId);
          if (workflow) {
            workflow.status = 'failed';
            await this.updateExperimentStatus(event.experimentRunId, 'failed');
          }
        }
        break;
      case 'activity_timeout':
        logger.error(`Activity timeout: ${event.activityId}`, event);
        break;
      case 'task_failed':
        logger.warn(`Task failed: ${event.taskId}`, event);
        break;
    }
  }

  /**
   * Parse controller configuration from environment
   */
  private parseControllerConfig(): Array<{ controllerId: string; endpoint: string; healthEndpoint?: string }> {
    // Default controllers for development
    const defaultControllers = [
      { controllerId: 'simulated-controller', endpoint: 'http://localhost:8090' },
      { controllerId: 'desktop-metal-controller', endpoint: 'http://localhost:8091' },
      { controllerId: 'furnace-controller', endpoint: 'http://localhost:8092' },
      { controllerId: 'characterization-controller', endpoint: 'http://localhost:8093' },
    ];

    // Check for custom configuration in INTERSECT_CONTROLLERS env var
    const controllersEnv = process.env.INTERSECT_CONTROLLERS;
    if (controllersEnv) {
      try {
        return JSON.parse(controllersEnv);
      } catch (error) {
        logger.warn('Failed to parse INTERSECT_CONTROLLERS, using defaults');
      }
    }

    return defaultControllers;
  }

  /**
   * Handle INTERSECT activity completion
   */
  private async handleIntersectActivityComplete(result: StepExecutionResult): Promise<void> {
    logger.info('INTERSECT activity completed', { activityId: result.activityId });

    if (!this.intersectCorrelationStore || !result.activityId) return;

    const correlation = await this.intersectCorrelationStore.findByActivityId(result.activityId) as ActivityCorrelation | undefined;
    if (!correlation) return;

    const workflow = this.workflows.get(correlation.experimentRunId);
    if (!workflow) return;

    // Update correlation with completion data
    await this.intersectCorrelationStore.updateStatus(result.activityId, 'completed');

    // Update INTERSECT activity state in workflow
    this.updateIntersectActivityState(workflow, result.activityId, {
      status: 'completed',
      endTime: new Date(),
      dataProducts: result.dataProducts,
    });

    // Add to agent activities
    workflow.agentActivities.push({
      agentType: 'controller',
      action: `intersect_activity_${result.activityId}`,
      startTime: new Date(),
      endTime: new Date(),
      status: 'completed',
      result: { dataProducts: result.dataProducts },
    });

    // Publish completion event
    await this.publishEvent('EXPERIMENTS', 'experiment.activity_completed', {
      experimentId: correlation.experimentRunId,
      activityId: result.activityId,
      phase: correlation.phase,
      runNumber: correlation.runNumber,
      dataProducts: result.dataProducts,
    });

    // Check if this completes the current phase
    await this.checkPhaseCompletion(workflow, correlation);
  }

  /**
   * Handle INTERSECT activity failure
   */
  private async handleIntersectActivityFailed(result: StepExecutionResult): Promise<void> {
    logger.error('INTERSECT activity failed', { activityId: result.activityId, error: result.error });

    if (!this.intersectCorrelationStore || !result.activityId) return;

    const correlation = await this.intersectCorrelationStore.findByActivityId(result.activityId) as ActivityCorrelation | undefined;
    if (!correlation) return;

    const workflow = this.workflows.get(correlation.experimentRunId);
    if (!workflow) return;

    // Update correlation with failure
    await this.intersectCorrelationStore.updateStatus(result.activityId, 'failed');

    // Update INTERSECT activity state in workflow
    this.updateIntersectActivityState(workflow, result.activityId, {
      status: 'failed',
      endTime: new Date(),
      error: result.error,
    });

    // Add to agent activities
    workflow.agentActivities.push({
      agentType: 'controller',
      action: `intersect_activity_${result.activityId}`,
      startTime: new Date(),
      endTime: new Date(),
      status: 'failed',
      error: result.error,
    });

    // Publish failure event
    await this.publishEvent('EXPERIMENTS', 'experiment.activity_failed', {
      experimentId: correlation.experimentRunId,
      activityId: result.activityId,
      phase: correlation.phase,
      runNumber: correlation.runNumber,
      error: result.error,
    });

    // Check if this affects phase completion (might fail the phase)
    await this.checkPhaseCompletion(workflow, correlation, result.error);
  }

  /**
   * Handle INTERSECT activity progress update
   */
  private handleIntersectActivityProgress(activityId: string, progress: number): void {
    logger.debug('INTERSECT activity progress', { activityId, progress });

    // Find workflow by activity ID
    for (const [, workflow] of this.workflows) {
      const activity = workflow.intersectActivities?.find(a => a.activityId === activityId);
      if (activity) {
        activity.progress = progress;
        this.updateExecutionProgress(workflow);
        break;
      }
    }
  }

  /**
   * Update an INTERSECT activity's state in the workflow
   */
  private updateIntersectActivityState(
    workflow: WorkflowState,
    activityId: string,
    update: Partial<IntersectActivityState>
  ): void {
    if (!workflow.intersectActivities) {
      workflow.intersectActivities = [];
    }

    const activity = workflow.intersectActivities.find(a => a.activityId === activityId);
    if (activity) {
      Object.assign(activity, update);
    }
  }

  /**
   * Update overall execution progress based on activity progress
   */
  private updateExecutionProgress(workflow: WorkflowState): void {
    if (!workflow.intersectActivities || workflow.intersectActivities.length === 0) {
      workflow.executionProgress = 0;
      return;
    }

    const total = workflow.intersectActivities.length;
    const completed = workflow.intersectActivities.filter(a => a.status === 'completed').length;
    const inProgress = workflow.intersectActivities.filter(a => a.status === 'running');

    // Sum of completed (100% each) + in-progress (their actual progress)
    const progressSum = completed * 100 + inProgress.reduce((sum, a) => sum + (a.progress || 0), 0);
    workflow.executionProgress = Math.round(progressSum / total);
  }

  /**
   * Check if all activities for the current phase are complete
   */
  private async checkPhaseCompletion(
    workflow: WorkflowState,
    correlation: ActivityCorrelation,
    error?: string
  ): Promise<void> {
    const phaseKey = `${workflow.experimentId}_${correlation.phase || workflow.currentPhase}`;
    const tracker = this.phaseCompletionPromises.get(phaseKey);

    if (!tracker) {
      // No active phase tracking for this experiment/phase
      return;
    }

    if (error) {
      tracker.failedActivities++;
      logger.warn(`Activity failed in phase ${correlation.phase}`, {
        experimentId: workflow.experimentId,
        activityId: correlation.activityId,
        failedCount: tracker.failedActivities,
        error,
      });

      // Optionally fail fast on first error
      const failFast = process.env.INTERSECT_FAIL_FAST === 'true';
      if (failFast && tracker.failedActivities > 0) {
        this.phaseCompletionPromises.delete(phaseKey);
        tracker.reject(new Error(`Activity ${correlation.activityId} failed: ${error}`));
        return;
      }
    } else {
      tracker.completedActivities++;
    }

    logger.info(`Phase progress: ${tracker.completedActivities}/${tracker.expectedActivities} completed, ${tracker.failedActivities} failed`, {
      experimentId: workflow.experimentId,
      phase: correlation.phase,
    });

    // Check if phase is complete
    if (tracker.completedActivities + tracker.failedActivities >= tracker.expectedActivities) {
      this.phaseCompletionPromises.delete(phaseKey);

      if (tracker.failedActivities > 0) {
        tracker.reject(new Error(`Phase ${correlation.phase} completed with ${tracker.failedActivities} failures`));
      } else {
        logger.info(`Phase ${correlation.phase} completed successfully`, {
          experimentId: workflow.experimentId,
        });
        tracker.resolve();
      }
    }
  }

  /**
   * Wait for all activities in a phase to complete
   * Returns a promise that resolves when all activities complete or rejects on failure
   */
  private waitForPhaseCompletion(
    experimentId: string,
    phase: WorkflowPhase,
    expectedActivities: number
  ): Promise<void> {
    const phaseKey = `${experimentId}_${phase}`;

    return new Promise((resolve, reject) => {
      this.phaseCompletionPromises.set(phaseKey, {
        resolve,
        reject,
        expectedActivities,
        completedActivities: 0,
        failedActivities: 0,
      });
    });
  }

  /**
   * Register an INTERSECT activity in the workflow state
   */
  private registerIntersectActivity(
    workflow: WorkflowState,
    activityId: string,
    controllerId: string,
    activityName: string,
    metadata: {
      phase: WorkflowPhase;
      runNumber?: number;
      stepIndex?: number;
    }
  ): void {
    if (!workflow.intersectActivities) {
      workflow.intersectActivities = [];
    }

    workflow.intersectActivities.push({
      activityId,
      controllerId,
      activityName,
      phase: metadata.phase,
      runNumber: metadata.runNumber,
      stepIndex: metadata.stepIndex,
      status: 'pending',
      startTime: new Date(),
    });
  }

  private async initializeNATS() {
    try {
      this.nats = await connect({
        servers: process.env.NATS_URL || 'nats://localhost:4222',
      });
      this.jetstream = this.nats.jetstream();

      // Ensure required streams exist
      const jsm = await this.nats.jetstreamManager();
      await this.ensureStreamsExist(jsm);

      logger.info('NATS connected');

      // Subscribe to experiment events
      this.subscribeToEvents();
    } catch (error) {
      logger.error('Failed to connect to NATS:', error);
    }
  }

  private async ensureStreamsExist(jsm: JetStreamManager) {
    const streams = [
      { name: 'EXPERIMENTS', subjects: ['EXPERIMENTS.>'] },
      { name: 'HARDWARE', subjects: ['HARDWARE.>'] },
      { name: 'AGENTS', subjects: ['AGENTS.>'] },
    ];

    for (const stream of streams) {
      try {
        await jsm.streams.info(stream.name);
      } catch {
        try {
          await jsm.streams.add({
            name: stream.name,
            subjects: stream.subjects,
            retention: RetentionPolicy.Limits,
            storage: StorageType.Memory,
            max_msgs: 10000,
            max_age: 24 * 60 * 60 * 1e9,
          });
          logger.info(`Created stream: ${stream.name}`);
        } catch (createError) {
          logger.warn(`Stream ${stream.name} creation skipped:`, createError);
        }
      }
    }
  }

  private async subscribeToEvents() {
    if (!this.jetstream) return;

    try {
      const js = this.jetstream;

      // Subscribe to new experiments
      const opts1 = consumerOpts();
      opts1.durable('nova-experiment-created');
      opts1.manualAck();
      opts1.deliverTo(createInbox());
      const sub = await js.subscribe('EXPERIMENTS.experiment.created', opts1);
      (async () => {
        for await (const msg of sub) {
          try {
            const data = JSON.parse(this.sc.decode(msg.data));
            await this.handleNewExperiment(data.experimentId);
            msg.ack();
          } catch (error) {
            logger.error('Error handling experiment.created:', error);
            msg.nak();
          }
        }
      })();

      // Subscribe to approvals
      const opts2 = consumerOpts();
      opts2.durable('nova-experiment-approved');
      opts2.manualAck();
      opts2.deliverTo(createInbox());
      const approvalSub = await js.subscribe('EXPERIMENTS.experiment.approved', opts2);
      (async () => {
        for await (const msg of approvalSub) {
          try {
            const data = JSON.parse(this.sc.decode(msg.data));
            await this.handleExperimentApproval(data.experimentId);
            msg.ack();
          } catch (error) {
            logger.error('Error handling experiment.approved:', error);
            msg.nak();
          }
        }
      })();

      logger.info('Subscribed to NATS events');
    } catch (error) {
      logger.error('Failed to subscribe to events:', error);
    }
  }

  /**
   * Handle new experiment creation
   */
  private async handleNewExperiment(experimentId: string) {
    logger.info(`New experiment: ${experimentId}`);

    try {
      // Load experiment context
      const context = await this.loadExperimentContext(experimentId);

      // Initialize workflow state
      const workflow: WorkflowState = {
        experimentId,
        currentPhase: 'planning',
        status: 'active',
        startTime: new Date(),
        checkpoints: [],
        agentActivities: [],
      };
      this.workflows.set(experimentId, workflow);

      // Start the workflow
      await this.executeWorkflow(context, workflow);
    } catch (error: any) {
      logger.error(`Failed to handle new experiment ${experimentId}:`, error);
      await this.updateExperimentStatus(experimentId, 'failed');
    }
  }

  /**
   * Main workflow execution
   */
  private async executeWorkflow(
    context: ExperimentContext,
    workflow: WorkflowState
  ) {
    try {
      // Phase 1: Planning
      const planningResult = await this.executePlanningPhase(context, workflow);

      // Check if approval is required
      if (planningResult.riskAssessment.approvalRequired) {
        await this.requestApproval(context.experimentId, planningResult);
        workflow.status = 'waiting_approval';
        workflow.currentPhase = 'approving';
        await this.saveCheckpoint(workflow);
        return; // Wait for approval event
      }

      // Phase 2: Design
      const doeResult = await this.executeDesignPhase(context, workflow, planningResult);

      // Phase 3: Simulation
      const simulationResult = await this.executeSimulationPhase(context, workflow, doeResult);

      // Phase 4: Execution
      await this.executeExecutionPhase(context, workflow, planningResult, doeResult);

      // Phase 5: Analysis
      await this.executeAnalysisPhase(context, workflow, doeResult);

      // Complete
      workflow.status = 'success';
      workflow.currentPhase = 'complete';
      await this.updateExperimentStatus(context.experimentId, 'completed');
      await this.publishEvent('EXPERIMENTS', 'experiment.completed', { experimentId: context.experimentId });

      logger.info(`Experiment ${context.experimentId} completed successfully`);
    } catch (error: any) {
      logger.error(`Workflow failed for experiment ${context.experimentId}:`, error);
      workflow.status = 'failed';
      await this.updateExperimentStatus(context.experimentId, 'failed');
      await this.publishEvent('EXPERIMENTS', 'experiment.failed', {
        experimentId: context.experimentId,
        error: error.message,
      });
    }
  }

  /**
   * Phase 1: Planning
   */
  private async executePlanningPhase(
    context: ExperimentContext,
    workflow: WorkflowState
  ): Promise<PlanningResult> {
    logger.info(`Planning phase for experiment ${context.experimentId}`);

    workflow.currentPhase = 'planning';
    const activity = this.startActivity(workflow, 'planner', 'generate_plan');

    const response = await this.planningAgent.run(context, {});

    this.completeActivity(activity, response.success, response.data);

    if (!response.success || !response.data) {
      throw new Error(`Planning failed: ${response.error}`);
    }

    // Save plan to database
    await this.db.query(
      'INSERT INTO experiment_parameters (experiment_id, parameter_name, parameter_value) VALUES ($1, $2, $3)',
      [context.experimentId, 'planning_result', JSON.stringify(response.data)]
    );

    await this.publishEvent('EXPERIMENTS', 'experiment.planned', {
      experimentId: context.experimentId,
      riskLevel: response.data.riskAssessment.overallRisk,
    });

    await this.saveCheckpoint(workflow);

    return response.data;
  }

  /**
   * Phase 2: Design
   */
  private async executeDesignPhase(
    context: ExperimentContext,
    workflow: WorkflowState,
    planningResult: PlanningResult
  ): Promise<DesignOfExperiments> {
    logger.info(`Design phase for experiment ${context.experimentId}`);

    workflow.currentPhase = 'designing';
    const activity = this.startActivity(workflow, 'designer', 'create_doe');

    const response = await this.designAgent.run(context, {
      plan: planningResult.plan,
      designType: 'factorial',
    });

    this.completeActivity(activity, response.success, response.data);

    if (!response.success || !response.data) {
      throw new Error(`Design failed: ${response.error}`);
    }

    // Save DOE to database
    await this.db.query(
      'INSERT INTO experiment_parameters (experiment_id, parameter_name, parameter_value) VALUES ($1, $2, $3)',
      [context.experimentId, 'doe_result', JSON.stringify(response.data)]
    );

    await this.publishEvent('EXPERIMENTS', 'experiment.designed', {
      experimentId: context.experimentId,
      numberOfRuns: response.data.runs.length,
    });

    await this.saveCheckpoint(workflow);

    return response.data;
  }

  /**
   * Phase 3: Simulation
   */
  private async executeSimulationPhase(
    context: ExperimentContext,
    workflow: WorkflowState,
    doe: DesignOfExperiments
  ): Promise<SimulationResult> {
    logger.info(`Simulation phase for experiment ${context.experimentId}`);

    workflow.currentPhase = 'simulating';
    const activity = this.startActivity(workflow, 'simulator', 'simulate_outcomes');

    // Simulate all runs
    const selectedRuns = doe.runs.map(r => r.runNumber);

    const response = await this.simulationAgent.run(context, {
      doe,
      selectedRuns,
    });

    this.completeActivity(activity, response.success, response.data);

    if (!response.success || !response.data) {
      throw new Error(`Simulation failed: ${response.error}`);
    }

    await this.publishEvent('EXPERIMENTS', 'experiment.simulated', {
      experimentId: context.experimentId,
      confidence: response.data.confidence,
    });

    await this.saveCheckpoint(workflow);

    return response.data;
  }

  /**
   * Phase 4: Execution
   *
   * When INTERSECT is enabled, this phase submits activities to instrument controllers
   * and waits for them to complete via the event bridge.
   */
  private async executeExecutionPhase(
    context: ExperimentContext,
    workflow: WorkflowState,
    planningResult: PlanningResult,
    doe: DesignOfExperiments
  ) {
    logger.info(`Execution phase for experiment ${context.experimentId}`);

    workflow.currentPhase = 'executing';
    workflow.intersectActivities = [];
    workflow.executionProgress = 0;

    // Collect all execution plans first
    const allExecutionPlans: { runNumber: number; plans: ExecutionPlan[] }[] = [];

    for (const run of doe.runs) {
      const activity = this.startActivity(workflow, 'controller', `execute_run_${run.runNumber}`);

      const response = await this.controllerAgent.run(context, {
        plan: planningResult.plan,
        doe,
        runNumber: run.runNumber,
      });

      this.completeActivity(activity, response.success, response.data);

      if (!response.success || !response.data) {
        throw new Error(`Execution failed for run ${run.runNumber}: ${response.error}`);
      }

      allExecutionPlans.push({
        runNumber: run.runNumber,
        plans: response.data,
      });
    }

    // If INTERSECT is enabled, use workflow adapter for execution
    if (this.intersectEnabled && this.workflowAdapter) {
      await this.executeWithIntersect(context, workflow, allExecutionPlans);
    } else {
      // Fallback: submit jobs directly (original behavior)
      for (const { runNumber, plans } of allExecutionPlans) {
        for (const executionPlan of plans) {
          await this.submitJob(context.experimentId, executionPlan);
        }

        await this.publishEvent('EXPERIMENTS', 'experiment.run_executing', {
          experimentId: context.experimentId,
          runNumber,
        });
      }
    }

    await this.saveCheckpoint(workflow);
  }

  /**
   * Execute plans through INTERSECT with bidirectional event tracking
   */
  private async executeWithIntersect(
    context: ExperimentContext,
    workflow: WorkflowState,
    allPlans: { runNumber: number; plans: ExecutionPlan[] }[]
  ): Promise<void> {
    if (!this.workflowAdapter || !this.intersectCorrelationStore) {
      throw new Error('INTERSECT services not available');
    }

    // Count total activities
    const totalActivities = allPlans.reduce((sum, p) => sum + p.plans.length, 0);
    logger.info(`Starting ${totalActivities} INTERSECT activities for experiment ${context.experimentId}`);

    // Set workflow to waiting state
    workflow.status = 'waiting_execution';

    // Set up phase completion tracking
    const phasePromise = this.waitForPhaseCompletion(
      context.experimentId,
      'executing',
      totalActivities
    );

    // Submit all activities
    for (const { runNumber, plans } of allPlans) {
      for (let stepIndex = 0; stepIndex < plans.length; stepIndex++) {
        const plan = plans[stepIndex];

        try {
          // Execute through workflow adapter
          const result = await this.workflowAdapter.executeExperimentPlan(
            plan,
            context.experimentId,
            undefined // campaignId not in ExperimentContext, pass undefined
          );

          // Register activity in workflow state
          if (result.activityId) {
            this.registerIntersectActivity(workflow, result.activityId, plan.equipmentId, plan.jobType, {
              phase: 'executing',
              runNumber,
              stepIndex,
            });

            // Update correlation with phase metadata
            await this.intersectCorrelationStore.save({
              activityId: result.activityId,
              experimentRunId: context.experimentId,
              campaignId: undefined,
              controllerId: plan.equipmentId, // Use equipmentId as controller
              activityName: plan.jobType,
              phase: 'executing',
              runNumber,
              stepIndex,
              totalSteps: plans.length,
              status: 'running',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          await this.publishEvent('EXPERIMENTS', 'experiment.activity_started', {
            experimentId: context.experimentId,
            runNumber,
            stepIndex,
            activityId: result.activityId,
            jobType: plan.jobType,
          });
        } catch (error) {
          logger.error(`Failed to start activity for run ${runNumber}, step ${stepIndex}:`, error);
          throw error;
        }
      }

      await this.publishEvent('EXPERIMENTS', 'experiment.run_executing', {
        experimentId: context.experimentId,
        runNumber,
      });
    }

    // Wait for all activities to complete (or fail)
    try {
      await phasePromise;
      workflow.status = 'active';
      workflow.executionProgress = 100;
      logger.info(`All INTERSECT activities completed for experiment ${context.experimentId}`);
    } catch (error) {
      logger.error(`Execution phase failed for experiment ${context.experimentId}:`, error);
      throw error;
    }
  }

  /**
   * Phase 5: Analysis
   */
  private async executeAnalysisPhase(
    context: ExperimentContext,
    workflow: WorkflowState,
    doe: DesignOfExperiments
  ) {
    logger.info(`Analysis phase for experiment ${context.experimentId}`);

    workflow.currentPhase = 'analyzing';
    const activity = this.startActivity(workflow, 'analyzer', 'analyze_results');

    // Load actual measurements from TimescaleDB
    const measurements = await this.loadMeasurements(context.experimentId, doe);

    const response = await this.analyzerAgent.run(context, {
      doe,
      measurements,
    });

    this.completeActivity(activity, response.success, response.data);

    if (!response.success || !response.data) {
      throw new Error(`Analysis failed: ${response.error}`);
    }

    // Save learnings to knowledge base (Vector DB)
    if (response.data.learnings) {
      await this.saveLearnings(context.experimentId, response.data.learnings);
    }

    await this.publishEvent('EXPERIMENTS', 'experiment.analyzed', {
      experimentId: context.experimentId,
      insights: response.data.insights.length,
    });

    await this.saveCheckpoint(workflow);
  }

  /**
   * Handle experiment approval
   */
  private async handleExperimentApproval(experimentId: string) {
    logger.info(`Experiment approved: ${experimentId}`);

    const workflow = this.workflows.get(experimentId);
    if (!workflow) {
      logger.warn(`Workflow not found for experiment ${experimentId}`);
      return;
    }

    if (workflow.status !== 'waiting_approval') {
      logger.warn(`Experiment ${experimentId} not waiting for approval`);
      return;
    }

    // Resume workflow
    const context = await this.loadExperimentContext(experimentId);
    workflow.status = 'active';

    // Load planning result from checkpoint
    const planningResult = JSON.parse(
      (await this.db.query(
        'SELECT parameter_value FROM experiment_parameters WHERE experiment_id = $1 AND parameter_name = $2',
        [experimentId, 'planning_result']
      )).rows[0].parameter_value
    );

    // Continue from design phase
    const doeResult = await this.executeDesignPhase(context, workflow, planningResult);
    const simulationResult = await this.executeSimulationPhase(context, workflow, doeResult);
    await this.executeExecutionPhase(context, workflow, planningResult, doeResult);
    await this.executeAnalysisPhase(context, workflow, doeResult);

    workflow.status = 'success';
    workflow.currentPhase = 'complete';
    await this.updateExperimentStatus(experimentId, 'completed');
  }

  // Helper methods

  private async loadExperimentContext(experimentId: string): Promise<ExperimentContext> {
    const experiment = await this.db.query(
      'SELECT * FROM experiments WHERE id = $1',
      [experimentId]
    );

    if (experiment.rows.length === 0) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const exp = experiment.rows[0];

    // Load materials (simplified - in real implementation, query materials table)
    const materials: Material[] = [];

    return {
      experimentId,
      hypothesis: exp.hypothesis,
      objective: exp.description || exp.hypothesis,
      constraints: {
        maxBudget: 1000,
        maxDuration: 48,
        maxIterations: 10,
        safetyLevel: exp.risk_level || 'R1',
        materials: [],
      },
      materials,
      parameters: {},
      history: [],
    };
  }

  /**
   * Load measurements from TimescaleDB for an experiment
   */
  private async loadMeasurements(
    experimentId: string,
    doe: DesignOfExperiments
  ): Promise<Array<{ runNumber: number; measurements: Record<string, number> }>> {
    try {
      // Query measurements from TimescaleDB
      const result = await this.timescaleDb.query(
        `SELECT measurement_type, value, metadata
         FROM measurements
         WHERE experiment_id = $1
         ORDER BY time ASC`,
        [experimentId]
      );

      // If we have actual measurements, process them
      if (result.rows.length > 0) {
        // Group measurements by run number (stored in metadata)
        const measurementsByRun: Map<number, Record<string, number>> = new Map();

        for (const row of result.rows) {
          const runNumber = row.metadata?.run_number || 1;
          if (!measurementsByRun.has(runNumber)) {
            measurementsByRun.set(runNumber, {});
          }
          measurementsByRun.get(runNumber)![row.measurement_type] = row.value;
        }

        return Array.from(measurementsByRun.entries()).map(([runNumber, measurements]) => ({
          runNumber,
          measurements,
        }));
      }

      // Fallback: use predicted responses from DOE if no actual measurements
      logger.info(`No measurements found for experiment ${experimentId}, using predicted values`);
      return doe.runs.map(run => ({
        runNumber: run.runNumber,
        measurements: run.predictedResponses || {},
      }));
    } catch (error) {
      logger.warn(`Failed to load measurements for ${experimentId}:`, error);
      // Fallback to predicted responses
      return doe.runs.map(run => ({
        runNumber: run.runNumber,
        measurements: run.predictedResponses || {},
      }));
    }
  }

  private startActivity(workflow: WorkflowState, agentType: any, action: string): AgentActivity {
    const activity: AgentActivity = {
      agentType,
      action,
      startTime: new Date(),
      status: 'running',
    };
    workflow.agentActivities.push(activity);

    // Save to database
    this.db.query(
      `INSERT INTO agent_activities (experiment_id, agent_type, activity_type, status, started_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [workflow.experimentId, agentType, action, 'in_progress', activity.startTime]
    );

    return activity;
  }

  private completeActivity(activity: AgentActivity, success: boolean, result?: any) {
    activity.endTime = new Date();
    activity.status = success ? 'completed' : 'failed';
    activity.result = result;
  }

  private async saveCheckpoint(workflow: WorkflowState) {
    workflow.checkpoints.push({
      phase: workflow.currentPhase,
      timestamp: new Date(),
      state: { ...workflow },
    });
  }

  private async requestApproval(experimentId: string, planningResult: PlanningResult) {
    await this.db.query(
      `UPDATE experiments SET approval_status = 'pending', updated_at = NOW()
       WHERE id = $1`,
      [experimentId]
    );

    await this.publishEvent('EXPERIMENTS', 'experiment.approval_required', {
      experimentId,
      riskLevel: planningResult.riskAssessment.overallRisk,
      approvalLevel: planningResult.riskAssessment.approvalLevel,
    });
  }

  private async submitJob(experimentId: string, executionPlan: ExecutionPlan) {
    // Create job in database
    await this.db.query(
      `INSERT INTO jobs (experiment_id, hardware_id, job_type, status, parameters)
       VALUES ($1, $2, $3, 'queued', $4)`,
      [experimentId, executionPlan.equipmentId, executionPlan.jobType, JSON.stringify(executionPlan.parameters)]
    );

    // If INTERSECT is enabled, submit via workflow adapter
    if (this.intersectEnabled && this.workflowAdapter) {
      try {
        // Map execution plan to INTERSECT step
        const step: Step = {
          action: executionPlan.jobType,
          parameters: executionPlan.parameters,
          equipment: executionPlan.equipmentId,
          validations: [], // No validations for direct job submission
        };

        const result = await this.workflowAdapter.executeStep(
          step,
          0, // phaseIndex
          0, // stepIndex
          experimentId,
          undefined // campaignId
        );

        if (!result.success) {
          logger.error('INTERSECT job submission failed', {
            experimentId,
            jobId: executionPlan.jobId,
            error: result.error,
          });
          throw new Error(`INTERSECT job failed: ${result.error}`);
        }

        logger.info('Job submitted via INTERSECT', {
          experimentId,
          jobId: executionPlan.jobId,
          activityId: result.activityId,
        });
      } catch (error) {
        logger.error('Failed to submit job via INTERSECT:', error);
        // Fall through to standard event publishing
      }
    }

    await this.publishEvent('HARDWARE', 'job.submitted', {
      experimentId,
      jobId: executionPlan.jobId,
      equipmentId: executionPlan.equipmentId,
    });
  }

  /**
   * Initialize Qdrant collection for storing learnings
   */
  private async initializeQdrant() {
    try {
      // Check if collection exists
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some(
        c => c.name === NovaOrchestrator.LEARNINGS_COLLECTION
      );

      if (!exists) {
        // Create collection with vector size for embeddings (1536 for OpenAI, 768 for others)
        await this.qdrant.createCollection(NovaOrchestrator.LEARNINGS_COLLECTION, {
          vectors: {
            size: 1536,
            distance: 'Cosine',
          },
        });
        logger.info(`Created Qdrant collection: ${NovaOrchestrator.LEARNINGS_COLLECTION}`);
      } else {
        logger.info(`Qdrant collection ${NovaOrchestrator.LEARNINGS_COLLECTION} exists`);
      }
    } catch (error) {
      logger.warn('Failed to initialize Qdrant collection:', error);
    }
  }

  /**
   * Save learnings to Vector DB (Qdrant)
   */
  private async saveLearnings(experimentId: string, learnings: Learning[]) {
    if (learnings.length === 0) return;

    try {
      const points = learnings.map((learning, index) => ({
        id: `${experimentId}-${Date.now()}-${index}`,
        vector: this.generateSimpleEmbedding(learning.knowledge),
        payload: {
          experimentId,
          topic: learning.topic,
          knowledge: learning.knowledge,
          applicability: learning.applicability,
          confidence: learning.confidence,
          createdAt: new Date().toISOString(),
        },
      }));

      await this.qdrant.upsert(NovaOrchestrator.LEARNINGS_COLLECTION, {
        wait: true,
        points,
      });

      logger.info(`Saved ${learnings.length} learnings to Qdrant for experiment ${experimentId}`);
    } catch (error) {
      logger.error(`Failed to save learnings to Qdrant:`, error);
    }
  }

  /**
   * Generate a simple embedding vector for text
   * In production, this would use OpenAI or another embedding model
   */
  private generateSimpleEmbedding(text: string): number[] {
    // Simple hash-based embedding for demonstration
    // In production, use OpenAI embeddings or similar
    const vector = new Array(1536).fill(0);
    const words = text.toLowerCase().split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < word.length; j++) {
        const idx = (word.charCodeAt(j) * (i + 1) * (j + 1)) % 1536;
        vector[idx] = (vector[idx] + 1) / (i + 1);
      }
    }

    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }

    return vector;
  }

  private async updateExperimentStatus(experimentId: string, status: string) {
    await this.db.query(
      'UPDATE experiments SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, experimentId]
    );
  }

  private async publishEvent(stream: string, subject: string, data: any) {
    if (!this.jetstream) return;

    try {
      await this.jetstream.publish(
        `${stream}.${subject}`,
        this.sc.encode(JSON.stringify(data))
      );
    } catch (error) {
      logger.error(`Failed to publish event ${stream}.${subject}:`, error);
    }
  }

  /**
   * Graceful shutdown of all services
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Nova Orchestrator...');

    // Stop orchestration components
    if (this.supervisor) {
      this.supervisor.stop();
      logger.info('Supervisor stopped');
    }

    if (this.agent) {
      this.agent.stop();
      logger.info('Agent stopped');
    }

    // Stop event bridge
    if (this.intersectEventBridge) {
      await this.intersectEventBridge.stop();
      logger.info('Event bridge stopped');
    }

    // Close NATS connection
    if (this.nats) {
      await this.nats.drain();
      logger.info('NATS connection closed');
    }

    // Close database connections
    await this.db.end();
    await this.timescaleDb.end();
    logger.info('Database connections closed');

    logger.info('Nova Orchestrator shutdown complete');
  }

  /**
   * Get orchestration metrics for monitoring
   */
  async getOrchestrationMetrics(): Promise<{
    agent?: ReturnType<Agent['getMetrics']>;
    supervisor?: ReturnType<Supervisor['getMetrics']>;
    scheduler?: Awaited<ReturnType<IScheduler['getTaskStats']>>;
  }> {
    return {
      agent: this.agent?.getMetrics(),
      supervisor: this.supervisor?.getMetrics(),
      scheduler: await this.scheduler?.getTaskStats(),
    };
  }

  /**
   * Get controller health status
   */
  getControllerHealth(): Map<string, any> | undefined {
    return this.supervisor?.getControllerHealth();
  }
}
