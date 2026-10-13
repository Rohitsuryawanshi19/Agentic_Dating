// Server-side only. Thin Gemini REST client with retry, model fallback and JSON parsing.
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODELS = "gemini-3.6-flash,gemini-3.5-flash-lite,gemini-flash-latest,gemini-flash-lite-latest";
const MODELS = (process.env.GEMINI_MODELS || DEFAULT_MODELS)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const badModels = new Set();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function parseJSON(text) {
  let t = (text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(t);
  } catch {}
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s >= 0 && e > s) {
    try {
      return JSON.parse(t.slice(s, e + 1));
    } catch {}
  }
  throw new Error("Model returned invalid JSON");
}

function pickModel(attempt) {
  const usable = MODELS.filter((m) => !badModels.has(m));
  if (!usable.length) throw new Error("No usable Gemini model. Set GEMINI_MODELS to valid names from AI Studio.");
  return usable[attempt % usable.length];
}

export async function gemini({ system, prompt, json = true, temperature = 0.7, maxTokens = 4096 }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set on the server");
  let lastErr;
  for (let attempt = 0; attempt < 7; attempt++) {
    const model = pickModel(attempt);
    const generationConfig = { temperature, maxOutputTokens: maxTokens };
    if (json) generationConfig.responseMimeType = "application/json";
    if (model.includes("2.5")) generationConfig.thinkingConfig = { thinkingBudget: 0 };
    try {
      const res = await fetch(`${BASE}/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig,
        }),
      });
      if (res.status === 404) {
        badModels.add(model);
        lastErr = new Error(`Model ${model} not found`);
        continue;
      }
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`Gemini ${res.status} (rate limit or overload)`);
        await sleep(1500 * (attempt + 1) + Math.random() * 600);
        continue;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || `Gemini ${res.status}`);
      const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
      if (!text) throw new Error("Empty model response");
      return json ? parseJSON(text) : text.trim();
    } catch (e) {
      lastErr = e;
      if (/API key|permission|PERMISSION_DENIED/i.test(e.message)) throw e;
      await sleep(600);
    }
  }
  throw lastErr || new Error("Gemini failed");
}
