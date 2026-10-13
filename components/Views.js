"use client";
import { useMemo, useState } from "react";
import { buildRankings, mutualMatches, pairKey, readyIds } from "../lib/rank";

const norm = (x) => (typeof x === "string" ? { label: x } : x || {});
const nameOf = (state, id) => state.people?.[id]?.profile?.name || id;

function PromptSection({ title, icon, items }) {
  if (!items?.length) return null;
  return (
    <div className="prompt-card">
      <div className="prompt-label">
        {icon ? <span>{icon}</span> : null}
        <span>{title}</span>
      </div>
      <div className="attribute-items">
        {items.map(norm).map((it, i) => (
          <div className="attr-row" key={i}>
            <span
              className={"confidence-dot " + (it.confidence || "low")}
              title={`confidence: ${it.confidence || "low"}`}
            />
            <div className="attr-text">
              <b>{it.label}</b>
              {it.evidence ? <small>spotted: "{it.evidence}"</small> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileCard({ person, onManual, onPickForDate }) {
  const [paste, setPaste] = useState("");
  const p = person.profile;

  if (!p) {
    const isError = person.status === "error";
    return (
      <div className="card profile">
        <div className="head">
          <div className="avatar">?</div>
          <div>
            <h3>{person.id}</h3>
            <span className={"badge " + (isError ? "warn" : "")}>
              {isError ? "needs a manual paste" : person.status || "in queue"}
            </span>
          </div>
        </div>
        <div>
          <p className={isError ? "err" : "muted"}>
            {isError ? person.error : "reading public socials..."}
          </p>
          {isError && onManual ? (
            <div className="neuro-card-inset">
              <small className="muted" style={{ display: "block", marginBottom: "8px" }}>
                scraper got shy? paste their bio or captions to build the agent:
              </small>
              <textarea
                rows={4}
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder="paste linkedin or instagram text here..."
              />
              <button
                className="btn"
                style={{ marginTop: "8px", width: "100%" }}
                onClick={() => onManual(person.id, paste)}
                disabled={paste.length < 30}
              >
                make their agent anyway
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const dq = p.data_quality || {};
  const initial = (p.name || "?")[0].toUpperCase();

  return (
    <div className="card profile">
      <div className="head">
        <div className="avatar">
          {initial}
          <span className="verified-badge" title="agent ready">✦</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
            <h3>{p.name}</h3>
            {onPickForDate ? (
              <button
                className="btn neuro-btn-sm"
                style={{ fontSize: "12.5px", padding: "4px 12px" }}
                onClick={() => onPickForDate(person.id)}
              >
                send on a date
              </button>
            ) : null}
          </div>
          <p className="card-one-liner">{p.one_liner}</p>
          <div className="badges">
            {p.location ? <span className="badge">📍 {p.location}</span> : null}
            {person.linkedin ? (
              <a className="badge" href={person.linkedin} target="_blank" rel="noreferrer">
                linkedin ({dq.linkedin || "verified"})
              </a>
            ) : null}
            {person.instagram ? (
              <a
                className="badge"
                href={typeof person.instagram === "string" && person.instagram.startsWith("http") ? person.instagram : `https://instagram.com/${person.instagram}`}
                target="_blank"
                rel="noreferrer"
              >
                ig {p.sources?.instagramPrivate ? "(private)" : ""}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <p className="dating-summary">{p.summary}</p>

      <PromptSection title="what they're looking for" icon="💘" items={p.looking_for} />
      <PromptSection title="what they need right now" icon="🌱" items={p.needs} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <PromptSection title="hobbies & downtime" icon="🎯" items={p.hobbies} />
        <PromptSection title="core values" icon="💎" items={p.values} />
      </div>

      <PromptSection title="personality & vibe" icon="✨" items={p.personality_traits} />

      {p.communication_style ? (
        <div className="prompt-card">
          <div className="prompt-label">
            <span>💬</span>
            <span>communication style</span>
          </div>
          <p style={{ fontSize: "15px", color: "var(--ink)", lineHeight: "1.6" }}>{p.communication_style}</p>
        </div>
      ) : null}

      {p.possible_friction?.length ? (
        <div className="friction-box">
          <b>red flags 🚩</b>
          <ul>
            {p.possible_friction.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {p.conversation_hooks?.length ? (
        <div className="prompt-card">
          <div className="prompt-label">
            <span>green flags 💚</span>
          </div>
          <div className="hooks-wrapper">
            {p.conversation_hooks.map((h, i) => (
              <span className="hook-chip" key={i}>
                "{h}"
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VerdictBox({ name, v }) {
  if (!v) return null;
  return (
    <div className="verdict-card">
      <div className="verdict-header">
        <div>
          <b style={{ fontSize: "16px", fontWeight: 800, color: "var(--ink)" }}>{name}'s agent verdict</b>
          <small className="muted" style={{ display: "block", fontSize: "12.5px" }}>private post-date thoughts</small>
        </div>
        <div>
          <span className="score good">{v.score}%</span>
        </div>
      </div>

      <div style={{ margin: "8px 0 12px" }}>
        <span className={"meet-stamp " + (v.would_meet_again ? "yes" : "no")}>
          {v.would_meet_again ? "would hang again ✦" : "better as acquaintances"}
        </span>
      </div>

      <p style={{ fontSize: "15px", color: "var(--ink)", marginBottom: "12px", lineHeight: "1.6" }}>
        "{v.chemistry}"
      </p>

      {v.shared?.length ? (
        <div style={{ margin: "8px 0" }}>
          <small style={{ color: "var(--ink-soft)", fontWeight: 700, display: "block", fontSize: "13px" }}>
            green flags 💚
          </small>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
            {v.shared.map((s, i) => (
              <span key={i} className="badge ok">{s}</span>
            ))}
          </div>
        </div>
      ) : null}

      {v.concerns?.length ? (
        <div style={{ margin: "8px 0" }}>
          <small style={{ color: "var(--ink-soft)", fontWeight: 700, display: "block", fontSize: "13px" }}>
            red flags 🚩
          </small>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
            {v.concerns.map((c, i) => (
              <span key={i} className="badge warn">{c}</span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DatesPanel({ state, onLive, liveBusy, focus, setFocus }) {
  const ids = readyIds(state);
  const list = useMemo(() => mutualMatches(state), [state]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const d = focus ? state.dates[focus] : null;

  return (
    <div className="split">
      <div className="side">
        {onLive ? (
          <div className="card">
            <h4 style={{ fontSize: "20px" }}>watch a live date</h4>
            <p className="muted" style={{ margin: "4px 0 10px", fontSize: "13.5px" }}>
              the talking stage is in session. each turn is a separate call.
            </p>
            <select value={a} onChange={(e) => setA(e.target.value)}>
              <option value="">person a</option>
              {ids.map((id) => (
                <option key={id} value={id}>{nameOf(state, id)}</option>
              ))}
            </select>
            <select value={b} onChange={(e) => setB(e.target.value)}>
              <option value="">person b</option>
              {ids.filter((i) => i !== a).map((id) => (
                <option key={id} value={id}>{nameOf(state, id)}</option>
              ))}
            </select>
            <button
              className="btn"
              style={{ width: "100%", marginTop: "6px" }}
              disabled={!a || !b || liveBusy}
              onClick={() => {
                setFocus(pairKey(a, b));
                onLive(a, b);
              }}
            >
              {liveBusy ? "date rn..." : "start live date ✦"}
            </button>
          </div>
        ) : null}

        <h4 className="muted" style={{ marginTop: "14px" }}>all dates ({list.length})</h4>
        {list.map((m) => (
          <button
            key={m.key}
            className={"row " + (focus === m.key ? "active" : "")}
            onClick={() => setFocus(m.key)}
          >
            <span style={{ fontWeight: 700 }}>
              {nameOf(state, m.a).split(" ")[0]} × {nameOf(state, m.b).split(" ")[0]}
            </span>
            <span className={"score " + (m.both ? "good" : "")}>
              {m.both ? "✦ " : ""}{m.avg}%
            </span>
          </button>
        ))}
      </div>

      <div className="main">
        {!d ? (
          <div className="card" style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: "44px", marginBottom: "12px" }}>🥂</div>
            <h3 style={{ fontSize: "28px", fontWeight: 800 }}>the talking stage transcript</h3>
            <p className="muted">pick a date on the left to read what they talked about.</p>
          </div>
        ) : (
          <div className="card">
            <h3 style={{ fontSize: "28px", fontWeight: 800 }}>
              {nameOf(state, d.a)} × {nameOf(state, d.b)}{" "}
              {d.running ? <span className="badge warn">date rn</span> : null}
            </h3>
            {d.highlight ? <p className="muted" style={{ fontSize: "15px" }}>key moment: "{d.highlight}"</p> : null}

            <div className="chat">
              {d.turns.map((t, i) => {
                const isLeft = t.who === d.a;
                return (
                  <div key={i} className={"bubble " + (isLeft ? "left" : "right")}>
                    <small className="handwritten">{nameOf(state, t.who)}</small>
                    <div>{t.text}</div>
                  </div>
                );
              })}
              {d.running ? (
                <div className="bubble left" style={{ opacity: 0.7 }}>
                  <small className="handwritten">typing...</small>
                  <i>contemplating a reply...</i>
                </div>
              ) : null}
            </div>

            <div className="verdicts-grid">
              <VerdictBox name={nameOf(state, d.a)} v={d.verdicts?.[d.a]} />
              <VerdictBox name={nameOf(state, d.b)} v={d.verdicts?.[d.b]} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChemistryWaveChart({ points }) {
  if (!points || points.length < 2) {
    return (
      <div className="wave-chart-empty">
        <span style={{ fontSize: "12px", opacity: 0.7 }}>run dates to plot chemistry trajectory ✦</span>
      </div>
    );
  }

  const width = 280;
  const height = 95;
  const padX = 20;
  const padY = 14;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const coords = points.map((p, i) => {
    const x = padX + (i / (points.length - 1)) * plotW;
    const scoreVal = Math.max(30, Math.min(100, p.score));
    const normalizedY = (scoreVal - 30) / 70;
    const y = padY + plotH - normalizedY * plotH;
    return { x, y, ...p };
  });

  let pathD = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const cpX1 = curr.x + (next.x - curr.x) / 2;
    const cpY1 = curr.y;
    const cpX2 = curr.x + (next.x - curr.x) / 2;
    const cpY2 = next.y;
    pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
  }

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - padY} L ${coords[0].x} ${height - padY} Z`;

  return (
    <div className="chemistry-wave-container">
      <div className="wave-header">
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "13px" }}>📈</span>
          <span className="wave-title">chemistry wave</span>
        </div>
        <span className="wave-badge">{points[points.length - 1]?.score}% peak</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="wave-svg">
        <defs>
          <linearGradient id="waveFillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF4FA3" stopOpacity="0.32" />
            <stop offset="60%" stopColor="#D9C8FF" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#FFF9F2" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="waveStrokeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF4FA3" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
        </defs>
        <line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke="var(--ink)" strokeOpacity="0.07" strokeDasharray="3 3" />
        <line x1={padX} y1={padY + plotH / 2} x2={width - padX} y2={padY + plotH / 2} stroke="var(--ink)" strokeOpacity="0.07" strokeDasharray="3 3" />
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="var(--ink)" strokeOpacity="0.12" />

        <path d={areaD} fill="url(#waveFillGrad)" />
        <path d={pathD} fill="none" stroke="url(#waveStrokeGrad)" strokeWidth="3" strokeLinecap="round" />

        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="3.5" fill="#FFF9F2" stroke="#FF4FA3" strokeWidth="2.2" />
        ))}
      </svg>
      <div className="wave-x-labels">
        {coords.map((c, i) => (
          <span key={i} className="wave-x-label">{c.label}</span>
        ))}
      </div>
    </div>
  );
}

function RankingsLeaderboard({ state, openDate }) {
  const ids = readyIds(state);
  const ranks = useMemo(() => buildRankings(state), [state]);
  const matches = useMemo(() => mutualMatches(state), [state]);

  const [selectedPerson, setSelectedPerson] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("all"); // "all", "moots", "high"

  // Compute all row pairings
  const items = useMemo(() => {
    if (selectedPerson) {
      const personRanks = ranks[selectedPerson] || [];
      return personRanks.map((r, i) => {
        const d = state.dates?.[pairKey(selectedPerson, r.id)];
        return {
          key: pairKey(selectedPerson, r.id),
          rank: i + 1,
          a: selectedPerson,
          b: r.id,
          score: r.score,
          mutual: r.mutual,
          dated: r.dated,
          highlight: d?.highlight || r.reason || "Shared connection on core values and creative energy ✦",
          reason: r.reason,
        };
      });
    }

    // Cohort global leaderboard
    return matches.map((m, idx) => ({
      key: m.key,
      rank: idx + 1,
      a: m.a,
      b: m.b,
      score: m.avg,
      mutual: m.both,
      dated: true,
      highlight: m.highlight || state.dates?.[m.key]?.highlight || "Sparks flew in the talking stage ✦",
    }));
  }, [selectedPerson, ranks, matches, state.dates]);

  // Search and mode filter
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterMode === "moots" && !item.mutual) return false;
      if (filterMode === "high" && item.score < 80) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameA = (nameOf(state, item.a) || "").toLowerCase();
        const nameB = (nameOf(state, item.b) || "").toLowerCase();
        const bioA = (state.people[item.a]?.profile?.one_liner || "").toLowerCase();
        const bioB = (state.people[item.b]?.profile?.one_liner || "").toLowerCase();
        const highl = (item.highlight || "").toLowerCase();
        return nameA.includes(q) || nameB.includes(q) || bioA.includes(q) || bioB.includes(q) || highl.includes(q);
      }
      return true;
    });
  }, [items, filterMode, searchQuery, state]);

  // Points for chemistry wave chart
  const wavePoints = useMemo(() => {
    const list = matches.slice(0, 6);
    if (!list.length) return [];
    return list.map((m, idx) => ({
      label: `D${idx + 1}`,
      score: m.avg,
      name: `${nameOf(state, m.a).split(" ")[0]} × ${nameOf(state, m.b).split(" ")[0]}`,
    }));
  }, [matches, state]);

  const totalMoots = matches.filter((m) => m.both).length;
  const avgCompat = matches.length
    ? Math.round(matches.reduce((acc, m) => acc + m.avg, 0) / matches.length)
    : 0;
  const topScore = matches.length ? Math.max(...matches.map((m) => m.avg)) : 0;

  return (
    <div className="rankings-container">
      {/* Top Header */}
      <div className="rankings-top-bar">
        <div>
          <div className="rankings-sticker-badge">✦ live agent leaderboard</div>
          <h2 className="rankings-title">cohort rankings</h2>
          <p className="muted" style={{ margin: "2px 0 0", fontSize: "14px" }}>
            multi-agent compatibility sorted by mutual chemistry & private post-date verdicts
          </p>
        </div>

        <div className="rankings-filter-pills">
          <button
            className={"filter-pill-btn " + (filterMode === "all" ? "active" : "")}
            onClick={() => setFilterMode("all")}
          >
            all pairs ✦
          </button>
          <button
            className={"filter-pill-btn " + (filterMode === "moots" ? "active" : "")}
            onClick={() => setFilterMode("moots")}
          >
            mutual moots only 💕
          </button>
          <button
            className={"filter-pill-btn " + (filterMode === "high" ? "active" : "")}
            onClick={() => setFilterMode("high")}
          >
            high spark (≥80%) 🔥
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid matching Image 1 */}
      <div className="rankings-layout-grid">
        {/* Left Column: Leaderboard Table */}
        <div className="rankings-main-col">
          <div className="card rankings-table-card">
            {/* Person selector filter */}
            <div className="rankings-table-toolbar">
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--ink)" }}>
                viewing cohort fits for:
              </span>
              <div style={{ maxWidth: "260px", flex: 1 }}>
                <select
                  value={selectedPerson}
                  onChange={(e) => setSelectedPerson(e.target.value)}
                  style={{ fontSize: "13.5px", padding: "6px 12px", minHeight: "38px" }}
                >
                  <option value="">all candidates (global cohort)</option>
                  {ids.map((id) => (
                    <option key={id} value={id}>
                      {nameOf(state, id)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="rankings-table-wrapper">
              <table className="rankings-table">
                <thead>
                  <tr>
                    <th style={{ width: "65px", textAlign: "center" }}>rank</th>
                    <th style={{ minWidth: "170px" }}>candidate</th>
                    <th style={{ minWidth: "115px", textAlign: "center" }}>direct match</th>
                    <th style={{ minWidth: "220px" }}>key moment & match meter</th>
                    <th style={{ width: "105px", textAlign: "right" }}>compatibility</th>
                    <th style={{ width: "95px", textAlign: "center" }}>date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it, idx) => {
                    const isTop1 = it.rank === 1;
                    const pA = state.people[it.a]?.profile;
                    const pB = state.people[it.b]?.profile;
                    const initialA = (nameOf(state, it.a) || "?")[0];
                    const initialB = (nameOf(state, it.b) || "?")[0];

                    return (
                      <tr
                        key={it.key || idx}
                        className={"rank-row " + (isTop1 ? "rank-row-top" : "")}
                      >
                        {/* Rank Badge */}
                        <td className="rank-cell" style={{ textAlign: "center" }}>
                          {it.rank === 1 ? (
                            <span className="rank-badge gold-crown" title="#1 Match 👑">
                              👑 1
                            </span>
                          ) : it.rank === 2 ? (
                            <span className="rank-badge silver-medal" title="#2 Match">
                              🥈 2
                            </span>
                          ) : it.rank === 3 ? (
                            <span className="rank-badge bronze-medal" title="#3 Match">
                              🥉 3
                            </span>
                          ) : (
                            <span className="rank-badge plain-rank">#{it.rank}</span>
                          )}
                        </td>

                        {/* Candidate A */}
                        <td className="candidate-cell">
                          <div className="candidate-box">
                            <div className="candidate-avatar">
                              {initialA}
                              <span className="status-dot-green" title="online active" />
                            </div>
                            <div className="candidate-meta">
                              <div className="candidate-name-row">
                                <span className="candidate-name">{nameOf(state, it.a)}</span>
                                <span className="verified-sparkle">✦</span>
                              </div>
                              <span className="candidate-one-liner">
                                {pA?.one_liner || "agent ready"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Direct Match: Dual Avatar Capsule */}
                        <td className="direct-match-cell" style={{ textAlign: "center" }}>
                          <div className="dual-avatar-capsule" title={`${nameOf(state, it.a)} × ${nameOf(state, it.b)}`}>
                            <span className="dual-avatar-chip">{initialA}</span>
                            <span className="dual-avatar-arrow">⇄</span>
                            <span className="dual-avatar-chip">{initialB}</span>
                          </div>
                          <span className="direct-match-subname">
                            {nameOf(state, it.b).split(" ")[0]}
                          </span>
                        </td>

                        {/* Key Moment & Progress Bar */}
                        <td className="moment-cell">
                          <div className="moment-quote-text">
                            "{it.highlight}"
                          </div>
                          <div className="moment-meter-row">
                            <div className="mini-meter-track">
                              <div
                                className="mini-meter-fill"
                                style={{ width: `${it.score}%` }}
                              />
                            </div>
                            <span className="mini-meter-pill">{it.score}%</span>
                          </div>
                        </td>

                        {/* Compatibility */}
                        <td className="compat-cell" style={{ textAlign: "right" }}>
                          <div className="compat-num">{it.score}%</div>
                          <div className="compat-tag">
                            {it.mutual ? (
                              <span className="badge-moot-glow">moot! ✦</span>
                            ) : (
                              <span className="badge-spark-soft">match</span>
                            )}
                          </div>
                        </td>

                        {/* Action: Open Date */}
                        <td className="action-cell" style={{ textAlign: "center" }}>
                          <button
                            className="btn neuro-btn-sm date-action-btn"
                            onClick={() => openDate(it.key)}
                          >
                            read ✦
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {!filtered.length ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "40px" }}>
                        <p className="muted">no rankings match this filter or search query.</p>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Analytics Sidebar matching Image 1 */}
        <div className="rankings-sidebar-col">
          <div className="card rankings-sidebar-card">
            {/* Search Input */}
            <div className="sidebar-search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="search moots..."
                className="sidebar-search-input"
              />
              {searchQuery ? (
                <button
                  className="sidebar-search-clear"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              ) : null}
            </div>

            {/* Top Moots Quick List */}
            <div className="sidebar-section">
              <div className="sidebar-section-header">
                <span className="sidebar-title">✦ top moots</span>
                <span className="sidebar-count">{matches.length} pairs</span>
              </div>
              <div className="sidebar-moots-list">
                {matches.slice(0, 3).map((m, idx) => (
                  <div
                    key={m.key}
                    className="sidebar-moot-row"
                    onClick={() => openDate(m.key)}
                  >
                    <span className="sidebar-moot-rank">#{idx + 1}</span>
                    <div className="sidebar-moot-names">
                      <b>{nameOf(state, m.a).split(" ")[0]} × {nameOf(state, m.b).split(" ")[0]}</b>
                      <small className="muted">{m.both ? "mutual spark 💕" : "dated"}</small>
                    </div>
                    <span className={"score " + (m.both ? "good" : "")}>
                      {m.avg}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chemistry Wave Chart */}
            <div className="sidebar-section">
              <ChemistryWaveChart points={wavePoints} />
            </div>

            {/* Cohort Stats */}
            <div className="sidebar-section">
              <span className="sidebar-title" style={{ display: "block", marginBottom: "8px" }}>
                ✦ cohort metrics
              </span>
              <div className="cohort-stats-grid">
                <div className="stat-pill-box">
                  <span className="stat-val">{totalMoots}</span>
                  <span className="stat-lbl">mutual moots</span>
                </div>
                <div className="stat-pill-box">
                  <span className="stat-val">{avgCompat}%</span>
                  <span className="stat-lbl">avg spark</span>
                </div>
                <div className="stat-pill-box">
                  <span className="stat-val">{topScore}%</span>
                  <span className="stat-lbl">top match</span>
                </div>
                <div className="stat-pill-box">
                  <span className="stat-val">{ids.length}</span>
                  <span className="stat-lbl">candidates</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpeedDatingPool({ state, openDate, onPickForDate }) {
  const ids = readyIds(state);
  const matches = useMemo(() => mutualMatches(state), [state]);
  const [filterMode, setFilterMode] = useState("all"); // "all", "moots", "high"
  const [selectedId, setSelectedId] = useState(null);

  // Pool coordinate math
  const size = 560;
  const center = size / 2;
  const radius = 205;
  const N = Math.max(1, ids.length);

  const nodeMap = useMemo(() => {
    const map = {};
    ids.forEach((id, index) => {
      const angle = (2 * Math.PI * index) / N - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      map[id] = { id, x, y, angle, index };
    });
    return map;
  }, [ids, N, center, radius]);

  // Filter matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (filterMode === "moots" && !m.both) return false;
      if (filterMode === "high" && m.avg < 80) return false;
      return true;
    });
  }, [matches, filterMode]);

  // Selected person dates
  const selectedDates = useMemo(() => {
    if (!selectedId) return [];
    return matches.filter((m) => m.a === selectedId || m.b === selectedId);
  }, [selectedId, matches]);

  // Which dialogue bubbles to render floating along cords
  const bubbleList = useMemo(() => {
    if (selectedId) {
      return selectedDates.slice(0, 4);
    }
    return filteredMatches.slice(0, 4);
  }, [selectedId, selectedDates, filteredMatches]);

  const selectedPerson = selectedId ? state.people[selectedId] : null;

  return (
    <div className="dating-pool-container">
      {/* Pool Header matching Image 2 */}
      <div className="pool-header-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div className="rankings-sticker-badge">✦ agentic speed dating pool</div>
            <h2 className="pool-title">the speed dating pool</h2>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: "14px" }}>
              interactive multi-agent constellation • click any candidate to spotlight their connections & secret quotes
            </p>
          </div>

          <div className="pool-mode-toggles">
            <button
              className={"pool-toggle-btn " + (filterMode === "all" ? "active" : "")}
              onClick={() => setFilterMode("all")}
            >
              all dates ✦
            </button>
            <button
              className={"pool-toggle-btn " + (filterMode === "moots" ? "active" : "")}
              onClick={() => setFilterMode("moots")}
            >
              mutual moots 💕
            </button>
            <button
              className={"pool-toggle-btn " + (filterMode === "high" ? "active" : "")}
              onClick={() => setFilterMode("high")}
            >
              high spark 🔥
            </button>
          </div>
        </div>

        {selectedId ? (
          <div className="pool-selected-banner">
            <span style={{ fontWeight: 700 }}>
              spotlighting <strong>{nameOf(state, selectedId)}</strong> ({selectedDates.length} blind dates)
            </span>
            <button className="btn neuro-btn-sm" onClick={() => setSelectedId(null)}>
              view entire pool ✦
            </button>
          </div>
        ) : (
          <div className="pool-hint-banner">
            <span>💡 tap any avatar in the ring below to spotlight their conversations & mutual chemistry!</span>
          </div>
        )}
      </div>

      {/* Circular Constellation Canvas */}
      <div className="pool-canvas-card">
        <div className="constellation-wrapper">
          <svg viewBox={`0 0 ${size} ${size}`} className="constellation-svg">
            <defs>
              <filter id="poolGlowPink" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor="#FF4FA3" floodOpacity="0.75" />
              </filter>
              <filter id="poolGlowViolet" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#8B5CF6" floodOpacity="0.65" />
              </filter>
              <filter id="bubbleDropShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#1B1426" floodOpacity="0.18" />
              </filter>
            </defs>

            {/* Background ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="var(--ink)"
              strokeOpacity="0.08"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Connection Cords */}
            {filteredMatches.map((m) => {
              const nodeA = nodeMap[m.a];
              const nodeB = nodeMap[m.b];
              if (!nodeA || !nodeB) return null;

              // Quadratic curve toward center
              const mx = (nodeA.x + nodeB.x) / 2;
              const my = (nodeA.y + nodeB.y) / 2;
              const cpx = mx + (center - mx) * 0.22;
              const cpy = my + (center - my) * 0.22;
              const dPath = `M ${nodeA.x} ${nodeA.y} Q ${cpx} ${cpy} ${nodeB.x} ${nodeB.y}`;

              const isConnectedToSelected = selectedId
                ? m.a === selectedId || m.b === selectedId
                : true;

              const strokeColor = m.both
                ? "#FF4FA3"
                : m.avg >= 80
                ? "#8B5CF6"
                : "#38BDF8";

              const strokeWidth = isConnectedToSelected
                ? (m.both ? 3.5 : 2.6)
                : 1.2;

              const opacity = selectedId
                ? (isConnectedToSelected ? 0.95 : 0.08)
                : (m.both ? 0.85 : 0.55);

              const filter = isConnectedToSelected
                ? (m.both ? "url(#poolGlowPink)" : m.avg >= 80 ? "url(#poolGlowViolet)" : undefined)
                : undefined;

              return (
                <path
                  key={m.key}
                  d={dPath}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity={opacity}
                  filter={filter}
                  style={{ cursor: "pointer", transition: "all 0.3s ease" }}
                  onClick={() => openDate(m.key)}
                />
              );
            })}

            {/* Floating Dialogue Speech Bubbles */}
            {bubbleList.map((m, idx) => {
              const nodeA = nodeMap[m.a];
              const nodeB = nodeMap[m.b];
              if (!nodeA || !nodeB) return null;

              const mx = (nodeA.x + nodeB.x) / 2;
              const my = (nodeA.y + nodeB.y) / 2;
              const cpx = mx + (center - mx) * 0.22;
              const cpy = my + (center - my) * 0.22;

              // Staggered offsets
              const offsets = [
                { dx: -25, dy: -30 },
                { dx: 32, dy: 18 },
                { dx: -38, dy: 28 },
                { dx: 24, dy: -36 },
              ];
              const off = offsets[idx % offsets.length];
              const bx = cpx + off.dx;
              const by = cpy + off.dy;

              const snippet = m.highlight
                ? (m.highlight.length > 34 ? m.highlight.slice(0, 32) + "..." : m.highlight)
                : "Do you like hiking? 😄";

              const label = `${nameOf(state, m.a).split(" ")[0]} × ${nameOf(state, m.b).split(" ")[0]}`;

              return (
                <g
                  key={`bubble-${m.key}`}
                  className="pool-bubble-group"
                  onClick={() => openDate(m.key)}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={bx - 78}
                    y={by - 24}
                    width="156"
                    height="48"
                    rx="14"
                    fill="#FFF9F2"
                    stroke={m.both ? "#FF4FA3" : "var(--ink)"}
                    strokeWidth={m.both ? "2" : "1.5"}
                    filter="url(#bubbleDropShadow)"
                  />
                  <text
                    x={bx}
                    y={by - 8}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="800"
                    fill={m.both ? "#FF4FA3" : "var(--ink-soft)"}
                  >
                    ✦ {label} · {m.avg}%
                  </text>
                  <text
                    x={bx}
                    y={by + 10}
                    textAnchor="middle"
                    fontSize="11"
                    fontStyle="italic"
                    fill="var(--ink)"
                  >
                    "{snippet}"
                  </text>
                </g>
              );
            })}

            {/* Perimeter Agent Nodes */}
            {ids.map((id) => {
              const node = nodeMap[id];
              if (!node) return null;
              const isSelected = selectedId === id;
              const initial = (nameOf(state, id) || "?")[0];
              const hasMoot = matches.some((m) => (m.a === id || m.b === id) && m.both);

              return (
                <g
                  key={id}
                  className="pool-node-element"
                  onClick={() => setSelectedId(isSelected ? null : id)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Selection / moot outer ring */}
                  {isSelected ? (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="29"
                      fill="none"
                      stroke="#FF4FA3"
                      strokeWidth="3.5"
                      filter="url(#poolGlowPink)"
                    />
                  ) : hasMoot ? (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="27"
                      fill="none"
                      stroke="#FFF3B0"
                      strokeWidth="2.5"
                    />
                  ) : null}

                  {/* Node Avatar Circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="23"
                    fill={isSelected ? "#FFD6E8" : "#FFF9F2"}
                    stroke="var(--ink)"
                    strokeWidth="2"
                  />
                  <text
                    x={node.x}
                    y={node.y + 7}
                    textAnchor="middle"
                    fontSize="16"
                    fontWeight="800"
                    fill="var(--ink)"
                  >
                    {initial}
                  </text>

                  {/* Active / Moot Pill at bottom */}
                  <rect
                    x={node.x - 23}
                    y={node.y + 16}
                    width="46"
                    height="16"
                    rx="8"
                    fill={hasMoot ? "#FF4FA3" : "#10B981"}
                  />
                  <text
                    x={node.x}
                    y={node.y + 28}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="800"
                    fill="#FFFFFF"
                  >
                    {hasMoot ? "moot 💕" : "active ✦"}
                  </text>

                  {/* First Name text */}
                  <text
                    x={node.x}
                    y={node.y + 44}
                    textAnchor="middle"
                    fontSize="12.5"
                    fontWeight="800"
                    fill="var(--ink)"
                  >
                    {nameOf(state, id).split(" ")[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Spotlight Info Drawer below circle */}
        {selectedPerson ? (
          <div className="pool-spotlight-drawer">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="avatar" style={{ width: "42px", height: "48px", fontSize: "20px" }}>
                  {(selectedPerson.profile?.name || "?")[0]}
                </div>
                <div>
                  <h4 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>
                    {selectedPerson.profile?.name}
                  </h4>
                  <small className="muted">{selectedPerson.profile?.location || "candidate"} · {selectedDates.length} speed dates completed</small>
                </div>
              </div>
              <button
                className="btn neuro-btn-sm"
                onClick={() => setSelectedId(null)}
              >
                clear spotlight ✕
              </button>
            </div>

            <div className="spotlight-dates-grid">
              {selectedDates.map((m) => {
                const otherId = m.a === selectedId ? m.b : m.a;
                return (
                  <div key={m.key} className="spotlight-date-chip">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <b>with {nameOf(state, otherId).split(" ")[0]}</b>
                      <span className={"score " + (m.both ? "good" : "")}>
                        {m.avg}%
                      </span>
                    </div>
                    {m.highlight ? (
                      <p style={{ fontSize: "13px", fontStyle: "italic", margin: "4px 0 8px" }}>
                        "{m.highlight}"
                      </p>
                    ) : null}
                    <button
                      className="link"
                      style={{ fontSize: "12.5px" }}
                      onClick={() => openDate(m.key)}
                    >
                      read date transcript ✦
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MatchesPanel({ state, openDate }) {
  const list = useMemo(() => mutualMatches(state), [state]);
  const mutuals = list.filter((m) => m.both);
  const displayList = mutuals.length ? mutuals : list;

  return (
    <div>
      <div style={{ marginBottom: "18px" }}>
        <h3 style={{ fontSize: "30px", fontWeight: 800 }}>moots (mutual sparks ✦)</h3>
        <p className="muted">when both agents agreed: "would hang again ✦"</p>
      </div>

      <div className="matches-grid">
        {displayList.slice(0, 12).map((m) => (
          <div className="match-celebration-card" key={m.key}>
            <div className="dual-avatar-bridge">
              <div className="avatar" style={{ width: "56px", height: "66px", fontSize: "30px" }}>
                {(nameOf(state, m.a) || "?")[0]}
              </div>
              <div className="heart-bridge-icon">✦</div>
              <div className="avatar" style={{ width: "56px", height: "66px", fontSize: "30px" }}>
                {(nameOf(state, m.b) || "?")[0]}
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "26px", fontWeight: 800, color: "var(--ink)" }}>
                {nameOf(state, m.a)} × {nameOf(state, m.b)}
              </h3>
              <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "6px" }}>
                <span className={"score " + (m.both ? "good" : "")}>
                  {m.both ? "✦ " : ""}{m.avg}% chemistry
                </span>
                {m.both ? <span className="badge ok">moots!</span> : null}
              </div>
            </div>

            <div className="chemistry-meter-bar">
              <i style={{ width: `${m.avg}%` }} />
            </div>

            {m.highlight ? (
              <p style={{ fontSize: "14.5px", margin: "10px 0", fontStyle: "italic", lineHeight: "1.6" }}>
                "{m.highlight}"
              </p>
            ) : null}

            <button
              className="btn"
              style={{ width: "100%", marginTop: "12px" }}
              onClick={() => openDate(m.key)}
            >
              read their date transcript
            </button>
          </div>
        ))}

        {!list.length ? (
          <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "50px" }}>
            <p className="muted">no moots yet. run the pipeline to start the talking stage!</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Views({ state, tab, setTab, onLive, onManual, liveBusy, focus, setFocus }) {
  const ids = state.order || [];
  const openDate = (k) => {
    setFocus(k);
    setTab("dates");
  };

  const handlePickForDate = (id) => {
    setTab("dates");
    setFocus(null);
  };

  const tabs = [
    ["pool", "dating pool ✦", ids.length],
    ["rankings", "leaderboard ✦", ids.length],
    ["matches", "moots", mutualMatches(state).length],
    ["dates", "the dates", Object.keys(state.dates || {}).length],
    ["profiles", "the people", ids.length],
  ];

  return (
    <div>
      <div className="tabs">
        {tabs.map(([k, label, count]) => (
          <button
            key={k}
            className={tab === k ? "active" : ""}
            onClick={() => setTab(k)}
          >
            <span>{label}</span>
            {count !== undefined && count > 0 ? (
              <span style={{ marginLeft: "6px", fontSize: "13px", opacity: 0.9 }}>
                ({count})
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "pool" ? (
        <SpeedDatingPool
          state={state}
          openDate={openDate}
          onPickForDate={handlePickForDate}
        />
      ) : null}

      {tab === "rankings" ? (
        <RankingsLeaderboard
          state={state}
          openDate={openDate}
        />
      ) : null}

      {tab === "profiles" ? (
        <div className="grid2">
          {ids.map((id) => (
            <ProfileCard
              key={id}
              person={state.people[id]}
              onManual={onManual}
              onPickForDate={handlePickForDate}
            />
          ))}
        </div>
      ) : null}

      {tab === "dates" ? (
        <DatesPanel
          state={state}
          onLive={onLive}
          liveBusy={liveBusy}
          focus={focus}
          setFocus={setFocus}
        />
      ) : null}

      {tab === "matches" ? (
        <MatchesPanel
          state={state}
          openDate={openDate}
        />
      ) : null}
    </div>
  );
}

export default Views;
