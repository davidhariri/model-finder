# /update-benchmarks

Sweep through models flagged with `expectingMoreBenchmarks: true` in `src/data/models.ts` and backfill any benchmark scores that have become available since the model was added.

## Usage

```
/update-benchmarks
```

No arguments. Processes every flagged model, one at a time.

## Workflow

### 1. Find flagged models

Read `src/data/models.ts` and collect every model where `expectingMoreBenchmarks: true`.

### 2. For each model, identify missing scores

Check which `Scores` fields are `undefined`. The full set of optional scores:

| Field | Benchmark | Source priority |
|---|---|---|
| `coding` | SWE-Bench Verified (%) | Web search (provider blogs, Vellum) |
| `codingLive` | LiveCodeBench (%) | AA API (`livecodebench`) |
| `reasoning` | GPQA Diamond (%) | AA API (`gpqa`) |
| `reasoningHle` | Humanity's Last Exam (%) | AA API (`hle`) |
| `math` | AIME 2025 or 2026 (%) | AA API (`aime_25`, `aime_26`), web search |
| `general` | MMLU-Pro (%) | AA API (`mmlu_pro`) |
| `multimodal` | MMMU-Pro (%) | Web search |
| `elo` | LMArena Elo | Web search (`chatbot arena elo lmarena`) |

### 3. Search for missing data

**AA API first** — call `mcp__artificial-analysis__get_model` with the model's thinking/adaptive slug (see slug patterns in `/add-model` skill). Check if any previously-null fields now have values.

**Web search second** — for fields AA still doesn't have, do 1-2 targeted searches per field. Follow the same source guidance as the `/add-model` skill:
- Provider blog posts and system cards are authoritative
- Third-party benchmark aggregator articles (Vellum, thesys.dev, digitalapplied) are acceptable if they clearly cite the thinking/adaptive variant
- Dynamic leaderboard pages (Kaggle, llm-stats.com, matharena.ai) don't render — skip them
- Don't guess or estimate. If a score can't be verified, leave it undefined.

**AIME 2026 preference** — if a model currently has an AIME 2025 score and an AIME 2026 score is now available from an authoritative source, update to AIME 2026 (set `mathBenchmark: "AIME 2026"`). AIME 2026 is preferred because it's newer and less susceptible to training data contamination.

### 4. Update the model entry

- Write any newly-found scores into the model's `scores` object
- If **at least one new score was added**, keep `expectingMoreBenchmarks: true` — there may be more coming
- If **no new scores were found** (nothing changed), set `expectingMoreBenchmarks: false` — the data has stabilized
- Run `npx tsc --noEmit` after each model update

### 5. Report

After processing all flagged models, print a summary:

```
## Benchmark Update Summary

### Claude Opus 4.6
- Added: general (MMLU-Pro) = 91, codingLive (LiveCodeBench) = 85
- Still missing: elo
- Status: still expecting more benchmarks

### Claude Sonnet 4.6
- No new data found
- Still missing: math, codingLive, elo
- Status: no longer expecting (marked false)
```

## Ground Rules

- **Never hallucinate data.** Same rules as `/add-model`. If a score can't be verified, leave it undefined.
- **Don't re-verify existing scores.** Only search for fields that are currently `undefined`. Trust the data that's already there.
- **One model at a time.** Research, update, type-check, then move to the next.
- **Score conversion from AA:** Decimals (0-1) → multiply by 100, round to nearest integer.
- **Thinking/adaptive variant scores only.** For models with `thinking` capability, use the thinking/adaptive/max-effort benchmark results (not the standard non-thinking scores). This is consistent with how all models were originally added.
