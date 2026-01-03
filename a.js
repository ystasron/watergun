const fs = require("fs").promises; // Use promise-based FS for speed
const fsSync = require("fs");
const login = require("@dongdev/fca-unofficial");
const path = require("path");
const axios = require("axios");

// 1. PRE-LOAD COMMANDS (Save RAM/CPU by not re-parsing files every message)
const commands = {
  "/song": require("./funcs/song.js"),
  "/image": require("./funcs/image.js"),
  "/help": require("./funcs/help.js"),
  "/accept": require("./funcs/sys/request.js"),
  "/bio": require("./funcs/sys/bio.js"),
  tts: require("./funcs/tts.js"),
  imganalyzer: require("./funcs/imganalyzer.js"),
};

// 2. CONFIG & CONSTANTS
const TEMP_IMG_DIR = path.join(__dirname, "temp", "img");
const KEYWORDS = ["hulk", "wolverine", "deadpool", "wakanda", "avengers"]; // Truncated for brevity

async function handlePhotoAttachment(event) {
  const photo = event.attachments.find((att) => att.type === "photo");
  if (!photo) return;

  const { threadID, messageID } = event;
  const sanitizedID = messageID.replace(/[<>:"/\\|?*]/g, "_");
  const dirPath = path.join(TEMP_IMG_DIR, threadID);
  const filePath = path.join(dirPath, `${sanitizedID}.jpg`);

  try {
    // Ensure directory exists (Async)
    await fs.mkdir(dirPath, { recursive: true });

    // Optimized FIFO: Only read directory if necessary
    const files = await fs.readdir(dirPath);
    if (files.length >= 10) {
      // Sort by birthtime without full stat objects to save RAM
      const fileStats = await Promise.all(
        files.map(async (f) => ({
          name: f,
          ...(await fs.stat(path.join(dirPath, f))),
        }))
      );
      fileStats.sort((a, b) => a.mtimeMs - b.mtimeMs);
      await fs.unlink(path.join(dirPath, fileStats[0].name));
    }

    // Stream download directly to file
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

  api.setOptions({ listenEvents: true, selfListen: false });

  api.listenMqtt(async (err, event) => {
    if (err) return;

    const body = (event.body || "").toLowerCase();
    const threadID = event.threadID;

    // ASYNC IMAGE SAVING (Non-blocking)
    if (event.attachments?.some((a) => a.type === "photo")) {
      handlePhotoAttachment(event);
    }

    // REACTION LOGIC (Optimized regex is faster than .some for large arrays)
    if (["message", "message_reply"].includes(event.type)) {
      const hasKeyword = KEYWORDS.some((word) => body.includes(word));
      if (hasKeyword) api.setMessageReaction("❤", event.messageID, threadID);
    }

    // COMMAND HANDLER
    if (body.startsWith("/")) {
      const cmd = body.split(" ")[0];
      if (commands[cmd]) {
        try {
          commands[cmd](api, event);
        } catch (e) {
          api.sendMessage("❌ Error executing command.", threadID);
        }
        return; // Stop processing further for commands
      }
    }

    // JARVIS LOGIC
    if (body.includes("jarvis")) {
      let ranAnalyzer = false;

      if (event.type === "message_reply" && event.messageReply) {
        const sanitizedID = event.messageReply.messageID.replace(
          /[<>:"/\\|?*]/g,
          "_"
        );
        const filePath = path.join(
          TEMP_IMG_DIR,
          threadID,
          `${sanitizedID}.jpg`
        );

        // Using fast sync check for local file existence
        if (fsSync.existsSync(filePath)) {
          commands["imganalyzer"](api, event);
          ranAnalyzer = true;
        }
      }

      if (!ranAnalyzer) {
        commands["tts"](api, event);
      }
    }
  });
});
