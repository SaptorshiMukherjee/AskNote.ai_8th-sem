import * as pdfjsLib from 'pdfjs-dist';
import { generateAnswer } from './aiService'; // <-- import the AI function

// Configure PDF.js worker
const workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.js`;
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface PageContent {
  text: string;
  pageNum: number;
}

export const extractTextFromPDF = async (file: File): Promise<{ fullText: string, pageContents: PageContent[] }> => {
  if (!file) {
    throw new Error('No file provided');
  }

  if (file.type !== 'application/pdf') {
    throw new Error('Invalid file type. Please upload a PDF file.');
  }

  try {
    // Load the PDF document
    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);
    
    // Create PDF document with enhanced error handling
    const loadingTask = pdfjsLib.getDocument({ data: typedArray });
    
    // Add specific error handler for loading
    loadingTask.onPassword = (updatePassword: (password: string) => void, reason: number) => {
      throw new Error('Password protected PDFs are not supported');
    };

    const pdf = await loadingTask.promise;

    if (!pdf || !pdf.numPages) {
      throw new Error('Invalid PDF document structure');
    }

    let fullText = '';
    const pageContents: PageContent[] = [];

    // Process each page with enhanced error handling
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        if (!textContent || !textContent.items) {
          console.warn(`No text content found on page ${pageNum}`);
          continue;
        }

        const pageText = textContent.items
          .map(item => 'str' in item ? item.str : '')
          .join(' ')
          .trim();

        if (pageText) {
          pageContents.push({ text: pageText, pageNum });
          fullText += pageText + '\n\n';
        }
      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
        // Continue with other pages even if one fails
        continue;
      }
    }

    // Check if we got any content
    if (!fullText.trim()) {
      throw new Error('No readable text found in the PDF. The document might be scanned or contain only images.');
    }

    return { 
      fullText: fullText.trim(), 
      pageContents: pageContents.filter(page => page.text.trim().length > 0) 
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to process PDF: ${error.message}`);
    } else {
      throw new Error('Failed to process PDF: Unknown error occurred');
    }
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
