// src/components/Dashboard.js
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaComments, FaSearch } from "react-icons/fa";
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

// Robust daysSince across ISO / YYYY-MM-DD / DD/MM/YYYY
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

export default function Dashboard() {
  const [casesByUser, setCasesByUser] = useState({});
  const [expandedRow, setExpandedRow] = useState(null);
  const [filterType, setFilterType] = useState("none");
  const [colorPickIndex, setColorPickIndex] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [messageCounts, setMessageCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // === PRINT CSS for compact PDF report (portrait, only the compact area prints) ===
  useEffect(() => {
    const id = "dashboard-compact-print-css";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      @media print {
        @page { size: A4 portrait; margin: 8mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        /* Hide everything by default */
        body * { visibility: hidden !important; }
        /* Show only compact print area */
        #compactPrintArea, #compactPrintArea * { visibility: visible !important; }
        #compactPrintArea {
          position: absolute; left: 0; top: 0; width: 100%;
          background: #fff; color: #000;
          font-size: 10px; line-height: 1.2;
        }
        #compactPrintArea h1 { font-size: 16px; margin: 0 0 4px; }
        #compactPrintArea h2 { font-size: 12px; margin: 6px 0 4px; }
        #compactPrintArea h3 { font-size: 11px; margin: 4px 0; }
        #compactPrintArea .meta { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 9px; }
        #compactPrintArea .user-block { page-break-inside: avoid; margin-bottom: 6mm; }
        #compactPrintArea table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        #compactPrintArea th, #compactPrintArea td { border: 1px solid #ddd; padding: 2px 4px; }
        #compactPrintArea th { background: #f0f0f0; font-weight: 800; }
        #compactPrintArea .striped tbody tr:nth-child(even) td { background: #f7f7f7; }
        #compactPrintArea .w-days { width: 7%; text-align:center; }
        #compactPrintArea .w-ref { width: 18%; }
        #compactPrintArea .w-agent { width: 18%; }
        #compactPrintArea .w-parties { width: 28%; }
        #compactPrintArea .w-prop { width: 29%; }
        #compactPrintArea .ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const fetchCases = useCallback(() => {
    if (!token) return;
    axios
      .get(`${BASE_URL}/api/cases`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const userRes = await axios.get(`${BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(userRes.data);

        let data = [...res.data].sort((a, b) =>
          (a.reference || "").localeCompare(b.reference || "")
        );

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          data = data.filter((c) => {
            return (
              (c.reference || "").toLowerCase().includes(q) ||
              (c.parties || "").toLowerCase().includes(q) ||
              (c.property || "").toLowerCase().includes(q) ||
              (c.agent || "").toLowerCase().includes(q)
            );
          });
        }

        if (filterType === "bond") data = data.filter((c) => !c.bondAmount);
        else if (filterType === "deposit") data = data.filter((c) => !c.depositAmount);
        else if (filterType === "transfer") data = data.filter((c) => !c.transferCostReceived);
        else if (filterType === "active") data = data.filter((c) => c.isActive !== false);
        else if (filterType === "inactive") data = data.filter((c) => c.isActive === false);

        const grouped = data.reduce((acc, c) => {
          const user = (c.createdBy && c.createdBy.username) || "Unknown User";
          (acc[user] || (acc[user] = [])).push(c);
          return acc;
        }, {});
        setCasesByUser(grouped);

        const messagePromises = data.map((c) =>
          axios
            .get(`${BASE_URL}/api/cases/${c._id}/messages`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .then((r) => ({
              id: c._id,
              count: (Array.isArray(r.data) ? r.data : []).filter(
                (m) => !(m.readBy || []).includes(userRes.data._id)
              ).length,
            }))
            .catch(() => ({ id: c._id, count: 0 }))
        );
        const counts = await Promise.all(messagePromises);
        setMessageCounts(counts.reduce((m, it) => ((m[it.id] = it.count), m), {}));
      })
      .catch(console.error);
  }, [filterType, token, searchQuery]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const toggleActive = async (caseId, currentStatus) => {
    try {
      await axios.put(
        `${BASE_URL}/api/cases/${caseId}/toggle-active`,
        { isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchCases();
    } catch (err) {
      console.error("Failed to toggle active status:", err);
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
      fetchCases();
    } catch (err) {
      console.error("Failed to update color:", err);
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

  // On-screen table (active/pending)
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
                <th className="actions-col" style={{ fontWeight: 800 }}>
                  Actions
                </th>
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
                        <button onClick={() => navigate(`/case/${c._id}`)} className="neumo-button">
                          Edit
                        </button>
                        <button onClick={() => navigate(`/report/${c._id}`)} className="neumo-button">
                          Report
                        </button>

                        <div style={{ position: "relative" }}>
                          <button
                            onClick={() => handleOpenMessages(c._id)}
                            className="neumo-button"
                            title="Messages"
                          >
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
                          style={{
                            background: c.isActive === false ? "#e53e3e" : "#38a169",
                          }}
                        >
                          {c.isActive === false ? "Pending" : "Active"}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {colorPickIndex === c._id && (
                    <tr>
                      <td colSpan={6}>
                        <div
                          className="neumo-pressed"
                          style={{ padding: 10, display: "flex", alignItems: "center", gap: 10 }}
                        >
                          <label style={{ fontWeight: 800, color: "var(--color-primary)" }}>
                            Highlight colour:
                          </label>
                          <input
                            type="color"
                            onChange={(e) => handleColorChange(c._id, e.target.value)}
                            value={(c.colors || {}).daysSinceInstruction || "#ffffff"}
                            style={{ border: "none", cursor: "pointer" }}
                          />
                          <button onClick={() => handleColorChange(c._id, "")} className="neumo-button">
                            Reset
                          </button>
                          <button onClick={() => setColorPickIndex(null)} className="neumo-button">
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {expandedRow === c._id && (
                    <tr>
                      <td colSpan={6} style={{ padding: 12, background: "var(--bg)" }}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                            gap: 16,
                          }}
                        >
                          {renderSection(
                            "Information",
                            columns.filter((col) =>
                              [
                                "reference",
                                "instructionReceived",
                                "date",
                                "parties",
                                "agency",
                                "agent",
                                "purchasePrice",
                                "property",
                              ].includes(col.key)
                            ),
                            c
                          )}
                          {renderSection(
                            "Financials",
                            columns.filter((col) =>
                              [
                                "depositAmount",
                                "bondAmount",
                                "depositDueDate",
                                "depositFulfilledDate",
                                "bondDueDate",
                                "bondFulfilledDate",
                              ].includes(col.key)
                            ),
                            c
                          )}
                          {renderSection(
                            "TRANSFER PROCESS - REQUESTED",
                            columns.filter((col) => col.key.includes("Requested")),
                            c
                          )}
                          {renderSection(
                            "TRANSFER PROCESS - RECEIVED",
                            columns.filter(
                              (col) => col.key.includes("Received") && col.key !== "instructionReceived"
                            ),
                            c
                          )}
                          {renderSection(
                            "Transfer Signed",
                            columns.filter((col) => col.key.includes("transferSigned")),
                            c
                          )}
                          {renderSection(
                            "Deeds Office",
                            columns.filter(
                              (col) =>
                                col.key.includes("documentsLodgedDate") ||
                                col.key.includes("deedsPrepDate") ||
                                col.key.includes("registrationDate")
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

  // === Compact PRINT-ONLY table ===
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
      {/* ======= On-screen dashboard ======= */}
      <div className="neumo-surface" style={styles.card}>
        {/* Header row */}
        <div style={styles.headerRow}>
          <img src="/logo.png" alt="Logo" className="logo" style={styles.logo} />

          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ textAlign: "center" }}>
              <h1 style={styles.title}>Dashboard</h1>
              <p style={styles.subtitle}>Track and manage your cases with precision</p>
            </div>

            {/* Search */}
            <div style={{ position: "relative", width: "100%", maxWidth: 320, minWidth: 200 }}>
              <FaSearch
                style={{ position: "absolute", left: 12, top: 12, color: "var(--color-primary)", fontSize: 16 }}
              />
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
            <button onClick={() => setFilterType("none")} className="neumo-button">
              All
            </button>
            <button onClick={() => setFilterType("bond")} className="neumo-button">
              No Bond
            </button>
            <button onClick={() => setFilterType("deposit")} className="neumo-button">
              No Deposit
            </button>
            <button onClick={() => setFilterType("transfer")} className="neumo-button">
              No Transfer
            </button>
            {/* This prints the compact report */}
            <button onClick={() => window.print()} className="neumo-button">
              🖨️ Print Report
            </button>
            <button
              onClick={() => setFilterType(filterType === "active" ? "inactive" : "active")}
              className="neumo-button"
            >
              {filterType === "inactive" ? "🟢 Active" : "🔴 Inactive"}
            </button>
          </div>
        </div>

        {/* Per-user blocks split into Active & Pending (on screen) */}
        {Object.entries(casesByUser).map(([user, cases]) => {
          const activeCases = cases.filter((c) => c.isActive !== false);
          const pendingCases = cases.filter((c) => c.isActive === false);

          return (
            <section key={user} className="neumo-surface" style={{ padding: 20, borderRadius: 14, marginBottom: 24 }}>
              <h2 style={styles.sectionHeading}>{user}</h2>
              {renderCasesTable(activeCases, "Active Transactions")}
              {renderCasesTable(pendingCases, "Pending Transactions")}
            </section>
          );
        })}

        {selectedCaseId && currentUser && (
          <MessageBox caseId={selectedCaseId} onClose={handleCloseMessages} currentUser={currentUser} />
        )}
      </div>

      {/* ======= PRINT-ONLY compact report ======= */}
      <div id="compactPrintArea">
        <div className="meta">
          <span>Conveyancing Portal</span>
          <span>{new Date().toLocaleString()}</span>
        </div>
        <h1>Dashboard Report</h1>
        {Object.entries(casesByUser).map(([user, cases]) => {
          const activeCases = cases.filter((c) => c.isActive !== false);
          const pendingCases = cases.filter((c) => c.isActive === false);
          return (
            <div key={`print-${user}`} className="user-block">
              <h2>{user}</h2>
              {renderPrintTable(activeCases, "Active Transactions")}
              {renderPrintTable(pendingCases, "Pending Transactions")}
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
