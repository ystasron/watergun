const google = require("googlethis");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// 1. Define the path as temp/img
const tempDir = path.join(__dirname, "..", "temp", "img");

// 2. Use recursive: true so it creates 'temp' then 'img' automatically
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

module.exports = async (api, event) => {
  const { threadID, messageID, body } = event;

  // Extract query (Assuming command is like "/img dog")
  const query = body.includes(" ") ? body.split(" ").slice(1).join(" ") : "";

  if (!query) {
    return api.sendMessage(
      "⚠️ Please enter a search term. Usage: /img [text]",
      threadID,
      messageID
    );
  }

  api.sendMessage(`🔎 Searching images for "${query}"...`, threadID, messageID);

  try {
    // 1. Search Google Images
    const results = await google.image(query, { safe: false });

    if (!results || results.length === 0) {
      return api.sendMessage(
        "⚠️ No images found for that search.",
        threadID,
        messageID
      );
    }

    const streams = [];
    const limit = 6;
    let count = 0;

    // 2. Prepare Parallel Downloads
    const downloadPromises = [];

    for (const image of results) {
      if (count >= limit) break;

      const url = image.url;
      // Basic check for valid image extensions
      if (!url.match(/\.(jpg|jpeg|png|webp|gif)$/i)) continue;

      const imgPath = path.join(tempDir, `img_${Date.now()}_${count}.jpg`);

      // Push download task to our parallel list
      const downloadTask = axios
        .get(url, { responseType: "stream", timeout: 5000 })
        .then((response) => {
          return new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(imgPath);
            response.data.pipe(writer);
            writer.on("finish", () => resolve(imgPath));
            writer.on("error", reject);
          });
        })
        .catch(() => null); // Ignore failed downloads

      downloadPromises.push(downloadTask);
      count++;
    }

    // 3. Wait for all downloads to finish
    const downloadedPaths = (await Promise.all(downloadPromises)).filter(
      (p) => p !== null
    );

    if (downloadedPaths.length === 0) {
      return api.sendMessage(
        "❌ Failed to download any images. Try a different search.",
        threadID,
        messageID
      );
    }

    // 4. Create ReadStreams for attachment
    const attachments = downloadedPaths.map((p) => fs.createReadStream(p));

    // 5. Send results
    api.sendMessage(
      {
        body: `🖼️ Here are the top ${downloadedPaths.length} results for: ${query}`,
        attachment: attachments,
      },
      threadID,
      () => {
        // 6. Delete all temp files after sending
        downloadedPaths.forEach((p) => {
          if (fs.existsSync(p)) fs.unlinkSync(p);
        });
      },
      messageID
    );
  } catch (error) {
    console.error("Image Search Error:", error);
    api.sendMessage(
      "❌ An error occurred during the search.",
      threadID,
      messageID
    );
  }
};
