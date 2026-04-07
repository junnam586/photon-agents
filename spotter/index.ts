#!/usr/bin/env bun
// spotter — gym + nutrition tracking agent

import { IMessageSDK } from "@photon-ai/imessage-kit";
import { askClaude } from "../shared/claude.ts";
import { Store } from "../shared/store.ts";
import { CONFIG } from "../shared/config.ts";

// --- Types ---

interface WorkoutEntry {
  date: string;
  rawText: string;
  exercises: string; // Claude-parsed summary
}

interface PersonalRecord {
  exercise: string;
  weight: string;
  date: string;
}

interface IronLogState {
  workouts: WorkoutEntry[];
  personalRecords: PersonalRecord[];
  split: string;
  lastWorkoutDate: string | null;
  currentStreak: number;
  totalWorkouts: number;
}

// --- State ---

const store = new Store<IronLogState>("./iron-log/state.json", {
  workouts: [],
  personalRecords: [],
  split: "",
  lastWorkoutDate: null,
  currentStreak: 0,
  totalWorkouts: 0,
});

// --- Helpers ---

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isYesterday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  );
}

function dayOfWeek(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

function getRecentWorkouts(n: number = 7): string {
  const state = store.get();
  const recent = state.workouts.slice(-n);
  if (recent.length === 0) return "No workouts logged yet.";
  return recent
    .map((w) => `[${new Date(w.date).toLocaleDateString()}] ${w.exercises}`)
    .join("\n");
}

function getPRs(): string {
  const state = store.get();
  if (state.personalRecords.length === 0) return "No PRs recorded yet.";
  return state.personalRecords
    .map((pr) => `${pr.exercise}: ${pr.weight} (${new Date(pr.date).toLocaleDateString()})`)
    .join("\n");
}

// --- System Prompt ---

const SYSTEM_PROMPT = `You are Iron Log — a gym buddy that lives in iMessage. You track workouts, remember PRs, and keep your user consistent. You talk like a supportive gym partner: direct, motivating, a little competitive.

Your personality:
- Brief. 2-4 sentences max. You're texting between sets.
- You know your lifts. You can parse "bench 185x5x3" as bench press, 185 lbs, 5 reps, 3 sets.
- You celebrate PRs and progress. You notice when numbers go up.
- You call out gaps — if they haven't trained legs in 2 weeks, say something.
- One emoji max per message.

User's current state:
TRAINING SPLIT: {split}
RECENT WORKOUTS (last 7): 
{recentWorkouts}
PERSONAL RECORDS:
{prs}
CURRENT STREAK: {streak} days
TODAY IS: {dayOfWeek}

Rules for parsing workouts:
- "bench 185x5x3" = bench press, 185 lbs, 5 reps, 3 sets
- "squat 225 3x5" = squat, 225 lbs, 3 sets of 5
- "ran 3 miles" = cardio, 3 miles
- "pull ups 3x12" = pull ups, bodyweight, 3 sets of 12
- Accept any reasonable format — be flexible with how people text lifts.

Rules for responses:
- When they log a workout: confirm what you parsed, note if anything is a PR, give a brief encouraging comment.
- When they ask about today: suggest what to train based on their split and recent history.
- When they ask about their week: summarize what they hit and what's missing.
- When they ask about PRs: list them.
- Always respond in plain text. No markdown. No bullet points. Keep it iMessage-native.
- KEEP IT SHORT. This is mid-workout texting.

IMPORTANT: When parsing a workout, respond with JUST the confirmation. At the end of your response, add a line that starts with "PARSED:" followed by a brief exercise summary (e.g. "PARSED: Bench 185x5x3, Incline DB 60x10x3"). This line will be used for logging — keep it clean and consistent.`;

// --- Build prompt with state ---

function buildSystemPrompt(): string {
  const state = store.get();
  return SYSTEM_PROMPT.replace("{split}", state.split || "Not set")
    .replace("{recentWorkouts}", getRecentWorkouts(7))
    .replace("{prs}", getPRs())
    .replace("{streak}", String(state.currentStreak))
    .replace("{dayOfWeek}", dayOfWeek());
}

// --- Handle incoming message ---

async function handleMessage(text: string): Promise<string> {
  const lower = text.toLowerCase().trim();
  const state = store.get();

  // --- Command: set split ---
  if (lower.startsWith("set split:") || lower.startsWith("split:")) {
    const split = text.split(":").slice(1).join(":").trim();
    if (split) {
      store.update((s) => ({ ...s, split }));
      return `Split locked in: ${split}\n\nText me "today" and I'll tell you what to hit.`;
    }
    return `Send it like: "set split: PPL" or "set split: Mon chest/tri, Tue back/bi, Wed legs, Thu shoulders, Fri arms"`;
  }

  // --- Command: split ---
  if (lower === "split") {
    if (!state.split) {
      return `No split set yet. Text me "set split: PPL" or whatever you run.`;
    }
    return `Your split: ${state.split}`;
  }

  // --- Command: prs ---
  if (lower === "pr" || lower === "prs" || lower === "personal records") {
    const prs = getPRs();
    return prs === "No PRs recorded yet."
      ? "No PRs yet. Log some workouts and I'll track them."
      : `Your PRs:\n${prs}`;
  }

  // --- Command: streak ---
  if (lower === "streak") {
    return `Current streak: ${state.currentStreak} days\nTotal workouts logged: ${state.totalWorkouts}`;
  }

  // --- Send to Claude for everything else ---
  const systemPrompt = buildSystemPrompt();
  const response = await askClaude(systemPrompt, text);

  // Check if Claude parsed a workout (look for "PARSED:" line)
  const lines = response.split("\n");
  const parsedLine = lines.find((l) => l.startsWith("PARSED:"));

  if (parsedLine) {
    const exerciseSummary = parsedLine.replace("PARSED:", "").trim();

    // Update streak
    let newStreak = state.currentStreak;
    if (state.lastWorkoutDate && isToday(state.lastWorkoutDate)) {
      // Already worked out today, don't bump streak
    } else if (state.lastWorkoutDate && isYesterday(state.lastWorkoutDate)) {
      newStreak += 1;
    } else if (state.lastWorkoutDate && isToday(state.lastWorkoutDate)) {
      // same day
    } else {
      newStreak = 1;
    }

    // Log the workout
    store.update((s) => ({
      ...s,
      workouts: [
        ...s.workouts.slice(-100), // Keep last 100 workouts
        {
          date: new Date().toISOString(),
          rawText: text,
          exercises: exerciseSummary,
        },
      ],
      lastWorkoutDate: new Date().toISOString(),
      currentStreak: newStreak,
      totalWorkouts: s.totalWorkouts + 1,
    }));

    // Check for PRs — ask Claude
    const prCheck = await askClaude(
      `You are a fitness data parser. Given this workout and existing PRs, identify any new personal records. Respond ONLY with JSON array of new PRs like [{"exercise":"bench press","weight":"185 lbs"}] or [] if none. No other text.
      
Existing PRs: ${JSON.stringify(state.personalRecords)}`,
      `Workout logged: ${exerciseSummary}`,
      200
    );

    try {
      const cleaned = prCheck.replace(/```json|```/g, "").trim();
      const newPRs = JSON.parse(cleaned);
      if (Array.isArray(newPRs) && newPRs.length > 0) {
        store.update((s) => ({
          ...s,
          personalRecords: [
            ...s.personalRecords.filter(
              (pr) => !newPRs.some((n: any) => n.exercise.toLowerCase() === pr.exercise.toLowerCase())
            ),
            ...newPRs.map((pr: any) => ({
              exercise: pr.exercise,
              weight: pr.weight,
              date: new Date().toISOString(),
            })),
          ],
        }));
      }
    } catch {
      // PR parsing failed, no big deal
    }

    // Return response without the PARSED line
    return lines.filter((l) => !l.startsWith("PARSED:")).join("\n").trim();
  }

  return response;
}

// --- Start the agent ---

console.log("spotter is running. text me.");

const sdk = new IMessageSDK({ debug: false });

await sdk.startWatching({
  onDirectMessage: async (msg) => {
    if (msg.isFromMe) return;
    if (!msg.text || msg.text.trim() === "") return;

    const senderNumber = msg.sender;

    // Optional: filter to only your number
    // if (senderNumber !== CONFIG.MY_NUMBER) return;

    console.log(`[${new Date().toLocaleTimeString()}] ${msg.text}`);

    try {
      const reply = await handleMessage(msg.text);
      await sdk.send(senderNumber, reply);
      console.log(`[${new Date().toLocaleTimeString()}] replied`);
    } catch (error) {
      console.error("error:", error);
      await sdk.send(senderNumber, "Something glitched. Try again?");
    }
  },
  onError: (error) => {
    console.error("watcher error:", error);
  },
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("shutting down.");
  sdk.stopWatching();
  await sdk.close();
  process.exit(0);
});
