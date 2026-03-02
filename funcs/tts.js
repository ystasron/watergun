// ================= POLYFILL =================
if (typeof global.CustomEvent === "undefined") {
  global.CustomEvent = class CustomEvent extends Event {
    constructor(event, params) {
      super(event, params);
      this.detail = params ? params.detail : undefined;
    }
  };
}

// ================= DEPENDENCIES =================
const { Mistral } = require("@mistralai/mistralai");
const { init } = require("@heyputer/puter.js/src/init.cjs");
const axios = require("axios");
const { PassThrough } = require("stream");

// ================= INIT (LOAD ONCE) =================
const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

const puter = init(process.env.PUTER_TOKEN);

// ================= HANDLER =================
module.exports = async function (api, event) {
  if (!event?.body || !event?.threadID) return;

  const { threadID, messageID } = event;
  const query = event.body.replace(/jarvis/gi, "").trim();

  if (!query) {
    return api.sendMessage(
      "⚠️ Please provide a prompt.",
      threadID,
      messageID
    );
  }

  try {
    // ================= 1️⃣ AI TEXT =================
    const aiResponse = await mistral.agents.complete({
      agentId: process.env.MISTRAL_AGENT_ID,
      messages: [{ role: "user", content: query }],
      timeout: 15000,
    });

    const replyText = aiResponse?.choices?.[0]?.message?.content;

    if (!replyText) {
      throw new Error("Empty AI response");
    }

    // ================= 2️⃣ TTS =================
    const audioObj = await puter.ai.txt2speech(replyText, {
      provider: "openai",
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      response_format: "mp3",
    });

    if (!audioObj?.src) throw new Error("TTS failed");

    // ================= 3️⃣ STREAM DIRECTLY (NO FILE SAVE) =================
    const audioResponse = await axios({
      method: "GET",
      url: audioObj.src,
      responseType: "stream",
      timeout: 10000,
    });

    const passThrough = new PassThrough();
    audioResponse.data.pipe(passThrough);

    await api.sendMessage(
      {
        body: replyText,
        attachment: passThrough,
      },
      threadID,
      messageID
    );

  } catch (err) {
    console.error("AI/TTS Error:", err.message);

    // Fallback to text only
    try {
      await api.sendMessage(
        "⚠️ Voice unavailable. Here is the text response instead.\n\n" +
          (err.replyText || "Service temporarily unavailable."),
        threadID,
        messageID
      );
    } catch {}
  }
};
