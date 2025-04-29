import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { File, Heart, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DocumentUploaderProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

const DocumentUploader = ({ onFileUpload, isLoading }: DocumentUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (isValidFileType(file.type)) {
        onFileUpload(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (isValidFileType(file.type)) {
        onFileUpload(file);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF file.",
          variant: "destructive"
        });
      }
    }
  };

  const isValidFileType = (fileType: string): boolean => {
    return fileType === 'application/pdf';
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300",
        "hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100",
        "bg-gradient-to-br from-blue-50 to-white",
        "dark:from-blue-950 dark:to-gray-950 dark:border-blue-800/50 dark:hover:border-blue-600 dark:hover:shadow-blue-900/50",
        isDragging 
          ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30" 
          : "border-blue-200 dark:border-blue-800/30",
        "transform transition-transform duration-200 ease-in-out"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf"
        onChange={handleFileSelect}
      />
      <div className="relative">
        <FileText className="mx-auto h-12 w-12 text-blue-500 dark:text-blue-400 mb-4 transform transition-transform group-hover:scale-110 duration-200" />
        <h3 className="text-lg font-medium mb-3 text-blue-900 dark:text-white">
          Upload Your Document
        </h3>
        <p className="text-blue-600 dark:text-blue-400 mb-4 text-sm">
          Drag and drop your PDF file here or click to browse
        </p>
        <Button 
          onClick={handleButtonClick} 
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 transform hover:scale-105 px-6
                   dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
        >
          {isLoading ? 'Processing...' : 'Choose File'}
        </Button>
      </div>
    </div>
  );
};

export default DocumentUploader;
