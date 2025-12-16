# Google Genkit - Schnellreferenz

> Mini-Dokumentation für die Entwicklung von AI-Features in Firebase Functions

## Was ist Genkit?

Genkit ist ein **Open-Source-Framework von Google** zum Erstellen von KI-gestützten Anwendungen. Es bietet:
- Einheitliche API für verschiedene AI-Modelle (Gemini, OpenAI, etc.)
- Starke Typisierung mit Zod-Schemas
- Native Firebase Functions Integration
- Streaming-Unterstützung
- Tool Calling / Function Calling

---

## Installation

```bash
npm install genkit @genkit-ai/google-genai
# Für Firebase Functions:
npm install firebase-functions
```

---

## Grundlegende Initialisierung

```typescript
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash'), // Default Model
});
```

**Umgebungsvariable:** `GOOGLE_AI_API_KEY` oder `GEMINI_API_KEY`

---

## Kernkonzepte

### 1. Generate - Einfache Textgenerierung

```typescript
const response = await ai.generate({
  prompt: 'Analysiere diesen Fehler...',
});
console.log(response.text);
```

### 2. Structured Output - Typisierte Antworten

```typescript
const ErrorAnalysisSchema = z.object({
  severity: z.enum(['critical', 'warning', 'info']),
  summary: z.string(),
  possibleCauses: z.array(z.string()),
  suggestedFixes: z.array(z.string()),
});

const response = await ai.generate({
  prompt: 'Analysiere: ' + errorMessage,
  output: { schema: ErrorAnalysisSchema },
});

const analysis = response.output; // Typisiert!
```

### 3. Flows - Wiederverwendbare AI-Funktionen

```typescript
const analyzeErrorFlow = ai.defineFlow(
  {
    name: 'analyzeError',
    inputSchema: z.object({ 
      errorMessage: z.string(),
      stackTrace: z.string().optional(),
    }),
    outputSchema: ErrorAnalysisSchema,
  },
  async ({ errorMessage, stackTrace }) => {
    const { output } = await ai.generate({
      prompt: `Analysiere den Fehler: ${errorMessage}\n${stackTrace || ''}`,
      output: { schema: ErrorAnalysisSchema },
    });
    if (!output) throw new Error('Keine Analyse möglich');
    return output;
  }
);

// Aufruf:
const result = await analyzeErrorFlow({ errorMessage: 'TypeError...' });
```

### 4. Tools - Funktionen für das AI-Modell

```typescript
const lookupDocumentation = ai.defineTool(
  {
    name: 'lookupDocumentation',
    description: 'Sucht in der Dokumentation nach relevanten Infos',
    inputSchema: z.object({
      query: z.string().describe('Suchbegriff'),
    }),
    outputSchema: z.string(),
  },
  async ({ query }) => {
    // Datenbank-Lookup, API-Call, etc.
    return `Dokumentation für ${query}...`;
  }
);

// Verwendung in generate:
const response = await ai.generate({
  prompt: 'Wie löse ich diesen Fehler?',
  tools: [lookupDocumentation],
});
```

---

## Firebase Functions Integration

### Flow als Callable Function exportieren

```typescript
import { onCallGenkit, hasClaim } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';

const geminiApiKey = defineSecret('GEMINI_API_KEY');

// Flow definieren
const analyzeErrorFlow = ai.defineFlow(
  { name: 'analyzeError', inputSchema: z.object({ error: z.string() }), outputSchema: z.string() },
  async ({ error }) => {
    const { text } = await ai.generate({ prompt: `Analysiere: ${error}` });
    return text;
  }
);

// Als Cloud Function exportieren
export const analyzeError = onCallGenkit(
  {
    secrets: [geminiApiKey],
    authPolicy: hasClaim('email_verified'), // Auth-Policy
    // enforceAppCheck: true,  // Optional: App Check
  },
  analyzeErrorFlow
);
```

### Secrets verwalten

```bash
# API Key in Secret Manager speichern
firebase functions:secrets:set GEMINI_API_KEY

# Deployment
firebase deploy --only functions
```

---

## Dotprompt - Template-basierte Prompts

Erstelle `.prompt` Dateien im `prompts/` Ordner:

**prompts/analyzeError.prompt:**
```dotprompt
---
model: googleai/gemini-2.5-flash
input:
  schema:
    errorMessage: string
    context?: string
output:
  schema:
    severity: string
    summary: string
    fixes(array): string
---

Du bist ein erfahrener Entwickler. Analysiere den folgenden Fehler:

Fehler: {{errorMessage}}
{{#if context}}Kontext: {{context}}{{/if}}

Gib eine strukturierte Analyse zurück.
```

**Verwendung:**
```typescript
const analyzePrompt = ai.prompt('analyzeError');
const { output } = await analyzePrompt({ 
  errorMessage: 'TypeError: undefined is not a function' 
});
```

---

## Chat Sessions

```typescript
// Einfacher Chat
const chat = ai.chat({
  system: 'Du bist ein hilfreicher Debugging-Assistent.',
  config: { temperature: 0.7 },
});

const response1 = await chat.send('Was bedeutet dieser Fehler?');
const response2 = await chat.send('Wie kann ich ihn beheben?');
// Chat-History wird automatisch verwaltet
```

---

## Streaming

```typescript
const { stream, response } = await ai.generateStream({
  prompt: 'Erkläre ausführlich...',
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text);
}

const fullResponse = await response;
```

---

## Best Practices

1. **Schemas definieren** - Immer Zod-Schemas für Input/Output verwenden
2. **Secrets nutzen** - API Keys niemals hardcoden, immer Secret Manager
3. **Error Handling** - `output` kann `null` sein, immer prüfen
4. **Temperature** - Niedrig (0.1-0.3) für konsistente Analysen
5. **Auth Policy** - Immer `authPolicy` bei `onCallGenkit` setzen

---

## Verfügbare Gemini Modelle

| Modell | Beschreibung |
|--------|--------------|
| `gemini-2.5-flash` | Schnell, kosteneffizient |
| `gemini-2.5-pro` | Leistungsstärker, komplexere Aufgaben |
| `gemini-2.0-flash` | Vorherige Generation |

---

## Nützliche Links

- [Genkit Docs](https://genkit.dev/docs)
- [Firebase Functions + Genkit](https://genkit.dev/docs/deployment/firebase)
- [Tool Calling](https://genkit.dev/docs/tool-calling)
- [Dotprompt](https://genkit.dev/docs/dotprompt)

