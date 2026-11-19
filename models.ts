export const ABLITERATEDLLM_PROVIDER_ID = "abliteratedllm" as const;
export const ABLITERATEDLLM_BASE_URL = "https://api.abliteratedllm.dev/v1" as const;
export const ABLITERATEDLLM_DOCS_URL = "https://abliteratedllm.dev/docs" as const;
export const ABLITERATEDLLM_ENV_VAR = "ABLITERATEDLLM_API_KEY" as const;
export const ABLITERATEDLLM_DEFAULT_MODEL_ID = "glm-5.3-flash-abliterated" as const;
export const ABLITERATEDLLM_DEFAULT_MODEL_NAME = "GLM-5.3 Flash Abliterated" as const;
export const ABLITERATEDLLM_DEFAULT_MODEL_REF =
  `${ABLITERATEDLLM_PROVIDER_ID}/${ABLITERATEDLLM_DEFAULT_MODEL_ID}` as const;

export type AbliteratedLlmInputModality = "text" | "image" | "video";

export type AbliteratedLlmReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh" | "max";

export interface AbliteratedLlmModelCost {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface AbliteratedLlmModelCompat {
  supportsStore: false;
  supportsUsageInStreaming: true;
  supportsPromptCacheKey: true;
  supportsReasoningEffort: true;
  supportsTools: true;
  supportsStrictMode: true;
  supportsJsonSchemaResponseFormat: true;
  maxTokensField: "max_tokens";
  thinkingFormat: "openai";
  thinkingRequired?: true;
  supportedReasoningEfforts: AbliteratedLlmReasoningEffort[];
  reasoningEffortMap: Record<string, AbliteratedLlmReasoningEffort>;
  supportsLongCacheRetention: false;
}

export interface AbliteratedLlmModelDefinition {
  id: string;
  name: string;
  reasoning: boolean;
  input: AbliteratedLlmInputModality[];
  contextWindow: number;
  maxTokens: number;
  cost: AbliteratedLlmModelCost;
  compat: AbliteratedLlmModelCompat;
}

export interface AbliteratedLlmProviderConfig {
  baseUrl: string;
  api: "openai-completions";
  apiKey?: string;
  models: AbliteratedLlmModelDefinition[];
}

function buildCompat(params: {
  supportedReasoningEfforts: AbliteratedLlmReasoningEffort[];
  reasoningEffortMap: Record<string, AbliteratedLlmReasoningEffort>;
  thinkingRequired?: true;
}): AbliteratedLlmModelCompat {
  return {
    supportsStore: false,
    supportsUsageInStreaming: true,
    supportsPromptCacheKey: true,
    supportsReasoningEffort: true,
    supportsTools: true,
    supportsStrictMode: true,
    supportsJsonSchemaResponseFormat: true,
    maxTokensField: "max_tokens",
    thinkingFormat: "openai",
    ...(params.thinkingRequired ? { thinkingRequired: true as const } : {}),
    supportedReasoningEfforts: [...params.supportedReasoningEfforts],
    reasoningEffortMap: { ...params.reasoningEffortMap },
    supportsLongCacheRetention: false,
  };
}

const GLM_53_COMPAT = buildCompat({
  thinkingRequired: true,
  supportedReasoningEfforts: ["low", "high", "max"],
  reasoningEffortMap: {
    off: "low",
    low: "low",
    medium: "high",
    high: "high",
    max: "max",
  },
});

const DEEPSEEK_V41_COMPAT = buildCompat({
  supportedReasoningEfforts: ["none", "low", "high", "max"],
  reasoningEffortMap: {
    off: "none",
    low: "low",
    high: "high",
    max: "max",
  },
});

const FULL_FIVE_LEVEL_COMPAT = buildCompat({
  supportedReasoningEfforts: ["none", "low", "medium", "high", "max"],
  reasoningEffortMap: {
    off: "none",
    low: "low",
    medium: "medium",
    high: "high",
    max: "max",
  },
});

const MUSE_SPARK_COMPAT = buildCompat({
  thinkingRequired: true,
  supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
  reasoningEffortMap: {
    off: "low",
    low: "low",
    medium: "medium",
    high: "high",
    xhigh: "xhigh",
    max: "xhigh",
  },
});

const QWEN_38_COMPAT = buildCompat({
  supportedReasoningEfforts: ["none", "low", "medium", "xhigh"],
  reasoningEffortMap: {
    off: "none",
    low: "low",
    medium: "medium",
    high: "xhigh",
    xhigh: "xhigh",
    max: "xhigh",
  },
});

const MINIMAX_M3_COMPAT = buildCompat({
  thinkingRequired: true,
  supportedReasoningEfforts: ["low", "medium", "high"],
  reasoningEffortMap: {
    off: "low",
    low: "low",
    medium: "medium",
    high: "high",
    max: "high",
  },
});

function cloneModel(model: AbliteratedLlmModelDefinition): AbliteratedLlmModelDefinition {
  return {
    ...model,
    input: [...model.input],
    cost: { ...model.cost },
    compat: {
      ...model.compat,
      supportedReasoningEfforts: [...model.compat.supportedReasoningEfforts],
      reasoningEffortMap: { ...model.compat.reasoningEffortMap },
    },
  };
}

export const ABLITERATEDLLM_MODELS: readonly AbliteratedLlmModelDefinition[] = [
  {
    id: "glm-5.3-flash-abliterated",
    name: "GLM-5.3 Flash Abliterated",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 1048576,
    maxTokens: 131072,
    cost: { input: 0.0977, output: 0.3421, cacheRead: 0.0098, cacheWrite: 0 },
    compat: GLM_53_COMPAT,
  },
  {
    id: "glm-5.3-cyber-abliterated",
    name: "GLM-5.3 Cyber Abliterated",
    reasoning: true,
    input: ["text"],
    contextWindow: 1048576,
    maxTokens: 131072,
    cost: { input: 0.9, output: 1.8, cacheRead: 0.135, cacheWrite: 0 },
    compat: GLM_53_COMPAT,
  },
  {
    id: "deepseek-v4.1-flash-1017",
    name: "DeepSeek V4.1 Flash 1017",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 1048576,
    maxTokens: 1048576,
    cost: { input: 0.27, output: 1.08, cacheRead: 0.0054, cacheWrite: 0 },
    compat: DEEPSEEK_V41_COMPAT,
  },
  {
    id: "deepseek-v4.1-flash-1017-ultrafast",
    name: "DeepSeek V4.1 Flash 1017 Ultrafast",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 1048576,
    maxTokens: 1048576,
    cost: { input: 2.16, output: 8.64, cacheRead: 0.0432, cacheWrite: 0 },
    compat: DEEPSEEK_V41_COMPAT,
  },
  {
    id: "deepseek-v4.1-flash-original",
    name: "DeepSeek V4.1 Flash (original)",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 1048576,
    maxTokens: 1048576,
    cost: { input: 0.27, output: 1.08, cacheRead: 0.0054, cacheWrite: 0 },
    compat: DEEPSEEK_V41_COMPAT,
  },
  {
    id: "glm-5.3-flash",
    name: "GLM-5.3 Flash",
    reasoning: true,
    input: ["text", "image", "video"],
    contextWindow: 1048576,
    maxTokens: 1048576,
    cost: { input: 0.135, output: 0.45, cacheRead: 0.027, cacheWrite: 0 },
    compat: GLM_53_COMPAT,
  },
  {
    id: "glm-5.3",
    name: "GLM-5.3",
    reasoning: true,
    input: ["text"],
    contextWindow: 1048576,
    maxTokens: 1048576,
    cost: { input: 1.26, output: 3.96, cacheRead: 0.234, cacheWrite: 0 },
    compat: GLM_53_COMPAT,
  },
  {
    id: "glm-5.3-fast",
    name: "GLM-5.3 Fast",
    reasoning: true,
    input: ["text"],
    contextWindow: 1048576,
    maxTokens: 1048576,
    cost: { input: 1.89, output: 5.94, cacheRead: 0.351, cacheWrite: 0 },
    compat: GLM_53_COMPAT,
  },
  {
    id: "kimi-k3",
    name: "Kimi K3",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 1048576,
    maxTokens: 1048576,
    cost: { input: 2.7, output: 13.5, cacheRead: 0.27, cacheWrite: 0 },
    compat: FULL_FIVE_LEVEL_COMPAT,
  },
  {
    id: "kimi-k3.1-pro",
    name: "Kimi K3.1 Pro",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 1048576,
    maxTokens: 1048576,
    cost: { input: 1.8, output: 9, cacheRead: 0.18, cacheWrite: 0 },
    compat: FULL_FIVE_LEVEL_COMPAT,
  },
  {
    id: "kimi-k3-fast",
    name: "Kimi K3 Fast",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 1048576,
    maxTokens: 1048576,
    cost: { input: 4.05, output: 20.25, cacheRead: 0.405, cacheWrite: 0 },
    compat: FULL_FIVE_LEVEL_COMPAT,
  },
  {
    id: "ember-1",
    name: "Ember-1",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 1048576,
    maxTokens: 1048576,
    cost: { input: 2.7, output: 13.5, cacheRead: 0.27, cacheWrite: 0 },
    compat: FULL_FIVE_LEVEL_COMPAT,
  },
  {
    id: "muse-spark-open",
    name: "Muse Spark Open",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 1048576,
    maxTokens: 1048576,
    cost: { input: 1.125, output: 3.825, cacheRead: 0.135, cacheWrite: 0 },
    compat: MUSE_SPARK_COMPAT,
  },
  {
    id: "qwen3.8-max",
    name: "Qwen3.8 Max",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 262144,
    maxTokens: 262144,
    cost: { input: 1.8, output: 5.4, cacheRead: 0.225, cacheWrite: 0 },
    compat: QWEN_38_COMPAT,
  },
  {
    id: "qwen3.8-2.4t-a95b",
    name: "Qwen3.8-2.4T-A95B",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 262144,
    maxTokens: 262144,
    cost: { input: 1.8, output: 5.4, cacheRead: 0.225, cacheWrite: 0 },
    compat: QWEN_38_COMPAT,
  },
  {
    id: "minimax-m3",
    name: "MiniMax M3",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 512000,
    maxTokens: 512000,
    cost: { input: 0.27, output: 1.08, cacheRead: 0.054, cacheWrite: 0 },
    compat: MINIMAX_M3_COMPAT,
  },
];

const STATIC_MODELS_BY_ID = new Map<string, AbliteratedLlmModelDefinition>(
  ABLITERATEDLLM_MODELS.map((model) => [model.id, model]),
);

const LIVE_CATALOG_TTL_MS = 60_000;
const LIVE_CATALOG_TIMEOUT_MS = 5_000;
const FALLBACK_CONTEXT_WINDOW = 131_072;
const FALLBACK_MAX_TOKENS = 32_768;

interface CachedCatalogEntry {
  expiresAt: number;
  models: AbliteratedLlmModelDefinition[];
}

const liveCatalogCache = new Map<string, CachedCatalogEntry>();

export function clearAbliteratedLlmCatalogCache(): void {
  liveCatalogCache.clear();
}

export function normalizeAbliteratedLlmBaseUrl(baseUrl?: string): string {
  const trimmed = baseUrl?.trim();
  if (!trimmed) {
    return ABLITERATEDLLM_BASE_URL;
  }
  return trimmed.replace(/\/+$/u, "");
}

export function findAbliteratedLlmModel(modelId: string): AbliteratedLlmModelDefinition | undefined {
  const normalized = modelId.trim().replace(/^abliteratedllm\//u, "");
  const found = STATIC_MODELS_BY_ID.get(normalized);
  return found ? cloneModel(found) : undefined;
}

export function buildAbliteratedLlmProvider(options?: {
  baseUrl?: string;
  apiKey?: string;
  models?: readonly AbliteratedLlmModelDefinition[];
}): AbliteratedLlmProviderConfig {
  const models = (options?.models ?? ABLITERATEDLLM_MODELS).map(cloneModel);
  return {
    baseUrl: normalizeAbliteratedLlmBaseUrl(options?.baseUrl),
    api: "openai-completions",
    ...(options?.apiKey ? { apiKey: options.apiKey } : {}),
    models,
  };
}

export function resolveAbliteratedLlmReasoningEffort(
  modelOrId: Pick<AbliteratedLlmModelDefinition, "compat"> | string,
  level: string,
): AbliteratedLlmReasoningEffort | undefined {
  const model = typeof modelOrId === "string" ? findAbliteratedLlmModel(modelOrId) : modelOrId;
  if (!model) {
    return undefined;
  }
  const normalized = level.trim().toLowerCase();
  const mapped = model.compat.reasoningEffortMap[normalized];
  if (mapped) {
    return mapped;
  }
  if (
    model.compat.supportedReasoningEfforts.includes(normalized as AbliteratedLlmReasoningEffort)
  ) {
    return normalized as AbliteratedLlmReasoningEffort;
  }
  return model.compat.supportedReasoningEfforts[0];
}

function parseFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function parsePositiveInt(value: unknown): number | undefined {
  const parsed = parseFiniteNumber(value);
  if (parsed === undefined || parsed <= 0) {
    return undefined;
  }
  return Math.trunc(parsed);
}

function parseModalities(value: unknown): AbliteratedLlmInputModality[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const valid = value.filter(
    (entry): entry is AbliteratedLlmInputModality =>
      entry === "text" || entry === "image" || entry === "video",
  );
  return valid.length > 0 ? Array.from(new Set(valid)) : undefined;
}

export function parseLiveAbliteratedLlmModels(payload: unknown): AbliteratedLlmModelDefinition[] {
  if (!payload || typeof payload !== "object" || !("data" in payload) || !Array.isArray(payload.data)) {
    return [];
  }

  const parsedModels: AbliteratedLlmModelDefinition[] = [];
  const seen = new Set<string>();

  for (const row of payload.data) {
    if (!row || typeof row !== "object" || !("id" in row) || typeof row.id !== "string") {
      continue;
    }
    const id = row.id.trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);

    const seed = STATIC_MODELS_BY_ID.get(id);
    const rawName = "name" in row && typeof row.name === "string" ? row.name.trim() : "";
    const name = rawName.length > 0 ? rawName : (seed?.name ?? id);

    const contextWindow =
      ("context_length" in row ? parsePositiveInt(row.context_length) : undefined) ??
      seed?.contextWindow ??
      FALLBACK_CONTEXT_WINDOW;
    const maxTokens =
      ("max_output_tokens" in row ? parsePositiveInt(row.max_output_tokens) : undefined) ??
      seed?.maxTokens ??
      Math.min(contextWindow, FALLBACK_MAX_TOKENS);

    const rawCaps =
      "capabilities" in row && row.capabilities && typeof row.capabilities === "object"
        ? row.capabilities
        : undefined;
    const hasVision = rawCaps !== undefined && "vision" in rawCaps && rawCaps.vision === true;
    const inputModalities =
      ("input_modalities" in row ? parseModalities(row.input_modalities) : undefined) ??
      (seed ? [...seed.input] : hasVision ? ["text", "image"] : ["text"]);

    const rawPricing =
      "pricing" in row && row.pricing && typeof row.pricing === "object" ? row.pricing : undefined;
    const cost: AbliteratedLlmModelCost = {
      input:
        (rawPricing && "input" in rawPricing ? parseFiniteNumber(rawPricing.input) : undefined) ??
        seed?.cost.input ??
        0,
      output:
        (rawPricing && "output" in rawPricing ? parseFiniteNumber(rawPricing.output) : undefined) ??
        seed?.cost.output ??
        0,
      cacheRead:
        (rawPricing && "cached_input" in rawPricing
          ? parseFiniteNumber(rawPricing.cached_input)
          : undefined) ??
        seed?.cost.cacheRead ??
        0,
      cacheWrite: seed?.cost.cacheWrite ?? 0,
    };

    const reasoning =
      rawCaps !== undefined && "reasoning" in rawCaps && typeof rawCaps.reasoning === "boolean"
        ? rawCaps.reasoning
        : (seed?.reasoning ?? true);

    parsedModels.push(
      cloneModel({
        id,
        name,
        reasoning,
        input: inputModalities,
        contextWindow,
        maxTokens,
        cost,
        compat: seed?.compat ?? FULL_FIVE_LEVEL_COMPAT,
      }),
    );
  }

  return parsedModels;
}

export async function fetchAbliteratedLlmProvider(options?: {
  baseUrl?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  signal?: AbortSignal;
  bypassCache?: boolean;
}): Promise<{ provider: AbliteratedLlmProviderConfig; source: "live" | "static" }> {
  const baseUrl = normalizeAbliteratedLlmBaseUrl(options?.baseUrl);
  const now = Date.now();
  const cached = !options?.bypassCache ? liveCatalogCache.get(baseUrl) : undefined;
  if (cached && cached.expiresAt > now) {
    return {
      provider: buildAbliteratedLlmProvider({
        baseUrl,
        apiKey: options?.apiKey,
        models: cached.models,
      }),
      source: "live",
    };
  }

  const fetchImpl = options?.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return {
      provider: buildAbliteratedLlmProvider({ baseUrl, apiKey: options?.apiKey }),
      source: "static",
    };
  }

  const timeoutMs = options?.timeoutMs ?? LIVE_CATALOG_TIMEOUT_MS;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = options?.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options?.apiKey && options.apiKey.trim().length > 0) {
    headers.Authorization = `Bearer ${options.apiKey.trim()}`;
  }

  try {
    const response = await fetchImpl(`${baseUrl}/models`, {
      method: "GET",
      headers,
      signal,
    });
    if (!response.ok) {
      return {
        provider: buildAbliteratedLlmProvider({ baseUrl, apiKey: options?.apiKey }),
        source: "static",
      };
    }
    const payload: unknown = await response.json();
    const models = parseLiveAbliteratedLlmModels(payload);
    if (models.length === 0) {
      return {
        provider: buildAbliteratedLlmProvider({ baseUrl, apiKey: options?.apiKey }),
        source: "static",
      };
    }

    liveCatalogCache.set(baseUrl, {
      expiresAt: Date.now() + LIVE_CATALOG_TTL_MS,
      models,
    });

    return {
      provider: buildAbliteratedLlmProvider({
        baseUrl,
        apiKey: options?.apiKey,
        models,
      }),
      source: "live",
    };
  } catch {
    return {
      provider: buildAbliteratedLlmProvider({ baseUrl, apiKey: options?.apiKey }),
      source: "static",
    };
  }
}
