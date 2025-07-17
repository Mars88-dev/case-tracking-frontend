// src/components/Login.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const BASE_URL = "https://case-tracking-backend.onrender.com";
const COLORS = {
  primary: "#142a4f",
  accent: "#d2ac68",
  background: "#f5f5f5",
  white: "#ffff",
  gray: "#f9fafb",
  border: "#cbd5e1",
  gold: "#d2ac68",
  blue: "#142a4f"
};

export default function Login() {
  const [email, setEmail] = useState(""); // Changed to email to match backend
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, { email, password }); // Fixed endpoint and data to match backend
      localStorage.setItem("token", res.data.token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.animatedBackground}></div>
      <div style={styles.formCard}>
        <h1 style={styles.title}>Welcome Back</h1>
        <p style={styles.subtitle}>Login to access your case dashboard</p>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email" // Changed to email type for better UX
            placeholder="Email" // Changed placeholder to Email
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.button}>Login</button>
        </form>
        <p style={styles.linkText}>
          <Link to="/forgot-password" style={styles.link}>Forgot Password?</Link>
        </p>
        <p style={styles.linkText}>
          New here? <Link to="/register" style={styles.link}>Register</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    position: "relative",
    overflow: "hidden",
    fontFamily: "Arial, sans-serif"
  },
  animatedBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 50%, ${COLORS.primary} 100%)`,
    opacity: 0.1,
    animation: "gradientMove 15s ease infinite",
    backgroundSize: "200% 200%"
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 40,
    maxWidth: 400,
    width: "100%",
    boxShadow: '6px 6px 12px #c8c9cc, -6px -6px 12px #ffffff', // Neumorphic card
    zIndex: 1,
    textAlign: "center"
  },
  title: {
    color: COLORS.primary,
    fontSize: 28,
    marginBottom: 8
  },
  subtitle: {
    color: COLORS.primary,
    fontSize: 16,
    marginBottom: 24,
    opacity: 0.8
  },
  error: {
    color: "#e53e3e",
    marginBottom: 16
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16
  },
  input: {
    padding: 12,
    border: "none",
    borderRadius: 12,
    background: COLORS.background,
    boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff', // Inset neumorphic
    fontSize: 16,
    transition: 'box-shadow 0.3s ease',
    ':focus': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86' } // Gold focus glow
  },
  button: {
    padding: "12px",
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.primary})`,
    color: COLORS.white,
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    cursor: "pointer",
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    ':hover': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86', transform: 'translateY(2px)' } // Press effect
  },
  linkText: {
    marginTop: 16,
    color: COLORS.primary,
    fontSize: 14
  },
  link: {
    color: COLORS.accent,
    textDecoration: "none",
    fontWeight: "bold"
  }
};

// Add this to your global CSS or inline (for animation)
const keyframes = `@keyframes gradientMove {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}`;
document.head.insertAdjacentHTML("beforeend", `<style>${keyframes}</style>`);