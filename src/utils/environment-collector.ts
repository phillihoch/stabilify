/**
 * Environment Collector
 *
 * Sammelt Informationen über die Laufzeitumgebung (OS, Node, Playwright).
 */

import * as os from "node:os";
import type { StabilifyEnvironment } from "../types/stabilify-report";

export class EnvironmentCollector {
  /**
   * Sammelt alle verfügbaren Environment-Informationen.
   *
   * @param providedEnv - Vom Benutzer bereitgestellte Environment-Infos (überschreiben automatische)
   */
  collect(
    providedEnv: Partial<StabilifyEnvironment> = {}
  ): StabilifyEnvironment {
    const autoEnv = this.collectSystemInfo();

    // Merge: Provided überschreibt Auto
    return {
      ...autoEnv,
      ...providedEnv,
      extra: {
        ...autoEnv.extra,
        ...providedEnv.extra,
      },
    };
  }

  /**
   * Sammelt System-Informationen.
   */
  private collectSystemInfo(): StabilifyEnvironment {
    return {
      osPlatform: os.platform(),
      osRelease: os.release(),
      osVersion: os.version(),
      extra: {
        nodeVersion: process.version,
        // Playwright Version ist schwer zuverlässig zur Laufzeit zu ermitteln ohne package.json hack
        // Wird daher oft vom User injected oder bleibt undefined
      },
    };
  }
}
