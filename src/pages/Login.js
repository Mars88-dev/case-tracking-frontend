import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(
        "https://case-tracking-backend.onrender.com/api/auth/login", // Corrected endpoint to match your original
        form
      );
      const { token } = res.data;
      localStorage.setItem("token", token);
      navigate("/"); // Navigate to dashboard
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h1 style={styles.title}>🔐 Welcome to Case Tracker</h1>

        {error && <div style={styles.error}>{error}</div>}

        <input
          placeholder="Email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          style={styles.input}
          required
        />
        <input
          placeholder="Password"
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          style={styles.input}
          required
        />
        <button type="submit" style={styles.button}>🚀 Login</button>
      </form>
    </div>
  );
};

const styles = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f5f5f5, #e0e0e0)", // Subtle animated background base
    padding: "0 16px",
    animation: "gradientShift 10s ease infinite", // Smooth animation
    backgroundSize: "200% 200%"
  },
  form: {
    background: COLORS.background,
    padding: 30,
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    boxShadow: "inset 6px 6px 12px #c8c9cc, inset -6px -6px 12px #ffffff", // Neumorphism inset
    transition: "box-shadow 0.3s ease"
  },
  title: {
    textAlign: "center",
    marginBottom: 25,
    color: COLORS.primary,
    fontSize: 24
  },
  error: {
    color: "red",
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "500",
    background: "#ffebee",
    padding: 8,
    borderRadius: 8
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 20,
    border: "none",
    borderRadius: 12,
    background: COLORS.background,
    boxShadow: "inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff", // Neumorphism
    fontSize: 14,
    transition: "box-shadow 0.3s ease",
    ":focus": {
      boxShadow: "inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86" // Gold glow on focus
    }
  },
  button: {
    width: "100%",
    padding: 12,
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
    color: COLORS.white,
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    cursor: "pointer",
    boxShadow: "6px 6px 12px #c8c9cc, -6px -6px 12px #ffffff", // Neumorphism raised
    transition: "box-shadow 0.3s ease, transform 0.3s ease",
    ":hover": {
      boxShadow: "inset 6px 6px 12px #0f203b, inset -6px -6px 12px #1a3865", // Pressed effect
      transform: "translateY(2px)"
    }
  }
};

// Add this to your global CSS or a <style> tag if needed for the animation
const keyframes = `
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
`;
// If you want to inject this animation globally, add it in index.js or App.js

export default Login;