const axios = require("axios");

module.exports = async (api, event, args) => {
  const { threadID, messageID } = event;
  const urlToShorten = args.join(" ");

  if (!urlToShorten) {
    return api.sendMessage(
      "❌ Please provide a URL.\nUsage: /shorten [link]",
      threadID,
      messageID,
    );
  }

  try {
    // Requesting the shortened link from Vurl
    const response = await axios.get(
      `https://vurl.com/api.php?url=${encodeURIComponent(urlToShorten)}`,
    );
    const shortUrl = response.data;

    const infoMessage =
      `🔗 **URL Shortener**\n\n` +
      `🔹 **Original:** ${urlToShorten}\n` +
      `✅ **Shortened:** ${shortUrl}\n\n`;

    api.sendMessage(infoMessage, threadID, messageID);
  } catch (error) {
    api.sendMessage(
      "⚠️ Failed to shorten the link. Please ensure the URL is valid and try again.",
      threadID,
      messageID,
    );
  }
};
