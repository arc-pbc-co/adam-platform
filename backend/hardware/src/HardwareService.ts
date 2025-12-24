import { Pool } from 'pg';
import { connect, NatsConnection, JetStreamClient, StringCodec } from 'nats';
import { DesktopMetalClient } from './DesktopMetalClient';
import { logger } from '../../nova/src/utils/logger';
import {
  HardwareConfig,
  Printer,
  PrintJob,
  PrintParameters,
  JobFiles,
  JobQueue,
  HardwareTelemetry,
} from './types';

export class HardwareService {
  private dmClient: DesktopMetalClient;
  private db: Pool;
  private nats?: NatsConnection;
  private jetstream?: JetStreamClient;
  private sc = StringCodec();
  private jobQueues: Map<string, JobQueue> = new Map();
  private telemetryInterval?: NodeJS.Timeout;

  constructor(config: HardwareConfig, db: Pool) {
    this.dmClient = new DesktopMetalClient(config);
    this.db = db;

    this.initializeNATS();
    this.syncHardwareFleet();
    this.startTelemetryMonitoring();
  }

  private async initializeNATS() {
    try {
      this.nats = await connect({
        servers: process.env.NATS_URL || 'nats://localhost:4222',
      });
      this.jetstream = this.nats.jetstream();
      logger.info('Hardware Service: NATS connected');

      // Subscribe to hardware events
      this.subscribeToEvents();
    } catch (error) {
      logger.error('Hardware Service: Failed to connect to NATS:', error);
    }
  }

  private async subscribeToEvents() {
    if (!this.jetstream) return;

    try {
      const js = this.jetstream;

      // Subscribe to job submissions
      const jobSub = await js.subscribe('HARDWARE.job.submitted');
      (async () => {
        for await (const msg of jobSub) {
          try {
            const data = JSON.parse(this.sc.decode(msg.data));
            await this.handleJobSubmission(data);
            msg.ack();
          } catch (error) {
            logger.error('Error handling job submission:', error);
            msg.nak();
          }
        }
      })();

      logger.info('Hardware Service: Subscribed to NATS events');
    } catch (error) {
      logger.error('Hardware Service: Failed to subscribe to events:', error);
    }
  }

  /**
   * Sync hardware fleet from Desktop Metal API to local database
   */
  private async syncHardwareFleet() {
    try {
      logger.info('Syncing hardware fleet from Desktop Metal API...');

      const printers = await this.dmClient.getPrinters();

      for (const printer of printers) {
        // Upsert printer into database
        await this.db.query(
          `INSERT INTO hardware (id, name, type, model, serial_number, status, capabilities, location)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (serial_number)
           DO UPDATE SET
             name = EXCLUDED.name,
             status = EXCLUDED.status,
             capabilities = EXCLUDED.capabilities,
             location = EXCLUDED.location,
             updated_at = NOW()`,
          [
            printer.id,
            printer.name,
            'printer',
            printer.model,
            printer.serialNumber,
            printer.status,
            JSON.stringify(printer.capabilities),
            printer.location,
          ]
        );

        // Initialize job queue for this printer
        this.jobQueues.set(printer.id, {
          printerId: printer.id,
          jobs: [],
          estimatedWaitTime: 0,
        });
      }

      logger.info(`Synced ${printers.length} printers from Desktop Metal`);
    } catch (error) {
      logger.error('Failed to sync hardware fleet:', error);
    }
  }

  /**
   * Start monitoring hardware telemetry
   */
  private startTelemetryMonitoring() {
    // Poll telemetry every 30 seconds
    this.telemetryInterval = setInterval(async () => {
      await this.collectTelemetry();
    }, 30000);

    logger.info('Hardware telemetry monitoring started');
  }

  /**
   * Collect telemetry from all printers
   */
  private async collectTelemetry() {
    try {
      const printers = await this.dmClient.getPrinters();

      for (const printer of printers) {
        try {
          const telemetry = await this.dmClient.getTelemetry(printer.id);

          // Store in TimescaleDB
          await this.db.query(
            `INSERT INTO hardware_telemetry (time, hardware_id, metric_name, value, unit, metadata)
             VALUES
               (NOW(), $1, 'temperature', $2, '°C', NULL),
               (NOW(), $1, 'humidity', $3, '%', NULL),
               (NOW(), $1, 'power_consumption', $4, 'W', NULL),
               (NOW(), $1, 'binder_level', $5, '%', NULL),
               (NOW(), $1, 'powder_level', $6, '%', NULL)`,
            [
              printer.id,
              telemetry.metrics.temperature,
              telemetry.metrics.humidity,
              telemetry.metrics.powerConsumption,
              telemetry.metrics.binderLevel,
              telemetry.metrics.powderLevel,
            ]
          );

          // Publish telemetry event
          await this.publishEvent('HARDWARE', 'telemetry.updated', {
            printerId: printer.id,
            metrics: telemetry.metrics,
          });
        } catch (error) {
          logger.error(`Failed to collect telemetry for printer ${printer.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to collect telemetry:', error);
    }
  }

  /**
   * Handle job submission from NATS event
   */
  private async handleJobSubmission(data: any) {
    const { jobId, experimentId, equipmentId, jobType, parameters } = data;

    logger.info(`Handling job submission: ${jobId} for equipment ${equipmentId}`);

    try {
      if (jobType === 'print') {
        await this.submitPrintJob(experimentId, equipmentId, parameters);
      } else if (jobType === 'sinter') {
        await this.submitSinteringJob(experimentId, equipmentId, parameters);
      } else {
        logger.warn(`Unknown job type: ${jobType}`);
      }
    } catch (error) {
      logger.error(`Failed to handle job submission ${jobId}:`, error);

      // Update job status to failed
      await this.db.query(
        'UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2',
        ['failed', jobId]
      );

      // Publish failure event
      await this.publishEvent('HARDWARE', 'job.failed', {
        jobId,
        experimentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Submit a print job to Desktop Metal printer
   */
  async submitPrintJob(
    experimentId: string,
    printerId: string,
    parameters: PrintParameters
  ): Promise<PrintJob> {
    logger.info(`Submitting print job to printer ${printerId}`);

    // Check printer availability
    const printer = await this.dmClient.getPrinter(printerId);

    if (printer.status !== 'idle') {
      // Add to queue
      const queue = this.jobQueues.get(printerId);
      if (queue) {
        logger.info(`Printer ${printerId} busy, adding job to queue`);
      }
    }

    // Create job files (mock STL generation)
    const files: JobFiles = {
      stl: `exp_${experimentId}_part.stl`,
      config: `exp_${experimentId}_config.json`,
    };

    // Submit to Desktop Metal API
    const job = await this.dmClient.submitPrintJob(
      printerId,
      experimentId,
      parameters,
      files
    );

    // Update database
    await this.db.query(
      `UPDATE jobs
       SET status = $1, parameters = $2, started_at = NOW(), updated_at = NOW()
       WHERE experiment_id = $3 AND hardware_id = $4 AND job_type = 'print'`,
      ['printing', JSON.stringify(parameters), experimentId, printerId]
    );

    // Update printer status
    await this.db.query(
      'UPDATE hardware SET status = $1, updated_at = NOW() WHERE id = $2',
      ['busy', printerId]
    );

    // Publish job started event
    await this.publishEvent('HARDWARE', 'job.started', {
      jobId: job.id,
      experimentId,
      printerId,
      estimatedDuration: job.estimatedDuration,
    });

    // Start job monitoring
    this.monitorJob(job);

    return job;
  }

  /**
   * Submit a sintering job
   */
  async submitSinteringJob(
    experimentId: string,
    furnaceId: string,
    parameters: any
  ): Promise<void> {
    logger.info(`Submitting sintering job to furnace ${furnaceId}`);

    // In production, integrate with furnace control system
    // For now, mock the sintering process

    await this.db.query(
      `UPDATE jobs
       SET status = $1, parameters = $2, started_at = NOW(), updated_at = NOW()
       WHERE experiment_id = $3 AND hardware_id = $4 AND job_type = 'sinter'`,
      ['running', JSON.stringify(parameters), experimentId, furnaceId]
    );

    await this.publishEvent('HARDWARE', 'job.started', {
      experimentId,
      furnaceId,
      jobType: 'sinter',
    });

    // Simulate sintering completion after some time
    setTimeout(async () => {
      await this.completeSinteringJob(experimentId, furnaceId);
    }, 60000); // 1 minute for testing
  }

  /**
   * Complete sintering job
   */
  private async completeSinteringJob(experimentId: string, furnaceId: string) {
    logger.info(`Completing sintering job for experiment ${experimentId}`);

    await this.db.query(
      `UPDATE jobs
       SET status = $1, completed_at = NOW(), updated_at = NOW()
       WHERE experiment_id = $2 AND hardware_id = $3 AND job_type = 'sinter'`,
      ['completed', experimentId, furnaceId]
    );

    await this.publishEvent('HARDWARE', 'job.completed', {
      experimentId,
      furnaceId,
      jobType: 'sinter',
    });
  }

  /**
   * Monitor job progress
   */
  private async monitorJob(job: PrintJob) {
    const checkInterval = setInterval(async () => {
      try {
        const status = await this.dmClient.getJobStatus(job.id);

        // Update database
        await this.db.query(
          `UPDATE jobs
           SET status = $1, updated_at = NOW()
           WHERE id = $2`,
          [status.status, job.id]
        );

        // Publish progress event
        if (status.progress !== undefined) {
          await this.publishEvent('HARDWARE', 'job.progress', {
            jobId: job.id,
            progress: status.progress,
            status: status.status,
          });
        }

        // Check if job is complete
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(checkInterval);

          // Update printer status back to idle
          await this.db.query(
            'UPDATE hardware SET status = $1, updated_at = NOW() WHERE id = $2',
            ['idle', job.printerId]
          );

          // Publish completion event
          await this.publishEvent('HARDWARE', `job.${status.status}`, {
            jobId: job.id,
            experimentId: job.experimentId,
            printerId: job.printerId,
            duration: status.actualDuration,
          });

          logger.info(`Job ${job.id} ${status.status}`);
        }
      } catch (error) {
        logger.error(`Error monitoring job ${job.id}:`, error);
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Get job queue for a printer
   */
  async getJobQueue(printerId: string): Promise<JobQueue> {
    const queue = this.jobQueues.get(printerId);

    if (!queue) {
      throw new Error(`No queue found for printer ${printerId}`);
    }

    return queue;
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    logger.info(`Cancelling job ${jobId}`);

    await this.dmClient.cancelJob(jobId);

    await this.db.query(
      'UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2',
      ['cancelled', jobId]
    );

    await this.publishEvent('HARDWARE', 'job.cancelled', { jobId });
  }

  /**
   * Get hardware fleet status
   */
  async getFleetStatus(): Promise<Printer[]> {
    return this.dmClient.getPrinters();
  }

  /**
   * Publish event to NATS
   */
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
   * Cleanup
   */
  async shutdown() {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
    }

    if (this.nats) {
      await this.nats.close();
    }

    logger.info('Hardware Service shutdown complete');
  }
}
