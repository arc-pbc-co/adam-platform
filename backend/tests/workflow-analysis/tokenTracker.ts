/**
 * Token Tracker Service
 * Tracks AI API usage, token consumption, and cost per model
 */

export interface ModelPricing {
  inputPer1k: number;  // Cost per 1000 input tokens
  outputPer1k: number; // Cost per 1000 output tokens
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

export interface AgentMetrics {
  agent: string;
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  avgDurationMs: number;
  successRate: number;
  callsByModel: Record<string, number>;
}

export interface WorkflowAnalysis {
  workflowId: string;
  startTime: Date;
  endTime?: Date;
  totalDurationMs: number;
  calls: APICall[];
  totalTokens: TokenUsage;
  totalCost: number;
  costByModel: Record<string, number>;
  costByAgent: Record<string, number>;
  agentMetrics: AgentMetrics[];
}

// Model pricing as of Dec 2024 (USD)
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI Models
  'gpt-4o': { inputPer1k: 0.0025, outputPer1k: 0.01, name: 'GPT-4o' },
  'gpt-4o-mini': { inputPer1k: 0.00015, outputPer1k: 0.0006, name: 'GPT-4o Mini' },
  'gpt-4-turbo': { inputPer1k: 0.01, outputPer1k: 0.03, name: 'GPT-4 Turbo' },
  'gpt-4': { inputPer1k: 0.03, outputPer1k: 0.06, name: 'GPT-4' },
  'gpt-3.5-turbo': { inputPer1k: 0.0005, outputPer1k: 0.0015, name: 'GPT-3.5 Turbo' },
  'o1': { inputPer1k: 0.015, outputPer1k: 0.06, name: 'O1' },
  'o1-mini': { inputPer1k: 0.003, outputPer1k: 0.012, name: 'O1 Mini' },

  // Google Gemini Models
  'gemini-2.0-flash-exp': { inputPer1k: 0.0, outputPer1k: 0.0, name: 'Gemini 2.0 Flash (Free Tier)' },
  'gemini-1.5-pro': { inputPer1k: 0.00125, outputPer1k: 0.005, name: 'Gemini 1.5 Pro' },
  'gemini-1.5-flash': { inputPer1k: 0.000075, outputPer1k: 0.0003, name: 'Gemini 1.5 Flash' },
  'gemini-pro': { inputPer1k: 0.0005, outputPer1k: 0.0015, name: 'Gemini Pro' },

  // Anthropic Claude Models
  'claude-3-opus': { inputPer1k: 0.015, outputPer1k: 0.075, name: 'Claude 3 Opus' },
  'claude-3-sonnet': { inputPer1k: 0.003, outputPer1k: 0.015, name: 'Claude 3 Sonnet' },
  'claude-3-haiku': { inputPer1k: 0.00025, outputPer1k: 0.00125, name: 'Claude 3 Haiku' },
  'claude-3.5-sonnet': { inputPer1k: 0.003, outputPer1k: 0.015, name: 'Claude 3.5 Sonnet' },
};

export class TokenTracker {
  private calls: APICall[] = [];
  private workflowId: string;
  private startTime: Date;

  constructor(workflowId?: string) {
    this.workflowId = workflowId || `workflow-${Date.now()}`;
    this.startTime = new Date();
  }

  /**
   * Estimate tokens from text (rough approximation: 4 chars = 1 token)
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate cost for given usage and model
   */
  calculateCost(usage: TokenUsage, model: string): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];
    const inputCost = (usage.inputTokens / 1000) * pricing.inputPer1k;
    const outputCost = (usage.outputTokens / 1000) * pricing.outputPer1k;
    return inputCost + outputCost;
  }

  /**
   * Record an API call
   */
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
    actualUsage?: TokenUsage; // Use actual if available from API response
  }): APICall {
    const usage = params.actualUsage || {
      inputTokens: this.estimateTokens(params.inputText),
      outputTokens: this.estimateTokens(params.outputText),
      totalTokens: this.estimateTokens(params.inputText) + this.estimateTokens(params.outputText),
    };

    const cost = this.calculateCost(usage, params.model);

    const call: APICall = {
      id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      model: params.model,
      provider: params.provider,
      agent: params.agent,
      operation: params.operation,
      usage,
      cost,
      durationMs: params.durationMs,
      success: params.success,
      error: params.error,
    };

    this.calls.push(call);
    return call;
  }

  /**
   * Get current workflow analysis
   */
  getAnalysis(): WorkflowAnalysis {
    const endTime = new Date();
    const totalDurationMs = endTime.getTime() - this.startTime.getTime();

    const totalTokens: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };

    const costByModel: Record<string, number> = {};
    const costByAgent: Record<string, number> = {};
    const agentStats: Record<string, {
      calls: number;
      tokens: number;
      cost: number;
      duration: number;
      successes: number;
      callsByModel: Record<string, number>;
    }> = {};

    for (const call of this.calls) {
      // Accumulate totals
      totalTokens.inputTokens += call.usage.inputTokens;
      totalTokens.outputTokens += call.usage.outputTokens;
      totalTokens.totalTokens += call.usage.totalTokens;

      // Cost by model
      costByModel[call.model] = (costByModel[call.model] || 0) + call.cost;

      // Cost by agent
      costByAgent[call.agent] = (costByAgent[call.agent] || 0) + call.cost;

      // Agent stats
      if (!agentStats[call.agent]) {
        agentStats[call.agent] = {
          calls: 0,
          tokens: 0,
          cost: 0,
          duration: 0,
          successes: 0,
          callsByModel: {},
        };
      }
      agentStats[call.agent].calls++;
      agentStats[call.agent].tokens += call.usage.totalTokens;
      agentStats[call.agent].cost += call.cost;
      agentStats[call.agent].duration += call.durationMs;
      if (call.success) agentStats[call.agent].successes++;
      agentStats[call.agent].callsByModel[call.model] =
        (agentStats[call.agent].callsByModel[call.model] || 0) + 1;
    }

    const agentMetrics: AgentMetrics[] = Object.entries(agentStats).map(([agent, stats]) => ({
      agent,
      totalCalls: stats.calls,
      totalTokens: stats.tokens,
      totalCost: stats.cost,
      avgDurationMs: stats.duration / stats.calls,
      successRate: stats.successes / stats.calls,
      callsByModel: stats.callsByModel,
    }));

    const totalCost = this.calls.reduce((sum, call) => sum + call.cost, 0);

    return {
      workflowId: this.workflowId,
      startTime: this.startTime,
      endTime,
      totalDurationMs,
      calls: this.calls,
      totalTokens,
      totalCost,
      costByModel,
      costByAgent,
      agentMetrics,
    };
  }

  /**
   * Generate a formatted report
   */
  generateReport(): string {
    const analysis = this.getAnalysis();

    let report = `
╔══════════════════════════════════════════════════════════════════════╗
║                    ADAM WORKFLOW ANALYSIS REPORT                      ║
╚══════════════════════════════════════════════════════════════════════╝

📊 SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Workflow ID:     ${analysis.workflowId}
  Start Time:      ${analysis.startTime.toISOString()}
  Duration:        ${(analysis.totalDurationMs / 1000).toFixed(2)}s
  Total API Calls: ${analysis.calls.length}

💰 COST BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total Cost:      $${analysis.totalCost.toFixed(6)}

  By Model:
`;

    for (const [model, cost] of Object.entries(analysis.costByModel)) {
      const pricing = MODEL_PRICING[model];
      report += `    • ${pricing?.name || model}: $${cost.toFixed(6)}\n`;
    }

    report += `
  By Agent:
`;

    for (const [agent, cost] of Object.entries(analysis.costByAgent)) {
      report += `    • ${agent}: $${cost.toFixed(6)}\n`;
    }

    report += `
🔢 TOKEN USAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Input Tokens:    ${analysis.totalTokens.inputTokens.toLocaleString()}
  Output Tokens:   ${analysis.totalTokens.outputTokens.toLocaleString()}
  Total Tokens:    ${analysis.totalTokens.totalTokens.toLocaleString()}

🤖 AGENT METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    for (const agent of analysis.agentMetrics) {
      report += `
  ${agent.agent}
    Calls:       ${agent.totalCalls}
    Tokens:      ${agent.totalTokens.toLocaleString()}
    Cost:        $${agent.totalCost.toFixed(6)}
    Avg Time:    ${agent.avgDurationMs.toFixed(0)}ms
    Success:     ${(agent.successRate * 100).toFixed(1)}%
    Models Used: ${Object.entries(agent.callsByModel).map(([m, c]) => `${m}(${c})`).join(', ')}
`;
    }

    report += `
📝 CALL LOG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    for (const call of analysis.calls) {
      const status = call.success ? '✓' : '✗';
      report += `  ${status} [${call.timestamp.toISOString().split('T')[1].split('.')[0]}] ${call.agent}::${call.operation}
     Model: ${call.model} | Tokens: ${call.usage.totalTokens} | Cost: $${call.cost.toFixed(6)} | Time: ${call.durationMs}ms
`;
      if (call.error) {
        report += `     Error: ${call.error}\n`;
      }
    }

    report += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                           END OF REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    return report;
  }

  /**
   * Export analysis as JSON
   */
  toJSON(): string {
    return JSON.stringify(this.getAnalysis(), null, 2);
  }

  /**
   * Reset tracker for new workflow
   */
  reset(workflowId?: string): void {
    this.calls = [];
    this.workflowId = workflowId || `workflow-${Date.now()}`;
    this.startTime = new Date();
  }
}

// Singleton instance for easy access
export const tokenTracker = new TokenTracker();
