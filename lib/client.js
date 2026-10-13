// Browser-side helpers: API calls, a concurrency pool, and link parsing.
export async function post(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let data = {};
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function pool(items, limit, worker) {
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
}

// One person per line. Accepts "linkedin, instagram" in any order, separated by comma, space, tab or |
export function parseEntries(text) {
  const out = [];
  const seen = new Set();
  for (const line of text.split("\n")) {
    const li = line.match(/https?:\/\/(?:[\w-]+\.)?linkedin\.com\/in\/[^\s,|;]+/i)?.[0];
    if (!li) continue;
    const rest = line.replace(li, " ");
    const ig =
      rest.match(/https?:\/\/(?:www\.)?instagram\.com\/[^\s,|;]+/i)?.[0] ||
      rest.match(/(?:^|[\s,|;])@([A-Za-z0-9._]{2,30})(?=$|[\s,|;])/)?.[1];
    const slug = decodeURIComponent(li.split("/in/")[1].replace(/[/?#].*$/, "")).toLowerCase();
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({ id: slug, linkedin: li, instagram: ig || null });
  }
  return out;
}
