// Speed and reliability optimizations by Claude

const google = require("googlethis");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const tempDir = path.join(__dirname, "..", "temp", "img");
fs.mkdirSync(tempDir, { recursive: true }); // No need for existsSync guard

const LIMIT = 6;
const VALID_EXT = /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i; // Handle URLs with query strings

module.exports = async (api, event) => {
  const { threadID, messageID, body } = event;

  const query = body.includes(" ") ? body.split(" ").slice(1).join(" ") : "";

  if (!query) {
    return api.sendMessage(
      "⚠️ Please enter a search term. Usage: /img [text]",
      threadID,
      messageID,
    );
  }

  // Fire status message without awaiting — no need to block on it
  api.sendMessage(`🔎 Searching images for "${query}"...`, threadID, messageID);

  try {
    const results = await google.image(query, { safe: false });

    if (!results || results.length === 0) {
      return api.sendMessage(
        "⚠️ No images found for that search.",
        threadID,
        messageID,
      );
    }

    // Filter valid URLs upfront, then slice — avoids iterating with a manual counter
    const validUrls = results
      .map((img) => img.url)
      .filter((url) => VALID_EXT.test(url))
      .slice(0, LIMIT);

    if (validUrls.length === 0) {
      return api.sendMessage(
        "⚠️ No valid image URLs found. Try a different search.",
        threadID,
        messageID,
      );
    }

    // Download all in parallel, each streamed directly to disk
    const downloadPromises = validUrls.map((url, i) => {
      const imgPath = path.join(tempDir, `img_${Date.now()}_${i}.jpg`);
      return axios
        .get(url, { responseType: "stream", timeout: 5000 })
        .then(
          (response) =>
            new Promise((resolve, reject) => {
              const writer = fs.createWriteStream(imgPath);
              response.data.pipe(writer);
              writer.on("finish", () => resolve(imgPath));
              writer.on("error", reject);
            }),
        )
        .catch(() => null); // Silently skip failed downloads
    });

    const downloadedPaths = (await Promise.all(downloadPromises)).filter(
      Boolean,
    );

    if (downloadedPaths.length === 0) {
      return api.sendMessage(
        "❌ Failed to download any images. Try a different search.",
        threadID,
        messageID,
      );
    }

    const attachments = downloadedPaths.map((p) => fs.createReadStream(p));

    api.sendMessage(
      {
        body: `🖼️ Here are the top ${downloadedPaths.length} results for: ${query}`,
        attachment: attachments,
      },
      threadID,
      () => {
        // Async cleanup after send
        downloadedPaths.forEach((p) =>
          fs.rm(p, (err) => {
            if (err && err.code !== "ENOENT")
              console.error("Cleanup error:", err);
          }),
        );
      },
      messageID,
    );
  } catch (error) {
    console.error("Image Search Error:", error);
    api.sendMessage(
      "❌ An error occurred during the search.",
      threadID,
      messageID,
    );
  }
};
