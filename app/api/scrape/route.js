import { scrapeLinkedIn, scrapeInstagram } from "../../../lib/apify";

export const maxDuration = 60;

export async function POST(req) {
  try {
    const { linkedin, instagram, pasted } = await req.json();
    if (pasted) return Response.json({ linkedin: null, instagram: null, pasted, errors: {} });
    if (!linkedin && !instagram) return Response.json({ error: "Provide a LinkedIn and/or Instagram link" }, { status: 400 });

    const [li, ig] = await Promise.allSettled([
      linkedin ? scrapeLinkedIn(linkedin) : Promise.resolve(null),
      instagram ? scrapeInstagram(instagram) : Promise.resolve(null),
    ]);
    const out = {
      linkedin: li.status === "fulfilled" ? li.value : null,
      instagram: ig.status === "fulfilled" ? ig.value : null,
      errors: {
        linkedin: li.status === "rejected" ? li.reason.message : undefined,
        instagram: ig.status === "rejected" ? ig.reason.message : undefined,
      },
    };
    if (!out.linkedin && !out.instagram) {
      return Response.json(
        { error: `Both scrapers failed. LinkedIn: ${out.errors.linkedin || "n/a"}. Instagram: ${out.errors.instagram || "n/a"}` },
        { status: 502 }
      );
    }
    return Response.json(out);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
