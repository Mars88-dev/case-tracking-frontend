// src/components/MyTransactions.js
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaSearch, FaComments } from "react-icons/fa";
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
  blue: "#142a4f",
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
  "hoaCertificate",
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
    {
      key: `${item}Requested`,
      label:
        (item === "electricalComplianceCertificate" ? "COC " : "") +
        item.replace(/([A-Z])/g, " $1").toUpperCase() +
        " - REQUESTED",
    },
    {
      key: `${item}Received`,
      label:
        (item === "electricalComplianceCertificate" ? "COC " : "") +
        item.replace(/([A-Z])/g, " $1").toUpperCase() +
        " - RECEIVED",
    },
  ]),
  { key: "transferSignedSellerDate", label: "Transfer Signed - Seller" },
  { key: "transferSignedPurchaserDate", label: "Transfer Signed - Purchaser" },
  { key: "documentsLodgedDate", label: "Docs Lodged" },
  { key: "deedsPrepDate", label: "Deeds Prep" },
  { key: "registrationDate", label: "Registration" },
  { key: "comments", label: "Comments" },
];

// robust daysSince
const daysSince = (dateInput) => {
  if (!dateInput) return "—";
  let parsedDate;
  if (dateInput instanceof Date) parsedDate = dateInput;
  else if (typeof dateInput === "string" && dateInput.includes("T")) parsedDate = new Date(dateInput);
  else if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) parsedDate = new Date(dateInput);
  else if (typeof dateInput === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
    const [day, month, year] = dateInput.split("/");
    parsedDate = new Date(`${year}-${month}-${day}`);
  } else parsedDate = new Date(dateInput);
  if (isNaN(parsedDate.getTime())) return "—";
  return Math.floor((Date.now() - parsedDate.getTime()) / 86400000);
};

const formatDate = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleDateString("en-GB");
};

const renderSection = (title, fields, data) => (
  <>
    <div
      style={{
        gridColumn: "1 / -1",
        margin: "10px 0 4px",
        borderBottom: `2px solid ${COLORS.gold}`,
        paddingBottom: 4,
        fontWeight: "bold",
        fontSize: 15,
        color: COLORS.gold,
        fontFamily: "Segoe UI",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      {title}
    </div>
    {fields.map(({ key, label }) => (
      <div key={key} style={key === "comments" ? { gridColumn: "1 / -1" } : {}}>
        <div
          style={{
            background: COLORS.gray,
            color: COLORS.primary,
            padding: "6px 10px",
            borderRadius: 4,
            fontWeight: 600,
            fontSize: 14,
            fontFamily: "Segoe UI",
            boxShadow: "3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff",
          }}
        >
          {label}
        </div>
        <div
          style={{
            border: `1px solid ${COLORS.border}`,
            padding: "8px 10px",
            borderRadius: 4,
            backgroundColor: data.colors?.[key] || COLORS.white,
            fontSize: 15,
            fontFamily: "Segoe UI",
            boxShadow: "inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff",
          }}
        >
          {formatDate(data[key])}
        </div>
      </div>
    ))}
  </>
);

export default function MyTransactions() {
  const [cases, setCases] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortAZ, setSortAZ] = useState(true);
  const [filterOutstanding, setFilterOutstanding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // new: messages + toggle active
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [messageCounts, setMessageCounts] = useState({});

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const loadCases = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${BASE_URL}/api/mycases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let data = res.data;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        data = data.filter(
          (c) =>
            c.reference?.toLowerCase().includes(q) ||
            c.parties?.toLowerCase().includes(q) ||
            c.property?.toLowerCase().includes(q) ||
            c.agent?.toLowerCase().includes(q)
        );
      }

      if (sortAZ) data = [...data].sort((a, b) => a.reference.localeCompare(b.reference));
      if (filterOutstanding) data = data.filter((c) => !c.bondAmount || !c.depositAmount);

      setCases(data);

      // message counts per case
      const counts = await Promise.all(
        data.map((c) =>
          axios
            .get(`${BASE_URL}/api/cases/${c._id}/messages`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .then((r) => ({ id: c._id, count: r.data.length }))
            .catch(() => ({ id: c._id, count: 0 }))
        )
      );
      setMessageCounts(counts.reduce((m, it) => ((m[it.id] = it.count), m), {}));
    } catch (e) {
      console.error(e);
    }
  }, [token, sortAZ, filterOutstanding, searchQuery]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await axios.delete(`${BASE_URL}/api/cases/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCases((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete the transaction.");
    }
  };

  const toggleActive = async (caseId, current) => {
    try {
      await axios.put(
        `${BASE_URL}/api/cases/${caseId}/toggle-active`,
        { isActive: !current },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadCases();
    } catch (e) {
      console.error("toggleActive failed", e);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.animatedBackground}></div>
      <div style={styles.pageCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
          <img src="/logo.png" alt="Logo" style={{ height: 90, boxShadow: "3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff", borderRadius: 8 }} />
          <h1 style={styles.title}>My Transactions</h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setSortAZ(!sortAZ)} style={styles.button}>Sort A-Z</button>
            <button onClick={() => setFilterOutstanding(!filterOutstanding)} style={styles.button}>Filter Outstanding</button>
            <button onClick={() => { setSortAZ(false); setFilterOutstanding(false); }} style={styles.button}>Reset</button>
            <button onClick={() => navigate("/case/new")} style={styles.newBtn}>+ New Transaction</button>
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

        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 40, background: COLORS.primary, color: "#fff", padding: "12px 8px", borderTopLeftRadius: 12 }}>Days</th>
                {"reference agent parties property".split(" ").map((key) => (
                  <th key={key} style={styles.th}>{columns.find((c) => c.key === key)?.label || key}</th>
                ))}
                <th style={{ ...styles.th, borderTopRightRadius: 12 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c, i) => (
                <React.Fragment key={c._id}>
                  <tr style={{ ...styles.tr, background: i % 2 === 0 ? COLORS.white : COLORS.gray }}>
                    <td style={styles.tdDays}>{daysSince(c.instructionReceived)}</td>
                    {"reference agent parties property".split(" ").map((key) => (
                      <td key={key} style={{ ...styles.td, backgroundColor: c.colors?.[key] || "inherit" }}>
                        {c[key] || "—"}
                      </td>
                    ))}
                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", position: "relative" }}>
                        <button onClick={() => navigate(`/case/${c._id}`)} style={styles.actionBtn}>Edit</button>
                        <button onClick={() => navigate(`/report/${c._id}`)} style={styles.actionBtnReport}>Report</button>

                        {/* Messages */}
                        <div style={{ position: "relative" }}>
                          <button onClick={() => setSelectedCaseId(c._id)} style={styles.actionBtn}>
                            <FaComments />
                          </button>
                          {messageCounts[c._id] > 0 && <span className="badge" style={badgeStyle}>{messageCounts[c._id]}</span>}
                        </div>

                        <button onClick={() => setExpandedRow(expandedRow === c._id ? null : c._id)} style={styles.actionBtn}>
                          {expandedRow === c._id ? "Hide" : "View More"}
                        </button>

                        {/* Active/Pending */}
                        <button
                          onClick={() => toggleActive(c._id, c.isActive)}
                          style={{
                            ...styles.actionBtn,
                            background: c.isActive === false ? "#e53e3e" : "#38a169",
                            color: "#fff",
                          }}
                        >
                          {c.isActive === false ? "Pending" : "Active"}
                        </button>

                        <button onClick={() => handleDelete(c._id)} style={styles.actionBtnDelete}>Delete</button>
                      </div>
                    </td>
                  </tr>

                  {expandedRow === c._id && (
                    <tr style={{ background: COLORS.gray }}>
                      <td colSpan={6} style={{ padding: 16 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, animation: "fadeIn 0.5s ease" }}>
                          {renderSection(
                            "Information",
                            columns.filter((col) => ["reference", "instructionReceived", "parties", "agency", "agent", "purchasePrice", "property"].includes(col.key)),
                            c
                          )}
                          {renderSection(
                            "Financials",
                            columns.filter((col) => ["depositAmount", "depositDueDate", "depositFulfilledDate", "bondAmount", "bondDueDate", "bondFulfilledDate"].includes(col.key)),
                            c
                          )}
                          {renderSection("Transfer Process - Requested", columns.filter((col) => col.key.includes("Requested") && !col.key.includes("instructionReceived")), c)}
                          {renderSection("Transfer Process - Received", columns.filter((col) => col.key.includes("Received")), c)}
                          {renderSection("Transfer Signed", columns.filter((col) => col.key.includes("transferSigned")), c)}
                          {renderSection("Deeds Office", columns.filter((col) => col.key.includes("documentsLodgedDate") || col.key.includes("deedsPrepDate") || col.key.includes("registrationDate")), c)}
                          {renderSection("Comments", columns.filter((col) => col.key === "comments"), c)}
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

      {/* Message Drawer */}
      {selectedCaseId && (
        <MessageBox caseId={selectedCaseId} onClose={() => setSelectedCaseId(null)} currentUser={null} />
      )}
    </div>
  );
}

const badgeStyle = {
  position: "absolute",
  top: -6,
  right: -6,
  background: "#ef4444",
  color: "#fff",
  width: 18,
  height: 18,
  borderRadius: 9999,
  display: "grid",
  placeItems: "center",
  fontSize: 11,
};

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
    padding: "20px 0",
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
    backgroundSize: "200% 200%",
  },
  pageCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 40,
    width: "100%",
    maxWidth: "none",
    boxShadow: "6px 6px 12px #c8c9cc, -6px -6px 12px #ffffff",
    zIndex: 1,
    animation: "fadeIn 0.5s ease",
  },
  title: { color: COLORS.primary, fontSize: 32, textShadow: "1px 1px 2px rgba(0,0,0,0.1)" },
  searchContainer: { position: "relative", marginBottom: 24, width: "100%", maxWidth: 600, margin: "0 auto" },
  searchInput: {
    width: "100%",
    padding: "12px 12px 12px 40px",
    border: "none",
    borderRadius: 12,
    background: COLORS.background,
    boxShadow: "inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff",
    fontSize: 16,
    transition: "box-shadow 0.3s ease",
  },
  button: {
    padding: "8px 12px",
    borderRadius: 12,
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
    color: COLORS.white,
    border: "none",
    cursor: "pointer",
    boxShadow: "3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff",
    transition: "box-shadow 0.3s ease, transform 0.3s ease",
  },
  newBtn: {
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.gold})`,
    color: COLORS.primary,
    border: "none",
    padding: "10px 16px",
    borderRadius: 12,
    cursor: "pointer",
    boxShadow: "3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff",
    transition: "box-shadow 0.3s ease, transform 0.3s ease",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    boxShadow: "6px 6px 12px #c8c9cc, -6px -6px 12px #ffffff",
    borderRadius: 12,
    overflow: "hidden",
  },
  th: {
    padding: "12px 8px",
    background: COLORS.primary,
    color: "#fff",
    borderBottom: `2px solid ${COLORS.border}`,
    textAlign: "left",
  },
  tr: { transition: "background 0.3s ease" },
  tdDays: {
    padding: "6px 4px",
    backgroundColor: COLORS.primary,
    color: "#fff",
    fontWeight: "bold",
    fontSize: "11px",
    textAlign: "center",
    fontFamily: "monospace",
    letterSpacing: "1px",
    borderRadius: 4,
    boxShadow: "3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff",
  },
  td: { padding: "10px 8px", borderBottom: `1px solid ${COLORS.border}`, wordBreak: "break-word" },
  actionBtn: {
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 12,
    cursor: "pointer",
    boxShadow: "3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff",
    transition: "box-shadow 0.3s ease, transform 0.3s ease",
  },
  actionBtnReport: {
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.gold})`,
    color: COLORS.primary,
    border: "none",
    padding: "6px 10px",
    borderRadius: 12,
    cursor: "pointer",
    boxShadow: "3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff",
    transition: "box-shadow 0.3s ease, transform 0.3s ease",
  },
  actionBtnDelete: {
    background: "#e53e3e",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 12,
    cursor: "pointer",
    boxShadow: "3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff",
    transition: "box-shadow 0.3s ease, transform 0.3s ease",
  },
};

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
