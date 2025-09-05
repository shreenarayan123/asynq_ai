import OpenAI from 'openai';

let openai = null;

const initialize = async () => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ No OpenAI API key found in environment variables.');
    return;
  }

  openai = new OpenAI({ apiKey });
  console.log('✅ OpenAI client initialized');
};

/**
 * Generate AI response to a message
 */
const generateResponse = async (message) => {
  if (!openai) {
    await initialize();
    if (!openai) return "AI not available right now. Try again later.";
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `
          You are chatting on WhatsApp. Follow these rules strictly:
          - Never introduce yourself or say you're an AI
          - Don't act like an assistant
          - Reply casually like a real person
          - Match tone, style, and language of the user
          - Keep it short, natural, and use emojis when appropriate
          `
        },
        { role: "user", content: message }
      ],
      max_tokens: 150,
      temperature: 0.8
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('❌ Error generating AI response:', error.message);
    return "Something went wrong, try again in a bit.";
  }
};

/**
 * Reinitialize client with current env key
 */
const updateApiKey = async () => {
  await initialize();
  return { success: !!openai };
};

export { initialize, generateResponse, updateApiKey };
