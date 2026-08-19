# Tegmento

A self-hosted life journal you talk to. It runs on your own machine, with your
own model, and nothing leaves it.

> **A code snapshot.** This repository is the current state of a private
> project, published as a single commit so the code can be read. It isn't the
> working repo: there's no history here, and the working notes, design
> documents and product strategy are deliberately not included. Neither are the
> two paid modules (finances and food), which stay in the private repo — the
> nav entries that pointed at them are gone with them.

## What it is

The home screen is a chat. You write what happened — *"I spent 5.70 at the
pool"*, *"I slept badly again"*, *"finished the German homework"* — and the app
files it: expenses, activities, mood, notes, goals. Nothing is a form you have
to fill in.

Around that chat there are sections for the parts that need their own shape: a
wheel of life used as a diagnosis, goals with their closing ritual, activities
by month, food, finances, notes, and a review of what you wrote weeks ago.

**The thesis it's built on:** a plan exists to take a question off your hands,
not to grade you. The app never tells you you're "3 out of 7" on anything. That
one decision is why there are no streak counters shaming you, no completion
percentages, and why the assistant asks rather than announces.

## Why it's local

The whole point is that a life journal holds the things you wouldn't put in
someone else's database. So:

- The model is **Ollama on your own machine**. No API calls to anyone.
- Storage is **one SQLite file** you can copy, back up, or delete.
- Access is a **PIN** and a signed cookie — see `.env.example`.
- The Google tokens (Calendar and Gmail, read-only) are **encrypted on disk**
  with a master key: `src/lib/cifrado.ts`.

Getting to it from a phone is done over [Tailscale](https://tailscale.com),
inside your own tailnet — never by opening a port to the internet.

## Running it

```bash
cp .env.example .env.local     # pick your own PIN and session secret
npm install
npm run db:push                # creates the SQLite schema
npm run app                    # web + background worker
```

Needs Node 22 and Ollama running locally. Then <http://localhost:3000>.

⚠️ **`db:push` isn't optional.** Editing `src/lib/db/schema.ts` without applying
it to the database breaks the app at runtime while typecheck, tests and build
all still pass — the three of them never touch the real database.

## How it's put together

| Layer | What's there |
|---|---|
| `src/app` | Next.js 15 App Router — the chat is the home route |
| `src/components` | The UI, one folder per section |
| `src/lib` | The logic worth reading: text → structured facts, goals, spaced re-reading, encryption |
| `prompts/` | One markdown file per job the model does — classifier, chronicler, analyst, assistant… |
| `src/worker.ts` | Background jobs (Google sync, digestion) |
| `tests/` | ~1270 tests. The `tests/integracion` ones skip unless a database is present |
| `ios/`, `capacitor.config.ts` | A Capacitor shell that loads the app running on the Mac |

The model is asked for **language**, never for arithmetic or state: what it
returns is parsed and validated before anything is written. That split is the
reason most of the logic in `src/lib` is plain, testable TypeScript with no LLM
in the loop.

## Testing

```bash
npm test           # ~1270 unit tests, no database needed
npx tsc --noEmit
npm run build:check
```

The integration tests under `tests/integracion` run against a scratch database
and refuse to touch the real one — the guard exists because they once wrote
three test expenses into a live account.

---

© Matías Biase. All rights reserved. Published for reading, not licensed for
reuse.
