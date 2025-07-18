// src/components/Dashboard.js
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaComments, FaSearch } from "react-icons/fa"; // Added FaSearch for search bar icon
import MessageBox from "./MessageBox";

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

const TRANSFER_ITEMS = [
  "sellerFicaDocuments",
  "purchaserFicaDocuments",
  "titleDeed",
  "bondCancellationFigures",
  "municipalClearanceFigures",
  "transferDutyReceipt",
  "guaranteesFromBondAttorneys",
  "transferCost",
  "electricalComplianceCertificate",
  "municipalClearanceCertificate",
  "levyClearanceCertificate",
  "hoaCertificate"
];

const columns = [
  { key: "reference", label: "Reference" },
  { key: "date", label: "Date" },
  { key: "instructionReceived", label: "Instruction Received" },
  { key: "parties", label: "Parties" },
  { key: "agency", label: "Agency" },
  { key: "agent", label: "Agent" },
  { key: "purchasePrice", label: "Purchase Price" },
  { key: "property", label: "Property" },
  { key: "depositAmount", label: "Deposit Amount" },
  { key: "depositDueDate", label: "Deposit Due" },
  { key: "depositFulfilledDate", label: "Deposit Fulfilled" },
  { key: "bondAmount", label: "Bond Amount" },
  { key: "bondDueDate", label: "Bond Due" },
  { key: "bondFulfilledDate", label: "Bond Fulfilled" },
  ...TRANSFER_ITEMS.flatMap((item) => [
    {
      key: `${item}Requested`,
      label: (item === "electricalComplianceCertificate" ? "COC " : "") + item.replace(/([A-Z])/g, " $1").toUpperCase() + " - REQUESTED"
    },
    {
      key: `${item}Received`,
      label: (item === "electricalComplianceCertificate" ? "COC " : "") + item.replace(/([A-Z])/g, " $1").toUpperCase() + " - RECEIVED"
    }
  ]),
  { key: "transferSignedSellerDate", label: "Transfer Signed - Seller" },
  { key: "transferSignedPurchaserDate", label: "Transfer Signed - Purchaser" },
  { key: "documentsLodgedDate", label: "Docs Lodged" },
  { key: "deedsPrepDate", label: "Deeds Prep" },
  { key: "registrationDate", label: "Registration" },
  { key: "comments", label: "Comments" }
];

export default function Dashboard() {
  const [casesByUser, setCasesByUser] = useState({});
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortAZ] = useState(true); // Unused, but kept for compatibility
  const [filterType, setFilterType] = useState("none");
  const [colorPickIndex, setColorPickIndex] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [messageCounts, setMessageCounts] = useState({});
  const [activeOnly, setActiveOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState(""); // New state for search bar
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const fetchCases = useCallback(() => {
    if (!token) return;
    axios.get(`${BASE_URL}/api/cases`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(async (res) => {
      const userRes = await axios.get(`${BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentUser(userRes.data);

      let data = res.data;
      data = [...data].sort((a, b) => a.reference.localeCompare(b.reference));

      // Apply search filter (case-insensitive on key fields)
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        data = data.filter(c => 
          (c.reference?.toLowerCase().includes(lowerQuery) ||
           c.parties?.toLowerCase().includes(lowerQuery) ||
           c.property?.toLowerCase().includes(lowerQuery) ||
           c.agent?.toLowerCase().includes(lowerQuery))
        );
      }

      if (filterType === "bond") data = data.filter(c => !c.bondAmount);
      else if (filterType === "deposit") data = data.filter(c => !c.depositAmount);
      else if (filterType === "transfer") data = data.filter(c => !c.transferCostReceived);

      if (filterType === "active") {
        data = data.filter(c => c.isActive !== false);
      } else if (filterType === "inactive") {
        data = data.filter(c => c.isActive === false);
      }      

      const grouped = data.reduce((acc, c) => {
        const user = c.createdBy?.username || "Unknown User";
        acc[user] = acc[user] || [];
        acc[user].push(c);
        return acc;
      }, {});
      setCasesByUser(grouped);

      const messagePromises = data.map(c =>
        axios.get(`${BASE_URL}/api/cases/${c._id}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => ({ id: c._id, count: res.data.filter(m => !m.readBy?.includes(userRes.data._id)).length })).catch(() => ({ id: c._id, count: 0 }))
      );
      const counts = await Promise.all(messagePromises);
      const countsMap = counts.reduce((acc, cur) => {
        acc[cur.id] = cur.count;
        return acc;
      }, {});
      setMessageCounts(countsMap);

    }).catch(console.error);
  }, [filterType, token, activeOnly, searchQuery]); // Added searchQuery to dependencies for real-time filtering

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const toggleActive = async (caseId, currentStatus) => {
    try {
      await axios.put(`${BASE_URL}/api/cases/${caseId}/toggle-active`, { isActive: !currentStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCases();
    } catch (err) {
      console.error("Failed to toggle active status:", err);
    }
  };

  const handleOpenMessages = (id) => {
    setSelectedCaseId(id);
    setMessageCounts(prev => ({ ...prev, [id]: 0 }));
  };

  const handleCloseMessages = () => setSelectedCaseId(null);

  const daysSince = (inputDate) => {
    if (!inputDate) return "—";
    const date = new Date(inputDate);
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : "—";
  };

  const formatDate = (val) => {
    if (!val) return "—";
    const date = new Date(val);
    return !isNaN(date) ? date.toLocaleDateString("en-GB") : val;
  };

  const handleColorChange = async (caseId, color) => {
    try {
      const { data: existingCase } = await axios.get(`${BASE_URL}/api/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updatedColors = { ...existingCase.colors, daysSinceInstruction: color };
      await axios.put(`${BASE_URL}/api/cases/${caseId}`, { ...existingCase, colors: updatedColors }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCases();
    } catch (err) {
      console.error("Failed to update color:", err);
    }
  };

  const renderSection = (title, fields, data) => (
    <>
      <div style={{ gridColumn: "1 / -1", margin: "10px 0 4px", borderBottom: `2px solid ${COLORS.gold}`, paddingBottom: 4, fontWeight: "bold", fontSize: 14, color: COLORS.gold, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>{title}</div>
      {fields.map(({ key, label }) => (
        <div key={key} style={key === "comments" ? { gridColumn: "1 / -1" } : {}}>
          <div style={{ background: COLORS.primary, color: COLORS.white, padding: "6px 10px", borderRadius: 8, fontWeight: "bold", boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff' }}>{label}</div>
          <div style={{ border: `1px solid ${COLORS.border}`, padding: "6px 10px", borderRadius: 8, backgroundColor: data.colors?.[key] || COLORS.white, boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff', transition: 'box-shadow 0.3s ease' }}>{formatDate(data[key])}</div>
        </div>
      ))}
    </>
  );

  return (
    <div style={styles.container}>
      <div style={styles.animatedBackground}></div>
      <div style={styles.dashboardCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
          <img src="/logo.png" alt="Logo" style={{ height: 90, boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff', borderRadius: 8 }} />
          <div style={{ textAlign: "center", flex: 1 }}>
            <h1 style={styles.title}>Dashboard</h1>
            <p style={styles.subtitle}>Track and manage your cases with precision</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setFilterType("none")} style={styles.button}>All</button>
            <button onClick={() => setFilterType("bond")} style={styles.button}>No Bond Amount</button>
            <button onClick={() => setFilterType("deposit")} style={styles.button}>No Deposit Amount</button>
            <button onClick={() => setFilterType("transfer")} style={styles.button}>No Transfer Cost</button>
            <button
              onClick={() => window.print()}
              style={{ ...styles.button, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.primary})` }}
            >
              🖨️ Print
            </button>
            <button
              onClick={() => setFilterType(filterType === "active" ? "inactive" : "active")}
              style={styles.button}
            >
              {filterType === "inactive" ? "🟢 Show Active" : "🔴 Show Inactive"}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={styles.searchContainer}>
          <FaSearch style={{ position: "absolute", left: 16, top: 14, color: COLORS.primary, fontSize: 18 }} />
          <input
            type="text"
            placeholder="Search by reference, parties, property, or agent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {Object.entries(casesByUser).map(([user, cases]) => (
          <section key={user} style={{ marginBottom: 32, boxShadow: '6px 6px 12px #c8c9cc, -6px -6px 12px #ffffff', borderRadius: 16, padding: 20, background: COLORS.white }}>
            <h2 style={styles.sectionTitle}>{user}</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff', borderRadius: 12 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40, background: COLORS.primary, color: COLORS.white, padding: "12px 8px", borderTopLeftRadius: 12 }}>Days</th>
                    {"reference agent parties property".split(" ").map(key => (
                      <th key={key} style={{ padding: "12px 8px", background: COLORS.primary, color: COLORS.white, borderBottom: `2px solid ${COLORS.border}`, textAlign: "left" }}>{columns.find(c => c.key === key)?.label}</th>
                    ))}
                    <th style={{ padding: "12px 8px", background: COLORS.primary, color: COLORS.white, borderTopRightRadius: 12 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c, i) => (
                    <React.Fragment key={c._id}>
                      <tr style={{ background: i % 2 === 0 ? COLORS.white : COLORS.gray, borderBottom: `2px solid ${COLORS.border}`, transition: 'background 0.3s ease' }}>
                        <td
                          onClick={() => setColorPickIndex(colorPickIndex === c._id ? null : c._id)}
                          style={{ cursor: "pointer", padding: "6px 4px", backgroundColor: c.colors?.daysSinceInstruction || COLORS.primary, color: COLORS.white, fontWeight: "bold", fontSize: "11px", textAlign: "center", fontFamily: "monospace", letterSpacing: "1px", borderRadius: 4, boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff' }}>
                          {daysSince(c.instructionReceived)}
                        </td>
                        {["reference", "agent", "parties", "property"].map(key => (
                          <td key={key} style={{ padding: "10px 8px", backgroundColor: c.colors?.[key] || "inherit", wordBreak: "break-word", transition: 'box-shadow 0.3s ease' }}>{c[key] || "—"}</td>
                        ))}
                        <td style={{ padding: "10px 8px" }}>
                          <div style={{ display: "flex", gap: 6, position: "relative", flexWrap: "wrap" }}>
                            <button onClick={() => navigate(`/case/${c._id}`)} style={styles.actionButton}>Edit</button>
                            <button onClick={() => navigate(`/report/${c._id}`)} style={styles.actionButton}>Report</button>
                            <div style={{ position: "relative" }}>
                              <button onClick={() => handleOpenMessages(c._id)} style={styles.actionButton}><FaComments /></button>
                              {messageCounts[c._id] > 0 && (
                                <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", backgroundColor: "red", color: "white", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{messageCounts[c._id]}</span>
                              )}
                            </div>
                            <button onClick={() => setExpandedRow(expandedRow === c._id ? null : c._id)} style={styles.actionButton}>{expandedRow === c._id ? "Hide" : "View More"}</button>
                            <button
                              onClick={() => toggleActive(c._id, c.isActive)}
                              style={{
                                ...styles.actionButton,
                                background: c.isActive === false ? "#e53e3e" : "#38a169",
                                color: "#fff"
                              }}
                            >
                              {c.isActive === false ? "Pending" : "Active"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {colorPickIndex === c._id && (
                        <tr>
                          <td colSpan={6}><div style={{ padding: 10, display: "flex", alignItems: "center", gap: 10, background: COLORS.gray, boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff', borderRadius: 8 }}>
                            <label style={{ color: COLORS.primary, fontWeight: "bold" }}>Pick a highlight color:</label>
                            <input type="color" onChange={e => handleColorChange(c._id, e.target.value)} value={c.colors?.daysSinceInstruction || "#ffffff"} style={{ border: "none", cursor: "pointer" }} />
                            <button onClick={() => handleColorChange(c._id, "")} style={styles.actionButton}>Reset</button>
                            <button onClick={() => setColorPickIndex(null)} style={styles.actionButton}>Close</button>
                          </div></td>
                        </tr>
                      )}
                      {expandedRow === c._id && (
                        <tr style={{ background: COLORS.gray }}>
                          <td colSpan={6} style={{ padding: 16 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, animation: 'fadeIn 0.5s ease' }}>
                              {renderSection("Information", columns.filter(col => ["reference", "instructionReceived", "date", "parties", "agency", "agent", "purchasePrice", "property"].includes(col.key)), c)}
                              {renderSection("Financials", columns.filter(col => ["depositAmount", "bondAmount", "depositDueDate", "depositFulfilledDate", "bondDueDate", "bondFulfilledDate"].includes(col.key)), c)}
                              {renderSection("TRANSFER PROCESS - REQUESTED", columns.filter(col => col.key.includes("Requested")), c)}
                              {renderSection("TRANSFER PROCESS - RECEIVED", columns.filter(col => col.key.includes("Received") && col.key !== "instructionReceived"), c)}
                              {renderSection("Transfer Signed", columns.filter(col => col.key.includes("transferSigned")), c)}
                              {renderSection("Deeds Office", columns.filter(col => col.key.includes("documentsLodgedDate") || col.key.includes("deedsPrepDate") || col.key.includes("registrationDate")), c)}
                              {renderSection("Comments", columns.filter(col => col.key === "comments"), c)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {selectedCaseId && currentUser && (
          <MessageBox
            caseId={selectedCaseId}
            onClose={handleCloseMessages}
            currentUser={currentUser}
            refreshMessages={fetchCases}
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: COLORS.background,
    position: "relative",
    overflow: "hidden",
    fontFamily: "Arial, sans-serif",
    padding: "20px 0" // Adjusted padding for full-width feel
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
  dashboardCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 40,
    width: "100%", // Full width for no cropping
    maxWidth: "none", // Removed maxWidth to stretch fully
    boxShadow: '6px 6px 12px #c8c9cc, -6px -6px 12px #ffffff', // Neumorphic card
    zIndex: 1,
    animation: 'fadeIn 0.5s ease' // Subtle fade-in
  },
  title: {
    color: COLORS.primary,
    fontSize: 32,
    marginBottom: 8,
    textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
  },
  subtitle: {
    color: COLORS.primary,
    fontSize: 16,
    marginBottom: 24,
    opacity: 0.8
  },
  searchContainer: {
    position: "relative",
    marginBottom: 24,
    width: "100%",
    maxWidth: 600,
    margin: "0 auto"
  },
  searchInput: {
    width: "100%",
    padding: "12px 12px 12px 40px", // Space for icon
    border: "none",
    borderRadius: 12,
    background: COLORS.background,
    boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff', // Inset neumorphic
    fontSize: 16,
    transition: 'box-shadow 0.3s ease',
    ':focus': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86' } // Gold focus glow
  },
  sectionTitle: {
    color: COLORS.primary,
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.gold})`,
    padding: "10px 20px",
    borderRadius: 8,
    marginBottom: 12,
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff',
    textAlign: "center"
  },
  button: {
    padding: "8px 12px",
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
    color: COLORS.white,
    border: "none",
    borderRadius: 12,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    ':hover': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86', transform: 'translateY(2px)' }
  },
  actionButton: {
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
    color: COLORS.white,
    border: "none",
    padding: "6px 10px",
    borderRadius: 12,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    ':hover': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86', transform: 'translateY(2px)' }
  }
};

// Add this to your global CSS or inline (for animation)
const keyframes = `@keyframes gradientMove {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}`;
document.head.insertAdjacentHTML("beforeend", `<style>${keyframes}</style>`);