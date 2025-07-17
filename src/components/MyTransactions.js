// src/components/MyTransactions.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaSearch } from "react-icons/fa"; // Added for search icon

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
    { key: `${item}Requested`, label: (item === "electricalComplianceCertificate" ? "COC " : "") + item.replace(/([A-Z])/g, " $1").toUpperCase() + " - REQUESTED" },
    { key: `${item}Received`, label: (item === "electricalComplianceCertificate" ? "COC " : "") + item.replace(/([A-Z])/g, " $1").toUpperCase() + " - RECEIVED" }
  ]),
  { key: "transferSignedSellerDate", label: "Transfer Signed - Seller" },
  { key: "transferSignedPurchaserDate", label: "Transfer Signed - Purchaser" },
  { key: "documentsLodgedDate", label: "Docs Lodged" },
  { key: "deedsPrepDate", label: "Deeds Prep" },
  { key: "registrationDate", label: "Registration" },
  { key: "comments", label: "Comments" }
];

const daysSince = (dateStr) => {
  if (!dateStr) return "—";

  // Robust parsing: First try as ISO date (new format from calendar)
  let parsedDate = new Date(dateStr);
  if (!isNaN(parsedDate.getTime())) {
    const now = new Date();
    const diff = Math.floor((now - parsedDate) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : "—";
  }

  // Fallback for old DD/MM/YYYY strings
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    parsedDate = new Date(`${year}-${month}-${day}`);
    if (!isNaN(parsedDate.getTime())) {
      const now = new Date();
      const diff = Math.floor((now - parsedDate) / (1000 * 60 * 60 * 24));
      return diff >= 0 ? diff : "—";
    }
  }

  // If all parsing fails, return dash
  return "—";
};

const formatDate = (val) => {
  if (!val) return "—";
  const date = new Date(val);
  return !isNaN(date.getTime()) ? date.toLocaleDateString("en-GB") : val;
};

const renderSection = (title, fields, data) => (
  <>
    <div style={{ gridColumn: "1 / -1", margin: "10px 0 4px", borderBottom: `2px solid ${COLORS.gold}`, paddingBottom: 4, fontWeight: "bold", fontSize: 15, color: COLORS.gold, fontFamily: 'Segoe UI', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>{title}</div>
    {fields.map(({ key, label }) => (
      <div key={key} style={key === "comments" ? { gridColumn: "1 / -1" } : {}}>
        <div style={{ background: COLORS.gray, color: COLORS.primary, padding: '6px 10px', borderRadius: 4, fontWeight: 600, fontSize: 14, fontFamily: 'Segoe UI', boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff' }}>{label}</div>
        <div style={{ border: `1px solid ${COLORS.border}`, padding: '8px 10px', borderRadius: 4, backgroundColor: data.colors?.[key] || COLORS.white, fontSize: 15, fontFamily: 'Segoe UI', boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff' }}>{formatDate(data[key])}</div>
      </div>
    ))}
  </>
);

export default function MyTransactions() {
  const [cases, setCases] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortAZ, setSortAZ] = useState(true); // Default sorting A-Z ON
  const [filterOutstanding, setFilterOutstanding] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); // New state for search bar
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) return;
    axios.get(`${BASE_URL}/api/mycases`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      let data = res.data;

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

      if (sortAZ) data = [...data].sort((a, b) => a.reference.localeCompare(b.reference));
      if (filterOutstanding) data = data.filter(c => !c.bondAmount || !c.depositAmount);
      setCases(data);
    }).catch(console.error);
  }, [sortAZ, filterOutstanding, searchQuery, token]); // Added searchQuery to dependencies

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await axios.delete(`${BASE_URL}/api/cases/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCases(prev => prev.filter(c => c._id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete the transaction.");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.animatedBackground}></div>
      <div style={styles.pageCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: "wrap" }}>
          <img src="/logo.png" alt="Logo" style={{ height: 90, boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff', borderRadius: 8 }} />
          <h1 style={styles.title}>My Transactions</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setSortAZ(!sortAZ)} style={styles.button}>Sort A-Z</button>
            <button onClick={() => setFilterOutstanding(!filterOutstanding)} style={styles.button}>Filter Outstanding</button>
            <button onClick={() => { setSortAZ(false); setFilterOutstanding(false); }} style={styles.button}>Reset</button>
            <button onClick={() => navigate('/case/new')} style={styles.newBtn}>+ New Transaction</button>
          </div>
        </div>

        {/* Search Bar (matching Dashboard) */}
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

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 40, background: COLORS.primary, color: COLORS.white, padding: "12px 8px", borderTopLeftRadius: 12 }}>Days</th>
                {"reference agent parties property".split(" ").map(key => (
                  <th key={key} style={styles.th}>{columns.find(c => c.key === key)?.label || key}</th>
                ))}
                <th style={{ ...styles.th, borderTopRightRadius: 12 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c, i) => (
                <React.Fragment key={c._id}>
                  <tr style={{ ...styles.tr, background: i % 2 === 0 ? COLORS.white : COLORS.gray }}>
                    <td style={styles.tdDays}>{daysSince(c.instructionReceived)}</td>
                    {"reference agent parties property".split(" ").map(key => (
                      <td key={key} style={{ ...styles.td, backgroundColor: c.colors?.[key] || 'inherit' }}>{c[key] || '—'}</td>
                    ))}
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: "wrap" }}>
                        <button onClick={() => navigate(`/case/${c._id}`)} style={styles.actionBtn}>Edit</button>
                        <button onClick={() => navigate(`/report/${c._id}`)} style={styles.actionBtnReport}>Report</button>
                        <button onClick={() => handleDelete(c._id)} style={styles.actionBtnDelete}>Delete</button>
                        <button onClick={() => setExpandedRow(expandedRow === c._id ? null : c._id)} style={styles.actionBtn}>{expandedRow === c._id ? "Hide" : "View More"}</button>
                      </div>
                    </td>
                  </tr>
                  {expandedRow === c._id && (
                    <tr style={{ background: COLORS.gray }}>
                      <td colSpan={6} style={{ padding: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, animation: 'fadeIn 0.5s ease' }}>
                          {renderSection("Information", columns.filter(col => ["reference", "instructionReceived", "parties", "agency", "agent", "purchasePrice", "property"].includes(col.key)), c)}
                          {renderSection("Financials", columns.filter(col => ["depositAmount", "depositDueDate", "depositFulfilledDate", "bondAmount", "bondDueDate", "bondFulfilledDate"].includes(col.key)), c)}
                          {renderSection("Transfer Process - Requested", columns.filter(col => col.key.includes("Requested") && !col.key.includes("instructionReceived")), c)}
                          {renderSection("Transfer Process - Received", columns.filter(col => col.key.includes("Received")), c)}
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
    padding: "20px 0" // Full-width feel
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
  pageCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 40,
    width: "100%", // Full width
    maxWidth: "none",
    boxShadow: '6px 6px 12px #c8c9cc, -6px -6px 12px #ffffff', // Neumorphic card
    zIndex: 1,
    animation: 'fadeIn 0.5s ease'
  },
  title: { 
    color: COLORS.primary, 
    fontSize: 32,
    textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
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
    background: COLORS.background,
    boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff',
    fontSize: 16,
    transition: 'box-shadow 0.3s ease',
    ':focus': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86' } // Gold focus
  },
  button: { 
    padding: "8px 12px", 
    borderRadius: 12, 
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
    color: COLORS.white, 
    border: 'none', 
    cursor: 'pointer',
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    ':hover': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86', transform: 'translateY(2px)' }
  },
  newBtn: { 
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.gold})`, 
    color: COLORS.primary, 
    border: 'none', 
    padding: '10px 16px', 
    borderRadius: 12, 
    cursor: 'pointer',
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    ':hover': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86', transform: 'translateY(2px)' }
  },
  table: { 
    width: '100%', 
    borderCollapse: 'collapse', 
    tableLayout: 'fixed',
    boxShadow: '6px 6px 12px #c8c9cc, -6px -6px 12px #ffffff',
    borderRadius: 12,
    overflow: 'hidden'
  },
  th: { 
    padding: '12px 8px', 
    background: COLORS.primary, 
    color: COLORS.white, 
    borderBottom: `2px solid ${COLORS.border}`, 
    textAlign: 'left' 
  },
  tr: { 
    transition: 'background 0.3s ease',
    ':hover': { background: '#e0e0e0 !important', boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86' }
  },
  tdDays: { 
    padding: '6px 4px', 
    backgroundColor: COLORS.primary, 
    color: COLORS.white, 
    fontWeight: 'bold', 
    fontSize: '11px', 
    textAlign: 'center', 
    fontFamily: 'monospace', 
    letterSpacing: '1px', 
    borderRadius: 4,
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff'
  },
  td: { 
    padding: '10px 8px', 
    borderBottom: `1px solid ${COLORS.border}`, 
    wordBreak: 'break-word' 
  },
  actionBtn: { 
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`, 
    color: COLORS.white, 
    border: 'none', 
    padding: '6px 10px', 
    borderRadius: 12,
    cursor: 'pointer',
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    ':hover': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86', transform: 'translateY(2px)' }
  },
  actionBtnReport: { 
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.gold})`, 
    color: COLORS.primary, 
    border: 'none', 
    padding: '6px 10px', 
    borderRadius: 12,
    cursor: 'pointer',
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    ':hover': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86', transform: 'translateY(2px)' }
  },
  actionBtnDelete: { 
    background: '#e53e3e', 
    color: COLORS.white, 
    border: 'none', 
    padding: '6px 10px', 
    borderRadius: 12,
    cursor: 'pointer',
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    ':hover': { boxShadow: 'inset 3px 3px 6px #b02a2a, inset -3px -3px 6px #f45a5a', transform: 'translateY(2px)' }
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