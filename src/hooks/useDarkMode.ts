import { useState, useEffect } from 'react';

/**
 * Hook to detect if dark mode is active.
 *
 * This hook observes the document element for changes to the 'dark' class,
 * which is used by Tailwind CSS for dark mode styling.
 *
 * @returns boolean indicating whether dark mode is active
 *
 * @example
 * ```ts
 * const isDark = useDarkMode();
 * // isDark will be true when document.documentElement has the 'dark' class
 * ```
 */
export function useDarkMode(): boolean {
  // Initialize with current state
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    // Create a MutationObserver to watch for class changes on documentElement
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          setIsDark(document.documentElement.classList.contains('dark'));
          break;
        }
      }
    });

    // Start observing the document element for attribute changes
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Clean up the observer on unmount
    return () => {
      observer.disconnect();
    };
  }, []);

  return isDark;
}
