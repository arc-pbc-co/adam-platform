/**
 * Schema Mapper
 *
 * Handles versioned mapping between ADAM domain entities and INTERSECT capability payloads.
 * Supports bidirectional mapping for:
 * - ADAM ExperimentPlan/WorkOrder → INTERSECT Activity requests
 * - INTERSECT Events → ADAM normalized events
 * - INTERSECT Data Products → ADAM Artifacts
 */

import {
  KeyValue,
  Correlation,
  StartActivityRequest,
  InstrumentActivityStatusChange,
  InstrumentActionCompletion,
  MappingResult,
  WorkOrderToActivityMapping,
  NormalizedAdamEvent,
  ActivityStatus,
} from '../types';

// Import ADAM types
import {
  ExperimentPlan,
  Phase,
  Step,
  MaterialSpec,
  ExecutionPlan,
} from '../../../../nova/src/types';

/**
 * Mapping version for compatibility tracking
 */
export const SCHEMA_VERSION = '0.1.0';

/**
 * Activity name constants for Desktop Metal operations
 */
export const DesktopMetalActivities = {
  PRINT_JOB: 'print_job',
  SINTER_CYCLE: 'sinter_cycle',
  DEPOWDER_CYCLE: 'depowder_cycle',
  QUALITY_INSPECTION: 'quality_inspection',
} as const;

/**
 * Action name constants for Desktop Metal operations
 */
export const DesktopMetalActions = {
  CALIBRATE_PRINTHEAD: 'calibrate_printhead',
  HOME_AXES: 'home_axes',
  PREHEAT_BUILDPLATE: 'preheat_buildplate',
  CLEAN_PRINTHEAD: 'clean_printhead',
  CHECK_BINDER_LEVEL: 'check_binder_level',
  CHECK_POWDER_LEVEL: 'check_powder_level',
} as const;

export interface SchemaMapper {
  // Version info
  readonly version: string;

  // ADAM → INTERSECT mappings
  mapExecutionPlanToActivity(
    plan: ExecutionPlan,
    correlation: Correlation
  ): MappingResult<StartActivityRequest>;

  mapStepToActivity(
    step: Step,
    equipmentId: string,
    correlation: Correlation
  ): MappingResult<WorkOrderToActivityMapping>;

  mapMaterialSpecToOptions(material: MaterialSpec): KeyValue[];

  // INTERSECT → ADAM mappings
  mapActivityStatusToAdamEvent(
    event: InstrumentActivityStatusChange,
    controllerId: string
  ): NormalizedAdamEvent;

  mapActionCompletionToAdamEvent(
    event: InstrumentActionCompletion,
    controllerId: string
  ): NormalizedAdamEvent;

  // Validation
  validateActivityOptions(
    activityName: string,
    options: KeyValue[]
  ): MappingResult<void>;
}

/**
 * Default implementation of SchemaMapper
 */
export class DefaultSchemaMapper implements SchemaMapper {
  readonly version = SCHEMA_VERSION;

  // Activity option schemas for validation
  private activitySchemas: Map<string, OptionSchema[]> = new Map([
    [DesktopMetalActivities.PRINT_JOB, [
      { name: 'printerId', type: 'string', required: true },
      { name: 'stlFileId', type: 'string', required: true },
      { name: 'material', type: 'string', required: true },
      { name: 'layerThickness', type: 'number', required: false, default: '50' },
      { name: 'printSpeed', type: 'number', required: false, default: '100' },
      { name: 'binderSaturation', type: 'number', required: false, default: '100' },
      { name: 'orientation', type: 'string', required: false },
      { name: 'supports', type: 'boolean', required: false, default: 'true' },
    ]],
    [DesktopMetalActivities.SINTER_CYCLE, [
      { name: 'furnaceId', type: 'string', required: true },
      { name: 'material', type: 'string', required: true },
      { name: 'peakTemperature', type: 'number', required: true },
      { name: 'holdTime', type: 'number', required: true },
      { name: 'atmosphere', type: 'string', required: false, default: 'argon' },
      { name: 'rampRate', type: 'number', required: false, default: '5' },
    ]],
    [DesktopMetalActivities.DEPOWDER_CYCLE, [
      { name: 'stationId', type: 'string', required: true },
      { name: 'method', type: 'string', required: false, default: 'automated' },
      { name: 'duration', type: 'number', required: false },
    ]],
    [DesktopMetalActivities.QUALITY_INSPECTION, [
      { name: 'inspectionType', type: 'string', required: true },
      { name: 'sampleIds', type: 'string', required: true },
      { name: 'measurements', type: 'string', required: false },
    ]],
  ]);

  mapExecutionPlanToActivity(
    plan: ExecutionPlan,
    correlation: Correlation
  ): MappingResult<StartActivityRequest> {
    try {
      // Map job type to activity name
      const activityName = this.mapJobTypeToActivity(plan.jobType);
      if (!activityName) {
        return {
          success: false,
          errors: [`Unknown job type: ${plan.jobType}`],
        };
      }

      // Build activity options from plan parameters
      const activityOptions = this.buildActivityOptions(plan);

      // Validate options
      const validation = this.validateActivityOptions(activityName, activityOptions);
      if (!validation.success) {
        return validation as MappingResult<StartActivityRequest>;
      }

      const request: StartActivityRequest = {
        activityOptions,
        correlation,
        activityDeadline: plan.estimatedTime
          ? new Date(Date.now() + plan.estimatedTime * 60 * 1000 * 1.5) // 1.5x buffer
          : undefined,
      };

      return { success: true, data: request };
    } catch (error) {
      return {
        success: false,
        errors: [`Mapping error: ${(error as Error).message}`],
      };
    }
  }

  mapStepToActivity(
    step: Step,
    equipmentId: string,
    correlation: Correlation
  ): MappingResult<WorkOrderToActivityMapping> {
    try {
      // Determine activity type from step action
      const activityName = this.inferActivityFromStep(step);
      if (!activityName) {
        return {
          success: false,
          errors: [`Cannot map step action '${step.action}' to activity`],
        };
      }

      // Convert step parameters to KeyValue array
      const activityOptions: KeyValue[] = [
        { key: 'equipmentId', value: equipmentId },
        ...Object.entries(step.parameters).map(([key, value]) => ({
          key,
          value: String(value),
        })),
      ];

      return {
        success: true,
        data: {
          activityName,
          activityOptions,
        },
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Step mapping error: ${(error as Error).message}`],
      };
    }
  }

  mapMaterialSpecToOptions(material: MaterialSpec): KeyValue[] {
    return [
      { key: 'materialId', value: material.materialId },
      { key: 'quantity', value: String(material.quantity) },
      { key: 'unit', value: material.unit },
      { key: 'role', value: material.role },
      ...(material.purity ? [{ key: 'purity', value: String(material.purity) }] : []),
    ];
  }

  mapActivityStatusToAdamEvent(
    event: InstrumentActivityStatusChange,
    controllerId: string
  ): NormalizedAdamEvent {
    return {
      eventType: 'experiment.activity.status_change',
      experimentRunId: event.correlation?.experimentRunId || 'unknown',
      campaignId: event.correlation?.campaignId,
      timestamp: new Date(),
      source: 'intersect',
      data: {
        activityId: event.activityId,
        status: this.mapActivityStatusToAdamStatus(event.activityStatus),
        progress: event.progress,
        message: event.statusMsg,
        error: event.errorMsg,
      },
    };
  }

  mapActionCompletionToAdamEvent(
    event: InstrumentActionCompletion,
    controllerId: string
  ): NormalizedAdamEvent {
    return {
      eventType: 'experiment.action.completion',
      experimentRunId: event.correlation?.experimentRunId || 'unknown',
      campaignId: event.correlation?.campaignId,
      timestamp: new Date(),
      source: 'intersect',
      data: {
        actionName: event.actionName,
        status: event.actionStatus,
        message: event.statusMsg,
        error: event.errorMsg,
      },
    };
  }

  validateActivityOptions(
    activityName: string,
    options: KeyValue[]
  ): MappingResult<void> {
    const schema = this.activitySchemas.get(activityName);
    if (!schema) {
      // Unknown activity - allow any options
      return { success: true };
    }

    const errors: string[] = [];
    const providedKeys = new Set(options.map((o) => o.key));

    // Check required options
    for (const optionDef of schema) {
      if (optionDef.required && !providedKeys.has(optionDef.name)) {
        errors.push(`Missing required option: ${optionDef.name}`);
      }
    }

    // Validate types (basic validation)
    for (const option of options) {
      const optionDef = schema.find((s) => s.name === option.key);
      if (optionDef) {
        const typeError = this.validateOptionType(option.value, optionDef.type);
        if (typeError) {
          errors.push(`Invalid type for ${option.key}: ${typeError}`);
        }
      }
    }

    return errors.length > 0
      ? { success: false, errors }
      : { success: true };
  }

  // Private helper methods

  private mapJobTypeToActivity(jobType: string): string | null {
    const mapping: Record<string, string> = {
      print: DesktopMetalActivities.PRINT_JOB,
      sinter: DesktopMetalActivities.SINTER_CYCLE,
      measure: DesktopMetalActivities.QUALITY_INSPECTION,
      analyze: DesktopMetalActivities.QUALITY_INSPECTION,
    };
    return mapping[jobType] || null;
  }

  private inferActivityFromStep(step: Step): string | null {
    const action = step.action.toLowerCase();

    if (action.includes('print')) {
      return DesktopMetalActivities.PRINT_JOB;
    }
    if (action.includes('sinter')) {
      return DesktopMetalActivities.SINTER_CYCLE;
    }
    if (action.includes('depowder') || action.includes('clean')) {
      return DesktopMetalActivities.DEPOWDER_CYCLE;
    }
    if (action.includes('inspect') || action.includes('measure') || action.includes('analyze')) {
      return DesktopMetalActivities.QUALITY_INSPECTION;
    }

    return null;
  }

  private buildActivityOptions(plan: ExecutionPlan): KeyValue[] {
    const options: KeyValue[] = [
      { key: 'equipmentId', value: plan.equipmentId },
    ];

    // Add all parameters as options
    for (const [key, value] of Object.entries(plan.parameters)) {
      if (value !== undefined && value !== null) {
        options.push({ key, value: String(value) });
      }
    }

    // Add file references
    if (plan.files && plan.files.length > 0) {
      options.push({ key: 'files', value: plan.files.join(',') });
    }

    return options;
  }

  private mapActivityStatusToAdamStatus(status: ActivityStatus): string {
    const mapping: Record<ActivityStatus, string> = {
      pending: 'queued',
      running: 'in_progress',
      completed: 'completed',
      failed: 'failed',
      cancelled: 'cancelled',
    };
    return mapping[status] || status;
  }

  private validateOptionType(value: string, expectedType: string): string | null {
    switch (expectedType) {
      case 'number':
        if (isNaN(Number(value))) {
          return `expected number, got '${value}'`;
        }
        break;
      case 'boolean':
        if (value !== 'true' && value !== 'false') {
          return `expected boolean, got '${value}'`;
        }
        break;
      // string type always passes
    }
    return null;
  }
}

interface OptionSchema {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  default?: string;
}

// Export singleton instance
export const schemaMapper = new DefaultSchemaMapper();
