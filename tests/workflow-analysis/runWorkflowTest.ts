/**
 * ADAM Workflow Test Runner
 *
 * Simulates the full agentic workflow and tracks AI API usage,
 * token consumption, and cost per model.
 *
 * Usage:
 *   npx ts-node tests/workflow-analysis/runWorkflowTest.ts
 *
 *   Or with environment variables:
 *   OPENAI_API_KEY=xxx GEMINI_API_KEY=xxx npx ts-node tests/workflow-analysis/runWorkflowTest.ts
 */

import { TokenTracker, MODEL_PRICING, tokenTracker } from './tokenTracker';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.backend if exists
const envPath = path.join(__dirname, '../../.env.backend');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

// Configuration for test
interface TestConfig {
  hypothesis: string;
  useRealAPIs: boolean;
  models: {
    planning: string;
    design: string;
    simulation: string;
    controller: string;
    analyzer: string;
  };
}

const DEFAULT_CONFIG: TestConfig = {
  hypothesis: 'Fe-Co alloy with optimized grain structure achieves 90% of NdFeB magnetic performance',
  useRealAPIs: false, // Set to true to make actual API calls
  models: {
    planning: 'gpt-4o-mini',
    design: 'gpt-4o-mini',
    simulation: 'gemini-2.0-flash-exp',
    controller: 'gpt-4o-mini',
    analyzer: 'gpt-4o',
  },
};

// Simulated prompts and responses for each agent
const AGENT_SIMULATIONS = {
  planning: {
    systemPrompt: `You are ADAM's Planning Agent, an expert materials scientist and experimental designer.
Your role is to analyze the experiment hypothesis, generate a detailed experimental plan,
identify required materials and equipment, assess risks, and estimate costs.`,
    userPromptTemplate: (hypothesis: string) => `Create an experimental plan for:
Hypothesis: ${hypothesis}
Available Materials: Fe powder, Co powder, various binders
Constraints: Max Budget $5000, Max Duration 72 hours`,
    mockResponse: `{
  "plan": {
    "phases": [
      {"name": "Material Preparation", "steps": 5, "estimatedDuration": 120},
      {"name": "Print Parameter Optimization", "steps": 8, "estimatedDuration": 240},
      {"name": "Sintering Profile Testing", "steps": 4, "estimatedDuration": 180}
    ],
    "materials": [
      {"materialId": "fe-powder-01", "quantity": 500, "unit": "g"},
      {"materialId": "co-powder-01", "quantity": 200, "unit": "g"}
    ]
  },
  "riskAssessment": {"overallRisk": "R1", "approvalRequired": false},
  "estimatedCost": 2500,
  "estimatedDuration": 48
}`,
  },
  design: {
    systemPrompt: `You are ADAM's Design Agent. Your role is to create detailed print profiles
and experimental matrices based on the planning agent's output.`,
    userPromptTemplate: (hypothesis: string) => `Design experimental matrix for:
${hypothesis}
Generate print profiles with varying parameters.`,
    mockResponse: `{
  "experimentMatrix": {
    "totalRuns": 12,
    "variations": [
      {"binderSaturation": [55, 60, 65, 70]},
      {"layerThickness": [40, 50, 60]},
      {"feCoRatio": ["50:50", "60:40", "70:30"]}
    ]
  },
  "printProfiles": [
    {"id": "profile-1", "parameters": {"saturation": 55, "thickness": 50}},
    {"id": "profile-2", "parameters": {"saturation": 60, "thickness": 50}}
  ]
}`,
  },
  simulation: {
    systemPrompt: `You are ADAM's Simulation Agent using Live Sinter™ physics engine.
Predict microstructure and properties based on print parameters.`,
    userPromptTemplate: (hypothesis: string) => `Run thermal simulation for:
${hypothesis}
Predict sintering outcomes for all print profiles.`,
    mockResponse: `{
  "simulationResults": {
    "confidence": 94.2,
    "predictions": [
      {"profileId": "profile-1", "density": 7.65, "magneticSaturation": 1.8},
      {"profileId": "profile-2", "density": 7.72, "magneticSaturation": 1.85}
    ],
    "optimalProfile": "profile-2",
    "microstructurePrediction": "Fine grain structure expected with minimal porosity"
  }
}`,
  },
  controller: {
    systemPrompt: `You are ADAM's Controller Agent. Manage hardware fleet and dispatch print jobs.`,
    userPromptTemplate: (hypothesis: string) => `Dispatch jobs for experiment.
Select optimal printer and queue jobs.`,
    mockResponse: `{
  "dispatch": {
    "selectedPrinter": "X25Pro-03",
    "printerStatus": "idle",
    "queuedJobs": 12,
    "estimatedCompletion": "4.2 hours"
  },
  "jobIds": ["JOB-001", "JOB-002", "JOB-003"]
}`,
  },
  analyzer: {
    systemPrompt: `You are ADAM's Analyzer Agent. Analyze experimental results and generate insights.`,
    userPromptTemplate: (hypothesis: string) => `Analyze simulation results and provide recommendations.
Hypothesis: ${hypothesis}`,
    mockResponse: `{
  "analysis": {
    "hypothesisValidation": "Partially supported",
    "keyFindings": [
      "60:40 Fe:Co ratio shows optimal balance",
      "Binder saturation of 60% yields best density",
      "Achieved 85% of NdFeB baseline performance"
    ],
    "recommendations": [
      "Increase Co content to 45% in next iteration",
      "Test lower sintering temperatures"
    ],
    "confidenceScore": 0.87
  }
}`,
  },
};

// Provider determination based on model
function getProvider(model: string): 'openai' | 'gemini' | 'anthropic' {
  if (model.startsWith('gpt') || model.startsWith('o1')) return 'openai';
  if (model.startsWith('gemini')) return 'gemini';
  if (model.startsWith('claude')) return 'anthropic';
  return 'openai';
}

// Simulate API call with realistic timing
async function simulateAPICall(
  tracker: TokenTracker,
  agent: string,
  operation: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  mockResponse: string
): Promise<void> {
  const startTime = Date.now();

  // Simulate network latency (100-500ms) + processing time (500-2000ms)
  const latency = Math.random() * 400 + 100;
  const processing = Math.random() * 1500 + 500;
  await new Promise(resolve => setTimeout(resolve, latency + processing));

  const durationMs = Date.now() - startTime;
  const inputText = systemPrompt + '\n' + userPrompt;

  tracker.recordCall({
    model,
    provider: getProvider(model),
    agent,
    operation,
    inputText,
    outputText: mockResponse,
    durationMs,
    success: true,
  });

  console.log(`  ✓ ${agent}::${operation} (${model}) - ${durationMs}ms`);
}

// Make real API call using OpenAI
async function makeOpenAICall(
  tracker: TokenTracker,
  agent: string,
  operation: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const startTime = Date.now();

  try {
    // Dynamic import to avoid issues if OpenAI is not installed
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const durationMs = Date.now() - startTime;
    const outputText = response.choices[0]?.message?.content || '';

    tracker.recordCall({
      model,
      provider: 'openai',
      agent,
      operation,
      inputText: systemPrompt + '\n' + userPrompt,
      outputText,
      durationMs,
      success: true,
      actualUsage: response.usage ? {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    });

    console.log(`  ✓ ${agent}::${operation} (${model}) - ${durationMs}ms - ${response.usage?.total_tokens} tokens`);
    return outputText;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    tracker.recordCall({
      model,
      provider: 'openai',
      agent,
      operation,
      inputText: systemPrompt + '\n' + userPrompt,
      outputText: '',
      durationMs,
      success: false,
      error: error.message,
    });
    console.log(`  ✗ ${agent}::${operation} FAILED: ${error.message}`);
    throw error;
  }
}

// Make real API call using Gemini
async function makeGeminiCall(
  tracker: TokenTracker,
  agent: string,
  operation: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const startTime = Date.now();

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const geminiModel = genAI.getGenerativeModel({ model });

    const result = await geminiModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2000,
      },
    });

    const durationMs = Date.now() - startTime;
    const outputText = result.response.text();

    tracker.recordCall({
      model,
      provider: 'gemini',
      agent,
      operation,
      inputText: systemPrompt + '\n' + userPrompt,
      outputText,
      durationMs,
      success: true,
    });

    console.log(`  ✓ ${agent}::${operation} (${model}) - ${durationMs}ms`);
    return outputText;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    tracker.recordCall({
      model,
      provider: 'gemini',
      agent,
      operation,
      inputText: systemPrompt + '\n' + userPrompt,
      outputText: '',
      durationMs,
      success: false,
      error: error.message,
    });
    console.log(`  ✗ ${agent}::${operation} FAILED: ${error.message}`);
    throw error;
  }
}

// Run the full workflow test
async function runWorkflowTest(config: TestConfig = DEFAULT_CONFIG): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║              ADAM AGENTIC WORKFLOW TEST                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  console.log(`Mode: ${config.useRealAPIs ? 'REAL API CALLS' : 'SIMULATED'}`);
  console.log(`Hypothesis: ${config.hypothesis}\n`);

  const tracker = new TokenTracker(`test-${Date.now()}`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('WORKFLOW EXECUTION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const agents = ['planning', 'design', 'simulation', 'controller', 'analyzer'] as const;

  for (const agent of agents) {
    console.log(`\n▶ ${agent.toUpperCase()} AGENT`);

    const sim = AGENT_SIMULATIONS[agent];
    const model = config.models[agent];
    const userPrompt = sim.userPromptTemplate(config.hypothesis);

    if (config.useRealAPIs) {
      const provider = getProvider(model);
      try {
        if (provider === 'openai' && process.env.OPENAI_API_KEY) {
          await makeOpenAICall(tracker, agent, 'execute', model, sim.systemPrompt, userPrompt);
        } else if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
          await makeGeminiCall(tracker, agent, 'execute', model, sim.systemPrompt, userPrompt);
        } else {
          console.log(`  ⚠ No API key for ${provider}, using simulation`);
          await simulateAPICall(tracker, agent, 'execute', model, sim.systemPrompt, userPrompt, sim.mockResponse);
        }
      } catch (error) {
        console.log(`  ⚠ API call failed, using simulation fallback`);
        await simulateAPICall(tracker, agent, 'execute', model, sim.systemPrompt, userPrompt, sim.mockResponse);
      }
    } else {
      await simulateAPICall(tracker, agent, 'execute', model, sim.systemPrompt, userPrompt, sim.mockResponse);
    }
  }

  console.log('\n');

  // Generate and print report
  const report = tracker.generateReport();
  console.log(report);

  // Save report to file
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportsDir, `workflow-report-${timestamp}.txt`);
  const jsonPath = path.join(reportsDir, `workflow-report-${timestamp}.json`);

  fs.writeFileSync(reportPath, report);
  fs.writeFileSync(jsonPath, tracker.toJSON());

  console.log(`\n📄 Reports saved to:`);
  console.log(`   ${reportPath}`);
  console.log(`   ${jsonPath}`);
}

// Cost projection for different scenarios
function printCostProjections(): void {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                    COST PROJECTIONS                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // Assume typical token usage per workflow
  const avgInputTokens = 2500; // per agent
  const avgOutputTokens = 1500; // per agent
  const agentCount = 5;

  const scenarios = [
    { name: 'Budget (GPT-4o-mini + Gemini Flash)', models: ['gpt-4o-mini', 'gemini-1.5-flash'] },
    { name: 'Standard (GPT-4o)', models: ['gpt-4o'] },
    { name: 'Premium (GPT-4 + Claude 3.5 Sonnet)', models: ['gpt-4', 'claude-3.5-sonnet'] },
    { name: 'Free Tier (Gemini 2.0 Flash)', models: ['gemini-2.0-flash-exp'] },
  ];

  console.log('Per-Workflow Cost Estimates (5 agents):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const scenario of scenarios) {
    let totalCost = 0;
    for (const model of scenario.models) {
      const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4o-mini'];
      const inputCost = (avgInputTokens * agentCount / 1000) * pricing.inputPer1k;
      const outputCost = (avgOutputTokens * agentCount / 1000) * pricing.outputPer1k;
      totalCost += inputCost + outputCost;
    }
    totalCost /= scenario.models.length; // Average if multiple models

    console.log(`  ${scenario.name}`);
    console.log(`    Per workflow:    $${totalCost.toFixed(4)}`);
    console.log(`    10 experiments:  $${(totalCost * 10).toFixed(4)}`);
    console.log(`    100 experiments: $${(totalCost * 100).toFixed(4)}`);
    console.log(`    1000 experiments: $${(totalCost * 1000).toFixed(2)}`);
    console.log('');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--real')) {
    DEFAULT_CONFIG.useRealAPIs = true;
  }

  if (args.includes('--projections')) {
    printCostProjections();
    return;
  }

  if (args.includes('--help')) {
    console.log(`
ADAM Workflow Analysis Tool

Usage:
  npx ts-node tests/workflow-analysis/runWorkflowTest.ts [options]

Options:
  --real         Make real API calls (requires API keys)
  --projections  Show cost projections only
  --help         Show this help message

Environment Variables:
  OPENAI_API_KEY   OpenAI API key for GPT models
  GEMINI_API_KEY   Google API key for Gemini models

Examples:
  # Run simulated workflow
  npx ts-node tests/workflow-analysis/runWorkflowTest.ts

  # Run with real API calls
  OPENAI_API_KEY=xxx npx ts-node tests/workflow-analysis/runWorkflowTest.ts --real

  # Show cost projections
  npx ts-node tests/workflow-analysis/runWorkflowTest.ts --projections
`);
    return;
  }

  await runWorkflowTest(DEFAULT_CONFIG);
  printCostProjections();
}

main().catch(console.error);
