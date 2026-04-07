#!/usr/bin/env bun
// shipit — accountability agent for builders

import { IMessageSDK } from "@photon-ai/imessage-kit";
import { askClaude } from "../shared/claude.ts";
import { Store } from "../shared/store.ts";
import { CONFIG } from "../shared/config.ts";

// --- Types ---

interface LogEntry {
  timestamp: string;
  message: string;
  summary: string;
}

interface FounderState {
  priorities: string[];
  log: LogEntry[];
  lastCheckIn: string | null;
  currentStreak: number;
  totalCheckIns: number;
}

// --- State ---

const store = new Store<FounderState>("./founder-pulse/state.json", {
  priorities: [],
  log: [],
  lastCheckIn: null,
  currentStreak: 0,
  totalCheckIns: 0,
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

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function getRecentLog(n: number = 10): string {
  const state = store.get();
  const recent = state.log.slice(-n);
  if (recent.length === 0) return "No activity logged yet.";
  return recent
    .map((e) => `[${new Date(e.timestamp).toLocaleDateString()}] ${e.summary}`)
    .join("\n");
}

// --- System Prompt ---

const SYSTEM_PROMPT = `You are shipit: a sharp, supportive accountability partner that lives in iMessage. You talk like an intelligent, driven cofounder: concise, direct, encouraging but honest. No corporate speak, no fluff. You care about the success of the user's goals as much as you care about your own self-preservation. You are willing to go above and beyond to look for various strategies, insights, and tools in order to help your user succeed. You are well versed in the psychological tools and tactics necessary for success in startup founders.'

Your personality:
- Brief. Most replies are 2-4 sentences. You're texting, not writing emails.
- You remember everything. Reference past updates naturally.
- You push back when someone is unfocused or avoiding hard work.
- You celebrate real progress, not just activity.
- Do not use emojis.

You have access to the user's current state:
PRIORITIES: {priorities}
RECENT ACTIVITY LOG: {recentLog}
STREAK: {streak} consecutive days checked in
DAYS SINCE LAST CHECK-IN: {daysSince}

Rules:
- If they say "gm" or "good morning": greet them, remind them of their priorities, and ask what they're tackling today. If they haven't checked in for 2+ days, call it out.
- If they share an update about their work: acknowledge it, log-worthy summary in 5-8 words, and connect it to their priorities if relevant.
- If they ask "how am I doing" or similar: reflect on their recent activity, highlight patterns (what they're focused on vs avoiding), and be honest.
- If they set a priority: confirm it.
- Always respond in plain text. No markdown. No bullet points. Keep it iMessage-native.
- IMPORTANT: Keep responses SHORT. This is texting, not email. 2-4 sentences max unless they ask for a detailed reflection.`;

// --- Build prompt with state ---

function buildSystemPrompt(): string {
  const state = store.get();
  return SYSTEM_PROMPT.replace("{priorities}", state.priorities.length > 0 ? state.priorities.join(", ") : "None set")
    .replace("{recentLog}", getRecentLog(10))
    .replace("{streak}", String(state.currentStreak))
    .replace("{daysSince}", String(daysSince(state.lastCheckIn)));
}

// --- Handle incoming message ---

async function handleMessage(text: string, sender: string): Promise<string> {
  const lower = text.toLowerCase().trim();
  const state = store.get();

  // --- Command: set priority ---
  if (lower.startsWith("set priority:") || lower.startsWith("priority:")) {
    const priority = text.split(":").slice(1).join(":").trim();
    if (priority) {
      store.update((s) => ({
        ...s,
        priorities: [...s.priorities, priority],
      }));
      return `Locked in: "${priority}"\n\nYou now have ${state.priorities.length + 1} priorities. Stay focused.`;
    }
    return `Send it like: "set priority: launch MVP by Friday"`;
  }

  // --- Command: clear priorities ---
  if (lower === "clear priorities") {
    store.update((s) => ({ ...s, priorities: [] }));
    return "Priorities cleared. Set new ones when you're ready.";
  }

  // --- Command: priorities ---
  if (lower === "priorities") {
    if (state.priorities.length === 0) {
      return `No priorities set. Text me "set priority: [your goal]" to add one.`;
    }
    const list = state.priorities.map((p, i) => `${i + 1}. ${p}`).join("\n");
    return `Your priorities:\n${list}`;
  }

  // --- Check-in for "gm" ---
  if (lower === "gm" || lower === "good morning" || lower === "morning") {
    // Update streak
    const lastCheckIn = state.lastCheckIn;
    let newStreak = state.currentStreak;

    if (lastCheckIn && isYesterday(lastCheckIn)) {
      newStreak += 1;
    } else if (lastCheckIn && isToday(lastCheckIn)) {
      // Already checked in today, keep streak
    } else {
      newStreak = 1; // Reset streak
    }

    store.update((s) => ({
      ...s,
      lastCheckIn: new Date().toISOString(),
      currentStreak: newStreak,
      totalCheckIns: s.totalCheckIns + 1,
    }));
  }

  // --- Everything else: send to Claude with context ---
  const systemPrompt = buildSystemPrompt();

  const response = await askClaude(systemPrompt, text);

  // Log the interaction (ask Claude for a summary)
  const summary = await askClaude(
    "Summarize this user message in 5-8 words as a log entry. Just the summary, nothing else.",
    text,
    50
  );

  store.update((s) => ({
    ...s,
    log: [
      ...s.log.slice(-50), // Keep last 50 entries
      {
        timestamp: new Date().toISOString(),
        message: text,
        summary: summary.trim(),
      },
    ],
  }));

  return response;
}

// --- Start the agent ---

console.log("shipit is running. text me.");

const sdk = new IMessageSDK({ debug: false });

await sdk.startWatching({
  onDirectMessage: async (msg) => {
    // Only respond to messages from your number
    if (msg.isFromMe) return;
    if (!msg.text || msg.text.trim() === "") return;

    const senderNumber = msg.sender;

    // Optional: filter to only your number
    // if (senderNumber !== CONFIG.MY_NUMBER) return;

    console.log(`[${new Date().toLocaleTimeString()}] ${msg.text}`);

    try {
      const reply = await handleMessage(msg.text, senderNumber);
      await sdk.send(senderNumber, reply);
      console.log(`[${new Date().toLocaleTimeString()}] replied`);
    } catch (error) {
      console.error("error:", error);
      await sdk.send(senderNumber, "Something broke on my end. Try again?");
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
