/**
 * Desktop Metal Instrument Controller
 *
 * Implements the INTERSECT Instrument Controller capability contract
 * for Desktop Metal binder jetting printers.
 *
 * Wraps the existing DesktopMetalClient and exposes INTERSECT-compatible
 * actions and activities.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  InstrumentController,
  ActionListResponse,
  ActionDescriptionResponse,
  PerformActionRequest,
  PerformActionResponse,
  ActivityListResponse,
  ActivityDescriptionResponse,
  StartActivityRequest,
  StartActivityResponse,
  ActivityStatusResponse,
  ActivityDataResponse,
  CancelActivityRequest,
  CancelActivityResponse,
  InstrumentActivityStatusChange,
  InstrumentActionCompletion,
  ActivityStatus,
  Correlation,
  KeyValue,
  IntersectEvent,
} from '../../../backend/src/integrations/intersect/types';

// Import existing Desktop Metal types
import {
  Printer,
  PrintJob,
  PrintParameters,
  HardwareTelemetry,
} from '../../../backend/hardware/src/types';

/**
 * Desktop Metal client interface (subset of DesktopMetalClient)
 */
interface IDesktopMetalClient {
  getPrinters(): Promise<Printer[]>;
  getPrinter(printerId: string): Promise<Printer>;
  submitPrintJob(
    printerId: string,
    experimentId: string,
    parameters: PrintParameters,
    files: any
  ): Promise<PrintJob>;
  getJobStatus(jobId: string): Promise<PrintJob>;
  cancelJob(jobId: string): Promise<void>;
  getTelemetry(printerId: string): Promise<HardwareTelemetry>;
  uploadFile(file: Buffer, filename: string): Promise<string>;
}

/**
 * Activity tracking
 */
interface TrackedActivity {
  activityId: string;
  activityName: string;
  status: ActivityStatus;
  progress: number;
  startTime: Date;
  endTime?: Date;
  correlation: Correlation;
  printJobId?: string;
  printerId?: string;
  dataProducts: string[];
  errorMsg?: string;
  deadline?: Date;
  pollTimer?: NodeJS.Timeout;
}

/**
 * Event callback type
 */
type EventCallback = (event: IntersectEvent) => Promise<void>;

/**
 * Desktop Metal Instrument Controller
 */
export class DesktopMetalController implements InstrumentController {
  readonly controllerId: string;
  readonly controllerName: string;
  readonly controllerType: string = 'desktop_metal';

  private dmClient: IDesktopMetalClient;
  private activities: Map<string, TrackedActivity> = new Map();
  private performedActions: Map<string, Date> = new Map();
  private eventCallback?: EventCallback;
  private pollIntervalMs: number = 5000;

  constructor(
    dmClient: IDesktopMetalClient,
    controllerId: string = 'desktop-metal-controller',
    controllerName: string = 'Desktop Metal Binder Jetting Controller'
  ) {
    this.dmClient = dmClient;
    this.controllerId = controllerId;
    this.controllerName = controllerName;
  }

  /**
   * Set event callback for emitting INTERSECT events
   */
  setEventCallback(callback: EventCallback): void {
    this.eventCallback = callback;
  }

  /**
   * Set polling interval for job status monitoring
   */
  setPollInterval(ms: number): void {
    this.pollIntervalMs = ms;
  }

  // ============================================================================
  // Action Methods
  // ============================================================================

  async listActions(): Promise<ActionListResponse> {
    return {
      actionNames: [
        'calibrate_printhead',
        'home_axes',
        'preheat_buildplate',
        'clean_printhead',
        'check_binder_level',
        'check_powder_level',
        'get_telemetry',
        'upload_file',
      ],
    };
  }

  async getActionDescription(actionName: string): Promise<ActionDescriptionResponse> {
    const descriptions: Record<string, ActionDescriptionResponse> = {
      calibrate_printhead: {
        actionName: 'calibrate_printhead',
        description: 'Calibrate the printhead for optimal binder jetting accuracy',
        options: [
          { name: 'printerId', type: 'string', required: true, description: 'Target printer ID' },
        ],
        idempotent: true,
      },
      home_axes: {
        actionName: 'home_axes',
        description: 'Move all printer axes to home position',
        options: [
          { name: 'printerId', type: 'string', required: true, description: 'Target printer ID' },
        ],
        idempotent: true,
      },
      preheat_buildplate: {
        actionName: 'preheat_buildplate',
        description: 'Preheat the build plate to specified temperature',
        options: [
          { name: 'printerId', type: 'string', required: true, description: 'Target printer ID' },
          { name: 'temperature', type: 'number', required: true, description: 'Target temperature in Celsius' },
        ],
        idempotent: false,
      },
      clean_printhead: {
        actionName: 'clean_printhead',
        description: 'Run printhead cleaning cycle',
        options: [
          { name: 'printerId', type: 'string', required: true, description: 'Target printer ID' },
        ],
        idempotent: true,
      },
      check_binder_level: {
        actionName: 'check_binder_level',
        description: 'Check current binder level and return percentage',
        options: [
          { name: 'printerId', type: 'string', required: true, description: 'Target printer ID' },
        ],
        idempotent: true,
      },
      check_powder_level: {
        actionName: 'check_powder_level',
        description: 'Check current powder level and return percentage',
        options: [
          { name: 'printerId', type: 'string', required: true, description: 'Target printer ID' },
        ],
        idempotent: true,
      },
      get_telemetry: {
        actionName: 'get_telemetry',
        description: 'Get current telemetry data from printer',
        options: [
          { name: 'printerId', type: 'string', required: true, description: 'Target printer ID' },
        ],
        idempotent: true,
      },
      upload_file: {
        actionName: 'upload_file',
        description: 'Upload a file (STL/3MF) for printing',
        options: [
          { name: 'filename', type: 'string', required: true, description: 'File name' },
          { name: 'fileData', type: 'string', required: true, description: 'Base64 encoded file data' },
        ],
        idempotent: false,
      },
    };

    const desc = descriptions[actionName];
    if (!desc) {
      throw new Error(`Unknown action: ${actionName}`);
    }
    return desc;
  }

  async performAction(
    actionName: string,
    request: PerformActionRequest
  ): Promise<PerformActionResponse> {
    // Check idempotency
    if (this.performedActions.has(request.idempotencyKey)) {
      return { accepted: true, message: 'Action already performed (idempotent)' };
    }

    const startTime = new Date();
    let result: any;

    try {
      const options = this.optionsToMap(request.actionOptions || []);

      switch (actionName) {
        case 'calibrate_printhead':
        case 'home_axes':
        case 'clean_printhead':
          // These are simulated as the DM client doesn't have direct support
          await this.simulateAction(actionName, 2000);
          result = { success: true };
          break;

        case 'preheat_buildplate':
          await this.simulateAction(actionName, 5000);
          result = { temperature: options.get('temperature') };
          break;

        case 'check_binder_level':
        case 'check_powder_level':
        case 'get_telemetry':
          const printerId = options.get('printerId');
          if (!printerId) throw new Error('printerId is required');
          const telemetry = await this.dmClient.getTelemetry(printerId);
          result = telemetry;
          break;

        case 'upload_file':
          const filename = options.get('filename');
          const fileData = options.get('fileData');
          if (!filename || !fileData) {
            throw new Error('filename and fileData are required');
          }
          const fileBuffer = Buffer.from(fileData, 'base64');
          const fileId = await this.dmClient.uploadFile(fileBuffer, filename);
          result = { fileId };
          break;

        default:
          throw new Error(`Unknown action: ${actionName}`);
      }

      // Mark as performed
      this.performedActions.set(request.idempotencyKey, new Date());

      // Emit completion event
      await this.emitActionCompletion({
        actionName,
        actionStatus: 'success',
        timeBegin: startTime,
        timeEnd: new Date(),
        statusMsg: `Action ${actionName} completed successfully`,
        correlation: request.correlation,
      });

      return {
        accepted: true,
        message: JSON.stringify(result),
      };
    } catch (error) {
      await this.emitActionCompletion({
        actionName,
        actionStatus: 'failed',
        timeBegin: startTime,
        timeEnd: new Date(),
        statusMsg: `Action ${actionName} failed`,
        errorMsg: (error as Error).message,
        correlation: request.correlation,
      });

      throw error;
    }
  }

  // ============================================================================
  // Activity Methods
  // ============================================================================

  async listActivities(): Promise<ActivityListResponse> {
    return {
      activityNames: [
        'print_job',
        'batch_print',
      ],
    };
  }

  async getActivityDescription(activityName: string): Promise<ActivityDescriptionResponse> {
    const descriptions: Record<string, ActivityDescriptionResponse> = {
      print_job: {
        activityName: 'print_job',
        description: 'Execute a binder jetting print job on a Desktop Metal printer',
        options: [
          { name: 'printerId', type: 'string', required: true, description: 'Target printer ID' },
          { name: 'stlFileId', type: 'string', required: true, description: 'Uploaded STL file ID' },
          { name: 'material', type: 'string', required: true, description: 'Material to use' },
          { name: 'layerThickness', type: 'number', required: false, default: '50', description: 'Layer thickness in microns' },
          { name: 'printSpeed', type: 'number', required: false, default: '100', description: 'Print speed percentage' },
          { name: 'binderSaturation', type: 'number', required: false, default: '100', description: 'Binder saturation percentage' },
        ],
        estimatedDuration: 7200, // 2 hours typical
        dataProducts: ['print_log', 'build_statistics', 'layer_images', 'telemetry_timeseries'],
      },
      batch_print: {
        activityName: 'batch_print',
        description: 'Execute multiple print jobs as a batch',
        options: [
          { name: 'printerId', type: 'string', required: true },
          { name: 'jobIds', type: 'string', required: true, description: 'Comma-separated job IDs' },
        ],
        estimatedDuration: 14400, // 4 hours
        dataProducts: ['batch_report', 'individual_logs'],
      },
    };

    const desc = descriptions[activityName];
    if (!desc) {
      throw new Error(`Unknown activity: ${activityName}`);
    }
    return desc;
  }

  async startActivity(
    activityName: string,
    request: StartActivityRequest
  ): Promise<StartActivityResponse> {
    const activityId = `dm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const options = this.optionsToMap(request.activityOptions || []);

    const activity: TrackedActivity = {
      activityId,
      activityName,
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      correlation: request.correlation,
      deadline: request.activityDeadline,
      dataProducts: [],
    };

    this.activities.set(activityId, activity);

    console.log(`[DMController] Starting activity: ${activityName} (${activityId})`);

    try {
      switch (activityName) {
        case 'print_job':
          await this.startPrintJob(activity, options);
          break;
        case 'batch_print':
          // Not fully implemented - would handle batch operations
          activity.status = 'running';
          await this.emitStatusChange(activity);
          break;
        default:
          throw new Error(`Unknown activity: ${activityName}`);
      }

      return {
        activityId,
        message: `Activity ${activityName} started`,
      };
    } catch (error) {
      activity.status = 'failed';
      activity.errorMsg = (error as Error).message;
      activity.endTime = new Date();
      await this.emitStatusChange(activity);
      throw error;
    }
  }

  async getActivityStatus(activityId: string): Promise<ActivityStatusResponse> {
    const activity = this.activities.get(activityId);
    if (!activity) {
      throw new Error(`Unknown activity ID: ${activityId}`);
    }

    return {
      activityId: activity.activityId,
      activityName: activity.activityName,
      activityStatus: activity.status,
      statusMsg: this.getStatusMessage(activity),
      progress: activity.progress,
      timeBegin: activity.startTime,
      timeEnd: activity.endTime,
      errorMsg: activity.errorMsg,
    };
  }

  async getActivityData(activityId: string): Promise<ActivityDataResponse> {
    const activity = this.activities.get(activityId);
    if (!activity) {
      throw new Error(`Unknown activity ID: ${activityId}`);
    }

    if (activity.status !== 'completed') {
      throw new Error('Data not ready - activity not completed');
    }

    return {
      activityId: activity.activityId,
      products: activity.dataProducts,
      message: `${activity.dataProducts.length} data products available`,
    };
  }

  async cancelActivity(
    activityId: string,
    request: CancelActivityRequest
  ): Promise<CancelActivityResponse> {
    const activity = this.activities.get(activityId);
    if (!activity) {
      throw new Error(`Unknown activity ID: ${activityId}`);
    }

    if (activity.status === 'completed' || activity.status === 'failed') {
      return {
        cancelled: false,
        message: `Activity already ${activity.status}`,
      };
    }

    // Cancel the underlying print job
    if (activity.printJobId) {
      try {
        await this.dmClient.cancelJob(activity.printJobId);
      } catch (error) {
        console.error(`Failed to cancel print job ${activity.printJobId}:`, error);
      }
    }

    // Stop polling
    if (activity.pollTimer) {
      clearTimeout(activity.pollTimer);
    }

    activity.status = 'cancelled';
    activity.endTime = new Date();
    activity.errorMsg = request.reason;

    await this.emitStatusChange(activity, request.reason);

    return {
      cancelled: true,
      message: `Activity cancelled: ${request.reason}`,
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      const printers = await this.dmClient.getPrinters();
      return {
        healthy: true,
        message: `${printers.length} printers available`,
      };
    } catch (error) {
      return {
        healthy: false,
        message: (error as Error).message,
      };
    }
  }

  // ============================================================================
  // Print Job Logic
  // ============================================================================

  private async startPrintJob(
    activity: TrackedActivity,
    options: Map<string, string>
  ): Promise<void> {
    const printerId = options.get('printerId');
    const stlFileId = options.get('stlFileId');
    const material = options.get('material');

    if (!printerId || !stlFileId || !material) {
      throw new Error('printerId, stlFileId, and material are required');
    }

    // Build print parameters
    const parameters: PrintParameters = {
      material,
      layerThickness: parseInt(options.get('layerThickness') || '50'),
      printSpeed: parseInt(options.get('printSpeed') || '100'),
      binderSaturation: parseInt(options.get('binderSaturation') || '100'),
    };

    // Submit print job to Desktop Metal
    const job = await this.dmClient.submitPrintJob(
      printerId,
      activity.correlation.experimentRunId,
      parameters,
      { stlFileId }
    );

    activity.printJobId = job.id;
    activity.printerId = printerId;
    activity.status = 'running';

    await this.emitStatusChange(activity);

    // Start monitoring the job
    this.monitorPrintJob(activity);
  }

  private monitorPrintJob(activity: TrackedActivity): void {
    const poll = async () => {
      if (activity.status !== 'running') {
        return;
      }

      // Check deadline
      if (activity.deadline && new Date() > activity.deadline) {
        await this.cancelActivity(activity.activityId, { reason: 'Deadline exceeded' });
        return;
      }

      try {
        const jobStatus = await this.dmClient.getJobStatus(activity.printJobId!);

        // Update progress
        activity.progress = jobStatus.progress || 0;

        // Map job status to activity status
        switch (jobStatus.status) {
          case 'queued':
            activity.status = 'pending';
            break;
          case 'printing':
            activity.status = 'running';
            break;
          case 'completed':
            activity.status = 'completed';
            activity.endTime = new Date();
            activity.dataProducts = this.generateDataProducts(activity);
            break;
          case 'failed':
            activity.status = 'failed';
            activity.endTime = new Date();
            activity.errorMsg = 'Print job failed';
            break;
          case 'cancelled':
            activity.status = 'cancelled';
            activity.endTime = new Date();
            break;
        }

        await this.emitStatusChange(activity);

        // Continue polling if still running
        if (activity.status === 'running' || activity.status === 'pending') {
          activity.pollTimer = setTimeout(poll, this.pollIntervalMs);
        }
      } catch (error) {
        console.error(`Error polling job status for ${activity.printJobId}:`, error);
        // Continue polling even on error
        activity.pollTimer = setTimeout(poll, this.pollIntervalMs);
      }
    };

    // Start polling
    activity.pollTimer = setTimeout(poll, this.pollIntervalMs);
  }

  private generateDataProducts(activity: TrackedActivity): string[] {
    // Generate UUIDs for data products
    return [
      uuidv4(), // print_log
      uuidv4(), // build_statistics
      uuidv4(), // layer_images
      uuidv4(), // telemetry_timeseries
    ];
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private optionsToMap(options: KeyValue[]): Map<string, string> {
    return new Map(options.map((o) => [o.key, o.value]));
  }

  private async simulateAction(actionName: string, durationMs: number): Promise<void> {
    console.log(`[DMController] Simulating action: ${actionName}`);
    await new Promise((resolve) => setTimeout(resolve, durationMs));
  }

  private getStatusMessage(activity: TrackedActivity): string {
    switch (activity.status) {
      case 'pending':
        return 'Print job queued, waiting to start';
      case 'running':
        return `Printing... ${activity.progress}% complete`;
      case 'completed':
        return 'Print job completed successfully';
      case 'failed':
        return activity.errorMsg || 'Print job failed';
      case 'cancelled':
        return activity.errorMsg || 'Print job was cancelled';
      default:
        return 'Unknown status';
    }
  }

  // ============================================================================
  // Event Emission
  // ============================================================================

  private async emitStatusChange(
    activity: TrackedActivity,
    additionalMsg?: string
  ): Promise<void> {
    const event: InstrumentActivityStatusChange = {
      activityId: activity.activityId,
      activityName: activity.activityName,
      activityStatus: activity.status,
      progress: activity.progress,
      statusMsg: additionalMsg || this.getStatusMessage(activity),
      errorMsg: activity.errorMsg,
      correlation: activity.correlation,
    };

    if (this.eventCallback) {
      await this.eventCallback({
        eventType: 'activity.status_change',
        timestamp: new Date(),
        controllerId: this.controllerId,
        payload: event,
      });
    }
  }

  private async emitActionCompletion(event: InstrumentActionCompletion): Promise<void> {
    if (this.eventCallback) {
      await this.eventCallback({
        eventType: 'action.completion',
        timestamp: new Date(),
        controllerId: this.controllerId,
        payload: event,
      });
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Stop all polling and cleanup
   */
  shutdown(): void {
    for (const activity of this.activities.values()) {
      if (activity.pollTimer) {
        clearTimeout(activity.pollTimer);
      }
    }
  }
}

/**
 * Factory function
 */
export function createDesktopMetalController(
  dmClient: IDesktopMetalClient,
  controllerId?: string
): DesktopMetalController {
  return new DesktopMetalController(dmClient, controllerId);
}
