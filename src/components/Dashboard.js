// src/components/Dashboard.js
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaComments, FaSearch } from "react-icons/fa"; // Added FaSearch for search bar icon
import MessageBox from "./MessageBox";

const BASE_URL = "https://case-tracking-backend.onrender.com";

const LIGHT_COLORS = {
  primary: "#142a4f",
  accent: "#d2ac68",
  background: "#f5f5f5",
  card: "#ffffff",
  gray: "#f9fafb",
  border: "#cbd5e1",
  gold: "#d2ac68",
  blue: "#142a4f",
  text: "#000000",
  subtleText: "#666666",
  headerText: "#ffffff", // Added for white text on dark headers in light mode
};

const DARK_COLORS = {
  primary: "#d2ac68", // Gold for accents/buttons
  accent: "#142a4f", // Blue subtle highlights
  background: "#000000", // Black like calculator
  card: "#1c1c1c", // Dark gray for cards/tables
  gray: "#333333",
  border: "#4a4a4a",
  gold: "#d2ac68",
  blue: "#142a4f",
  text: "#ffffff", // White for info/readability
  subtleText: "#bbbbbb",
  headerText: "#ffffff", // Consistent white for headers
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
  const [sortAZ, setSortAZ] = useState(true); // Fixed: Added setter for completeness (unused)
  const [filterType, setFilterType] = useState("none");
  const [colorPickIndex, setColorPickIndex] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [messageCounts, setMessageCounts] = useState({});
  const [activeOnly, setActiveOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState(""); // State for search bar
  const [darkMode, setDarkMode] = useState(false); // Dark mode state
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const colors = darkMode ? DARK_COLORS : LIGHT_COLORS;

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
      <div style={{ gridColumn: "1 / -1", margin: "10px 0 4px", borderBottom: `2px solid ${colors.gold}`, paddingBottom: 4, fontWeight: "bold", fontSize: 14, color: colors.gold, boxShadow: darkMode ? 'inset 0 2px 4px rgba(0,0,0,0.5)' : 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>{title}</div>
      {fields.map(({ key, label }) => (
        <div key={key} style={key === "comments" ? { gridColumn: "1 / -1" } : {}}>
          <div style={{ background: colors.primary, color: colors.headerText, padding: "6px 10px", borderRadius: 8, fontWeight: "bold", boxShadow: darkMode ? '-3px -3px 6px rgba(0,0,0,0.2), 3px 3px 6px rgba(255,255,255,0.05)' : '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff' }}>{label}</div>
          <div style={{ border: `1px solid ${colors.border}`, padding: "6px 10px", borderRadius: 8, backgroundColor: data.colors?.[key] || colors.card, boxShadow: darkMode ? 'inset -3px -3px 6px rgba(0,0,0,0.2), inset 3px 3px 6px rgba(255,255,255,0.05)' : 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff', transition: 'box-shadow 0.3s ease', color: colors.text }}>{formatDate(data[key])}</div>
        </div>
      ))}
    </>
  );

  return (
    <div style={{ ...styles.container, backgroundColor: colors.background }}>
      <div style={{ ...styles.animatedBackground, background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 50%, ${colors.primary} 100%)` }}></div>
      <div style={{ ...styles.dashboardCard, backgroundColor: colors.card, boxShadow: darkMode ? '-6px -6px 12px rgba(0,0,0,0.5), 6px 6px 12px rgba(255,255,255,0.05)' : '6px 6px 12px #c8c9cc, -6px -6px 12px #ffffff' }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: "16px" }}>
          <img src="/logo.png" alt="Logo" style={{ height: 160, maxWidth: "50%", objectFit: "contain", boxShadow: darkMode ? '0 4px 8px rgba(0,0,0,0.5)' : '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff', borderRadius: 8 }} />
          <div style={{ textAlign: "left", flex: "1 1 200px", marginLeft: "16px" }}>
            <h1 style={{ ...styles.title, color: colors.primary }}>Dashboard</h1>
            <p style={{ ...styles.subtitle, color: colors.subtleText }}>Track and manage your cases with precision</p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", flex: "1 1 300px", justifyContent: "flex-end" }}>
            {/* Search Bar integrated into header */}
            <div style={{ ...styles.searchContainer, position: "relative", width: "auto", minWidth: "250px", margin: 0 }}>
              <FaSearch style={{ position: "absolute", left: 16, top: 14, color: colors.primary, fontSize: 18 }} />
              <input
                type="text"
                placeholder="Search by reference, parties, property, or agent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ ...styles.searchInput, background: colors.card, boxShadow: darkMode ? 'inset -3px -3px 6px rgba(0,0,0,0.2), inset 3px 3px 6px rgba(255,255,255,0.05)' : 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff', color: colors.text, width: "100%", maxWidth: "300px" }}
              />
            </div>
            <div style={styles.toggleContainer}>
              <span style={{ color: colors.text, marginRight: "10px", fontSize: 14 }}>Dark Mode</span>
              <label style={styles.toggleSwitch}>
                <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
                <span style={styles.toggleSlider}></span>
              </label>
            </div>
            <button onClick={() => setFilterType("none")} style={{ ...styles.button, background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: colors.headerText }}>All</button>
            <button onClick={() => setFilterType("bond")} style={{ ...styles.button, background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: colors.headerText }}>No Bond Amount</button>
            <button onClick={() => setFilterType("deposit")} style={{ ...styles.button, background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: colors.headerText }}>No Deposit Amount</button>
            <button onClick={() => setFilterType("transfer")} style={{ ...styles.button, background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: colors.headerText }}>No Transfer Cost</button>
            <button
              onClick={() => window.print()}
              style={{ ...styles.button, background: `linear-gradient(135deg, ${colors.accent}, ${colors.primary})`, color: colors.headerText }}
            >
              🖨️ Print
            </button>
            <button
              onClick={() => setFilterType(filterType === "active" ? "inactive" : "active")}
              style={{ ...styles.button, background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: colors.headerText }}
            >
              {filterType === "inactive" ? "🟢 Show Active" : "🔴 Show Inactive"}
            </button>
          </div>
        </div>

        {Object.entries(casesByUser).map(([user, cases]) => (
          <section key={user} style={{ marginBottom: 32, boxShadow: darkMode ? '-6px -6px 12px rgba(0,0,0,0.5), 6px 6px 12px rgba(255,255,255,0.05)' : '6px 6px 12px #c8c9cc, -6px -6px 12px #ffffff', borderRadius: 16, padding: 20, background: colors.card }}>
            <h2 style={{ ...styles.sectionTitle, color: colors.text, background: `linear-gradient(135deg, ${colors.accent}, ${colors.gold})` }}>{user}</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", boxShadow: darkMode ? 'inset -3px -3px 6px rgba(0,0,0,0.2), inset 3px 3px 6px rgba(255,255,255,0.05)' : 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff', borderRadius: 12 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40, background: colors.primary, color: colors.headerText, padding: "12px 8px", borderTopLeftRadius: 12 }}>Days</th>
                    {"reference agent parties property".split(" ").map(key => (
                      <th key={key} style={{ padding: "12px 8px", background: colors.primary, color: colors.headerText, borderBottom: `2px solid ${colors.border}`, textAlign: "left" }}>{columns.find(c => c.key === key)?.label}</th>
                    ))}
                    <th style={{ padding: "12px 8px", background: colors.primary, color: colors.headerText, borderTopRightRadius: 12 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c, i) => (
                    <React.Fragment key={c._id}>
                      <tr style={{ background: i % 2 === 0 ? colors.card : colors.gray, borderBottom: `2px solid ${colors.border}`, transition: 'background 0.3s ease' }}>
                        <td
                          onClick={() => setColorPickIndex(colorPickIndex === c._id ? null : c._id)}
                          style={{ cursor: "pointer", padding: "6px 4px", backgroundColor: c.colors?.daysSinceInstruction || colors.primary, color: colors.headerText, fontWeight: "bold", fontSize: "11px", textAlign: "center", fontFamily: "monospace", letterSpacing: "1px", borderRadius: 4, boxShadow: darkMode ? '-3px -3px 6px rgba(0,0,0,0.2), 3px 3px 6px rgba(255,255,255,0.05)' : '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff' }}>
                          {daysSince(c.instructionReceived)}
                        </td>
                        {["reference", "agent", "parties", "property"].map(key => (
                          <td key={key} style={{ padding: "10px 8px", backgroundColor: c.colors?.[key] || "inherit", wordBreak: "break-word", transition: 'box-shadow 0.3s ease', color: colors.text }}>{c[key] || "—"}</td>
                        ))}
                        <td style={{ padding: "10px 8px" }}>
                          <div style={{ display: "flex", gap: 6, position: "relative", flexWrap: "wrap" }}>
                            <button onClick={() => navigate(`/case/${c._id}`)} style={{ ...styles.actionButton, background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: colors.headerText }}>Edit</button>
                            <button onClick={() => navigate(`/report/${c._id}`)} style={{ ...styles.actionButton, background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: colors.headerText }}>Report</button>
                            <div style={{ position: "relative" }}>
                              <button onClick={() => handleOpenMessages(c._id)} style={{ ...styles.actionButton, background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: colors.headerText }}><FaComments /></button>
                              {messageCounts[c._id] > 0 && (
                                <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", backgroundColor: "red", color: "white", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{messageCounts[c._id]}</span>
                              )}
                            </div>
                            <button onClick={() => setExpandedRow(expandedRow === c._id ? null : c._id)} style={{ ...styles.actionButton, background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: colors.headerText }}>{expandedRow === c._id ? "Hide" : "View More"}</button>
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
                          <td colSpan={6}><div style={{ padding: 10, display: "flex", alignItems: "center", gap: 10, background: colors.gray, boxShadow: darkMode ? 'inset -3px -3px 6px rgba(0,0,0,0.2), inset 3px 3px 6px rgba(255,255,255,0.05)' : 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff', borderRadius: 8 }}>
                            <label style={{ color: colors.primary, fontWeight: "bold" }}>Pick a highlight color:</label>
                            <input type="color" onChange={e => handleColorChange(c._id, e.target.value)} value={c.colors?.daysSinceInstruction || "#ffffff"} style={{ border: "none", cursor: "pointer" }} />
                            <button onClick={() => handleColorChange(c._id, "")} style={{ ...styles.actionButton, background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: colors.headerText }}>Reset</button>
                            <button onClick={() => setColorPickIndex(null)} style={{ ...styles.actionButton, background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: colors.headerText }}>Close</button>
                          </div></td>
                        </tr>
                      )}
                      {expandedRow === c._id && (
                        <tr style={{ background: colors.gray }}>
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
    position: "relative",
    overflow: "hidden",
    fontFamily: "Arial, sans-serif",
    padding: "20px 0"
  },
  animatedBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0.1,
    animation: "gradientMove 15s ease infinite",
    backgroundSize: "200% 200%"
  },
  dashboardCard: {
    borderRadius: 16,
    padding: 40,
    width: "100%",
    maxWidth: "none",
    zIndex: 1,
    animation: 'fadeIn 0.5s ease'
  },
  title: {
    fontSize: 32,
    marginBottom: 8,
    textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
  },
  subtitle: {
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
    padding: "12px 12px 12px 40px",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    transition: 'box-shadow 0.3s ease',
    ':focus': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86' }
  },
  sectionTitle: {
    padding: "10px 20px",
    borderRadius: 8,
    marginBottom: 12,
    textAlign: "center"
  },
  button: {
    padding: "8px 12px",
    border: "none",
    borderRadius: 12,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: '3px 3px 6px rgba(0,0,0,0.1), -3px -3px 6px rgba(255,255,255,0.5)',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    ':hover': { boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.1), inset -3px -3px 6px rgba(255,255,255,0.5)', transform: 'translateY(2px)' }
  },
  actionButton: {
    border: "none",
    padding: "6px 10px",
    borderRadius: 12,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: '3px 3px 6px rgba(0,0,0,0.1), -3px -3px 6px rgba(255,255,255,0.5)',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    ':hover': { boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.1), inset -3px -3px 6px rgba(255,255,255,0.5)', transform: 'translateY(2px)' }
  },
  toggleContainer: {
    display: "flex",
    alignItems: "center"
  },
  toggleSwitch: {
    position: "relative",
    display: "inline-block",
    width: "50px",
    height: "24px"
  },
  toggleSlider: {
    position: "absolute",
    cursor: "pointer",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#ccc",
    transition: ".4s",
    borderRadius: "24px"
  },
  "toggleSlider:before": {
    position: "absolute",
    content: '""',
    height: "20px",
    width: "20px",
    left: "2px",
    bottom: "2px",
    backgroundColor: "white",
    transition: ".4s",
    borderRadius: "50%"
  },
  "input:checked + .toggleSlider": {
    backgroundColor: "#d2ac68" // Gold like calculator
  },
  "input:checked + .toggleSlider:before": {
    transform: "translateX(26px)"
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