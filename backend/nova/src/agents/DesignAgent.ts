import { BaseAgent } from './BaseAgent';
import {
  ExperimentContext,
  AgentResponse,
  DesignOfExperiments,
  ExperimentPlan,
} from '../types';

interface DesignInput {
  plan: ExperimentPlan;
  designType?: 'factorial' | 'response_surface' | 'mixture' | 'taguchi';
  numberOfRuns?: number;
}

export class DesignAgent extends BaseAgent<DesignInput, DesignOfExperiments> {
  protected getSystemPrompt(): string {
    return `You are ADAM's Design Agent, an expert in Design of Experiments (DOE) and statistical experimental design.

Your role is to:
1. Analyze the experimental plan and identify key factors and responses
2. Create an optimal DOE matrix based on the design type
3. Generate specific parameter combinations for each experimental run
4. Provide predictions for expected responses based on scientific principles
5. Optimize the design for maximum information with minimum experiments

Design Types:
- factorial: Full or fractional factorial designs for multiple factors
- response_surface: Response surface methodology for optimization
- mixture: Mixture designs for formulation experiments
- taguchi: Taguchi/orthogonal array designs for robustness

Output your design as valid JSON with this structure:
{
  "designType": "factorial",
  "factors": [
    {
      "name": "Sintering Temperature",
      "type": "continuous",
      "unit": "°C",
      "levels": [1100, 1200, 1300],
      "lowValue": 1100,
      "highValue": 1300
    },
    {
      "name": "Binder Content",
      "type": "continuous",
      "unit": "%",
      "levels": [5, 7.5, 10],
      "lowValue": 5,
      "highValue": 10
    }
  ],
  "responses": [
    {
      "name": "Magnetic Saturation",
      "unit": "T",
      "targetValue": 1.0,
      "targetRange": [0.8, 1.2],
      "optimization": "maximize"
    },
    {
      "name": "Density",
      "unit": "g/cm³",
      "targetValue": 7.5,
      "targetRange": [7.0, 8.0],
      "optimization": "maximize"
    }
  ],
  "runs": [
    {
      "runNumber": 1,
      "factorValues": {
        "Sintering Temperature": 1100,
        "Binder Content": 5
      },
      "predictedResponses": {
        "Magnetic Saturation": 0.85,
        "Density": 7.2
      }
    }
  ],
  "analysisMethod": "ANOVA with interaction effects"
}

Consider practical constraints, measurement precision, and statistical power. Aim for efficient designs that balance thoroughness with resource constraints.`;
  }

  protected formatUserPrompt(
    context: ExperimentContext,
    input: DesignInput
  ): string {
    let prompt = `Create a Design of Experiments (DOE) for the following experiment:

Hypothesis: ${context.hypothesis}
Objective: ${context.objective}

Experimental Plan Summary:
- Phases: ${input.plan.phases.length}
- Materials: ${input.plan.materials.length}
- Equipment: ${input.plan.equipment.map(e => e.usage).join(', ')}

Key Parameters from Plan:
${JSON.stringify(input.plan.phases.flatMap(p => p.steps.map(s => s.parameters)), null, 2)}

`;

    if (input.designType) {
      prompt += `\nRequested Design Type: ${input.designType}`;
    }

    if (input.numberOfRuns) {
      prompt += `\nTarget Number of Runs: ${input.numberOfRuns}`;
    }

    prompt += `\nConstraints:
- Max Budget: $${context.constraints.maxBudget}
- Max Iterations: ${context.constraints.maxIterations}

Generate an optimal DOE following the JSON structure specified in your system prompt.
Include predicted responses based on materials science principles and the hypothesis.`;

    return prompt;
  }

  protected parseResponse(response: string): DesignOfExperiments {
    try {
      const parsed = this.extractJSON(response);

      // Validate required fields
      if (!parsed.designType || !parsed.factors || !parsed.responses || !parsed.runs) {
        throw new Error('Missing required fields in design response');
      }

      // Validate runs have factor values
      for (const run of parsed.runs) {
        if (!run.factorValues || Object.keys(run.factorValues).length === 0) {
          throw new Error(`Run ${run.runNumber} missing factor values`);
        }
      }

      return parsed as DesignOfExperiments;
    } catch (error: any) {
      throw new Error(`Failed to parse design response: ${error.message}\n\nResponse: ${response}`);
    }
  }

  async execute(
    context: ExperimentContext,
    input: DesignInput
  ): Promise<AgentResponse<DesignOfExperiments>> {
    this.validateContext(context);

    if (!input.plan) {
      throw new Error('Experimental plan is required for design');
    }

    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.formatUserPrompt(context, input);

    const response = await this.callAI(systemPrompt, userPrompt);
    const designResult = this.parseResponse(response);

    // Validate number of runs doesn't exceed constraints
    if (designResult.runs.length > context.constraints.maxIterations) {
      throw new Error(
        `Design contains ${designResult.runs.length} runs but constraint allows max ${context.constraints.maxIterations}`
      );
    }

    return {
      success: true,
      data: designResult,
      metadata: {
        agent: this.config.name,
        timestamp: new Date(),
        durationMs: 0,
      },
    };
  }
}
