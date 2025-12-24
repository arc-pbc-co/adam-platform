/**
 * Workflow Analyzer Service
 * Browser-compatible service for tracking AI API usage in the ADAM platform
 */

export interface ModelPricing {
  inputPer1k: number;
  outputPer1k: number;
  name: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface APICall {
  id: string;
  timestamp: Date;
  model: string;
  provider: 'openai' | 'gemini' | 'anthropic';
  agent: string;
  operation: string;
  usage: TokenUsage;
  cost: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface WorkflowAnalysis {
  workflowId: string;
  experimentName: string;
  startTime: Date;
  endTime?: Date;
  totalDurationMs: number;
  calls: APICall[];
  totalTokens: TokenUsage;
  totalCost: number;
  costByModel: Record<string, number>;
  costByAgent: Record<string, number>;
}

// Model pricing (USD per 1K tokens)
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o': { inputPer1k: 0.0025, outputPer1k: 0.01, name: 'GPT-4o' },
  'gpt-4o-mini': { inputPer1k: 0.00015, outputPer1k: 0.0006, name: 'GPT-4o Mini' },
  'gpt-4': { inputPer1k: 0.03, outputPer1k: 0.06, name: 'GPT-4' },
  // Gemini
  'gemini-2.0-flash-exp': { inputPer1k: 0.0, outputPer1k: 0.0, name: 'Gemini 2.0 Flash (Free)' },
  'gemini-1.5-pro': { inputPer1k: 0.00125, outputPer1k: 0.005, name: 'Gemini 1.5 Pro' },
  'gemini-1.5-flash': { inputPer1k: 0.000075, outputPer1k: 0.0003, name: 'Gemini 1.5 Flash' },
  // Claude
  'claude-3.5-sonnet': { inputPer1k: 0.003, outputPer1k: 0.015, name: 'Claude 3.5 Sonnet' },
};

class WorkflowAnalyzer {
  private calls: APICall[] = [];
  private workflowId: string = '';
  private experimentName: string = '';
  private startTime: Date = new Date();
  private isActive: boolean = false;

  startWorkflow(experimentName: string): void {
    this.workflowId = `workflow-${Date.now()}`;
    this.experimentName = experimentName;
    this.startTime = new Date();
    this.calls = [];
    this.isActive = true;
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  calculateCost(usage: TokenUsage, model: string): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];
    return (usage.inputTokens / 1000) * pricing.inputPer1k +
           (usage.outputTokens / 1000) * pricing.outputPer1k;
  }

  recordCall(params: {
    model: string;
    provider: 'openai' | 'gemini' | 'anthropic';
    agent: string;
    operation: string;
    inputText: string;
    outputText: string;
    durationMs: number;
    success: boolean;
    error?: string;
  }): APICall {
    const usage: TokenUsage = {
      inputTokens: this.estimateTokens(params.inputText),
      outputTokens: this.estimateTokens(params.outputText),
      totalTokens: this.estimateTokens(params.inputText) + this.estimateTokens(params.outputText),
    };

    const call: APICall = {
      id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      model: params.model,
      provider: params.provider,
      agent: params.agent,
      operation: params.operation,
      usage,
      cost: this.calculateCost(usage, params.model),
      durationMs: params.durationMs,
      success: params.success,
      error: params.error,
    };

    this.calls.push(call);
    return call;
  }

  getAnalysis(): WorkflowAnalysis {
    const totalTokens: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    const costByModel: Record<string, number> = {};
    const costByAgent: Record<string, number> = {};

    for (const call of this.calls) {
      totalTokens.inputTokens += call.usage.inputTokens;
      totalTokens.outputTokens += call.usage.outputTokens;
      totalTokens.totalTokens += call.usage.totalTokens;
      costByModel[call.model] = (costByModel[call.model] || 0) + call.cost;
      costByAgent[call.agent] = (costByAgent[call.agent] || 0) + call.cost;
    }

    return {
      workflowId: this.workflowId,
      experimentName: this.experimentName,
      startTime: this.startTime,
      endTime: new Date(),
      totalDurationMs: Date.now() - this.startTime.getTime(),
      calls: this.calls,
      totalTokens,
      totalCost: this.calls.reduce((sum, c) => sum + c.cost, 0),
      costByModel,
      costByAgent,
    };
  }

  endWorkflow(): WorkflowAnalysis {
    this.isActive = false;
    return this.getAnalysis();
  }

  isWorkflowActive(): boolean {
    return this.isActive;
  }

  reset(): void {
    this.calls = [];
    this.workflowId = '';
    this.experimentName = '';
    this.isActive = false;
  }
}

export const workflowAnalyzer = new WorkflowAnalyzer();

// Simulate a full workflow for testing
export async function runAnalysisDemo(experimentName: string): Promise<WorkflowAnalysis> {
  workflowAnalyzer.startWorkflow(experimentName);

  const agents = [
    { name: 'Planning Agent', model: 'gpt-4o-mini', inputLen: 2500, outputLen: 1500 },
    { name: 'Design Agent', model: 'gpt-4o-mini', inputLen: 2000, outputLen: 1200 },
    { name: 'Simulation Agent', model: 'gemini-2.0-flash-exp', inputLen: 3000, outputLen: 2000 },
    { name: 'Controller Agent', model: 'gpt-4o-mini', inputLen: 1500, outputLen: 800 },
    { name: 'Analyzer Agent', model: 'gpt-4o', inputLen: 4000, outputLen: 2500 },
  ];

  for (const agent of agents) {
    const startTime = Date.now();
    await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));

    workflowAnalyzer.recordCall({
      model: agent.model,
      provider: agent.model.startsWith('gpt') ? 'openai' : 'gemini',
      agent: agent.name,
      operation: 'execute',
      inputText: 'x'.repeat(agent.inputLen * 4),
      outputText: 'x'.repeat(agent.outputLen * 4),
      durationMs: Date.now() - startTime,
      success: true,
    });
  }

  return workflowAnalyzer.endWorkflow();
}
