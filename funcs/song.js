const ytdlp = require("yt-dlp-exec");
const fs = require("fs");
const path = require("path");
const ffmpegPath = require("ffmpeg-static");

const messages = [
  "🔍 Initiating auditory scan… detecting your track now.",
  "🎧 Commencing music retrieval sequence…",
  "🚀 Engaging sonic propulsion for optimal tune acquisition…",
  "🔥 Locating requested rhythm… please stand by.",
  "🎶 Calibrating audio frequencies for your selection…",
  "💡 Analyzing sound patterns… one moment, sir/madam.",
  "🛰️ Tuning into musical coordinates… almost there.",
  "⚡ Accelerating beat detection… efficiency at maximum.",
  "🛠️ Deploying harmonic algorithms to locate your track…",
  "📡 Synchronizing with global music databases…",
  "🎵 Mapping waveform signatures… preparing download.",
  "⏳ Compiling the perfect audio package… patience appreciated.",
  "🧠 Processing auditory data streams…",
  "🔊 Filtering for optimum melody extraction…",
  "🎚️ Adjusting tempo parameters to isolate your track…",
  "🗂️ Searching archives for matching harmonics…",
  "💾 Encoding results into playable format…",
  "🕵️‍♂️ Investigating digital sound traces…",
  "🎛️ Fine-tuning frequency response…",
  "🚦Green light detected—audio retrieval nearly complete…",
  "🖥️ Running diagnostics on rhythm pathways…",
  "🛰️ Establishing connection with sonic satellites…",
  "🎯 Targeting exact track signature…",
  "📡 Signal strength optimal… preparing transfer.",
  "💼 Deploying musical agents to fetch requested tune…",
  "⚙️ Calculating optimal file delivery route…",
  "🎇 Initiating high-precision audio capture…",
  "🧬 Analyzing musical DNA… almost matched.",
  "💎 Polishing waveform to perfection…",
  "📜 Retrieving digital sheet music… hold on.",
  "🎤 Scanning vocal signatures…",
  "🧭 Navigating the sound spectrum…",
  "⚡ Energizing beat engines…",
  "🛡️ Protecting audio integrity during transfer…",
  "🏎️ Accelerating download velocity…",
  "🎶 Harmonizing data streams…",
  "💡 Illuminating hidden audio layers…",
  "🗝️ Unlocking encrypted track frequencies…",
  "🎇 Enhancing dynamic range for optimal clarity…",
  "🕹️ Engaging audio control protocols…",
  "📊 Monitoring rhythm stability…",
  "🎵 Compiling playlist with utmost precision…",
  "🔗 Linking source files…",
  "🚀 Optimizing sonic trajectory…",
  "🧠 Predicting track completion time… 2.7 seconds…",
  "🔧 Adjusting amplitude modulation…",
  "💼 Dispatching harmonic agents…",
  "🛰️ Orbiting servers for track acquisition…",
  "🎚️ Balancing treble and bass…",
  "🖱️ Executing final download command…",
  "💾 Storing your musical selection…",
  "🎯 Target successfully acquired, preparing transmission…",
  "🔊 Audio ready for deployment…",
  "🏁 Mission complete: your song awaits.",
];

const dirPath = path.join(__dirname, "..", "temp", "song");
fs.mkdirSync(dirPath, { recursive: true });

module.exports = async function (api, event) {
  const { threadID, messageID, body } = event;
  const query = body.slice(6).trim();

  if (!query) {
    return api.sendMessage("⚠️ Usage: /song [name]", threadID, messageID);
  }

  const filePath = path.join(dirPath, `song_${Date.now()}.m4a`);
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  try {
    api.sendMessage(`⏳ ${randomMessage}`, threadID, messageID);

    /* ================================
       1️⃣ Fetch minimal metadata
       ================================ */
    const info = await ytdlp(`ytsearch1:${query}`, {
      noPlaylist: true,
      printJson: true,
      skipDownload: true,
      quiet: true,
    });

    const title = info.title || "Unknown title";

    /* ================================
       2️⃣ Download LOWEST quality audio
       ================================ */
    await ytdlp(info.webpage_url, {
      extractAudio: true,
      audioFormat: "m4a",
      audioQuality: "9", // lowest quality
      output: filePath,
      ffmpegLocation: ffmpegPath,
      noPlaylist: true,
      quiet: true,
    });

    /* ================================
       3️⃣ Send audio file
       ================================ */
    api.sendMessage(
      {
        body: `🎵 𝗧𝗶𝘁𝗹𝗲: ${title}`,
        attachment: fs.createReadStream(filePath),
      },
      threadID,
      () => fs.unlink(filePath, () => {}),
      messageID
    );
  } catch (err) {
    console.error("Song Error:", err);
    api.sendMessage("❌ Error: Unable to fetch the song.", threadID, messageID);
    fs.unlink(filePath, () => {});
  }
};
