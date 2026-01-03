// --- NODE.JS POLYFILLS FOR PUTER.JS ---
// Node.js doesn't have these browser APIs by default, which Puter.js requires
const { Blob, File } = require("buffer");

if (typeof global.File === "undefined") global.File = File;
if (typeof global.Blob === "undefined") global.Blob = Blob;

if (typeof global.CustomEvent === "undefined") {
  global.CustomEvent = class CustomEvent extends Event {
    constructor(event, params) {
      super(event, params);
      this.detail = params?.detail;
    }
  };
}
// ---------------------------------------

const fs = require("fs");
const path = require("path");
const { init } = require("@heyputer/puter.js/src/init.cjs");

// Initializing Puter with your provided token
const puter = init(
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0IjoiYXUiLCJ2IjoiMC4wLjAiLCJ1dSI6InhaYXp1QVYxUVZ5ZzUzU1JpYzNDQ0E9PSIsImF1IjoiaWRnL2ZEMDdVTkdhSk5sNXpXUGZhUT09IiwicyI6IjEwMFlCWlIxdWlEVENCSUg2bHhPZWc9PSIsImlhdCI6MTc2NzE1NTY3OH0.is6X4pZD-J671mJiNmJFChB-ZgBzJpvzAgKl4-bpYM4"
);

module.exports = async function (api, event) {
  // 1. Basic validation: ensure there is a reply and a thread
  if (!event?.messageReply?.messageID || !event.threadID) return;

  // 2. Sanitize filename to prevent directory traversal or OS errors
  const sanitizedID = event.messageReply.messageID.replace(
    /[<>:"/\\|?*]/g,
    "_"
  );

  // 3. Construct path to the image stored on your VPS
  const imgPath = path.join(
    __dirname,
    "..",
    "temp",
    "img",
    event.threadID,
    `${sanitizedID}.jpg`
  );

  // 4. Check if file exists before processing
  if (!fs.existsSync(imgPath)) {
    console.log("Image not found at path:", imgPath);
    return;
  }

  try {
    api.sendTypingIndicator(event.threadID);

    const prompt = event.body?.trim() || "What do you see in this image?";

    /* ===============================
           READ AND CONVERT IMAGE
           =============================== */
    const imageBuffer = await fs.promises.readFile(imgPath);

    // Puter AI chat accepts data URIs for image analysis
    const base64Image =
      "data:image/jpeg;base64," + imageBuffer.toString("base64");

    /* ===============================
           VISION REQUEST (GPT-4o)
           =============================== */
    const response = await puter.ai.chat(prompt, base64Image, false, {
      model: "gpt-4o",
    });

    const result =
      response?.message?.content || "I couldn't analyze the image.";

    // 5. Send result back to the chat
    api.sendMessage(result, event.threadID, event.messageID);
  } catch (err) {
    console.error("Image Analysis Error:", err.message);

    // Handle specific error cases
    let errorMessage = "❌ IMAGE ANALYSIS FAILED.";
    if (err.message.includes("401") || err.message.includes("token")) {
      errorMessage = "❌ PUTER TOKEN EXPIRED OR INVALID.";
    }

    api.sendMessage(errorMessage, event.threadID, event.messageID);
  }
};
