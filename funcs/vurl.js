const axios = require("axios");

module.exports = async (api, event) => {
  const { threadID, messageID, body } = event;

  const args = body.split(/\s+/);
  let query = args[1];

  if (!query) {
    return api.sendMessage("❌ Usage: /shortenurl [URL]", threadID, messageID);
  }

  // 1. Check if it's a valid domain structure (e.g., something.com)
  // This regex checks for a "word.word" pattern
  const domainPattern = /^[^\s$.?#]+\.[^\s]{2,}$/i;

  // 2. If it doesn't start with http, but looks like a domain, add https://
  if (!query.startsWith("http://") && !query.startsWith("https://")) {
    if (domainPattern.test(query)) {
      query = "https://" + query;
    } else {
      return api.sendMessage(
        "🚫 That doesn't look like a valid link or domain.",
        threadID,
        messageID,
      );
    }
  }

  try {
    const response = await axios.get(
      `https://vurl.com/api.php?url=${encodeURIComponent(query)}`,
    );
    const shortUrl = response.data;

    const infoMessage =
      `🔗 **URL Shortener**\n\n` +
      `🔹 **Original:** ${query}\n` +
      `✅ **Shortened:** ${shortUrl}\n\n` +
      `ℹ️ **Details:**\n` +
      `• Expiration: Permanent\n` +
      `• Note: Added https:// automatically`;

    api.sendMessage(infoMessage, threadID, messageID);
  } catch (error) {
    api.sendMessage(
      "⚠️ API Error. The link might be invalid or the service is down.",
      threadID,
      messageID,
    );
  }
};
