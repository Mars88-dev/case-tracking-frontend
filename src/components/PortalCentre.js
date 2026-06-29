// File: src/components/PortalCentre.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaBan,
  FaCheckCircle,
  FaClipboardList,
  FaCopy,
  FaEye,
  FaFileDownload,
  FaLink,
  FaLock,
  FaRedo,
  FaSearch,
  FaShieldAlt,
  FaUserFriends,
  FaUserTie,
} from "react-icons/fa";

const BASE_URL = "https://case-tracking-backend.onrender.com";

const PROCESS_ITEMS = [
  { key: "sellerFicaDocuments", label: "Seller FICA documents" },
  { key: "purchaserFicaDocuments", label: "Purchaser FICA documents" },
  { key: "titleDeed", label: "Title deed" },
  { key: "bondCancellationFigures", label: "Bond cancellation figures" },
  { key: "municipalClearanceFigures", label: "Municipal clearance figures" },
  { key: "transferDutyReceipt", label: "Transfer duty receipt" },
  { key: "guaranteesFromBondAttorneys", label: "Guarantees from bond attorneys" },
  { key: "transferCost", label: "Transfer costs" },
  { key: "electricalComplianceCertificate", label: "Electrical compliance certificate" },
  { key: "municipalClearanceCertificate", label: "Municipal clearance certificate" },
  { key: "levyClearanceCertificate", label: "Levy clearance certificate" },
  { key: "hoaCertificate", label: "HOA certificate" },
];

const INCOMPLETE_VALUES = new Set(["", "N/A", "NA", "PARTLY", "REQUESTED", "PENDING", "NONE", "NO"]);
const EMPTY_VALUES = new Set(["", "N/A", "NA", "NONE"]);

function injectPortalCentreStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("gba-portal-centre-styles")) return;

  const style = document.createElement("style");
  style.id = "gba-portal-centre-styles";
  style.textContent = `
    .gba-portal-centre-page {
      min-height: calc(100vh - var(--topbar-height));
      padding: clamp(12px, 1.35vw, 22px);
      color: var(--text);
      background: transparent;
    }

    .gba-portal-centre-shell {
      display: grid;
      gap: 14px;
      max-width: 1760px;
      margin: 0 auto;
    }

    .gba-portal-hero {
      position: relative;
      overflow: hidden;
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
      gap: 16px;
      padding: clamp(16px, 1.5vw, 24px);
      border-radius: 28px;
      background:
        radial-gradient(circle at 13% 14%, rgba(210,172,104,0.26), transparent 20rem),
        linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-2) 78%);
      color: #fff;
      box-shadow: 0 22px 60px rgba(7,31,57,0.22);
    }

    .gba-portal-hero::after {
      content: "";
      position: absolute;
      inset: auto -90px -145px auto;
      width: 360px;
      height: 360px;
      border-radius: 50%;
      background: rgba(210,172,104,0.18);
      pointer-events: none;
    }

    .gba-portal-hero-content,
    .gba-portal-hero-card {
      position: relative;
      z-index: 1;
    }

    .gba-portal-kicker {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: max-content;
      padding: 7px 11px;
      border-radius: 999px;
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.14);
      color: var(--color-accent-2);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .gba-portal-hero h1 {
      margin: 12px 0 7px;
      font-size: clamp(28px, 3vw, 46px);
      line-height: 1;
      letter-spacing: -0.055em;
    }

    .gba-portal-hero p {
      max-width: 760px;
      margin: 0;
      color: rgba(255,255,255,0.76);
      font-size: 14px;
      line-height: 1.65;
    }

    .gba-portal-hero-card {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      align-content: center;
      padding: 14px;
      border-radius: 22px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      backdrop-filter: blur(12px);
    }

    .gba-portal-stat {
      min-width: 0;
      padding: 12px;
      border-radius: 16px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.10);
    }

    .gba-portal-stat strong,
    .gba-portal-stat span {
      display: block;
    }

    .gba-portal-stat strong {
      font-size: 24px;
      line-height: 1;
      color: #fff;
    }

    .gba-portal-stat span {
      margin-top: 5px;
      color: rgba(255,255,255,0.62);
      font-size: 11px;
      font-weight: 850;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .gba-portal-grid {
      display: grid;
      grid-template-columns: minmax(410px, 0.72fr) minmax(0, 1.28fr);
      gap: 14px;
      align-items: start;
    }

    .gba-portal-panel {
      display: grid;
      gap: 14px;
      padding: 16px;
      border-radius: 24px;
      background: var(--surface);
      border: 1px solid var(--border-soft);
      box-shadow: 12px 16px 34px var(--shadow-lo), -10px -10px 26px var(--shadow-hi);
    }

    .gba-portal-panel.sticky {
      position: sticky;
      top: calc(var(--topbar-height) + 14px);
    }

    .gba-portal-panel-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .gba-portal-panel-head h2 {
      margin: 0;
      font-size: 18px;
      letter-spacing: -0.03em;
      color: var(--text);
    }

    .gba-portal-panel-head p {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    .gba-portal-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      flex: 0 0 auto;
      width: max-content;
      padding: 7px 10px;
      border-radius: 999px;
      background: var(--surface-2);
      border: 1px solid var(--border-soft);
      color: var(--text);
      font-size: 11px;
      font-weight: 900;
      box-shadow: inset 2px 2px 6px rgba(15,23,42,0.05), inset -2px -2px 6px rgba(255,255,255,0.75);
    }

    .gba-portal-pill.gold {
      color: #9c6d18;
      background: rgba(210,172,104,0.12);
      border-color: rgba(210,172,104,0.36);
    }

    .gba-portal-field {
      display: grid;
      gap: 6px;
    }

    .gba-portal-field label,
    .gba-portal-section-label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .gba-portal-field small,
    .gba-portal-section-label small {
      color: var(--color-accent);
      font-size: 10px;
      letter-spacing: 0;
      text-transform: none;
    }

    .gba-portal-input,
    .gba-portal-select,
    .gba-portal-textarea {
      width: 100%;
      min-width: 0;
      border: 1px solid var(--border-soft);
      border-radius: 16px;
      background: var(--surface-2);
      color: var(--text);
      font: inherit;
      font-weight: 800;
      outline: none;
      box-shadow: inset 4px 4px 10px rgba(15,23,42,0.06), inset -4px -4px 10px rgba(255,255,255,0.78);
      transition: border-color .15s ease, box-shadow .15s ease;
    }

    .gba-portal-input,
    .gba-portal-select {
      height: 50px;
      padding: 0 14px;
    }

    .gba-portal-textarea {
      min-height: 92px;
      padding: 13px 14px;
      resize: vertical;
      line-height: 1.5;
    }

    .gba-portal-input:focus,
    .gba-portal-select:focus,
    .gba-portal-textarea:focus {
      border-color: rgba(210,172,104,0.85);
      box-shadow: 0 0 0 4px rgba(210,172,104,0.14), inset 4px 4px 10px rgba(15,23,42,0.05);
    }

    .gba-portal-choice-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .gba-portal-choice {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 10px;
      text-align: left;
      padding: 14px;
      border-radius: 18px;
      border: 1px solid var(--border-soft);
      background: var(--surface-2);
      color: var(--text);
      cursor: pointer;
      box-shadow: inset 2px 2px 8px rgba(15,23,42,0.04), inset -2px -2px 8px rgba(255,255,255,0.72);
    }

    .gba-portal-choice.active {
      border-color: rgba(210,172,104,0.82);
      box-shadow: 0 0 0 3px rgba(210,172,104,0.13), inset 2px 2px 8px rgba(15,23,42,0.04);
    }

    .gba-portal-choice svg {
      margin-top: 3px;
      color: var(--color-primary);
    }

    .gba-portal-choice strong {
      display: block;
      margin-bottom: 4px;
      font-size: 14px;
      letter-spacing: -0.01em;
    }

    .gba-portal-choice span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
    }

    .gba-portal-case-search {
      position: relative;
    }

    .gba-portal-case-search svg {
      position: absolute;
      top: 50%;
      left: 14px;
      transform: translateY(-50%);
      color: var(--color-accent);
      pointer-events: none;
    }

    .gba-portal-case-search .gba-portal-input {
      padding-left: 42px;
    }

    .gba-portal-buttons {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .gba-portal-button {
      min-height: 50px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      border: 0;
      border-radius: 16px;
      padding: 0 14px;
      color: var(--text);
      font-weight: 950;
      cursor: pointer;
      text-decoration: none;
      background: linear-gradient(135deg, var(--color-accent-2), var(--color-accent));
      box-shadow: 8px 10px 22px rgba(154,112,35,0.24), -6px -6px 16px var(--shadow-hi);
    }

    .gba-portal-button.secondary {
      background: var(--surface-2);
      box-shadow: 8px 10px 20px var(--shadow-lo), -7px -7px 18px var(--shadow-hi);
    }

    .gba-portal-button.danger {
      color: #7f1d1d;
      background: rgba(239,68,68,0.10);
      box-shadow: none;
      border: 1px solid rgba(239,68,68,0.22);
    }

    .gba-portal-button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: none;
    }

    .gba-portal-link-box {
      display: grid;
      gap: 10px;
      padding: 14px;
      border-radius: 20px;
      background: rgba(210,172,104,0.10);
      border: 1px solid rgba(210,172,104,0.28);
    }

    .gba-portal-link-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
    }

    .gba-portal-alert {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 12px 14px;
      border-radius: 18px;
      background: rgba(20,42,79,0.06);
      border: 1px solid var(--border-soft);
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    .gba-portal-alert.success {
      color: #14532d;
      background: rgba(34,197,94,0.10);
      border-color: rgba(34,197,94,0.22);
    }

    .gba-portal-alert.error {
      color: #7f1d1d;
      background: rgba(239,68,68,0.10);
      border-color: rgba(239,68,68,0.22);
    }

    .gba-portal-preview-card {
      overflow: hidden;
      border-radius: 24px;
      background: var(--surface);
      border: 1px solid var(--border-soft);
      box-shadow: 12px 16px 34px var(--shadow-lo), -10px -10px 26px var(--shadow-hi);
    }

    .gba-portal-preview-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      padding: 18px;
      color: #fff;
      background:
        radial-gradient(circle at 100% 10%, rgba(210,172,104,0.24), transparent 14rem),
        linear-gradient(135deg, var(--color-primary), var(--color-primary-2));
    }

    .gba-portal-preview-head h2 {
      margin: 4px 0 6px;
      font-size: 24px;
      letter-spacing: -0.04em;
    }

    .gba-portal-preview-head p {
      margin: 0;
      color: rgba(255,255,255,0.74);
      font-size: 13px;
      line-height: 1.5;
    }

    .gba-portal-preview-body {
      display: grid;
      gap: 14px;
      padding: 16px;
    }

    .gba-portal-summary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .gba-portal-summary-tile,
    .gba-portal-timeline,
    .gba-portal-outstanding,
    .gba-portal-history-item {
      border: 1px solid var(--border-soft);
      background: var(--surface-2);
      border-radius: 18px;
      padding: 12px;
      box-shadow: inset 2px 2px 8px rgba(15,23,42,0.04), inset -2px -2px 8px rgba(255,255,255,0.72);
    }

    .gba-portal-summary-tile span,
    .gba-portal-history-item span {
      display: block;
      color: var(--muted);
      font-size: 10px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .gba-portal-summary-tile strong,
    .gba-portal-history-item strong {
      display: block;
      margin-top: 5px;
      color: var(--text);
      font-size: 14px;
      line-height: 1.25;
      word-break: break-word;
    }

    .gba-portal-section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin: 0;
      font-size: 16px;
      letter-spacing: -0.03em;
    }

    .gba-portal-outstanding-list,
    .gba-portal-history-list,
    .gba-portal-timeline-list {
      display: grid;
      gap: 9px;
    }

    .gba-portal-outstanding-row,
    .gba-portal-timeline-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-soft);
    }

    .gba-portal-outstanding-row:last-child,
    .gba-portal-timeline-row:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }

    .gba-portal-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: rgba(210,172,104,0.22);
      border: 3px solid rgba(210,172,104,0.40);
    }

    .gba-portal-dot.done {
      background: #22c55e;
      border-color: rgba(34,197,94,0.22);
    }

    .gba-portal-outstanding-row strong,
    .gba-portal-timeline-row strong {
      display: block;
      font-size: 13px;
      color: var(--text);
    }

    .gba-portal-outstanding-row small,
    .gba-portal-timeline-row small {
      display: block;
      margin-top: 2px;
      font-size: 11px;
      color: var(--muted);
    }

    .gba-portal-status-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: max-content;
      padding: 6px 9px;
      border-radius: 999px;
      color: #0f5132;
      background: rgba(34,197,94,0.13);
      border: 1px solid rgba(34,197,94,0.22);
      font-size: 10px;
      font-weight: 950;
      white-space: nowrap;
    }

    .gba-portal-status-pill.expired,
    .gba-portal-status-pill.revoked,
    .gba-portal-status-pill.overdue {
      color: #7f1d1d;
      background: rgba(239,68,68,0.10);
      border-color: rgba(239,68,68,0.22);
    }

    .gba-portal-empty {
      padding: 16px;
      border-radius: 18px;
      color: var(--muted);
      background: var(--surface-2);
      border: 1px dashed var(--border-soft);
      font-size: 13px;
      line-height: 1.5;
    }

    .gba-portal-history-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
    }

    .gba-portal-history-meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 8px;
    }

    .gba-portal-history-meta small {
      color: var(--muted);
      font-size: 11px;
      line-height: 1.25;
      word-break: break-word;
    }

    @media (max-width: 1180px) {
      .gba-portal-hero,
      .gba-portal-grid {
        grid-template-columns: 1fr;
      }

      .gba-portal-panel.sticky {
        position: relative;
        top: auto;
      }
    }

    @media (max-width: 760px) {
      .gba-portal-centre-page {
        padding: 10px;
      }

      .gba-portal-hero,
      .gba-portal-panel,
      .gba-portal-preview-card {
        border-radius: 20px;
      }

      .gba-portal-hero-card,
      .gba-portal-choice-grid,
      .gba-portal-buttons,
      .gba-portal-summary-grid,
      .gba-portal-history-meta,
      .gba-portal-link-row {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function safeValue(value, fallback = "Not recorded") {
  if (value === null || value === undefined) return fallback;
  if (value instanceof Date) return formatDate(value) || fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text) || /^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return formatDate(text) || text;
  }
  return text;
}

function formatDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
}

function hasMatterValue(value) {
  const normalized = normalizeStatus(value);
  return !!normalized && !EMPTY_VALUES.has(normalized);
}

function isMatterComplete(value) {
  const normalized = normalizeStatus(value);
  return !!normalized && !INCOMPLETE_VALUES.has(normalized);
}

function isUnavailable(value) {
  const normalized = normalizeStatus(value);
  return ["N/A", "NA", "NONE"].includes(normalized);
}

function buildOutstandingItems(matter) {
  if (!matter) return [];

  return PROCESS_ITEMS.reduce((items, item) => {
    const requested = matter[`${item.key}Requested`];
    const received = matter[`${item.key}Received`];

    if (isUnavailable(requested) && isUnavailable(received)) return items;
    if (isMatterComplete(received)) return items;
    if (!hasMatterValue(requested) && !hasMatterValue(received)) return items;

    items.push({
      label: item.label,
      requested: safeValue(requested, "Not requested yet"),
      received: safeValue(received, "Outstanding"),
    });

    return items;
  }, []);
}

function getCurrentStage(matter) {
  if (!matter) return "Select a matter";
  if (hasMatterValue(matter.registrationDate)) return "Registered";
  if (hasMatterValue(matter.deedsPrepDate)) return "On prep";
  if (hasMatterValue(matter.documentsLodgedDate)) return "Lodged";
  if (hasMatterValue(matter.municipalClearanceCertificateReceived)) return "Clearance certificate received";
  if (hasMatterValue(matter.municipalClearanceCertificateRequested)) return "Awaiting clearance certificate";
  if (hasMatterValue(matter.guaranteesFromBondAttorneysReceived)) return "Guarantees received";
  if (hasMatterValue(matter.guaranteesFromBondAttorneysRequested)) return "Awaiting guarantees";
  if (hasMatterValue(matter.transferDutyReceiptReceived)) return "Transfer duty received";
  if (hasMatterValue(matter.transferDutyReceiptRequested)) return "Awaiting transfer duty";
  if (hasMatterValue(matter.transferSignedSellerDate) && hasMatterValue(matter.transferSignedPurchaserDate)) return "Transfer documents signed";
  if (hasMatterValue(matter.sellerFicaDocumentsReceived) || hasMatterValue(matter.purchaserFicaDocumentsReceived)) return "FICA in progress";
  if (hasMatterValue(matter.instructionReceived)) return "Instruction received";
  return "Matter opened";
}

function getNextStep(matter, outstandingItems) {
  if (!matter) return "Select a matter to preview the portal.";
  if (hasMatterValue(matter.registrationDate)) return "Registration is recorded. Any final updates will be shared by the firm.";
  if (hasMatterValue(matter.deedsPrepDate)) return "The team is monitoring the Deeds Office process until registration is ready.";
  if (hasMatterValue(matter.documentsLodgedDate)) return "The matter is lodged and the next update will follow once the Deeds Office moves it forward.";
  if (outstandingItems[0]) return `The next focus is ${outstandingItems[0].label.toLowerCase()}.`;
  return "The matter is progressing and the next update will be shared as soon as there is movement.";
}

function buildMilestones(matter) {
  if (!matter) return [];

  return [
    { label: "Instruction received", value: matter.instructionReceived },
    { label: "FICA documents", value: matter.sellerFicaDocumentsReceived || matter.purchaserFicaDocumentsReceived },
    { label: "Transfer duty", value: matter.transferDutyReceiptReceived },
    { label: "Guarantees", value: matter.guaranteesFromBondAttorneysReceived },
    { label: "Clearance certificate", value: matter.municipalClearanceCertificateReceived },
    { label: "Documents lodged", value: matter.documentsLodgedDate },
    { label: "Registration", value: matter.registrationDate },
  ].map((item) => ({
    ...item,
    completed: isMatterComplete(item.value),
    displayValue: safeValue(item.value, "Pending"),
  }));
}

function buildMatterLabel(matter) {
  if (!matter) return "";
  return `${safeValue(matter.reference, "No reference")} — ${safeValue(matter.parties, "No parties")}`;
}

function statusLabel(link) {
  if (!link) return "";
  if (link.status === "revoked") return "Revoked";
  if (link.status === "expired") return "Expired";
  return "Active";
}

export default function PortalCentre() {
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [portalType, setPortalType] = useState("party");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [note, setNote] = useState("");
  const [links, setLinks] = useState([]);
  const [createdLink, setCreatedLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    injectPortalCentreStyles();
  }, []);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await axios.get(`${BASE_URL}/api/cases`, { headers: getAuthHeaders() });
      const safeCases = Array.isArray(res.data) ? res.data : [];
      const sorted = [...safeCases].sort((a, b) => {
        const aActive = a?.isActive === false ? 1 : 0;
        const bActive = b?.isActive === false ? 1 : 0;
        if (aActive !== bActive) return aActive - bActive;
        return String(a?.reference || "").localeCompare(String(b?.reference || ""));
      });
      setCases(sorted);
      if (!selectedCaseId && sorted[0]?._id) setSelectedCaseId(sorted[0]._id);
    } catch (err) {
      console.error("Portal Centre cases fetch error:", err);
      setError("Could not load matters. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedCaseId]);

  const fetchLinks = useCallback(async (caseId) => {
    if (!caseId) {
      setLinks([]);
      return;
    }

    try {
      const res = await axios.get(`${BASE_URL}/api/portal-links`, {
        params: { caseId },
        headers: getAuthHeaders(),
      });
      setLinks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Portal links fetch error:", err);
      setLinks([]);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    fetchLinks(selectedCaseId);
    setCreatedLink(null);
    setCopied(false);
  }, [fetchLinks, selectedCaseId]);

  const selectedMatter = useMemo(
    () => cases.find((matter) => String(matter._id) === String(selectedCaseId)) || null,
    [cases, selectedCaseId]
  );

  const activeMattersCount = useMemo(
    () => cases.filter((matter) => matter?.isActive !== false).length,
    [cases]
  );

  const filteredCases = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return cases;

    return cases.filter((matter) => {
      const haystack = [matter.reference, matter.parties, matter.agency, matter.agent, matter.property]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(query);
    });
  }, [cases, searchTerm]);

  const outstandingItems = useMemo(() => buildOutstandingItems(selectedMatter), [selectedMatter]);
  const stage = useMemo(() => getCurrentStage(selectedMatter), [selectedMatter]);
  const nextStep = useMemo(() => getNextStep(selectedMatter, outstandingItems), [selectedMatter, outstandingItems]);
  const milestones = useMemo(() => buildMilestones(selectedMatter), [selectedMatter]);
  const activeLinks = links.filter((link) => link.status === "active").length;

  const handleGenerateLink = async () => {
    if (!selectedMatter?._id) {
      setError("Please select a matter first.");
      return;
    }

    setLinkLoading(true);
    setError("");
    setCreatedLink(null);
    setCopied(false);

    try {
      const res = await axios.post(
        `${BASE_URL}/api/portal-links`,
        {
          caseId: selectedMatter._id,
          portalType,
          recipientName,
          recipientEmail,
          expiresInDays,
          note,
        },
        { headers: getAuthHeaders() }
      );

      setCreatedLink(res.data);
      await fetchLinks(selectedMatter._id);
    } catch (err) {
      console.error("Portal link create error:", err);
      setError(err?.response?.data?.message || "Could not create the portal link. Please try again.");
    } finally {
      setLinkLoading(false);
    }
  };

  const handleCopy = async () => {
    const url = createdLink?.portalUrl;
    if (!url) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error("Copy failed:", err);
      setError("The link was created, but could not be copied automatically.");
    }
  };

  const handleRevoke = async (linkId) => {
    try {
      await axios.delete(`${BASE_URL}/api/portal-links/${linkId}`, { headers: getAuthHeaders() });
      await fetchLinks(selectedCaseId);
    } catch (err) {
      console.error("Portal link revoke error:", err);
      setError("Could not revoke that link. Please try again.");
    }
  };

  return (
    <div className="gba-portal-centre-page">
      <div className="gba-portal-centre-shell">
        <section className="gba-portal-hero">
          <div className="gba-portal-hero-content">
            <span className="gba-portal-kicker"><FaShieldAlt /> Secure Portal Links</span>
            <h1>Share clean matter progress without opening the full file.</h1>
            <p>
              Generate a private progress link for an agent, buyer, or seller. Each link is limited to the selected matter,
              expires automatically, and shows only the update view they need.
            </p>
          </div>
          <div className="gba-portal-hero-card" aria-label="Portal summary">
            <div className="gba-portal-stat">
              <strong>{activeMattersCount}</strong>
              <span>Active matters</span>
            </div>
            <div className="gba-portal-stat">
              <strong>{activeLinks}</strong>
              <span>Active links</span>
            </div>
            <div className="gba-portal-stat">
              <strong>{outstandingItems.length}</strong>
              <span>Outstanding items</span>
            </div>
            <div className="gba-portal-stat">
              <strong>{expiresInDays}</strong>
              <span>Days before expiry</span>
            </div>
          </div>
        </section>

        <section className="gba-portal-grid">
          <div className="sticky gba-portal-panel">
            <div className="gba-portal-panel-head">
              <div>
                <h2>Create portal link</h2>
                <p>Select the matter, choose who the link is for, and copy the secure link when it is ready.</p>
              </div>
              <span className="gba-portal-pill gold"><FaLock /> Secure</span>
            </div>

            {error && (
              <div className="gba-portal-alert error">
                <FaBan />
                <span>{error}</span>
              </div>
            )}

            <div className="gba-portal-choice-grid" role="group" aria-label="Portal type">
              <button
                type="button"
                className={portalType === "party" ? "gba-portal-choice active" : "gba-portal-choice"}
                onClick={() => setPortalType("party")}
              >
                <FaUserFriends />
                <span>
                  <strong>Buyer / seller portal</strong>
                  <span>Simplified progress, documents, costs, next step, and firm contact details.</span>
                </span>
              </button>
              <button
                type="button"
                className={portalType === "agent" ? "gba-portal-choice active" : "gba-portal-choice"}
                onClick={() => setPortalType("agent")}
              >
                <FaUserTie />
                <span>
                  <strong>Agent portal</strong>
                  <span>Agent-friendly progress view with current stage, outstanding items, and report download.</span>
                </span>
              </button>
            </div>

            <div className="gba-portal-field">
              <label htmlFor="portal-search">Find matter <small>reference, parties, agency, agent, property</small></label>
              <div className="gba-portal-case-search">
                <FaSearch />
                <input
                  id="portal-search"
                  className="gba-portal-input"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search matters..."
                />
              </div>
            </div>

            <div className="gba-portal-field">
              <label htmlFor="portal-case">Selected matter <small>{filteredCases.length} shown</small></label>
              <select
                id="portal-case"
                className="gba-portal-select"
                value={selectedCaseId}
                onChange={(event) => setSelectedCaseId(event.target.value)}
                disabled={loading}
              >
                {loading && <option value="">Loading matters...</option>}
                {!loading && filteredCases.length === 0 && <option value="">No matters found</option>}
                {!loading && filteredCases.map((matter) => (
                  <option key={matter._id} value={matter._id}>
                    {buildMatterLabel(matter)}
                  </option>
                ))}
              </select>
            </div>

            <div className="gba-portal-choice-grid">
              <div className="gba-portal-field">
                <label htmlFor="portal-recipient-name">Recipient name <small>optional</small></label>
                <input
                  id="portal-recipient-name"
                  className="gba-portal-input"
                  value={recipientName}
                  onChange={(event) => setRecipientName(event.target.value)}
                  placeholder="Client or agent name"
                />
              </div>
              <div className="gba-portal-field">
                <label htmlFor="portal-recipient-email">Recipient email <small>optional</small></label>
                <input
                  id="portal-recipient-email"
                  className="gba-portal-input"
                  type="email"
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                  placeholder="name@example.co.za"
                />
              </div>
            </div>

            <div className="gba-portal-field">
              <label htmlFor="portal-expiry">Link expiry</label>
              <select
                id="portal-expiry"
                className="gba-portal-select"
                value={expiresInDays}
                onChange={(event) => setExpiresInDays(Number(event.target.value))}
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>

            <div className="gba-portal-field">
              <label htmlFor="portal-note">Internal note <small>optional</small></label>
              <textarea
                id="portal-note"
                className="gba-portal-textarea"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Example: Shared with seller after Monday update."
              />
            </div>

            <div className="gba-portal-buttons">
              <button type="button" className="gba-portal-button secondary" onClick={fetchCases} disabled={loading}>
                <FaRedo /> Refresh matters
              </button>
              <button type="button" className="gba-portal-button" onClick={handleGenerateLink} disabled={linkLoading || !selectedMatter}>
                <FaLink /> {linkLoading ? "Generating..." : "Generate link"}
              </button>
            </div>

            {createdLink?.portalUrl && (
              <div className="gba-portal-link-box">
                <div className="gba-portal-alert success">
                  <FaCheckCircle />
                  <span>The secure portal link is ready. Copy it and share it with the correct recipient.</span>
                </div>
                <div className="gba-portal-link-row">
                  <input className="gba-portal-input" value={createdLink.portalUrl} readOnly aria-label="Generated portal link" />
                  <button type="button" className="gba-portal-button secondary" onClick={handleCopy}>
                    <FaCopy /> {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="gba-portal-centre-shell">
            <article className="gba-portal-preview-card">
              <div className="gba-portal-preview-head">
                <div>
                  <span className="gba-portal-kicker"><FaEye /> Portal Preview</span>
                  <h2>{portalType === "agent" ? "Agent progress view" : "Client progress view"}</h2>
                  <p>{selectedMatter ? buildMatterLabel(selectedMatter) : "Select a matter to preview the shared progress page."}</p>
                </div>
                <span className="gba-portal-pill gold">{portalType === "agent" ? "Agent" : "Buyer / seller"}</span>
              </div>

              <div className="gba-portal-preview-body">
                <div className="gba-portal-summary-grid">
                  <div className="gba-portal-summary-tile">
                    <span>Current stage</span>
                    <strong>{stage}</strong>
                  </div>
                  <div className="gba-portal-summary-tile">
                    <span>Last update</span>
                    <strong>{formatDate(selectedMatter?.updatedAt) || "Not recorded"}</strong>
                  </div>
                  <div className="gba-portal-summary-tile">
                    <span>Status</span>
                    <strong>{selectedMatter?.isActive === false ? "Inactive" : "Active"}</strong>
                  </div>
                  <div className="gba-portal-summary-tile">
                    <span>Property</span>
                    <strong>{safeValue(selectedMatter?.property)}</strong>
                  </div>
                  <div className="gba-portal-summary-tile">
                    <span>Purchase price</span>
                    <strong>{safeValue(selectedMatter?.purchasePrice)}</strong>
                  </div>
                  <div className="gba-portal-summary-tile">
                    <span>Contact</span>
                    <strong>Conveyancing team</strong>
                  </div>
                </div>

                <div className="gba-portal-alert">
                  <FaClipboardList />
                  <span>{nextStep}</span>
                </div>

                <section className="gba-portal-outstanding">
                  <h3 className="gba-portal-section-title">
                    Outstanding items
                    <span className="gba-portal-status-pill">{outstandingItems.length} open</span>
                  </h3>
                  {outstandingItems.length ? (
                    <div className="gba-portal-outstanding-list">
                      {outstandingItems.slice(0, 8).map((item) => (
                        <div className="gba-portal-outstanding-row" key={item.label}>
                          <span className="gba-portal-dot" />
                          <div>
                            <strong>{item.label}</strong>
                            <small>Requested: {item.requested} · Received: {item.received}</small>
                          </div>
                          <span className="gba-portal-status-pill overdue">Outstanding</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="gba-portal-empty">No outstanding items are currently showing for this matter.</div>
                  )}
                </section>

                <section className="gba-portal-timeline">
                  <h3 className="gba-portal-section-title">
                    Progress timeline
                    <span className="gba-portal-status-pill">Live view</span>
                  </h3>
                  {milestones.length ? (
                    <div className="gba-portal-timeline-list">
                      {milestones.map((item) => (
                        <div className="gba-portal-timeline-row" key={item.label}>
                          <span className={item.completed ? "gba-portal-dot done" : "gba-portal-dot"} />
                          <div>
                            <strong>{item.label}</strong>
                            <small>{item.displayValue}</small>
                          </div>
                          <span className="gba-portal-status-pill">{item.completed ? "Done" : "Pending"}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="gba-portal-empty">Select a matter to see the timeline preview.</div>
                  )}
                </section>
              </div>
            </article>

            <section className="gba-portal-panel">
              <div className="gba-portal-panel-head">
                <div>
                  <h2>Portal link history</h2>
                  <p>Review active, expired, and revoked links for the selected matter.</p>
                </div>
                <span className="gba-portal-pill"><FaFileDownload /> Report available</span>
              </div>

              {links.length ? (
                <div className="gba-portal-history-list">
                  {links.map((link) => (
                    <div className="gba-portal-history-item" key={link._id}>
                      <div>
                        <span>{link.portalType === "agent" ? "Agent portal" : "Buyer / seller portal"}</span>
                        <strong>{link.recipientName || link.recipientEmail || "Recipient not recorded"}</strong>
                        <div className="gba-portal-history-meta">
                          <small>Created: {formatDate(link.createdAt) || "Not recorded"}</small>
                          <small>Expires: {formatDate(link.expiresAt) || "Not recorded"}</small>
                          <small>Views: {link.viewCount || 0}</small>
                        </div>
                      </div>
                      <div className="gba-portal-buttons" style={{ gridTemplateColumns: "auto", minWidth: 124 }}>
                        <span className={`gba-portal-status-pill ${link.status}`}>{statusLabel(link)}</span>
                        {link.status === "active" && (
                          <button type="button" className="gba-portal-button danger" onClick={() => handleRevoke(link._id)}>
                            <FaBan /> Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="gba-portal-empty">No portal links have been created for this matter yet.</div>
              )}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
