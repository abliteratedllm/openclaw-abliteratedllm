# OpenClaw AbliteratedLLM Provider

OpenClaw model provider plugin for [AbliteratedLLM](https://abliteratedllm.dev), exposing abliterated and open-weight models through the OpenAI-compatible Chat Completions API (`https://api.abliteratedllm.dev/v1`).

## Install

Install from ClawHub:

```bash
openclaw plugins install @abliteratedllm/openclaw-abliteratedllm
```

Or install directly from npm:

```bash
openclaw plugins install npm:@abliteratedllm/openclaw-abliteratedllm
```

## API Key Setup

Create an API key in your AbliteratedLLM dashboard (see [AbliteratedLLM Docs](https://abliteratedllm.dev/docs)).

Configure via OpenClaw onboarding:

```bash
openclaw onboard --abliteratedllm-api-key "$ABLITERATEDLLM_API_KEY"
```

Or export the environment variable before starting OpenClaw:

```bash
export ABLITERATEDLLM_API_KEY="your-api-key"
```

The default model is `abliteratedllm/glm-5.3-flash-abliterated`.

## Models

Pricing is in USD per 1M tokens (cache write is `$0`). The plugin also refreshes the live model list from `https://api.abliteratedllm.dev/v1/models` and falls back to this static catalog when offline.

| Model ID | Name | Context | Max Output | Input Modalities | Input / Cache Read / Output ($/1M) | Reasoning Efforts |
| --- | --- | ---: | ---: | --- | --- | --- |
| `glm-5.3-flash-abliterated` | GLM-5.3 Flash Abliterated | 1,048,576 | 131,072 | text, image | $0.0977 / $0.0098 / $0.3421 | `low`, `high`, `max` (always on) |
| `glm-5.3-cyber-abliterated` | GLM-5.3 Cyber Abliterated | 1,048,576 | 131,072 | text | $0.90 / $0.135 / $1.80 | `low`, `high`, `max` (always on) |
| `deepseek-v4.1-flash-1017` | DeepSeek V4.1 Flash 1017 | 1,048,576 | 1,048,576 | text, image | $0.27 / $0.0054 / $1.08 | `none`, `low`, `high`, `max` |
| `deepseek-v4.1-flash-1017-ultrafast` | DeepSeek V4.1 Flash 1017 Ultrafast | 1,048,576 | 1,048,576 | text, image | $2.16 / $0.0432 / $8.64 | `none`, `low`, `high`, `max` |
| `deepseek-v4.1-flash-original` | DeepSeek V4.1 Flash (original) | 1,048,576 | 1,048,576 | text, image | $0.27 / $0.0054 / $1.08 | `none`, `low`, `high`, `max` |
| `glm-5.3-flash` | GLM-5.3 Flash | 1,048,576 | 1,048,576 | text, image, video | $0.135 / $0.027 / $0.45 | `low`, `high`, `max` (always on) |
| `glm-5.3` | GLM-5.3 | 1,048,576 | 1,048,576 | text | $1.26 / $0.234 / $3.96 | `low`, `high`, `max` (always on) |
| `glm-5.3-fast` | GLM-5.3 Fast | 1,048,576 | 1,048,576 | text | $1.89 / $0.351 / $5.94 | `low`, `high`, `max` (always on) |
| `kimi-k3` | Kimi K3 | 1,048,576 | 1,048,576 | text, image | $2.70 / $0.27 / $13.50 | `none`, `low`, `medium`, `high`, `max` |
| `kimi-k3.1-pro` | Kimi K3.1 Pro | 1,048,576 | 1,048,576 | text, image | $1.80 / $0.18 / $9.00 | `none`, `low`, `medium`, `high`, `max` |
| `kimi-k3-fast` | Kimi K3 Fast | 1,048,576 | 1,048,576 | text, image | $4.05 / $0.405 / $20.25 | `none`, `low`, `medium`, `high`, `max` |
| `ember-1` | Ember-1 | 1,048,576 | 1,048,576 | text, image | $2.70 / $0.27 / $13.50 | `none`, `low`, `medium`, `high`, `max` |
| `muse-spark-open` | Muse Spark Open | 1,048,576 | 1,048,576 | text, image | $1.125 / $0.135 / $3.825 | `low`, `medium`, `high`, `xhigh` (always on) |
| `qwen3.8-max` | Qwen3.8 Max | 262,144 | 262,144 | text, image | $1.80 / $0.225 / $5.40 | `none`, `low`, `medium`, `xhigh` |
| `qwen3.8-2.4t-a95b` | Qwen3.8-2.4T-A95B | 262,144 | 262,144 | text, image | $1.80 / $0.225 / $5.40 | `none`, `low`, `medium`, `xhigh` |
| `minimax-m3` | MiniMax M3 | 512,000 | 512,000 | text, image | $0.27 / $0.054 / $1.08 | `low`, `medium`, `high` (always on) |

## Links

- Website: <https://abliteratedllm.dev>
- Documentation: <https://abliteratedllm.dev/docs>
- Model Reference: <https://abliteratedllm.dev/docs/models>
- Pricing: <https://abliteratedllm.dev/pricing>
- Live Model Catalog JSON: <https://api.abliteratedllm.dev/v1/models>

## License

MIT
