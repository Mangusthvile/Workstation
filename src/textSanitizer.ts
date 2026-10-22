/**
 * Utility to eliminate all em-dashes (and variants) from text editor operations.
 * Shared by the browser and the server so both apply exactly the same rules.
 */

// Anything removeEmDashes() would change: dashes, dash entities, "--", or runs of 2+ spaces/tabs.
const NEEDS_SANITIZING = /[\u2013\u2014\u2015]|--|&(?:mdash|ndash|#8212|#8211);|[^\S\r\n]{2,}/i;

/** Cheap check so callers can skip the full regex chain on every keystroke. */
export function needsSanitizing(text: string): boolean {
  return NEEDS_SANITIZING.test(text);
}

export function removeEmDashes(text: string): string {
  if (!text) return '';
  if (!needsSanitizing(text)) return text;

  return (
    text
      // Normalize HTML entities if present
      .replace(/&mdash;|&#8212;/gi, ' - ')
      .replace(/&ndash;|&#8211;/gi, '-')
      // Em-dash (\u2014) and Horizontal Bar (\u2015)
      // When at start of line or after opening quotation / bracket: convert to "- "
      .replace(/(^|[\n"'“‘\[\(])\s*[\u2014\u2015]\s*/g, '$1- ')
      // When followed immediately by punctuation like comma, period, question mark: eliminate the dash
      .replace(/\s*[\u2014\u2015]\s*([,\.!\?;:])/g, '$1')
      // Between words or with spaces around it: convert to clean spaced hyphen " - "
      .replace(/\s*[\u2014\u2015]\s*/g, ' - ')
      // En-dash (\u2013) commonly misused as em-dash or range
      .replace(/\s*[\u2013]\s*/g, ' - ')
      // Double/triple hyphens often typed as em-dash surrogates (-- or ---)
      .replace(/(\S)\s*--+\s*(\S)/g, '$1 - $2')
      .replace(/\s*--+\s*/g, ' - ')
      // Clean up any double spaces created (while preserving newlines)
      .replace(/[^\S\r\n]{2,}/g, ' ')
  );
}
