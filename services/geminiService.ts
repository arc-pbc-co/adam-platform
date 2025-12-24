import { GoogleGenAI } from "@google/genai";

const ADAM_SYSTEM_INSTRUCTION = `
You are ADAM (Autonomous Discovery and Advanced Manufacturing), the AI Orchestrator for Arc Impact.
Your role is to manage the end-to-end materials discovery and production loop using Desktop Metal binder jetting printers (Shop System, P-1, X25 Pro, X160 Pro).

Your capabilities include:
1.  **Hypothesis Generation:** Designing new material compositions (e.g., Rare-Earth-Free Magnets, NASICON electrolytes).
2.  **Experiment Planning:** Creating Design of Experiments (DOE) varying binder saturation, sintering temps, and layer thickness.
3.  **Execution:** dispatching jobs to the printer fleet and robotic handling systems.
4.  **Analysis:** Interpreting microstructure images, density data, and tensile tests.

Style Guide:
-   Speak with extreme precision, scientific authority, and brevity.
-   Use technical terms: "Binder Saturation", "Sintering Profile", "Green Density", "Microstructure", "Anisotropy".
-   When asked to design an experiment, output a structured JSON-like format for the parameters.
-   You are "Agentic AI". You don't just chat; you plan and execute.

Context to know:
-   Arc Impact acquired Desktop Metal.
-   We aim for < 2 weeks time-to-deployment for models.
-   We can run 100-200 experiments per week (vs 5-10 traditionally).
-   We use a Planner-Executor-Critic (PEC) loop.
`;

export const sendMessageToAdam = async (
  message: string,
  history: { role: string; parts: { text: string }[] }[]
): Promise<string> => {
  // Safe access to API Key accounting for browser environments
  const apiKey = typeof process !== 'undefined' ? process.env?.API_KEY : undefined;

  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    console.error("Critical: API Key is missing in sendMessageToAdam. User should have been gated.");
    return "ERROR: SYSTEM OFFLINE. API KEY MISSING. Please reload and authenticate.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const chat = ai.chats.create({
      model: 'gemini-2.0-flash-exp', // Updated to valid Gemini 2.0 model
      config: {
        systemInstruction: ADAM_SYSTEM_INSTRUCTION,
        temperature: 0.2, // Low temperature for precise, scientific responses
      },
      history: history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: h.parts
      }))
    });

    const result = await chat.sendMessage({ message });
    return result.text || "No response received from ADAM core.";
  } catch (error: any) {
    console.error("ADAM Core Error:", error);

    // Provide more specific error messages
    if (error?.message?.includes('API key')) {
      return "AUTHENTICATION FAILURE. Invalid or expired API key. Please reconnect.";
    } else if (error?.message?.includes('quota')) {
      return "RESOURCE LIMIT EXCEEDED. API quota exhausted. Please check billing.";
    } else if (error?.message?.includes('model')) {
      return "MODEL UNAVAILABLE. The AI core is temporarily offline. Try again later.";
    }

    return "CRITICAL FAILURE IN COGNITIVE CORE. The neural link was severed. Please check credentials or quota.";
  }
};