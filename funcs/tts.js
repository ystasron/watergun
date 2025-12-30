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
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0IjoiYXUiLCJ2IjoiMC4wLjAiLCJ1dSI6IjhCN0FNbis2UmdxbE8xVzVETEVuU1E9PSIsImF1IjoiaWRnL2ZEMDdVTkdhSk5sNXpXUGZhUT09IiwicyI6IlE5eGFwUE1vaStkc3dJSFMzQ0dMdVE9PSIsImlhdCI6MTc2NzA2Mjk1OH0.72pteHPSuSEX0atTZrJrG_SnUpozp0DbYnYLV55HwUc"
);

module.exports = async function (api, event) {
  const { threadID, messageID, body } = event;
  const query = body.replace(/jarvis/gi, "").trim();

  if (!query) {
    return api.sendMessage("⚠️ Please provide a prompt.", threadID, messageID);
  }

  // Define path to directory one level UP: ../temp/audio
  const tempDir = path.join(__dirname, "..", "temp", "audio");
  const fileName = `voice_${Date.now()}.mp3`;
  const filePath = path.join(tempDir, fileName);

  // Ensure directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    // 1. Get Text from Mistral
    const result = await mistral.agents.complete({
      agentId: "ag_019b6bd2a2e674eb8856e455b3125591",
      messages: [{ role: "user", content: query }],
    });

    const replyText = result.choices?.[0]?.message?.content || "No response.";

    // 2. Request TTS from Puter
    const audioObj = await puter.ai.txt2speech(replyText, {
      provider: "openai",
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      response_format: "mp3",
    });

    // 3. Download the MP3 file
    const response = await axios({
      method: "get",
      url: audioObj.src,
      responseType: "arraybuffer",
    });

    // 4. Save file locally
    fs.writeFileSync(filePath, Buffer.from(response.data));

    // 5. Send message with audio attachment
    await api.sendMessage(
      {
        body: replyText,
        attachment: fs.createReadStream(filePath),
      },
      threadID,
      messageID
    );
  } catch (error) {
    console.error("Pipeline Error:", error);
    api.sendMessage("❌ Error: " + error.message, threadID, messageID);
  } finally {
    // 6. Delete file after sending (or if it fails)
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Failed to delete temp file:", err);
      }
    }
  }
};
