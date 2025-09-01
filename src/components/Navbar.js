// src/components/Navbar.js
import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { THEMES, getTheme, setTheme, toggleTheme, onThemeChange, offThemeChange } from "../theme/theme";

export default function Navbar() {
  const [mode, setMode] = useState(getTheme());
  const location = useLocation();

  useEffect(() => {
    const handler = (e) => setMode((e.detail?.mode) || getTheme());
    onThemeChange(handler);
    return () => offThemeChange(handler);
  }, []);

  return (
    <header className="navbar">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src="/logo.png" alt="Logo" style={{ height: 40, borderRadius: 8 }} />
        <strong style={{ color: "var(--color-primary)" }}>Conveyancing Portal</strong>
      </div>

      <nav className="links">
        <NavLink to="/dashboard" aria-current={location.pathname === "/" || location.pathname === "/dashboard" ? "page" : undefined}>Dashboard</NavLink>
        <NavLink to="/my-transactions">My Transactions</NavLink>
        <NavLink to="/calculator">Cost Calculator</NavLink>
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          className="neumo-button"
          onClick={() => {
            toggleTheme();
            // setMode happens via themechange event; do this for instant visual feedback too
            setMode(getTheme() === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT);
          }}
          aria-pressed={mode === THEMES.DARK}
          title="Toggle theme"
        >
          {mode === THEMES.DARK ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>
    </header>
  );
}
