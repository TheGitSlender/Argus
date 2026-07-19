import OpenAI from "openai";
import { createHash } from "crypto";
import type { z } from "zod";
import { prisma } from "./db";

// =============================================================================
// The ONE LLM wrapper. Every pipeline stage calls runLLM() — no direct OpenAI
// calls anywhere else. This is non-negotiable: the ReasoningLog rows written
// here ARE the agentic-traceability stretch goal and the LLM cache.
//
// Open-source escape hatch: set OPENAI_BASE_URL to any OpenAI-compatible
// endpoint (Groq, Together, Ollama, vLLM) and override MODEL_* env vars.
// =============================================================================

export const MODELS = {
  /** Cheap extraction / classification. */
  extract: process.env.MODEL_EXTRACT ?? "gpt-4.1-nano",
  /** Dimension + axis scoring. Must support `temperature` (self-consistency). */
  score: process.env.MODEL_SCORE ?? "gpt-4.1-mini",
  /** Memo, adversarial pass, interview playbook. */
  heavy: process.env.MODEL_HEAVY ?? "gpt-4.1",
} as const;

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set (see .env.example)");
    }
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
  }
  return _client;
}

export interface RunLlmOptions<T> {
  /** Pipeline step name, e.g. "extract_claims", "score_execution". */
  step: string;
  model?: string;
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  /** When provided, forces JSON mode and validates the response against it. */
  schema?: z.ZodType<T>;
  /** Ids of the signals/claims/founders this call consumed (traceability). */
  inputRefs?: Record<string, unknown>;
  /** Distinguishes self-consistency samples in the cache key (0, 1, 2). */
  sampleIndex?: number;
  noCache?: boolean;
}

export interface LlmResult<T> {
  text: string;
  parsed: T;
  cached: boolean;
  model: string;
}

function cacheKeyFor(parts: unknown): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

// Until the shared Postgres exists, cache lookups and ReasoningLog writes are
// skipped with a single warning instead of failing the whole pipeline.
let dbWarned = false;
function warnDbOnce(err: unknown) {
  if (!dbWarned) {
    dbWarned = true;
    console.warn(
      `[llm] ReasoningLog unavailable (no DATABASE_URL yet?) — running uncached & unlogged. ${String(err).split("\n")[0]}`
    );
  }
}

function extractJson(text: string): string {
  // Tolerate code fences and leading prose from weaker models.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

async function complete(
  model: string,
  system: string | undefined,
  prompt: string,
  temperature: number | undefined,
  maxTokens: number | undefined,
  jsonMode: boolean
) {
  const started = Date.now();
  const response = await getClient().chat.completions.create({
    model,
    messages: [
      ...(system ? [{ role: "system" as const, content: system }] : []),
      { role: "user" as const, content: prompt },
    ],
    temperature,
    max_completion_tokens: maxTokens ?? 4096,
    ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
  });
  return {
    text: response.choices[0]?.message?.content ?? "",
    inputTokens: response.usage?.prompt_tokens ?? null,
    outputTokens: response.usage?.completion_tokens ?? null,
    latencyMs: Date.now() - started,
  };
}

/**
 * Run an LLM call: cache-check -> call -> validate -> append to ReasoningLog.
 * On schema-validation failure, retries once with the error appended.
 */
export async function runLLM<T = string>(opts: RunLlmOptions<T>): Promise<LlmResult<T>> {
  const model = opts.model ?? MODELS.score;
  const key = cacheKeyFor({
    model,
    system: opts.system ?? null,
    prompt: opts.prompt,
    temperature: opts.temperature ?? null,
    sampleIndex: opts.sampleIndex ?? null,
  });

  if (!opts.noCache) {
    try {
      const hit = await prisma.reasoningLog.findFirst({
        where: { cacheKey: key },
        orderBy: { createdAt: "desc" },
      });
      if (hit) {
        const parsed = opts.schema
          ? opts.schema.parse(JSON.parse(extractJson(hit.output)))
          : (hit.output as unknown as T);
        return { text: hit.output, parsed, cached: true, model };
      }
    } catch (err) {
      warnDbOnce(err);
    }
  }

  const jsonMode = Boolean(opts.schema);
  let attempt = await complete(model, opts.system, opts.prompt, opts.temperature, opts.maxTokens, jsonMode);
  let parsed: T;

  if (opts.schema) {
    try {
      parsed = opts.schema.parse(JSON.parse(extractJson(attempt.text)));
    } catch (firstError) {
      const retryPrompt = `${opts.prompt}\n\nYour previous response was invalid: ${String(
        firstError
      ).slice(0, 500)}\nRespond again with ONLY corrected valid JSON.`;
      attempt = await complete(model, opts.system, retryPrompt, opts.temperature, opts.maxTokens, true);
      parsed = opts.schema.parse(JSON.parse(extractJson(attempt.text)));
    }
  } else {
    parsed = attempt.text as unknown as T;
  }

  try {
    await prisma.reasoningLog.create({
      data: {
        step: opts.step,
        model,
        cacheKey: key,
        inputRefs: (opts.inputRefs ?? {}) as object,
        output: attempt.text,
        inputTokens: attempt.inputTokens,
        outputTokens: attempt.outputTokens,
        latencyMs: attempt.latencyMs,
      },
    });
  } catch (err) {
    warnDbOnce(err);
  }

  return { text: attempt.text, parsed, cached: false, model };
}
