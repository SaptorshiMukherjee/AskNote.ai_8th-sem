import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

interface PDFViewerProps {
  file: File | null;
}

const PDFViewer = memo(({ file }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);
  const { toast } = useToast();

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pageRefsInitialized = useRef(false);

  // Create PDF URL from file
  useEffect(() => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setIsLoading(true);
    setError(null);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    pageRefs.current = new Array(numPages).fill(null);
    pageRefsInitialized.current = true;
  };

  const onDocumentLoadError = (error: Error) => {
    setError('Failed to load PDF. Please try again.');
    console.error('PDF load error:', error);
    setIsLoading(false);
  };

  const changeScale = useCallback((delta: number) => {
    setScale(prev => {
      const newScale = Math.min(Math.max(0.5, prev + delta), 1.0);
      if (newScale > 1.0) {
        toast({
          title: "Zoom Limit Reached",
          description: "Maximum zoom level is 100%",
          variant: "destructive",
        });
        return 1.0;
      }
      return newScale;
    });
  }, [toast]);

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        No PDF uploaded
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500 dark:text-red-400">
        {error}
        <Button onClick={() => setError(null)} className="mt-4" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* PDF Viewer */}
      <div className="flex-1 flex flex-col h-full" ref={containerRef}>
        {/* Controls */}
        <div className="flex-none border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => changeScale(-0.1)} 
                disabled={scale <= 0.5}
                className="hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => changeScale(0.1)} 
                disabled={scale >= 1.0}
                className="hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* PDF Content */}
        <ScrollArea className="flex-1 h-[calc(100%-3rem)]" ref={scrollRef}>
          <div className="flex flex-col items-center py-4 max-w-full">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<p className="text-gray-500 dark:text-gray-400">Loading PDF…</p>}
              options={{
                cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                cMapPacked: true,
                standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
              }}
            >
              {Array.from(new Array(numPages), (_, i) => (
                <div 
                  key={`page_${i + 1}`} 
                  ref={el => {
                    if (el) {
                      pageRefs.current[i] = el;
                    }
                  }}
                  className="mb-4 px-4 w-full max-w-5xl"
                >
                  <Page
                    pageNumber={i + 1}
                    scale={scale}
                    className="shadow-lg mx-auto"
                    renderAnnotationLayer
                    renderTextLayer
                    width={Math.min(containerWidth - 48, 896)}
                    loading={<div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-[500px] w-full" />}
                  />
                </div>
              ))}
            </Document>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
});

PDFViewer.displayName = 'PDFViewer';

export default PDFViewer;
