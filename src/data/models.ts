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
  blendedCost: number; // weighted avg $/1M tokens (3:1 input:output)
  tokensPerSecond: number;
}

export interface Scores {
  coding: number;
  reasoning: number;
  math: number;
  general: number;
}

export interface Model {
  id: string;
  name: string;
  labId: string;
  contextWindow: number; // max tokens
  supportsImages: boolean;
  openWeights: boolean;
  releaseDate: string; // ISO date string YYYY-MM-DD
  scores: Scores;
  providers: ModelProvider[];
}

// --- Helpers ---

/** Average score across all task benchmarks */
export function overallScore(model: Model): number {
  const { coding, reasoning, math, general } = model.scores;
  return Math.round((coding + reasoning + math + general) / 4);
}

/** Best (lowest) blended cost across providers */
export function bestCost(model: Model): number {
  return Math.min(...model.providers.map((p) => p.blendedCost));
}

/** Best (highest) speed across providers */
export function bestSpeed(model: Model): number {
  return Math.max(...model.providers.map((p) => p.tokensPerSecond));
}

/** Cost range [min, max] across providers */
export function costRange(model: Model): [number, number] {
  const costs = model.providers.map((p) => p.blendedCost);
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

/** Format context window as human-readable string */
export function formatContext(tokens: number): string {
  if (tokens >= 1_000_000) return `${tokens / 1_000_000}M`;
  return `${tokens / 1_000}K`;
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
    id: "claude-opus-4",
    name: "Claude Opus 4",
    labId: "anthropic",
    contextWindow: 200_000,
    supportsImages: true,
    openWeights: false,
    releaseDate: "2025-05-22",
    scores: { coding: 95, reasoning: 94, math: 90, general: 92 },
    providers: [
      { providerId: "anthropic", costPer1MInput: 15, costPer1MOutput: 75, blendedCost: 30, tokensPerSecond: 40 },
      { providerId: "bedrock", costPer1MInput: 15, costPer1MOutput: 75, blendedCost: 30, tokensPerSecond: 35 },
      { providerId: "vertex", costPer1MInput: 15, costPer1MOutput: 75, blendedCost: 30, tokensPerSecond: 38 },
    ],
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    labId: "openai",
    contextWindow: 128_000,
    supportsImages: true,
    openWeights: false,
    releaseDate: "2024-05-13",
    scores: { coding: 89, reasoning: 91, math: 92, general: 90 },
    providers: [
      { providerId: "openai", costPer1MInput: 2.5, costPer1MOutput: 10, blendedCost: 4.38, tokensPerSecond: 85 },
      { providerId: "azure", costPer1MInput: 2.5, costPer1MOutput: 10, blendedCost: 4.38, tokensPerSecond: 80 },
    ],
  },
  {
    id: "gemini-2-pro",
    name: "Gemini 2.0 Pro",
    labId: "google",
    contextWindow: 2_000_000,
    supportsImages: true,
    openWeights: false,
    releaseDate: "2025-03-25",
    scores: { coding: 87, reasoning: 90, math: 91, general: 88 },
    providers: [
      { providerId: "google", costPer1MInput: 1.25, costPer1MOutput: 5, blendedCost: 2.19, tokensPerSecond: 70 },
      { providerId: "vertex", costPer1MInput: 1.25, costPer1MOutput: 5, blendedCost: 2.19, tokensPerSecond: 65 },
    ],
  },
  {
    id: "claude-sonnet-4",
    name: "Claude Sonnet 4",
    labId: "anthropic",
    contextWindow: 200_000,
    supportsImages: true,
    openWeights: false,
    releaseDate: "2025-05-22",
    scores: { coding: 91, reasoning: 87, math: 85, general: 88 },
    providers: [
      { providerId: "anthropic", costPer1MInput: 3, costPer1MOutput: 15, blendedCost: 6, tokensPerSecond: 75 },
      { providerId: "bedrock", costPer1MInput: 3, costPer1MOutput: 15, blendedCost: 6, tokensPerSecond: 68 },
      { providerId: "vertex", costPer1MInput: 3, costPer1MOutput: 15, blendedCost: 6, tokensPerSecond: 70 },
    ],
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    labId: "deepseek",
    contextWindow: 128_000,
    supportsImages: false,
    openWeights: true,
    releaseDate: "2024-12-26",
    scores: { coding: 88, reasoning: 85, math: 87, general: 83 },
    providers: [
      { providerId: "deepseek", costPer1MInput: 0.27, costPer1MOutput: 1.1, blendedCost: 0.48, tokensPerSecond: 60 },
      { providerId: "together", costPer1MInput: 0.35, costPer1MOutput: 1.3, blendedCost: 0.59, tokensPerSecond: 70 },
      { providerId: "fireworks", costPer1MInput: 0.3, costPer1MOutput: 1.2, blendedCost: 0.53, tokensPerSecond: 75 },
    ],
  },
  {
    id: "llama-4-maverick",
    name: "Llama 4 Maverick",
    labId: "meta",
    contextWindow: 1_000_000,
    supportsImages: true,
    openWeights: true,
    releaseDate: "2025-04-05",
    scores: { coding: 83, reasoning: 86, math: 84, general: 87 },
    providers: [
      { providerId: "together", costPer1MInput: 0.2, costPer1MOutput: 0.6, blendedCost: 0.3, tokensPerSecond: 95 },
      { providerId: "fireworks", costPer1MInput: 0.22, costPer1MOutput: 0.65, blendedCost: 0.33, tokensPerSecond: 105 },
      { providerId: "bedrock", costPer1MInput: 0.32, costPer1MOutput: 0.97, blendedCost: 0.48, tokensPerSecond: 80 },
    ],
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    labId: "openai",
    contextWindow: 128_000,
    supportsImages: true,
    openWeights: false,
    releaseDate: "2024-07-18",
    scores: { coding: 80, reasoning: 81, math: 83, general: 84 },
    providers: [
      { providerId: "openai", costPer1MInput: 0.15, costPer1MOutput: 0.6, blendedCost: 0.26, tokensPerSecond: 130 },
      { providerId: "azure", costPer1MInput: 0.15, costPer1MOutput: 0.6, blendedCost: 0.26, tokensPerSecond: 120 },
    ],
  },
  {
    id: "gemini-2-flash",
    name: "Gemini 2.0 Flash",
    labId: "google",
    contextWindow: 1_000_000,
    supportsImages: true,
    openWeights: false,
    releaseDate: "2025-02-05",
    scores: { coding: 82, reasoning: 83, math: 85, general: 86 },
    providers: [
      { providerId: "google", costPer1MInput: 0.1, costPer1MOutput: 0.4, blendedCost: 0.18, tokensPerSecond: 150 },
      { providerId: "vertex", costPer1MInput: 0.1, costPer1MOutput: 0.4, blendedCost: 0.18, tokensPerSecond: 140 },
    ],
  },
  {
    id: "claude-haiku-4",
    name: "Claude Haiku 4",
    labId: "anthropic",
    contextWindow: 200_000,
    supportsImages: true,
    openWeights: false,
    releaseDate: "2025-05-22",
    scores: { coding: 78, reasoning: 79, math: 77, general: 82 },
    providers: [
      { providerId: "anthropic", costPer1MInput: 0.8, costPer1MOutput: 4, blendedCost: 1.6, tokensPerSecond: 120 },
      { providerId: "bedrock", costPer1MInput: 0.8, costPer1MOutput: 4, blendedCost: 1.6, tokensPerSecond: 110 },
    ],
  },
  {
    id: "qwen-3-72b",
    name: "Qwen 3 72B",
    labId: "alibaba",
    contextWindow: 128_000,
    supportsImages: false,
    openWeights: true,
    releaseDate: "2025-04-29",
    scores: { coding: 85, reasoning: 82, math: 84, general: 80 },
    providers: [
      { providerId: "together", costPer1MInput: 0.4, costPer1MOutput: 1.2, blendedCost: 0.6, tokensPerSecond: 55 },
      { providerId: "fireworks", costPer1MInput: 0.35, costPer1MOutput: 1.0, blendedCost: 0.51, tokensPerSecond: 65 },
    ],
  },
  {
    id: "mistral-large",
    name: "Mistral Large 2",
    labId: "mistral",
    contextWindow: 128_000,
    supportsImages: true,
    openWeights: true,
    releaseDate: "2024-07-24",
    scores: { coding: 80, reasoning: 82, math: 79, general: 81 },
    providers: [
      { providerId: "mistral", costPer1MInput: 2, costPer1MOutput: 6, blendedCost: 3, tokensPerSecond: 65 },
      { providerId: "bedrock", costPer1MInput: 2.2, costPer1MOutput: 6.6, blendedCost: 3.3, tokensPerSecond: 55 },
      { providerId: "azure", costPer1MInput: 2, costPer1MOutput: 6, blendedCost: 3, tokensPerSecond: 60 },
    ],
  },
  {
    id: "command-r-plus",
    name: "Command R+",
    labId: "cohere",
    contextWindow: 128_000,
    supportsImages: false,
    openWeights: true,
    releaseDate: "2024-04-04",
    scores: { coding: 75, reasoning: 79, math: 76, general: 80 },
    providers: [
      { providerId: "cohere", costPer1MInput: 2.5, costPer1MOutput: 10, blendedCost: 4.38, tokensPerSecond: 50 },
      { providerId: "bedrock", costPer1MInput: 2.5, costPer1MOutput: 10, blendedCost: 4.38, tokensPerSecond: 45 },
    ],
  },
  {
    id: "phi-4",
    name: "Phi-4",
    labId: "microsoft",
    contextWindow: 16_000,
    supportsImages: false,
    openWeights: true,
    releaseDate: "2024-12-12",
    scores: { coding: 79, reasoning: 74, math: 78, general: 72 },
    providers: [
      { providerId: "azure", costPer1MInput: 0.07, costPer1MOutput: 0.14, blendedCost: 0.09, tokensPerSecond: 180 },
      { providerId: "together", costPer1MInput: 0.1, costPer1MOutput: 0.2, blendedCost: 0.13, tokensPerSecond: 200 },
    ],
  },
  {
    id: "llama-4-scout",
    name: "Llama 4 Scout",
    labId: "meta",
    contextWindow: 10_000_000,
    supportsImages: true,
    openWeights: true,
    releaseDate: "2025-04-05",
    scores: { coding: 77, reasoning: 78, math: 80, general: 81 },
    providers: [
      { providerId: "together", costPer1MInput: 0.15, costPer1MOutput: 0.4, blendedCost: 0.21, tokensPerSecond: 110 },
      { providerId: "fireworks", costPer1MInput: 0.18, costPer1MOutput: 0.45, blendedCost: 0.25, tokensPerSecond: 120 },
      { providerId: "bedrock", costPer1MInput: 0.25, costPer1MOutput: 0.7, blendedCost: 0.36, tokensPerSecond: 90 },
    ],
  },
  {
    id: "gemma-3-27b",
    name: "Gemma 3 27B",
    labId: "google",
    contextWindow: 128_000,
    supportsImages: true,
    openWeights: true,
    releaseDate: "2025-03-12",
    scores: { coding: 72, reasoning: 73, math: 75, general: 76 },
    providers: [
      { providerId: "together", costPer1MInput: 0.1, costPer1MOutput: 0.2, blendedCost: 0.13, tokensPerSecond: 140 },
      { providerId: "fireworks", costPer1MInput: 0.12, costPer1MOutput: 0.22, blendedCost: 0.15, tokensPerSecond: 155 },
    ],
  },
];
