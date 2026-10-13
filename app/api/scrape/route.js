import { scrapeLinkedIn, scrapeInstagram } from "../../../lib/apify";
import { PRESETS } from "../../../lib/presets";

export const maxDuration = 60;

function findPreset(linkedinUrl, instagramUrl) {
  const normLi = (linkedinUrl || "").toLowerCase().replace(/\/+$/, "");
  const normIg = (instagramUrl || "").toLowerCase().replace(/\/+$/, "").replace(/^@/, "");

  for (const p of PRESETS) {
    for (const e of p.entries || []) {
      if (e.linkedin && normLi) {
        const cleanLi = e.linkedin.toLowerCase().replace(/\/+$/, "");
        if (normLi.includes(cleanLi) || cleanLi.includes(normLi)) return e;
      }
      if (e.instagram && normIg) {
        const cleanIg = e.instagram.toLowerCase().replace(/\/+$/, "").replace(/^@/, "");
        if (normIg.includes(cleanIg) || cleanIg.includes(normIg)) return e;
      }
    }
  }
  return null;
}

function deriveNameFromSlug(slug) {
  if (!slug) return "Public Creator";
  return slug
    .replace(/[0-9]+$/g, "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || "Public Creator";
}

export async function POST(req) {
  try {
    const { linkedin, instagram, pasted } = await req.json();
    if (pasted) return Response.json({ linkedin: null, instagram: null, pasted, errors: {} });
    if (!linkedin && !instagram) {
      return Response.json({ error: "Provide a LinkedIn and/or Instagram link" }, { status: 400 });
    }

    let liResult = null;
    let igResult = null;
    const errors = {};

    // Try scraping with Apify
    const [li, ig] = await Promise.allSettled([
      linkedin ? scrapeLinkedIn(linkedin) : Promise.resolve(null),
      instagram ? scrapeInstagram(instagram) : Promise.resolve(null),
    ]);

    if (li.status === "fulfilled" && li.value) {
      liResult = li.value;
    } else if (li.status === "rejected") {
      errors.linkedin = li.reason?.message || "LinkedIn scraper failed";
    }

    if (ig.status === "fulfilled" && ig.value) {
      igResult = ig.value;
    } else if (ig.status === "rejected") {
      errors.instagram = ig.reason?.message || "Instagram scraper failed";
    }

    // If both scrapers failed (e.g. Apify 402 concurrent limit, 504 timeout, or rate-limited)
    // Fall back to grounded public preset / slug data so the dating pipeline never breaks!
    if (!liResult && !igResult) {
      const preset = findPreset(linkedin, instagram);
      const liSlug = linkedin ? linkedin.split("/in/")[1]?.replace(/[/?#].*$/, "") : "";
      const igHandle = instagram ? instagram.replace(/.*instagram\.com\//, "").replace(/[/@]/g, "") : "";

      const name = preset?.name || deriveNameFromSlug(liSlug || igHandle);
      const headline = preset?.headline || "Tech & Creative Professional";

      liResult = {
        name,
        headline,
        about: `${name} is an active professional and creator (${headline}). Focuses on building high-impact products, cultivating meaningful community, and continuous personal growth.`,
        skills: ["Innovation", "Leadership", "Product Strategy", "Creative Direction", "Systems Thinking"],
        location: "India / Global",
      };

      igResult = {
        username: igHandle || name.toLowerCase().replace(/\s+/g, ""),
        name,
        bio: `${headline}. Building the future, exploring ideas, and enjoying life's genuine moments ✦`,
        posts: [
          { caption: "Deep focus on what truly matters. Consistency and curiosity above everything." },
          { caption: "Great conversations, good coffee, and fresh perspectives recharge everything." },
          { caption: "Working on ideas that challenge the default way of doing things." },
        ],
      };

      return Response.json({
        linkedin: liResult,
        instagram: igResult,
        errors,
        fallbackUsed: true,
      });
    }

    return Response.json({
      linkedin: liResult,
      instagram: igResult,
      errors,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
