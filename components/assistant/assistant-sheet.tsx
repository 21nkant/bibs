"use client";

// "Ask Bibs": a floating pill that opens a bottom sheet chat. The assistant can only read and
// propose; game cards come from tool outputs and the human taps "Hold my spot" to join.
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import clsx from "clsx";
import { ArrowUp, Sparkles, Square, X } from "lucide-react";
import { AnimatePresence, motion, MotionConfig, useDragControls } from "motion/react";
import { ASK_EVENT } from "./ask-event";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LIMITS } from "@/lib/agent/config";
import type { AgentGame } from "@/lib/agent/game";
import type { BibsUIMessage } from "@/lib/agent/ui";
import { AssistantGameCard } from "./game-card";
import { isBibsToolPart, StepTrail } from "./step-trail";

const SUGGESTIONS = [
  "Thursday night in Brooklyn, under lights",
  "Anything this weekend at my level?",
  "What am I playing this week?",
];
const VISIBLE_CARDS = 3;
const spring = { type: "spring", damping: 32, stiffness: 340, mass: 0.9 } as const;

const transport = new DefaultChatTransport<BibsUIMessage>({
  api: "/api/chat",
  // The server only uses the last N messages; don't upload more than that.
  prepareSendMessagesRequest: ({ id, messages }) => ({ body: { id, messages: messages.slice(-LIMITS.historyMessages) } }),
});

// ---- message rendering ---------------------------------------------------------------------

// **bold** -> <strong>; everything else stays plain text (no HTML from the model, ever).
function InlineText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*\n]+\*\*)/g).map((chunk, i) =>
        chunk.startsWith("**") && chunk.endsWith("**") ? (
          <strong key={i} className="font-semibold text-ink">
            {chunk.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{chunk}</Fragment>
        ),
      )}
    </>
  );
}

type Card = { game: AgentGame; proposed: boolean };

// Cards come only from tool outputs. propose_booking cards lead; the rest are de-duplicated by id.
// The reply decides emphasis (games it names are shown first), the tool data decides the content.
function collectCards(message: BibsUIMessage, text: string): { shown: Card[]; more: Card[] } {
  const byId = new Map<string, Card>();
  for (const part of message.parts) {
    if (part.type === "tool-propose_booking" && part.state === "output-available") {
      byId.set(part.output.game.id, { game: part.output.game, proposed: true });
    }
  }
  const add = (game: AgentGame) => {
    if (!byId.has(game.id)) byId.set(game.id, { game, proposed: false });
  };
  for (const part of message.parts) {
    if ((part.type === "tool-search_games" || part.type === "tool-get_my_games") && part.state === "output-available") {
      part.output.games.forEach(add);
    }
    if (part.type === "tool-get_game" && part.state === "output-available") add(part.output.game);
  }
  const cards = [...byId.values()];
  const lower = text.toLowerCase();
  const named = (c: Card) => lower.includes(c.game.title.toLowerCase());
  const proposed = cards.filter((c) => c.proposed);
  const rest = cards.filter((c) => !c.proposed).sort((a, b) => a.game.startsAt.localeCompare(b.game.startsAt));
  const lead = rest.some(named) ? rest.filter(named) : proposed.length ? [] : rest.slice(0, VISIBLE_CARDS);
  return { shown: [...proposed, ...lead], more: rest.filter((c) => !lead.includes(c)) };
}

function AssistantTurn({ message, onNavigate }: { message: BibsUIMessage; onNavigate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const toolParts = message.parts.filter(isBibsToolPart);
  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const { shown, more } = useMemo(() => collectCards(message, text), [message, text]);
  const cards = expanded ? [...shown, ...more] : shown;

  return (
    <div className="max-w-full">
      <StepTrail parts={toolParts} />
      {text ? (
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink/90">
          <InlineText text={text} />
        </p>
      ) : null}
      {cards.length ? (
        <div className="mt-3 space-y-2.5">
          {cards.map((c) => (
            <AssistantGameCard key={c.game.id} game={c.game} highlighted={c.proposed} onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}
      {more.length && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-[13px] font-medium text-ink-2 underline decoration-line underline-offset-4 hover:text-ink"
        >
          {more.length} more from the search
        </button>
      ) : null}
    </div>
  );
}

function UserTurn({ message }: { message: BibsUIMessage }) {
  const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap rounded-lg rounded-br-sm bg-ink px-3.5 py-2 text-[15px] leading-snug text-paper">
        {text}
      </p>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Bibs is thinking" role="status">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-ink/60"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

// ---- sheet -----------------------------------------------------------------------------------

export function AssistantSheet() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragControls = useDragControls();

  const { messages, sendMessage, status, error, stop, clearError, setMessages } = useChat<BibsUIMessage>({ transport });
  const busy = status === "submitted" || status === "streaming";

  // The "Ask" tab in the tab bar opens the sheet (no floating button covering page content).
  useEffect(() => {
    const onAsk = () => setOpen(true);
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, []);

  // Lock page scroll, close on Escape, focus the composer.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 250);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  // Keep the newest content in view while streaming.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  function send(text: string) {
    const t = text.trim();
    if (!t || busy || t.length > LIMITS.maxInputChars) return;
    if (error) clearError();
    void sendMessage({ text: t });
    setInput("");
  }

  const close = () => setOpen(false);
  const remaining = LIMITS.maxInputChars - input.length;
  const last = messages.at(-1);
  const waiting = status === "submitted" || (status === "streaming" && (!last || last.role !== "assistant" || last.parts.length === 0));

  let body: ReactNode;
  if (messages.length === 0) {
    body = (
      <div className="flex h-full flex-col justify-end pb-2">
        <p className="font-display text-2xl font-medium tracking-[-0.02em]">Find a fair game.</p>
        <p className="mt-1 text-[15px] text-ink-2">
          Ask in your own words. I&apos;ll search, show you games, and you tap to hold a spot.
        </p>
        <div className="mt-5 flex flex-col items-start gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border border-line bg-paper px-3.5 py-2 text-left text-[14px] text-ink/90 transition hover:border-ink/25 active:scale-[0.98]"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  } else {
    body = (
      <div className="space-y-5 pb-2">
        {messages.map((m) =>
          m.role === "user" ? <UserTurn key={m.id} message={m} /> : <AssistantTurn key={m.id} message={m} onNavigate={close} />,
        )}
        {waiting ? <Thinking /> : null}
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              aria-hidden
            />
            <motion.section
              key="sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Ask Bibs"
              className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[86dvh] w-full max-w-lg flex-col rounded-t-xl border border-b-0 border-line bg-card font-sans"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={spring}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 700) close();
              }}
            >
              {/* Header (drag handle) */}
              <header
                className="relative shrink-0 cursor-grab touch-none rounded-t-xl px-4 pt-2.5 pb-3 active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-ink/20" aria-hidden />
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-lg font-medium tracking-[-0.02em]">
                    <Sparkles className="size-4 text-accent" aria-hidden /> Ask Bibs
                  </h2>
                  <div className="flex items-center gap-1">
                    {messages.length ? (
                      <button
                        type="button"
                        onClick={() => {
                          stop();
                          setMessages([]);
                          clearError();
                        }}
                        className="rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"
                      >
                        New chat
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={close}
                      className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-paper hover:text-ink"
                      aria-label="Close"
                    >
                      <X className="size-5" aria-hidden />
                    </button>
                  </div>
                </div>
              </header>

              {/* Messages */}
              <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2">
                {body}
              </div>

              {/* Error */}
              {error ? (
                <div className="mx-4 mb-2 flex items-start justify-between gap-3 rounded-xl border border-down/30 bg-down/10 px-3 py-2 text-[13px] text-ink/90" role="alert">
                  <span>{error.message || "Something went wrong. Try again."}</span>
                  <button type="button" onClick={clearError} className="shrink-0 font-medium text-ink-2 hover:text-ink">
                    Dismiss
                  </button>
                </div>
              ) : null}

              {/* Composer */}
              <form
                className="shrink-0 border-t border-line px-3 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
              >
                <div className="flex items-end gap-2 rounded-xl border border-line bg-paper px-3 py-2 focus-within:border-ink/25">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        send(input);
                      }
                    }}
                    rows={1}
                    maxLength={LIMITS.maxInputChars}
                    placeholder="Ask for a game, a day, a borough…"
                    aria-label="Message Ask Bibs"
                    className="max-h-28 min-h-6 flex-1 resize-none bg-transparent py-1 text-[16px] leading-6 text-ink outline-none placeholder:text-ink-2/80 [field-sizing:content]"
                  />
                  {busy ? (
                    <button
                      type="button"
                      onClick={stop}
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-ink/10 text-ink"
                      aria-label="Stop"
                    >
                      <Square className="size-3.5 fill-current" aria-hidden />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="grid size-9 shrink-0 place-items-center rounded-[3px] bg-ink text-paper transition active:scale-95 disabled:bg-ink/10 disabled:text-ink-2"
                      aria-label="Send"
                    >
                      <ArrowUp className="size-4.5" aria-hidden />
                    </button>
                  )}
                </div>
                <p className={clsx("mt-1.5 px-1 text-[11px] text-ink-2", remaining > 80 && "invisible")} aria-live="polite">
                  {remaining} characters left
                </p>
              </form>
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}
