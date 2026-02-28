// Speed and reliability optimizations by Claude

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const TIKTOK_REGEX = /https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/;
const SIZE_LIMIT = 45 * 1024 * 1024; // 45MB

const dir = path.join(__dirname, "..", "temp", "tiktok");
fs.mkdirSync(dir, { recursive: true }); // Idempotent, no existsSync needed

module.exports = async function (api, event) {
  if (!event?.body || !event.threadID) return;

  const { threadID, messageID, body } = event;

  const match = body.match(TIKTOK_REGEX);
  if (!match) return;
  const link = match[0];

  const filePath = path.join(dir, `${Date.now()}.mp4`);

  // Async cleanup helper — silently ignores "file not found"
  const cleanup = () =>
    fs.rm(filePath, (err) => {
      if (err && err.code !== "ENOENT") console.error("Cleanup error:", err);
    });

  try {
    // --- API REQUEST ---
    const apiUrl = `https://tikdownpro.vercel.app/api/download?url=${encodeURIComponent(link)}`;
    const { data } = await axios.get(apiUrl);

    if (
      !data ||
      data.status !== true ||
      !Array.isArray(data.video) ||
      !data.video[0]
    ) {
      throw new Error("Invalid API response");
    }

    const videoUrl = data.video[0];
    const caption = data.title || "TikTok Video";

    // --- STREAM TO DISK, ABORT IF OVERSIZED ---
    const response = await axios({
      method: "get",
      url: videoUrl,
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://www.tiktok.com/",
      },
    });

    // Bail out early using Content-Length header if available
    const contentLength = parseInt(response.headers["content-length"], 10);
    if (!isNaN(contentLength) && contentLength > SIZE_LIMIT) {
      response.data.destroy();
      return api.sendMessage(
        "❌ The video is too large to send via Messenger.",
        threadID,
        messageID,
      );
    }

    await new Promise((resolve, reject) => {
      let totalBytes = 0;
      const writer = fs.createWriteStream(filePath);

      response.data.on("data", (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > SIZE_LIMIT) {
          writer.destroy();
          response.data.destroy();
          reject(new Error("FILE_TOO_LARGE"));
        }
      });

      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // --- SEND VIDEO ---
    api.sendMessage(
      {
        body: `🎬 **TikTok Downloader**\n\n📝: ${caption}`,
        attachment: fs.createReadStream(filePath),
      },
      threadID,
      () => cleanup(),
      messageID,
    );
  } catch (err) {
    cleanup();

    if (err.message === "FILE_TOO_LARGE") {
      return api.sendMessage(
        "❌ The video is too large to send via Messenger.",
        threadID,
        messageID,
      );
    }

    console.error("TikTok Handler Error:", err.message);
    api.sendMessage(
      "❌ Unable to download this TikTok video. The link might be private or the server is busy.",
      threadID,
      messageID,
    );
  }
};
