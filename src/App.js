// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import MyTransactions from "./components/MyTransactions";
import BondTransferCalculator from "./pages/BondTransferCalculator";
import CaseDetail from "./components/CaseDetail";
import WeeklyReport from "./components/WeeklyReport";
import ReportCentre from "./components/ReportCentre";
import PortalCentre from "./components/PortalCentre";
import PublicPortalView from "./components/PublicPortalView";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Messages from "./pages/Messages";
import InhouseAgents from "./pages/InhouseAgents";
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

function PortalFrame({ children }) {
  const location = useLocation();
  const isPublicRoute = ["/login", "/register", "/logout"].includes(location.pathname) || location.pathname.startsWith("/portal/");

  return (
    <>
      <Navbar />
      <main className={isPublicRoute ? "gba-public-shell" : "gba-main-shell"}>
        {children}
      </main>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <PortalFrame>
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
            path="/inhouse-agents"
            element={
              <ProtectedRoute>
                <InhouseAgents />
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
            path="/report-centre"
            element={
              <ProtectedRoute>
                <ReportCentre />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportCentre />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal-centre"
            element={
              <ProtectedRoute>
                <PortalCentre />
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal-links"
            element={
              <ProtectedRoute>
                <PortalCentre />
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

          <Route path="/portal/:token" element={<PublicPortalView />} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </PortalFrame>
    </BrowserRouter>
  );
}

export default App;
