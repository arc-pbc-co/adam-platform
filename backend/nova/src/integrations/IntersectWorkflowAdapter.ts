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
} from '../../../src/integrations/intersect';

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
    this.eventBridge.onNormalizedEvent(async (event) => {
      await this.handleNormalizedEvent(event);
    });
  }

  /**
   * Handle normalized events from INTERSECT
   */
  private async handleNormalizedEvent(event: NormalizedAdamEvent): Promise<void> {
    console.log(`[WorkflowAdapter] Received event: ${event.eventType}`, event.data);

    // Check if this is an activity status event
    if (event.eventType === 'experiment.activity.status_change' && event.data.activityId) {
      const pending = this.pendingSteps.get(event.data.activityId);

      if (pending) {
        const status = event.data.status as ActivityStatus;

        if (status === 'completed') {
          // Fetch data products
          let dataProducts: string[] = [];
          try {
            const correlation = await this.correlationStore.getActivityCorrelation(
              event.data.activityId
            );
            if (correlation) {
              const dataResponse = await this.gateway.getActivityData(
                correlation.controllerId,
                event.data.activityId
              );
              dataProducts = dataResponse.products;
            }
          } catch (error) {
            console.error('Failed to fetch activity data products:', error);
          }

          pending.resolve({
            success: true,
            activityId: event.data.activityId,
            status: 'completed',
            message: event.data.message,
            dataProducts,
          });
          this.pendingSteps.delete(event.data.activityId);
        } else if (status === 'failed' || status === 'cancelled') {
          pending.resolve({
            success: false,
            activityId: event.data.activityId,
            status,
            error: event.data.error || event.data.message,
          });
          this.pendingSteps.delete(event.data.activityId);
        }
        // Running/pending status - keep waiting
      }
    }
  }

  /**
   * Execute an experiment plan through INTERSECT
   */
  async executeExperimentPlan(
    plan: ExecutionPlan,
    experimentId: string,
    campaignId?: string
  ): Promise<StepExecutionResult> {
    const correlation: Correlation = {
      experimentRunId: experimentId,
      campaignId,
    };

    try {
      // Use the gateway to execute the plan
      const response = await this.gateway.executeExperimentPlan(plan, correlation);

      // Wait for completion
      return this.waitForActivityCompletion(response.activityId, experimentId);
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        error: (error as Error).message,
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
    const correlation: Correlation = {
      experimentRunId: experimentId,
      campaignId,
    };

    // Determine activity type and controller from step
    const activityMapping = this.mapStepToActivity(step);
    if (!activityMapping) {
      return {
        success: false,
        status: 'failed',
        error: `Cannot map step '${step.action}' to INTERSECT activity`,
      };
    }

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
    const idempotencyKey = `${experimentId}_${actionName}_${Date.now()}`;

    try {
      const response = await this.gateway.performAction({
        controllerId,
        actionName,
        actionOptions: options,
        idempotencyKey,
        correlation: { experimentRunId: experimentId },
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

  /**
   * List available controllers
   */
  async listControllers(): Promise<any[]> {
    return this.gateway.listControllers();
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
  config?: Partial<WorkflowAdapterConfig>
): IntersectWorkflowAdapter {
  return new IntersectWorkflowAdapter(gateway, eventBridge, correlationStore, config);
}
