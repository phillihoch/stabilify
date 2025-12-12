/**
 * Report Writer
 *
 * Schreibt den generierten Report als JSON-Datei auf die Festplatte.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { StabilifyTestReport } from "../types/stabilify-report";

export interface ReportWriterOptions {
  outputFile?: string;
  configDir: string;
}

export class ReportWriter {
  constructor(private readonly options: ReportWriterOptions) {}

  /**
   * Schreibt den Report in eine JSON-Datei.
   */
  async write(report: StabilifyTestReport): Promise<string> {
    const filePath = this.resolveOutputPath();
    console.log("[stabilify] Schreibe Report nach:", filePath);

    // Stelle sicher, dass das Verzeichnis existiert
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      console.log("[stabilify] Erstelle Verzeichnis:", dir);
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
      console.log("[stabilify] ✅ Report erfolgreich geschrieben:", filePath);
      return filePath;
    } catch (error) {
      console.error("[stabilify] ❌ Fehler beim Schreiben des Reports:", error);
      throw error;
    }
  }

  /**
   * Ermittelt den vollständigen Ausgabepfad basierend auf Umgebungsvariablen und Optionen.
   */
  private resolveOutputPath(): string {
    // Höchste Priorität: Vollständiger Pfad aus Umgebungsvariable
    const envOutputFile = process.env.STABILIFY_OUTPUT_FILE;
    if (envOutputFile) {
      return path.isAbsolute(envOutputFile)
        ? envOutputFile
        : path.join(this.options.configDir, envOutputFile);
    }

    // Wenn outputFile einen Pfad enthält (mit /), direkt relativ zu configDir auflösen
    const outputFile = this.options.outputFile;
    if (outputFile?.includes("/")) {
      return path.isAbsolute(outputFile)
        ? outputFile
        : path.join(this.options.configDir, outputFile);
    }

    // Dateiname aus Option oder Umgebungsvariable
    const outputName =
      outputFile ??
      process.env.STABILIFY_OUTPUT_NAME ??
      `stabilify-report-${Date.now()}.json`;

    // Verzeichnis aus Umgebungsvariable oder Default
    const envOutputDir = process.env.STABILIFY_OUTPUT_DIR;
    let outputDir: string;

    if (envOutputDir) {
      outputDir = path.isAbsolute(envOutputDir)
        ? envOutputDir
        : path.join(this.options.configDir, envOutputDir);
    } else {
      outputDir = path.join(this.options.configDir, "stabilify-results");
    }

    return path.join(outputDir, outputName);
  }
}
