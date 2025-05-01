import { useState, useEffect, memo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/use-theme';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
} from 'lucide-react';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  file: File | null;
}

const PDFViewer = memo(({ file }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const { theme } = useTheme();

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handlePreviousPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  };

  const handleNextPage = () => {
    if (pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
    }
  };

  const handleZoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prevRotation => (prevRotation + 90) % 360);
  };

  const handleDownload = () => {
    if (file) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file);
      link.download = file.name;
      link.click();
    }
  };

  if (!file || !pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        No PDF uploaded
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreviousPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {pageNumber} of {numPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextPage}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRotate}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto p-4">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
          }
          error={
            <div className="flex items-center justify-center h-full text-red-500">
              Failed to load PDF
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            rotate={rotation}
            className="mx-auto"
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>
    </div>
  );
});

PDFViewer.displayName = 'PDFViewer';

export default PDFViewer;
