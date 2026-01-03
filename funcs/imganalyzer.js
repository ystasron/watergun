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

const fs = require("fs");
const path = require("path");
const { init } = require("@heyputer/puter.js/src/init.cjs");

// Puter token (as requested)
const puter = init(
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0IjoiYXUiLCJ2IjoiMC4wLjAiLCJ1dSI6InhaYXp1QVYxUVZ5ZzUzU1JpYzNDQ0E9PSIsImF1IjoiaWRnL2ZEMDdVTkdhSk5sNXpXUGZhUT09IiwicyI6IjEwMFlCWlIxdWlEVENCSUg2bHhPZWc9PSIsImlhdCI6MTc2NzE1NTY3OH0.is6X4pZD-J671mJiNmJFChB-ZgBzJpvzAgKl4-bpYM4"
);

module.exports = async function (api, event) {
  if (!event?.messageReply?.messageID || !event.threadID) return;

  const sanitizedID = event.messageReply.messageID.replace(
    /[<>:"/\\|?*]/g,
    "_"
  );

  const imgPath = path.join(
    __dirname,
    "..",
    "temp",
    "img",
    event.threadID,
    `${sanitizedID}.jpg`
  );

  if (!fs.existsSync(imgPath)) {
    console.log("Image not found:", imgPath);
    return;
  }

  try {
    api.sendTypingIndicator(event.threadID);

    const prompt = event.body?.trim() || "What do you see in this image?";

    /* ===============================
       1️⃣ Read image ONCE (async)
       =============================== */
    const imageBuffer = await fs.promises.readFile(imgPath);

    /* ===============================
       2️⃣ Minimal Base64 conversion
       =============================== */
    const base64Image =
      "data:image/jpeg;base64," + imageBuffer.toString("base64");

    /* ===============================
       3️⃣ Vision request
       =============================== */
    const response = await puter.ai.chat(prompt, base64Image, false, {
      model: "gpt-4o",
    });

    const result =
      response?.message?.content || "I couldn't analyze the image.";

    api.sendMessage(result, event.threadID, event.messageID);
  } catch (err) {
    console.error("Image Analysis Error:", err.message);
    api.sendMessage(
      "❌ TOKEN EXPIRED OR IMAGE ANALYSIS FAILED.",
      event.threadID,
      event.messageID
    );
  }
};
