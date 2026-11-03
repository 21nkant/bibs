// One function builds the full model call (model, prompt, tools, limits). The chat route passes it
// to streamText and the evals pass the very same object to generateText, so what we evaluate is
// what we ship.
import { anthropic } from "@ai-sdk/anthropic";
import { isStepCount } from "ai";
import type { Profile } from "@/lib/types";
import { AGENT_MODEL, ANTHROPIC_OPTIONS, LIMITS, type AgentModelId } from "./config";
import { buildInstructions } from "./prompt";
import { makeTools, type AgentData } from "./tools";

export function bibsAgent({
  userId,
  profile,
  data,
  now,
  modelId = AGENT_MODEL,
}: {
  userId: string;
  profile: Profile;
  data: AgentData;
  now: Date;
  modelId?: AgentModelId;
}) {
  return {
    model: anthropic(modelId),
    instructions: buildInstructions({ profile, now }),
    tools: makeTools({ userId, data, now }),
    stopWhen: isStepCount(LIMITS.maxSteps),
    maxOutputTokens: LIMITS.maxOutputTokens,
    providerOptions: { anthropic: ANTHROPIC_OPTIONS },
  };
}
