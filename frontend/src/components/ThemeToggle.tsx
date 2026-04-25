import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

/**
 * ThemeToggle – a button that switches between light and dark themes.
 * It uses the next-themes package which adds a "class" on the <html> element.
 * The component is fully accessible:
 *  - It is a <button> element with an aria-label that updates according to the current theme.
 *  - Keyboard users can focus and activate it with Space/Enter.
 *  - The visual icon conveys the current mode and has aria-hidden="true".
 */
export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Ensure that the theme is resolved on mount – needed for SSR.
  useEffect(() => {
    // No side‑effects needed; the hook resolves theme automatically.
  }, []);

  const isDark = resolvedTheme === 'dark';

  const toggle = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

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
