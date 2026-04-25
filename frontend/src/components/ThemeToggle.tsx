import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const STORAGE_KEY = 'hazina-theme';

function getInitialIsDark(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light') return false;
  if (stored === 'dark') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * ThemeToggle – a button that switches between light and dark themes.
 * Adds/removes the "dark" class on the <html> element and persists the
 * choice in localStorage. The component is fully accessible:
 *  - It is a <button> element with an aria-label that updates according to the current theme.
 *  - Keyboard users can focus and activate it with Space/Enter.
 *  - The visual icon conveys the current mode and has aria-hidden="true".
 */
export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(getInitialIsDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    window.localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggle = () => setIsDark((prev) => !prev);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center justify-center p-2 rounded-full hover:bg-gold/10 focus:outline-none focus:ring-2 focus:ring-gold-light"
    >
      {isDark ? (
        <Sun className="w-5 h-5" aria-hidden="true" />
      ) : (
        <Moon className="w-5 h-5" aria-hidden="true" />
      )}
    </button>
  );
}
