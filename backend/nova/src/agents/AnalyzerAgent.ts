import { BaseAgent } from './BaseAgent';
import {
  ExperimentContext,
  AgentResponse,
  AnalysisResult,
  DesignOfExperiments,
} from '../types';

interface AnalyzerInput {
  doe: DesignOfExperiments;
  measurements: Array<{
    runNumber: number;
    measurements: Record<string, number>;
  }>;
}

export class AnalyzerAgent extends BaseAgent<AnalyzerInput, AnalysisResult> {
  protected getSystemPrompt(): string {
    return `You are ADAM's Analyzer Agent, an expert in experimental data analysis and materials characterization.

Your role is to:
1. Analyze experimental measurements and compare to predictions
2. Identify patterns, trends, and anomalies
3. Generate insights about material properties and relationships
4. Compare results to target specifications and baselines
5. Recommend next steps for optimization
6. Extract learnings for the knowledge base

Output as JSON:
{
  "measurements": [/* normalized measurements */],
  "insights": [
    {
      "category": "Performance",
      "finding": "Magnetic saturation increased with temperature",
      "significance": "high",
      "actionable": true
    }
  ],
  "comparison": {
    "vsTarget": 95,
    "vsBaseline": 15,
    "ranking": 3,
    "improvement": true
  },
  "nextSteps": ["Next step 1", "Next step 2"],
  "learnings": [
    {
      "topic": "Iron-cobalt alloys",
      "knowledge": "Sintering at 1200°C optimizes grain structure",
      "applicability": ["rare-earth-free magnets", "soft magnets"],
      "confidence": 0.85
    }
  ]
}

Provide actionable insights based on materials science principles.`;
  }

  protected formatUserPrompt(context: ExperimentContext, input: AnalyzerInput): string {
    return `Analyze experimental results:

Hypothesis: ${context.hypothesis}
Objective: ${context.objective}

Design of Experiments:
- Factors: ${input.doe.factors.map(f => f.name).join(', ')}
- Responses: ${input.doe.responses.map(r => r.name).join(', ')}

Measured Results:
${input.measurements.map(m => `
Run ${m.runNumber}:
${JSON.stringify(m.measurements, null, 2)}
Predicted: ${JSON.stringify(input.doe.runs.find(r => r.runNumber === m.runNumber)?.predictedResponses || {}, null, 2)}
`).join('\n')}

Target Specifications:
${input.doe.responses.map(r => `- ${r.name}: ${r.targetValue || `${r.targetRange?.[0]} - ${r.targetRange?.[1]}`} ${r.unit}`).join('\n')}

Analyze the results and provide insights following the JSON structure in your system prompt.`;
  }

  protected parseResponse(response: string): AnalysisResult {
    return this.extractJSON(response) as AnalysisResult;
  }

  async execute(
    context: ExperimentContext,
    input: AnalyzerInput
  ): Promise<AgentResponse<AnalysisResult>> {
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
