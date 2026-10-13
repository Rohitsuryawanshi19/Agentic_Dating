import { gemini } from "../../../lib/gemini";
import { VERDICT_SYSTEM, verdictPrompt } from "../../../lib/prompts";

export const maxDuration = 60;

export async function POST(req) {
  try {
    const { me, other, transcript } = await req.json();
    const v = await gemini({
      system: VERDICT_SYSTEM,
      prompt: verdictPrompt(me, other, transcript),
      temperature: 0.3,
      maxTokens: 1024,
    });
    return Response.json({
      verdict: {
        score: Math.max(0, Math.min(100, Math.round(Number(v.score) || 0))),
        chemistry: String(v.chemistry || ""),
        shared: Array.isArray(v.shared) ? v.shared.map(String).slice(0, 5) : [],
        concerns: Array.isArray(v.concerns) ? v.concerns.map(String).slice(0, 5) : [],
        would_meet_again: !!v.would_meet_again,
        one_line: String(v.one_line || ""),
      },
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
