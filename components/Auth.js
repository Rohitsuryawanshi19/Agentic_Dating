"use client";
import { useState } from "react";
import { Logo } from "./Logo";

const USERS_KEY = "moots-registered-accounts";
const SESSION_KEY = "moots-current-user";

export function Auth({ onLogin }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function getAccounts() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function handleSignUp(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("please enter your name");
      return;
    }
    if (!email.trim()) {
      setError("please enter your email or username");
      return;
    }
    if (!password || password.length < 4) {
      setError("password must be at least 4 characters");
      return;
    }

    const accounts = getAccounts();
    const existing = accounts.find(
      (a) => a.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (existing) {
      setError("an account with this email/username already exists. please sign in!");
      return;
    }

    const newUser = {
      id: "user-" + Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      handle: handle.trim() || ("@" + name.trim().toLowerCase().replace(/\s+/g, "")),
      createdAt: new Date().toISOString(),
    };

    const updated = [...accounts, { ...newUser, password }];
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(updated));
      localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    } catch {}

    setSuccess("account created! welcoming you in ✦");
    setTimeout(() => {
      onLogin(newUser);
    }, 400);
  }

  function handleSignIn(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("please enter your email or username");
      return;
    }
    if (!password) {
      setError("please enter your password");
      return;
    }

    const accounts = getAccounts();
    const found = accounts.find(
      (a) =>
        a.email.toLowerCase() === email.trim().toLowerCase() &&
        a.password === password
    );

    if (found) {
      const sessionUser = {
        id: found.id,
        name: found.name,
        email: found.email,
        handle: found.handle,
      };
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      } catch {}
      setSuccess("welcome back! logging you in ✦");
      setTimeout(() => {
        onLogin(sessionUser);
      }, 400);
    } else {
      // If no account exists yet, let's allow a friendly prompt or create demo user
      if (accounts.length === 0 && email.toLowerCase() === "admin") {
        const demoUser = {
          id: "admin-1",
          name: "Rohit",
          email: "admin",
          handle: "@rohit",
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(demoUser));
        onLogin(demoUser);
        return;
      }
      setError("incorrect email or password. try again or create an account!");
    }
  }

  function handleQuickGuest() {
    const guestUser = {
      id: "guest-" + Date.now(),
      name: "Rohit Suryawanshi",
      email: "rohit@moots.app",
      handle: "@rohittt_19.05",
      isGuest: true,
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(guestUser));
    } catch {}
    onLogin(guestUser);
  }

  return (
    <div className="auth-viewport-wrapper">
      <div className="auth-card">
        {/* Scrapbook Tape */}
        <div className="auth-tape" />

        {/* Logo Header */}
        <div className="auth-header">
          <Logo />
          <p className="auth-tagline">the talking stage is in session ✦</p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            className={"auth-tab " + (mode === "signin" ? "active" : "")}
            onClick={() => {
              setMode("signin");
              setError("");
              setSuccess("");
            }}
          >
            <span>sign in</span>
          </button>
          <button
            type="button"
            className={"auth-tab " + (mode === "signup" ? "active" : "")}
            onClick={() => {
              setMode("signup");
              setError("");
              setSuccess("");
            }}
          >
            <span>create account</span>
          </button>
        </div>

        {/* Alert Feedback */}
        {error ? <div className="auth-alert error">⚠️ {error}</div> : null}
        {success ? <div className="auth-alert success">✦ {success}</div> : null}

        {/* Form Body */}
        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="auth-form">
            <div className="auth-field">
              <label>email or username</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your email or username"
                autoCapitalize="none"
                required
              />
            </div>

            <div className="auth-field">
              <label>password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="btn auth-submit-btn">
              sign in to moots ✦
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="auth-form">
            <div className="auth-field">
              <label>your full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rohit Suryawanshi"
                required
              />
            </div>

            <div className="auth-field">
              <label>email or username</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rohit@gmail.com"
                autoCapitalize="none"
                required
              />
            </div>

            <div className="auth-field">
              <label>instagram handle (optional)</label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@yourhandle"
                autoCapitalize="none"
              />
            </div>

            <div className="auth-field">
              <label>create password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="minimum 4 characters"
                required
              />
            </div>

            <button type="submit" className="btn auth-submit-btn">
              create account & start ✦
            </button>
          </form>
        )}

        {/* Divider & Guest Access */}
        <div className="auth-divider">
          <span>or explore instantly</span>
        </div>

        <button
          type="button"
          onClick={handleQuickGuest}
          className="btn ghost auth-guest-btn"
        >
          <span>continue with 1-click preview ⚡</span>
        </button>

        <p className="auth-footer-note">
          ai agents date on your behalf. your credentials stay completely local & secure on your device.
        </p>
      </div>
    </div>
  );
}
