import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  OpenClawPluginApi,
  ProviderCatalogContext,
  ProviderPlugin,
  UnifiedModelCatalogProviderPlugin,
} from "openclaw/plugin-sdk/plugin-entry";
import { afterEach, describe, expect, it, vi } from "vitest";
import plugin, {
  applyAbliteratedLlmConnectionConfig,
  createAbliteratedLlmProviderPlugin,
  resolveAbliteratedLlmDynamicModel,
} from "./index.js";
import {
  ABLITERATEDLLM_BASE_URL,
  ABLITERATEDLLM_DEFAULT_MODEL_ID,
  ABLITERATEDLLM_DEFAULT_MODEL_REF,
  ABLITERATEDLLM_ENV_VAR,
  ABLITERATEDLLM_MODELS,
  ABLITERATEDLLM_PROVIDER_ID,
  buildAbliteratedLlmProvider,
  clearAbliteratedLlmCatalogCache,
  fetchAbliteratedLlmProvider,
  resolveAbliteratedLlmReasoningEffort,
} from "./models.js";

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(ROOT_DIR, relativePath), "utf8")) as T;
}

function createCatalogContext(
  apiKey?: string,
  config: Record<string, unknown> = {},
): ProviderCatalogContext {
  return {
    config: config as ProviderCatalogContext["config"],
    env: apiKey ? { [ABLITERATEDLLM_ENV_VAR]: apiKey } : {},
    resolveProviderApiKey: () => ({ apiKey }),
    resolveProviderAuth: (() => ({})) as unknown as ProviderCatalogContext["resolveProviderAuth"],
  };
}

afterEach(() => {
  clearAbliteratedLlmCatalogCache();
});

describe("package and manifest metadata", () => {
  it("declares valid ClawHub-compatible package.json without workspace:* dependencies", () => {
    const pkg = readJson<Record<string, unknown>>("package.json");
    const raw = readFileSync(path.join(ROOT_DIR, "package.json"), "utf8");
    expect(raw).not.toContain("workspace:");
    expect(pkg.name).toBe("@abliteratedllm/openclaw-abliteratedllm");
    expect(pkg.license).toBe("MIT");
    expect(pkg.type).toBe("module");

    const openclaw = pkg.openclaw as {
      extensions?: string[];
      runtimeExtensions?: string[];
      compat?: { pluginApi?: string; minGatewayVersion?: string };
      build?: { openclawVersion?: string; pluginSdkVersion?: string };
      install?: {
        clawhubSpec?: string;
        npmSpec?: string;
        defaultChoice?: string;
        minHostVersion?: string;
      };
    };
    expect(openclaw.extensions).toEqual(["./index.ts"]);
    expect(openclaw.runtimeExtensions).toEqual(["./dist/index.js"]);
    expect(openclaw.compat?.pluginApi).toMatch(/^>=\d{4}\.\d+\.\d+/);
    expect(openclaw.build?.openclawVersion).toMatch(/^\d{4}\.\d+\.\d+/);
    expect(openclaw.install?.clawhubSpec).toBe("clawhub:@abliteratedllm/openclaw-abliteratedllm");
    expect(openclaw.install?.npmSpec).toBe("@abliteratedllm/openclaw-abliteratedllm");
    expect(openclaw.install?.minHostVersion).toBe(openclaw.compat?.pluginApi);
  });

  it("ships valid plugin artwork assets", () => {
    const iconStat = statSync(path.join(ROOT_DIR, "assets/icon.png"));
    expect(iconStat.size).toBeGreaterThan(0);
    expect(iconStat.size).toBeLessThanOrEqual(512 * 1024);

    const activitySvg = readFileSync(path.join(ROOT_DIR, "assets/activity.svg"), "utf8");
    expect(activitySvg).toContain('fill="currentColor"');
    expect(activitySvg).toContain('viewBox="0 0 64 64"');
    const elementMatches = activitySvg.match(/<[a-zA-Z][^/>]*>/g) ?? [];
    expect(elementMatches.length).toBeLessThanOrEqual(4);

    const logoSvg = readFileSync(path.join(ROOT_DIR, "assets/logo.svg"), "utf8");
    expect(logoSvg).toContain('viewBox="0 0 64 64"');
  });

  it("matches openclaw.plugin.json manifest with all 16 models and auth metadata", () => {
    const manifest = readJson<{
      id: string;
      name: string;
      categories: string[];
      providers: string[];
      setup: { providers: Array<{ id: string; envVars: string[] }> };
      providerAuthChoices: Array<{
        provider: string;
        method: string;
        choiceId: string;
        optionKey: string;
        cliFlag: string;
      }>;
      modelCatalog: {
        providers: {
          abliteratedllm: {
            baseUrl: string;
            api: string;
            defaultModel: string;
            models: unknown[];
          };
        };
        discovery: Record<string, string>;
      };
      configSchema: { type: string; additionalProperties: boolean };
    }>("openclaw.plugin.json");

    expect(manifest.id).toBe(ABLITERATEDLLM_PROVIDER_ID);
    expect(manifest.name).toBe("AbliteratedLLM");
    expect(manifest.categories).toEqual(["models"]);
    expect(manifest.providers).toEqual([ABLITERATEDLLM_PROVIDER_ID]);
    expect(manifest.setup.providers).toEqual([
      { id: ABLITERATEDLLM_PROVIDER_ID, envVars: [ABLITERATEDLLM_ENV_VAR] },
    ]);
    expect(manifest.providerAuthChoices[0]).toMatchObject({
      provider: ABLITERATEDLLM_PROVIDER_ID,
      method: "api-key",
      choiceId: "abliteratedllm-api-key",
      optionKey: "abliteratedllmApiKey",
      cliFlag: "--abliteratedllm-api-key",
    });
    expect(manifest.modelCatalog.discovery).toEqual({ [ABLITERATEDLLM_PROVIDER_ID]: "refreshable" });
    expect(manifest.modelCatalog.providers.abliteratedllm.baseUrl).toBe(ABLITERATEDLLM_BASE_URL);
    expect(manifest.modelCatalog.providers.abliteratedllm.api).toBe("openai-completions");
    expect(manifest.modelCatalog.providers.abliteratedllm.defaultModel).toBe(
      ABLITERATEDLLM_DEFAULT_MODEL_ID,
    );
    expect(manifest.modelCatalog.providers.abliteratedllm.models).toEqual(ABLITERATEDLLM_MODELS);
    expect(manifest.configSchema).toEqual({
      type: "object",
      additionalProperties: false,
      properties: {},
    });
  });
});

describe("16-model catalog, pricing, modalities, and reasoning configuration", () => {
  it("contains all 16 live models with exact pricing, limits, and modalities", () => {
    expect(ABLITERATEDLLM_MODELS).toHaveLength(16);
    expect(ABLITERATEDLLM_MODELS[0]?.id).toBe(ABLITERATEDLLM_DEFAULT_MODEL_ID);

    const expected: Array<{
      id: string;
      name: string;
      contextWindow: number;
      maxTokens: number;
      input: string[];
      cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
      efforts: string[];
    }> = [
      {
        id: "glm-5.3-flash-abliterated",
        name: "GLM-5.3 Flash Abliterated",
        contextWindow: 1048576,
        maxTokens: 131072,
        input: ["text", "image"],
        cost: { input: 0.0977, output: 0.3421, cacheRead: 0.0098, cacheWrite: 0 },
        efforts: ["low", "high", "max"],
      },
      {
        id: "glm-5.3-cyber-abliterated",
        name: "GLM-5.3 Cyber Abliterated",
        contextWindow: 1048576,
        maxTokens: 131072,
        input: ["text"],
        cost: { input: 0.9, output: 1.8, cacheRead: 0.135, cacheWrite: 0 },
        efforts: ["low", "high", "max"],
      },
      {
        id: "deepseek-v4.1-flash-1017",
        name: "DeepSeek V4.1 Flash 1017",
        contextWindow: 1048576,
        maxTokens: 1048576,
        input: ["text", "image"],
        cost: { input: 0.27, output: 1.08, cacheRead: 0.0054, cacheWrite: 0 },
        efforts: ["none", "low", "high", "max"],
      },
      {
        id: "deepseek-v4.1-flash-1017-ultrafast",
        name: "DeepSeek V4.1 Flash 1017 Ultrafast",
        contextWindow: 1048576,
        maxTokens: 1048576,
        input: ["text", "image"],
        cost: { input: 2.16, output: 8.64, cacheRead: 0.0432, cacheWrite: 0 },
        efforts: ["none", "low", "high", "max"],
      },
      {
        id: "deepseek-v4.1-flash-original",
        name: "DeepSeek V4.1 Flash (original)",
        contextWindow: 1048576,
        maxTokens: 1048576,
        input: ["text", "image"],
        cost: { input: 0.27, output: 1.08, cacheRead: 0.0054, cacheWrite: 0 },
        efforts: ["none", "low", "high", "max"],
      },
      {
        id: "glm-5.3-flash",
        name: "GLM-5.3 Flash",
        contextWindow: 1048576,
        maxTokens: 1048576,
        input: ["text", "image", "video"],
        cost: { input: 0.135, output: 0.45, cacheRead: 0.027, cacheWrite: 0 },
        efforts: ["low", "high", "max"],
      },
      {
        id: "glm-5.3",
        name: "GLM-5.3",
        contextWindow: 1048576,
        maxTokens: 1048576,
        input: ["text"],
        cost: { input: 1.26, output: 3.96, cacheRead: 0.234, cacheWrite: 0 },
        efforts: ["low", "high", "max"],
      },
      {
        id: "glm-5.3-fast",
        name: "GLM-5.3 Fast",
        contextWindow: 1048576,
        maxTokens: 1048576,
        input: ["text"],
        cost: { input: 1.89, output: 5.94, cacheRead: 0.351, cacheWrite: 0 },
        efforts: ["low", "high", "max"],
      },
      {
        id: "kimi-k3",
        name: "Kimi K3",
        contextWindow: 1048576,
        maxTokens: 1048576,
        input: ["text", "image"],
        cost: { input: 2.7, output: 13.5, cacheRead: 0.27, cacheWrite: 0 },
        efforts: ["none", "low", "medium", "high", "max"],
      },
      {
        id: "kimi-k3.1-pro",
        name: "Kimi K3.1 Pro",
        contextWindow: 1048576,
        maxTokens: 1048576,
        input: ["text", "image"],
        cost: { input: 1.8, output: 9, cacheRead: 0.18, cacheWrite: 0 },
        efforts: ["none", "low", "medium", "high", "max"],
      },
      {
        id: "kimi-k3-fast",
        name: "Kimi K3 Fast",
        contextWindow: 1048576,
        maxTokens: 1048576,
        input: ["text", "image"],
        cost: { input: 4.05, output: 20.25, cacheRead: 0.405, cacheWrite: 0 },
        efforts: ["none", "low", "medium", "high", "max"],
      },
      {
        id: "ember-1",
        name: "Ember-1",
        contextWindow: 1048576,
        maxTokens: 1048576,
        input: ["text", "image"],
        cost: { input: 2.7, output: 13.5, cacheRead: 0.27, cacheWrite: 0 },
        efforts: ["none", "low", "medium", "high", "max"],
      },
      {
        id: "muse-spark-open",
        name: "Muse Spark Open",
        contextWindow: 1048576,
        maxTokens: 1048576,
        input: ["text", "image"],
        cost: { input: 1.125, output: 3.825, cacheRead: 0.135, cacheWrite: 0 },
        efforts: ["low", "medium", "high", "xhigh"],
      },
      {
        id: "qwen3.8-max",
        name: "Qwen3.8 Max",
        contextWindow: 262144,
        maxTokens: 262144,
        input: ["text", "image"],
        cost: { input: 1.8, output: 5.4, cacheRead: 0.225, cacheWrite: 0 },
        efforts: ["none", "low", "medium", "xhigh"],
      },
      {
        id: "qwen3.8-2.4t-a95b",
        name: "Qwen3.8-2.4T-A95B",
        contextWindow: 262144,
        maxTokens: 262144,
        input: ["text", "image"],
        cost: { input: 1.8, output: 5.4, cacheRead: 0.225, cacheWrite: 0 },
        efforts: ["none", "low", "medium", "xhigh"],
      },
      {
        id: "minimax-m3",
        name: "MiniMax M3",
        contextWindow: 512000,
        maxTokens: 512000,
        input: ["text", "image"],
        cost: { input: 0.27, output: 1.08, cacheRead: 0.054, cacheWrite: 0 },
        efforts: ["low", "medium", "high"],
      },
    ];

    for (const row of expected) {
      const actual = ABLITERATEDLLM_MODELS.find((m) => m.id === row.id);
      assert(actual, `Missing model ${row.id}`);
      expect(actual.name).toBe(row.name);
      expect(actual.contextWindow).toBe(row.contextWindow);
      expect(actual.maxTokens).toBe(row.maxTokens);
      expect(actual.input).toEqual(row.input);
      expect(actual.cost).toEqual(row.cost);
      expect(actual.reasoning).toBe(true);
      expect(actual.compat.supportedReasoningEfforts).toEqual(row.efforts);
      expect(actual.compat.supportsUsageInStreaming).toBe(true);
      expect(actual.compat.supportsTools).toBe(true);
      expect(actual.compat.supportsJsonSchemaResponseFormat).toBe(true);
      expect(actual.compat.supportsStore).toBe(false);
    }
  });

  it("maps reasoning_effort safely for always-on and optional-thinking models", () => {
    expect(resolveAbliteratedLlmReasoningEffort("glm-5.3-flash-abliterated", "off")).toBe("low");
    expect(resolveAbliteratedLlmReasoningEffort("glm-5.3-flash-abliterated", "medium")).toBe("high");
    expect(resolveAbliteratedLlmReasoningEffort("glm-5.3-cyber-abliterated", "off")).toBe("low");
    expect(resolveAbliteratedLlmReasoningEffort("glm-5.3-cyber-abliterated", "max")).toBe("max");
    expect(resolveAbliteratedLlmReasoningEffort("deepseek-v4.1-flash-1017", "off")).toBe("none");
    expect(resolveAbliteratedLlmReasoningEffort("kimi-k3", "medium")).toBe("medium");
    expect(resolveAbliteratedLlmReasoningEffort("muse-spark-open", "off")).toBe("low");
    expect(resolveAbliteratedLlmReasoningEffort("muse-spark-open", "max")).toBe("xhigh");
    expect(resolveAbliteratedLlmReasoningEffort("qwen3.8-max", "off")).toBe("none");
    expect(resolveAbliteratedLlmReasoningEffort("qwen3.8-max", "high")).toBe("xhigh");
    expect(resolveAbliteratedLlmReasoningEffort("minimax-m3", "off")).toBe("low");
    expect(resolveAbliteratedLlmReasoningEffort("minimax-m3", "max")).toBe("high");
  });
});

describe("provider registration, onboarding, and catalog hooks", () => {
  it("registers the provider and unified text model catalog with OpenClaw", () => {
    let registeredProvider: ProviderPlugin | undefined;
    let registeredCatalog: UnifiedModelCatalogProviderPlugin | undefined;

    const mockApi = {
      registerProvider: (provider: ProviderPlugin) => {
        registeredProvider = provider;
      },
      registerModelCatalogProvider: (catalog: UnifiedModelCatalogProviderPlugin) => {
        registeredCatalog = catalog;
      },
    } as unknown as OpenClawPluginApi;

    expect(plugin.id).toBe(ABLITERATEDLLM_PROVIDER_ID);
    plugin.register(mockApi);

    assert(registeredProvider, "Expected registerProvider to be called");
    expect(registeredProvider.id).toBe(ABLITERATEDLLM_PROVIDER_ID);
    expect(registeredProvider.label).toBe("AbliteratedLLM");
    expect(registeredProvider.envVars).toEqual([ABLITERATEDLLM_ENV_VAR]);
    expect(registeredProvider.auth).toHaveLength(1);
    expect(registeredProvider.auth[0]?.id).toBe("api-key");
    expect(registeredProvider.auth[0]?.wizard?.choiceId).toBe("abliteratedllm-api-key");

    assert(registeredCatalog, "Expected registerModelCatalogProvider to be called");
    expect(registeredCatalog.provider).toBe(ABLITERATEDLLM_PROVIDER_ID);
    expect(registeredCatalog.kinds).toEqual(["text"]);
  });

  it("writes connection-only config on merge mode and full catalog on replace mode", () => {
    const mergeConfig = applyAbliteratedLlmConnectionConfig({
      agents: { defaults: { model: { primary: "other/model", fallbacks: ["other/backup"] } } },
    });

    expect(mergeConfig.models?.providers?.abliteratedllm).toEqual({
      baseUrl: ABLITERATEDLLM_BASE_URL,
      api: "openai-completions",
      models: [],
    });
    expect(mergeConfig.agents?.defaults?.model).toEqual({
      primary: ABLITERATEDLLM_DEFAULT_MODEL_REF,
      fallbacks: ["other/backup"],
    });
    expect(mergeConfig.agents?.defaults?.models?.[ABLITERATEDLLM_DEFAULT_MODEL_REF]?.alias).toBe(
      "GLM-5.3 Flash Abliterated",
    );

    const replaceConfig = applyAbliteratedLlmConnectionConfig({
      models: { mode: "replace" },
    });
    expect(replaceConfig.models?.providers?.abliteratedllm?.models).toHaveLength(16);
  });

  it("publishes all 16 static models without credentials", async () => {
    const provider = createAbliteratedLlmProviderPlugin();
    const result = await provider.staticCatalog?.run(createCatalogContext());
    assert(result && "provider" in result, "Expected staticCatalog provider result");
    expect(result.provider.baseUrl).toBe(ABLITERATEDLLM_BASE_URL);
    expect(result.provider.api).toBe("openai-completions");
    expect(result.provider.models).toHaveLength(16);
    expect(result.provider.models[0]?.id).toBe(ABLITERATEDLLM_DEFAULT_MODEL_ID);
  });

  it("returns null from live catalog when no API key is configured", async () => {
    const provider = createAbliteratedLlmProviderPlugin();
    const result = await provider.catalog?.run(createCatalogContext());
    expect(result).toBeNull();
  });

  it("refreshes models from /v1/models and falls back to static catalog on error", async () => {
    const fetchOk = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        object: "list",
        data: [
          {
            id: "glm-5.3-flash-abliterated",
            name: "GLM-5.3 Flash Abliterated",
            context_length: 1048576,
            max_output_tokens: 131072,
            pricing: { input: "0.0977", output: "0.3421", cached_input: "0.0098" },
            input_modalities: ["text", "image"],
            capabilities: { reasoning: true, vision: true },
          },
          {
            id: "future-model-v1",
            name: "Future Model v1",
            context_length: 262144,
            max_output_tokens: 65536,
            pricing: { input: "0.50", output: "1.50", cached_input: "0.05" },
            input_modalities: ["text"],
            capabilities: { reasoning: true, vision: false },
          },
        ],
      }),
    })) as unknown as typeof fetch;

    const provider = createAbliteratedLlmProviderPlugin({ fetchImpl: fetchOk });
    const liveResult = await provider.catalog?.run(createCatalogContext("sk-test-key"));
    assert(liveResult && "provider" in liveResult, "Expected live catalog result");
    expect(liveResult.provider.apiKey).toBe("sk-test-key");
    expect(liveResult.provider.models.map((m) => m.id)).toEqual([
      "glm-5.3-flash-abliterated",
      "future-model-v1",
    ]);
    expect(liveResult.provider.models[0]?.compat?.thinkingRequired).toBe(true);
    expect(liveResult.provider.models[1]?.cost).toEqual({
      input: 0.5,
      output: 1.5,
      cacheRead: 0.05,
      cacheWrite: 0,
    });
    expect(fetchOk).toHaveBeenCalledTimes(1);

    // Subsequent call uses TTL cache
    await provider.catalog?.run(createCatalogContext("sk-test-key"));
    expect(fetchOk).toHaveBeenCalledTimes(1);

    clearAbliteratedLlmCatalogCache();
    const fetchFail = vi.fn(async () => {
      throw new Error("network unavailable");
    }) as unknown as typeof fetch;
    const fallback = await fetchAbliteratedLlmProvider({
      apiKey: "sk-test-key",
      fetchImpl: fetchFail,
    });
    expect(fallback.source).toBe("static");
    expect(fallback.provider.models).toHaveLength(16);
    expect(fallback.provider.models).toEqual(buildAbliteratedLlmProvider().models);
  });

  it("resolves static and forward-compatible dynamic models", () => {
    const knownVideoModel = resolveAbliteratedLlmDynamicModel({
      modelId: "glm-5.3-flash",
    });
    assert(knownVideoModel, "Expected known static model");
    expect(knownVideoModel.id).toBe("glm-5.3-flash");
    expect(knownVideoModel.input).toEqual(["text", "image"]);
    expect(knownVideoModel.compat?.thinkingRequired).toBe(true);

    const unknownModel = resolveAbliteratedLlmDynamicModel({
      modelId: "abliteratedllm/custom-new-model",
    });
    assert(unknownModel, "Expected dynamic fallback model");
    expect(unknownModel.id).toBe("custom-new-model");
    expect(unknownModel.provider).toBe(ABLITERATEDLLM_PROVIDER_ID);
    expect(unknownModel.baseUrl).toBe(ABLITERATEDLLM_BASE_URL);
    expect(unknownModel.contextWindowSource).toBe("synthetic");
  });
});
