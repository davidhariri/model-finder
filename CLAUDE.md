# Cloud Model Finder

Interactive dashboard for comparing LLM models across intelligence, speed, and cost.

## Tech Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- No database — all model data lives in `src/data/models.ts`

## Key Files

- `src/data/models.ts` — Model data, types, scoring functions
- `src/components/ModelDetail.tsx` — Model detail modal
- `src/components/CostPerformanceScatter.tsx` — Scatter plot (log-scale cost x-axis)
- `src/app/page.tsx` — Main page with filters and charts

## Commands

- `npm run dev` — Start dev server
- `npx tsc --noEmit` — Type check (run after any model data changes)

## Data Integrity

All benchmark scores must come from verified sources (Artificial Analysis API, provider blogs, official benchmarks). Never estimate or guess scores. Leave fields undefined rather than hallucinate.
