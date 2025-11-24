# 📋 Stabilify API-Referenz

## 🔧 Setup-Methoden

### Plugin-Setup

```typescript
import { stabilifyPlugin } from "stabilify";

// playwright.config.ts
export default defineConfig({
  use: {
    ...stabilifyPlugin({
      autoHealing: true,
      smartWaiting: true,
      learningMode: true,
    }),
  },
});
```

### Manuelle Erweiterung

```typescript
import { extendPage } from "stabilify";

test("my test", async ({ page }) => {
  extendPage(page, {
    autoHealing: true,
    defaultTimeout: 10000,
  });

  await page.clickStable("Submit");
});
```

## 🎯 Stable Methods

### Click-Methoden

```typescript
// Standard Click mit Auto-Healing
page.clickStable(selector: string, options?: StableClickOptions): Promise<void>

// Double Click
page.dblclickStable(selector: string, options?: StableClickOptions): Promise<void>

// Right Click
page.rightClickStable(selector: string, options?: StableClickOptions): Promise<void>
```

### Input-Methoden

```typescript
// Fill Input mit Smart Waiting
page.fillStable(selector: string, value: string, options?: StableFillOptions): Promise<void>

// Type Text
page.typeStable(selector: string, text: string, options?: StableTypeOptions): Promise<void>

// Select Option
page.selectOptionStable(selector: string, values: string | string[], options?: StableSelectOptions): Promise<void>
```

### Locator-Methoden

```typescript
// Enhanced Locators mit Auto-Healing
page.getByRoleStable(role: AriaRole, options?: StableLocatorOptions): StabilifyLocator
page.getByTextStable(text: string, options?: StableLocatorOptions): StabilifyLocator
page.getByLabelStable(text: string, options?: StableLocatorOptions): StabilifyLocator
page.getByPlaceholderStable(text: string, options?: StableLocatorOptions): StabilifyLocator
page.getByTestIdStable(testId: string, options?: StableLocatorOptions): StabilifyLocator
```

### Navigation-Methoden

```typescript
// Goto mit Smart Waiting
page.gotoStable(url: string, options?: StableGotoOptions): Promise<void>

// Reload
page.reloadStable(options?: StableReloadOptions): Promise<void>

// Go Back/Forward
page.goBackStable(options?: StableNavigationOptions): Promise<void>
page.goForwardStable(options?: StableNavigationOptions): Promise<void>
```

### Waiting-Methoden

```typescript
// Smart Waiting für verschiedene Bedingungen
page.waitForStable(condition: WaitCondition, options?: StableWaitOptions): Promise<void>

// Spezifische Wait-Methoden
page.waitForLoadStateStable(state?: 'load' | 'domcontentloaded' | 'networkidle'): Promise<void>
page.waitForSelectorStable(selector: string, options?: StableWaitOptions): Promise<void>
page.waitForFunctionStable(pageFunction: Function, options?: StableWaitOptions): Promise<void>
```

## ⚙️ Konfigurationsoptionen

### StabilifyOptions

```typescript
interface StabilifyOptions {
  // Core Features
  autoHealing?: boolean; // Default: true
  smartWaiting?: boolean; // Default: true
  learningMode?: boolean; // Default: false

  // Timing Configuration
  defaultTimeout?: number; // Default: 30000ms
  retryAttempts?: number; // Default: 3
  waitBetweenRetries?: number; // Default: 1000ms

  // Smart Waiting Settings
  domStabilityTimeout?: number; // Default: 500ms
  networkIdleTimeout?: number; // Default: 500ms
  animationTimeout?: number; // Default: 1000ms
  hydrationTimeout?: number; // Default: 2000ms

  // Auto-Healing Settings
  maxHealingAttempts?: number; // Default: 3
  semanticMatchingThreshold?: number; // Default: 0.8
  enableSemanticMatching?: boolean; // Default: true
  enableDOMAnalysis?: boolean; // Default: true

  // Logging Configuration
  logLevel?: "debug" | "info" | "warn" | "error"; // Default: 'info'
  logFailures?: boolean; // Default: true
  logHealingAttempts?: boolean; // Default: true
  logPerformanceMetrics?: boolean; // Default: false

  // Learning System
  collectAnalytics?: boolean; // Default: false
  suggestImprovements?: boolean; // Default: false
  enablePatternRecognition?: boolean; // Default: false
}
```

### Method-spezifische Optionen

```typescript
interface StableClickOptions extends ClickOptions {
  healing?: boolean; // Override global healing setting
  maxHealingAttempts?: number; // Override global max attempts
  semanticFallback?: boolean; // Use semantic matching as fallback
  waitForStable?: boolean; // Wait for stability before click
}

interface StableFillOptions extends FillOptions {
  healing?: boolean;
  clearFirst?: boolean; // Clear field before filling
  validateInput?: boolean; // Validate input after filling
  waitForStable?: boolean;
}

interface StableLocatorOptions extends LocatorOptions {
  healing?: boolean;
  semanticMatching?: boolean;
  domAnalysis?: boolean;
  fallbackStrategies?: string[]; // Custom fallback strategies
}
```

## 🎭 StabilifyLocator

```typescript
class StabilifyLocator {
  // Enhanced Locator Methods
  clickStable(options?: StableClickOptions): Promise<void>;
  fillStable(value: string, options?: StableFillOptions): Promise<void>;
  typeStable(text: string, options?: StableTypeOptions): Promise<void>;

  // Waiting Methods
  waitForStable(options?: StableWaitOptions): Promise<void>;
  waitForVisibleStable(options?: StableWaitOptions): Promise<void>;
  waitForHiddenStable(options?: StableWaitOptions): Promise<void>;

  // Assertion Helpers
  expectStable(): StabilifyExpect;

  // Healing Methods
  heal(): Promise<StabilifyLocator>;
  findAlternatives(): Promise<StabilifyLocator[]>;

  // Standard Playwright Locator Methods (inherited)
  // ... alle Standard-Methoden verfügbar
}
```

## 🔍 Wait Conditions

```typescript
type WaitCondition =
  | "dom-stable"
  | "network-idle"
  | "animations-complete"
  | "hydration-complete"
  | "page-ready"
  | "custom"
  | { custom: (page: Page) => Promise<boolean> };

// Beispiele
await page.waitForStable("dom-stable");
await page.waitForStable("network-idle");
await page.waitForStable({
  custom: async (page) => {
    return await page.locator(".loading").isHidden();
  },
});
```

## 📊 Analytics & Reporting

```typescript
// Learning System API
interface LearningSystem {
  getFailurePatterns(): FailurePattern[];
  getSuggestions(selector: string): SelectorImprovement[];
  getPerformanceMetrics(): PerformanceMetrics;
  exportReport(): TestHealthReport;
}

// Zugriff über erweiterte Page
const analytics = page.stabilify.analytics;
const suggestions = analytics.getSuggestions('[data-testid="submit"]');
```

## 🚀 Beispiele

### Basis-Nutzung

```typescript
test("stable login", async ({ page }) => {
  await page.gotoStable("/login");
  await page.fillStable("#email", "test@example.com");
  await page.fillStable("#password", "password123");
  await page.clickStable('button[type="submit"]');

  await page.waitForStable("page-ready");
  await expect(page.getByTextStable("Welcome")).toBeVisible();
});
```

### Erweiterte Konfiguration

```typescript
test("complex interaction", async ({ page }) => {
  extendPage(page, {
    autoHealing: true,
    maxHealingAttempts: 5,
    semanticMatchingThreshold: 0.9,
    logLevel: "debug",
  });

  await page.clickStable("Dynamic Button", {
    healing: true,
    semanticFallback: true,
    waitForStable: true,
  });
});
```
