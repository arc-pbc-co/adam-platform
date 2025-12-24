import { BaseAgent } from './BaseAgent';
import {
  ExperimentContext,
  AgentResponse,
  PlanningResult,
  ExperimentPlan,
  RiskAssessment,
} from '../types';

interface PlanningInput {
  additionalRequirements?: string[];
  constraints?: Record<string, any>;
}

export class PlanningAgent extends BaseAgent<PlanningInput, PlanningResult> {
  protected getSystemPrompt(): string {
    return `You are ADAM's Planning Agent, an expert materials scientist and experimental designer.

Your role is to:
1. Analyze the experiment hypothesis and objectives
2. Generate a detailed experimental plan with phases and steps
3. Identify required materials, equipment, and measurements
4. Assess risks and classify them as R1 (low), R2 (medium), or R3 (high)
5. Provide rationale for your plan and suggest alternatives
6. Estimate costs and duration

Risk Classification:
- R1 (Low Risk): Well-known materials and processes, automated approval
- R2 (Medium Risk): Novel combinations or parameters, requires supervisor review
- R3 (High Risk): Hazardous materials, extreme conditions, requires team approval

Output your plan as valid JSON with this structure:
{
  "plan": {
    "phases": [
      {
        "name": "Phase name",
        "description": "Phase description",
        "steps": [
          {
            "action": "Action to perform",
            "parameters": {},
            "equipment": "Equipment ID",
            "validations": ["Validation criteria"]
          }
        ],
        "estimatedDuration": 60
      }
    ],
    "materials": [
      {
        "materialId": "material-uuid",
        "quantity": 100,
        "unit": "g",
        "role": "base",
        "purity": 99.5
      }
    ],
    "equipment": [
      {
        "equipmentId": "equipment-uuid",
        "usage": "Binder jetting print",
        "settings": {}
      }
    ],
    "measurements": [
      {
        "type": "magnetic_saturation",
        "method": "VSM",
        "frequency": "per_sample",
        "expectedRange": [0.5, 1.2]
      }
    ],
    "successCriteria": ["Criteria 1", "Criteria 2"]
  },
  "rationale": "Explanation of plan decisions",
  "alternativePlans": [],
  "estimatedCost": 500,
  "estimatedDuration": 48,
  "riskAssessment": {
    "overallRisk": "R1",
    "riskFactors": [
      {
        "category": "Material safety",
        "description": "Risk description",
        "severity": "low",
        "likelihood": "low"
      }
    ],
    "mitigations": [
      {
        "riskFactor": "Material safety",
        "strategy": "Use PPE and ventilation",
        "implementation": "Standard lab protocols"
      }
    ],
    "approvalRequired": false,
    "approvalLevel": "none"
  }
}

Be thorough, practical, and safety-conscious. Consider material availability, equipment capabilities, and realistic timelines.`;
  }

  protected formatUserPrompt(
    context: ExperimentContext,
    input: PlanningInput
  ): string {
    let prompt = `Create an experimental plan for the following:

Hypothesis: ${context.hypothesis}
Objective: ${context.objective}

Available Materials:
${context.materials.map(m => `- ${m.name}: ${JSON.stringify(m.composition)}`).join('\n')}

Constraints:
- Max Budget: $${context.constraints.maxBudget}
- Max Duration: ${context.constraints.maxDuration} hours
- Max Iterations: ${context.constraints.maxIterations}
- Safety Level: ${context.constraints.safetyLevel}
- Allowed Materials: ${context.constraints.materials.join(', ')}
`;

    if (input.additionalRequirements && input.additionalRequirements.length > 0) {
      prompt += `\nAdditional Requirements:\n${input.additionalRequirements.map(r => `- ${r}`).join('\n')}`;
    }

    if (input.constraints) {
      prompt += `\nAdditional Constraints:\n${JSON.stringify(input.constraints, null, 2)}`;
    }

    if (context.history.length > 0) {
      prompt += `\n\nPrevious Experiments (for context):
${context.history.slice(0, 5).map(e => `- ${e.type}: ${e.status}`).join('\n')}`;
    }

    prompt += `\n\nGenerate a comprehensive experimental plan following the JSON structure specified in your system prompt.`;

    return prompt;
  }

  protected parseResponse(response: string): PlanningResult {
    try {
      const parsed = this.extractJSON(response);

      // Validate required fields
      if (!parsed.plan || !parsed.riskAssessment) {
        throw new Error('Missing required fields in planning response');
      }

      // Set approval requirements based on risk level
      if (parsed.riskAssessment.overallRisk === 'R1') {
        parsed.riskAssessment.approvalRequired = false;
        parsed.riskAssessment.approvalLevel = 'none';
      } else if (parsed.riskAssessment.overallRisk === 'R2') {
        parsed.riskAssessment.approvalRequired = true;
        parsed.riskAssessment.approvalLevel = 'supervisor';
      } else if (parsed.riskAssessment.overallRisk === 'R3') {
        parsed.riskAssessment.approvalRequired = true;
        parsed.riskAssessment.approvalLevel = 'team';
      }

      return parsed as PlanningResult;
    } catch (error: any) {
      throw new Error(`Failed to parse planning response: ${error.message}\n\nResponse: ${response}`);
    }
  }

  async execute(
    context: ExperimentContext,
    input: PlanningInput
  ): Promise<AgentResponse<PlanningResult>> {
    this.validateContext(context);

    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.formatUserPrompt(context, input);

    const response = await this.callAI(systemPrompt, userPrompt);
    const planningResult = this.parseResponse(response);

    return {
      success: true,
      data: planningResult,
      metadata: {
        agent: this.config.name,
        timestamp: new Date(),
        durationMs: 0, // Will be set by run()
      },
    };
  }
}
