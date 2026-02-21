# /add-model

Add a model (or provider) to the benchmark database in `src/data/models.ts`.

## Usage

```
/add-model <model name or provider>
```

Examples:
- `/add-model Claude 4.5 Sonnet` — research and add a single model
- `/add-model Anthropic` — walk through all major Anthropic API models one by one
- `/add-model o3-pro` — add a specific model that was previously skipped

## Ground Rules

- **One model at a time.** Research, compile, write, type-check, then move to the next.
- **Never hallucinate data.** If a benchmark score can't be verified from at least one authoritative source, leave the field `undefined`. The user has said fabricated data "will cost me dearly."
- **Don't ask for approval on individual scores.** Once research is done, write the entry directly.
- **Only include models developers would choose between** — current API-available models, not deprecated snapshots or dated versions.
- **After writing each model**, run `npx tsc --noEmit` to verify no type errors.

## Data Sources (in priority order)

### 1. Artificial Analysis MCP API (primary)

```
mcp__artificial-analysis__get_model({ model: "<slug>" })
```

**What it gives you:** GPQA Diamond, HLE, AIME 2025, MMLU-Pro, LiveCodeBench, speed (tok/s), pricing (input/output per 1M tokens).

**Slug format gotchas:**
- Dots become dashes: `gpt-5.1` → `gpt-5-1`, `gpt-4.1` → `gpt-4-1`
- Some work as-is: `o3`, `o1`, `o4-mini`
- If a slug fails, try `list_models` to find the correct one
- The API sometimes returns a different variant (e.g., `gpt-4.1` may return `gpt-4.1 nano`). Always check the `name` field in the response.

**Score conversion:** AA returns decimals (0–1). Multiply by 100 and round to nearest integer for our schema. Example: `gpqa: 0.854` → `reasoning: 85`.

**Field mapping:**
| AA field | Our field | Notes |
|---|---|---|
| `gpqa` | `reasoning` | GPQA Diamond (%) |
| `hle` | `reasoningHle` | Humanity's Last Exam (%) |
| `aime_25` | `math` | Set `mathBenchmark: "AIME 2025"` |
| `aime_26` | `math` | Set `mathBenchmark: "AIME 2026"` (prefer over 2025 if available) |
| `mmlu_pro` | `general` | MMLU-Pro (%) |
| `livecodebench` | `codingLive` | LiveCodeBench (%) |
| `tokens_per_second` | `tokensPerSecond` | Round to integer |
| `input_per_1m` | `costPer1MInput` | Exact |
| `output_per_1m` | `costPer1MOutput` | Exact |

### 2. Web search (for data AA doesn't have)

**SWE-Bench Verified** — not in AA for most models. Search for `"<model>" SWE-Bench Verified score`. Good sources: OpenAI/Anthropic/Google blog posts, Vellum benchmarks articles, vals.ai. Maps to `coding` field.

**Context window / max output tokens** — not in AA. Search for `"<model>" context window max output tokens API`. Best source: the provider's API docs page.

**Knowledge cutoff** — not in AA. Search for `"<model>" knowledge cutoff`. Best source: provider docs or model cards.

**Release date / URL** — not in AA. Search for the provider's blog announcement. Format: `YYYY-MM-DD`.

**Elo ratings** — not in AA. Search for `"<model>" chatbot arena elo lmarena`. Source: lmarena.ai / arena.ai leaderboards.

**Cached input pricing** — not always in AA. Check provider pricing pages. Common patterns:
- OpenAI GPT-4o family: 50% discount
- OpenAI GPT-4.1 / o-series: 75% discount
- OpenAI GPT-5 family: 90% discount
- Anthropic: 90% discount
- Google: 75% discount

**AIME 2026** — AA may not have `aime_26` yet. Search for `"<model>" AIME 2026 score`. Good sources: provider blog posts, matharena.ai (results appear in search snippets even though the site itself is dynamic). Prefer AIME 2026 over 2025 when both are available — it's newer and less susceptible to contamination. Maps to `math` field with `mathBenchmark: "AIME 2026"`.

**MMMU-Pro** — rarely available. Search if needed, but don't spend more than 1-2 queries.

### 3. What does NOT work

- **Dynamic leaderboard pages** (Kaggle, llm-stats.com, vals.ai leaderboards, matharena.ai) — these render via JavaScript and WebFetch gets empty pages. Don't waste time on them.
- **OpenAI docs pages** (platform.openai.com) — often return 403. Use web search to find the data in search snippets instead.
- **Searching for data that likely doesn't exist** — if a small/cheap model doesn't have an official SWE-Bench score after 2 searches, it probably doesn't exist. Move on.

## Schema Reference

Read `src/data/models.ts` for the current interfaces. Key points:

```typescript
interface Model {
  id: string;              // API model ID (e.g., "gpt-4o", "claude-4-5-sonnet")
  name: string;            // Display name (e.g., "GPT-4o", "Claude 4.5 Sonnet")
  labId: string;           // Must match an entry in the labs array
  contextWindow: number;   // Max input tokens
  maxOutputTokens: number;
  knowledgeCutoff?: string; // "YYYY-MM" format. Omit if not publicly disclosed.
  parameters?: { total: number; active?: number }; // Billions. Omit if undisclosed.
  supportsImages: boolean;
  thinking?: { type: "always" | "controllable"; budgetRange?: string };
  openWeights: boolean;
  releaseDate: string;     // "YYYY-MM-DD" format
  releaseUrl?: string;     // Blog post URL
  expectingMoreBenchmarks?: boolean; // Set true if scores are incomplete (new models)
  scores: Scores;
  providers: ModelProvider[];
}

interface Scores {
  coding?: number;         // SWE-Bench Verified (%). Omit if no official score.
  codingLive?: number;     // LiveCodeBench (%)
  reasoning: number;       // GPQA Diamond (%) — REQUIRED
  reasoningHle?: number;   // Humanity's Last Exam (%)
  math?: number;           // AIME 2025 or 2026 (%)
  mathBenchmark?: "AIME 2025" | "AIME 2026"; // Required if math is set
  general?: number;        // MMLU-Pro (%). Omit if not available (very new models may lack it).
  multimodal?: number;     // MMMU-Pro (%)
  elo?: number;            // LMArena Elo rating
}
```

**Required fields:** `reasoning` (GPQA) is the only required score. If you can't find GPQA for a model, skip it entirely and tell the user why.

**Optional fields:** Everything else. Leave `undefined` rather than guess.

## Workflow Per Model

1. **Fetch AA data** — `mcp__artificial-analysis__get_model({ model: "<slug>" })`
2. **Check what's missing** — typically SWE-Bench, AIME 2026, context/output specs, cutoff, release info, Elo
3. **Web search for gaps** — max 2-3 searches per missing field, then give up
4. **Compile the entry** — convert AA decimals to percentages, round to integers
5. **Check labs/providers arrays** — if the model's lab or provider isn't in the arrays yet, add it
6. **Write to models.ts** — append to the `models` array. If any scores are missing that you'd expect to appear later (model is very new, AA data is sparse), set `expectingMoreBenchmarks: true`. The `/update-benchmarks` skill will sweep these later.
7. **Type check** — `npx tsc --noEmit`
8. **Report** — tell the user what was added and what data is missing/skipped

## Adding a New Provider to an Existing Model

If the user asks to add a provider (e.g., "add Azure pricing for GPT-4o"), just add a new entry to that model's `providers` array with the correct `providerId`, pricing, and speed. Make sure the provider exists in the `providers` array at the top of the file.

## Adding a New Lab or Provider

If you encounter a model from a lab not in the `labs` array, or available through a provider not in the `providers` array, add it. Use the lab/provider's official website URL.
