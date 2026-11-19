import {
  definePluginEntry,
  type OpenClawConfig,
  type OpenClawPluginApi,
  type ProviderCatalogContext,
  type ProviderPlugin,
  type ProviderResolveDynamicModelContext,
  type ProviderRuntimeModel,
  type UnifiedModelCatalogEntry,
  type UnifiedModelCatalogProviderContext,
} from "openclaw/plugin-sdk/plugin-entry";
import { createProviderApiKeyAuthMethod } from "openclaw/plugin-sdk/provider-auth";
import {
  ABLITERATEDLLM_DEFAULT_MODEL_NAME,
  ABLITERATEDLLM_DEFAULT_MODEL_REF,
  ABLITERATEDLLM_DOCS_URL,
  ABLITERATEDLLM_ENV_VAR,
  ABLITERATEDLLM_MODELS,
  ABLITERATEDLLM_PROVIDER_ID,
  buildAbliteratedLlmProvider,
  fetchAbliteratedLlmProvider,
  findAbliteratedLlmModel,
  normalizeAbliteratedLlmBaseUrl,
  type AbliteratedLlmModelDefinition,
} from "./models.js";

const DEFAULT_DYNAMIC_CONTEXT_WINDOW = 131_072;
const DEFAULT_DYNAMIC_MAX_TOKENS = 32_768;

function resolveConfiguredBaseUrl(config?: OpenClawConfig): string {
  const configured = config?.models?.providers?.[ABLITERATEDLLM_PROVIDER_ID]?.baseUrl;
  return normalizeAbliteratedLlmBaseUrl(configured);
}

function toRuntimeModalities(
  input: readonly ("text" | "image" | "video")[],
): ("text" | "image")[] {
  const filtered = input.filter(
    (modality): modality is "text" | "image" => modality === "text" || modality === "image",
  );
  return filtered.length > 0 ? filtered : ["text"];
}

function toUnifiedEntries(
  models: readonly AbliteratedLlmModelDefinition[],
  source: "static" | "live",
): UnifiedModelCatalogEntry[] {
  return models.map((model) => ({
    kind: "text",
    provider: ABLITERATEDLLM_PROVIDER_ID,
    model: model.id,
    label: model.name,
    source,
  }));
}

export function applyAbliteratedLlmConnectionConfig(cfg: OpenClawConfig): OpenClawConfig {
  const existingProvider = cfg.models?.providers?.[ABLITERATEDLLM_PROVIDER_ID];
  const baseUrl = normalizeAbliteratedLlmBaseUrl(existingProvider?.baseUrl);
  const existingModels = existingProvider?.models ?? [];
  const models =
    cfg.models?.mode === "replace"
      ? buildAbliteratedLlmProvider({ baseUrl }).models
      : existingModels;

  const existingDefaultModel = cfg.agents?.defaults?.model;
  const nextDefaultModel =
    typeof existingDefaultModel === "object" && existingDefaultModel !== null
      ? { ...existingDefaultModel, primary: ABLITERATEDLLM_DEFAULT_MODEL_REF }
      : { primary: ABLITERATEDLLM_DEFAULT_MODEL_REF };

  const existingModelEntries = cfg.agents?.defaults?.models ?? {};
  const existingPrimaryEntry = existingModelEntries[ABLITERATEDLLM_DEFAULT_MODEL_REF];

  return {
    ...cfg,
    models: {
      ...cfg.models,
      providers: {
        ...cfg.models?.providers,
        [ABLITERATEDLLM_PROVIDER_ID]: {
          ...existingProvider,
          baseUrl,
          api: existingProvider?.api ?? "openai-completions",
          models,
        },
      },
    },
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        model: nextDefaultModel,
        models: {
          ...existingModelEntries,
          [ABLITERATEDLLM_DEFAULT_MODEL_REF]: {
            ...existingPrimaryEntry,
            alias: existingPrimaryEntry?.alias ?? ABLITERATEDLLM_DEFAULT_MODEL_NAME,
          },
        },
      },
    },
  };
}

export function resolveAbliteratedLlmDynamicModel(
  ctx: Pick<ProviderResolveDynamicModelContext, "modelId" | "providerConfig">,
): ProviderRuntimeModel | undefined {
  const modelId = ctx.modelId.trim().replace(/^abliteratedllm\//u, "");
  if (!modelId) {
    return undefined;
  }

  const baseUrl = normalizeAbliteratedLlmBaseUrl(ctx.providerConfig?.baseUrl);
  const known = findAbliteratedLlmModel(modelId);
  if (known) {
    return {
      id: known.id,
      name: known.name,
      provider: ABLITERATEDLLM_PROVIDER_ID,
      api: "openai-completions",
      baseUrl,
      reasoning: known.reasoning,
      input: toRuntimeModalities(known.input),
      cost: { ...known.cost },
      contextWindow: known.contextWindow,
      maxTokens: known.maxTokens,
      compat: known.compat,
    };
  }

  return {
    id: modelId,
    name: modelId,
    provider: ABLITERATEDLLM_PROVIDER_ID,
    api: "openai-completions",
    baseUrl,
    reasoning: true,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: DEFAULT_DYNAMIC_CONTEXT_WINDOW,
    contextWindowSource: "synthetic",
    maxTokens: DEFAULT_DYNAMIC_MAX_TOKENS,
    compat: {
      supportsStore: false,
      supportsUsageInStreaming: true,
      supportsPromptCacheKey: true,
      supportsReasoningEffort: true,
      supportsTools: true,
      supportsStrictMode: true,
      supportsJsonSchemaResponseFormat: true,
      maxTokensField: "max_tokens",
      thinkingFormat: "openai",
      supportsLongCacheRetention: false,
    },
  };
}

export function createAbliteratedLlmProviderPlugin(options?: {
  fetchImpl?: typeof fetch;
}): ProviderPlugin {
  return {
    id: ABLITERATEDLLM_PROVIDER_ID,
    label: "AbliteratedLLM",
    docsPath: ABLITERATEDLLM_DOCS_URL,
    envVars: [ABLITERATEDLLM_ENV_VAR],
    auth: [
      createProviderApiKeyAuthMethod({
        providerId: ABLITERATEDLLM_PROVIDER_ID,
        methodId: "api-key",
        label: "AbliteratedLLM API key",
        hint: "OpenAI-compatible abliterated and open-weight models",
        optionKey: "abliteratedllmApiKey",
        flagName: "--abliteratedllm-api-key",
        envVar: ABLITERATEDLLM_ENV_VAR,
        promptMessage: "Enter your AbliteratedLLM API key",
        defaultModel: ABLITERATEDLLM_DEFAULT_MODEL_REF,
        expectedProviders: [ABLITERATEDLLM_PROVIDER_ID],
        noteTitle: "AbliteratedLLM",
        noteMessage: `Create an API key at ${ABLITERATEDLLM_DOCS_URL}.`,
        wizard: {
          choiceId: "abliteratedllm-api-key",
          choiceLabel: "AbliteratedLLM API key",
          choiceHint: "OpenAI-compatible abliterated and open-weight models",
          groupId: ABLITERATEDLLM_PROVIDER_ID,
          groupLabel: "AbliteratedLLM",
          groupHint: "OpenAI-compatible abliterated and open-weight models",
          methodId: "api-key",
          onboardingScopes: ["text-inference"],
        },
        applyConfig: applyAbliteratedLlmConnectionConfig,
      }),
    ],
    catalog: {
      order: "simple",
      run: async (ctx: ProviderCatalogContext) => {
        if (
          ctx.providerIds !== undefined &&
          !ctx.providerIds.includes(ABLITERATEDLLM_PROVIDER_ID)
        ) {
          return null;
        }
        const resolved = ctx.resolveProviderApiKey(ABLITERATEDLLM_PROVIDER_ID);
        if (!resolved.apiKey) {
          return null;
        }
        const baseUrl = resolveConfiguredBaseUrl(ctx.config);
        const { provider } = await fetchAbliteratedLlmProvider({
          baseUrl,
          apiKey: resolved.discoveryApiKey ?? resolved.apiKey,
          fetchImpl: options?.fetchImpl,
          signal: ctx.signal,
        });
        return {
          provider: {
            ...provider,
            apiKey: resolved.apiKey,
          },
        };
      },
    },
    staticCatalog: {
      order: "simple",
      run: async (ctx: ProviderCatalogContext) => ({
        provider: buildAbliteratedLlmProvider({
          baseUrl: resolveConfiguredBaseUrl(ctx.config),
        }),
      }),
    },
    resolveDynamicModel: (ctx) => resolveAbliteratedLlmDynamicModel(ctx),
    isModernModelRef: () => true,
  };
}

export default definePluginEntry({
  id: ABLITERATEDLLM_PROVIDER_ID,
  name: "AbliteratedLLM",
  description: "OpenClaw model provider plugin for AbliteratedLLM.",
  register(api: OpenClawPluginApi) {
    const provider = createAbliteratedLlmProviderPlugin();
    api.registerProvider(provider);
    api.registerModelCatalogProvider({
      provider: ABLITERATEDLLM_PROVIDER_ID,
      kinds: ["text"],
      staticCatalog: () => toUnifiedEntries(ABLITERATEDLLM_MODELS, "static"),
      liveCatalog: async (ctx: UnifiedModelCatalogProviderContext) => {
        const resolved = ctx.resolveProviderApiKey(ABLITERATEDLLM_PROVIDER_ID);
        const baseUrl = resolveConfiguredBaseUrl(ctx.config);
        const { provider: discovered, source } = await fetchAbliteratedLlmProvider({
          baseUrl,
          apiKey: resolved.discoveryApiKey ?? resolved.apiKey,
          timeoutMs: ctx.timeoutMs,
          signal: ctx.signal,
        });
        return toUnifiedEntries(discovered.models, source);
      },
    });
  },
});

export {
  ABLITERATEDLLM_BASE_URL,
  ABLITERATEDLLM_DEFAULT_MODEL_NAME,
  ABLITERATEDLLM_DEFAULT_MODEL_REF,
  ABLITERATEDLLM_DOCS_URL,
  ABLITERATEDLLM_ENV_VAR,
  ABLITERATEDLLM_MODELS,
  ABLITERATEDLLM_PROVIDER_ID,
  buildAbliteratedLlmProvider,
  fetchAbliteratedLlmProvider,
  findAbliteratedLlmModel,
} from "./models.js";
