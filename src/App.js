// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import MyTransactions from "./components/MyTransactions";
import BondTransferCalculator from "./pages/BondTransferCalculator";
import CaseDetail from "./components/CaseDetail";
import WeeklyReport from "./components/WeeklyReport";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Messages from "./pages/Messages";
import ProtectedRoute from "./components/ProtectedRoute";

function Logout() {
  React.useEffect(() => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {}
  }, []);

  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/logout" element={<Logout />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-transactions"
          element={
            <ProtectedRoute>
              <MyTransactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mytransactions"
          element={
            <ProtectedRoute>
              <MyTransactions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/calculator"
          element={
            <ProtectedRoute>
              <BondTransferCalculator />
            </ProtectedRoute>
          }
        />

        <Route
          path="/case/:id"
          element={
            <ProtectedRoute>
              <CaseDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report/:id"
          element={
            <ProtectedRoute>
              <WeeklyReport />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
