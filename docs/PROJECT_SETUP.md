# 🏗️ Stabilify Projekt-Setup: NPM Library Best Practices

## 🎯 Übersicht

Dieses Dokument beschreibt das empfohlene Setup für Stabilify als professionelle NPM Library nach aktuellen Best Practices (2025).

---

## 📁 Projekt-Struktur

```
stabilify/
├── src/                          # Source Code
│   ├── core/                     # Core-Funktionalität
│   │   ├── healing/              # Auto-Healing Engine
│   │   │   ├── engine.ts         # Haupt-Healing-Logik
│   │   │   ├── ai-analyzer.ts    # AI-basierte DOM-Analyse
│   │   │   ├── selector-improver.ts # AI Selektor-Verbesserung
│   │   │   ├── analyzer.ts       # Error-Analyse
│   │   │   └── reporter.ts       # Beschreibungs-Generator
│   │   ├── ai/                   # AI-Integration
│   │   │   ├── client.ts         # OpenAI/Anthropic Client
│   │   │   ├── prompts.ts        # Prompt Templates
│   │   │   └── token-tracker.ts  # Token-Usage Tracking
│   │   ├── page-extension/       # Page Extension System
│   │   │   ├── extend-page.ts
│   │   │   ├── stable-methods.ts
│   │   │   └── types.ts
│   │   └── logger/               # Logging System
│   │       ├── logger.ts
│   │       └── formatters.ts
│   ├── types/                    # TypeScript Definitionen
│   │   ├── options.ts
│   │   ├── healing.ts
│   │   └── index.ts
│   ├── utils/                    # Utility-Funktionen
│   │   ├── dom-helpers.ts
│   │   ├── selector-utils.ts
│   │   └── index.ts
│   └── index.ts                  # Main Entry Point
├── tests/                        # Tests
│   ├── unit/                     # Unit-Tests
│   │   ├── healing/
│   │   └── page-extension/
│   ├── integration/              # Integration-Tests
│   └── e2e/                      # End-to-End-Tests
├── examples/                     # Demo-Szenarien
│   ├── basic-healing.spec.ts
│   ├── login-flow.spec.ts
│   └── e-commerce.spec.ts
├── docs/                         # Dokumentation
│   ├── MVP_PLAN.md
│   ├── PROJECT_SETUP.md
│   ├── API_REFERENCE.md
│   ├── ARCHITECTURE.md
│   └── TECHNICAL_CONCEPT.md
├── .github/                      # GitHub-spezifische Dateien
│   └── workflows/
│       ├── ci.yml
│       └── publish.yml
├── dist/                         # Build-Output (gitignored)
├── package.json
├── tsconfig.json
├── tsconfig.build.json           # Separate Build-Config
├── .eslintrc.js
├── .prettierrc
├── vitest.config.ts              # Test-Config
├── .env.example                  # Beispiel für Environment Variables
├── .gitignore
├── .npmignore
├── LICENSE
└── README.md
```

### Environment Variables (.env.example)

```bash
# OpenAI API Key (für AI-basiertes Auto-Healing)
OPENAI_API_KEY=sk-...

# Optional: Anthropic API Key (Alternative zu OpenAI)
# ANTHROPIC_API_KEY=sk-ant-...

# Optional: AI Model Configuration
# STABILIFY_AI_MODEL=gpt-4o-mini
# STABILIFY_MAX_TOKENS=2000
```

---

## 📦 package.json Setup

```json
{
  "name": "stabilify",
  "version": "0.1.0",
  "description": "AI-powered auto-healing for Playwright tests",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "rollup -c",
    "dev": "rollup -c -w",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\"",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test && npm run lint"
  },
  "keywords": [
    "playwright",
    "testing",
    "e2e",
    "auto-healing",
    "flaky-tests",
    "test-stability"
  ],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/stabilify.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/stabilify/issues"
  },
  "homepage": "https://github.com/yourusername/stabilify#readme",
  "peerDependencies": {
    "@playwright/test": "^1.40.0"
  },
  "dependencies": {
    "openai": "^4.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@rollup/plugin-commonjs": "^28.0.0",
    "@rollup/plugin-node-resolve": "^15.0.0",
    "@rollup/plugin-typescript": "^12.0.0",
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "dotenv": "^16.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "rollup": "^4.0.0",
    "rollup-plugin-dts": "^6.0.0",
    "tslib": "^2.6.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

---

## 🔧 TypeScript-Konfiguration

### tsconfig.json (Development)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### tsconfig.build.json (Production Build)

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": false,
    "sourceMap": false
  },
  "exclude": [
    "node_modules",
    "dist",
    "tests",
    "examples",
    "**/*.spec.ts",
    "**/*.test.ts"
  ]
}
```

---

## 🧪 Testing-Setup (Vitest)

### vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "tests/",
        "**/*.spec.ts",
        "**/*.test.ts",
      ],
    },
  },
});
```

---

## 🚀 Build-Tool: Rollup

**Warum Rollup?**

- ✅ **Industry Standard** für Library-Builds
- ✅ **Optimales Tree-Shaking** für kleinere Bundles
- ✅ **Dual Package Support** (CJS + ESM) mit voller Kontrolle
- ✅ **Plugin-Ökosystem** für maximale Flexibilität
- ✅ **Production-Ready** von großen Libraries genutzt (React, Vue, etc.)
- ✅ **Bessere Code-Splitting** Kontrolle als tsup

### rollup.config.mjs

```javascript
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import dts from "rollup-plugin-dts";

const external = ["@playwright/test"];

const plugins = [
  resolve(),
  commonjs(),
  typescript({
    tsconfig: "./tsconfig.build.json",
    declaration: false, // dts plugin handles this
  }),
];

export default [
  // ESM and CJS builds
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.js",
        format: "cjs",
        sourcemap: true,
        exports: "named",
      },
      {
        file: "dist/index.mjs",
        format: "esm",
        sourcemap: true,
      },
    ],
    external,
    plugins,
  },
  // TypeScript declarations
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.d.ts",
      format: "esm",
    },
    external,
    plugins: [dts()],
  },
];
```

### Wichtige Rollup-Plugins

**@rollup/plugin-typescript**

- Kompiliert TypeScript zu JavaScript
- Integriert mit tsconfig.json

**@rollup/plugin-node-resolve**

- Löst Node.js Module auf
- Ermöglicht Import von node_modules

**@rollup/plugin-commonjs**

- Konvertiert CommonJS zu ES Modules
- Wichtig für Node.js Kompatibilität

**rollup-plugin-dts**

- Bündelt TypeScript Deklarationen
- Erstellt eine einzige .d.ts Datei

---

## 🎨 Code-Quality-Tools

### .eslintrc.js

```javascript
module.exports = {
  parser: "@typescript-eslint/parser",
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off",
  },
};
```

### .prettierrc

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

---

## 📝 Wichtige Dateien

### .gitignore

```
node_modules/
dist/
coverage/
.env
.env.local
.DS_Store
*.log
```

**Wichtig:** `.env` Dateien mit API-Keys NIEMALS committen!

### .npmignore

```
src/
tests/
examples/
.github/
coverage/
*.test.ts
*.spec.ts
tsconfig.json
vitest.config.ts
.eslintrc.js
.prettierrc
```

---

## 📚 Best Practices

### 1. **Exports-Struktur**

- Klarer Main Entry Point (`src/index.ts`)
- Alle Public APIs über `index.ts` exportieren
- Interne Module nicht direkt exportieren

### 2. **TypeScript-Typen**

- Alle Public APIs typisieren
- Separate `types/` Ordner für komplexe Typen
- `.d.ts` Dateien automatisch generieren

### 3. **Testing-Strategie**

- Unit-Tests für Core-Logik (Healing-Strategien)
- Integration-Tests für Page-Extension
- E2E-Tests für echte Playwright-Szenarien
- Mindestens 80% Code-Coverage

### 4. **Versionierung**

- Semantic Versioning (SemVer)
- Changelog pflegen
- Breaking Changes klar kommunizieren

### 5. **Dokumentation**

- README mit Quick-Start
- API-Referenz
- Beispiele im `examples/` Ordner
- JSDoc für alle Public APIs

---

## 🔄 Development Workflow

```bash
# Installation
npm install

# Development mit Watch-Mode (Rollup watch)
npm run dev

# Tests ausführen
npm test

# Tests mit Coverage
npm run test:coverage

# Linting
npm run lint
npm run lint:fix

# Formatierung
npm run format

# Type-Checking
npm run typecheck

# Build für Production (Rollup build)
npm run build

# Publish (nach prepublishOnly checks)
npm publish
```

### Rollup-spezifische Tipps

**Watch-Mode:**

- `npm run dev` startet Rollup im Watch-Mode
- Automatisches Rebuild bei Dateiänderungen
- Schnelles Feedback während der Entwicklung

**Build-Output:**

- `dist/index.js` - CommonJS Build
- `dist/index.mjs` - ES Module Build
- `dist/index.d.ts` - TypeScript Deklarationen
- `dist/*.map` - Source Maps für Debugging

**Debugging:**

- Source Maps ermöglichen Debugging im Original-TypeScript
- `sourcemap: true` in rollup.config.mjs aktiviert

**Performance:**

- Rollup ist optimiert für Libraries (nicht Apps)
- Tree-Shaking entfernt ungenutzten Code
- Kleinere Bundle-Größen als Webpack

---

## 🎯 Nächste Schritte

1. ✅ Projekt-Struktur aufsetzen
2. ✅ Dependencies installieren
3. ✅ TypeScript-Config erstellen
4. ✅ Build-Pipeline einrichten
5. ✅ Testing-Setup konfigurieren
6. ✅ Code-Quality-Tools einrichten
7. ✅ Erste Core-Module implementieren
