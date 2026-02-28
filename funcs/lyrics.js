const axios = require("axios");

const CHUNK_SIZE = 1900;

// Compiled once at module load — not per-call
const PREAMBLE_REGEX =
  /^[\s\S]*?(\[Intro\]|\[Verse.*?\]|\[Chorus\]|\[Bridge\]|\[Outro\])/i;
const EXCESS_NEWLINES = /\n{3,}/g;

/**
 * Helper to send long lyrics in Messenger-safe chunks
 */
const sendInChunks = async (api, threadID, messageID, text, prefix = "") => {
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    const chunk = text.slice(i, i + CHUNK_SIZE);
    const content = i === 0 ? prefix + chunk : chunk;
    const replyTo = i === 0 ? messageID : null;

    await new Promise((resolve) => {
      api.sendMessage(
        content,
        threadID,
        (err) => {
          if (err) console.error("Chunk Error:", err);
          resolve();
        },
        replyTo,
      );
    });
  }
};

module.exports = async function (api, event) {
  const { threadID, messageID, body } = event;
  const songQuery = body.replace(/^\/lyrics\s*/i, "").trim();

  if (!songQuery) {
    return api.sendMessage(
      "⚠️ Usage: /lyrics [song name]",
      threadID,
      messageID,
    );
  }

  try {
    const res = await axios.get(
      `https://api.popcat.xyz/v2/lyrics?song=${encodeURIComponent(songQuery)}`,
      { timeout: 15000 },
    );

    if (!res.data || res.data.error || !res.data.message) {
      return api.sendMessage(
        `ℹ️ No lyrics found for "${songQuery}".`,
        threadID,
        messageID,
      );
    }

    const { title, artist, lyrics } = res.data.message;
    if (!lyrics) throw new Error("Lyrics not found in response");

    // Remove metadata preamble before the first bracketed section
    const cleanedLyrics = lyrics
      .replace(PREAMBLE_REGEX, "$1")
      .replace(EXCESS_NEWLINES, "\n\n")
      .trim();

    const firstChunkPrefix = `🎵 𝗧𝗶𝘁𝗹𝗲: ${title}\n🎤 𝗔𝗿𝘁𝗶𝘀𝘁: ${artist}\n\n`;

    await sendInChunks(
      api,
      threadID,
      messageID,
      cleanedLyrics,
      firstChunkPrefix,
    );
  } catch (err) {
    console.error("Lyrics Command Error:", err.message);
    api.sendMessage(
      "❌ Error: Unable to fetch lyrics at this time.",
      threadID,
      messageID,
    );
  }
};
