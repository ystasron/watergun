module.exports = async (api, event) => {
  const { threadID, messageID } = event;

  // Pre-rephrased text (generated once, reused forever)
  const description = `This AI was created by Ron Funiestas to bring a smart, interactive assistant right to your chat. It’s packed with a variety of commands that you can use to get things done quickly and efficiently — from fetching information to generating content. To see the full list of available commands and learn how to use them, simply type /help.

The design and functionality of this AI are inspired by Jarvis from the Marvel Cinematic Universe, aiming to provide a helpful, responsive, and fun experience that feels like having your very own personal assistant at your fingertips. Whether you want to explore music, images, lyrics, or just interact with AI in creative ways, this assistant is ready to assist you anytime!`;

  api.sendMessage(description, threadID, messageID);
};
