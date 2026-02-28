// Speed and reliability optimizations by Claude

const axios = require("axios");
const fs = require("fs");
const path = require("path");

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

const LIMIT = 25 * 1024 * 1024; // 25MB

const dirPath = path.join(__dirname, "..", "temp", "song");
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

module.exports = async function (api, event) {
  const { threadID, messageID, body } = event;
  const query = body.slice(6).trim();

  if (!query) {
    return api.sendMessage("⚠️ Usage: /song [name]", threadID, messageID);
  }

  const mp3Path = path.join(dirPath, `song_${Date.now()}.mp3`);
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  // Helper to safely delete the temp file
  const cleanup = () => {
    if (fs.existsSync(mp3Path)) fs.rm(mp3Path, () => {});
  };

  try {
    // Fire status message and metadata fetch in parallel
    const [, { data }] = await Promise.all([
      api.sendMessage(`⏳ ${randomMessage}`, threadID, messageID),
      axios.get(
        `https://betadash-api-swordslush-production.up.railway.app/spt?title=${encodeURIComponent(query)}`,
        { timeout: 60000 },
      ),
    ]);

    if (!data || !data.download_url) {
      throw new Error("Invalid API response");
    }

    const title = data.title || "Unknown Title";
    const artist = data.artists || "Unknown Artist";

    // Convert duration from ms to MM:SS
    const durationMs = Number(data.duration) || 0;
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");

    // Stream the MP3 directly to disk, abort if it exceeds 25MB
    const audioRes = await axios.get(data.download_url, {
      responseType: "stream",
      timeout: 0,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    await new Promise((resolve, reject) => {
      let totalBytes = 0;
      const writer = fs.createWriteStream(mp3Path);

      audioRes.data.on("data", (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > LIMIT) {
          writer.destroy();
          audioRes.data.destroy();
          reject(new Error("FILE_TOO_LARGE"));
        }
      });

      audioRes.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // Send metadata + audio
    api.sendMessage(
      {
        body: `🎧 𝑨.𝑹.𝑰.𝑺.𝑶.𝑵 𝑺𝑷𝑬𝑨𝑲𝑬𝑹𝑺\n\n🎵 Title: ${title}\n🎤 Artist: ${artist}\n🕒 Duration: ${minutes}:${seconds}`,
        attachment: fs.createReadStream(mp3Path),
      },
      threadID,
      () => cleanup(),
      messageID,
    );
  } catch (err) {
    cleanup();
    console.error("Song Error:", err);

    if (err.message === "FILE_TOO_LARGE") {
      return api.sendMessage(
        "❌ File exceeds 25MB limit. Try a shorter track.",
        threadID,
        messageID,
      );
    }

    api.sendMessage(
      "❌ Error: Unable to fetch the song. The server might be down.",
      threadID,
      messageID,
    );
  }
};
