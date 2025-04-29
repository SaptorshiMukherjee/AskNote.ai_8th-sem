import OpenAI from 'openai';
import { PageContent } from '@/types/pdf';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': import.meta.env.VITE_SITE_URL,
    'X-Title': import.meta.env.VITE_SITE_NAME,
  },
  dangerouslyAllowBrowser: true,
});

// Function to detect the tone in user's query
const detectTone = async (
  text: string
): Promise<'greeting' | 'goodbye' | 'thanks' | 'topic' | 'casual'> => {
  const tonePrompt = `
Classify the tone of this user message strictly into one of the following categories:
- "greeting" (e.g., "hey", "how are you", "hello")
- "goodbye" (e.g., "bye", "see you later", "goodnight")
- "thanks" (e.g., "thanks", "thank you", "appreciate it")
- "casual" (e.g., "what's up?", "how's it going?")
- "topic" (asking about a subject, e.g., "What is blockchain?")

Only reply with one of these labels: greeting, goodbye, thanks, casual, topic

Message: "${text}"
Answer:
  `;

  const result = await openai.chat.completions.create({
    model: 'meta-llama/llama-4-maverick:free',
    messages: [{ role: 'user', content: tonePrompt }],
    temperature: 0.7,
  });

  return result.choices?.[0]?.message?.content?.trim().toLowerCase() as any;
};

// Function to fetch external Google and YouTube links
export const findExternalResources = (topic: string): { google: string; youtube: string } => {
  const encodedTopic = encodeURIComponent(topic);

  return {
    google: `https://www.google.com/search?q=${encodedTopic}`,
    youtube: `https://www.youtube.com/results?search_query=${encodedTopic}`,
  };
};

// Main function to generate the answer
export const generateAnswer = async (
  context: string,
  pages: number[],
  question: string
): Promise<string> => {
  try {
    if (!context || context.trim() === '') {
      return "Oops! Looks like there's no content to work with. 🤔 Please upload a document so I can help you out! 📄";
    }

    const tone = await detectTone(question);

    // Handle different tones
    if (tone === 'greeting') {
      return "Hey there! 👋 I'm doing awesome — just hanging out in the cloud ☁️ and ready to assist you. What can I help you with today? 😊";
    }

    if (tone === 'goodbye') {
      return "Bye for now! 👋 Catch you later, and feel free to come back anytime. 🌟";
    }

    if (tone === 'thanks') {
      return "You're welcome! 😊 I'm here anytime if you need more info. 🔍";
    }

    if (tone === 'casual') {
      return "Haha, I'm all good in the cloud! 😄 What are you looking to explore today? 💬";
    }

    if (tone === 'topic') {
      const prompt = `
You're a modern, expert-level professor with a friendly vibe. You explain topics in a way that's easy to understand, while keeping things casual and fun! Your answers should:

- Use **headings** to organize key concepts and groups of information 📑
- Include numbered points **bullet points** for listsor groups of information ✔️
- Add less **emojis** to keep it engaging 🎉
- Be **descriptive** and easy to understand 🧠

Here’s the context from the document:
${context}

And the user’s question:
${question}

Answer:
      `;

      const completion = await openai.chat.completions.create({
        model: 'meta-llama/llama-4-maverick:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      });

      const aiAnswer = completion.choices?.[0]?.message?.content || "Oops! Something went wrong. 😬 Try again!";

      const pagesNote = pages.length
        ? `\n\n📄 This info came from page${pages.length > 1 ? 's' : ''} ${pages.join(', ')}.`
        : '';

      const { google, youtube } = findExternalResources(question);

      const externalResources = `
🔍 **External resources**:
- [Google Search](${google})
- [YouTube Videos](${youtube})
      `;

      return `
💡 **Answer for your question:** 

${aiAnswer}

${pagesNote}

${externalResources}

✨ Let me know if you'd like to dive deeper! 😊
      `;
    }

    return "Sorry, I didn't quite catch that. Can you rephrase or ask something else? 🤔";
  } catch (error) {
    console.error('Error fetching answer:', error);
    return "⚠️ Oops! Something went wrong while processing your question. Try again later. 😕";
  }
};
