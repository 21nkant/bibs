// POST /api/chat — the "Ask Bibs" assistant. Streams a UI message stream for useChat.
// Order matters: identity -> body size -> profile -> message validation -> daily cap -> model.
// Bad requests never burn the user's daily quota.
import { convertToModelMessages, createUIMessageStreamResponse, streamText, toUIMessageStream } from "ai";
import { bibsAgent } from "@/lib/agent/agent";
import { LIMITS } from "@/lib/agent/config";
import { parseChatRequest } from "@/lib/agent/guard";
import { consumeDailyMessage } from "@/lib/agent/usage";
import { getUserId } from "@/lib/auth";
import { getGame, getMyGames, getProfile, searchGames } from "@/lib/service";

export const runtime = "nodejs";
export const maxDuration = 30;

// Plain-text bodies: useChat surfaces the response body as `error.message`, so these are what the
// player sees.
const reply = (status: number, message: string) =>
  new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8" } });

export async function POST(req: Request) {
  const userId = await getUserId(); // verified session JWT; the only source of identity
  if (!userId) return reply(401, "Sign in to use Ask Bibs.");

  const raw = await req.text();
  if (raw.length > LIMITS.maxBodyBytes) return reply(413, "That conversation is too long. Start a new one.");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return reply(400, "That request couldn't be read.");
  }

  const profile = await getProfile(userId);
  if (!profile) return reply(403, "Finish setting up your profile to use Ask Bibs.");

  const now = new Date();
  const agent = bibsAgent({ userId, profile, now, data: { searchGames, getGame, getMyGames } });

  const parsed = await parseChatRequest(body, agent.tools);
  if (!parsed.ok) return reply(parsed.status, parsed.message);

  const quota = await consumeDailyMessage(userId, now);
  if (!quota.allowed) {
    return reply(429, `You've used all ${quota.limit} Ask Bibs messages for today. They reset at midnight; the Games tab still works in the meantime.`);
  }

  const result = streamText({
    ...agent,
    messages: await convertToModelMessages(parsed.messages, { tools: agent.tools, ignoreIncompleteToolCalls: true }),
    abortSignal: req.signal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      sendReasoning: false, // never ship thinking to the client (or back to us in the next request)
      onError: (error) => {
        console.error("[assistant] stream error", error);
        return "Ask Bibs hit a snag. Try again in a moment.";
      },
    }),
  });
}
