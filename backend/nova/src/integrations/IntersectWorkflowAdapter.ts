/**
 * INTERSECT Workflow Adapter
 *
 * Integrates INTERSECT capabilities with Nova's workflow engine.
 * Handles:
 * - Converting workflow steps to INTERSECT activities
 * - Processing INTERSECT events and updating workflow state
 * - Managing activity lifecycle within experiment runs
 */

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
  KeyValue,
  ActivityStatus,
  NormalizedAdamEvent,
  StartActivityResponse,
  ActivityStatusResponse,
} from './intersect-types';

/**
 * Configuration for the workflow adapter
 */
export interface WorkflowAdapterConfig {
  defaultControllerId: string;
  defaultTimeout: number; // ms
  retryOnFailure: boolean;
  maxRetries: number;
}

const DEFAULT_CONFIG: WorkflowAdapterConfig = {
  defaultControllerId: 'desktop-metal-controller',
  defaultTimeout: 300000, // 5 minutes
  retryOnFailure: true,
  maxRetries: 3,
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
 * INTERSECT Workflow Adapter
 */
export class IntersectWorkflowAdapter {
  private gateway: IIntersectGatewayService;
  private eventBridge: IIntersectEventBridge;
  private correlationStore: ICorrelationStore;
  private config: WorkflowAdapterConfig;

  // Active step tracking
  private pendingSteps: Map<string, {
    experimentId: string;
    stepIndex: number;
    phaseIndex: number;
    resolve: (result: StepExecutionResult) => void;
    reject: (error: Error) => void;
  }> = new Map();

  constructor(
    gateway: IIntersectGatewayService,
    eventBridge: IIntersectEventBridge,
    correlationStore: ICorrelationStore,
    config: Partial<WorkflowAdapterConfig> = {}
  ) {
    this.gateway = gateway;
    this.eventBridge = eventBridge;
    this.correlationStore = correlationStore;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Subscribe to INTERSECT events
    this.setupEventHandlers();
  }

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
    console.log(`[WorkflowAdapter] Received event: ${event.eventType}`, event.payload);

    // Check if this is an activity status event
    if (event.eventType === 'adam.intersect.instrument_activity_status_change') {
      const payload = event.payload as { activityId: string; activityStatus: ActivityStatus; statusMsg?: string };
      const pending = this.pendingSteps.get(payload.activityId);

      if (pending) {
        const status = payload.activityStatus;

        if (status === 'ACTIVITY_COMPLETED') {
          // Fetch data products
          let dataProducts: string[] = [];
          try {
            const correlation = await this.correlationStore.findByActivityId(payload.activityId);
            if (correlation) {
              // Note: getActivityData would need to be added to the gateway interface
              // For now, we'll skip data product fetching
            }
          } catch (error) {
            console.error('Failed to fetch activity data products:', error);
          }

          pending.resolve({
            success: true,
            activityId: payload.activityId,
            status: 'ACTIVITY_COMPLETED',
            message: payload.statusMsg,
            dataProducts,
          });
          this.pendingSteps.delete(payload.activityId);
        } else if (status === 'ACTIVITY_FAILED' || status === 'ACTIVITY_CANCELED') {
          pending.resolve({
            success: false,
            activityId: payload.activityId,
            status,
            error: payload.statusMsg,
          });
          this.pendingSteps.delete(payload.activityId);
        }
        // Running/pending status - keep waiting
      }
    }
  }

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
      const response = await this.gateway.startActivity(
        activityMapping.controllerId,
        activityMapping.activityName,
        activityMapping.options,
        this.calculateDeadline()
      );

      if (response.errorMsg) {
        return {
          success: false,
          status: 'ACTIVITY_FAILED',
          error: response.errorMsg,
        };
      }

      // Store correlation
      const correlation: Correlation = {
        activityId: response.activityId,
        campaignId: campaignId || '',
        experimentRunId: experimentId,
        stepId: plan.jobId,
        controllerId: activityMapping.controllerId,
        traceId: `trace_${experimentId}_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.correlationStore.save(correlation);

      // Wait for completion
      return this.waitForActivityCompletion(response.activityId, experimentId);
    } catch (error) {
      return {
        success: false,
        status: 'ACTIVITY_FAILED',
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
   */
  async executeStep(
    step: Step,
    phaseIndex: number,
    stepIndex: number,
    experimentId: string,
    campaignId?: string
  ): Promise<StepExecutionResult> {
    // Determine activity type and controller from step
    const activityMapping = this.mapStepToActivity(step);
    if (!activityMapping) {
      return {
        success: false,
        status: 'ACTIVITY_FAILED',
        error: `Cannot map step '${step.action}' to INTERSECT activity`,
      };
    }

    try {
      // Start the activity
      const response = await this.gateway.startActivity(
        activityMapping.controllerId,
        activityMapping.activityName,
        activityMapping.options,
        this.calculateDeadline()
      );

      if (response.errorMsg) {
        return {
          success: false,
          status: 'ACTIVITY_FAILED',
          error: response.errorMsg,
        };
      }

      // Store correlation
      const correlation: Correlation = {
        activityId: response.activityId,
        campaignId: campaignId || '',
        experimentRunId: experimentId,
        stepId: `phase_${phaseIndex}_step_${stepIndex}`,
        controllerId: activityMapping.controllerId,
        traceId: `trace_${experimentId}_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.correlationStore.save(correlation);

      // Wait for completion
      return this.waitForActivityCompletion(
        response.activityId,
        experimentId,
        phaseIndex,
        stepIndex
      );
    } catch (error) {
      return {
        success: false,
        status: 'ACTIVITY_FAILED',
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
    _experimentId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await this.gateway.performAction(
        controllerId,
        actionName,
        options
      );

      return {
        success: response.accepted,
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
        status: 'ACTIVITY_CANCELED',
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
    phaseIndex?: number,
    stepIndex?: number
  ): Promise<StepExecutionResult> {
    return new Promise((resolve, reject) => {
      this.pendingSteps.set(activityId, {
        experimentId,
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
            status: 'ACTIVITY_FAILED',
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
  config?: Partial<WorkflowAdapterConfig>
): IntersectWorkflowAdapter {
  return new IntersectWorkflowAdapter(gateway, eventBridge, correlationStore, config);
}
