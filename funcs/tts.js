// --- NODE.JS POLYFILL FOR PUTER.JS ---
if (typeof global.CustomEvent === "undefined") {
  global.CustomEvent = class CustomEvent extends Event {
    constructor(event, params) {
      super(event, params);
      this.detail = params?.detail;
    }
  };
}
// -----------------------------------

const { Mistral } = require("@mistralai/mistralai");
const { init } = require("@heyputer/puter.js/src/init.cjs");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Init APIs
const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

const puter = init(process.env.PUTER_TOKEN);

module.exports = async function (api, event) {
  if (!event?.body || !event?.threadID) return;

  const { threadID, messageID, body } = event;
  const query = body.replace(/jarvis/gi, "").trim();
  if (!query) {
    return api.sendMessage("⚠️ Please provide a prompt.", threadID, messageID);
  }

  const tempDir = path.join(__dirname, "..", "temp", "audio");
  const filePath = path.join(tempDir, `voice_${Date.now()}.m4a`);

  await fs.promises.mkdir(tempDir, { recursive: true });

  try {
    /* =============================
       1️⃣ Generate AI text (LIMITED)
       ============================= */
    const result = await mistral.agents.complete({
      agentId: "ag_019b6bd2a2e674eb8856e455b3125591",
      messages: [{ role: "user", content: query }],
    });

    let replyText =
      result.choices?.[0]?.message?.content ||
      "I couldn't generate a response.";

    // HARD LIMIT to protect memory + TTS
    replyText = replyText.slice(0, 1500);

    /* =============================
       2️⃣ Generate TTS
       ============================= */
    const audioObj = await puter.ai.txt2speech(replyText, {
      provider: "openai",
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      response_format: "m4a", // lower memory than mp3
    });

    if (!audioObj?.src) throw new Error("No audio source");

    /* =============================
       3️⃣ STREAM download to disk
       ============================= */
    const response = await axios({
      method: "get",
      url: audioObj.src,
      responseType: "stream",
      timeout: 10000,
    });

    await new Promise((resolve, reject) => {
      const write = fs.createWriteStream(filePath);
      response.data.pipe(write);
      write.on("finish", resolve);
      write.on("error", reject);
    });

    /* =============================
       4️⃣ STREAM send to Messenger
       ============================= */
    await api.sendMessage(
      {
        body: replyText,
        attachment: fs.createReadStream(filePath),
      },
      threadID,
      messageID
    );

    fs.unlink(filePath, () => {});
  } catch (err) {
    console.error("Jarvis Error:", err.message);
    api.sendMessage("❌ Error processing request.", threadID, messageID);
    fs.unlink(filePath, () => {});
  }
};
