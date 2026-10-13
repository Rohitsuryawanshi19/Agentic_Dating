"use client";
import { useEffect, useState } from "react";
import { Views } from "../../components/Views";
import { Logo } from "../../components/Logo";

export default function Demo() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("matches"); // Default to "moots"
  const [focus, setFocus] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/demo.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("demo.json not found"))))
      .then((d) => {
        if (!d.order?.length) {
          throw new Error("demo.json is empty. run the pipeline, click export demo.json, and put it in /public.");
        }
        setState(d);
      })
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <main className="app-container">
      <header className="site-header">
        <Logo />
        <div className="header-status">
          <span className="beacon-dot" />
          <span>pre-run demo cohort</span>
          <a className="btn ghost" href="/" style={{ marginLeft: "8px", padding: "6px 14px", fontSize: "13px" }}>
            try your people ✦
          </a>
        </div>
      </header>

      <section className="hero-card">
        <div className="hero-badge">✦ showcase exhibition</div>
        <h2 className="hero-title">
          a completed cycle with real people.<br />
          <em>nothing to type.</em>
        </h2>
        <p className="hero-subtitle">
          explore genuine personas, read unfiltered 8-turn blind dates, and see how our dual-perspective scoring uncovers mutual moots.
        </p>
      </section>

      {err ? (
        <div className="card" style={{ color: "var(--hot-pink)" }}>
          <b>{err}</b>
        </div>
      ) : null}

      {state ? (
        <Views
          state={state}
          tab={tab}
          setTab={setTab}
          focus={focus}
          setFocus={setFocus}
        />
      ) : !err ? (
        <div className="card" style={{ textAlign: "center", padding: "50px" }}>
          <p className="muted">loading demo moots ✦</p>
        </div>
      ) : null}
    </main>
  );
}
