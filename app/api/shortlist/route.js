import { gemini } from "../../../lib/gemini";
import { SHORTLIST_SYSTEM } from "../../../lib/prompts";

export const maxDuration = 60;

const compact = (items = [], n = 5) => items.slice(0, n).map((x) => (typeof x === "string" ? x : x.label));

export async function POST(req) {
  try {
    const { people, k = 5 } = await req.json();
    const ids = people.map((p) => p.id);
    const K = Math.min(k, ids.length - 1);
    const cards = people.map((p) => ({
      id: p.id,
      name: p.profile.name,
      one_liner: p.profile.one_liner,
      location: p.profile.location,
      needs: compact(p.profile.needs),
      hobbies: compact(p.profile.hobbies),
      interests: compact(p.profile.interests),
      values: compact(p.profile.values),
      traits: compact(p.profile.personality_traits),
      looking_for: compact(p.profile.looking_for, 3),
      style: p.profile.communication_style,
    }));
    const out = await gemini({
      system: SHORTLIST_SYSTEM,
      prompt: `K = ${K}\nPEOPLE:\n${JSON.stringify(cards)}`,
      temperature: 0.2,
      maxTokens: 8192,
    });

    // sanitize: valid ids only, no self, no dupes, top K, and backfill if the model under-delivered
    const matches = {};
    for (const id of ids) {
      const seen = new Set();
      const list = [];
      for (const m of out.matches?.[id] || []) {
        if (!m || m.id === id || !ids.includes(m.id) || seen.has(m.id)) continue;
        seen.add(m.id);
        list.push({ id: m.id, score: Math.max(0, Math.min(100, Number(m.score) || 0)), reason: String(m.reason || "") });
      }
      list.sort((a, b) => b.score - a.score);
      matches[id] = list.slice(0, K);
    }
    return Response.json({ matches });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
