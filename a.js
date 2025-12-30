const fs = require("fs");
const login = require("aminul-new-fca");

login(
  { appState: JSON.parse(fs.readFileSync("appstate.json", "utf8")) },
  (err, api) => {
    if (err) return console.error("Login Error:", err);

    api.setOptions({ listenEvents: true });

    const stopListening = api.listenMqtt((err, event) => {
      if (err) return console.error("Listen Error:", err);

      // CRITICAL: Check if event.body exists to avoid 'startsWith' errors
      if (event.type === "message" && event.body) {
        const body = event.body.toLowerCase();

        if (body.startsWith("/song")) {
          try {
            require("./funcs/song.js")(api, event);
            delete require.cache[require.resolve("./funcs/song.js")];
          } catch (e) {
            console.error("Error loading song.js:", e);
            api.sendMessage(
              "❌ Error loading the song command.",
              event.threadID
            );
          }
        }

        if (body.startsWith("/image")) {
          try {
            api.sendTypingIndicator(event.threadID);
            require("./funcs/image.js")(api, event);
            delete require.cache[require.resolve("./funcs/image.js")];
          } catch (e) {
            console.error("Error loading image.js:", e);
            api.sendMessage(
              "❌ Error loading the image command.",
              event.threadID
            );
          }
        }

        if (body.toLowerCase().includes("jarvis")) {
          try {
            require("./funcs/tts.js")(api, event);
            delete require.cache[require.resolve("./funcs/ai.js")];
          } catch (e) {
            console.error("Error loading ai.js:", e);
            api.sendMessage("❌ Error loading the ai command.", event.threadID);
          }
        }
      }
    });
  }
);
