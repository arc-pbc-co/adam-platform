import express from 'express';
import dotenv from 'dotenv';
import { NovaOrchestrator } from './orchestrator/NovaOrchestrator';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.ORCHESTRATOR_PORT || 3100;

app.use(express.json());

// Initialize Nova Orchestrator
let orchestrator: NovaOrchestrator;

try {
  orchestrator = new NovaOrchestrator();
  logger.info('Nova Orchestrator initialized');
} catch (error) {
  logger.error('Failed to initialize orchestrator:', error);
  process.exit(1);
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'nova-orchestrator',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    agents: {
      planning: 'active',
      design: 'active',
      simulation: 'active',
      controller: 'active',
      analyzer: 'active',
    },
  });
});

// API endpoints
app.get('/experiments/:id/status', async (req, res) => {
  try {
    // TODO: Get workflow status from orchestrator
    res.json({
      experimentId: req.params.id,
      status: 'active',
      currentPhase: 'planning',
      message: 'Experiment in progress',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/agents/status', (req, res) => {
  res.json({
    agents: [
      { name: 'PlanningAgent', status: 'active', model: process.env.LLM_MODEL || 'gpt-4o-mini' },
      { name: 'DesignAgent', status: 'active', model: process.env.LLM_MODEL || 'gpt-4o-mini' },
      { name: 'SimulationAgent', status: 'active', model: process.env.LLM_MODEL || 'gpt-4o-mini' },
      { name: 'ControllerAgent', status: 'active', model: process.env.LLM_MODEL || 'gpt-4o-mini' },
      { name: 'AnalyzerAgent', status: 'active', model: process.env.LLM_MODEL || 'gpt-4o-mini' },
    ],
  });
});

app.listen(PORT, () => {
  logger.info(`🤖 Nova Orchestrator running on port ${PORT}`);
  logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔬 Multi-agent system active with 5 specialized agents`);
  logger.info(`📡 Listening for NATS events on EXPERIMENTS.* and HARDWARE.*`);
});
