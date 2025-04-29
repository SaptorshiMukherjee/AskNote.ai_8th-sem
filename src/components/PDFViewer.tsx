import { useState, useEffect, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  LayoutGrid,
} from 'lucide-react';

// Configure PDF.js worker
if (typeof window !== 'undefined' && pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

interface PDFViewerProps {
  file: File | null;
}

const PDFViewer = ({ file }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMultiPage, setIsMultiPage] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const createPdfUrl = useCallback(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setError(null);
    setIsLoading(false);
  }, [file]);

  useEffect(() => {
    if (file) {
      setIsLoading(true);
      createPdfUrl();
    }
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [file]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setError(null);
    setIsLoading(false);
  };

  const onDocumentLoadError = (err: Error) => {
    setError('Failed to load PDF.');
    console.error(err);
    setIsLoading(false);
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    createPdfUrl();
  };

  const changePage = (offset: number) =>
    setPageNumber(p => Math.min(Math.max(1, p + offset), numPages));

  const changeScale = (delta: number) =>
    setScale(s => Math.min(Math.max(0.5, s + delta), 2.0));

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
        <Button onClick={handleRetry} className="mt-4" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Page Numbers Sidebar */}
      <div className="w-12 flex-shrink-0 border-r border-gray-200 dark:border-gray-800">
        <ScrollArea className="h-full scrollbar-none" type="hover">
          <div className="p-1">
            {Array.from(new Array(numPages), (_, i) => (
              <div
                key={`page_${i + 1}`}
                className={`
                  flex items-center justify-center p-1 mb-0.5 rounded cursor-pointer
                  transition-colors duration-200 text-sm
                  ${i + 1 === pageNumber 
                    ? 'bg-blue-500 text-white' 
                    : 'hover:bg-blue-100 dark:hover:bg-blue-900'
                  }
                `}
                onClick={() => {
                  setPageNumber(i + 1);
                  setIsMultiPage(false);
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 flex flex-col min-h-0" ref={containerRef}>
        {/* Fixed Controls */}
        <div className="flex-none border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="icon" onClick={() => changePage(-1)} disabled={pageNumber <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm min-w-[80px] text-center">
                {pageNumber}/{numPages}
              </span>
              <Button variant="ghost" size="icon" onClick={() => changePage(1)} disabled={pageNumber >= numPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsMultiPage(m => !m)}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => changeScale(-0.1)} disabled={scale <= 0.5}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
              <Button variant="ghost" size="icon" onClick={() => changeScale(0.1)} disabled={scale >= 2.0}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable PDF Content */}
        <div className="flex-1 overflow-y-auto">
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
              {isMultiPage
                ? Array.from(new Array(numPages), (_, i) => (
                    <div key={`page_${i + 1}`} className="mb-4 px-4 w-full max-w-5xl">
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
                  ))
                : (
                  <div className="px-4 w-full max-w-5xl">
                    <Page
                      key={`page_${pageNumber}`}
                      pageNumber={pageNumber}
                      scale={scale}
                      className="shadow-lg mx-auto"
                      renderAnnotationLayer
                      renderTextLayer
                      width={Math.min(containerWidth - 48, 896)}
                      loading={<div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-[500px] w-full" />}
                    />
                  </div>
                )}
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
