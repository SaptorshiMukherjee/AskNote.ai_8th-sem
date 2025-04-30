import * as pdfjsLib from 'pdfjs-dist';
import { generateAnswer } from './aiService'; // <-- import the AI function

// Configure PDF.js worker with a more reliable CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PageContent {
  text: string;
  pageNum: number;
}

// PDF caching
const pdfCache = new Map<string, { pdf: any, timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

const hashFile = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const getCachedPDF = async (file: File) => {
  const key = await hashFile(file);
  const cached = pdfCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.pdf;
  }
  
  const pdf = await loadPDF(file);
  pdfCache.set(key, { pdf, timestamp: Date.now() });
  return pdf;
};

const loadPDF = async (file: File) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);
    
    // Configure PDF.js with proper options
    const loadingTask = pdfjsLib.getDocument({
      data: typedArray,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
      disableFontFace: false,
      fontExtraProperties: true,
      useSystemFonts: false,
      enableXfa: true,
    });

    const pdf = await loadingTask.promise;
    return pdf;
  } catch (error) {
    console.error('Error loading PDF:', error);
    if (error instanceof Error) {
      if (error.message.includes('password')) {
        throw new Error('This PDF is password protected. Please provide the password.');
      } else if (error.message.includes('corrupt')) {
        throw new Error('The PDF file is corrupted. Please try a different file.');
      }
    }
    throw new Error('Failed to load PDF file. Please try again.');
  }
};

export const extractTextFromPDF = async (file: File): Promise<{ fullText: string, pageContents: PageContent[] }> => {
  if (!file) {
    throw new Error('No file provided');
  }

  if (file.type !== 'application/pdf') {
    throw new Error('Invalid file type. Please upload a PDF file.');
  }

  try {
    // Load the PDF document
    const pdf = await getCachedPDF(file);

    if (!pdf || !pdf.numPages) {
      throw new Error('Invalid PDF document structure');
    }

    let fullText = '';
    const pageContents: PageContent[] = [];

    // Process each page with enhanced error handling
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent({
          normalizeWhitespace: true,
          disableCombineTextItems: false,
        });
        
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
    console.error('PDF processing error:', error);
    if (error instanceof Error) {
      throw error; // Re-throw the original error if it's already an Error object
    }
    throw new Error('Failed to process PDF file');
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
