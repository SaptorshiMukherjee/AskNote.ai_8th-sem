import { useEffect, useCallback } from 'react';

interface KeyboardNavigationOptions {
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleDarkMode?: () => void;
  onToggleFitWidth?: () => void;
  onSearch?: () => void;
  onPrint?: () => void;
}

export const useKeyboardNavigation = ({
  onNextPage,
  onPrevPage,
  onZoomIn,
  onZoomOut,
  onToggleDarkMode,
  onToggleFitWidth,
  onSearch,
  onPrint,
}: KeyboardNavigationOptions) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Prevent default behavior for these keys
    if (
      e.key === 'ArrowRight' ||
      e.key === 'ArrowLeft' ||
      e.key === '+' ||
      e.key === '-' ||
      e.key === 'd' ||
      e.key === 'f' ||
      e.key === 'p' ||
      e.key === '/'
    ) {
      e.preventDefault();
    }

    // Navigation
    if (e.key === 'ArrowRight' && onNextPage) onNextPage();
    if (e.key === 'ArrowLeft' && onPrevPage) onPrevPage();

    // Zoom
    if (e.key === '+' && onZoomIn) onZoomIn();
    if (e.key === '-' && onZoomOut) onZoomOut();

    // Toggle dark mode
    if (e.key === 'd' && e.ctrlKey && onToggleDarkMode) onToggleDarkMode();

    // Toggle fit to width
    if (e.key === 'f' && e.ctrlKey && onToggleFitWidth) onToggleFitWidth();

    // Print
    if (e.key === 'p' && e.ctrlKey && onPrint) onPrint();

    // Search
    if (e.key === '/' && onSearch) onSearch();
  }, [
    onNextPage,
    onPrevPage,
    onZoomIn,
    onZoomOut,
    onToggleDarkMode,
    onToggleFitWidth,
    onPrint,
    onSearch,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}; 