<img width="2358" height="1524" alt="CleanShot 2026-02-22 at 14 46 14@2x" src="https://github.com/user-attachments/assets/e317cb95-ce57-45f8-b9ae-222b72d47cda" />

# Model Finder

An interactive dashboard for comparing LLM models across intelligence, speed, and cost. Filter, sort, and visualize models to find the right one for your use case.

**Live at [models.dhariri.com](https://models.dhariri.com)**

## Contributing

The most valuable contributions are data improvements — fixing inaccuracies, adding new models, or adding new providers. All model data lives in a single file: [`src/data/models.ts`](src/data/models.ts).

### Fixing Data Inaccuracies

If you spot an incorrect benchmark score, wrong price, or outdated speed measurement:

1. Open a PR updating the value in `src/data/models.ts`
2. **Include a source link** (provider pricing page, benchmark report, official blog post) in your PR description
3. Keep the PR focused — one fix per PR is ideal

### Adding a Model

Add a new entry to the `models` array in `src/data/models.ts`. Every model needs:

- Benchmark scores (from verified sources — never estimate or guess)
- At least one provider with pricing and speed data
- A `releaseDate` and `releaseUrl` linking to the official announcement
- If some benchmark scores aren't available yet, leave those fields `undefined` and set `expectingMoreBenchmarks: true`

### Adding a Provider

Providers (API hosts like AWS Bedrock, Azure, Together, etc.) are defined in the `providers` array. To add a provider:

1. Add the provider to the `providers` array
2. Add `ModelProvider` entries to each model available on that provider, with current pricing and speed data
3. Include source links for pricing in your PR description

### PR Guidelines

- All benchmark scores and pricing must come from verifiable sources — link them in your PR
- Run `npx tsc --noEmit` before submitting to catch type errors
- Keep PRs small and focused

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

`npx tsc --noEmit` to type-check after making changes.
