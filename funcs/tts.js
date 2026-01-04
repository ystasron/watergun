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

// Initialize APIs with token and key
const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY || "ChyRy431UGbOG5lrDjAoAhcTfqY9wPZC",
});

const puter = init(
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0IjoiYXUiLCJ2IjoiMC4wLjAiLCJ1dSI6InhaYXp1QVYxUVZ5ZzUzU1JpYzNDQ0E9PSIsImF1IjoiaWRnL2ZEMDdVTkdhSk5sNXpXUGZhUT09IiwicyI6IjEwMFlCWlIxdWlEVENCSUg2bHhPZWc9PSIsImlhdCI6MTc2NzE1NTY3OH0.is6X4pZD-J671mJiNmJFChB-ZgBzJpvzAgKl4-bpYM4"
);

module.exports = async function (api, event) {
  if (!event || !event.body || !event.threadID) {
    console.error("Invalid event structure");
    return;
  }

  const { threadID, messageID, body } = event;
  const query = body.replace(/jarvis/gi, "").trim();

  if (!query) {
    return api.sendMessage("⚠️ Please provide a prompt.", threadID, messageID);
  }

  const tempDir = path.join(__dirname, "..", "temp", "audio");
  fs.mkdirSync(tempDir, { recursive: true });
  const filePath = path.join(tempDir, `voice_${Date.now()}.mp3`);

  try {
    // --- 1️⃣ Generate Text Response from Mistral ---
    let replyText = "Sorry, I couldn't generate a response.";
    try {
      const result = await mistral.agents.complete({
        agentId: "ag_019b6bd2a2e674eb8856e455b3125591",
        messages: [{ role: "user", content: query }],
      });
      replyText = result.choices?.[0]?.message?.content || replyText;
    } catch (aiErr) {
      console.error("Mistral Error:", aiErr);
      return api.sendMessage("❌ AI Service Error.", threadID, messageID);
    }

    // --- 2️⃣ Text-to-Speech via Puter.js ---
    try {
      const audioObj = await puter.ai.txt2speech(replyText, {
        provider: "openai",
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        response_format: "mp3",
      });

      if (!audioObj?.src) throw new Error("No audio generated");

      const response = await axios.get(audioObj.src, {
        responseType: "arraybuffer",
        timeout: 10000,
      });

      fs.writeFileSync(filePath, Buffer.from(response.data));

      // --- 3️⃣ Send message with audio stream ---
      await api.sendMessage(
        {
          body: replyText,
          attachment: fs.createReadStream(filePath),
        },
        threadID,
        messageID
      );
    } catch (ttsErr) {
      console.error("TTS pipeline failed, fallback to text:", ttsErr.message);
      await api.sendMessage(replyText, threadID, messageID);
    }
  } catch (globalErr) {
    console.error("Global Error:", globalErr);
    api.sendMessage("❌ An unexpected error occurred.", threadID, messageID);
  } finally {
    // --- 4️⃣ Cleanup asynchronously ---
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlink(
          filePath,
          (err) => err && console.error("Cleanup error:", err)
        );
      }
    }, 5000);
  }
};
