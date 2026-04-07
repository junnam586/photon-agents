// ============================================
// CLAUDE API HELPER
// Shared by all agents — just call askClaude()
// ============================================

import Anthropic from "@anthropic-ai/sdk";
import { CONFIG } from "./config.ts";

const client = new Anthropic({ apiKey: CONFIG.ANTHROPIC_API_KEY });

export async function askClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 600
): Promise<string> {
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock?.text ?? "Hmm, I couldn't process that. Try again?";
  } catch (error) {
    console.error("[Claude API Error]", error);
    return "Something went wrong on my end. Try again in a sec.";
  }
}
