const Genius = require("genius-lyrics");
const Client = new Genius.Client();

module.exports = async function (api, event) {
  const { threadID, messageID, body } = event;
  const query = body.split(" ").slice(1).join(" ");

  if (!query) {
    return api.sendMessage(
      "⚠️ Usage: /lyrics [song name]",
      threadID,
      messageID
    );
  }

  try {
    const searches = await Client.songs.search(query);

    if (!searches || searches.length === 0) {
      return api.sendMessage(
        `ℹ️ No lyrics found for "${query}".`,
        threadID,
        messageID
      );
    }

    const lyrics_full = await searches[0].lyrics();
    const lyrics = lyrics_full.substring(lyrics_full.indexOf("["));

    // Messenger character limit is usually around 2000-4000.
    // We slice at 3500 to be safe while providing the full song.
    const cleanLyrics =
      lyrics.length > 3500 ? lyrics.slice(0, 3500) + "..." : lyrics;

    api.sendMessage(cleanLyrics, threadID, messageID);
  } catch (err) {
    console.error("Lyrics Error:", err);
    api.sendMessage("❌ Error: Unable to fetch lyrics.", threadID, messageID);
  }
};
