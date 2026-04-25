import { describe, it, expect } from 'vitest';
import { sanitizeUserText } from '../sanitize';

describe('sanitizeUserText', () => {
  it('removes HTML tags and trims whitespace', () => {
    const result = sanitizeUserText('  <script>alert(1)</script> Hello  ');
    expect(result).toBe('alert(1) Hello');
  });

  it('removes control characters', () => {
    const result = sanitizeUserText('line-1\u0000\u0008line-2');
    expect(result).toBe('line-1 line-2');
  });

  it('collapses repeated whitespace', () => {
    const result = sanitizeUserText('A   B\t\tC\n\nD');
    expect(result).toBe('A B C D');
  });

  it('preserves non-HTML angle bracket text', () => {
    const result = sanitizeUserText('show rows where value < 10 and > 2');
    expect(result).toBe('show rows where value < 10 and > 2');
  });
});
