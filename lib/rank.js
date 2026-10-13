// Ranking: combines each person's own verdict, the other agent's verdict, and the matchmaker pre-score.
export const pairKey = (a, b) => [a, b].sort().join("|");

export function readyIds(state) {
  return (state.order || []).filter((id) => state.people[id]?.profile);
}

export function buildRankings(state) {
  const ids = readyIds(state);
  const out = {};
  for (const id of ids) {
    const rows = [];
    for (const other of ids) {
      if (other === id) continue;
      const d = state.dates?.[pairKey(id, other)];
      const pre = state.shortlist?.scores?.[id]?.[other];
      const mine = d?.verdicts?.[id];
      const theirs = d?.verdicts?.[other];
      if (mine && theirs) {
        const base = 0.45 * mine.score + 0.35 * theirs.score + 0.2 * (pre?.score ?? mine.score);
        const mutual = mine.would_meet_again && theirs.would_meet_again;
        rows.push({
          id: other,
          dated: true,
          score: Math.max(0, Math.min(100, Math.round(base + (mutual ? 3 : 0)))),
          mine: mine.score,
          theirs: theirs.score,
          mutual,
          reason: mine.one_line,
          concerns: mine.concerns,
          shared: mine.shared,
        });
      } else if (pre) {
        rows.push({ id: other, dated: false, score: Math.round(pre.score * 0.6), mine: null, theirs: null, mutual: false, reason: pre.reason, concerns: [], shared: [] });
      }
    }
    rows.sort((a, b) => Number(b.dated) - Number(a.dated) || b.score - a.score);
    out[id] = rows;
  }
  return out;
}

export function mutualMatches(state) {
  const seen = new Set();
  const out = [];
  for (const [key, d] of Object.entries(state.dates || {})) {
    if (seen.has(key) || !d.verdicts) continue;
    seen.add(key);
    const va = d.verdicts[d.a];
    const vb = d.verdicts[d.b];
    if (!va || !vb) continue;
    out.push({ key, a: d.a, b: d.b, avg: Math.round((va.score + vb.score) / 2), both: va.would_meet_again && vb.would_meet_again, highlight: d.highlight });
  }
  return out.sort((x, y) => Number(y.both) - Number(x.both) || y.avg - x.avg);
}
