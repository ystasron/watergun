const fs = require("fs").promises; // Use promise-based FS for speed
const fsSync = require("fs");
const login = require("@dongdev/fca-unofficial");
const path = require("path");
const axios = require("axios");
const express = require("express");

// ================= EXPRESS SERVER =================
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.status(200).send("🤖 Bot is running.");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
// ==================================================


// 1. PRE-LOAD COMMANDS (Save RAM/CPU by not re-parsing files every message)
const commands = {
  "/song": require("./funcs/song.js"),
  "/lyrics": require("./funcs/lyrics.js"),
  "/tiktok": require("./funcs/tiktok.js"),
  "/image": require("./funcs/image.js"),
  "/help": require("./funcs/help.js"),
  "/accept": require("./funcs/sys/request.js"),
  "/bio": require("./funcs/sys/bio.js"),
  tiktok: require("./funcs/tiktok.js"),
  tts: require("./funcs/tts.js"),
  imganalyzer: require("./funcs/imganalyzer.js"),
};

// 2. CONFIG & CONSTANTS
const TEMP_IMG_DIR = path.join(__dirname, "temp", "img");
const KEYWORDS = ["hulk", "wolverine", "deadpool", "wakanda", "avengers"];

async function handlePhotoAttachment(event) {
  const photo = event.attachments.find((att) => att.type === "photo");
  if (!photo) return;

  const { threadID, messageID } = event;
  const sanitizedID = messageID.replace(/[<>:"/\\|?*]/g, "_");
  const dirPath = path.join(TEMP_IMG_DIR, threadID);
  const filePath = path.join(dirPath, `${sanitizedID}.jpg`);

  try {
    await fs.mkdir(dirPath, { recursive: true });

    const files = await fs.readdir(dirPath);
    if (files.length >= 10) {
      const fileStats = await Promise.all(
        files.map(async (f) => ({
          name: f,
          ...(await fs.stat(path.join(dirPath, f))),
        }))
      );
      fileStats.sort((a, b) => a.mtimeMs - b.mtimeMs);
      await fs.unlink(path.join(dirPath, fileStats[0].name));
    }

    const response = await axios({
      url: photo.url,
      method: "GET",
      responseType: "stream",
    });

    const writer = fsSync.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((res, rej) => {
      writer.on("finish", res);
      writer.on("error", rej);
    });
  } catch (e) {
    console.error("Image Save Error:", e.message);
  }
}

// 3. MAIN LOGIN
const appState = JSON.parse(fsSync.readFileSync("appstate.json", "utf8"));

login({ appState }, (err, api) => {
  if (err) return console.error(err);

  console.log("✅ Logged in successfully.");

  api.setOptions({
    listenEvents: true,
    selfListen: false,
  });

  api.listenMqtt(async (err, event) => {
    if (err) return console.error(err);

    if (event.type === "message" || event.type === "message_reply") {
      const { body, threadID, senderID } = event;
      if (!body) return;

      // Save photo if exists
      if (event.attachments?.length) {
        await handlePhotoAttachment(event);
      }

      const args = body.trim().split(" ");
      const commandName = args[0].toLowerCase();

      if (commands[commandName]) {
        try {
          await commands[commandName](api, event, args);
        } catch (err) {
          console.error("Command Error:", err);
        }
      }
    }
  });
});
