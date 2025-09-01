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
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Dashboard – support both "/" and "/dashboard" */}
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

        {/* My Transactions – support both "/my-transactions" and legacy "/mytransactions" */}
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

        {/* Calculator */}
        <Route
          path="/calculator"
          element={
            <ProtectedRoute>
              <BondTransferCalculator />
            </ProtectedRoute>
          }
        />

        {/* Case detail + weekly report */}
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

        {/* Unknown -> login (keeps your current behavior) */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
