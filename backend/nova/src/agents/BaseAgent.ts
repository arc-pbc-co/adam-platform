import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentResponse, AgentConfig, ExperimentContext } from '../types';
import { logger } from '../utils/logger';

export abstract class BaseAgent<TInput = any, TOutput = any> {
  protected config: AgentConfig;
  protected openai?: OpenAI;
  protected gemini?: GoogleGenerativeAI;

  constructor(config: AgentConfig) {
    this.config = config;

    // Initialize AI providers
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    if (process.env.GEMINI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    if (!this.openai && !this.gemini) {
      throw new Error('No AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY');
    }
  }

  /**
   * Execute the agent's primary task
   */
  abstract execute(
    context: ExperimentContext,
    input: TInput
  ): Promise<AgentResponse<TOutput>>;

  /**
   * Get the agent's system prompt
   */
  protected abstract getSystemPrompt(): string;

  /**
   * Format the user prompt based on context and input
   */
  protected abstract formatUserPrompt(
    context: ExperimentContext,
    input: TInput
  ): string;

  /**
   * Parse the AI response into structured output
   */
  protected abstract parseResponse(response: string): TOutput;

  /**
   * Call the AI provider with retry logic
   */
  protected async callAI(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.config.retries) {
      try {
        attempt++;

        if (this.openai) {
          const response = await this.openai.chat.completions.create({
            model: this.config.model,
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new Error('Empty response from OpenAI');
          }

          logger.info(`${this.config.name} completed`, {
            durationMs: Date.now() - startTime,
            tokensUsed: response.usage?.total_tokens,
            attempt,
          });

          return content;
        } else if (this.gemini) {
          const model = this.gemini.getGenerativeModel({
            model: this.config.model,
          });

          const result = await model.generateContent({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: `${systemPrompt}\n\n${userPrompt}` },
                ],
              },
            ],
            generationConfig: {
              temperature: this.config.temperature,
              maxOutputTokens: this.config.maxTokens,
            },
          });

          const content = result.response.text();
          if (!content) {
            throw new Error('Empty response from Gemini');
          }

          logger.info(`${this.config.name} completed`, {
            durationMs: Date.now() - startTime,
            attempt,
          });

          return content;
        }

        throw new Error('No AI provider available');
      } catch (error: any) {
        lastError = error;
        logger.warn(`${this.config.name} attempt ${attempt} failed`, {
          error: error.message,
        });

        if (attempt < this.config.retries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `${this.config.name} failed after ${this.config.retries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Wrapper to execute with error handling and metrics
   */
  async run(
    context: ExperimentContext,
    input: TInput
  ): Promise<AgentResponse<TOutput>> {
    const startTime = Date.now();

    try {
      logger.info(`${this.config.name} starting`, {
        experimentId: context.experimentId,
      });

      const response = await this.execute(context, input);

      return {
        ...response,
        metadata: {
          ...response.metadata,
          agent: this.config.name,
          timestamp: new Date(),
          durationMs: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      logger.error(`${this.config.name} failed`, {
        experimentId: context.experimentId,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message,
        metadata: {
          agent: this.config.name,
          timestamp: new Date(),
          durationMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Validate context before execution
   */
  protected validateContext(context: ExperimentContext): void {
    if (!context.experimentId) {
      throw new Error('Experiment ID is required');
    }
    if (!context.hypothesis) {
      throw new Error('Hypothesis is required');
    }
    if (!context.objective) {
      throw new Error('Objective is required');
    }
  }

  /**
   * Extract JSON from AI response (handles markdown code blocks and malformed responses)
   */
  protected extractJSON(response: string): any {
    // Try to find JSON in markdown code blocks (object or array)
    const jsonBlockMatch = response.match(/```(?:json)?\s*([\[{][\s\S]*?[\]}])\s*```/);
    if (jsonBlockMatch) {
      try {
        return JSON.parse(jsonBlockMatch[1]);
      } catch {
        // Continue to other methods
      }
    }

    // Try to find JSON array first (starts with [)
    const arrayStart = response.indexOf('[');
    const arrayEnd = response.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayStart < arrayEnd) {
      const jsonStr = response.substring(arrayStart, arrayEnd + 1);
      try {
        return JSON.parse(jsonStr);
      } catch {
        // Try cleaned version
        const cleaned = jsonStr
          .replace(/,\s*]/g, ']')
          .replace(/,\s*}/g, '}');
        try {
          return JSON.parse(cleaned);
        } catch {
          // Continue to object extraction
        }
      }
    }

    // Try to find JSON object
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonStr = response.substring(jsonStart, jsonEnd + 1);
      try {
        return JSON.parse(jsonStr);
      } catch {
        // Try to clean up common JSON issues
        const cleaned = jsonStr
          .replace(/,\s*}/g, '}')  // Remove trailing commas
          .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
          .replace(/[\r\n]+/g, ' ') // Replace newlines with spaces
          .replace(/\s+/g, ' ');    // Normalize whitespace
        return JSON.parse(cleaned);
      }
    }

    throw new Error('No JSON found in response');
  }
}
