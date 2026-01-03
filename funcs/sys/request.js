module.exports = function (api, event) {
  const { body, threadID: currentThreadID, senderID } = event;

  // Access control
  if (senderID !== "100054572653414" && senderID !== "100008816886962") {
    return api.sendMessage(
      "❌ You cannot access this command. You are not the bot owner",
      currentThreadID
    );
  }

  // Extract target threadID
  const targetThreadID = body.replace(/^\/accept\s*/i, "").trim();

  if (!targetThreadID) {
    return api.sendMessage("⚠️ Need ID.", currentThreadID);
  }

  api.handleMessageRequest(targetThreadID, true, (err) => {
    if (err) {
      return api.sendMessage(
        "❌ Failed to accept the request. Double-check the ID.",
        currentThreadID
      );
    }

    api.getThreadInfo(targetThreadID, (err, threadInfo) => {
      if (err) {
        return api.sendMessage(
          "❌ Could not fetch group info.",
          currentThreadID
        );
      }

      const groupName = threadInfo.threadName || "Unnamed Group";
      const memberCount = Array.isArray(threadInfo.participantIDs)
        ? threadInfo.participantIDs.length
        : 0;

      api.sendMessage(
        `${groupName} with ${memberCount} members, has been accepted`,
        currentThreadID
      );
    });
  });
};
