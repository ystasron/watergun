module.exports = async (api, event) => {
  const { threadID, messageID } = event;

  // Pre-rephrased text (generated once, reused forever)
  const reply = `You can ask me anything at any time — just mention me or include "jarvis" in your message, and I’ll respond with AI-powered assistance. Whether you need information, inspiration, or just some fun interactions, I’m here to help!

Here’s a list of commands you can use to get started:

/song – Search for songs by title, artist, or genre, and I’ll provide links or previews so you can listen instantly.  
/image – Search for images on a wide variety of topics and receive them directly in your chat. Perfect for inspiration, references, or just fun visuals.  
/lyrics – Fetch the lyrics of your favorite songs. Just provide the song title (and optionally the artist), and I’ll bring the words to you.
/developer – Learn about the creator of this AI and the inspiration behind it. 

Feel free to experiment and combine these commands to explore music, art, and knowledge with ease. I’m always ready to help make your chat experience smarter and more interactive!`;

  api.sendMessage(
    reply,
    threadID,
    messageID
  );
};
