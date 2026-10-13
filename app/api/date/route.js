import { gemini } from "../../../lib/gemini";
import { DATE_SYSTEM, datePrompt } from "../../../lib/prompts";

export const maxDuration = 60;

const clampVerdict = (v = {}) => ({
  score: Math.max(0, Math.min(100, Math.round(Number(v.score) || 0))),
  chemistry: String(v.chemistry || ""),
  shared: Array.isArray(v.shared) ? v.shared.map(String).slice(0, 5) : [],
  concerns: Array.isArray(v.concerns) ? v.concerns.map(String).slice(0, 5) : [],
  would_meet_again: !!v.would_meet_again,
  one_line: String(v.one_line || ""),
});

export async function POST(req) {
  try {
    const { a, b } = await req.json();
    const out = await gemini({ system: DATE_SYSTEM, prompt: datePrompt(a, b), temperature: 0.9, maxTokens: 4096 });
    const turns = (out.turns || [])
      .filter((t) => t && t.text)
      .map((t) => ({ speaker: t.speaker === "B" ? "B" : "A", text: String(t.text) }));
    if (turns.length < 4) throw new Error("Date transcript too short");
    return Response.json({
      turns,
      verdict_a: clampVerdict(out.verdict_a),
      verdict_b: clampVerdict(out.verdict_b),
      highlight: String(out.highlight || ""),
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
