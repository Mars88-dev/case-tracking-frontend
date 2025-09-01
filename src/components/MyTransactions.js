// src/components/MyTransactions.js
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaSearch, FaComments } from "react-icons/fa";
import MessageBox from "./MessageBox";

const BASE_URL = "https://case-tracking-backend.onrender.com";

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

// helpers
const daysSince = (input) => {
  if (!input) return "—";
  let d;
  if (input instanceof Date) d = input;
  else if (typeof input === "string" && input.includes("T")) d = new Date(input);
  else if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) d = new Date(input);
  else if (typeof input === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const [dd, mm, yy] = input.split("/");
    d = new Date(`${yy}-${mm}-${dd}`);
  } else d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  return Math.floor((Date.now() - d.getTime()) / 86400000);
};

const safeFormatDate = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleDateString("en-GB");
};

export default function MyTransactions() {
  const [currentUser, setCurrentUser] = useState(null);
  const [casesByUser, setCasesByUser] = useState({}); // { username: [cases] } — for admins; "My Cases" for non-admins
  const [expandedRow, setExpandedRow] = useState(null);
  const [filterType, setFilterType] = useState("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [colorPickIndex, setColorPickIndex] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [messageCounts, setMessageCounts] = useState({});

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // PRINT CSS to mirror Dashboard: compact report only
  useEffect(() => {
    const id = "mytx-compact-print-css";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      #compactPrintArea { display: none; }

      @media print {
        @page { size: A4 portrait; margin: 8mm; }
        html, body, #root { height: auto !important; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }

        .screen-only { display: none !important; }

        #compactPrintArea { display: block !important; padding: 2mm; color: #000; font-size: 10px; line-height: 1.2; }
        #compactPrintArea .meta { display:flex; justify-content: space-between; margin-bottom: 6px; font-size: 9px; }
        #compactPrintArea h1 { font-size: 16px; margin: 0 0 6px; }
        #compactPrintArea h2 { font-size: 12px; margin: 8px 0 4px; }
        #compactPrintArea h3 { font-size: 11px; margin: 4px 0; }

        #compactPrintArea table { width:100%; border-collapse: collapse; table-layout: fixed; }
        #compactPrintArea th, #compactPrintArea td { border:1px solid #d5d5d5; padding: 2px 4px; }
        #compactPrintArea th { background:#f0f0f0; font-weight:800; }
        #compactPrintArea tbody tr:nth-child(even) td { background:#f7f7f7; }

        #compactPrintArea .w-days   { width: 7%;  text-align: center; }
        #compactPrintArea .w-ref    { width: 18%; }
        #compactPrintArea .w-agent  { width: 18%; }
        #compactPrintArea .w-parties{ width: 28%; }
        #compactPrintArea .w-prop   { width: 29%; }
        #compactPrintArea .ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        #compactPrintArea table, #compactPrintArea thead, #compactPrintArea tbody, #compactPrintArea tr { break-inside:auto; page-break-inside:auto; }
        #compactPrintArea td, #compactPrintArea th { break-inside:avoid; page-break-inside:avoid; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const fetchAll = useCallback(async () => {
    if (!token) return;

    try {
      const me = await axios.get(`${BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUser(me.data);

      // Admin sees all cases; otherwise only their own
      const url = me.data?.isAdmin ? `${BASE_URL}/api/cases` : `${BASE_URL}/api/mycases`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });

      // sort by reference
      let data = [...res.data].sort((a, b) => (a.reference || "").localeCompare(b.reference || ""));

      // search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        data = data.filter(
          (c) =>
            (c.reference || "").toLowerCase().includes(q) ||
            (c.parties || "").toLowerCase().includes(q) ||
            (c.property || "").toLowerCase().includes(q) ||
            (c.agent || "").toLowerCase().includes(q)
        );
      }

      // dashboard-style filters
      if (filterType === "bond") data = data.filter((c) => !c.bondAmount);
      else if (filterType === "deposit") data = data.filter((c) => !c.depositAmount);
      else if (filterType === "transfer") data = data.filter((c) => !c.transferCostReceived);
      else if (filterType === "active") data = data.filter((c) => c.isActive !== false);
      else if (filterType === "inactive") data = data.filter((c) => c.isActive === false);

      // group
      const grouped = (me.data?.isAdmin
        ? data.reduce((acc, c) => {
            const user = (c.createdBy && c.createdBy.username) || "Unknown User";
            (acc[user] || (acc[user] = [])).push(c);
            return acc;
          }, {})
        : { "My Cases": data });

      setCasesByUser(grouped);

      // unread counts
      const promises = data.map((c) =>
        axios
          .get(`${BASE_URL}/api/cases/${c._id}/messages`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((r) => ({
            id: c._id,
            count: (Array.isArray(r.data) ? r.data : []).filter(
              (m) => !(m.readBy || []).includes(me.data._id)
            ).length,
          }))
          .catch(() => ({ id: c._id, count: 0 }))
      );
      const counts = await Promise.all(promises);
      setMessageCounts(counts.reduce((m, it) => ((m[it.id] = it.count), m), {}));
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, [token, searchQuery, filterType]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // actions
  const toggleActive = async (caseId, currentStatus) => {
    try {
      await axios.put(
        `${BASE_URL}/api/cases/${caseId}/toggle-active`,
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAll();
    } catch (err) {
      console.error("toggleActive error:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await axios.delete(`${BASE_URL}/api/cases/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAll();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete the transaction.");
    }
  };

  const handleOpenMessages = (id) => {
    setSelectedCaseId(id);
    setMessageCounts((prev) => ({ ...prev, [id]: 0 }));
  };
  const handleCloseMessages = () => setSelectedCaseId(null);

  const handleColorChange = async (caseId, color) => {
    try {
      const { data: existingCase } = await axios.get(`${BASE_URL}/api/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedColors = { ...existingCase.colors, daysSinceInstruction: color };
      await axios.put(
        `${BASE_URL}/api/cases/${caseId}`,
        { ...existingCase, colors: updatedColors },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchAll();
    } catch (err) {
      console.error("Color update failed:", err);
    }
  };

  const renderSection = (title, fields, data) => (
    <>
      <div
        style={{
          gridColumn: "1 / -1",
          margin: "10px 0 4px",
          borderBottom: `2px solid var(--color-accent)`,
          paddingBottom: 4,
          fontWeight: 800,
          fontSize: 14,
          color: "var(--color-accent)",
        }}
      >
        {title}
      </div>
      {fields.map(({ key, label }) => (
        <div key={key} style={key === "comments" ? { gridColumn: "1 / -1" } : {}}>
          <div
            style={{
              background: "var(--table-header)",
              color: "var(--table-header-text)",
              padding: "6px 10px",
              borderRadius: 8,
              fontWeight: 800,
            }}
          >
            {label}
          </div>
          <div
            style={{
              border: `1px solid color-mix(in srgb, var(--text) 15%, transparent)`,
              padding: "6px 10px",
              borderRadius: 8,
              backgroundColor: (data.colors || {})[key] || "var(--surface)",
              color: "var(--text)",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {safeFormatDate(data[key])}
          </div>
        </div>
      ))}
    </>
  );

  // Screen table (used for Active + Pending)
  const renderCasesTable = (cases, label) => {
    if (!cases.length) return null;
    return (
      <section className="neumo-surface" style={{ padding: 20, borderRadius: 14, marginBottom: 24 }}>
        <h3 style={styles.subSectionHeading}>{label}</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ borderRadius: 14, overflow: "hidden" }}>
            <thead>
              <tr>
                <th style={{ width: 60, fontWeight: 800 }}>Days</th>
                {["reference", "agent", "parties", "property"].map((key) => (
                  <th key={key} style={{ fontWeight: 800 }}>
                    {(columns.find((c) => c.key === key) || {}).label}
                  </th>
                ))}
                <th className="actions-col" style={{ fontWeight: 800 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c, i) => (
                <React.Fragment key={c._id}>
                  <tr
                    style={{
                      background:
                        i % 2 === 0
                          ? "var(--surface)"
                          : "color-mix(in srgb, var(--surface) 70%, #1f2937 30%)",
                    }}
                  >
                    <td
                      onClick={() => setColorPickIndex(colorPickIndex === c._id ? null : c._id)}
                      style={{
                        cursor: "pointer",
                        textAlign: "center",
                        fontWeight: 800,
                        fontSize: 12,
                        borderRadius: 8,
                        background: (c.colors || {}).daysSinceInstruction || "var(--color-primary)",
                        color: "#fff",
                      }}
                    >
                      {daysSince(c.instructionReceived)}
                    </td>

                    {["reference", "agent", "parties", "property"].map((key) => (
                      <td
                        key={key}
                        style={{
                          background: (c.colors || {})[key] || "transparent",
                          color: "var(--text)",
                          wordBreak: "break-word",
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {c[key] || "—"}
                      </td>
                    ))}

                    <td className="actions-col">
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", position: "relative" }}>
                        <button onClick={() => navigate(`/case/${c._id}`)} className="neumo-button">Edit</button>
                        <button onClick={() => navigate(`/report/${c._id}`)} className="neumo-button">Report</button>

                        <div style={{ position: "relative" }}>
                          <button onClick={() => handleOpenMessages(c._id)} className="neumo-button" title="Messages">
                            <FaComments />
                          </button>
                          {messageCounts[c._id] > 0 && (
                            <span className="badge" style={{ position: "absolute", top: -6, right: -6 }}>
                              {messageCounts[c._id]}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => setExpandedRow(expandedRow === c._id ? null : c._id)}
                          className="neumo-button"
                        >
                          {expandedRow === c._id ? "Hide" : "View More"}
                        </button>

                        <button
                          onClick={() => toggleActive(c._id, c.isActive)}
                          className="neumo-button"
                          style={{ background: c.isActive === false ? "#e53e3e" : "#38a169", color: "#fff" }}
                        >
                          {c.isActive === false ? "Pending" : "Active"}
                        </button>

                        <button onClick={() => handleDelete(c._id)} className="neumo-button" style={{ background: "#e53e3e" }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Color picker row */}
                  {colorPickIndex === c._id && (
                    <tr>
                      <td colSpan={6}>
                        <div className="neumo-pressed" style={{ padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
                          <label style={{ fontWeight: 800, color: "var(--color-primary)" }}>Highlight colour:</label>
                          <input
                            type="color"
                            onChange={(e) => handleColorChange(c._id, e.target.value)}
                            value={(c.colors || {}).daysSinceInstruction || "#ffffff"}
                            style={{ border: "none", cursor: "pointer" }}
                          />
                          <button onClick={() => handleColorChange(c._id, "")} className="neumo-button">Reset</button>
                          <button onClick={() => setColorPickIndex(null)} className="neumo-button">Close</button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Expanded details */}
                  {expandedRow === c._id && (
                    <tr>
                      <td colSpan={6} style={{ padding: 12, background: "var(--bg)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                          {renderSection(
                            "Information",
                            columns.filter((col) =>
                              ["reference", "instructionReceived", "date", "parties", "agency", "agent", "purchasePrice", "property"].includes(col.key)
                            ),
                            c
                          )}
                          {renderSection(
                            "Financials",
                            columns.filter((col) =>
                              ["depositAmount", "bondAmount", "depositDueDate", "depositFulfilledDate", "bondDueDate", "bondFulfilledDate"].includes(col.key)
                            ),
                            c
                          )}
                          {renderSection("TRANSFER PROCESS - REQUESTED", columns.filter((col) => col.key.includes("Requested")), c)}
                          {renderSection("TRANSFER PROCESS - RECEIVED", columns.filter((col) => col.key.includes("Received") && col.key !== "instructionReceived"), c)}
                          {renderSection("Transfer Signed", columns.filter((col) => col.key.includes("transferSigned")), c)}
                          {renderSection(
                            "Deeds Office",
                            columns.filter(
                              (col) => col.key.includes("documentsLodgedDate") || col.key.includes("deedsPrepDate") || col.key.includes("registrationDate")
                            ),
                            c
                          )}
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
      </section>
    );
  };

  // Compact PRINT-ONLY table
  const renderPrintTable = (cases, label) => {
    if (!cases.length) return null;
    return (
      <>
        <h3>{label}</h3>
        <table className="striped">
          <thead>
            <tr>
              <th className="w-days">Days</th>
              <th className="w-ref">Reference</th>
              <th className="w-agent">Agent</th>
              <th className="w-parties">Parties</th>
              <th className="w-prop">Property</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c._id}>
                <td className="w-days">{daysSince(c.instructionReceived)}</td>
                <td className="w-ref ellipsis">{c.reference || "—"}</td>
                <td className="w-agent ellipsis">{c.agent || "—"}</td>
                <td className="w-parties ellipsis">{c.parties || "—"}</td>
                <td className="w-prop ellipsis">{c.property || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  };

  return (
    <div style={styles.container}>
      {/* ===== Screen UI ===== */}
      <div className="neumo-surface screen-only" style={styles.card}>
        {/* Header */}
        <div style={styles.headerRow}>
          <img src="/logo.png" alt="Logo" style={styles.logo} />

          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ textAlign: "center" }}>
              <h1 style={styles.title}>My Transactions</h1>
              <p style={styles.subtitle}>
                {currentUser?.isAdmin ? "Admin view of all transactions" : "Only your transactions"}
              </p>
            </div>

            {/* Search */}
            <div style={{ position: "relative", width: "100%", maxWidth: 320, minWidth: 200 }}>
              <FaSearch style={{ position: "absolute", left: 12, top: 12, color: "var(--color-primary)", fontSize: 16 }} />
              <input
                className="neumo-input"
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 36, fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button onClick={() => setFilterType("none")} className="neumo-button">All</button>
            <button onClick={() => setFilterType("bond")} className="neumo-button">No Bond</button>
            <button onClick={() => setFilterType("deposit")} className="neumo-button">No Deposit</button>
            <button onClick={() => setFilterType("transfer")} className="neumo-button">No Transfer</button>
            <button onClick={() => window.print()} className="neumo-button">🖨️ Print Report</button>
            <button
              onClick={() => setFilterType(filterType === "active" ? "inactive" : "active")}
              className="neumo-button"
            >
              {filterType === "inactive" ? "🟢 Active" : "🔴 Inactive"}
            </button>
          </div>
        </div>

        {/* Body — if admin: group by user; else: single "My Cases" group */}
        {Object.entries(casesByUser).map(([user, list]) => {
          const active = list.filter((c) => c.isActive !== false);
          const pending = list.filter((c) => c.isActive === false);

          return (
            <section key={user} className="neumo-surface" style={{ padding: 20, borderRadius: 14, marginBottom: 24 }}>
              <h2 style={styles.sectionHeading}>{user}</h2>
              {renderCasesTable(active, "Active Transactions")}
              {renderCasesTable(pending, "Pending Transactions")}
            </section>
          );
        })}

        {selectedCaseId && currentUser && (
          <MessageBox caseId={selectedCaseId} onClose={handleCloseMessages} currentUser={currentUser} />
        )}
      </div>

      {/* ===== PRINT-ONLY compact report ===== */}
      <div id="compactPrintArea">
        <div className="meta">
          <span>Conveyancing Portal</span>
          <span>{new Date().toLocaleString()}</span>
        </div>
        <h1>My Transactions Report</h1>
        {Object.entries(casesByUser).map(([user, list]) => {
          const active = list.filter((c) => c.isActive !== false);
          const pending = list.filter((c) => c.isActive === false);
          return (
            <div key={`print-${user}`} className="user-block">
              <h2>{user}</h2>
              {renderPrintTable(active, "Active Transactions")}
              {renderPrintTable(pending, "Pending Transactions")}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "calc(100vh - 76px)",
    padding: 16,
    background: "var(--bg)",
    color: "var(--text)",
  },
  card: {
    padding: 20,
    borderRadius: 14,
  },
  headerRow: {
    display: "grid",
    gridTemplateColumns: "220px 1fr auto",
    gap: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  logo: { height: 90, borderRadius: 8 },
  title: { margin: 0, color: "var(--color-primary)", fontWeight: 800 },
  subtitle: { margin: "4px 0 0", color: "var(--muted)", fontSize: 14 },
  sectionHeading: {
    margin: "0 0 10px",
    padding: "8px 12px",
    background: "linear-gradient(135deg, var(--color-accent), var(--color-primary))",
    color: "#fff",
    borderRadius: 10,
    textAlign: "center",
    fontSize: 16,
    fontWeight: 800,
  },
  subSectionHeading: {
    margin: "0 0 12px",
    padding: "6px 10px",
    background: "var(--table-header)",
    color: "var(--table-header-text)",
    borderRadius: 8,
    display: "inline-block",
    fontWeight: 800,
  },
};
