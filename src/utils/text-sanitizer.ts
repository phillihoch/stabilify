/**
 * Text Sanitizer Utility
 *
 * Bereinigt Textausgaben von ANSI-Codes und anderen nicht-informativen Zeichen,
 * um die Daten KI-freundlicher zu machen.
 *
 * @module text-sanitizer
 */

/**
 * Optionen für die Text-Sanitization
 */
export interface SanitizeOptions {
  /** ANSI-Codes entfernen (default: true) */
  removeAnsiCodes?: boolean;
  /** Tabs in Spaces umwandeln (default: true) */
  normalizeTabs?: boolean;
  /** Anzahl der Spaces pro Tab (default: 2) */
  tabSize?: number;
  /** Mehrfache Leerzeilen auf eine reduzieren (default: true) */
  collapseEmptyLines?: boolean;
  /** Trailing Whitespace entfernen (default: true) */
  trimTrailingWhitespace?: boolean;
}

/**
 * Standard-Optionen für die Sanitization
 */
const DEFAULT_OPTIONS: Required<SanitizeOptions> = {
  removeAnsiCodes: true,
  normalizeTabs: true,
  tabSize: 2,
  collapseEmptyLines: true,
  trimTrailingWhitespace: true,
};

/**
 * Regex für ANSI Escape Codes
 * Matcht alle ANSI-Sequenzen wie \u001b[31m, \u001b[90m, \u001b[1m, etc.
 */
const ANSI_REGEX =
  /\u001b\[[0-9;]*[a-zA-Z]|\u001b\][^\u0007]*\u0007|\u001b[=>]|\u009b[0-9;]*[a-zA-Z]/g;

/**
 * Entfernt ANSI Escape Codes aus einem String
 *
 * @param text - Der zu bereinigende Text
 * @returns Text ohne ANSI-Codes
 */
export function removeAnsiCodes(text: string): string {
  if (!text) return text;
  return text.replaceAll(ANSI_REGEX, "");
}

/**
 * Wandelt Tabs in Spaces um
 *
 * @param text - Der zu normalisierende Text
 * @param tabSize - Anzahl der Spaces pro Tab (default: 2)
 * @returns Text mit Spaces statt Tabs
 */
export function normalizeTabs(text: string, tabSize = 2): string {
  if (!text) return text;
  const spaces = " ".repeat(tabSize);
  return text.replaceAll("\t", spaces);
}

/**
 * Reduziert mehrfache aufeinanderfolgende Leerzeilen auf eine einzelne Leerzeile
 *
 * @param text - Der zu bereinigende Text
 * @returns Text mit kollabierten Leerzeilen
 */
export function collapseEmptyLines(text: string): string {
  if (!text) return text;
  return text.replaceAll(/\n\s*\n\s*\n/g, "\n\n");
}

/**
 * Entfernt Trailing Whitespace am Ende jeder Zeile
 *
 * @param text - Der zu bereinigende Text
 * @returns Text ohne Trailing Whitespace
 */
export function trimTrailingWhitespace(text: string): string {
  if (!text) return text;
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
}

/**
 * Bereinigt einen Text von ANSI-Codes und anderen nicht-informativen Zeichen
 *
 * @param text - Der zu bereinigende Text
 * @param options - Optionen für die Sanitization
 * @returns Bereinigter Text
 *
 * @example
 * ```typescript
 * const dirty = "\u001b[31mError:\u001b[0m Something went wrong\n\n\n";
 * const clean = sanitizeText(dirty);
 * // => "Error: Something went wrong\n"
 * ```
 */
export function sanitizeText(
  text: string | undefined | null,
  options: SanitizeOptions = {}
): string {
  if (!text) return "";

  const opts = { ...DEFAULT_OPTIONS, ...options };
  let result = text;

  // 1. ANSI-Codes entfernen
  if (opts.removeAnsiCodes) {
    result = removeAnsiCodes(result);
  }

  // 2. Tabs normalisieren
  if (opts.normalizeTabs) {
    result = normalizeTabs(result, opts.tabSize);
  }

  // 3. Trailing Whitespace entfernen
  if (opts.trimTrailingWhitespace) {
    result = trimTrailingWhitespace(result);
  }

  // 4. Mehrfache Leerzeilen kollabieren
  if (opts.collapseEmptyLines) {
    result = collapseEmptyLines(result);
  }

  return result;
}

/**
 * Bereinigt ein Array von Strings
 *
 * @param texts - Array von zu bereinigenden Texten
 * @param options - Optionen für die Sanitization
 * @returns Array mit bereinigten Texten
 */
export function sanitizeTextArray(
  texts: (string | undefined | null)[],
  options: SanitizeOptions = {}
): string[] {
  return texts.map((text) => sanitizeText(text, options)).filter(Boolean);
}
