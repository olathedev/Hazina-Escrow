const HTML_TAG_REGEX = /<\/?[a-z][^>]*>/gi;
const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/g;
const WHITESPACE_REGEX = /\s+/g;

export function sanitizeUserText(input: string): string {
  return input
    .replace(HTML_TAG_REGEX, ' ')
    .replace(CONTROL_CHARS_REGEX, ' ')
    .replace(WHITESPACE_REGEX, ' ')
    .trim();
}
