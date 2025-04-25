import OpenAI from 'openai';
import { PageContent } from '@/types/pdf';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": import.meta.env.VITE_SITE_URL,
    "X-Title": import.meta.env.VITE_SITE_NAME,
  },
  dangerouslyAllowBrowser: true // Important for browser use
});

export const findExternalResources = (topic: string): { google: string, youtube: string } => {
  const encodedTopic = encodeURIComponent(topic);
  return {
    google: `https://www.google.com/search?q=${encodedTopic}`,
    youtube: `https://www.youtube.com/results?search_query=${encodedTopic}`
  };
};

export const generateAnswer = async (
  context: string,
  pages: number[],
  question: string
): Promise<string> => {
  try {
    console.log("DEBUG | Question:", question);
    console.log("DEBUG | Context:", context.slice(0, 300));
    console.log("DEBUG | Pages:", pages);

    if (!context || context.trim() === '') {
      return "I don't see any content to work with in the document yet. Could you try uploading a document first? I'd love to help answer your questions! 🤗";
    }

    const prompt = `
You're a helpful assistant that provides insightful and concise answers based on document context.
Document Context:
${context}

Question: ${question}
Answer:
`;

    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-4-maverick:free",
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const aiAnswer = completion.choices?.[0]?.message?.content || "⚠️ I couldn't generate a good answer. Try again!";

    const { google, youtube } = findExternalResources(question);
    const externalResources = `\n\n🔍 External resources:\n- [Google Search](${google})\n- [YouTube Videos](${youtube})`;

    const pagesNote = pages.length
      ? `\n\n📄 This was found on page${pages.length > 1 ? 's' : ''} ${pages.join(', ')}.`
      : '';

    return `💡 Document insights:\n\n${aiAnswer}${pagesNote}${externalResources}\n\n✨ Let me know if you need more info!`;
  } catch (error) {
    console.error("OpenRouter API error:", error);
    return "⚠️ Oops! Something went wrong while fetching the answer from Meta LLaMA.";
  }
};
