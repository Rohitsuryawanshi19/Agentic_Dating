// Server-side only. Calls Apify actors synchronously and returns dataset items.
import { slimLinkedIn, slimInstagram } from "./slim";

const LI_ACTOR = process.env.APIFY_LINKEDIN_ACTOR || "LpVuK3Zozwuipa5bp";
const IG_ACTOR = process.env.APIFY_INSTAGRAM_ACTOR || "dSCLg0C3YEZ83HzYX";
const LI_MODE = process.env.APIFY_LINKEDIN_MODE || "Profile details no email ($4 per 1k)";

async function runActor(actorId, input) {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN is not set on the server");
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=50`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Apify ${res.status}: ${t.slice(0, 200)}`);
  }
  const items = await res.json();
  return Array.isArray(items) ? items : [];
}

export function normalizeLinkedIn(url) {
  const m = String(url).match(/linkedin\.com\/in\/([^/?#\s]+)/i);
  if (!m) throw new Error("Not a LinkedIn profile URL (needs /in/...)");
  return `https://www.linkedin.com/in/${m[1]}`;
}

export function instagramUsername(urlOrHandle) {
  const s = String(urlOrHandle).trim();
  const m = s.match(/instagram\.com\/([^/?#\s]+)/i);
  const u = (m ? m[1] : s).replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{1,40}$/.test(u)) throw new Error("Could not read an Instagram username");
  return u;
}

export async function scrapeLinkedIn(url) {
  const items = await runActor(LI_ACTOR, { profileScraperMode: LI_MODE, queries: [normalizeLinkedIn(url)] });
  if (!items.length) throw new Error("LinkedIn scraper returned no data (profile may be restricted)");
  return slimLinkedIn(items[0]);
}

export async function scrapeInstagram(urlOrHandle) {
  const items = await runActor(IG_ACTOR, { usernames: [instagramUsername(urlOrHandle)], includeAboutSection: false });
  if (!items.length) throw new Error("Instagram scraper returned no data");
  return slimInstagram(items[0]);
}
