// --- NODE.JS POLYFILL FOR PUTER.JS ---
if (typeof global.CustomEvent === "undefined") {
  global.CustomEvent = class CustomEvent extends Event {
    constructor(event, params) {
      super(event, params);
      this.detail = params ? params.detail : undefined;
    }
  };
}
// -------------------------------------

const { Mistral } = require("@mistralai/mistralai");
const { init } = require("@heyputer/puter.js/src/init.cjs");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Initialize APIs
const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY || "ChyRy431UGbOG5lrDjAoAhcTfqY9wPZC",
});

const puter = init(
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0IjoiYXUiLCJ2IjoiMC4wLjAiLCJ1dSI6InhaYXp1QVYxUVZ5ZzUzU1JpYzNDQ0E9PSIsImF1IjoiaWRnL2ZEMDdVTkdhSk5sNXpXUGZhUT09IiwicyI6IjEwMFlCWlIxdWlEVENCSUg2bHhPZWc9PSIsImlhdCI6MTc2NzE1NTY3OH0.is6X4pZD-J671mJiNmJFChB-ZgBzJpvzAgKl4-bpYM4"
);

module.exports = async function (api, event) {
  // Safety check for event structure
  if (!event || !event.body || !event.threadID) {
    console.error("Invalid event received.");
    return;
  }

  const { threadID, messageID, body } = event;
  const query = body.replace(/jarvis/gi, "").trim();

  if (!query) {
    return api.sendMessage("⚠️ Please provide a prompt.", threadID, messageID);
  }

  // Path setup
  const tempDir = path.join(__dirname, "..", "temp", "audio");
  const filePath = path.join(tempDir, `voice_${Date.now()}.mp3`);

  // Ensure directory exists
  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  } catch (e) {
    console.error("Directory Error:", e);
  }

  try {
    // 1. Get Text from Mistral
    let replyText;
    try {
      const result = await mistral.agents.complete({
        agentId: "ag_019b6bd2a2e674eb8856e455b3125591",
        messages: [{ role: "user", content: query }],
      });
      replyText =
        result.choices?.[0]?.message?.content ||
        "I couldn't generate a response.";
    } catch (aiErr) {
      console.error("Mistral Error:", aiErr);
      return api.sendMessage("❌ AI Service Error.", threadID, messageID);
    }

    // 2. TTS & Audio Pipeline
    try {
      const audioObj = await puter.ai.txt2speech(replyText, {
        provider: "openai",
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        response_format: "mp3",
      });

      if (!audioObj || !audioObj.src) throw new Error("No audio source");

      // Download
      const response = await axios({
        method: "get",
        url: audioObj.src,
        responseType: "arraybuffer",
        timeout: 10000,
      });

      // Write File
      fs.writeFileSync(filePath, Buffer.from(response.data));

      // Send with Audio
      await api.sendMessage(
        {
          body: replyText,
          attachment: fs.createReadStream(filePath),
        },
        threadID,
        messageID
      );
    } catch (audioErr) {
      console.error(
        "Audio Pipeline failed, falling back to text:",
        audioErr.message
      );
      // Fallback: Send text only if TTS or file handling fails
      await api.sendMessage(replyText, threadID, messageID);
    }
  } catch (globalErr) {
    console.error("Global Catch:", globalErr);
    api.sendMessage("❌ An unexpected error occurred.", threadID, messageID);
  } finally {
    // Cleanup file with delay to ensure the stream is closed
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error("Cleanup Error:", err);
        });
      }
    }, 10000);
  }
};
