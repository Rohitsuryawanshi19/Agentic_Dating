import { gemini } from "../../../lib/gemini";
import { ANALYZE_SYSTEM, analyzePrompt } from "../../../lib/prompts";

export const maxDuration = 60;

export async function POST(req) {
  try {
    const { raw } = await req.json();
    if (!raw || (!raw.linkedin && !raw.instagram && !raw.pasted)) {
      return Response.json({ error: "No scraped data to analyze" }, { status: 400 });
    }
    const profile = await gemini({
      system: ANALYZE_SYSTEM,
      prompt: analyzePrompt(raw),
      temperature: 0.3,
      maxTokens: 4096,
    });
    if (!profile.name) profile.name = raw.linkedin?.name || raw.instagram?.name || "Unknown";
    profile.sources = {
      linkedin: !!raw.linkedin,
      instagram: !!raw.instagram,
      instagramPrivate: !!raw.instagram?.private,
      instagramUrl: raw.instagram?.username ? `https://instagram.com/${raw.instagram.username}` : null,
    };
    return Response.json({ profile });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
