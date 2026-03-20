const axios = require("axios");

module.exports = async (api, event) => {
  const { threadID, messageID, body } = event;

  // Since your main file doesn't provide 'args', we extract them here.
  // We split the message by spaces and remove the first word (the command /shortenurl).
  const args = body.split(/\s+/);
  const urlToShorten = args[1]; // The second word should be the URL

  if (!urlToShorten) {
    return api.sendMessage(
      "❌ Please provide a URL.\n\nUsage: /shortenurl [link]",
      threadID,
      messageID,
    );
  }

  try {
    // Calling the Vurl API
    const response = await axios.get(
      `https://vurl.com/api.php?url=${encodeURIComponent(urlToShorten)}`,
    );
    const shortUrl = response.data;

    const infoMessage =
      `🔗 **URL Shortener**\n\n` +
      `🔹 **Original:** ${urlToShorten}\n` +
      `✅ **Shortened:** ${shortUrl}\n\n` +
      `ℹ️ **Details:**\n` +
      `• Expiration: Permanent\n` +
      `• Access: Public\n` +
      `• Clicks: Unlimited`;

    api.sendMessage(infoMessage, threadID, messageID);
  } catch (error) {
    console.error("Vurl Error:", error.message);
    api.sendMessage(
      "⚠️ Failed to shorten the link. Make sure it starts with http:// or https://",
      threadID,
      messageID,
    );
  }
};
