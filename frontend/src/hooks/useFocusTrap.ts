import { useEffect, useRef } from 'react';

/**
 * useFocusTrap - Trap keyboard focus within a modal/dialog
 * 
 * When isActive is true, this hook:
 * - Moves focus to the first focusable element in the container
 * - Traps Tab key navigation within the container
 * - Returns focus to the previously focused element when deactivated
 * 
 * @param containerRef - Ref to the modal/dialog container
 * @param isActive - Whether focus trap should be active
 */
export function useFocusTrap(containerRef: useRef<HTMLDivElement>, isActive: boolean) {
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    
    // Store the previously focused element
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    // Find all focusable elements within the container
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus the first element
    firstElement.focus();

    // Handle Tab key navigation
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab: move to previous element
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: move to next element
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);

    // Cleanup: restore focus to previous element
    return () => {
      container.removeEventListener('keydown', handleTab);
      previousActiveElementRef.current?.focus();
    };
  }, [isActive, containerRef]);
}
