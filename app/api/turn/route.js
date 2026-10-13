import { gemini } from "../../../lib/gemini";
import { personaSystem, turnPrompt } from "../../../lib/prompts";

export const maxDuration = 60;

export async function POST(req) {
  try {
    const { me, other, transcript = [], first } = await req.json();
    const text = await gemini({
      system: personaSystem(me, other),
      prompt: turnPrompt(transcript, first),
      json: false,
      temperature: 0.9,
      maxTokens: 300,
    });
    return Response.json({ text: text.replace(/^["“]|["”]$/g, "").trim() });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
