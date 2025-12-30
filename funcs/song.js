const ytdlp = require("yt-dlp-exec");
const fs = require("fs");
const path = require("path");
const ffmpegPath = require("ffmpeg-static");
const axios = require("axios");

const messages = [
  "🔍 Digging through the soundwaves for that track…",
  "🎧 Hunting down that vibe real quick…",
  "🚀 Scanning the music universe for your song…",
  "🔥 Chasing that beat, hold tight…",
  "🎶 Tuning into the right frequency…",
  "🧠 Let me cook… finding that song now",
  "⚡ Speed-running the internet for that music…",
  "🎵 Vibing through the archives for your track…",
  "🕵️‍♂️ Doing some musical detective work…",
  "🌊 Diving deep into the sound pool…",
  "🎛️ Mixing signals… song incoming",
  "💿 Scratching through the crates for that hit…",
  "🎤 Warming up the speakers… searching now",
  "📡 Locking onto that melody…",
  "🔊 Tracking the rhythm you’re looking for…",
  "🌀 Spinning up the music engine…",
  "🎼 Following the notes… almost there",
  "🧲 Pulling that song out of the ether…",
  "🚨 Beat detected—locating source…",
  "🪩 Summoning the soundtrack you asked for…",
];

const dirPath = path.join(__dirname, "..", "temp", "song");
if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

const cookiesPath = path.join(__dirname, "..", "cookies.txt");

module.exports = async function (api, event) {
  const { threadID, messageID, body } = event;
  const query = body.slice(6).trim();
  if (!query)
    return api.sendMessage("⚠️ Usage: /song [name]", threadID, messageID);

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  const filePath = path.join(dirPath, `temp_song_${Date.now()}.mp3`);

  try {
    api.sendMessage(`⏳ ${randomMessage}`, threadID, messageID);

    const info = await ytdlp(`ytsearch1:${query}`, {
      dumpSingleJson: true,
      noPlaylist: true,
      cookies: cookiesPath,
    });

    const videoTitle = info.title;
    const cleanTitle = videoTitle
      .replace(/\(([^)]+)\)|\[([^\]]+)\]|Official|Video|Audio|HD|4K/gi, "")
      .trim();

    const [lyricsResult] = await Promise.all([
      axios
        .get(
          `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle)}`
        )
        .then((res) =>
          res.data && res.data.length > 0 ? res.data[0].plainLyrics || "" : ""
        )
        .catch(() => ""),

      ytdlp(info.webpage_url, {
        extractAudio: true,
        audioFormat: "mp3",
        output: filePath,
        ffmpegLocation: ffmpegPath,
        cookies: cookiesPath,
      }),
    ]);

    const messageContent = {
      body: `🎵 𝗧𝗶𝘁𝗹𝗲: ${videoTitle}\n\n${
        lyricsResult
          ? "📜 𝗟𝗬𝗥𝗜𝗖𝗦:\n\n" + lyricsResult.substring(0, 3500)
          : "ℹ️ Lyrics not found."
      }`,
      attachment: fs.createReadStream(filePath),
    };

    api.sendMessage(
      messageContent,
      threadID,
      () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      },
      messageID
    );
  } catch (error) {
    console.error("Bot Error:", error);
    api.sendMessage(
      "❌ Error: Could not complete your request.",
      threadID,
      messageID
    );
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};
