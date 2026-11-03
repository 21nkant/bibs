// Assistant configuration in one place. The route and the evals both read from here.
import type { AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";

export const MODELS = {
  haiku: "claude-haiku-5-5",
  sonnet: "claude-sonnet-5-5",
} as const;
export type AgentModelId = (typeof MODELS)[keyof typeof MODELS];

// Production model, chosen from the eval numbers (see evals/RESULTS.md).
export const AGENT_MODEL: AgentModelId = MODELS.haiku;

export const LIMITS = {
  maxSteps: 5, // tool-loop steps per reply (search, widen, propose, answer)
  // Per step. Thinking counts toward this limit, so it is the ~600-token reply budget plus headroom
  // for adaptive thinking (evals showed ~450 thinking tokens on broad searches truncating replies).
  // Reply length itself is held short by the prompt's reply format.
  maxOutputTokens: 1000,
  historyMessages: 10, // only the last N UI messages are sent to the model
  maxInputChars: 500, // per user message
  dailyMessages: 30, // per user per New York day (agent_usage table)
  maxBodyBytes: 200_000, // request body ceiling for /api/chat
} as const;

// Chat is latency-sensitive and the tasks are simple: low effort keeps thinking short.
// Top-level cache control lets later steps of the same reply reuse the tools+system prefix.
export const ANTHROPIC_OPTIONS = {
  effort: "low",
  cacheControl: { type: "ephemeral" },
} satisfies AnthropicLanguageModelOptions;
