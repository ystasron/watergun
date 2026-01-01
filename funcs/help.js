const { Mistral } = require("@mistralai/mistralai");

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY || "ChyRy431UGbOG5lrDjAoAhcTfqY9wPZC",
});

module.exports = async (api, event) => {
  const { threadID, messageID, body } = event;

  const rephrase = `Feel free to ask me anything—just mention me or include "jarvis" in your text to get an AI-powered response.

Available Commands:

/song: Search and send music
/image: Search and send images`;

  try {
    const result = await mistral.agents.complete({
      agentId: "ag_019b6bd2a2e674eb8856e455b3125591",
      messages: [
        {
          role: "user",
          content: rephrase,
        },
        {
          role: "system",
          content: `REPHRASE THE TEXT. ONLY SEND THE REPHRASED VERSION. DO NOT INCLUDE 'HERE IS THE REPHRASED TEXT:' OR ANYTHING ELSE.`,
        },
      ],
    });

    // Use the AI response if it exists, otherwise fall back to the original text
    const reply = result.choices?.[0]?.message?.content || rephrase;

    api.sendMessage(
      `${reply}\n\n\n𝑪𝒓𝒆𝒂𝒕𝒆𝒅 𝒃𝒚: 𝑹𝒐𝒏 𝑭𝒖𝒏𝒊𝒆𝒔𝒕𝒂𝒔\n𝑽𝒆𝒓𝒔𝒊𝒐𝒏: 𝑱𝑨𝑹𝑽𝑰𝑺 3.3.9`,
      threadID,
      messageID
    );
  } catch (error) {
    console.error("Error communicating with Mistral, sending original:", error);

    // If the API fails, send the unrephrased version as requested
    api.sendMessage(
      `${rephrase}\n\n\n𝑪𝒓𝒆𝒂𝒕𝒆𝒅 𝒃𝒚: 𝑹𝒐𝒏 𝑭𝒖𝒏𝒊𝒆𝒔𝒕𝒂𝒔\n𝑽𝒆𝒓𝒔𝒊𝒐𝒏: 𝑱𝑨𝑹𝑽𝑰𝑺 3.3.9`,
      threadID,
      messageID
    );
  }
};
