# Photon Agents

Two AI-powered iMessage agents built with [Photon iMessage Kit](https://github.com/photon-hq/imessage-kit) and Claude.

---

## The Agents

### shipit

**A cofounder in your texts that remembers everything.**

Bounce ideas off it, log updates, track priorities, maintain streaks, and most importantly, be held accountable. The more data you give it, the better it becomes. It reflects back your patterns, what you're shipping, and what you're avoiding.

**Example conversation:**
```
You:    gm
shipit:  Morning. Day 12 streak. Your priorities are 
        MVP launch and user interviews. You haven't 
        mentioned interviews in 4 days. What's the 
        plan today?

You:    talked to 3 potential users about the contractor 
        marketplace idea. 2 said they'd pay for it
shipit:  That's real signal — 2 out of 3 willing to pay 
        is strong. This connects directly to your MVP 
        priority. What's the next step to turn those 
        conversations into commits?

You:    how am I doing
shipit:  Honest take: you've been consistent this week, 
        mostly focused on user research which is good. 
        But you've logged zero dev work in 6 days. If 
        the MVP is still priority #1, something needs 
        to shift.
```

**Commands:**
- `gm` - daily check-in, get priorities + nudge
- Any text — gets logged and connected to your goals
- `how am I doing` — honest progress reflection
- `set priority: [goal]` — add a priority
- `priorities` — see current priorities
- `clear priorities` — reset

---

### spotter

**A gym buddy that tracks every rep and helps you with your diet.**

Text your workout in plain english. It'll track PRs, tell you optimal exercises (or even substitutes based on your equipment), notice trends, and help you with your nutrition. Text it what you ate, and it'll give you a full macro breakdown, alongside suggestions, substitutes, and real advice.

**Example conversation:**
```
You:    bench 185x5x3, incline db 60x10x3, cable flies 40x12x3
spotter:   Logged. Bench 185x5x3, incline DB 60s for 
        10x3, cable flies 40x12x3. Solid push day. 
        That bench is moving - 185 is a new PR 

You:    i only have dumbbells today
spotter:   No problem. You can do bulgarian split squats,
        dumbbell RDLs, goblet squats, and walking lunges.
        Want the full workout?

You:    had chipotle bowl with chicken, rice, beans, guac
spotter:   Roughly 815 cal — 52g protein, 74g carbs, 
         34g fat. You're at 118g protein today, need 
         about 50 more to hit your goal. Maybe a double scoop
         shake before bed.
```

**Commands:**
- Any workout text — parsed and logged (e.g. squat 225 3x5)
- Any food text — macros estimated and tracked
- today — what to train based on your split
- week — weekly workout + nutrition summary
- pr / prs — see personal records
- macros — today's macro breakdown
- set goal: [calories/protein/etc] — set nutrition targets
- set split: [your split] — define training split

---

## How It Works

```
You text → iMessage DB → Photon SDK picks it up → Claude processes 
with your stored context → Photon sends reply → appears in iMessage
```

Each agent is a single TypeScript file running locally on your Mac. Photon watches your iMessage database for new messages, sends them to Claude's API with your full history as context, and replies through iMessage. State persists in a local JSON file.

---

## Setup

**Requirements:**
- macOS
- [Bun](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`)
- Full Disk Access for your terminal (System Settings → Privacy & Security → Full Disk Access)
- [Anthropic API key](https://console.anthropic.com)

**Install:**
```bash
git clone https://github.com/junnam586/photon-agents.git
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
# Start shipit
bun run shipit

# Start spotter  
bun run spotter
```

Then just text yourself (or the number running the agent).

---

## Architecture

```
imessage-agents/
├── shared/
│   ├── config.ts       ← env vars + validation
│   ├── claude.ts       ← Claude API wrapper (shared)
│   └── store.ts        ← JSON persistence (shared)
├── shipit/
│   └── index.ts        ← agent logic + system prompt
├── spotter/
│   └── index.ts        ← agent logic + system prompt
├── package.json
├── .env.example
└── README.md
```

---

## Why iMessage?

It feels like having someone to actually communicate with. All you need to do is text and communicate like you would a friend, and you receive real, honest advice rather than an app that only tells you the "objective" truth. You need a tool that actually sounds like something you'd listen to.

---

Built with [Photon iMessage Kit](https://github.com/photon-hq/imessage-kit) and [Claude](https://anthropic.com).
