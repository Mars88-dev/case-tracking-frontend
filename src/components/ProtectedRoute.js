// src/components/ProtectedRoute.js
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";

const BASE_URL = "https://case-tracking-backend.onrender.com";

function persistCurrentUser(user) {
  try {
    if (user && typeof user === "object") {
      localStorage.setItem("user", JSON.stringify(user));
      window.dispatchEvent(new CustomEvent("auth:user-updated", { detail: { user } }));
    }
  } catch {}
}

function clearCurrentSession() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth:user-cleared"));
  } catch {}
}

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("auth:user-cleared"));
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        persistCurrentUser(res.data);
        setIsAuthenticated(true);
      } catch (err) {
        console.error("Token check failed:", {
          status: err?.response?.status,
          data: err?.response?.data,
          message: err?.message,
        });
        clearCurrentSession();
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, []);

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
