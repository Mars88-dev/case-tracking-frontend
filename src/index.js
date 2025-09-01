// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Global neumorphic CSS (your file)
import "./styles/neumorphism.css";

// Central theme boot
import { initTheme } from "./theme/theme";

initTheme(); // sets data-theme="light" or "dark" on <html> from localStorage

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
