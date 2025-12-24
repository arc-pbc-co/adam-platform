import { BaseAgent } from './BaseAgent';
import {
  ExperimentContext,
  AgentResponse,
  ExecutionPlan,
  DesignOfExperiments,
  ExperimentPlan,
} from '../types';

interface ControllerInput {
  plan: ExperimentPlan;
  doe: DesignOfExperiments;
  runNumber: number;
}

export class ControllerAgent extends BaseAgent<ControllerInput, ExecutionPlan[]> {
  protected getSystemPrompt(): string {
    return `You are ADAM's Controller Agent, responsible for translating experimental designs into hardware execution plans.

Your role is to:
1. Convert DOE parameters into specific equipment settings
2. Generate job files and control parameters for Desktop Metal printers
3. Sequence operations (print → sinter → measure)
4. Validate parameters are within equipment capabilities
5. Estimate execution time for each job

IMPORTANT: Respond with ONLY a valid JSON array. No explanations, no markdown, no text before or after the JSON.

Output format (JSON array only):
[
  {
    "jobId": "job-uuid",
    "experimentId": "exp-uuid",
    "equipmentId": "equipment-uuid",
    "jobType": "print",
    "parameters": {
      "layer_thickness": 50,
      "binder_saturation": 80,
      "print_speed": 100
    },
    "files": ["part.stl", "print-config.json"],
    "estimatedTime": 120
  }
]

Ensure all parameters are within safe operating ranges and equipment specifications.`;
  }

  protected formatUserPrompt(context: ExperimentContext, input: ControllerInput): string {
    const run = input.doe.runs.find(r => r.runNumber === input.runNumber);
    if (!run) {
      throw new Error(`Run ${input.runNumber} not found in DOE`);
    }

    return `Generate execution plans for experimental run ${input.runNumber}:

Parameters: ${JSON.stringify(run.factorValues, null, 2)}

Available Equipment:
${input.plan.equipment.map(e => `- ${e.equipmentId}: ${e.usage}`).join('\n')}

Process Sequence:
${input.plan.phases.map(p => `${p.name}: ${p.steps.map(s => s.action).join(' → ')}`).join('\n')}

Generate job plans for each phase following the JSON structure in your system prompt.`;
  }

  protected parseResponse(response: string): ExecutionPlan[] {
    const parsed = this.extractJSON(response);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  async execute(
    context: ExperimentContext,
    input: ControllerInput
  ): Promise<AgentResponse<ExecutionPlan[]>> {
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
