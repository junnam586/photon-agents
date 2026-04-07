// ============================================
// SHARED CONFIG
// Reads from .env or environment variables
// ============================================

export const CONFIG = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
  MY_NUMBER: process.env.MY_NUMBER || "",
};

// Validate on import
if (!CONFIG.ANTHROPIC_API_KEY || CONFIG.ANTHROPIC_API_KEY.startsWith("sk-ant-xxxxx")) {
  console.error("❌ Missing ANTHROPIC_API_KEY. Copy .env.example to .env and add your key.");
  process.exit(1);
}

if (!CONFIG.MY_NUMBER || CONFIG.MY_NUMBER.includes("XXXX")) {
  console.error("❌ Missing MY_NUMBER. Add your phone number to .env");
  process.exit(1);
}
