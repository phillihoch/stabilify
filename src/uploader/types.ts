/**
 * Uploader Types
 */

/**
 * Unterstützte Dateitypen für den Upload.
 */
export type FileType = "screenshot" | "trace" | "video" | "error-context";

/**
 * Eine Datei, die hochgeladen werden soll.
 */
export interface FileToUpload {
  /** Test-ID zur Zuordnung der Datei */
  testId: string;
  /** Vollständiger lokaler Pfad zur Datei */
  localPath: string;
  /** Dateiname (extrahiert mit path.basename()) */
  fileName: string;
  /** MIME-Type (z.B. "image/png", "application/zip", "video/webm") */
  contentType: string;
  /** Art der Datei */
  fileType: FileType;
}
