"use client";
import { useEffect, useRef, useState } from "react";
import { Views } from "../components/Views";
import { Logo } from "../components/Logo";
import { Auth } from "../components/Auth";
import { parseEntries, pool, post } from "../lib/client";
import { pairKey, readyIds } from "../lib/rank";
import { PRESETS, getPresetText } from "../lib/presets";

const KEY = "agentic-dating-v1";
const EMPTY = { people: {}, order: [], shortlist: null, dates: {} };
const TOP_K = 4;

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [text, setText] = useState("");
  const [state, setState] = useState(EMPTY);
  const [log, setLog] = useState([]);
  const [stage, setStage] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [liveBusy, setLiveBusy] = useState(false);
  const [tab, setTab] = useState("profiles");
  const [focus, setFocus] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState("");
  const ref = useRef(EMPTY);

  useEffect(() => {
    try {
      const sessionUser = JSON.parse(
        localStorage.getItem("moots-current-user") || "null"
      );
      if (sessionUser) {
        setCurrentUser(sessionUser);
      }
    } catch {}
    setAuthLoading(false);

    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (saved?.people) {
        ref.current = saved;
        setState(saved);
      }
      const savedText = localStorage.getItem(KEY + "-text") || "";
      if (savedText) {
        setText(savedText);
      } else {
        const initialPreset = getPresetText("verified-25");
        setText(initialPreset);
        setSelectedPreset("verified-25");
      }
    } catch {}
  }, []);

  function handleSignOut() {
    try {
      localStorage.removeItem("moots-current-user");
    } catch {}
    setCurrentUser(null);
  }

  const update = (fn) => {
    ref.current = fn(ref.current);
    setState(ref.current);
    try {
      localStorage.setItem(KEY, JSON.stringify(ref.current));
    } catch {}
  };

  const setPerson = (id, patch) =>
    update((s) => ({
      ...s,
      people: { ...s.people, [id]: { ...s.people[id], ...patch } },
    }));

  const setDate = (key, d) =>
    update((s) => ({ ...s, dates: { ...s.dates, [key]: d } }));

  const say = (m) =>
    setLog((l) => [...l.slice(-60), `${new Date().toLocaleTimeString()}  ${m}`]);

  const name = (id) => ref.current.people[id]?.profile?.name || id;
  const pack = (id) => ({ id, name: name(id), profile: ref.current.people[id].profile });

  async function analyze(id, raw) {
    setPerson(id, { status: "analyzing" });
    const { profile } = await post("/api/analyze", { raw });
    setPerson(id, { profile, status: "ready", error: null });
    return profile;
  }

  async function manual(id, pasted) {
    try {
      const raw = { linkedin: null, instagram: null, pasted };
      setPerson(id, { raw });
      await analyze(id, raw);
      say(`synthesized ${id} from pasted text.`);
    } catch (e) {
      setPerson(id, { status: "error", error: e.message });
    }
  }

  function handleLoadPreset(presetId) {
    const presetText = getPresetText(presetId);
    setText(presetText);
    setSelectedPreset(presetId);
    try {
      localStorage.setItem(KEY + "-text", presetText);
    } catch {}
  }

  function handleClear() {
    setText("");
    setSelectedPreset("");
    try {
      localStorage.removeItem(KEY + "-text");
    } catch {}
  }

  async function handlePasteClipboard() {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) {
        setText(clip);
        setSelectedPreset("");
      }
    } catch {
      alert("clipboard access blocked. please paste directly into the box.");
    }
  }

  async function run() {
    const entries = parseEntries(text);
    if (entries.length < 3) {
      alert("paste at least 3 people to start dating!");
      return;
    }
    try {
      localStorage.setItem(KEY + "-text", text);
    } catch {}

    setRunning(true);
    setLog([]);
    update((s) => {
      const people = { ...s.people };
      for (const e of entries) {
        people[e.id] = {
          ...(people[e.id] || {}),
          id: e.id,
          linkedin: e.linkedin,
          instagram: e.instagram,
          status: people[e.id]?.status || "queued",
        };
      }
      return { ...s, people, order: entries.map((e) => e.id) };
    });
    setTab("profiles");

    // 1. Scrape with concurrency 2 to strictly respect Apify's 5-concurrent actor limit
    setActiveStep(1);
    setStage("reading public footprints on linkedin + ig ✦");
    await pool(entries, 2, async (e) => {
      const p = ref.current.people[e.id];
      if (p.raw || p.profile) return;
      setPerson(e.id, { status: "scraping" });
      try {
        const raw = await post("/api/scrape", { linkedin: e.linkedin, instagram: e.instagram });
        setPerson(e.id, { raw, status: "scraped", error: null });
        say(`scraped ${e.id} ✦`);
      } catch (err) {
        say(`fallback activated for ${e.id}: ${err.message}`);
        const fallbackRaw = {
          linkedin: { name: e.id, headline: "Professional & Creator" },
          pasted: `Public footprint for ${e.id}: LinkedIn (${e.linkedin || ""}), Instagram (${e.instagram || ""})`,
        };
        setPerson(e.id, { raw: fallbackRaw, status: "scraped", error: null });
      }
    });

    // 2. Analyze
    setActiveStep(2);
    setStage("building agent personas rn ✦");
    await pool(entries, 2, async (e) => {
      const p = ref.current.people[e.id];
      if (p.profile || !p.raw) return;
      try {
        const prof = await analyze(e.id, p.raw);
        say(`persona ready: ${prof.name}`);
      } catch (err) {
        say(`retrying persona for ${e.id}...`);
        try {
          const prof = await analyze(e.id, {
            pasted: `Public profile for ${e.id}. Professional, thinker, and creator with genuine interests.`,
          });
          say(`persona ready: ${prof.name}`);
        } catch (e2) {
          setPerson(e.id, { status: "error", error: e2.message });
          say(`analysis failed for ${e.id}: ${e2.message}`);
        }
      }
    });

    const ids = readyIds(ref.current);
    if (ids.length < 3) {
      setStage("need at least 3 profiles ready to date");
      setRunning(false);
      return;
    }

    // 3. Shortlist
    setActiveStep(3);
    const sKey = [...ids].sort().join(",");
    if (ref.current.shortlist?.key !== sKey) {
      setStage("the talking stage is in session: matchmaker is shortlisting");
      try {
        const { matches } = await post("/api/shortlist", {
          people: ids.map((id) => ({ id, profile: ref.current.people[id].profile })),
          k: TOP_K,
        });
        const scores = {};
        for (const [id, list] of Object.entries(matches)) {
          scores[id] = {};
          for (const m of list) scores[id][m.id] = { score: m.score, reason: m.reason };
        }
        update((s) => ({ ...s, shortlist: { key: sKey, matches, scores } }));
        say("shortlist ready ✦");
      } catch (err) {
        say("shortlist failed: " + err.message);
        setStage("shortlist failed. click to retry.");
        setRunning(false);
        return;
      }
    }

    // 4. Dates
    setActiveStep(4);
    const pairs = new Set();
    for (const [id, list] of Object.entries(ref.current.shortlist.matches)) {
      for (const m of list) pairs.add(pairKey(id, m.id));
    }
    const todo = [...pairs].filter((k) => !ref.current.dates[k]?.verdicts);
    let done = 0;
    setStage(`your agent is on a date rn (0/${todo.length})`);
    setTab("dates");

    await pool(todo, 3, async (key) => {
      const [a, b] = key.split("|");
      try {
        const r = await post("/api/date", { a: pack(a), b: pack(b) });
        setDate(key, {
          a,
          b,
          mode: "fast",
          turns: r.turns.map((t) => ({ who: t.speaker === "A" ? a : b, text: t.text })),
          verdicts: { [a]: r.verdict_a, [b]: r.verdict_b },
          highlight: r.highlight,
        });
        say(`date done: ${name(a)} × ${name(b)} (${r.verdict_a.score}% / ${r.verdict_b.score}%)`);
      } catch (err) {
        say(`date failed between ${name(a)} × ${name(b)}: ${err.message}`);
      }
      done++;
      setStage(`your agent is on a date rn (${done}/${todo.length})`);
      setFocus((f) => f || key);
    });

    setActiveStep(5);
    setStage("done! check your moots & top picks below ✦");
    setRunning(false);
    setTab("matches");
  }

  async function liveDate(x, y) {
    const [a, b] = [x, y].sort();
    const key = pairKey(a, b);
    setLiveBusy(true);
    const mk = (id) => ({ name: name(id), profile: ref.current.people[id].profile });
    const intro = (id) => `${name(id)}: ${ref.current.people[id].profile.one_liner || ""}`;
    let turns = [];
    setDate(key, { a, b, mode: "live", running: true, turns: [], verdicts: {} });

    try {
      for (let i = 0; i < 8; i++) {
        const who = i % 2 === 0 ? a : b;
        const other = who === a ? b : a;
        const { text } = await post("/api/turn", {
          me: mk(who),
          other: { name: name(other), intro: intro(other) },
          transcript: turns.map((t) => ({ name: name(t.who), text: t.text })),
          first: i === 0,
        });
        turns = [...turns, { who, text }];
        setDate(key, { a, b, mode: "live", running: true, turns, verdicts: {} });
      }

      const tr = turns.map((t) => ({ name: name(t.who), text: t.text }));
      const [va, vb] = await Promise.all([
        post("/api/verdict", { me: mk(a), other: { name: name(b) }, transcript: tr }),
        post("/api/verdict", { me: mk(b), other: { name: name(a) }, transcript: tr }),
      ]);
      setDate(key, {
        a,
        b,
        mode: "live",
        running: false,
        turns,
        verdicts: { [a]: va.verdict, [b]: vb.verdict },
        highlight: "live date: every turn unfolded in real time.",
      });
    } catch (err) {
      say("live date interrupted: " + err.message);
      setDate(key, {
        a,
        b,
        mode: "live",
        running: false,
        turns,
        verdicts: {},
        highlight: "date interrupted: " + err.message,
      });
    }
    setLiveBusy(false);
  }

  function exportJson() {
    const slim = {
      ...ref.current,
      people: Object.fromEntries(
        Object.entries(ref.current.people).map(([k, v]) => [
          k,
          {
            id: v.id,
            linkedin: v.linkedin,
            instagram: v.instagram,
            status: v.status,
            profile: v.profile,
          },
        ])
      ),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(slim, null, 1)], { type: "application/json" })
    );
    Object.assign(document.createElement("a"), {
      href: url,
      download: "demo.json",
    }).click();
  }

  function reset() {
    if (!confirm("clear all records from this browser?")) return;
    ref.current = EMPTY;
    setState(EMPTY);
    setLog([]);
    setStage("");
    setActiveStep(0);
    setFocus(null);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }

  const count = parseEntries(text).length;
  const profilesReady = readyIds(state).length;

  if (authLoading) {
    return (
      <div className="auth-loading-splash">
        <div className="splash-spinner-box">
          <div className="beacon-dot" style={{ width: "18px", height: "18px" }} />
          <span>loading moots ✦</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth onLogin={(user) => setCurrentUser(user)} />;
  }

  return (
    <main className="app-container">
      {/* Header */}
      <header className="site-header">
        <Logo />
        <div className="header-actions-group">
          <div className="user-profile-badge">
            <span className="user-avatar-dot">
              {currentUser.name?.[0]?.toUpperCase() || "✦"}
            </span>
            <span className="user-name-text">
              {currentUser.name?.toLowerCase() || "friend"}
            </span>
            <button
              type="button"
              className="btn-signout"
              onClick={handleSignOut}
              title="sign out"
            >
              sign out
            </button>
          </div>
          <div className="header-status">
            <span className="beacon-dot" />
            <span>your agent is on a date rn</span>
            <a
              className="btn ghost header-demo-link"
              href="/demo"
              style={{ marginLeft: "8px", padding: "6px 14px", fontSize: "13px" }}
            >
              view demo
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-card">
        <div className="hero-badge">✦ the talking stage is in session</div>
        <h2 className="hero-title">
          ai agents date for you.<br />
          <em>you get the moots.</em>
        </h2>
        <p className="hero-subtitle">
          first dates are exhausting. paste a linkedin and public instagram per person.
          our agents go on 8-turn blind dates, judge mutual chemistry, and tell you who to actually meet.
        </p>

        <div className="hero-features">
          <div className="feature-pill">✦ public socials</div>
          <div className="feature-pill">✦ genuine personas</div>
          <div className="feature-pill">✦ 8-turn blind dates</div>
          <div className="feature-pill">✦ calibrated chemistry</div>
        </div>
      </section>

      {/* Wide Landscape Input Section */}
      <section className="card">
        <div className="landscape-input-grid">
          {/* Left Column */}
          <div className="input-sidebar">
            <div>
              <h3 style={{ fontSize: "28px", fontWeight: 800 }}>paste your people</h3>
              <p className="muted" style={{ marginTop: "4px" }}>
                one person per line: linkedin link, then public instagram handle or url.
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button className="btn ghost neuro-btn-sm" onClick={handlePasteClipboard} title="paste">
                clipboard
              </button>
              <button className="btn ghost neuro-btn-sm" onClick={handleClear} title="clear">
                clear
              </button>
            </div>

            <div className="presets-bar" style={{ marginTop: "6px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)", width: "100%", display: "block" }}>
                curated groups:
              </span>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={"preset-chip " + (selectedPreset === p.id ? "active" : "")}
                  onClick={() => handleLoadPreset(p.id)}
                >
                  <span>{p.icon}</span>
                  <span>{p.name.toLowerCase()}</span>
                </button>
              ))}
            </div>

            <div className="actions" style={{ marginTop: "auto" }}>
              <button
                className="btn"
                style={{ width: "100%" }}
                onClick={run}
                disabled={running || count < 3}
              >
                {running ? "agents are dating rn..." : `start the talking stage (${count}) ✦`}
              </button>

              <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                <a className="btn ghost" href="/demo" style={{ flex: 1, textAlign: "center" }}>
                  pre-run demo
                </a>
                {profilesReady > 0 ? (
                  <button className="btn ghost" onClick={exportJson} style={{ flex: 1 }}>
                    export
                  </button>
                ) : null}
                <button className="btn ghost" onClick={reset} disabled={running}>
                  reset
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="input-main">
            <div className="neuro-textarea-wrapper">
              <textarea
                rows={8}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setSelectedPreset("");
                }}
                placeholder={
                  "https://www.linkedin.com/in/someone  https://www.instagram.com/someone\nhttps://www.linkedin.com/in/another  @another"
                }
              />
              <div className="textarea-footer">
                <span>minimum 3 people needed</span>
                <span style={{ fontWeight: 800, color: count >= 3 ? "var(--hot-pink)" : "inherit" }}>
                  {count >= 3 ? `ready (${count} people) ✦` : `need ${3 - count} more`}
                </span>
              </div>
            </div>

            {/* Stepper */}
            {running || activeStep > 0 ? (
              <div className="pipeline-stepper">
                <div className={"step-card " + (activeStep === 1 ? "active" : activeStep > 1 ? "done" : "")}>
                  <div className="step-icon">1</div>
                  <div className="step-info">
                    <b>reading socials</b>
                    <small>{activeStep > 1 ? "done" : activeStep === 1 ? "scraping rn" : "queued"}</small>
                  </div>
                </div>

                <div className={"step-card " + (activeStep === 2 ? "active" : activeStep > 2 ? "done" : "")}>
                  <div className="step-icon">2</div>
                  <div className="step-info">
                    <b>agent personas</b>
                    <small>{activeStep > 2 ? "done" : activeStep === 2 ? "synthesizing" : "queued"}</small>
                  </div>
                </div>

                <div className={"step-card " + (activeStep === 3 ? "active" : activeStep > 3 ? "done" : "")}>
                  <div className="step-icon">3</div>
                  <div className="step-info">
                    <b>matchmaker</b>
                    <small>{activeStep > 3 ? "done" : activeStep === 3 ? "ranking pairs" : "queued"}</small>
                  </div>
                </div>

                <div className={"step-card " + (activeStep === 4 ? "active" : activeStep === 5 ? "done" : "")}>
                  <div className="step-icon">4</div>
                  <div className="step-info">
                    <b>blind dates</b>
                    <small>{activeStep === 5 ? "done ✦" : activeStep === 4 ? "dating rn" : "queued"}</small>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Status ticker */}
            {stage ? (
              <div className="stage">
                <span>✦</span>
                <span>{stage}</span>
              </div>
            ) : null}

            {/* Log */}
            {log.length ? (
              <pre className="log">{log.join("\n")}</pre>
            ) : null}
          </div>
        </div>
      </section>

      {/* Main Views */}
      {state.order.length ? (
        <Views
          state={state}
          tab={tab}
          setTab={setTab}
          onLive={liveDate}
          onManual={manual}
          liveBusy={liveBusy}
          focus={focus}
          setFocus={setFocus}
        />
      ) : null}
    </main>
  );
}
