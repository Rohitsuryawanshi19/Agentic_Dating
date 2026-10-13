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

function RankingsPanel({ state, openDate }) {
  const ids = readyIds(state);
  const ranks = useMemo(() => buildRankings(state), [state]);
  const [sel, setSel] = useState("");
  const shown = sel ? [sel] : ids;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
        <h3 style={{ fontSize: "28px", fontWeight: 800 }}>your top picks</h3>
        <div style={{ minWidth: "220px" }}>
          <select value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="">everyone</option>
            {ids.map((id) => (
              <option key={id} value={id}>{nameOf(state, id)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid2">
        {shown.map((id) => (
          <div className="card" key={id}>
            <h3 style={{ fontSize: "26px", fontWeight: 800 }}>{nameOf(state, id)}'s best fits</h3>
            {(ranks[id] || []).slice(0, 5).map((r, i) => (
              <div className="rank" key={r.id}>
                <div className="rhead">
                  <b style={{ fontSize: "18px", fontWeight: 800 }}>#{i + 1} {nameOf(state, r.id)}</b>
                  <span className={"score " + (r.mutual ? "good" : "")}>
                    {r.mutual ? "✦ " : ""}{r.score}%
                  </span>
                  {r.mutual ? <span className="badge ok">moot!</span> : null}
                </div>
                {r.dated ? (
                  <div className="bars" style={{ margin: "8px 0" }}>
                    <small className="muted">{nameOf(state, id).split(" ")[0]}'s rating: {r.mine}%</small>
                    <div className="bar"><i style={{ width: r.mine + "%" }} /></div>
                  </div>
                ) : null}
                <p style={{ fontSize: "15px", margin: "6px 0", lineHeight: "1.6" }}>{r.reason}</p>
                {r.concerns?.[0] ? <small className="muted" style={{ display: "block" }}>red flags 🚩: {r.concerns[0]}</small> : null}
                {r.dated ? (
                  <div style={{ marginTop: "6px" }}>
                    <button className="link" onClick={() => openDate(pairKey(id, r.id))}>
                      read their date
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
            {!(ranks[id] || []).length ? <p className="muted">no rankings yet.</p> : null}
          </div>
        ))}
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
    ["profiles", "the people", ids.length],
    ["dates", "the dates", Object.keys(state.dates || {}).length],
    ["rankings", "your top picks", ids.length],
    ["matches", "moots", mutualMatches(state).length],
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

      {tab === "rankings" ? (
        <RankingsPanel
          state={state}
          openDate={openDate}
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
