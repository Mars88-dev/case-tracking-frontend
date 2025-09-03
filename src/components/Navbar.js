// src/components/Navbar.js
import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { THEMES, getTheme, setTheme, toggleTheme, onThemeChange, offThemeChange } from "../theme/theme";

export default function Navbar() {
  const [mode, setMode] = useState(getTheme());
  const [isAuthed, setIsAuthed] = useState(!!localStorage.getItem("token"));
  const location = useLocation();

  useEffect(() => {
    const handler = (e) => setMode((e.detail?.mode) || getTheme());
    onThemeChange(handler);
    return () => offThemeChange(handler);
  }, []);

  // Update auth state on route change (and first mount)
  useEffect(() => {
    setIsAuthed(!!localStorage.getItem("token"));
  }, [location]);

  return (
    <header className="navbar">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src="/logo.png" alt="Logo" style={{ height: 40, borderRadius: 8 }} />
        <strong style={{ color: "var(--color-primary)" }}>Conveyancing Portal</strong>
      </div>

      {isAuthed && (
        <nav className="links">
          <NavLink
            to="/dashboard"
            aria-current={location.pathname === "/" || location.pathname === "/dashboard" ? "page" : undefined}
          >
            Dashboard
          </NavLink>
          <NavLink to="/my-transactions">My Transactions</NavLink>
          <NavLink to="/calculator">Cost Calculator</NavLink>
        </nav>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* New Transaction button (only when logged in) */}
        {isAuthed && (
          <NavLink
            to="/case/new"
            className="neumo-button"
            title="Create a new transaction"
            aria-label="Create a new transaction"
          >
            ➕ New Transaction
          </NavLink>
        )}

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

        {isAuthed ? (
          <NavLink to="/logout" className="neumo-button" title="Log out">
            Logout
          </NavLink>
        ) : (
          <NavLink to="/login" className="neumo-button" title="Log in">
            Login
          </NavLink>
        )}
      </div>
    </header>
  );
}