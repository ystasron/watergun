const OWNERS = new Set(["100054572653414", "100008816886962"]);

module.exports = function (api, event) {
  const { body, threadID, senderID } = event;

  if (!OWNERS.has(senderID)) {
    return api.sendMessage(
      "❌ You cannot access this command. You are not the bot owner.",
      threadID,
    );
  }

  const targetThreadID = body.replace(/^\/accept\s*/i, "").trim();
  if (!targetThreadID) {
    return api.sendMessage("⚠️ Need ID.", threadID);
  }

  api.handleMessageRequest(targetThreadID, true, (err) => {
    if (err) {
      console.error("handleMessageRequest error:", err);
      return api.sendMessage(
        "❌ Failed to accept the request. Double-check the ID.",
        threadID,
      );
    }

    api.getThreadInfo(targetThreadID, (err, threadInfo) => {
      if (err) {
        console.error("getThreadInfo error:", err);
        return api.sendMessage("❌ Could not fetch group info.", threadID);
      }

      const groupName = threadInfo.threadName || "Unnamed Group";
      const memberCount = threadInfo.participantIDs?.length ?? 0;

      api.sendMessage(
        `✅ "${groupName}" with ${memberCount} members has been accepted.`,
        threadID,
      );
    });
  });
};
