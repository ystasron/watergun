const fs = require("fs");
const login = require("@dongdev/fca-unofficial");

login(
  { appState: JSON.parse(fs.readFileSync("../appstate.json", "utf8")) },
  (err, api) => {
    if (err) return console.error("Login Error:", err);

    api.setOptions({ listenEvents: true });

    const stopListening = api.listenMqtt((err, event) => {
      if (err) return console.error("Listen Error:", err);

      console.log(event);
    });
  }
);
