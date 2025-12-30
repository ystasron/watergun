const { init } = require("@heyputer/puter.js/src/init.cjs");

// 1. GLOBAL SAFETY NETS
// Handles promise rejections (async errors)
process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
  // Optional: Send alert to your logs or developer chat
});

// Handles general script errors (sync errors)
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  // In professional apps, you'd call process.exit(1) here and let PM2 restart it.
});

// Replace with your actual token
const PUTER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0IjoiYXUiLCJ2IjoiMC4wLjAiLCJ1dSI6IjhCN0FNbis2UmdxbE8xVzVETEVuU1E9PSIsImF1IjoiaWRnL2ZEMDdVTkdhSk5sNXpXUGZhUT09IiwicyI6IlE5eGFwUE1vaStkc3dJSFMzQ0dMdVE9PSIsImlhdCI6MTc2NzA2Mjk1OH0.72pteHPSuSEX0atTZrJrG_SnUpozp0DbYnYLV55HwUc";
const puter = init(PUTER_TOKEN);

module.exports = async (api, event) => {
  const { threadID, messageID, body } = event;

  if (!body || !body.toLowerCase().startsWith("jarvis")) return;

  const userQuery = body.slice(6).trim();
  if (!userQuery) {
    return api.sendMessage(
      "Yes? I am Jarvis. How can I help you?",
      threadID,
      messageID
    );
  }

  // 2. CONSTRUCT PROMPT WITH INSTRUCTIONS
  const prompt = `Act as J.A.R.V.I.S. from the Avengers. Limit responses to 1–3 sentences. User says: ${userQuery}`;

  try {
    // 3. START TYPING INDICATOR
    api.sendTypingIndicator(threadID);

    const response = await puter.ai.chat(prompt, {
      model: "gpt-5-nano",
      stream: true,
    });

    let fullResponse = "";

    for await (const part of response) {
      if (part?.text) {
        fullResponse += part.text;
      }
    }

    // 4. RE-TRIGGER TYPING INDICATOR BEFORE SENDING
    // This keeps the "Jarvis is typing..." status active until the message drops
    api.sendTypingIndicator(threadID);

    if (fullResponse.trim().length > 0) {
      return api.sendMessage(fullResponse.trim(), threadID, messageID);
    }
  } catch (error) {
    console.error("Jarvis Module Error:", error);

    const errorMessage =
      error.status === 401
        ? "❌ Error: My login token is invalid."
        : "❌ Sir, I'm experiencing a minor system malfunction. Please try again.";

    return api.sendMessage(errorMessage, threadID, messageID);
  }
};
