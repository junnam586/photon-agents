# iMessage Agents

Two AI-powered iMessage agents built with [Photon iMessage Kit](https://github.com/photon-hq/imessage-kit) and Claude.

No UI. No app. Just text.

---

## The Agents

### 🚀 Founder Pulse

**A cofounder in your texts that remembers everything and lets nothing slide.**

Text it what you're working on. It logs your updates, tracks your priorities, maintains your streak, and nudges you when you go quiet. Ask "how am I doing" and it reflects back your patterns — what you're shipping vs what you're avoiding.

**Example conversation:**
```
You:    gm
Pulse:  Morning. Day 12 streak 🔥 Your priorities are 
        MVP launch and user interviews. You haven't 
        mentioned interviews in 4 days. What's the 
        plan today?

You:    talked to 3 potential users about the contractor 
        marketplace idea. 2 said they'd pay for it
Pulse:  That's real signal — 2 out of 3 willing to pay 
        is strong. This connects directly to your MVP 
        priority. What's the next step to turn those 
        conversations into commits?

You:    how am I doing
Pulse:  Honest take: you've been consistent this week, 
        mostly focused on user research which is good. 
        But you've logged zero dev work in 6 days. If 
        the MVP is still priority #1, something needs 
        to shift.
```

**Commands:**
- `gm` — daily check-in, get priorities + nudge
- Any text — gets logged and connected to your goals
- `how am I doing` — honest progress reflection
- `set priority: [goal]` — add a priority
- `priorities` — see current priorities
- `clear priorities` — reset

---

### 🏋️ Iron Log

**A gym buddy that tracks every rep and calls you out when you skip leg day.**

Text your workout in plain english mid-set. It parses exercises, tracks PRs, notices trends, and tells you what to hit today based on your split. No app to open between sets — just text.

**Example conversation:**
```
You:    bench 185x5x3, incline db 60x10x3, cable flies 40x12x3
Iron:   Logged. Bench 185x5x3, incline DB 60s for 
        10x3, cable flies 40x12x3. Solid push day. 
        That bench is moving — 185 is a new PR 🔥

You:    what should I hit today
Iron:   It's Wednesday and you did push Monday, pull 
        Tuesday. Legs are up. You haven't squatted in 
        9 days. Time to fix that.

You:    how's my week
Iron:   3 sessions so far this week — push, pull, and 
        arms. No legs yet and it's already Wednesday. 
        You know what needs to happen.
```

**Commands:**
- Any workout text — parsed and logged (e.g. `squat 225 3x5`)
- `today` — what to train based on your split
- `week` — weekly summary
- `pr` / `prs` — see personal records
- `streak` — check gym streak
- `set split: [your split]` — define training split

---

## How It Works

```
You text → iMessage DB → Photon SDK picks it up → Claude processes 
with your stored context → Photon sends reply → appears in iMessage
```

Each agent is a single TypeScript file running locally on your Mac. Photon watches your iMessage database for new messages, sends them to Claude's API with your full history as context, and replies through iMessage. State persists in a local JSON file.

The agents share an identical skeleton — the only difference is the system prompt (personality + rules) and the shape of stored state (workouts vs priorities). Everything else is reused.

---

## Setup

**Requirements:**
- macOS
- [Bun](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`)
- Full Disk Access for your terminal (System Settings → Privacy & Security → Full Disk Access)
- [Anthropic API key](https://console.anthropic.com)

**Install:**
```bash
git clone https://github.com/YOUR_USERNAME/photon-agents.git
cd photon-agents
bun install
```

**Configure:**
```bash
cp .env.example .env
# Edit .env with your API key and phone number
```

**Run:**
```bash
# Start Founder Pulse
bun run founder-pulse

# Start Iron Log  
bun run iron-log
```

Then just text yourself (or the number running the agent). That's it.

---

## Architecture

```
imessage-agents/
├── shared/
│   ├── config.ts       ← env vars + validation
│   ├── claude.ts       ← Claude API wrapper (shared)
│   └── store.ts        ← JSON persistence (shared)
├── founder-pulse/
│   └── index.ts        ← agent logic + system prompt
├── iron-log/
│   └── index.ts        ← agent logic + system prompt
├── package.json
├── .env.example
└── README.md
```

The shared layer (`config`, `claude`, `store`) is identical for both agents. To build a new agent, you copy one `index.ts`, change the system prompt, and define a new state shape. Everything else stays the same.

---

## Why iMessage?

Nobody wants to open another app. But everyone texts.

These agents work because they meet you where you already are — in a conversation. You text your gym buddy between sets, not open a tracking app. You check in with a cofounder over text, not fill out a form. The best personal tools disappear into your existing habits.

---

Built with [Photon iMessage Kit](https://github.com/photon-hq/imessage-kit) and [Claude](https://anthropic.com).
