import {
  AI_SYSTEM_PROMPT,
  buildUserPrompt,
} from "@/lib/ai/prompts";
import {
  MemoryAnalysisSchema,
  type AIProvider,
  type MemoryAnalysisInput,
  type MemoryAnalysisResult,
} from "@/lib/ai/types";

function extractJsonObject(text: string) {
  let cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/gi, "")
    .replace(/<\/?think>/gi, "")
    .trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) cleaned = fenced[1].trim();

  // Prefer the last balanced-looking object (avoids braces inside leftover prose).
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not contain JSON.");
  }
  return cleaned.slice(start, end + 1);
}

function isGroqBaseUrl(baseUrl: string) {
  return /groq\.com/i.test(baseUrl);
}

/** Groq GPT-OSS: reasoning_effort is low|medium|high; reasoning_format unsupported. */
function isGroqGptOss(model: string) {
  return /gpt-oss/i.test(model);
}

/** Groq Qwen/Compound: reasoning_effort is none|default; may accept reasoning_format. */
function isGroqQwenStyleReasoning(model: string) {
  return /qwen|compound/i.test(model);
}

type CompleteOptions = {
  imageDataUrls?: string[];
  /** OpenAI-style JSON object mode. Groq often rejects imperfect model output with 400. */
  jsonMode: boolean;
};

export class OpenAICompatibleProvider implements AIProvider {
  constructor(
    private readonly options: {
      apiKey: string;
      model: string;
      baseUrl: string;
    },
  ) {}

  async analyzeMemory(input: MemoryAnalysisInput): Promise<MemoryAnalysisResult> {
    const userText = buildUserPrompt({
      language: input.language,
      tone: input.tone,
      userNote: input.userNote,
      excludedDetails: input.excludedDetails,
      relationshipContext: input.relationshipContext,
      eventMetadata: JSON.stringify(input.eventMetadata, null, 2),
      photoObservations: JSON.stringify(input.photoObservations, null, 2),
    });

    // Groq's server-side json_object validation is brittle (esp. Qwen). Prefer
    // free-form + local parse, unless AI_JSON_MODE=true forces it.
    const preferJsonMode =
      process.env.AI_JSON_MODE === "true"
        ? true
        : process.env.AI_JSON_MODE === "false"
          ? false
          : !isGroqBaseUrl(this.options.baseUrl);

    const first = await this.completeSafe(userText, {
      imageDataUrls: input.analysisImageDataUrls,
      jsonMode: preferJsonMode,
    });
    try {
      return MemoryAnalysisSchema.parse(JSON.parse(extractJsonObject(first)));
    } catch (error) {
      const repairPrompt = `${userText}

Your previous JSON was invalid or did not match the schema.
Validation error: ${error instanceof Error ? error.message : "unknown"}
Return corrected JSON only — one object, no markdown.`;
      const second = await this.completeSafe(repairPrompt, {
        imageDataUrls: input.analysisImageDataUrls,
        jsonMode: false,
      });
      return MemoryAnalysisSchema.parse(JSON.parse(extractJsonObject(second)));
    }
  }

  private async completeSafe(userText: string, options: CompleteOptions) {
    try {
      return await this.complete(userText, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (options.jsonMode && /Failed to validate JSON|json_validate/i.test(message)) {
        return this.complete(userText, { ...options, jsonMode: false });
      }
      throw error;
    }
  }

  private async complete(userText: string, options: CompleteOptions) {
    const content: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [{ type: "text", text: userText }];

    for (const url of options.imageDataUrls?.slice(0, 4) ?? []) {
      content.push({ type: "image_url", image_url: { url } });
    }

    const endpoint = `${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const body: Record<string, unknown> = {
      model: this.options.model,
      temperature: 0.3,
      max_tokens: 4096,
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPT },
        { role: "user", content },
      ],
    };
    if (options.jsonMode) {
      body.response_format = { type: "json_object" };
    }
    // Groq reasoning params differ by family; Llama rejects them entirely (400).
    if (isGroqBaseUrl(this.options.baseUrl)) {
      if (isGroqGptOss(this.options.model)) {
        // GPT-OSS only accepts low|medium|high (not none). Keep low for diary JSON.
        body.reasoning_effort = "low";
      } else if (isGroqQwenStyleReasoning(this.options.model)) {
        body.reasoning_effort = "none";
        body.reasoning_format = "hidden";
      }
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      let detail = text.slice(0, 400);
      let failedGeneration: string | undefined;
      try {
        const parsed = JSON.parse(text) as {
          error?: {
            message?: string;
            code?: string;
            failed_generation?: string;
          };
        };
        if (parsed.error?.failed_generation) {
          failedGeneration = parsed.error.failed_generation;
        }
        if (parsed.error?.message) {
          detail = parsed.error.message;
          if (parsed.error.code === "model_not_found") {
            detail = `${parsed.error.message} 请在 .env.local 把 AI_MODEL 改成当前可用模型（Groq Production 推荐 llama-3.3-70b-versatile），然后重启 npm run dev。`;
          }
        }
      } catch {
        // keep raw snippet
      }

      // Groq sometimes includes almost-valid JSON in failed_generation — try it.
      if (failedGeneration) {
        try {
          JSON.parse(extractJsonObject(failedGeneration));
          return failedGeneration;
        } catch {
          // fall through to throw
        }
      }

      throw new Error(`AI request failed (${response.status}): ${detail}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const contentText = json.choices?.[0]?.message?.content;
    if (!contentText) {
      throw new Error("AI response was empty.");
    }
    return contentText;
  }
}
