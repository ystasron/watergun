// --- NODE.JS POLYFILLS FOR PUTER.JS ---
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

const puter = init(
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0IjoiYXUiLCJ2IjoiMC4wLjAiLCJ1dSI6InhaYXp1QVYxUVZ5ZzUzU1JpYzNDQ0E9PSIsImF1IjoiaWRnL2ZEMDdVTkdhSk5sNXpXUGZhUT09IiwicyI6IjEwMFlCWlIxdWlEVENCSUg2bHhPZWc9PSIsImlhdCI6MTc2NzE1NTY3OH0.is6X4pZD-J671mJiNmJFChB-ZgBzJpvzAgKl4-bpYM4",
);

// Compiled once at module load, reused per-request
const UNSAFE_CHARS = /[<>:"/\\|?*]/g;

module.exports = async function (api, event) {
  if (!event?.messageReply?.messageID || !event.threadID) return;

  const sanitizedID = event.messageReply.messageID.replace(UNSAFE_CHARS, "_");

  const imgPath = path.join(
    __dirname,
    "..",
    "temp",
    "img",
    event.threadID,
    `${sanitizedID}.jpg`,
  );

  // fs.promises.access is non-blocking and also verifies the file is readable
  try {
    await fs.promises.access(imgPath, fs.constants.R_OK);
  } catch {
    console.log("Image not found or unreadable at path:", imgPath);
    return;
  }

  try {
    // Fire typing indicator without blocking — it's cosmetic
    api.sendTypingIndicator(event.threadID);

    const prompt = event.body?.trim() || "What do you see in this image?";

    // Read and build data URI in one step — avoids an intermediate buffer variable
    const base64Image =
      "data:image/jpeg;base64," +
      (await fs.promises.readFile(imgPath)).toString("base64");

    const response = await puter.ai.chat(prompt, base64Image, false, {
      model: "gpt-4o",
    });

    const result =
      response?.message?.content || "I couldn't analyze the image.";

    api.sendMessage(result, event.threadID, event.messageID);
  } catch (err) {
    console.error("Image Analysis Error:", err.message);

    // Broadened to cover 403 and "unauthorized" in addition to 401 and "token"
    const isAuthError =
      err.message.includes("401") ||
      err.message.includes("403") ||
      err.message.includes("token") ||
      err.message.includes("unauthorized");

    api.sendMessage(
      isAuthError
        ? "❌ PUTER TOKEN EXPIRED OR INVALID."
        : "❌ IMAGE ANALYSIS FAILED.",
      event.threadID,
      event.messageID,
    );
  }
};
