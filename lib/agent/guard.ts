// Validates and narrows what the client sends to /api/chat before anything reaches the model.
// The client owns the transcript, so treat all of it as untrusted input.
import { safeValidateUIMessages, type ToolSet } from "ai";
import { LIMITS } from "./config";
import type { BibsUIMessage } from "./ui";

export type ChatRequest = { ok: true; messages: BibsUIMessage[] } | { ok: false; status: number; message: string };

const fail = (status: number, message: string): ChatRequest => ({ ok: false, status, message });
const TOOL_PARTS = new Set(["tool-search_games", "tool-get_game", "tool-get_my_games", "tool-propose_booking"]);
const textOf = (m: BibsUIMessage) =>
  m.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();

export async function parseChatRequest(body: unknown, tools: ToolSet): Promise<ChatRequest> {
  const raw = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(raw) || raw.length === 0) return fail(400, "Send a message to get started.");

  // Only the most recent messages are ever sent to the model (cost + context bound).
  const validated = await safeValidateUIMessages<BibsUIMessage>({ messages: raw.slice(-LIMITS.historyMessages), tools });
  if (!validated.success) return fail(400, "That conversation couldn't be read. Start a new one and try again.");

  const messages = validated.data
    // System instructions come from the server only; a client-sent system turn is dropped.
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      ...m,
      // Users send text. Assistant history keeps text + our own tool parts; reasoning parts are dropped
      // so forged or stale thinking blocks never round-trip to the model.
      parts: m.parts.filter((p) =>
        m.role === "user" ? p.type === "text" : p.type === "text" || p.type === "step-start" || TOOL_PARTS.has(p.type),
      ),
    }));
  while (messages.length && messages[0].role !== "user") messages.shift(); // window must open on a user turn

  const last = messages.at(-1);
  if (!last || last.role !== "user" || !textOf(last)) return fail(400, "Send a message to get started.");
  if (messages.some((m) => m.role === "user" && textOf(m).length > LIMITS.maxInputChars)) {
    return fail(413, `Keep messages under ${LIMITS.maxInputChars} characters.`);
  }
  return { ok: true, messages };
}
