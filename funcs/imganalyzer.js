const fs = require("fs");
const path = require("path");
const { init } = require("@heyputer/puter.js/src/init.cjs");
// It's better to initialize once. If you pass 'puter' from the main script,
// remove this init block.
const puter = init(
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0IjoiYXUiLCJ2IjoiMC4wLjAiLCJ1dSI6InhaYXp1QVYxUVZ5ZzUzU1JpYzNDQ0E9PSIsImF1IjoiaWRnL2ZEMDdVTkdhSk5sNXpXUGZhUT09IiwicyI6IjEwMFlCWlIxdWlEVENCSUg2bHhPZWc9PSIsImlhdCI6MTc2NzE1NTY3OH0.is6X4pZD-J671mJiNmJFChB-ZgBzJpvzAgKl4-bpYM4"
);

module.exports = async function (api, event) {
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

  if (fs.existsSync(imgPath)) {
    try {
      api.sendTypingIndicator(event.threadID);
      console.log("Jarvis is analyzing the replied image...");

      // Use the actual message text as the prompt
      const prompt = event.body || "What do you see in this image?";

      // Convert local file to Base64
      const imageData = fs.readFileSync(imgPath);
      const base64Image = `data:image/jpeg;base64,${imageData.toString(
        "base64"
      )}`;

      // CORRECTED ARGUMENT ORDER:
      // 1. prompt
      // 2. image (Base64 string)
      // 3. testMode (false)
      // 4. options (model)
      const response = await puter.ai.chat(prompt, base64Image, false, {
        model: "gpt-4o",
      });

      const result = response.message.content;

      api.sendMessage(result, event.threadID, event.messageID);
    } catch (error) {
      console.error("Puter AI Error:", error);
      api.sendMessage(
        "❌ TOKEN EXPIRED OR AN ERROR OCCURRED DURING IMAGE ANALYSIS.",
        event.threadID
      );
    }
  } else {
    console.log("Image not found in local storage at:", imgPath);
  }
};
