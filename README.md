# Bibs — pickup soccer that's actually fair

**Live:** https://bibs-pearl.vercel.app · tap **Try as Alex** (organizer) or **Try as Sam** (new player). No sign-up needed.

I play pickup in NYC. The apps that exist are good at *filling* games, but the games themselves are often lopsided. Their reviews say the same thing over and over: a beginner ends up in an advanced run, ratings never change, a game ends up with 22 people for 20 spots, and teams get picked by whoever showed up first. Bibs is built around **fair games, not just filled games.**

## What works

| | |
|---|---|
| **Auth** | Supabase email + password sign-up and log-in, plus one-tap demo accounts. Sign-up asks for position and level, and your level sets your starting rating (1000 / 1200 / 1400). |
| **Real NYC fields** | All 368 active NYC Parks soccer fields (NYC Open Data `qnem-b8re`, park names joined from `enfh-gkve`), including which ones have lights. |
| **Browse + filter** | Borough, tonight / this week, lights only, my level. Games outside your rating range still show, dimmed, with the reason. |
| **Join / leave rules** (server-enforced, one transaction, game row locked `FOR UPDATE`) | Rating must be inside the game's range. You can't be in two overlapping games. You can't join after a game locks or starts. A full game puts you on the **waitlist**, and when someone leaves, the next eligible person is **promoted in the same transaction** (promotion re-checks range and overlap). Two people tapping the last spot can't both get it (tested). |
| **Balanced teams** | When the organizer locks the game, the app tries every split of the roster (1,716 for 14 players), puts one goalkeeper on each team, and picks the closest. The UI shows the sign-up-order split it replaced. On tonight's demo game that's 81/19 → 49/51. |
| **Results → ratings** | The organizer enters the score once (a second entry is blocked). Every player's rating updates in one transaction using team Elo, with bigger swings while you're provisional (fewer than 5 games). |
| **Ask Bibs (AI assistant)** | "Thursday night in Brooklyn, under lights" → it searches with tools → real game cards → **Hold my spot**. See below. |

## The AI assistant: how it's kept safe

- **The model has no write access.** Its tools are `search_games`, `get_game`, `get_my_games` and `propose_booking`. The last one only returns a card. Booking happens when *you* tap **Hold my spot**, which calls the same server action as the Join button, so every rule above still applies.
- **Identity comes from the session**, never from the model. Tools are built per request as `makeTools({ userId })`.
- **Cards are rendered from tool output**, not parsed from model text, so it can't show a game that doesn't exist.
- **Prompt-injection surface is minimized.** Organizer notes never reach the model. Titles do, and they're treated as data. One seeded game carries an injection attempt, and an eval checks that it's ignored.
- **Cost limits:** 5 tool steps, an output-token cap, the last 10 messages only, 500-character inputs and 30 messages per user per day.

## Evals

`npm run eval` runs 13 code-graded cases (no LLM judge) against fixture data with a fixed "now", through the same prompt, tools and limits as production. Categories: filter extraction, grounding, safety/injection and agentic widening. 8 more guardrail checks run without the model.

| model | cases | safety | avg latency | cost per run |
|---|---|---|---|---|
| Haiku 5.5 | 13/13 | 5/5 | 2.9s | $0.008 |
| Sonnet 5.5 | 13/13 | 5/5 | 3.6s | $0.140 |

Both models passed every case in the final run, and Haiku passed every safety case in all four runs, so **production uses Haiku**: same quality here, about 18× cheaper and faster. Across the four runs both models missed one or two cases (truncated replies, wording). Thirteen cases is a small sample, and the next step is more cases built from real conversations. Details per case: [`evals/RESULTS.md`](evals/RESULTS.md).

## How it was tested

- **27 tests** (`npm test`): Elo and balancer unit tests, plus integration tests against the real database. They cover two simultaneous joins for the last spot, waitlist promotion, overlap, out-of-range, double result submission and rating direction.
- **Live QA pass** on the deployed site, at 390px and 1440px, as a sign-up user, Sam and Alex. It found three real bugs, all fixed:
  - waitlist promotion ignored the overlap rule (a regression test was added);
  - the assistant offered games that clash with yours;
  - the assistant forgot a "Hold my spot" result after the sheet closed.
- **Load:** a DB hang under concurrent queries (postgres-js pipelining through Supabase's transaction pooler) was reproduced and fixed. 30 parallel queries went from hanging for more than 10 s to 0.6 s.

## What's incomplete / cut on purpose

- **Payments, chat, maps, notifications, peer ratings**: each one is a big build and none of them makes a game fairer. Cut for the 2-hour box.
- **Booking the field itself**: NYC Parks fields can't be reserved without a city permit, so Bibs books *spots in a game* and labels every game **Open play / Permit held / Rented**.
- **No-show / reliability score**: designed, not built.
- **Create-a-game form**: games are seeded, and a cron (`/api/cron/reseed`) refreshes them nightly so the demo always has games "tonight". New accounts can join games but can't organize one. Use **Try as Alex** to see lock & balance and results.
- **Results before kickoff**: the organizer can enter a score as soon as teams are locked, so the demo doesn't have to wait for 9 PM. A real version would only open result entry after the game ends.
- **Shared demo accounts**: anyone can tap Alex or Sam, so the demo state can drift during the day. The nightly reseed resets it.
- **Small gaps**: an unknown game URL shows the friendly not-found page but returns HTTP 200 (streamed under a loading boundary). There's no password reset.

## Run it locally

```bash
npm install
cp .env.example .env.local   # Supabase + Anthropic keys
npm run db:push              # create tables
npx tsx --env-file=.env.local scripts/rls.ts   # lock tables from the public REST API
npm run seed                 # 368 NYC fields, 28 demo players, 18 games
npm run dev                  # http://localhost:3000
npm test                     # engine + service tests (service tests hit the DB)
npm run eval                 # assistant evals (Anthropic API)
```

## How it's built

Next.js 16 (App Router) · TypeScript · Supabase (Postgres + Auth) · Drizzle · Zod · Vercel AI SDK 7 + Claude · Motion · Vitest · Vercel.

```
lib/engine    pure functions: Elo, team balancer (no DB, unit-tested)
lib/service   the only code that writes; every rule lives here, in transactions
app/actions   thin server actions: session → service
lib/agent     assistant tools + prompt; tools call lib/service reads
evals/        fixture-based, code-graded evals
```

Built in a 2-hour timebox (start commit `49c5b7f` at 10:07 ET; see the commit history) with Claude Code. The shared contract (`lib/types.ts`, the `lib/service` signatures and the schema) was written first. Then three agents worked in parallel against it: UI, the rules engine with its tests, and the assistant with its evals. A fourth agent ran the live QA pass. My job was the product calls: what to build, what to cut, the rules, what "fair" means, the design direction and reviewing what came back.
