module.exports = function (api, event) {
  const { body, threadID: currentThreadID, senderID } = event;

  // Access control
  if (senderID !== "100054572653414" && senderID !== "100008816886962") {
    return api.sendMessage(
      "❌ You cannot access this command. You are not the bot owner.",
      currentThreadID
    );
  }

  // Extract bio from message body
  const bio = body.replace(/^\/bio\s*/i, "").trim();
  if (!bio) {
    return api.sendMessage("⚠️ Please provide a bio.", currentThreadID);
  }

  // Change bio
  api.changeBio(bio, (err) => {
    if (err) {
      return api.sendMessage("❌ Failed to change bio. The API returned an error.", currentThreadID);
    }
    api.sendMessage("✅ Bio successfully updated.", currentThreadID);
  });
};
