// src/components/Navbar.js
import React, { useCallback, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import axios from "axios";
import {
  THEMES,
  getTheme,
  toggleTheme,
  onThemeChange,
  offThemeChange,
} from "../theme/theme";

const BASE_URL = "https://case-tracking-backend.onrender.com";

export default function Navbar() {
  const [mode, setMode] = useState(getTheme());
  const [isAuthed, setIsAuthed] = useState(!!localStorage.getItem("token"));
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  const fetchUnreadCount = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUnreadCount(0);
      return;
    }

    try {
      const res = await axios.get(`${BASE_URL}/api/personal-messages/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(Number(res.data?.unreadCount || 0));
    } catch (err) {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    const handler = (e) => setMode(e.detail?.mode || getTheme());
    onThemeChange(handler);
    return () => offThemeChange(handler);
  }, []);

  useEffect(() => {
    const authed = !!localStorage.getItem("token");
    setIsAuthed(authed);

    if (!authed) {
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();
  }, [location, fetchUnreadCount]);

  useEffect(() => {
    if (!isAuthed) return undefined;

    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [isAuthed, fetchUnreadCount]);

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
            aria-current={
              location.pathname === "/" || location.pathname === "/dashboard"
                ? "page"
                : undefined
            }
          >
            Dashboard
          </NavLink>

          <NavLink to="/messages">
            <span style={styles.linkWithBadge}>
              Messages
              {unreadCount > 0 && (
                <span className="badge" style={styles.badge}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
          </NavLink>

          <NavLink to="/my-transactions">My Transactions</NavLink>
          <NavLink to="/calculator">Cost Calculator</NavLink>
        </nav>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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

const styles = {
  linkWithBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    minWidth: 20,
    height: 20,
    padding: "0 6px",
    fontWeight: 800,
    lineHeight: "20px",
  },
};
