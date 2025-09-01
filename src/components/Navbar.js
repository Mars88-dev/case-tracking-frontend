// src/components/Navbar.js
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { THEMES, getTheme, setTheme, initTheme, onThemeChange, offThemeChange } from "../theme/theme";
import "../styles/neumorphism.css";

export default function Navbar() {
  const [mode, setMode] = useState(getTheme());
  const token = localStorage.getItem("token");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    initTheme(); // ensure the <html data-theme> is applied on first mount
    const handler = (e) => setMode(e.detail?.mode || getTheme());
    onThemeChange(handler);
    return () => offThemeChange(handler);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const isDark = mode === THEMES.DARK;

  return (
    <nav className="navbar">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src="/logo.png" alt="logo" style={{ height: 36 }} />
        <span style={{ fontWeight: 800, color: "var(--color-primary)" }}>Gerhard Barnard Inc.</span>
      </div>

      <div className="links">
        {token && (
          <>
            <Link to="/dashboard" aria-current={location.pathname === "/dashboard" ? "page" : undefined}>Dashboard</Link>
            <Link to="/my-transactions" aria-current={location.pathname === "/my-transactions" ? "page" : undefined}>My Transactions</Link>
            <Link to="/calculator" aria-current={location.pathname === "/calculator" ? "page" : undefined}>Calculator</Link>
          </>
        )}
        {!token && (
          <>
            <Link to="/login" aria-current={location.pathname === "/login" ? "page" : undefined}>Login</Link>
            <Link to="/register" aria-current={location.pathname === "/register" ? "page" : undefined}>Register</Link>
          </>
        )}

        {token && (
          <button className="neumo-button" onClick={logout}>Logout</button>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>{isDark ? "Dark" : "Light"}</span>
          <input
            type="checkbox"
            checked={isDark}
            onChange={() => setTheme(isDark ? THEMES.LIGHT : THEMES.DARK)}
          />
        </label>
      </div>
    </nav>
  );
}
