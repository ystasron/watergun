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

  try {
    // ⏳ Send the randomized sci-fi status message
    api.sendMessage(`⏳ ${randomMessage}`, threadID, messageID);

    // 🔗 Fetch data from the API
    const apiUrl = `https://betadash-api-swordslush-production.up.railway.app/spt?title=${encodeURIComponent(query)}`;
    const { data } = await axios.get(apiUrl, { timeout: 60000 });

    if (!data || !data.download_url) {
      throw new Error("Invalid API response");
    }

    const title = data.title || "Unknown Title";
    const artist = data.artists || "Unknown Artist";

    // ⏱ Convert duration from Ms to MM:SS
    const durationMs = Number(data.duration) || 0;
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");

    // 🎵 Download the MP3 buffer
    const audioRes = await axios.get(data.download_url, {
      responseType: "arraybuffer",
      timeout: 0,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    fs.writeFileSync(mp3Path, Buffer.from(audioRes.data));

    // Check file size (Messenger limit check)
    const stats = fs.statSync(mp3Path);
    if (stats.size > 25 * 1024 * 1024) {
      if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
      return api.sendMessage("❌ File exceeds 25MB limit. Try a shorter track.", threadID, messageID);
    }

    // 📄 Send Metadata and Audio
    api.sendMessage(
      {
        body: `🎧 𝑨.𝑹.𝑰.𝑺.𝑶.𝑵 𝑺𝑷𝑬𝑨𝑲𝑬𝑹𝑺\n\n🎵 Title: ${title}\n🎤 Artist: ${artist}\n🕒 Duration: ${minutes}:${seconds}`,
        attachment: fs.createReadStream(mp3Path),
      },
      threadID,
      () => {
        // 🧹 Cleanup file after sending
        if (fs.existsSync(mp3Path)) {
          fs.unlinkSync(mp3Path);
        }
      },
      messageID
    );

  } catch (err) {
    console.error("Song Error:", err);
    api.sendMessage("❌ Error: Unable to fetch the song. The server might be down.", threadID, messageID);
    if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
  }
};
