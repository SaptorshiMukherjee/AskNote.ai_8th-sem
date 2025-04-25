import * as pdfjsLib from 'pdfjs-dist';
import { generateAnswer } from './aiService'; // <-- import the AI function

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PageContent {
  text: string;
  pageNum: number;
}

export const extractTextFromPDF = async (file: File): Promise<{ fullText: string, pageContents: PageContent[] }> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);
    const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;

    let fullText = '';
    const pageContents: PageContent[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => 'str' in item ? item.str : '').join(' ');

      pageContents.push({ text: pageText, pageNum });
      fullText += pageText + '\n\n';
    }

    return { fullText: fullText.trim(), pageContents };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
};

export const findRelevantContext = (
  pdfText: string,
  pageContents: PageContent[],
  question: string
): { context: string, pages: number[] } => {
  if (!pdfText || pdfText.trim() === '') return { context: '', pages: [] };

  const searchTerm = question.toLowerCase().trim();
  const paragraphs = pdfText.split(/\n\n+/).filter(p => p.trim().length > 0);

  const matches = paragraphs.filter(p => p.toLowerCase().includes(searchTerm));
  const context = matches.length > 0 ? matches.join('\n\n') : pdfText.slice(0, 3000); // fallback to summary

  const matchedPages: number[] = [];
  for (const match of matches) {
    for (const page of pageContents) {
      if (page.text.includes(match.slice(0, 100)) && !matchedPages.includes(page.pageNum)) {
        matchedPages.push(page.pageNum);
      }
    }
  }

  return {
    context,
    pages: matchedPages.sort((a, b) => a - b)
  };
};

export const answerQuestion = async (
  pdfText: string,
  pageContents: PageContent[],
  question: string
): Promise<string> => {
  try {
    if (!pdfText || pdfText.trim() === '') {
      return "📄 I didn't detect any content in your document. Please upload a readable PDF!";
    }

    const { context, pages } = findRelevantContext(pdfText, pageContents, question);
    return await generateAnswer(context, pages, question);

  } catch (error) {
    console.error("Error answering question:", error);
    return "⚠️ Something went wrong while trying to answer your question.";
  }
};
