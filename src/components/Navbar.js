// src/components/Navbar.js
import React from "react";
import { Link, useNavigate } from "react-router-dom";

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

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>Gerhard Barnard Inc.</div>
      <div style={styles.links}>
        <Link to="/" style={styles.link}>Dashboard</Link>
        {token && <Link to="/mytransactions" style={styles.link}>My Transactions</Link>}
        {token && <Link to="/calculator" style={styles.link}>Calculator</Link>}
        {token ? (
          <button onClick={handleLogout} style={styles.button}>Logout</button>
        ) : (
          <>
            <Link to="/login" style={styles.link}>Login</Link>
            <Link to="/register" style={styles.button}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 20px",
    background: 'linear-gradient(135deg, #f5f5f5, #e0e0e0)', // Light futuristic gradient for neumorphism
    color: COLORS.primary,
    boxShadow: '6px 6px 12px #c8c9cc, -6px -6px 12px #ffffff', // Neumorphic bar
    borderRadius: '0 0 16px 16px', // Rounded bottom for depth
    marginBottom: 16
  },
  logo: { 
    fontSize: 20, 
    fontWeight: "bold",
    color: COLORS.primary
  },
  links: { 
    display: "flex", 
    gap: 15, 
    alignItems: "center" 
  },
  link: { 
    color: COLORS.primary, 
    textDecoration: "none", 
    fontSize: 14,
    padding: '6px 12px',
    borderRadius: 8,
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff', // Neumorphic link
    ':hover': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86', transform: 'translateY(2px)' } // Gold press effect
  },
  button: {
    padding: "6px 12px",
    background: COLORS.accent,
    color: COLORS.primary,
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    textDecoration: "none",
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff', // Neumorphic button
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    ':hover': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86', transform: 'translateY(2px)' } // Gold press effect
  }
};