/**
 * INTERSECT Workflow Adapter
 *
 * Integrates INTERSECT capabilities with Nova's workflow engine.
 * Handles:
 * - Converting workflow steps to INTERSECT activities
 * - Processing INTERSECT events and updating workflow state
 * - Managing activity lifecycle within experiment runs
 * - Resilient execution via Scheduler-Agent-Supervisor pattern
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ExecutionPlan,
  WorkflowState,
  WorkflowPhase,
  AgentActivity,
  ExperimentEvent,
  Step,
  Phase,
} from '../types';

import {
  IIntersectGatewayService,
  IIntersectEventBridge,
  ICorrelationStore,
  Correlation,
  ActivityCorrelation,
  KeyValue,
  ActivityStatus,
  NormalizedAdamEvent,
  StartActivityResponse,
  ActivityStatusResponse,
} from './intersect-types';

import {
  IScheduler,
  ScheduledTask,
  TaskPriority,
} from './orchestration';

/**
 * Configuration for the workflow adapter
 */
export interface WorkflowAdapterConfig {
  defaultControllerId: string;
  defaultTimeout: number; // ms
  retryOnFailure: boolean;
  maxRetries: number;
  /** Use scheduler for resilient execution instead of direct calls */
  useScheduler: boolean;
}

const DEFAULT_CONFIG: WorkflowAdapterConfig = {
  defaultControllerId: 'desktop-metal-controller',
  defaultTimeout: 300000, // 5 minutes
  retryOnFailure: true,
  maxRetries: 3,
  useScheduler: false, // Default to direct execution for backward compatibility
};

/**
 * Step execution result
 */
export interface StepExecutionResult {
  success: boolean;
  activityId?: string;
  status: ActivityStatus;
  message?: string;
  error?: string;
  dataProducts?: string[];
}

/**
 * Callback types for activity lifecycle events
 */
export type ActivityCompleteCallback = (result: StepExecutionResult) => void;
export type ActivityFailedCallback = (result: StepExecutionResult) => void;
export type ActivityProgressCallback = (activityId: string, progress: number) => void;

/**
 * INTERSECT Workflow Adapter
 */
export class IntersectWorkflowAdapter {
  private gateway: IIntersectGatewayService;
  private eventBridge: IIntersectEventBridge;
  private correlationStore: ICorrelationStore;
  private scheduler?: IScheduler;
  private config: WorkflowAdapterConfig;

  // Callback registrations
  private onCompleteCallbacks: ActivityCompleteCallback[] = [];
  private onFailedCallbacks: ActivityFailedCallback[] = [];
  private onProgressCallbacks: ActivityProgressCallback[] = [];

  // Active step tracking
  private pendingSteps: Map<string, {
    experimentId: string;
    stepIndex: number;
    phaseIndex: number;
    controllerId: string;
    resolve: (result: StepExecutionResult) => void;
    reject: (error: Error) => void;
  }> = new Map();

  // Task tracking for scheduler mode
  private pendingTasks: Map<string, {
    experimentId: string;
    resolve: (result: StepExecutionResult) => void;
    reject: (error: Error) => void;
  }> = new Map();

  constructor(
    gateway: IIntersectGatewayService,
    eventBridge: IIntersectEventBridge,
    correlationStore: ICorrelationStore,
    config: Partial<WorkflowAdapterConfig> = {},
    scheduler?: IScheduler
  ) {
    this.gateway = gateway;
    this.eventBridge = eventBridge;
    this.correlationStore = correlationStore;
    this.scheduler = scheduler;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Auto-enable scheduler mode if scheduler is provided
    if (scheduler && config.useScheduler === undefined) {
      this.config.useScheduler = true;
    }

    // Subscribe to INTERSECT events
    this.setupEventHandlers();
  }

  /**
   * Set the scheduler (for lazy initialization)
   */
  setScheduler(scheduler: IScheduler): void {
    this.scheduler = scheduler;
    this.config.useScheduler = true;
  }

  // ============================================================================
  // Callback Registration
  // ============================================================================

  /**
   * Register callback for activity completion
   */
  onActivityComplete(callback: ActivityCompleteCallback): void {
    this.onCompleteCallbacks.push(callback);
  }

  /**
   * Register callback for activity failure
   */
  onActivityFailed(callback: ActivityFailedCallback): void {
    this.onFailedCallbacks.push(callback);
  }

  /**
   * Register callback for activity progress updates
   */
  onActivityProgress(callback: ActivityProgressCallback): void {
    this.onProgressCallbacks.push(callback);
  }

  /**
   * Remove all registered callbacks
   */
  clearCallbacks(): void {
    this.onCompleteCallbacks = [];
    this.onFailedCallbacks = [];
    this.onProgressCallbacks = [];
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Setup event handlers for INTERSECT events
   */
  private setupEventHandlers(): void {
    // Handle normalized ADAM events
    this.eventBridge.subscribe(async (event: NormalizedAdamEvent) => {
      await this.handleNormalizedEvent(event);
    });
  }

  /**
   * Handle normalized events from INTERSECT
   */
  private async handleNormalizedEvent(event: NormalizedAdamEvent): Promise<void> {
    console.log(`[WorkflowAdapter] Received event: ${event.eventType}`, event.data);

    const activityId = event.data.activityId;
    if (!activityId) return;

    const pending = this.pendingSteps.get(activityId);
    const status = event.data.status;

    // Handle progress updates
    if (event.data.progress !== undefined) {
      this.onProgressCallbacks.forEach(cb => cb(activityId, event.data.progress!));
    }

    // Handle completion/failure
    if (status === 'completed') {
      // Fetch data products
      let dataProducts: string[] = [];
      try {
        if (pending) {
          const dataResponse = await this.gateway.getActivityData(
            pending.controllerId,
            activityId
          );
          dataProducts = dataResponse.products || [];
        }
      } catch (error) {
        console.error('Failed to fetch activity data products:', error);
      }

      const result: StepExecutionResult = {
        success: true,
        activityId,
        status: 'completed',
        message: event.data.message,
        dataProducts,
      };

      // Resolve pending promise
      if (pending) {
        pending.resolve(result);
        this.pendingSteps.delete(activityId);
      }

      // Fire callbacks
      this.onCompleteCallbacks.forEach(cb => cb(result));

    } else if (status === 'failed' || status === 'cancelled') {
      const result: StepExecutionResult = {
        success: false,
        activityId,
        status: status as ActivityStatus,
        error: event.data.error || event.data.message,
      };

      // Resolve pending promise
      if (pending) {
        pending.resolve(result);
        this.pendingSteps.delete(activityId);
      }

      // Fire callbacks
      this.onFailedCallbacks.forEach(cb => cb(result));
    }
    // Running/pending status - keep waiting
  }

  // ============================================================================
  // Execution Methods
  // ============================================================================

  /**
   * Execute an experiment plan (single job) through INTERSECT
   */
  async executeExperimentPlan(
    plan: ExecutionPlan,
    experimentId: string,
    campaignId?: string
  ): Promise<StepExecutionResult> {
    // Map the execution plan to an INTERSECT activity
    const activityMapping = this.mapPlanToActivity(plan);

    try {
      const response = await this.gateway.startActivity({
        controllerId: activityMapping.controllerId,
        activityName: activityMapping.activityName,
        experimentRunId: experimentId,
        campaignId,
        activityOptions: activityMapping.options,
        deadline: this.calculateDeadline(),
      });

      // Store correlation for tracking
      const correlation: ActivityCorrelation = {
        activityId: response.activityId,
        experimentRunId: experimentId,
        campaignId,
        controllerId: activityMapping.controllerId,
        activityName: activityMapping.activityName,
        stepId: plan.jobId,
        traceId: `trace_${experimentId}_${Date.now()}`,
        status: 'started',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.correlationStore.save(correlation);

      // Wait for completion
      return this.waitForActivityCompletion(
        response.activityId,
        experimentId,
        activityMapping.controllerId
      );
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Map an ExecutionPlan to an INTERSECT activity
   */
  private mapPlanToActivity(plan: ExecutionPlan): {
    controllerId: string;
    activityName: string;
    options: KeyValue[];
  } {
    const jobType = plan.jobType;

    // Map job types to controllers and activities
    switch (jobType) {
      case 'print':
        return {
          controllerId: this.config.defaultControllerId,
          activityName: 'print_job',
          options: this.parametersToOptions(plan.parameters),
        };
      case 'sinter':
        return {
          controllerId: 'furnace-controller',
          activityName: 'sinter_cycle',
          options: this.parametersToOptions(plan.parameters),
        };
      case 'measure':
      case 'analyze':
        return {
          controllerId: 'characterization-controller',
          activityName: 'quality_inspection',
          options: this.parametersToOptions(plan.parameters),
        };
      default:
        return {
          controllerId: 'simulated-controller',
          activityName: 'generic_activity',
          options: this.parametersToOptions(plan.parameters),
        };
    }
  }

  /**
   * Execute a single workflow step through INTERSECT
   * Uses scheduler for resilient execution if enabled, otherwise direct execution
   */
  async executeStep(
    step: Step,
    phaseIndex: number,
    stepIndex: number,
    experimentId: string,
    campaignId?: string,
    priority?: TaskPriority
  ): Promise<StepExecutionResult> {
    // Determine activity type and controller from step
    const activityMapping = this.mapStepToActivity(step);
    if (!activityMapping) {
      return {
        success: false,
        status: 'failed',
        error: `Cannot map step '${step.action}' to INTERSECT activity`,
      };
    }

    // Use scheduler for resilient execution if enabled
    if (this.config.useScheduler && this.scheduler) {
      return this.executeStepViaScheduler(
        step,
        activityMapping,
        phaseIndex,
        stepIndex,
        experimentId,
        campaignId,
        priority
      );
    }

    // Direct execution (original behavior)
    return this.executeStepDirect(
      activityMapping,
      phaseIndex,
      stepIndex,
      experimentId,
      campaignId
    );
  }

  /**
   * Execute step via scheduler for fault tolerance
   */
  private async executeStepViaScheduler(
    step: Step,
    activityMapping: { controllerId: string; activityName: string; options: KeyValue[] },
    phaseIndex: number,
    stepIndex: number,
    experimentId: string,
    campaignId?: string,
    priority?: TaskPriority
  ): Promise<StepExecutionResult> {
    if (!this.scheduler) {
      throw new Error('Scheduler not configured');
    }

    console.log(`[WorkflowAdapter] Scheduling step ${stepIndex} via scheduler: ${activityMapping.activityName}`);

    // Schedule the task
    const task = await this.scheduler.scheduleTask({
      experimentRunId: experimentId,
      campaignId,
      controllerId: activityMapping.controllerId,
      activityName: activityMapping.activityName,
      activityOptions: activityMapping.options,
      priority: priority ?? 'normal',
      maxRetries: this.config.maxRetries,
      deadline: this.calculateDeadline(),
      metadata: {
        stepAction: step.action,
        phaseIndex,
        stepIndex,
      },
    });

    // Return a promise that resolves when the task completes
    return new Promise((resolve, reject) => {
      this.pendingTasks.set(task.id, {
        experimentId,
        resolve,
        reject,
      });

      // Set up polling to check task status
      const checkInterval = setInterval(async () => {
        try {
          const updatedTask = await this.scheduler!.getTask(task.id);
          if (!updatedTask) {
            clearInterval(checkInterval);
            this.pendingTasks.delete(task.id);
            resolve({
              success: false,
              status: 'failed',
              error: 'Task not found',
            });
            return;
          }

          if (updatedTask.status === 'completed') {
            clearInterval(checkInterval);
            this.pendingTasks.delete(task.id);
            resolve({
              success: true,
              activityId: updatedTask.activityId,
              status: 'completed',
              message: 'Task completed successfully',
            });
          } else if (updatedTask.status === 'failed' || updatedTask.status === 'cancelled' || updatedTask.status === 'timeout') {
            clearInterval(checkInterval);
            this.pendingTasks.delete(task.id);
            resolve({
              success: false,
              activityId: updatedTask.activityId,
              status: updatedTask.status === 'timeout' ? 'cancelled' : 'failed',
              error: updatedTask.error || `Task ${updatedTask.status}`,
            });
          }
          // Still pending/running - continue polling
        } catch (error) {
          clearInterval(checkInterval);
          this.pendingTasks.delete(task.id);
          resolve({
            success: false,
            status: 'failed',
            error: (error as Error).message,
          });
        }
      }, 5000); // Poll every 5 seconds

      // Set timeout for the entire operation
      setTimeout(() => {
        if (this.pendingTasks.has(task.id)) {
          clearInterval(checkInterval);
          this.pendingTasks.delete(task.id);
          resolve({
            success: false,
            status: 'cancelled',
            error: 'Task timed out waiting for completion',
          });
        }
      }, this.config.defaultTimeout);
    });
  }

  /**
   * Direct execution (original behavior)
   */
  private async executeStepDirect(
    activityMapping: { controllerId: string; activityName: string; options: KeyValue[] },
    phaseIndex: number,
    stepIndex: number,
    experimentId: string,
    campaignId?: string
  ): Promise<StepExecutionResult> {
    try {
      // Start the activity
      const response = await this.gateway.startActivity({
        controllerId: activityMapping.controllerId,
        activityName: activityMapping.activityName,
        experimentRunId: experimentId,
        campaignId,
        activityOptions: activityMapping.options,
        deadline: this.calculateDeadline(),
      });

      // Store correlation
      const correlation: ActivityCorrelation = {
        activityId: response.activityId,
        experimentRunId: experimentId,
        campaignId,
        controllerId: activityMapping.controllerId,
        activityName: activityMapping.activityName,
        stepId: `phase_${phaseIndex}_step_${stepIndex}`,
        traceId: `trace_${experimentId}_${Date.now()}`,
        status: 'started',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.correlationStore.save(correlation);

      // Wait for completion
      return this.waitForActivityCompletion(
        response.activityId,
        experimentId,
        activityMapping.controllerId,
        phaseIndex,
        stepIndex
      );
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Execute a discrete action (non-blocking)
   */
  async executeAction(
    actionName: string,
    controllerId: string,
    options: KeyValue[],
    experimentId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const idempotencyKey = `${experimentId}_${actionName}_${Date.now()}`;
      const response = await this.gateway.performAction({
        controllerId,
        actionName,
        actionOptions: options,
        idempotencyKey,
        correlation: {
          experimentRunId: experimentId,
        },
      });

      return {
        success: response.accepted,
        message: response.message,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Execute an entire phase of the experiment
   */
  async executePhase(
    phase: Phase,
    phaseIndex: number,
    experimentId: string,
    campaignId?: string,
    onStepComplete?: (stepIndex: number, result: StepExecutionResult) => void
  ): Promise<{ success: boolean; stepResults: StepExecutionResult[] }> {
    const stepResults: StepExecutionResult[] = [];
    let overallSuccess = true;

    for (let stepIndex = 0; stepIndex < phase.steps.length; stepIndex++) {
      const step = phase.steps[stepIndex];
      console.log(`[WorkflowAdapter] Executing step ${stepIndex + 1}/${phase.steps.length}: ${step.action}`);

      const result = await this.executeStep(
        step,
        phaseIndex,
        stepIndex,
        experimentId,
        campaignId
      );

      stepResults.push(result);

      if (onStepComplete) {
        onStepComplete(stepIndex, result);
      }

      if (!result.success) {
        overallSuccess = false;
        // Optionally continue or break based on step criticality
        break;
      }
    }

    return { success: overallSuccess, stepResults };
  }

  /**
   * Get current activity status
   */
  async getActivityStatus(
    controllerId: string,
    activityId: string
  ): Promise<ActivityStatusResponse> {
    return this.gateway.getActivityStatus(controllerId, activityId);
  }

  /**
   * Cancel a running activity
   */
  async cancelActivity(
    controllerId: string,
    activityId: string,
    reason: string
  ): Promise<void> {
    await this.gateway.cancelActivity(controllerId, activityId, reason);

    // Resolve any pending promise
    const pending = this.pendingSteps.get(activityId);
    if (pending) {
      pending.resolve({
        success: false,
        activityId,
        status: 'cancelled',
        message: reason,
      });
      this.pendingSteps.delete(activityId);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private waitForActivityCompletion(
    activityId: string,
    experimentId: string,
    controllerId: string,
    phaseIndex?: number,
    stepIndex?: number
  ): Promise<StepExecutionResult> {
    return new Promise((resolve, reject) => {
      this.pendingSteps.set(activityId, {
        experimentId,
        controllerId,
        phaseIndex: phaseIndex ?? -1,
        stepIndex: stepIndex ?? -1,
        resolve,
        reject,
      });

      // Set timeout
      setTimeout(() => {
        if (this.pendingSteps.has(activityId)) {
          this.pendingSteps.delete(activityId);
          resolve({
            success: false,
            activityId,
            status: 'failed',
            error: 'Activity timed out',
          });
        }
      }, this.config.defaultTimeout);
    });
  }

  private mapStepToActivity(step: Step): {
    controllerId: string;
    activityName: string;
    options: KeyValue[];
  } | null {
    const action = step.action.toLowerCase();

    // Map step actions to INTERSECT activities
    if (action.includes('print')) {
      return {
        controllerId: this.config.defaultControllerId,
        activityName: 'print_job',
        options: this.parametersToOptions(step.parameters),
      };
    }

    if (action.includes('sinter')) {
      return {
        controllerId: 'furnace-controller',
        activityName: 'sinter_cycle',
        options: this.parametersToOptions(step.parameters),
      };
    }

    if (action.includes('measure') || action.includes('inspect') || action.includes('analyze')) {
      return {
        controllerId: 'characterization-controller',
        activityName: 'quality_inspection',
        options: this.parametersToOptions(step.parameters),
      };
    }

    // Default to simulated controller for unknown steps
    return {
      controllerId: 'simulated-controller',
      activityName: 'generic_activity',
      options: this.parametersToOptions(step.parameters),
    };
  }

  private parametersToOptions(params: Record<string, any>): KeyValue[] {
    return Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => ({
        key,
        value: String(value),
      }));
  }

  private calculateDeadline(): Date {
    return new Date(Date.now() + this.config.defaultTimeout);
  }
}

/**
 * Factory function
 */
export function createWorkflowAdapter(
  gateway: IIntersectGatewayService,
  eventBridge: IIntersectEventBridge,
  correlationStore: ICorrelationStore,
  config?: Partial<WorkflowAdapterConfig>,
  scheduler?: IScheduler
): IntersectWorkflowAdapter {
  return new IntersectWorkflowAdapter(gateway, eventBridge, correlationStore, config, scheduler);
}
