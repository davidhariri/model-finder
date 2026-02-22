// --- Types ---

export interface Lab {
  id: string;
  name: string;
  url: string;
}

export interface Provider {
  id: string;
  name: string;
  url: string;
}

export interface ModelProvider {
  providerId: string;
  costPer1MInput: number;
  costPer1MOutput: number;
  costPer1MCachedInput?: number;
  tokensPerSecond: number;
}

/** Weighted avg $/1M tokens (3:1 input:output) */
export function blendedCost(p: ModelProvider): number {
  return (p.costPer1MInput * 3 + p.costPer1MOutput) / 4;
}

export interface Scores {
  coding?: number; // SWE-Bench Verified (%)
  codingLive?: number; // LiveCodeBench (%)
  reasoning: number; // GPQA Diamond (%)
  reasoningHle?: number; // Humanity's Last Exam (%)
  math?: number; // AIME 2025 or 2026 (%)
  mathBenchmark?: "AIME 2025" | "AIME 2026";
  general?: number; // MMLU-Pro (%)
  multimodal?: number; // MMMU-Pro (%)
  elo?: number; // LMArena Elo rating
}

export interface Model {
  id: string;
  name: string;
  labId: string;
  contextWindow: number; // max tokens
  maxOutputTokens: number;
  knowledgeCutoff?: string;
  parameters?: { total: number; active?: number }; // billions
  supportsImages: boolean;
  thinking?: { type: "always" | "controllable"; budgetRange?: string };
  openWeights: boolean;
  releaseDate: string; // ISO date string YYYY-MM-DD
  releaseUrl?: string;
  expectingMoreBenchmarks?: boolean; // true = missing scores likely to appear soon
  scores: Scores;
  providers: ModelProvider[];
}

// --- Helpers ---

/**
 * Composite intelligence score (0-100) using anchored min-max normalization.
 * Each benchmark is normalized to 0-1 using fixed floor/ceiling "goalposts",
 * then averaged equally. Multimodal and Elo are excluded (shown separately).
 */
const GOALPOSTS: Record<string, { floor: number; ceiling: number }> = {
  coding:       { floor: 0,  ceiling: 80 },  // SWE-Bench Verified
  codingLive:   { floor: 0,  ceiling: 80 },  // LiveCodeBench (fallback for coding)
  reasoning:    { floor: 25, ceiling: 100 },  // GPQA Diamond (4-choice → 25% random)
  reasoningHle: { floor: 0,  ceiling: 100 },  // Humanity's Last Exam
  math:         { floor: 0,  ceiling: 100 },  // AIME 2025/2026
  general:      { floor: 10, ceiling: 100 },  // MMLU-Pro (10-choice → 10% random)
};

function normalize(raw: number, key: string): number {
  const gp = GOALPOSTS[key];
  return Math.max(0, Math.min(1, (raw - gp.floor) / (gp.ceiling - gp.floor)));
}

export function overallScore(model: Model): number {
  const s = model.scores;
  const parts = [
    normalize(s.reasoning, "reasoning"),
  ];
  if (s.general != null) {
    parts.push(normalize(s.general, "general"));
  }
  // Coding: prefer SWE-Bench, fall back to LiveCodeBench
  if (s.coding != null) {
    parts.push(normalize(s.coding, "coding"));
  } else if (s.codingLive != null) {
    parts.push(normalize(s.codingLive, "codingLive"));
  }
  if (s.math != null) {
    parts.push(normalize(s.math, "math"));
  }
  if (s.reasoningHle != null) {
    parts.push(normalize(s.reasoningHle, "reasoningHle"));
  }
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
}

/** Best (lowest) blended cost across providers */
export function bestCost(model: Model): number {
  return Math.min(...model.providers.map((p) => blendedCost(p)));
}

/** Best (highest) speed across providers */
export function bestSpeed(model: Model): number {
  return Math.max(...model.providers.map((p) => p.tokensPerSecond));
}

/** Cost range [min, max] across providers */
export function costRange(model: Model): [number, number] {
  const costs = model.providers.map((p) => blendedCost(p));
  return [Math.min(...costs), Math.max(...costs)];
}

/** Speed range [min, max] across providers */
export function speedRange(model: Model): [number, number] {
  const speeds = model.providers.map((p) => p.tokensPerSecond);
  return [Math.min(...speeds), Math.max(...speeds)];
}

export function getProvider(id: string): Provider | undefined {
  return providers.find((p) => p.id === id);
}

export function getLab(id: string): Lab | undefined {
  return labs.find((l) => l.id === id);
}

/** Format token count as human-readable string */
export function formatContext(tokens: number): string {
  if (tokens >= 1_000_000) return `${Math.round(tokens / 1_000_000)}M`;
  return `${Math.round(tokens / 1_000)}K`;
}

/** Format parameter count for display */
export function formatParams(params?: { total: number; active?: number }): string {
  if (!params) return "Undisclosed";
  if (params.active) return `${params.total}B (${params.active}B active)`;
  return `${params.total}B`;
}

// --- Reference data ---

export const labs: Lab[] = [
  { id: "anthropic", name: "Anthropic", url: "https://www.anthropic.com" },
  { id: "openai", name: "OpenAI", url: "https://openai.com" },
  { id: "google", name: "Google", url: "https://deepmind.google" },
  { id: "meta", name: "Meta", url: "https://ai.meta.com" },
  { id: "deepseek", name: "DeepSeek", url: "https://www.deepseek.com" },
  { id: "alibaba", name: "Alibaba", url: "https://www.alibabacloud.com/en/solutions/generative-ai" },
  { id: "mistral", name: "Mistral", url: "https://mistral.ai" },
  { id: "cohere", name: "Cohere", url: "https://cohere.com" },
  { id: "microsoft", name: "Microsoft", url: "https://www.microsoft.com/en-us/research/ai/" },
  { id: "xai", name: "xAI", url: "https://x.ai" },
  { id: "moonshot", name: "Moonshot AI", url: "https://www.moonshot.ai" },
  { id: "zhipu", name: "Zhipu AI", url: "https://z.ai" },
  { id: "minimax", name: "MiniMax", url: "https://www.minimax.io" },
];

export const providers: Provider[] = [
  { id: "anthropic", name: "Anthropic", url: "https://docs.anthropic.com/en/docs/about-claude/models" },
  { id: "openai", name: "OpenAI", url: "https://platform.openai.com/docs/models" },
  { id: "google", name: "Google", url: "https://ai.google.dev/gemini-api/docs/models" },
  { id: "together", name: "Together AI", url: "https://www.together.ai/models" },
  { id: "fireworks", name: "Fireworks", url: "https://fireworks.ai/models" },
  { id: "bedrock", name: "AWS Bedrock", url: "https://aws.amazon.com/bedrock/" },
  { id: "azure", name: "Azure", url: "https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models" },
  { id: "deepseek", name: "DeepSeek", url: "https://platform.deepseek.com/api-docs" },
  { id: "mistral", name: "Mistral", url: "https://docs.mistral.ai/getting-started/models/" },
  { id: "cohere", name: "Cohere", url: "https://docs.cohere.com/v2/docs/models" },
  { id: "vertex", name: "Google Vertex", url: "https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models" },
  { id: "xai", name: "xAI", url: "https://docs.x.ai/developers/models" },
  { id: "groq", name: "Groq", url: "https://groq.com/models" },
  { id: "cerebras", name: "Cerebras", url: "https://www.cerebras.ai/inference" },
];

// --- Models ---

export const models: Model[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    labId: "openai",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    knowledgeCutoff: "2023-10",
    supportsImages: true,
    openWeights: false,
    releaseDate: "2024-05-13",
    releaseUrl: "https://openai.com/index/hello-gpt-4o/",
    scores: { coding: 33, reasoning: 51, reasoningHle: 3, math: 6, mathBenchmark: "AIME 2025", general: 73, multimodal: 54, elo: 1346 },
    providers: [
      { providerId: "openai", costPer1MInput: 2.50, costPer1MOutput: 10.00, costPer1MCachedInput: 1.25, tokensPerSecond: 134 },
      { providerId: "azure", costPer1MInput: 2.50, costPer1MOutput: 10.00, costPer1MCachedInput: 1.25, tokensPerSecond: 170 },
    ],
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    labId: "openai",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    knowledgeCutoff: "2023-10",
    supportsImages: true,
    openWeights: false,
    releaseDate: "2024-07-18",
    releaseUrl: "https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/",
    scores: { codingLive: 23, reasoning: 43, reasoningHle: 4, math: 15, mathBenchmark: "AIME 2025", general: 65, elo: 1318 },
    providers: [
      { providerId: "openai", costPer1MInput: 0.15, costPer1MOutput: 0.60, costPer1MCachedInput: 0.075, tokensPerSecond: 54 },
      { providerId: "azure", costPer1MInput: 0.15, costPer1MOutput: 0.60, costPer1MCachedInput: 0.075, tokensPerSecond: 54 },
    ],
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    labId: "openai",
    contextWindow: 1_048_576,
    maxOutputTokens: 32_768,
    knowledgeCutoff: "2024-06",
    supportsImages: true,
    openWeights: false,
    releaseDate: "2025-04-14",
    releaseUrl: "https://openai.com/index/gpt-4-1/",
    scores: { coding: 55, codingLive: 46, reasoning: 67, reasoningHle: 5, math: 35, mathBenchmark: "AIME 2025", general: 81, elo: 1413 },
    providers: [
      { providerId: "openai", costPer1MInput: 2.00, costPer1MOutput: 8.00, costPer1MCachedInput: 0.50, tokensPerSecond: 67 },
      { providerId: "azure", costPer1MInput: 2.00, costPer1MOutput: 8.00, costPer1MCachedInput: 0.50, tokensPerSecond: 104 },
    ],
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 mini",
    labId: "openai",
    contextWindow: 1_048_576,
    maxOutputTokens: 32_768,
    knowledgeCutoff: "2024-06",
    supportsImages: true,
    openWeights: false,
    releaseDate: "2025-04-14",
    releaseUrl: "https://openai.com/index/gpt-4-1/",
    scores: { codingLive: 48, reasoning: 66, reasoningHle: 5, math: 46, mathBenchmark: "AIME 2025", general: 78, elo: 1382 },
    providers: [
      { providerId: "openai", costPer1MInput: 0.40, costPer1MOutput: 1.60, costPer1MCachedInput: 0.10, tokensPerSecond: 70 },
      { providerId: "azure", costPer1MInput: 0.40, costPer1MOutput: 1.60, costPer1MCachedInput: 0.10, tokensPerSecond: 78 },
    ],
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 nano",
    labId: "openai",
    contextWindow: 1_048_576,
    maxOutputTokens: 32_768,
    knowledgeCutoff: "2024-06",
    supportsImages: true,
    openWeights: false,
    releaseDate: "2025-04-14",
    releaseUrl: "https://openai.com/index/gpt-4-1/",
    scores: { codingLive: 33, reasoning: 51, reasoningHle: 4, math: 24, mathBenchmark: "AIME 2025", general: 66, elo: 1322 },
    providers: [
      { providerId: "openai", costPer1MInput: 0.10, costPer1MOutput: 0.40, costPer1MCachedInput: 0.025, tokensPerSecond: 98 },
      { providerId: "azure", costPer1MInput: 0.10, costPer1MOutput: 0.40, costPer1MCachedInput: 0.025, tokensPerSecond: 142 },
    ],
  },
  {
    id: "o1",
    name: "o1",
    labId: "openai",
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    knowledgeCutoff: "2023-10",
    supportsImages: true,
    thinking: { type: "always" },
    openWeights: false,
    releaseDate: "2024-09-12",
    releaseUrl: "https://openai.com/index/introducing-openai-o1-preview/",
    scores: { coding: 49, codingLive: 68, reasoning: 75, reasoningHle: 8, general: 84, elo: 1402 },
    providers: [
      { providerId: "openai", costPer1MInput: 15.00, costPer1MOutput: 60.00, costPer1MCachedInput: 7.50, tokensPerSecond: 160 },
      { providerId: "azure", costPer1MInput: 15.00, costPer1MOutput: 60.00, costPer1MCachedInput: 7.50, tokensPerSecond: 174 },
    ],
  },
  {
    id: "o3",
    name: "o3",
    labId: "openai",
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    knowledgeCutoff: "2024-06",
    supportsImages: true,
    thinking: { type: "controllable", budgetRange: "low / medium / high" },
    openWeights: false,
    releaseDate: "2025-04-16",
    releaseUrl: "https://openai.com/index/introducing-o3-and-o4-mini/",
    scores: { coding: 69, codingLive: 81, reasoning: 83, reasoningHle: 20, math: 88, mathBenchmark: "AIME 2025", general: 85, elo: 1432 },
    providers: [
      { providerId: "openai", costPer1MInput: 2.00, costPer1MOutput: 8.00, costPer1MCachedInput: 0.50, tokensPerSecond: 109 },
      { providerId: "azure", costPer1MInput: 2.00, costPer1MOutput: 8.00, costPer1MCachedInput: 0.50, tokensPerSecond: 141 },
    ],
  },
  {
    id: "o4-mini",
    name: "o4-mini",
    labId: "openai",
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    knowledgeCutoff: "2024-06",
    supportsImages: true,
    thinking: { type: "controllable", budgetRange: "low / medium / high" },
    openWeights: false,
    releaseDate: "2025-04-16",
    releaseUrl: "https://openai.com/index/introducing-o3-and-o4-mini/",
    scores: { coding: 68, codingLive: 86, reasoning: 78, reasoningHle: 18, math: 91, mathBenchmark: "AIME 2025", general: 83 },
    providers: [
      { providerId: "openai", costPer1MInput: 1.10, costPer1MOutput: 4.40, costPer1MCachedInput: 0.275, tokensPerSecond: 116 },
      { providerId: "azure", costPer1MInput: 1.10, costPer1MOutput: 4.40, costPer1MCachedInput: 0.275, tokensPerSecond: 134 },
    ],
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    labId: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    knowledgeCutoff: "2024-09",
    supportsImages: true,
    thinking: { type: "controllable", budgetRange: "low / medium / high" },
    openWeights: false,
    releaseDate: "2025-08-07",
    releaseUrl: "https://openai.com/index/introducing-gpt-5/",
    scores: { coding: 75, codingLive: 85, reasoning: 85, reasoningHle: 27, math: 94, mathBenchmark: "AIME 2025", general: 87, elo: 1434 },
    providers: [
      { providerId: "openai", costPer1MInput: 1.25, costPer1MOutput: 10.00, costPer1MCachedInput: 0.125, tokensPerSecond: 89 },
      { providerId: "azure", costPer1MInput: 1.25, costPer1MOutput: 10.00, costPer1MCachedInput: 0.125, tokensPerSecond: 98 },
    ],
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 mini",
    labId: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    knowledgeCutoff: "2024-05",
    supportsImages: true,
    thinking: { type: "controllable", budgetRange: "low / medium / high" },
    openWeights: false,
    releaseDate: "2025-08-07",
    releaseUrl: "https://openai.com/index/introducing-gpt-5/",
    scores: { codingLive: 84, reasoning: 83, reasoningHle: 20, math: 91, mathBenchmark: "AIME 2025", general: 84 },
    providers: [
      { providerId: "openai", costPer1MInput: 0.25, costPer1MOutput: 2.00, costPer1MCachedInput: 0.025, tokensPerSecond: 74 },
      { providerId: "azure", costPer1MInput: 0.25, costPer1MOutput: 2.00, costPer1MCachedInput: 0.025, tokensPerSecond: 75 },
    ],
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 nano",
    labId: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    knowledgeCutoff: "2024-05",
    supportsImages: true,
    thinking: { type: "controllable", budgetRange: "low / medium / high" },
    openWeights: false,
    releaseDate: "2025-08-07",
    releaseUrl: "https://openai.com/index/introducing-gpt-5/",
    scores: { codingLive: 79, reasoning: 68, reasoningHle: 8, math: 84, mathBenchmark: "AIME 2025", general: 78, elo: 1338 },
    providers: [
      { providerId: "openai", costPer1MInput: 0.05, costPer1MOutput: 0.40, costPer1MCachedInput: 0.005, tokensPerSecond: 128 },
      { providerId: "azure", costPer1MInput: 0.05, costPer1MOutput: 0.40, costPer1MCachedInput: 0.005, tokensPerSecond: 131 },
    ],
  },
  {
    id: "gpt-5.1",
    name: "GPT-5.1",
    labId: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    knowledgeCutoff: "2024-09",
    supportsImages: true,
    thinking: { type: "controllable", budgetRange: "low / medium / high" },
    openWeights: false,
    releaseDate: "2025-11-12",
    releaseUrl: "https://openai.com/index/gpt-5-1/",
    scores: { coding: 76, codingLive: 87, reasoning: 87, reasoningHle: 27, math: 94, mathBenchmark: "AIME 2025", general: 87, elo: 1458 },
    providers: [
      { providerId: "openai", costPer1MInput: 1.25, costPer1MOutput: 10.00, costPer1MCachedInput: 0.125, tokensPerSecond: 124 },
      { providerId: "azure", costPer1MInput: 1.25, costPer1MOutput: 10.00, costPer1MCachedInput: 0.125, tokensPerSecond: 136 },
    ],
  },
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    labId: "openai",
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    knowledgeCutoff: "2025-08",
    supportsImages: true,
    thinking: { type: "controllable", budgetRange: "low / medium / high / xhigh" },
    openWeights: false,
    releaseDate: "2025-12-11",
    releaseUrl: "https://openai.com/index/introducing-gpt-5-2/",
    scores: { coding: 80, codingLive: 89, reasoning: 90, reasoningHle: 35, math: 99, mathBenchmark: "AIME 2025", general: 87, elo: 1441 },
    providers: [
      { providerId: "openai", costPer1MInput: 1.75, costPer1MOutput: 14.00, costPer1MCachedInput: 0.175, tokensPerSecond: 87 },
      { providerId: "azure", costPer1MInput: 1.75, costPer1MOutput: 14.00, costPer1MCachedInput: 0.175, tokensPerSecond: 88 },
    ],
  },
  {
    id: "gpt-oss-120b",
    name: "GPT-OSS 120B",
    labId: "openai",
    contextWindow: 131_072,
    maxOutputTokens: 16_384,
    knowledgeCutoff: "2024-06",
    parameters: { total: 117, active: 5 },
    supportsImages: false,
    thinking: { type: "controllable" },
    openWeights: true,
    releaseDate: "2025-08-05",
    releaseUrl: "https://openai.com/index/introducing-gpt-oss/",
    scores: { coding: 62, codingLive: 88, reasoning: 78, reasoningHle: 19, math: 93, mathBenchmark: "AIME 2025", general: 81, elo: 1354 },
    providers: [
      { providerId: "fireworks", costPer1MInput: 0.15, costPer1MOutput: 0.60, tokensPerSecond: 765 },
      { providerId: "cerebras", costPer1MInput: 0.35, costPer1MOutput: 0.75, tokensPerSecond: 2951 },
      { providerId: "groq", costPer1MInput: 0.15, costPer1MOutput: 0.60, tokensPerSecond: 500 },
    ],
  },
  // --- Anthropic ---
  {
    id: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    labId: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    knowledgeCutoff: "2025-07",
    supportsImages: true,
    thinking: { type: "controllable" },
    openWeights: false,
    releaseDate: "2025-09-29",
    releaseUrl: "https://www.anthropic.com/news/claude-sonnet-4-5",
    scores: { coding: 77, codingLive: 71, reasoning: 83, reasoningHle: 17, math: 88, mathBenchmark: "AIME 2025", general: 88 },
    providers: [
      { providerId: "anthropic", costPer1MInput: 3.00, costPer1MOutput: 15.00, costPer1MCachedInput: 0.30, tokensPerSecond: 85 },
      { providerId: "bedrock", costPer1MInput: 3.00, costPer1MOutput: 15.00, costPer1MCachedInput: 0.30, tokensPerSecond: 103 },
      { providerId: "vertex", costPer1MInput: 3.00, costPer1MOutput: 15.00, costPer1MCachedInput: 0.30, tokensPerSecond: 49 },
    ],
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    labId: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    knowledgeCutoff: "2025-02",
    supportsImages: true,
    thinking: { type: "controllable" },
    openWeights: false,
    releaseDate: "2025-10-15",
    releaseUrl: "https://www.anthropic.com/news/claude-haiku-4-5",
    scores: { coding: 73, codingLive: 51, reasoning: 65, reasoningHle: 4, math: 39, mathBenchmark: "AIME 2025", general: 80 },
    providers: [
      { providerId: "anthropic", costPer1MInput: 1.00, costPer1MOutput: 5.00, costPer1MCachedInput: 0.10, tokensPerSecond: 109 },
      { providerId: "bedrock", costPer1MInput: 1.00, costPer1MOutput: 5.00, costPer1MCachedInput: 0.10, tokensPerSecond: 95 },
      { providerId: "vertex", costPer1MInput: 1.00, costPer1MOutput: 5.00, costPer1MCachedInput: 0.10, tokensPerSecond: 87 },
    ],
  },
  {
    id: "claude-opus-4-5",
    name: "Claude Opus 4.5",
    labId: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    knowledgeCutoff: "2025-05",
    supportsImages: true,
    thinking: { type: "controllable" },
    openWeights: false,
    releaseDate: "2025-11-24",
    releaseUrl: "https://www.anthropic.com/news/claude-opus-4-5",
    scores: { coding: 81, codingLive: 87, reasoning: 87, reasoningHle: 28, math: 91, mathBenchmark: "AIME 2025", general: 90 },
    providers: [
      { providerId: "anthropic", costPer1MInput: 5.00, costPer1MOutput: 25.00, costPer1MCachedInput: 0.50, tokensPerSecond: 88 },
      { providerId: "bedrock", costPer1MInput: 5.00, costPer1MOutput: 25.00, costPer1MCachedInput: 0.50, tokensPerSecond: 82 },
      { providerId: "vertex", costPer1MInput: 5.00, costPer1MOutput: 25.00, costPer1MCachedInput: 0.50, tokensPerSecond: 75 },
    ],
  },
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    labId: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 128_000,
    knowledgeCutoff: "2025-08",
    supportsImages: true,
    thinking: { type: "controllable" },
    openWeights: false,
    releaseDate: "2026-02-05",
    releaseUrl: "https://www.anthropic.com/news/claude-opus-4-6",
    expectingMoreBenchmarks: true,
    scores: { coding: 81, reasoning: 90, reasoningHle: 37, math: 100, mathBenchmark: "AIME 2025", multimodal: 74 },
    providers: [
      { providerId: "anthropic", costPer1MInput: 5.00, costPer1MOutput: 25.00, costPer1MCachedInput: 0.50, tokensPerSecond: 73 },
      { providerId: "bedrock", costPer1MInput: 5.00, costPer1MOutput: 25.00, costPer1MCachedInput: 0.50, tokensPerSecond: 67 },
      { providerId: "vertex", costPer1MInput: 5.00, costPer1MOutput: 25.00, costPer1MCachedInput: 0.50, tokensPerSecond: 56 },
    ],
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    labId: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    knowledgeCutoff: "2025-08",
    supportsImages: true,
    thinking: { type: "controllable" },
    openWeights: false,
    releaseDate: "2026-02-17",
    releaseUrl: "https://www.anthropic.com/news/claude-sonnet-4-6",
    expectingMoreBenchmarks: true,
    scores: { coding: 80, reasoning: 88, reasoningHle: 30, general: 89, multimodal: 75 },
    providers: [
      { providerId: "anthropic", costPer1MInput: 3.00, costPer1MOutput: 15.00, costPer1MCachedInput: 0.30, tokensPerSecond: 57 },
      { providerId: "bedrock", costPer1MInput: 3.00, costPer1MOutput: 15.00, costPer1MCachedInput: 0.30, tokensPerSecond: 64 },
      { providerId: "vertex", costPer1MInput: 3.00, costPer1MOutput: 15.00, costPer1MCachedInput: 0.30, tokensPerSecond: 51 },
    ],
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    labId: "google",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    knowledgeCutoff: "2025-01",
    supportsImages: true,
    thinking: { type: "controllable" },
    openWeights: false,
    releaseDate: "2025-06-05",
    releaseUrl: "https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/",
    scores: { coding: 64, codingLive: 80, reasoning: 84, reasoningHle: 21, math: 88, mathBenchmark: "AIME 2025", general: 86, elo: 1465 },
    providers: [
      { providerId: "google", costPer1MInput: 1.25, costPer1MOutput: 10.00, costPer1MCachedInput: 0.125, tokensPerSecond: 159 },
      { providerId: "vertex", costPer1MInput: 1.25, costPer1MOutput: 10.00, costPer1MCachedInput: 0.125, tokensPerSecond: 139 },
    ],
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    labId: "google",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    knowledgeCutoff: "2025-01",
    supportsImages: true,
    thinking: { type: "controllable" },
    openWeights: false,
    releaseDate: "2025-05-20",
    scores: { codingLive: 70, reasoning: 79, reasoningHle: 11, math: 73, mathBenchmark: "AIME 2025", general: 83 },
    providers: [
      { providerId: "google", costPer1MInput: 0.30, costPer1MOutput: 2.50, costPer1MCachedInput: 0.03, tokensPerSecond: 282 },
      { providerId: "vertex", costPer1MInput: 0.30, costPer1MOutput: 2.50, costPer1MCachedInput: 0.03, tokensPerSecond: 223 },
    ],
  },
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    labId: "google",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    knowledgeCutoff: "2025-01",
    supportsImages: true,
    thinking: { type: "controllable" },
    openWeights: false,
    releaseDate: "2025-11-18",
    scores: { coding: 76, codingLive: 92, reasoning: 91, reasoningHle: 37, math: 96, mathBenchmark: "AIME 2025", general: 90, elo: 1492 },
    providers: [
      { providerId: "google", costPer1MInput: 2.00, costPer1MOutput: 12.00, costPer1MCachedInput: 0.20, tokensPerSecond: 127 },
      { providerId: "vertex", costPer1MInput: 2.00, costPer1MOutput: 12.00, costPer1MCachedInput: 0.20, tokensPerSecond: 142 },
    ],
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    labId: "google",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    knowledgeCutoff: "2025-01",
    supportsImages: true,
    thinking: { type: "controllable" },
    openWeights: false,
    releaseDate: "2025-12-17",
    releaseUrl: "https://blog.google/products-and-platforms/products/gemini/gemini-3-flash/",
    scores: { coding: 78, codingLive: 91, reasoning: 90, reasoningHle: 35, math: 97, mathBenchmark: "AIME 2025", general: 89 },
    providers: [
      { providerId: "google", costPer1MInput: 0.50, costPer1MOutput: 3.00, costPer1MCachedInput: 0.05, tokensPerSecond: 215 },
      { providerId: "vertex", costPer1MInput: 0.50, costPer1MOutput: 3.00, costPer1MCachedInput: 0.05, tokensPerSecond: 209 },
    ],
  },
  {
    id: "gemini-3.1-pro",
    name: "Gemini 3.1 Pro",
    labId: "google",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    knowledgeCutoff: "2025-01",
    supportsImages: true,
    thinking: { type: "controllable" },
    openWeights: false,
    releaseDate: "2026-02-19",
    releaseUrl: "https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-pro/",
    expectingMoreBenchmarks: true,
    scores: { coding: 81, reasoning: 94, reasoningHle: 45 },
    providers: [
      { providerId: "google", costPer1MInput: 2.00, costPer1MOutput: 12.00, costPer1MCachedInput: 0.20, tokensPerSecond: 104 },
      { providerId: "vertex", costPer1MInput: 2.00, costPer1MOutput: 12.00, costPer1MCachedInput: 0.20, tokensPerSecond: 130 },
    ],
  },
  {
    id: "grok-4",
    name: "Grok 4",
    labId: "xai",
    contextWindow: 256_000,
    maxOutputTokens: 131_072,
    knowledgeCutoff: "2024-11",
    supportsImages: true,
    thinking: { type: "always" },
    openWeights: false,
    releaseDate: "2025-07-10",
    releaseUrl: "https://x.ai/news/grok-4",
    scores: { codingLive: 82, reasoning: 88, reasoningHle: 24, math: 93, mathBenchmark: "AIME 2025", general: 87 },
    providers: [
      { providerId: "xai", costPer1MInput: 3.00, costPer1MOutput: 15.00, costPer1MCachedInput: 0.75, tokensPerSecond: 36 },
    ],
  },
  {
    id: "grok-4.1-fast",
    name: "Grok 4.1 Fast",
    labId: "xai",
    contextWindow: 2_000_000,
    maxOutputTokens: 131_072,
    knowledgeCutoff: "2024-11",
    supportsImages: true,
    thinking: { type: "controllable" },
    openWeights: false,
    releaseDate: "2025-11-19",
    releaseUrl: "https://x.ai/news/grok-4-1-fast",
    scores: { codingLive: 82, reasoning: 85, reasoningHle: 18, math: 89, mathBenchmark: "AIME 2025", general: 85 },
    providers: [
      { providerId: "xai", costPer1MInput: 0.20, costPer1MOutput: 0.50, costPer1MCachedInput: 0.05, tokensPerSecond: 150 },
    ],
  },
  // --- Mistral ---
  {
    id: "magistral-medium-2509",
    name: "Magistral Medium",
    labId: "mistral",
    contextWindow: 128_000,
    maxOutputTokens: 128_000,
    knowledgeCutoff: "2025-06",
    supportsImages: true,
    thinking: { type: "controllable" },
    openWeights: false,
    releaseDate: "2025-09-18",
    releaseUrl: "https://mistral.ai/news/magistral",
    scores: { codingLive: 75, reasoning: 74, reasoningHle: 10, math: 82, mathBenchmark: "AIME 2025", general: 82 },
    providers: [
      { providerId: "mistral", costPer1MInput: 2.00, costPer1MOutput: 5.00, tokensPerSecond: 29 },
    ],
  },
  {
    id: "mistral-large-2512",
    name: "Mistral Large 3",
    labId: "mistral",
    contextWindow: 262_144,
    maxOutputTokens: 128_000,
    parameters: { total: 675, active: 41 },
    supportsImages: true,
    openWeights: true,
    releaseDate: "2025-12-02",
    releaseUrl: "https://mistral.ai/news/mistral-3",
    scores: { codingLive: 47, reasoning: 68, reasoningHle: 4, math: 38, mathBenchmark: "AIME 2025", general: 81, elo: 1418 },
    providers: [
      { providerId: "mistral", costPer1MInput: 0.50, costPer1MOutput: 1.50, tokensPerSecond: 56 },
      { providerId: "bedrock", costPer1MInput: 0.50, costPer1MOutput: 1.50, tokensPerSecond: 147 },
    ],
  },
  // --- DeepSeek ---
  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    labId: "deepseek",
    contextWindow: 64_000,
    maxOutputTokens: 8_000,
    knowledgeCutoff: "2024-07",
    parameters: { total: 671, active: 37 },
    supportsImages: false,
    openWeights: true,
    releaseDate: "2024-12-26",
    scores: { codingLive: 36, reasoning: 56, reasoningHle: 4, math: 26, mathBenchmark: "AIME 2025", general: 75 },
    providers: [
      { providerId: "together", costPer1MInput: 0.40, costPer1MOutput: 0.89, tokensPerSecond: 75 },
      { providerId: "bedrock", costPer1MInput: 0.58, costPer1MOutput: 1.68, tokensPerSecond: 75 },
      { providerId: "vertex", costPer1MInput: 0.56, costPer1MOutput: 1.68, tokensPerSecond: 120 },
    ],
  },
  {
    id: "deepseek-r1-0528",
    name: "DeepSeek R1",
    labId: "deepseek",
    contextWindow: 128_000,
    maxOutputTokens: 65_536,
    knowledgeCutoff: "2024-07",
    parameters: { total: 671, active: 37 },
    supportsImages: false,
    thinking: { type: "always" },
    openWeights: true,
    releaseDate: "2025-05-28",
    releaseUrl: "https://api-docs.deepseek.com/news/news250528",
    scores: { codingLive: 77, reasoning: 81, reasoningHle: 15, math: 76, mathBenchmark: "AIME 2025", general: 85 },
    providers: [
      { providerId: "together", costPer1MInput: 3.00, costPer1MOutput: 7.00, tokensPerSecond: 306 },
      { providerId: "bedrock", costPer1MInput: 1.35, costPer1MOutput: 5.40, tokensPerSecond: 306 },
      { providerId: "vertex", costPer1MInput: 1.35, costPer1MOutput: 5.50, tokensPerSecond: 120 },
    ],
  },
  {
    id: "deepseek-v3.1",
    name: "DeepSeek V3.1",
    labId: "deepseek",
    contextWindow: 128_000,
    maxOutputTokens: 8_000,
    knowledgeCutoff: "2024-07",
    parameters: { total: 671, active: 37 },
    supportsImages: false,
    thinking: { type: "controllable" },
    openWeights: true,
    releaseDate: "2025-08-21",
    releaseUrl: "https://api-docs.deepseek.com/news/news250821",
    scores: { coding: 66, codingLive: 78, reasoning: 78, reasoningHle: 13, math: 90, mathBenchmark: "AIME 2025", general: 85 },
    providers: [
      { providerId: "fireworks", costPer1MInput: 0.56, costPer1MOutput: 1.68, costPer1MCachedInput: 0.28, tokensPerSecond: 347 },
      { providerId: "together", costPer1MInput: 0.60, costPer1MOutput: 1.70, tokensPerSecond: 278 },
    ],
  },
  {
    id: "deepseek-chat",
    name: "DeepSeek V3.2",
    labId: "deepseek",
    contextWindow: 128_000,
    maxOutputTokens: 8_000,
    knowledgeCutoff: "2024-07",
    parameters: { total: 671, active: 37 },
    supportsImages: false,
    thinking: { type: "controllable" },
    openWeights: true,
    releaseDate: "2025-12-01",
    releaseUrl: "https://api-docs.deepseek.com/news/news251201",
    scores: { coding: 73, codingLive: 86, reasoning: 84, reasoningHle: 22, math: 94, mathBenchmark: "AIME 2026", general: 86 },
    providers: [
      { providerId: "deepseek", costPer1MInput: 0.28, costPer1MOutput: 0.42, costPer1MCachedInput: 0.028, tokensPerSecond: 50 },
      { providerId: "fireworks", costPer1MInput: 0.56, costPer1MOutput: 1.68, costPer1MCachedInput: 0.28, tokensPerSecond: 219 },
    ],
  },
  // --- Meta ---
  {
    id: "llama-4-maverick",
    name: "Llama 4 Maverick",
    labId: "meta",
    contextWindow: 1_048_576,
    maxOutputTokens: 16_384,
    knowledgeCutoff: "2024-08",
    parameters: { total: 402, active: 17 },
    supportsImages: true,
    openWeights: true,
    releaseDate: "2025-04-05",
    releaseUrl: "https://ai.meta.com/blog/llama-4-multimodal-intelligence/",
    scores: { codingLive: 40, reasoning: 67, reasoningHle: 5, math: 19, mathBenchmark: "AIME 2025", general: 81, elo: 1292 },
    providers: [
      { providerId: "together", costPer1MInput: 0.27, costPer1MOutput: 0.85, tokensPerSecond: 126 },
      { providerId: "fireworks", costPer1MInput: 0.22, costPer1MOutput: 0.88, tokensPerSecond: 145 },
      { providerId: "groq", costPer1MInput: 0.20, costPer1MOutput: 0.60, tokensPerSecond: 434 },
      { providerId: "azure", costPer1MInput: 0.27, costPer1MOutput: 0.85, tokensPerSecond: 127 },
      { providerId: "bedrock", costPer1MInput: 0.24, costPer1MOutput: 0.97, tokensPerSecond: 213 },
      { providerId: "vertex", costPer1MInput: 0.20, costPer1MOutput: 0.60, tokensPerSecond: 152 },
    ],
  },
  // --- Alibaba ---
  {
    id: "qwen3.5-397b",
    name: "Qwen3.5 397B",
    labId: "alibaba",
    contextWindow: 262_144,
    maxOutputTokens: 81_920,
    parameters: { total: 397, active: 17 },
    supportsImages: true,
    thinking: { type: "controllable" },
    openWeights: true,
    releaseDate: "2026-02-16",
    releaseUrl: "https://www.alibabacloud.com/blog/qwen3-5-towards-native-multimodal-agents_602894",
    scores: { coding: 76, codingLive: 84, reasoning: 89, reasoningHle: 27, math: 91, mathBenchmark: "AIME 2026", general: 88, elo: 1450 },
    providers: [
      { providerId: "together", costPer1MInput: 0.60, costPer1MOutput: 3.60, tokensPerSecond: 74 },
    ],
  },
  // --- Moonshot AI ---
  {
    id: "kimi-k2.5",
    name: "Kimi K2.5",
    labId: "moonshot",
    contextWindow: 262_144,
    maxOutputTokens: 32_768,
    parameters: { total: 1040, active: 32 },
    supportsImages: true,
    thinking: { type: "controllable" },
    openWeights: true,
    releaseDate: "2026-01-27",
    releaseUrl: "https://www.kimi.com/blog/kimi-k2-5.html",
    scores: { coding: 77, codingLive: 85, reasoning: 88, reasoningHle: 29, math: 96, mathBenchmark: "AIME 2025", general: 87, elo: 1449 },
    providers: [
      { providerId: "together", costPer1MInput: 0.50, costPer1MOutput: 2.80, tokensPerSecond: 45 },
      { providerId: "fireworks", costPer1MInput: 0.60, costPer1MOutput: 3.00, costPer1MCachedInput: 0.10, tokensPerSecond: 345 },
    ],
  },
  // --- Zhipu AI ---
  {
    id: "glm-4-7",
    name: "GLM-4.7",
    labId: "zhipu",
    contextWindow: 200_000,
    maxOutputTokens: 128_000,
    parameters: { total: 355, active: 32 },
    supportsImages: false,
    thinking: { type: "controllable" },
    openWeights: true,
    releaseDate: "2025-12-22",
    releaseUrl: "https://z.ai/blog/glm-4.7",
    scores: { coding: 74, codingLive: 89, reasoning: 86, reasoningHle: 25, math: 95, mathBenchmark: "AIME 2025", general: 86, elo: 1441 },
    providers: [
      { providerId: "fireworks", costPer1MInput: 0.60, costPer1MOutput: 2.20, tokensPerSecond: 136 },
    ],
  },
  {
    id: "glm-5",
    name: "GLM-5",
    labId: "zhipu",
    contextWindow: 200_000,
    maxOutputTokens: 128_000,
    parameters: { total: 744, active: 40 },
    supportsImages: false,
    thinking: { type: "controllable" },
    openWeights: true,
    releaseDate: "2026-02-11",
    releaseUrl: "https://z.ai/blog/glm-5",
    expectingMoreBenchmarks: true,
    scores: { coding: 78, reasoning: 82, reasoningHle: 27, math: 93, mathBenchmark: "AIME 2026" },
    providers: [
      { providerId: "together", costPer1MInput: 1.00, costPer1MOutput: 3.20, tokensPerSecond: 55 },
      { providerId: "fireworks", costPer1MInput: 1.00, costPer1MOutput: 3.20, costPer1MCachedInput: 0.20, tokensPerSecond: 266 },
    ],
  },
  // --- MiniMax ---
  {
    id: "minimax-m2.5",
    name: "MiniMax M2.5",
    labId: "minimax",
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    parameters: { total: 230, active: 10 },
    supportsImages: false,
    thinking: { type: "controllable" },
    openWeights: true,
    releaseDate: "2026-02-12",
    releaseUrl: "https://www.minimax.io/news/minimax-m25",
    expectingMoreBenchmarks: true,
    scores: { coding: 80, codingLive: 65, reasoning: 85, reasoningHle: 19, math: 86, mathBenchmark: "AIME 2025", general: 77 },
    providers: [
      { providerId: "together", costPer1MInput: 0.30, costPer1MOutput: 1.20, tokensPerSecond: 58 },
      { providerId: "fireworks", costPer1MInput: 0.30, costPer1MOutput: 1.20, costPer1MCachedInput: 0.03, tokensPerSecond: 273 },
    ],
  },
  // --- Cohere ---
  {
    id: "command-a-03-2025",
    name: "Command A",
    labId: "cohere",
    contextWindow: 256_000,
    maxOutputTokens: 8_000,
    knowledgeCutoff: "2024-06",
    parameters: { total: 111 },
    supportsImages: false,
    openWeights: true,
    releaseDate: "2025-03-13",
    releaseUrl: "https://cohere.com/blog/command-a",
    scores: { codingLive: 29, reasoning: 53, reasoningHle: 5, math: 13, mathBenchmark: "AIME 2025", general: 71, elo: 1353 },
    providers: [
      { providerId: "cohere", costPer1MInput: 2.50, costPer1MOutput: 10.00, tokensPerSecond: 49 },
      { providerId: "azure", costPer1MInput: 2.50, costPer1MOutput: 10.00, tokensPerSecond: 49 },
    ],
  },
  {
    id: "command-r-plus-04-2024",
    name: "Command R+",
    labId: "cohere",
    contextWindow: 128_000,
    maxOutputTokens: 4_000,
    knowledgeCutoff: "2024-06",
    parameters: { total: 104 },
    supportsImages: false,
    openWeights: true,
    releaseDate: "2024-04-04",
    releaseUrl: "https://cohere.com/blog/command-r-plus-microsoft-azure",
    scores: { codingLive: 12, reasoning: 32, reasoningHle: 5, general: 43 },
    providers: [
      { providerId: "cohere", costPer1MInput: 3.00, costPer1MOutput: 15.00, tokensPerSecond: 59 },
      { providerId: "azure", costPer1MInput: 2.50, costPer1MOutput: 10.00, tokensPerSecond: 59 },
      { providerId: "bedrock", costPer1MInput: 3.00, costPer1MOutput: 15.00, tokensPerSecond: 59 },
    ],
  },
];
