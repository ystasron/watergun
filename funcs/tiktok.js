const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = async function (api, event) {
  if (!event || !event.body || !event.threadID) return;

  const { threadID, messageID, body } = event;

  // --- REGEX LINK DETECTION ---
  const tiktokRegex = /https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/;
  const match = body.match(tiktokRegex);
  const link = match ? match[0] : null;

  if (!link) return;

  const dir = path.join(__dirname, "..", "temp", "tiktok");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${Date.now()}.mp4`);

  try {
    // --- API REQUEST ---
    const apiUrl = `https://tikdownpro.vercel.app/api/download?url=${encodeURIComponent(link)}`;
    const { data } = await axios.get(apiUrl);

    // Validate API response
    if (!data || data.status !== true || !Array.isArray(data.video) || !data.video[0]) {
      throw new Error("Invalid API response");
    }

    const videoUrl = data.video[0];
    const caption = data.title || "TikTok Video";

    // --- DOWNLOAD STREAM ---
    const response = await axios({
      method: "get",
      url: videoUrl,
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.tiktok.com/",
      },
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // Check file size (Messenger 25MB - 45MB limit depending on account)
    const stats = fs.statSync(filePath);
    if (stats.size > 45 * 1024 * 1024) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return api.sendMessage("❌ The video is too large to send via Messenger.", threadID, messageID);
    }

    // --- SEND VIDEO ---
    api.sendMessage(
      {
        body: `🎬 **TikTok Downloader**\n\n📝: ${caption}`,
        attachment: fs.createReadStream(filePath),
      },
      threadID,
      () => {
        // Cleanup after sending
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, () => {});
        }
      },
      messageID
    );

  } catch (err) {
    console.error("TikTok Handler Error:", err.message);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    // Only send error message if the link was definitely a TikTok link
    api.sendMessage("❌ Unable to download this TikTok video. The link might be private or the server is busy.", threadID, messageID);
  }
};
