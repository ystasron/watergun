// Defined at module level — easy to add/remove owners without touching logic
const OWNERS = new Set(["100054572653414", "100008816886962"]);

module.exports = function (api, event) {
  const { body, threadID, senderID } = event;

  if (!OWNERS.has(senderID)) {
    return api.sendMessage(
      "❌ You cannot access this command. You are not the bot owner.",
      threadID,
    );
  }

  const bio = body.replace(/^\/bio\s*/i, "").trim();
  if (!bio) {
    return api.sendMessage("⚠️ Please provide a bio.", threadID);
  }

  api.changeBio(bio, (err) => {
    if (err) {
      console.error("Bio change error:", err);
      return api.sendMessage(
        "❌ Failed to change bio. The API returned an error.",
        threadID,
      );
    }
    api.sendMessage("✅ Bio successfully updated.", threadID);
  });
};
