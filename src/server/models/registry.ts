export type ModelId =
  | "gpt-5-pro"
  | "gpt-5"
  | "gpt-4o"
  | "gpt-4o-mini";

export type Capability =
  | "reasoning"
  | "fast"
  | "tool_use"
  | "code"
  | "vision"
  | "long_context";

export type ModelInfo = {
  id: ModelId;
  provider: "openai";
  tokens?: number;
  caps: Capability[];
  defaultTemp: number;
};

export const MODEL_REGISTRY: Record<ModelId, ModelInfo> = {
  "gpt-5-pro": {
    id: "gpt-5-pro",
    provider: "openai",
    tokens: 256_000,
    caps: ["reasoning", "code", "vision", "long_context", "tool_use"],
    defaultTemp: 0.7,
  },
  "gpt-5": {
    id: "gpt-5",
    provider: "openai",
    tokens: 256_000,
    caps: ["reasoning", "code", "vision", "long_context", "tool_use"],
    defaultTemp: 0.7,
  },
  "gpt-4o": {
    id: "gpt-4o",
    provider: "openai",
    tokens: 128_000,
    caps: ["reasoning", "code", "vision", "long_context", "tool_use"],
    defaultTemp: 0.7,
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    provider: "openai",
    tokens: 64_000,
    caps: ["fast", "reasoning", "code"],
    defaultTemp: 0.6,
  },
};

// Simple selector by capability tags
export function pickModel(tags: Capability[] = []): ModelId {
  if (tags.includes("vision") || tags.includes("long_context")) return "gpt-4o";
  if (tags.includes("fast")) return "gpt-4o-mini";
  return "gpt-4o-mini";
}

// Preferred fallbacks if requested model isn’t allowed on this API key
const FALLBACKS: ModelId[] = ["gpt-5-pro", "gpt-5", "gpt-4o", "gpt-4o-mini"];

let _available: Set<string> | null = null;

// Discover models available to the current OPENAI_API_KEY (cached per runtime)
export async function discoverAvailableModels(get: (url: string) => Promise<any>) {
  if (_available) return _available;
  try {
    const data = await get("https://api.openai.com/v1/models");
    _available = new Set<string>((data?.data || []).map((m: any) => m.id));
  } catch {
    _available = new Set<string>();
  }
  return _available!;
}

// Resolve a requested model to something this key can actually use
export function resolveModel(requested: string, available?: Set<string>): ModelId {
  const req = requested as ModelId;
  if (available?.has(req)) return req;
  for (const m of FALLBACKS) {
    if (!available || available.has(m)) return m;
  }
  return "gpt-4o-mini";
}
