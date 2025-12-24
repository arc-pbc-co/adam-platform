import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../nova/src/utils/logger';
import {
  HardwareConfig,
  Printer,
  PrintJob,
  PrintParameters,
  JobFiles,
  HardwareTelemetry,
} from './types';
import {
  PRINTER_SPECIFICATIONS,
  getPrinterById,
  calculateBuildTime,
} from './data/PrinterSpecifications';
import { MATERIALS_DATABASE } from './data/MaterialsDatabase';

/**
 * Desktop Metal Live Suite API Client
 *
 * NOTE: This is a mock implementation since we don't have actual API access.
 * Replace with real API calls when Desktop Metal credentials are available.
 */
export class DesktopMetalClient {
  private client: AxiosInstance;
  private config: HardwareConfig;

  constructor(config: HardwareConfig) {
    this.config = config;

    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Organization-Id': config.organizationId,
      },
    });

    // Add request/response interceptors for logging and retry
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Desktop Metal API request:', {
          method: config.method,
          url: config.url,
        });
        return config;
      },
      (error) => {
        logger.error('Desktop Metal API request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Desktop Metal API response:', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      async (error: AxiosError) => {
        const config: any = error.config;

        // Retry logic
        if (!config || !config.retryCount) {
          config.retryCount = 0;
        }

        if (config.retryCount < this.config.retries) {
          config.retryCount += 1;

          const delay = Math.pow(2, config.retryCount) * 1000;
          logger.warn(`Retrying Desktop Metal API call (${config.retryCount}/${this.config.retries}) after ${delay}ms`);

          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.client(config);
        }

        logger.error('Desktop Metal API error:', {
          status: error.response?.status,
          message: error.message,
          url: config?.url,
        });

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get list of all printers in the organization
   */
  async getPrinters(): Promise<Printer[]> {
    try {
      // MOCK: Replace with real API call
      logger.info('Fetching printers from Desktop Metal API (MOCK)');

      // In production: const response = await this.client.get('/printers');
      // return response.data;

      // Mock data for development
      return this.getMockPrinters();
    } catch (error) {
      logger.error('Failed to fetch printers:', error);
      throw error;
    }
  }

  /**
   * Get printer by ID
   */
  async getPrinter(printerId: string): Promise<Printer> {
    try {
      // MOCK: Replace with real API call
      logger.info(`Fetching printer ${printerId} from Desktop Metal API (MOCK)`);

      // In production: const response = await this.client.get(`/printers/${printerId}`);
      // return response.data;

      const printers = this.getMockPrinters();
      const printer = printers.find((p) => p.id === printerId);

      if (!printer) {
        throw new Error(`Printer ${printerId} not found`);
      }

      return printer;
    } catch (error) {
      logger.error(`Failed to fetch printer ${printerId}:`, error);
      throw error;
    }
  }

  /**
   * Submit a print job
   */
  async submitPrintJob(
    printerId: string,
    experimentId: string,
    parameters: PrintParameters,
    files: JobFiles
  ): Promise<PrintJob> {
    try {
      logger.info(`Submitting print job to printer ${printerId} (MOCK)`);

      // MOCK: Replace with real API call
      // In production:
      // const response = await this.client.post(`/printers/${printerId}/jobs`, {
      //   experimentId,
      //   parameters,
      //   files,
      // });
      // return response.data;

      // Mock job creation
      const job: PrintJob = {
        id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        experimentId,
        printerId,
        status: 'queued',
        parameters,
        files,
        createdAt: new Date(),
        estimatedDuration: this.estimatePrintTime(parameters),
        progress: 0,
      };

      logger.info(`Print job created: ${job.id}`);
      return job;
    } catch (error) {
      logger.error('Failed to submit print job:', error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<PrintJob> {
    try {
      logger.debug(`Fetching job status for ${jobId} (MOCK)`);

      // MOCK: Replace with real API call
      // In production: const response = await this.client.get(`/jobs/${jobId}`);
      // return response.data;

      // Mock job status
      return {
        id: jobId,
        experimentId: 'exp_mock',
        printerId: 'printer_mock',
        status: 'printing',
        parameters: {} as PrintParameters,
        files: {},
        createdAt: new Date(),
        startedAt: new Date(),
        progress: 45,
      };
    } catch (error) {
      logger.error(`Failed to fetch job status for ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    try {
      logger.info(`Cancelling job ${jobId} (MOCK)`);

      // MOCK: Replace with real API call
      // In production: await this.client.post(`/jobs/${jobId}/cancel`);

      logger.info(`Job ${jobId} cancelled`);
    } catch (error) {
      logger.error(`Failed to cancel job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get hardware telemetry
   */
  async getTelemetry(printerId: string): Promise<HardwareTelemetry> {
    try {
      logger.debug(`Fetching telemetry for printer ${printerId} (MOCK)`);

      // MOCK: Replace with real API call
      // In production: const response = await this.client.get(`/printers/${printerId}/telemetry`);
      // return response.data;

      // Mock telemetry
      return {
        printerId,
        timestamp: new Date(),
        metrics: {
          temperature: 22 + Math.random() * 5,
          humidity: 40 + Math.random() * 10,
          powerConsumption: 500 + Math.random() * 200,
          binderLevel: 80 + Math.random() * 20,
          powderLevel: 70 + Math.random() * 30,
          buildPlatformPosition: Math.random() * 100,
        },
      };
    } catch (error) {
      logger.error(`Failed to fetch telemetry for ${printerId}:`, error);
      throw error;
    }
  }

  /**
   * Upload STL file for printing
   */
  async uploadFile(file: Buffer, filename: string): Promise<string> {
    try {
      logger.info(`Uploading file ${filename} (MOCK)`);

      // MOCK: Replace with real API call
      // In production:
      // const formData = new FormData();
      // formData.append('file', file, filename);
      // const response = await this.client.post('/files/upload', formData, {
      //   headers: { 'Content-Type': 'multipart/form-data' },
      // });
      // return response.data.fileId;

      // Mock file upload
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      logger.info(`File uploaded: ${fileId}`);
      return fileId;
    } catch (error) {
      logger.error(`Failed to upload file ${filename}:`, error);
      throw error;
    }
  }

  // Helper methods

  /**
   * Estimate print time using actual printer specifications
   * More accurate than previous mock implementation
   */
  private estimatePrintTime(parameters: PrintParameters, printerId?: string): number {
    // If we have a printer ID, use its actual specifications
    if (printerId) {
      const spec = PRINTER_SPECIFICATIONS.find(s => s.id === printerId || s.model === printerId);
      if (spec) {
        // Estimate based on part height if available in parameters
        const partHeight = (parameters as any).partHeight || 100; // mm, default assumption
        const layerThickness = parameters.layerThickness || 50; // μm
        const numLayers = (partHeight * 1000) / layerThickness;
        const timePerLayer = spec.layerSpecs.avgSpeed; // seconds
        const totalMinutes = (numLayers * timePerLayer) / 60;
        return Math.round(totalMinutes);
      }
    }

    // Fallback to simple estimation
    const baseTime = 120; // minutes
    const speedFactor = 100 / (parameters.printSpeed || 100);
    const layerFactor = (parameters.layerThickness || 50) / 50;

    return Math.round(baseTime * speedFactor * layerFactor);
  }

  /**
   * Get mock printers based on real Desktop Metal specifications
   * Uses actual specifications from PrinterSpecifications database
   */
  private getMockPrinters(): Printer[] {
    // Map printer specifications to Printer type
    return PRINTER_SPECIFICATIONS.map((spec, index) => {
      const serialNumber = `${spec.model.toUpperCase()}-2024-${String(index + 1).padStart(3, '0')}`;

      // Convert material IDs to material names for capabilities
      const materialNames = spec.capabilities.materials.map(matId => {
        const material = MATERIALS_DATABASE.find(m => m.id === matId);
        return material ? material.name : matId;
      });

      return {
        id: `${spec.model}-${String(index + 1).padStart(3, '0')}`,
        name: `${spec.name} #${index + 1}`,
        model: spec.model,
        serialNumber,
        status: 'idle',
        location: this.getLocationForPrinter(spec.category),
        capabilities: {
          buildVolume: {
            x: spec.buildVolume.x,
            y: spec.buildVolume.y,
            z: spec.buildVolume.z,
            unit: 'mm',
          },
          technology: 'binder_jetting',
          materials: materialNames,
          resolution: spec.layerSpecs.minThickness,
          maxLayerThickness: spec.layerSpecs.maxThickness,
          minLayerThickness: spec.layerSpecs.minThickness,
        },
      };
    });
  }

  /**
   * Get location based on printer category
   */
  private getLocationForPrinter(category: string): string {
    switch (category) {
      case 'research':
        return 'R&D Lab - Materials Discovery';
      case 'production':
        return 'Production Floor - Bay 1';
      case 'industrial':
        return 'Industrial Facility - Bay 2';
      default:
        return 'Manufacturing Center';
    }
  }
}
