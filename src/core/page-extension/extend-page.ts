import type { Locator, Page } from "@playwright/test";
import * as dotenv from "dotenv";
import type { ExtendedPage, StabilifyOptions } from "../../types";
import { HealingEngine } from "../healing/engine";

dotenv.config();

export function extendPage(
  page: Page,
  options?: StabilifyOptions
): ExtendedPage {
  const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required. Set it in .env or pass via options."
    );
  }

  const engine = new HealingEngine(apiKey);
  const extendedPage = page as ExtendedPage;

  extendedPage.getByTextStable = (text: string): Locator => {
    // Erstelle einen Wrapper-Locator mit Healing-Logik
    const originalLocator = page.getByText(text, { exact: false });

    // Erweitere den Locator mit Healing-Fähigkeiten
    const healingLocator = new Proxy(originalLocator, {
      get(target, prop) {
        const originalMethod = target[prop as keyof Locator];

        // Wenn es eine Methode ist, wrappen wir sie mit Healing
        if (typeof originalMethod === "function") {
          return async (...args: any[]) => {
            try {
              // Versuche die Original-Methode
              return await (originalMethod as Function).apply(target, args);
            } catch (error) {
              // Bei Fehler: Healing-Versuch
              const healingResult = await engine.healLocator(
                page,
                text,
                String(prop),
                "text"
              );

              if (healingResult.success && healingResult.healedSelector) {
                // Verwende den geheilten Selektor
                const healedLocator = page.locator(
                  healingResult.healedSelector
                );
                return await (
                  healedLocator[prop as keyof Locator] as Function
                ).apply(healedLocator, args);
              }

              throw error;
            }
          };
        }

        return originalMethod;
      },
    });

    return healingLocator;
  };

  extendedPage.getByRoleStable = (
    role: Parameters<Page["getByRole"]>[0],
    options?: Parameters<Page["getByRole"]>[1]
  ): Locator => {
    // Erstelle einen Wrapper-Locator mit Healing-Logik
    const originalLocator = page.getByRole(role, options);

    // Erweitere den Locator mit Healing-Fähigkeiten
    const healingLocator = new Proxy(originalLocator, {
      get(target, prop) {
        const originalMethod = target[prop as keyof Locator];

        // Wenn es eine Methode ist, wrappen wir sie mit Healing
        if (typeof originalMethod === "function") {
          return async (...args: any[]) => {
            try {
              // Versuche die Original-Methode
              return await (originalMethod as Function).apply(target, args);
            } catch (error) {
              // Bei Fehler: Healing-Versuch
              const roleDescription = options?.name
                ? `${role} with name "${options.name}"`
                : role;
              const healingResult = await engine.healLocator(
                page,
                roleDescription,
                String(prop),
                "role"
              );

              if (healingResult.success && healingResult.healedSelector) {
                // Verwende den geheilten Selektor
                const healedLocator = page.locator(
                  healingResult.healedSelector
                );
                return await (
                  healedLocator[prop as keyof Locator] as Function
                ).apply(healedLocator, args);
              }

              throw error;
            }
          };
        }

        return originalMethod;
      },
    });

    return healingLocator;
  };

  return extendedPage;
}
