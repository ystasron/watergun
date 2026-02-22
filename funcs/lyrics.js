const axios = require("axios");

/**
 * Helper to send long lyrics in Messenger-safe chunks
 */
const sendInChunks = async (api, threadID, messageID, text, prefix = "") => {
  const CHUNK_SIZE = 1900;
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    const chunk = text.slice(i, i + CHUNK_SIZE);
    const content = i === 0 ? prefix + chunk : chunk;
    // We await to ensure they send in the correct order
    await new Promise((resolve) => {
      api.sendMessage(content, threadID, (err) => {
        if (err) console.error("Chunk Error:", err);
        resolve();
      }, i === 0 ? messageID : null); // Only reply to original message on the first chunk
    });
  }
};

module.exports = async function (api, event) {
  const { threadID, messageID, body } = event;
  const songQuery = body.replace(/^\/lyrics\s*/i, "").trim();

  if (!songQuery) {
    return api.sendMessage("⚠️ Usage: /lyrics [song name]", threadID, messageID);
  }

  try {
    // 🔗 API REQUEST
    const res = await axios.get(
      `https://api.popcat.xyz/v2/lyrics?song=${encodeURIComponent(songQuery)}`,
      { timeout: 15000 }
    );

    // Validate response
    if (!res.data || res.data.error || !res.data.message) {
      return api.sendMessage(`ℹ️ No lyrics found for "${songQuery}".`, threadID, messageID);
    }

    const { title, artist, lyrics } = res.data.message;

    if (!lyrics) throw new Error("Lyrics not found in response");

    /* ================================
       1️⃣ CLEANING LOGIC 
       ================================ */
    
    // Remove metadata preamble before the first bracketed section (e.g., [Intro])
    let cleanedLyrics = lyrics.replace(
      /^[\s\S]*?(\[Intro\]|\[Verse.*?\]|\[Chorus\]|\[Bridge\]|\[Outro\])/i,
      "$1"
    );

    // Normalize spacing (no more than 2 newlines in a row)
    cleanedLyrics = cleanedLyrics.replace(/\n{3,}/g, "\n\n").trim();

    // Prepare header for the first message
    const firstChunkPrefix = `🎵 𝗧𝗶𝘁𝗹𝗲: ${title}\n🎤 𝗔𝗿𝘁𝗶𝘀𝘁: ${artist}\n\n`;

    /* ================================
       2️⃣ SENDING IN CHUNKS
       ================================ */
    await sendInChunks(api, threadID, messageID, cleanedLyrics, firstChunkPrefix);

  } catch (err) {
    console.error("Lyrics Command Error:", err.message);
    api.sendMessage("❌ Error: Unable to fetch lyrics at this time.", threadID, messageID);
  }
};

