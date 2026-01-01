const fs = require("fs");
const login = require("@dongdev/fca-unofficial");
const path = require("path");
const axios = require("axios");

// IMAGE HANDLER
async function handlePhotoAttachment(event) {
  // 1. Check if attachment is a photo
  const photo = event.attachments.find((att) => att.type === "photo");
  if (!photo) return;

  const threadID = event.threadID;
  const messageID = event.messageID.replace(/[<>:"/\\|?*]/g, "_"); // Sanitize filename
  const dirPath = path.join(__dirname, "temp", "img", threadID);
  const filePath = path.join(dirPath, `${messageID}.jpg`);

  try {
    // 2. Ensure directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 3. Handle the 10-file limit (FIFO - First In, First Out)
    let files = fs
      .readdirSync(dirPath)
      .map((file) => ({
        name: file,
        time: fs.statSync(path.join(dirPath, file)).mtime.getTime(),
      }))
      .sort((a, b) => a.time - b.time); // Sort oldest to newest

    if (files.length >= 10) {
      const oldestFile = path.join(dirPath, files[0].name);
      fs.unlinkSync(oldestFile);
      console.log(`Deleted oldest photo: ${files[0].name}`);
    }

    // 4. Download and save the new photo
    const response = await axios({
      url: photo.url,
      method: "GET",
      responseType: "stream",
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log(`Saved: ${messageID}.jpg to ${threadID}`);
        resolve();
      });
      writer.on("error", reject);
    });
  } catch (error) {
    console.error("Error processing image:", error.message);
  }
}

login(
  { appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) },
  (err, api) => {
    if (err) return console.error("Login Error:", err);

    api.setOptions({ listenEvents: true });

    const stopListening = api.listenMqtt((err, event) => {
      if (err) return console.error("Listen Error:", err);
      const body = (event.body || "").toLowerCase();

      // SAVE IMAGE FUNCTIONALITY
      if (
        event.attachments &&
        event.attachments.some((att) => att.type === "photo")
      ) {
        try {
          handlePhotoAttachment(event);
        } catch (e) {
          console.error("Error loading image handler:", e);
          api.sendMessage(
            "❌ Error loading the image handler.",
            event.threadID
          );
        }
      }

      if (body.startsWith("/")) {
        try {
          if (body.startsWith("/song")) {
            require("./funcs/song.js")(api, event);
            delete require.cache[require.resolve("./funcs/song.js")];
          } else if (body.startsWith("/image")) {
            require("./funcs/image.js")(api, event);
            delete require.cache[require.resolve("./funcs/image.js")];
          } else if (body.startsWith("/help")) {
            require("./funcs/help.js")(api, event);
            delete require.cache[require.resolve("./funcs/help.js")];
          } else if (body.startsWith("/accept")) {
            require("./funcs/sys/request.js")(api, event);
            delete require.cache[require.resolve("./funcs/sys/request.js")];
          } else if (body.startsWith("/bio")) {
            require("./funcs/sys/bio.js")(api, event);
            delete require.cache[require.resolve("./funcs/sys/bio.js")];
          }
        } catch (e) {
          console.error("Error running command:", e);
          api.sendMessage("❌ Error executing the command.", event.threadID);
        }
      }

      // CRITICAL: JARVIS LOGIC
      else if (body.includes("jarvis")) {
        let ranAnalyzer = false;

        // 1️⃣ Run imganalyzer only if replying to a saved image
        if (event.type === "message_reply") {
          const repliedMessageID = event.messageReply
            ? event.messageReply.messageID
            : null;
          const dirPath = path.join(__dirname, "temp", "img", event.threadID);

          if (repliedMessageID && fs.existsSync(dirPath)) {
            const sanitizedID = repliedMessageID.replace(/[<>:"/\\|?*]/g, "_");
            const filePath = path.join(dirPath, `${sanitizedID}.jpg`);

            if (fs.existsSync(filePath)) {
              try {
                require("./funcs/imganalyzer.js")(api, event);
                delete require.cache[require.resolve("./funcs/imganalyzer.js")];
                ranAnalyzer = true;
              } catch (e) {
                console.error("Error running imganalyzer.js:", e);
              }
            }
          }
        }

        // 2️⃣ Run TTS only if imganalyzer did NOT run
        if (!ranAnalyzer) {
          try {
            require("./funcs/tts.js")(api, event);
            delete require.cache[require.resolve("./funcs/tts.js")];
          } catch (e) {
            console.error("Error loading tts.js:", e);
            api.sendMessage(
              "❌ Error loading the tts command.",
              event.threadID
            );
          }
        }
      }

      // REACTION HANDLER
      const keywords = [
        // HEROES
        "hulk",
        "wolverine",
        "deadpool",
        "daredevil",
        "cyclops",
        "gambit",
        "storm",
        "beast",
        "colossus",
        "nightcrawler",
        "hawkeye",
        "shangchi",
        "antman",
        "wasp",
        "quicksilver",
        "namor",
        "sentry",
        "hercules",
        "blade",
        "nova",
        "shehulk",
        "moonknight",
        "punisher",
        "elektra",
        "ironfist",
        "luke-cage",
        "miles-morales",
        "spidergwen",
        "ghost-rider",
        "silver-surfer",

        // VILLAINS
        "doom",
        "magneto",
        "galactus",
        "venom",
        "carnage",
        "mystique",
        "apocalypse",
        "mephisto",
        "kingpin",
        "dormammu",
        "kang",
        "mordo",
        "zemo",
        "red-skull",
        "onslaught",

        // TERMS & LOCATIONS
        "wakanda",
        "asgard",
        "avengers",
        "xmen",
        "mutant",
        "tesseract",
        "mjolnir",
        "infinity-gauntlet",
        "knowhere",
        "vibranium",
      ];

      function handleReaction(api, event) {
        try {
          if (!event.messageID) return;

          const body = (
            event.body ||
            (event.messageReply && event.messageReply.body) ||
            ""
          ).toLowerCase();
          const shouldReact = keywords.some((word) => body.includes(word));

          if (shouldReact) {
            api.setMessageReaction(
              "love",
              event.messageID,
              (err) => {
                if (err) console.error("Reaction error:", err);
              },
              true
            );
          }
        } catch (e) {
          console.error("Error in handleReaction:", e);
        }
      }
      if (event.type && ["message", "message_reply"].includes(event.type)) {
        handleReaction(api, event);
      }
    });
  }
);
