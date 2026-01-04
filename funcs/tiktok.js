const Tiktok = require("@tobyg74/tiktok-api-dl");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = async function (api, event) {
  if (!event || !event.body || !event.threadID) return;

  const { threadID, messageID, body } = event;

  // --- EXTRACT THE FIRST WORD THAT CONTAINS tiktok.com ---
  const link = body.split(" ").find((word) => word.includes("tiktok.com"));

  if (!link) return;

  const dir = path.join(__dirname, "..", "temp", "tiktok");
  const filePath = path.join(dir, `${Date.now()}.mp4`);

  try {
    // --- FETCH TIKTOK DATA ---
    const result = await Tiktok.Downloader(link, { version: "v1" });
    if (!result?.status || !result?.result) return;

    const videoObj =
      result.result.video || result.result.video1 || result.result.video_hd;

    if (!videoObj) return;

    // --- AUTO-SELECT HIGHEST QUALITY NON-WATERMARK ---
    let videoUrl = "";

    if (Array.isArray(videoObj.downloadAddr)) {
      // Prefer non-watermarked videos first
      videoUrl =
        videoObj.downloadAddr.find((u) => !u.includes("watermark=1")) ||
        videoObj.downloadAddr[0];
    }

    // fallback to playAddr if downloadAddr empty
    if (!videoUrl && Array.isArray(videoObj.playAddr)) {
      videoUrl = videoObj.playAddr[0];
    }

    if (!videoUrl || typeof videoUrl !== "string") return;

    const caption = result.result.desc || result.result.description || "";

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // --- DOWNLOAD STREAM ---
    const response = await axios({
      method: "get",
      url: videoUrl,
      responseType: "stream",
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // --- SEND VIDEO ---
    api.sendMessage(
      {
        body: caption,
        attachment: fs.createReadStream(filePath),
      },
      threadID,
      () => {
        fs.unlink(filePath, () => {});
      },
      messageID
    );
  } catch {
    // SILENT FAIL
    if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});
  }
};
