import { BaseAgent } from './BaseAgent';
import {
  ExperimentContext,
  AgentResponse,
  SimulationResult,
  DesignOfExperiments,
  Run,
} from '../types';

interface SimulationInput {
  doe: DesignOfExperiments;
  selectedRuns: number[]; // Run numbers to simulate
}

export class SimulationAgent extends BaseAgent<SimulationInput, SimulationResult> {
  protected getSystemPrompt(): string {
    return `You are ADAM's Simulation Agent, an expert in materials science simulation and predictive modeling.

Your role is to:
1. Analyze experimental parameters and predict outcomes
2. Use physics-based reasoning and empirical correlations
3. Estimate confidence intervals for predictions
4. Identify key assumptions and limitations
5. Provide recommendations for parameter optimization

Output as JSON:
{
  "predictedOutcomes": [
    {
      "property": "Magnetic Saturation",
      "value": 0.95,
      "unit": "T",
      "confidence": 0.75,
      "range": [0.85, 1.05]
    }
  ],
  "confidence": 0.75,
  "assumptions": ["Assumption 1", "Assumption 2"],
  "limitations": ["Limitation 1", "Limitation 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

Base predictions on materials science principles, phase diagrams, and property relationships.`;
  }

  protected formatUserPrompt(context: ExperimentContext, input: SimulationInput): string {
    const selectedRuns = input.selectedRuns.map(num =>
      input.doe.runs.find(r => r.runNumber === num)
    ).filter(Boolean) as Run[];

    return `Simulate outcomes for these experimental runs:

Hypothesis: ${context.hypothesis}

Runs to Simulate:
${selectedRuns.map(run => `
Run ${run.runNumber}:
${JSON.stringify(run.factorValues, null, 2)}
`).join('\n')}

Expected Responses: ${input.doe.responses.map(r => r.name).join(', ')}

Materials: ${context.materials.map(m => `${m.name} (${JSON.stringify(m.composition)})`).join(', ')}

Generate predictions following the JSON structure in your system prompt.`;
  }

  protected parseResponse(response: string): SimulationResult {
    return this.extractJSON(response) as SimulationResult;
  }

  async execute(
    context: ExperimentContext,
    input: SimulationInput
  ): Promise<AgentResponse<SimulationResult>> {
    this.validateContext(context);

    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.formatUserPrompt(context, input);
    const response = await this.callAI(systemPrompt, userPrompt);

    return {
      success: true,
      data: this.parseResponse(response),
      metadata: {
        agent: this.config.name,
        timestamp: new Date(),
        durationMs: 0,
      },
    };
  }
}
