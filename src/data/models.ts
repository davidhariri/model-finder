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
  knowledgeCutoff: string;
  parameters?: { total: number; active?: number }; // billions
  supportsImages: boolean;
  thinking?: { type: "always" | "controllable"; budgetRange?: string };
  openWeights: boolean;
  releaseDate: string; // ISO date string YYYY-MM-DD
  releaseUrl?: string;
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
    ],
  },
  {
    id: "claude-sonnet-4-5",
    name: "Claude 4.5 Sonnet",
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
    ],
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude 4.5 Haiku",
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
    ],
  },
  {
    id: "claude-opus-4-5",
    name: "Claude 4.5 Opus",
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
    scores: { coding: 81, reasoning: 90, reasoningHle: 37, math: 100, mathBenchmark: "AIME 2025", multimodal: 74 },
    providers: [
      { providerId: "anthropic", costPer1MInput: 5.00, costPer1MOutput: 25.00, costPer1MCachedInput: 0.50, tokensPerSecond: 73 },
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
    scores: { coding: 80, reasoning: 88, reasoningHle: 30, general: 89, multimodal: 75 },
    providers: [
      { providerId: "anthropic", costPer1MInput: 3.00, costPer1MOutput: 15.00, costPer1MCachedInput: 0.30, tokensPerSecond: 57 },
    ],
  },
];
