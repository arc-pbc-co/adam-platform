// Hardware Integration Types

export interface HardwareConfig {
  apiKey: string;
  apiUrl: string;
  organizationId: string;
  timeout: number;
  retries: number;
}

export interface Printer {
  id: string;
  name: string;
  model: PrinterModel;
  serialNumber: string;
  status: PrinterStatus;
  capabilities: PrinterCapabilities;
  location: string;
  lastSeen?: Date;
}

export type PrinterModel =
  | 'X25Pro'
  | 'ShopSystem'
  | 'X160Pro'
  | 'InnoventX'
  | 'ETECXtreme8K'
  | 'ShopSystemCeramics';

export type PrinterStatus =
  | 'idle'
  | 'busy'
  | 'printing'
  | 'maintenance'
  | 'error'
  | 'offline';

export interface PrinterCapabilities {
  buildVolume: {
    x: number;
    y: number;
    z: number;
    unit: 'mm';
  };
  technology: 'binder_jetting' | 'dlp' | 'fdm';
  materials: string[];
  resolution: number;
  maxLayerThickness: number;
  minLayerThickness: number;
}

export interface PrintJob {
  id: string;
  experimentId: string;
  printerId: string;
  status: JobStatus;
  parameters: PrintParameters;
  files: JobFiles;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  progress?: number;
  error?: string;
}

export type JobStatus =
  | 'queued'
  | 'preparing'
  | 'printing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface PrintParameters {
  layerThickness: number;
  binderSaturation: number;
  printSpeed: number;
  dryingTime?: number;
  recoatSpeed?: number;
  buildMode?: 'normal' | 'fast' | 'high_quality';
  [key: string]: any;
}

export interface JobFiles {
  stl?: string;
  gcode?: string;
  config?: string;
  preview?: string;
}

export interface SinteringJob {
  id: string;
  experimentId: string;
  furnaceId: string;
  status: JobStatus;
  parameters: SinteringParameters;
  schedule: SinteringSchedule;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface SinteringParameters {
  temperature: number;
  heatingRate: number;
  coolingRate: number;
  holdTime: number;
  atmosphere: 'air' | 'nitrogen' | 'argon' | 'vacuum';
  pressureControl?: boolean;
}

export interface SinteringSchedule {
  phases: Array<{
    name: string;
    targetTemperature: number;
    heatingRate: number;
    holdTime: number;
  }>;
}

export interface HardwareTelemetry {
  printerId: string;
  timestamp: Date;
  metrics: {
    temperature?: number;
    humidity?: number;
    powerConsumption?: number;
    binderLevel?: number;
    powderLevel?: number;
    buildPlatformPosition?: number;
    [key: string]: any;
  };
}

export interface JobQueue {
  printerId: string;
  jobs: PrintJob[];
  currentJob?: PrintJob;
  estimatedWaitTime: number;
}

export interface HardwareError {
  printerId: string;
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
  resolutionNotes?: string;
}

export interface MaintenanceRecord {
  printerId: string;
  type: 'scheduled' | 'unscheduled' | 'calibration';
  description: string;
  performedBy: string;
  performedAt: Date;
  nextMaintenanceDue?: Date;
}
