import { describe, expect, it } from "vitest";
import {
  collapseEmptyLines,
  normalizeTabs,
  removeAnsiCodes,
  sanitizeText,
  sanitizeTextArray,
  trimTrailingWhitespace,
} from "../src/utils/text-sanitizer";

describe("Text Sanitizer", () => {
  describe("removeAnsiCodes", () => {
    it("sollte ANSI-Farbcodes entfernen", () => {
      const input = "\u001b[31mError:\u001b[0m Something went wrong";
      const expected = "Error: Something went wrong";
      expect(removeAnsiCodes(input)).toBe(expected);
    });

    it("sollte mehrere ANSI-Codes entfernen", () => {
      const input = "\u001b[1m\u001b[31mBold Red\u001b[0m\u001b[90m Gray";
      const expected = "Bold Red Gray";
      expect(removeAnsiCodes(input)).toBe(expected);
    });

    it("sollte Text ohne ANSI-Codes unverändert lassen", () => {
      const input = "Plain text without codes";
      expect(removeAnsiCodes(input)).toBe(input);
    });

    it("sollte leeren String zurückgeben bei leerem Input", () => {
      expect(removeAnsiCodes("")).toBe("");
    });
  });

  describe("normalizeTabs", () => {
    it("sollte Tabs in Spaces umwandeln (default: 2 Spaces)", () => {
      const input = "function test() {\n\treturn true;\n}";
      const expected = "function test() {\n  return true;\n}";
      expect(normalizeTabs(input)).toBe(expected);
    });

    it("sollte Tabs in 4 Spaces umwandeln", () => {
      const input = "\tindented";
      const expected = "    indented";
      expect(normalizeTabs(input, 4)).toBe(expected);
    });

    it("sollte mehrere Tabs umwandeln", () => {
      const input = "\t\tdouble indented";
      const expected = "    double indented";
      expect(normalizeTabs(input, 2)).toBe(expected);
    });
  });

  describe("collapseEmptyLines", () => {
    it("sollte mehrfache Leerzeilen auf eine reduzieren", () => {
      const input = "Line 1\n\n\n\nLine 2";
      const expected = "Line 1\n\nLine 2";
      expect(collapseEmptyLines(input)).toBe(expected);
    });

    it("sollte einzelne Leerzeilen beibehalten", () => {
      const input = "Line 1\n\nLine 2";
      expect(collapseEmptyLines(input)).toBe(input);
    });

    it("sollte Leerzeilen mit Whitespace kollabieren", () => {
      const input = "Line 1\n  \n  \n  \nLine 2";
      const expected = "Line 1\n\nLine 2";
      expect(collapseEmptyLines(input)).toBe(expected);
    });
  });

  describe("trimTrailingWhitespace", () => {
    it("sollte Trailing Whitespace am Zeilenende entfernen", () => {
      const input = "Line 1   \nLine 2\t\nLine 3";
      const expected = "Line 1\nLine 2\nLine 3";
      expect(trimTrailingWhitespace(input)).toBe(expected);
    });

    it("sollte Leading Whitespace beibehalten", () => {
      const input = "  indented line  ";
      const expected = "  indented line";
      expect(trimTrailingWhitespace(input)).toBe(expected);
    });
  });

  describe("sanitizeText", () => {
    it("sollte alle Sanitization-Schritte anwenden", () => {
      const input = "\u001b[31mError:\u001b[0m\tSomething\n\n\n\nwent wrong   ";
      const expected = "Error:  Something\n\nwent wrong";
      expect(sanitizeText(input)).toBe(expected);
    });

    it("sollte leeren String bei null/undefined zurückgeben", () => {
      expect(sanitizeText(null)).toBe("");
      expect(sanitizeText(undefined)).toBe("");
      expect(sanitizeText("")).toBe("");
    });

    it("sollte mit benutzerdefinierten Optionen arbeiten", () => {
      const input = "\u001b[31mError\u001b[0m\twith\ttabs";
      const result = sanitizeText(input, { removeAnsiCodes: false, tabSize: 4 });
      expect(result).toContain("\u001b[31m");
      expect(result).toContain("    with    tabs");
    });

    it("sollte einzelne Optionen deaktivieren können", () => {
      const input = "Text\n\n\n\nwith lines";
      const result = sanitizeText(input, { collapseEmptyLines: false });
      expect(result).toBe(input);
    });
  });

  describe("sanitizeTextArray", () => {
    it("sollte Array von Strings bereinigen", () => {
      const input = [
        "\u001b[31mError 1\u001b[0m",
        "\u001b[32mSuccess\u001b[0m",
        "Plain text",
      ];
      const expected = ["Error 1", "Success", "Plain text"];
      expect(sanitizeTextArray(input)).toEqual(expected);
    });

    it("sollte null/undefined Werte filtern", () => {
      const input = ["Text 1", null, undefined, "Text 2", ""];
      const expected = ["Text 1", "Text 2"];
      expect(sanitizeTextArray(input)).toEqual(expected);
    });

    it("sollte leeres Array zurückgeben bei leerem Input", () => {
      expect(sanitizeTextArray([])).toEqual([]);
    });

    it("sollte mit benutzerdefinierten Optionen arbeiten", () => {
      const input = ["\tTab 1", "\tTab 2"];
      const result = sanitizeTextArray(input, { tabSize: 4 });
      expect(result).toEqual(["    Tab 1", "    Tab 2"]);
    });
  });
});

