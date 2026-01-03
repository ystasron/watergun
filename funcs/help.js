module.exports = async (api, event) => {
  const { threadID, messageID } = event;

  // Pre-rephrased text (generated once, reused forever)
  const reply = `You can ask me anything anytime — just mention me or include "jarvis" in your message and I’ll respond with AI-powered help.

Available commands:

/song – Search for and send music
/image – Search for and send images`;

  api.sendMessage(
    `${reply}\n\n\n𝑪𝒓𝒆𝒂𝒕𝒆𝒅 𝒃𝒚: 𝑹𝒐𝒏 𝑭𝒖𝒏𝒊𝒆𝒔𝒕𝒂𝒔\n𝑽𝒆𝒓𝒔𝒊𝒐𝒏: 𝑱𝑨𝑹𝑽𝑰𝑺 3.3.9`,
    threadID,
    messageID
  );
};
