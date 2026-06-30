// src/components/AccountsHub.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import {
  FaCheckCircle,
  FaChevronRight,
  FaClock,
  FaDownload,
  FaEdit,
  FaExclamationTriangle,
  FaFileAlt,
  FaFilter,
  FaFolderOpen,
  FaPlus,
  FaPrint,
  FaRegFileAlt,
  FaSave,
  FaSearch,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

const BASE_URL = "https://case-tracking-backend.onrender.com";
const DAY_MS = 86400000;
const HIGH_VALUE_THRESHOLD = 2000000;
const NO_RECENT_NOTE_DAYS = 10;

const YES_NO = ["Yes", "No"];
const YES_NO_PARTIAL = ["No", "Partial", "Yes"];
const TRANSFER_DUTY_APPLICABLE = ["Yes", "No", "VAT transaction"];
const CLEARANCE_STATUSES = [
  "Not started",
  "Requested",
  "Figures received",
  "Awaiting payment",
  "Paid externally",
  "Confirmed complete",
  "Not applicable",
];
const FEE_STATUSES = ["Not ready", "Ready for review", "Done"];
const ACCOUNT_STATUSES = [
  "No accounts action",
  "Costs to request",
  "Awaiting costs",
  "Partial costs received",
  "Transfer duty pending",
  "Clearance pending",
  "Ready for final account",
  "Fees to review",
  "Complete",
  "Urgent",
];
const TASK_PRIORITIES = ["Low", "Normal", "High", "Urgent"];
const TASK_STATUSES = ["Open", "In progress", "Waiting", "Done"];
const TASK_CATEGORIES = [
  "Cost follow-up",
  "Transfer duty",
  "Clearance",
  "Disbursement",
  "Fees",
  "Report",
  "General admin",
];

const EMPTY_TASK = {
  title: "",
  matterReference: "",
  caseId: "",
  priority: "Normal",
  dueDate: "",
  category: "General admin",
  status: "Open",
  notes: "",
};

function injectAccountsHubCss() {
  if (document.getElementById("gba-accounts-hub-css")) return;

  const style = document.createElement("style");
  style.id = "gba-accounts-hub-css";
  style.innerHTML = `
    .gba-accounts-page {
      min-height: calc(100vh - var(--topbar-height));
      padding: clamp(12px, 1.2vw, 20px);
      color: var(--text);
    }

    .gba-accounts-page-inner {
      width: 100%;
      max-width: 1920px;
      margin: 0 auto;
      display: grid;
      gap: 14px;
    }

    .gba-accounts-hero {
      position: relative;
      overflow: hidden;
      border-radius: 28px;
      border: 1px solid rgba(16, 42, 74, 0.1);
      background:
        radial-gradient(circle at 12% 15%, rgba(210, 172, 104, 0.26), transparent 28rem),
        linear-gradient(135deg, rgba(255,255,255,0.94), rgba(248,250,253,0.9));
      box-shadow: 12px 16px 34px var(--shadow-lo), -10px -10px 26px var(--shadow-hi);
      padding: clamp(18px, 2vw, 28px);
    }

    :root[data-theme="dark"] .gba-accounts-hero {
      background:
        radial-gradient(circle at 12% 15%, rgba(210, 172, 104, 0.18), transparent 28rem),
        linear-gradient(135deg, rgba(16, 27, 44, 0.96), rgba(19, 34, 58, 0.92));
    }

    .gba-accounts-hero-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(420px, 620px);
      gap: 18px;
      align-items: center;
    }

    .gba-accounts-kicker {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      padding: 8px 12px;
      border-radius: 999px;
      color: var(--color-primary);
      background: rgba(210, 172, 104, 0.18);
      font-size: 12px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .gba-accounts-hero h1 {
      margin: 0;
      color: var(--color-primary);
      font-size: clamp(26px, 2.2vw, 42px);
      line-height: 1.05;
      letter-spacing: -0.04em;
      font-weight: 950;
    }

    .gba-accounts-hero p {
      max-width: 820px;
      margin: 10px 0 0;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.65;
      font-weight: 700;
    }

    .gba-accounts-hero-actions {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 10px;
      align-items: center;
    }

    .gba-accounts-search {
      position: relative;
      min-width: 0;
    }

    .gba-accounts-search svg {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-primary);
      pointer-events: none;
    }

    .gba-accounts-search input,
    .gba-accounts-field input,
    .gba-accounts-field select,
    .gba-accounts-field textarea {
      width: 100%;
      border: 1px solid rgba(16, 42, 74, 0.1);
      border-radius: 15px;
      background: var(--surface);
      color: var(--text);
      outline: none;
      padding: 12px 13px;
      font-weight: 800;
      box-shadow: inset 2px 2px 6px rgba(16, 42, 74, 0.08), inset -2px -2px 6px rgba(255, 255, 255, 0.72);
    }

    .gba-accounts-search input {
      min-height: 48px;
      padding-left: 42px;
    }

    .gba-accounts-field textarea {
      min-height: 92px;
      resize: vertical;
      line-height: 1.45;
    }

    .gba-accounts-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      min-height: 44px;
      border: 1px solid rgba(16, 42, 74, 0.1);
      border-radius: 15px;
      padding: 0 14px;
      background: var(--surface);
      color: var(--color-primary);
      font-weight: 950;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 0 10px 22px rgba(16, 42, 74, 0.08);
      transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
      white-space: nowrap;
    }

    .gba-accounts-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 14px 28px rgba(16, 42, 74, 0.12);
    }

    .gba-accounts-btn.primary {
      color: #071f39;
      border-color: rgba(255,255,255,.34);
      background: linear-gradient(135deg, var(--color-accent-2), #d2ac68 68%, #b98a39);
    }

    .gba-accounts-btn.danger {
      color: #7f1d1d;
      background: #fee2e2;
      border-color: #fecaca;
    }

    .gba-accounts-btn.icon-only {
      width: 42px;
      padding: 0;
    }

    .gba-accounts-summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .gba-accounts-card {
      position: relative;
      overflow: hidden;
      min-height: 126px;
      border: 1px solid rgba(16, 42, 74, 0.1);
      border-radius: 22px;
      padding: 16px;
      background: var(--surface);
      box-shadow: 10px 14px 30px var(--shadow-lo), -8px -8px 22px var(--shadow-hi);
    }

    .gba-accounts-card::after {
      content: "";
      position: absolute;
      inset: auto -24px -44px auto;
      width: 112px;
      height: 112px;
      border-radius: 999px;
      background: rgba(210, 172, 104, 0.14);
      pointer-events: none;
    }

    .gba-accounts-card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      position: relative;
      z-index: 1;
    }

    .gba-accounts-card-icon {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 14px;
      color: var(--color-primary);
      background: rgba(210, 172, 104, 0.18);
    }

    .gba-accounts-card strong {
      display: block;
      margin-top: 14px;
      font-size: 30px;
      line-height: 1;
      color: var(--color-primary);
      font-weight: 950;
      position: relative;
      z-index: 1;
    }

    .gba-accounts-card span,
    .gba-accounts-card p {
      position: relative;
      z-index: 1;
    }

    .gba-accounts-card span {
      color: var(--text);
      font-size: 13px;
      font-weight: 950;
    }

    .gba-accounts-card p {
      margin: 9px 0 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
      font-weight: 700;
    }

    .gba-accounts-layout-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(340px, 440px);
      gap: 14px;
      align-items: start;
    }

    .gba-accounts-panel {
      border: 1px solid rgba(16, 42, 74, 0.1);
      border-radius: 24px;
      background: var(--surface);
      box-shadow: 10px 14px 30px var(--shadow-lo), -8px -8px 22px var(--shadow-hi);
      padding: 16px;
      min-width: 0;
    }

    .gba-accounts-panel-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 13px;
    }

    .gba-accounts-panel-head h2,
    .gba-accounts-panel-head h3 {
      margin: 0;
      color: var(--color-primary);
      font-size: 19px;
      font-weight: 950;
      letter-spacing: -0.02em;
    }

    .gba-accounts-panel-head p {
      margin: 5px 0 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
      font-weight: 700;
    }

    .gba-accounts-filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .gba-accounts-filter-chip {
      border: 1px solid rgba(16, 42, 74, 0.1);
      border-radius: 999px;
      background: var(--surface-soft);
      color: var(--text);
      padding: 8px 11px;
      font-size: 12px;
      font-weight: 900;
      cursor: pointer;
    }

    .gba-accounts-filter-chip.active,
    .gba-accounts-filter-chip:hover {
      color: #071f39;
      border-color: rgba(210,172,104,.58);
      background: linear-gradient(135deg, #f3c86f, #d2ac68);
    }

    .gba-accounts-table-scroller {
      width: 100%;
      overflow: auto;
      border-radius: 18px;
      border: 1px solid rgba(16, 42, 74, 0.09);
    }

    .gba-accounts-table {
      width: 100%;
      min-width: 1680px;
      border-collapse: collapse;
      background: var(--surface);
    }

    .gba-accounts-table th {
      position: sticky;
      top: 0;
      z-index: 1;
      text-align: left;
      padding: 12px 10px;
      color: #fff;
      background: linear-gradient(135deg, var(--color-primary), #071f39);
      font-size: 11px;
      letter-spacing: .04em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .gba-accounts-table td {
      padding: 11px 10px;
      border-bottom: 1px solid rgba(16, 42, 74, 0.08);
      vertical-align: top;
      font-size: 13px;
      color: var(--text);
    }

    .gba-accounts-table tr:hover td {
      background: rgba(210, 172, 104, 0.08);
    }

    .gba-accounts-ref {
      display: grid;
      gap: 4px;
      min-width: 120px;
    }

    .gba-accounts-ref strong,
    .gba-accounts-cell-strong {
      color: var(--color-primary);
      font-weight: 950;
    }

    .gba-accounts-muted {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }

    .gba-accounts-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      padding: 7px 10px;
      font-size: 12px;
      font-weight: 950;
      white-space: nowrap;
      border: 1px solid rgba(16,42,74,.1);
      background: #f1f5f9;
      color: #334155;
    }

    .gba-accounts-status-pill.healthy,
    .gba-accounts-status-pill.complete {
      background: #dcfce7;
      border-color: #bbf7d0;
      color: #14532d;
    }

    .gba-accounts-status-pill.waiting,
    .gba-accounts-status-pill.review {
      background: #fef3c7;
      border-color: #fde68a;
      color: #713f12;
    }

    .gba-accounts-status-pill.urgent {
      background: #fee2e2;
      border-color: #fecaca;
      color: #7f1d1d;
    }

    .gba-accounts-status-pill.pending {
      background: #ffedd5;
      border-color: #fed7aa;
      color: #7c2d12;
    }

    .gba-accounts-drawer-backdrop {
      position: fixed;
      inset: 0;
      z-index: 130;
      background: rgba(7, 31, 57, 0.32);
      backdrop-filter: blur(4px);
    }

    .gba-accounts-drawer {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 140;
      width: min(920px, calc(100vw - 20px));
      height: 100vh;
      overflow: auto;
      background: var(--bg);
      color: var(--text);
      border-left: 1px solid rgba(16,42,74,.14);
      box-shadow: -22px 0 60px rgba(7,31,57,.26);
      padding: 18px;
    }

    .gba-accounts-drawer-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 16px;
      border-radius: 24px;
      background: var(--surface);
      border: 1px solid rgba(16,42,74,.1);
      box-shadow: 0 14px 30px rgba(16,42,74,.08);
      margin-bottom: 14px;
    }

    .gba-accounts-drawer-head h2 {
      margin: 6px 0 4px;
      color: var(--color-primary);
      font-size: 26px;
      font-weight: 950;
      letter-spacing: -0.03em;
    }

    .gba-accounts-drawer-head p {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
      font-weight: 700;
    }

    .gba-accounts-form-section {
      display: grid;
      gap: 12px;
      padding: 16px;
      margin-bottom: 14px;
      border-radius: 22px;
      background: var(--surface);
      border: 1px solid rgba(16,42,74,.1);
      box-shadow: 0 10px 24px rgba(16,42,74,.075);
    }

    .gba-accounts-form-section h3 {
      margin: 0;
      color: var(--color-primary);
      font-size: 17px;
      font-weight: 950;
    }

    .gba-accounts-form-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .gba-accounts-field {
      display: grid;
      gap: 7px;
      min-width: 0;
    }

    .gba-accounts-field.full {
      grid-column: 1 / -1;
    }

    .gba-accounts-field label {
      color: var(--muted);
      font-size: 12px;
      font-weight: 950;
      letter-spacing: .04em;
      text-transform: uppercase;
    }

    .gba-disbursement-row {
      display: grid;
      grid-template-columns: minmax(190px, 1fr) 130px 116px 106px minmax(190px, 1fr) 42px;
      gap: 9px;
      align-items: end;
      padding: 10px;
      border-radius: 16px;
      background: var(--surface-soft);
      border: 1px solid rgba(16,42,74,.08);
    }

    .gba-task-list {
      display: grid;
      gap: 9px;
    }

    .gba-task-card {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      padding: 12px;
      border-radius: 18px;
      background: var(--surface-soft);
      border: 1px solid rgba(16,42,74,.08);
    }

    .gba-task-card h4 {
      margin: 0;
      color: var(--color-primary);
      font-size: 14px;
      font-weight: 950;
    }

    .gba-task-card p {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
      font-weight: 700;
    }

    .gba-report-preview {
      display: grid;
      gap: 10px;
    }

    .gba-report-section {
      padding: 12px;
      border-radius: 16px;
      background: var(--surface-soft);
      border: 1px solid rgba(16,42,74,.08);
    }

    .gba-report-section h4 {
      margin: 0 0 8px;
      color: var(--color-primary);
      font-weight: 950;
    }

    .gba-report-section ul {
      margin: 0;
      padding-left: 18px;
      color: var(--text);
      font-size: 13px;
      line-height: 1.55;
      font-weight: 700;
    }

    .gba-sidebar-accounts-panel {
      display: grid;
      gap: 12px;
      min-width: 0;
    }

    .gba-sidebar-accounts-panel .gba-sidebar-copy strong {
      font-size: 18px;
    }

    .gba-sidebar-accounts-filters {
      display: grid;
      gap: 8px;
    }

    .gba-sidebar-accounts-filters button {
      justify-content: space-between;
      width: 100%;
    }

    @media (max-width: 1500px) {
      .gba-accounts-hero-grid,
      .gba-accounts-layout-grid {
        grid-template-columns: 1fr;
      }

      .gba-accounts-summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 820px) {
      .gba-accounts-hero-actions,
      .gba-accounts-form-grid,
      .gba-disbursement-row {
        grid-template-columns: 1fr;
      }

      .gba-accounts-summary-grid {
        grid-template-columns: 1fr;
      }

      .gba-accounts-drawer {
        width: 100vw;
      }
    }
  `;
  document.head.appendChild(style);
}

function safeText(value, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function hasMeaning(value) {
  const text = String(value ?? "").trim().toUpperCase();
  return !!text && !["N/A", "NA", "NO", "NONE", "NULL", "UNDEFINED", "—"].includes(text);
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [y, m, d] = trimmed.slice(0, 10).split("-");
    const parsed = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/");
    const parsed = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toInputDate(value) {
  const parsed = parseDate(value);
  if (!parsed) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  const parsed = parseDate(value);
  if (!parsed) return safeText(value);
  return parsed.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function daysSince(value) {
  const parsed = parseDate(value);
  if (!parsed) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return Math.floor((today - parsed) / DAY_MS);
}

function parseMoney(value) {
  const numeric = String(value ?? "")
    .replace(/[^0-9.,-]/g, "")
    .replace(/,/g, "");
  const amount = Number(numeric);
  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value) {
  const amount = parseMoney(value);
  if (!amount) return safeText(value);
  return `R ${amount.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

function getMatterStage(caseItem) {
  if (hasMeaning(caseItem.registrationDate)) return "Registered / completed";
  if (hasMeaning(caseItem.deedsPrepDate)) return "On prep";
  if (hasMeaning(caseItem.documentsLodgedDate)) return "Lodged";
  if (hasMeaning(caseItem.transferSignedSellerDate) || hasMeaning(caseItem.transferSignedPurchaserDate)) return "Documents signed";
  if (hasMeaning(caseItem.transferCostReceived)) return "Costs received";
  if (hasMeaning(caseItem.transferCostRequested)) return "Costs requested";
  return "Instruction received";
}

function getDefaultAccounts(caseItem = {}) {
  return {
    costCollection: {
      costEstimateSent: hasMeaning(caseItem.transferCostRequested) ? "Yes" : "No",
      dateSent: toInputDate(caseItem.transferCostRequested),
      amountRequested: "",
      amountReceived: "",
      dateReceived: toInputDate(caseItem.transferCostReceived),
      shortfallAmount: "",
      reminderRequired: "No",
      costsReceivedStatus: hasMeaning(caseItem.transferCostReceived)
        ? String(caseItem.transferCostReceived).toUpperCase() === "PARTLY"
          ? "Partial"
          : "Yes"
        : "No",
      notes: "",
    },
    transferDuty: {
      applicable: "Yes",
      amount: "",
      submitted: hasMeaning(caseItem.transferDutyReceiptRequested) ? "Yes" : "No",
      receiptReceived: hasMeaning(caseItem.transferDutyReceiptReceived) ? "Yes" : "No",
      dateCompleted: toInputDate(caseItem.transferDutyReceiptReceived),
      notes: "",
    },
    clearanceCosts: {
      ratesClearanceAmount: "",
      ratesClearanceStatus: hasMeaning(caseItem.municipalClearanceFiguresReceived)
        ? "Figures received"
        : hasMeaning(caseItem.municipalClearanceFiguresRequested)
          ? "Requested"
          : "Not started",
      levyClearanceAmount: "",
      levyClearanceStatus: hasMeaning(caseItem.levyClearanceCertificateReceived)
        ? "Confirmed complete"
        : hasMeaning(caseItem.levyClearanceCertificateRequested)
          ? "Pending"
          : "Not applicable",
      hoaClearanceAmount: "",
      hoaStatus: hasMeaning(caseItem.hoaCertificateReceived)
        ? "Confirmed complete"
        : hasMeaning(caseItem.hoaCertificateRequested)
          ? "Pending"
          : "Not applicable",
      notes: "",
    },
    disbursements: [],
    firmFee: {
      matterRegistered: hasMeaning(caseItem.registrationDate) ? "Yes" : "No",
      finalAccountPrepared: "No",
      firmFeeAmount: "",
      feeStatus: hasMeaning(caseItem.registrationDate) ? "Ready for review" : "Not ready",
      notes: "",
    },
    accountsStatus: "No accounts action",
    lastAccountsNote: "",
    highPriorityNote: "",
    includeInWeeklyReport: false,
    reportPriority: "Normal",
  };
}

function normaliseAccounts(caseItem) {
  const defaults = getDefaultAccounts(caseItem);
  const accounts = caseItem?.accounts && typeof caseItem.accounts === "object" ? caseItem.accounts : {};
  const clearance = { ...defaults.clearanceCosts, ...(accounts.clearanceCosts || {}) };

  if (clearance.levyClearanceStatus === "Pending") clearance.levyClearanceStatus = "Requested";
  if (clearance.hoaStatus === "Pending") clearance.hoaStatus = "Requested";

  return {
    ...defaults,
    ...accounts,
    costCollection: { ...defaults.costCollection, ...(accounts.costCollection || {}) },
    transferDuty: { ...defaults.transferDuty, ...(accounts.transferDuty || {}) },
    clearanceCosts: clearance,
    disbursements: Array.isArray(accounts.disbursements) ? accounts.disbursements : defaults.disbursements,
    firmFee: { ...defaults.firmFee, ...(accounts.firmFee || {}) },
  };
}

function clearancePending(accounts) {
  const statuses = [
    accounts.clearanceCosts?.ratesClearanceStatus,
    accounts.clearanceCosts?.levyClearanceStatus,
    accounts.clearanceCosts?.hoaStatus,
  ];
  return statuses.some((status) => ["Not started", "Requested", "Figures received", "Awaiting payment"].includes(status));
}

function deriveAccountsStatus(caseItem) {
  const accounts = normaliseAccounts(caseItem);
  if (accounts.accountsStatus && accounts.accountsStatus !== "No accounts action") return accounts.accountsStatus;

  if (accounts.highPriorityNote) return "Urgent";
  if (accounts.costCollection?.costEstimateSent !== "Yes") return "Costs to request";
  if (accounts.costCollection?.costsReceivedStatus === "Partial") return "Partial costs received";
  if (accounts.costCollection?.costsReceivedStatus !== "Yes") return "Awaiting costs";
  if (accounts.transferDuty?.applicable !== "No" && accounts.transferDuty?.receiptReceived !== "Yes") return "Transfer duty pending";
  if (clearancePending(accounts)) return "Clearance pending";
  if (hasMeaning(caseItem.registrationDate) && accounts.firmFee?.finalAccountPrepared !== "Yes") return "Ready for final account";
  if (hasMeaning(caseItem.registrationDate) && accounts.firmFee?.feeStatus !== "Done") return "Fees to review";
  if (accounts.firmFee?.feeStatus === "Done") return "Complete";
  return "No accounts action";
}

function statusTone(status) {
  if (status === "Complete") return "complete";
  if (["Awaiting costs", "Partial costs received", "Ready for final account", "Fees to review"].includes(status)) return "waiting";
  if (["Transfer duty pending", "Clearance pending", "Costs to request"].includes(status)) return "pending";
  if (status === "Urgent") return "urgent";
  return "healthy";
}

function paymentLabel(status) {
  if (status === "Yes") return "Yes";
  if (status === "Partial") return "Partial";
  return "No";
}

function reportDateRange() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toInputDate(start.toISOString()), end: toInputDate(end.toISOString()) };
}

function buildReportItem(caseItem, reason) {
  const accounts = normaliseAccounts(caseItem);
  return {
    id: caseItem._id,
    reference: safeText(caseItem.reference),
    parties: safeText(caseItem.parties),
    agent: safeText(caseItem.agent),
    attorney: safeText(caseItem.createdBy?.username || caseItem.createdBy),
    property: safeText(caseItem.property),
    purchasePrice: safeText(caseItem.purchasePrice),
    accountsStatus: deriveAccountsStatus(caseItem),
    lastAccountsNote: safeText(accounts.lastAccountsNote, "No accounts note"),
    reason,
  };
}

function buildWeeklyReportSections(cases) {
  const sections = {
    costsOutstanding: [],
    transferDutyPending: [],
    clearancePending: [],
    registeredNeedingReview: [],
    highPriorityNotes: [],
    completedThisWeek: [],
  };

  cases.forEach((caseItem) => {
    const accounts = normaliseAccounts(caseItem);
    const status = deriveAccountsStatus(caseItem);

    if (accounts.costCollection?.costEstimateSent === "Yes" && accounts.costCollection?.costsReceivedStatus !== "Yes") {
      sections.costsOutstanding.push(buildReportItem(caseItem, `Costs ${accounts.costCollection?.costsReceivedStatus === "Partial" ? "partially received" : "not received"}`));
    }

    if (accounts.transferDuty?.applicable !== "No" && accounts.transferDuty?.receiptReceived !== "Yes") {
      sections.transferDutyPending.push(buildReportItem(caseItem, accounts.transferDuty?.submitted === "Yes" ? "Submitted, receipt still pending" : "Transfer duty not completed"));
    }

    if (clearancePending(accounts)) {
      sections.clearancePending.push(buildReportItem(caseItem, `Rates: ${accounts.clearanceCosts?.ratesClearanceStatus}; Levy: ${accounts.clearanceCosts?.levyClearanceStatus}; HOA: ${accounts.clearanceCosts?.hoaStatus}`));
    }

    if (hasMeaning(caseItem.registrationDate) && (accounts.firmFee?.finalAccountPrepared !== "Yes" || accounts.firmFee?.feeStatus !== "Done")) {
      sections.registeredNeedingReview.push(buildReportItem(caseItem, `Final account: ${accounts.firmFee?.finalAccountPrepared}; Fee status: ${accounts.firmFee?.feeStatus}`));
    }

    if (accounts.highPriorityNote || accounts.includeInWeeklyReport || accounts.reportPriority === "Urgent" || status === "Urgent") {
      sections.highPriorityNotes.push(buildReportItem(caseItem, accounts.highPriorityNote || accounts.lastAccountsNote || "Marked for weekly accounts attention"));
    }

    const updatedDays = daysSince(accounts.updatedAt || caseItem.accountsUpdatedAt || caseItem.updatedAt);
    if (status === "Complete" && updatedDays !== null && updatedDays <= 7) {
      sections.completedThisWeek.push(buildReportItem(caseItem, "Accounts status completed this week"));
    }
  });

  return sections;
}

function flattenReportSections(sections) {
  return [
    ["Costs outstanding", sections.costsOutstanding],
    ["Transfer duty pending", sections.transferDutyPending],
    ["Clearance pending", sections.clearancePending],
    ["Registered matters needing accounts review", sections.registeredNeedingReview],
    ["High-priority accounts notes", sections.highPriorityNotes],
    ["Completed this week", sections.completedThisWeek],
  ];
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Field({ label, children, full = false }) {
  return (
    <div className={full ? "gba-accounts-field full" : "gba-accounts-field"}>
      <label>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ label, value, onChange, type = "text", full = false, placeholder = "" }) {
  return (
    <Field label={label} full={full}>
      <input type={type} value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function SelectInput({ label, value, options, onChange, full = false }) {
  return (
    <Field label={label} full={full}>
      <select value={value || options[0]} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </Field>
  );
}

function TextAreaInput({ label, value, onChange, full = true, placeholder = "" }) {
  return (
    <Field label={label} full={full}>
      <textarea value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function StatusPill({ status }) {
  const tone = statusTone(status);
  return <span className={`gba-accounts-status-pill ${tone}`}>{status}</span>;
}

function SummaryCard({ icon, label, value, description }) {
  return (
    <article className="gba-accounts-card">
      <div className="gba-accounts-card-top">
        <span>{label}</span>
        <div className="gba-accounts-card-icon">{icon}</div>
      </div>
      <strong>{value}</strong>
      <p>{description}</p>
    </article>
  );
}

function createMetrics(cases) {
  const metrics = {
    costsOutstanding: 0,
    transferDutyPending: 0,
    clearancePending: 0,
    feesNotTransferred: 0,
    missingAccountNotes: 0,
    reportsDue: 0,
    highValue: 0,
    readyForReview: 0,
  };

  cases.forEach((caseItem) => {
    const accounts = normaliseAccounts(caseItem);
    const status = deriveAccountsStatus(caseItem);
    const recentNoteAge = daysSince(accounts.updatedAt || caseItem.accountsUpdatedAt || caseItem.updatedAt);

    if (accounts.costCollection?.costEstimateSent === "Yes" && accounts.costCollection?.costsReceivedStatus !== "Yes") metrics.costsOutstanding += 1;
    if (accounts.transferDuty?.applicable !== "No" && accounts.transferDuty?.receiptReceived !== "Yes") metrics.transferDutyPending += 1;
    if (clearancePending(accounts)) metrics.clearancePending += 1;
    if (hasMeaning(caseItem.registrationDate) && accounts.firmFee?.feeStatus !== "Done") metrics.feesNotTransferred += 1;
    if (!accounts.lastAccountsNote || (recentNoteAge !== null && recentNoteAge > NO_RECENT_NOTE_DAYS)) metrics.missingAccountNotes += 1;
    if (accounts.includeInWeeklyReport || ["Urgent", "Fees to review", "Ready for final account"].includes(status)) metrics.reportsDue += 1;
    if (parseMoney(caseItem.purchasePrice) >= HIGH_VALUE_THRESHOLD) metrics.highValue += 1;
    if (["Ready for final account", "Fees to review", "Urgent"].includes(status)) metrics.readyForReview += 1;
  });

  return metrics;
}

const filterDefinitions = [
  { key: "all", label: "All matters", predicate: () => true },
  { key: "costsOutstanding", label: "Costs outstanding", predicate: (caseItem) => normaliseAccounts(caseItem).costCollection?.costEstimateSent === "Yes" && normaliseAccounts(caseItem).costCollection?.costsReceivedStatus !== "Yes" },
  { key: "costsReceived", label: "Costs received", predicate: (caseItem) => normaliseAccounts(caseItem).costCollection?.costsReceivedStatus === "Yes" },
  { key: "partialPayment", label: "Partial payment", predicate: (caseItem) => normaliseAccounts(caseItem).costCollection?.costsReceivedStatus === "Partial" },
  { key: "transferDutyPending", label: "Transfer duty pending", predicate: (caseItem) => normaliseAccounts(caseItem).transferDuty?.applicable !== "No" && normaliseAccounts(caseItem).transferDuty?.receiptReceived !== "Yes" },
  { key: "clearancePending", label: "Clearance pending", predicate: (caseItem) => clearancePending(normaliseAccounts(caseItem)) },
  { key: "feesNotDone", label: "Fees not done", predicate: (caseItem) => hasMeaning(caseItem.registrationDate) && normaliseAccounts(caseItem).firmFee?.feeStatus !== "Done" },
  { key: "registeredThisMonth", label: "Registered this month", predicate: (caseItem) => {
    const date = parseDate(caseItem.registrationDate);
    const now = new Date();
    return !!date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }},
  { key: "noAccountsUpdate", label: "No accounts update", predicate: (caseItem) => {
    const accounts = normaliseAccounts(caseItem);
    const age = daysSince(accounts.updatedAt || caseItem.accountsUpdatedAt || caseItem.updatedAt);
    return !accounts.lastAccountsNote || (age !== null && age > NO_RECENT_NOTE_DAYS);
  }},
  { key: "urgent", label: "Urgent", predicate: (caseItem) => deriveAccountsStatus(caseItem) === "Urgent" || normaliseAccounts(caseItem).reportPriority === "Urgent" },
  { key: "complete", label: "Complete", predicate: (caseItem) => deriveAccountsStatus(caseItem) === "Complete" },
];

export default function AccountsHub() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [cases, setCases] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [reportHistory, setReportHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [draftAccounts, setDraftAccounts] = useState(null);
  const [savingAccounts, setSavingAccounts] = useState(false);
  const [taskDraft, setTaskDraft] = useState(EMPTY_TASK);
  const [editingTaskId, setEditingTaskId] = useState("");
  const [reportVisible, setReportVisible] = useState(false);
  const [sidebarHost, setSidebarHost] = useState(null);

  const selectedCase = useMemo(() => cases.find((caseItem) => caseItem._id === selectedCaseId) || null, [cases, selectedCaseId]);
  const reportRange = useMemo(() => reportDateRange(), []);

  useEffect(() => {
    injectAccountsHubCss();
  }, []);

  useEffect(() => {
    const attachSidebarHost = () => setSidebarHost(document.getElementById("gba-sidebar-dynamic-slot"));
    attachSidebarHost();
    const timer = window.setTimeout(attachSidebarHost, 0);
    window.addEventListener("resize", attachSidebarHost);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", attachSidebarHost);
    };
  }, []);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const [caseRes, taskRes, reportRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/cases`, { headers }),
        axios.get(`${BASE_URL}/api/account-tasks`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/account-reports`, { headers }).catch(() => ({ data: [] })),
      ]);

      setCases(Array.isArray(caseRes.data) ? caseRes.data : []);
      setTasks(Array.isArray(taskRes.data) ? taskRes.data : []);
      setReportHistory(Array.isArray(reportRes.data) ? reportRes.data : []);
    } catch (err) {
      console.error("Accounts Hub load error:", err);
      setError("Accounts Hub could not load the matters. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, [headers, token]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const metrics = useMemo(() => createMetrics(cases), [cases]);

  const filteredCases = useMemo(() => {
    const filter = filterDefinitions.find((item) => item.key === activeFilter) || filterDefinitions[0];
    const query = searchQuery.trim().toLowerCase();

    return cases
      .filter((caseItem) => filter.predicate(caseItem))
      .filter((caseItem) => {
        if (!query) return true;
        const haystack = [
          caseItem.reference,
          caseItem.parties,
          caseItem.agent,
          caseItem.agency,
          caseItem.createdBy?.username,
          caseItem.property,
          caseItem.purchasePrice,
          deriveAccountsStatus(caseItem),
          getMatterStage(caseItem),
        ]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");
        return haystack.includes(query);
      })
      .sort((a, b) => {
        const aUrgent = deriveAccountsStatus(a) === "Urgent" ? 1 : 0;
        const bUrgent = deriveAccountsStatus(b) === "Urgent" ? 1 : 0;
        if (aUrgent !== bUrgent) return bUrgent - aUrgent;
        return safeText(a.reference, "").localeCompare(safeText(b.reference, ""));
      });
  }, [activeFilter, cases, searchQuery]);

  const weeklyReportSections = useMemo(() => buildWeeklyReportSections(cases), [cases]);
  const reportGroups = useMemo(() => flattenReportSections(weeklyReportSections), [weeklyReportSections]);

  const openAccountsPanel = (caseItem) => {
    setSelectedCaseId(caseItem._id);
    setDraftAccounts(normaliseAccounts(caseItem));
  };

  const closeAccountsPanel = () => {
    setSelectedCaseId("");
    setDraftAccounts(null);
    setSavingAccounts(false);
  };

  const updateDraft = (path, value) => {
    setDraftAccounts((prev) => {
      const next = { ...(prev || {}) };
      const keys = path.split(".");
      let cursor = next;
      keys.forEach((key, index) => {
        if (index === keys.length - 1) {
          cursor[key] = value;
        } else {
          cursor[key] = { ...(cursor[key] || {}) };
          cursor = cursor[key];
        }
      });
      return next;
    });
  };

  const addDisbursement = () => {
    setDraftAccounts((prev) => ({
      ...(prev || {}),
      disbursements: [
        ...((prev && Array.isArray(prev.disbursements)) ? prev.disbursements : []),
        { description: "", amount: "", recoverable: true, recovered: false, notes: "" },
      ],
    }));
  };

  const updateDisbursement = (index, field, value) => {
    setDraftAccounts((prev) => {
      const rows = Array.isArray(prev?.disbursements) ? [...prev.disbursements] : [];
      rows[index] = { ...(rows[index] || {}), [field]: value };
      return { ...(prev || {}), disbursements: rows };
    });
  };

  const removeDisbursement = (index) => {
    setDraftAccounts((prev) => {
      const rows = Array.isArray(prev?.disbursements) ? [...prev.disbursements] : [];
      rows.splice(index, 1);
      return { ...(prev || {}), disbursements: rows };
    });
  };

  const saveAccounts = async () => {
    if (!selectedCase || !draftAccounts) return;
    setSavingAccounts(true);

    try {
      const res = await axios.put(`${BASE_URL}/api/cases/${selectedCase._id}/accounts`, draftAccounts, { headers });
      const updated = res.data;
      setCases((prev) => prev.map((caseItem) => (caseItem._id === updated._id ? updated : caseItem)));
      setSelectedCaseId(updated._id);
      setDraftAccounts(normaliseAccounts(updated));
    } catch (err) {
      console.error("Accounts save error:", err);
      alert(err?.response?.data?.message || "Could not save the accounts control data.");
    } finally {
      setSavingAccounts(false);
    }
  };

  const resetTaskDraft = () => {
    setEditingTaskId("");
    setTaskDraft(EMPTY_TASK);
  };

  const saveTask = async (event) => {
    event.preventDefault();
    if (!taskDraft.title.trim()) {
      alert("Please enter a task title.");
      return;
    }

    try {
      const payload = { ...taskDraft };
      const selected = cases.find((caseItem) => caseItem._id === payload.caseId);
      if (selected && !payload.matterReference) payload.matterReference = selected.reference || "";

      const res = editingTaskId
        ? await axios.put(`${BASE_URL}/api/account-tasks/${editingTaskId}`, payload, { headers })
        : await axios.post(`${BASE_URL}/api/account-tasks`, payload, { headers });

      setTasks((prev) => {
        if (editingTaskId) return prev.map((task) => (task._id === res.data._id ? res.data : task));
        return [res.data, ...prev];
      });
      resetTaskDraft();
    } catch (err) {
      console.error("Task save error:", err);
      alert(err?.response?.data?.message || "Could not save the account task.");
    }
  };

  const editTask = (task) => {
    setEditingTaskId(task._id);
    setTaskDraft({
      title: task.title || "",
      matterReference: task.matterReference || "",
      caseId: task.caseId || "",
      priority: task.priority || "Normal",
      dueDate: task.dueDate || "",
      category: task.category || "General admin",
      status: task.status || "Open",
      notes: task.notes || "",
    });
  };

  const updateTaskStatus = async (task, status) => {
    try {
      const payload = { ...task, status };
      const res = await axios.put(`${BASE_URL}/api/account-tasks/${task._id}`, payload, { headers });
      setTasks((prev) => prev.map((item) => (item._id === task._id ? res.data : item)));
    } catch (err) {
      console.error("Task status update error:", err);
      alert("Could not update the task status.");
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this accounts task?")) return;
    try {
      await axios.delete(`${BASE_URL}/api/account-tasks/${taskId}`, { headers });
      setTasks((prev) => prev.filter((task) => task._id !== taskId));
    } catch (err) {
      console.error("Task delete error:", err);
      alert("Could not delete the task.");
    }
  };

  const exportExcel = () => {
    const rows = [["Section", "Reference", "Parties", "Agent", "Attorney", "Property", "Purchase Price", "Accounts Status", "Reason", "Last Accounts Note"]];
    reportGroups.forEach(([sectionName, items]) => {
      if (!items.length) {
        rows.push([sectionName, "No matters", "", "", "", "", "", "", "", ""]);
      } else {
        items.forEach((item) => {
          rows.push([
            sectionName,
            item.reference,
            item.parties,
            item.agent,
            item.attorney,
            item.property,
            item.purchasePrice,
            item.accountsStatus,
            item.reason,
            item.lastAccountsNote,
          ]);
        });
      }
    });

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `GBA-Weekly-Accounts-Report-${reportRange.start}.csv`);
  };

  const generatePdf = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const title = "Gerhard Barnard Inc — Weekly Accounts Report";
    const subtitle = `${formatDate(reportRange.start)} to ${formatDate(reportRange.end)}`;
    let y = 42;

    doc.setFontSize(18);
    doc.text(title, 40, y);
    y += 20;
    doc.setFontSize(10);
    doc.text(subtitle, 40, y);
    y += 22;

    reportGroups.forEach(([sectionName, items]) => {
      if (y > 500) {
        doc.addPage();
        y = 42;
      }

      doc.setFontSize(13);
      doc.text(sectionName, 40, y);
      y += 10;

      const body = items.length
        ? items.map((item) => [item.reference, item.parties, item.agent, item.accountsStatus, item.reason])
        : [["—", "No matters in this section", "", "", ""]];

      if (typeof doc.autoTable === "function") {
        doc.autoTable({
          startY: y + 6,
          head: [["Ref", "Parties", "Agent", "Status", "Reason"]],
          body,
          styles: { fontSize: 8, cellPadding: 5 },
          headStyles: { fillColor: [16, 42, 74] },
          margin: { left: 40, right: 40 },
        });
        y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : y + 74;
      } else {
        body.slice(0, 6).forEach((row) => {
          y += 15;
          doc.text(row.join(" | ").slice(0, 150), 40, y);
        });
        y += 18;
      }
    });

    doc.save(`GBA-Weekly-Accounts-Report-${reportRange.start}.pdf`);
  };

  const saveReportHistory = async (markSent = false) => {
    try {
      const res = await axios.post(
        `${BASE_URL}/api/account-reports`,
        {
          title: "Weekly Accounts Report",
          weekStart: reportRange.start,
          weekEnd: reportRange.end,
          sections: weeklyReportSections,
          sentAt: markSent ? new Date().toISOString() : null,
          notes: markSent ? "Marked as sent from Accounts Hub." : "Saved from Accounts Hub.",
        },
        { headers }
      );
      setReportHistory((prev) => [res.data, ...prev].slice(0, 30));
      alert(markSent ? "Weekly accounts report marked as sent and saved to history." : "Weekly accounts report saved to history.");
    } catch (err) {
      console.error("Report history save error:", err);
      alert(err?.response?.data?.message || "Could not save the report history.");
    }
  };

  const openTaskCount = tasks.filter((task) => task.status !== "Done").length;

  const sidebarPortal = sidebarHost
    ? createPortal(
        <div className="gba-sidebar-accounts-panel">
          <div className="gba-sidebar-copy dashboard-copy">
            <span className="gba-sidebar-kicker">Accounts Hub</span>
            <strong>Financial matter control</strong>
            <p>Filter the register, keep accountant tasks visible, and build this week’s report from live matter data.</p>
          </div>

          <label className="gba-sidebar-search">
            <span><FaSearch /> Search</span>
            <div>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Ref, parties, agent, attorney, amount..."
              />
            </div>
          </label>

          <div className="gba-sidebar-filter-group gba-sidebar-accounts-filters" aria-label="Accounts filters">
            <span><FaFilter /> Queues</span>
            {filterDefinitions.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={activeFilter === filter.key ? "active" : ""}
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="gba-sidebar-stats">
            <div><strong>{cases.length}</strong><span>Matters</span></div>
            <div><strong>{openTaskCount}</strong><span>Open tasks</span></div>
          </div>
        </div>,
        sidebarHost
      )
    : null;

  if (loading) {
    return <div className="gba-accounts-page"><div className="gba-accounts-panel">Loading Accounts Hub…</div></div>;
  }

  return (
    <div className="gba-accounts-page">
      {sidebarPortal}
      <div className="gba-accounts-page-inner">
        <section className="gba-accounts-hero">
          <div className="gba-accounts-hero-grid">
            <div>
              <span className="gba-accounts-kicker"><FaFolderOpen /> Accounts Hub</span>
              <h1>One control room for matter costs, clearances, transfer duty and final fee review.</h1>
              <p>
                This page does not move money or change banking. It gives Accounts a live register, a right-side matter control panel,
                personal tasks and a weekly report builder from the existing conveyancing data.
              </p>
            </div>

            <div className="gba-accounts-hero-actions">
              <label className="gba-accounts-search">
                <FaSearch />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search reference, parties, agent, attorney, property or amount"
                />
              </label>
              <button type="button" className="gba-accounts-btn" onClick={() => setReportVisible((value) => !value)}>
                <FaRegFileAlt /> Preview report
              </button>
              <button type="button" className="gba-accounts-btn primary" onClick={fetchAll}>
                <FaClock /> Refresh
              </button>
            </div>
          </div>
        </section>

        {error && <section className="gba-accounts-panel"><StatusPill status="Urgent" /> <span style={{ marginLeft: 8 }}>{error}</span></section>}

        <section className="gba-accounts-summary-grid" aria-label="Accounts summary cards">
          <SummaryCard icon={<FaExclamationTriangle />} label="Costs outstanding" value={metrics.costsOutstanding} description="Matters where client costs were requested but not fully received." />
          <SummaryCard icon={<FaClock />} label="Transfer duty pending" value={metrics.transferDutyPending} description="Applicable transfer duty matters still waiting for completion or receipt." />
          <SummaryCard icon={<FaFileAlt />} label="Clearance costs pending" value={metrics.clearancePending} description="Rates, levy or HOA financial clearance steps still outstanding." />
          <SummaryCard icon={<FaCheckCircle />} label="Fees not transferred" value={metrics.feesNotTransferred} description="Registered/completed matters where firm fee review is not done." />
          <SummaryCard icon={<FaRegFileAlt />} label="Missing account notes" value={metrics.missingAccountNotes} description={`Matters with no accounts note or no update for ${NO_RECENT_NOTE_DAYS}+ days.`} />
          <SummaryCard icon={<FaPrint />} label="Reports due" value={metrics.reportsDue} description="Matters that should be checked for this week’s accounts report." />
          <SummaryCard icon={<FaExclamationTriangle />} label="High-value matters" value={metrics.highValue} description={`Purchase price at or above ${formatMoney(HIGH_VALUE_THRESHOLD)} requiring careful tracking.`} />
          <SummaryCard icon={<FaChevronRight />} label="Ready for accounts review" value={metrics.readyForReview} description="Files at a stage where Accounts should take action now." />
        </section>

        <section className="gba-accounts-panel">
          <div className="gba-accounts-panel-head">
            <div>
              <h2>Matter Accounts Register</h2>
              <p>{filteredCases.length} matter(s) showing. Use the filters for costs, duty, clearances, fees, urgent and completed queues.</p>
            </div>
            <button type="button" className="gba-accounts-btn" onClick={() => navigate("/case/new")}>
              <FaPlus /> New matter
            </button>
          </div>

          <div className="gba-accounts-filter-row">
            {filterDefinitions.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={activeFilter === filter.key ? "gba-accounts-filter-chip active" : "gba-accounts-filter-chip"}
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="gba-accounts-table-scroller">
            <table className="gba-accounts-table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Parties</th>
                  <th>Property</th>
                  <th>Agent</th>
                  <th>Attorney / handler</th>
                  <th>Purchase price</th>
                  <th>Stage</th>
                  <th>Costs requested</th>
                  <th>Costs received</th>
                  <th>Transfer duty</th>
                  <th>Rates clearance</th>
                  <th>Levy clearance</th>
                  <th>Disbursements</th>
                  <th>Firm fee status</th>
                  <th>Accounts status</th>
                  <th>Last accounts note</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={17}>No matters match this accounts queue.</td>
                  </tr>
                ) : filteredCases.map((caseItem) => {
                  const accounts = normaliseAccounts(caseItem);
                  const status = deriveAccountsStatus(caseItem);
                  const disbursementsOutstanding = (accounts.disbursements || []).filter((item) => item.recoverable && !item.recovered).length;

                  return (
                    <tr key={caseItem._id}>
                      <td>
                        <div className="gba-accounts-ref">
                          <strong>{safeText(caseItem.reference)}</strong>
                          <span className="gba-accounts-muted">{caseItem.isActive === false ? "Inactive" : "Active"}</span>
                        </div>
                      </td>
                      <td>{safeText(caseItem.parties)}</td>
                      <td>{safeText(caseItem.property)}</td>
                      <td>{safeText(caseItem.agent || caseItem.agency)}</td>
                      <td>{safeText(caseItem.createdBy?.username || caseItem.createdBy)}</td>
                      <td className="gba-accounts-cell-strong">{formatMoney(caseItem.purchasePrice)}</td>
                      <td>{getMatterStage(caseItem)}</td>
                      <td>{accounts.costCollection?.costEstimateSent === "Yes" ? formatDate(accounts.costCollection?.dateSent) : "No"}</td>
                      <td>{paymentLabel(accounts.costCollection?.costsReceivedStatus)}</td>
                      <td>{accounts.transferDuty?.applicable === "No" ? "Not required" : accounts.transferDuty?.receiptReceived === "Yes" ? "Done" : "Pending"}</td>
                      <td>{accounts.clearanceCosts?.ratesClearanceStatus}</td>
                      <td>{accounts.clearanceCosts?.levyClearanceStatus}</td>
                      <td>{disbursementsOutstanding ? `${disbursementsOutstanding} outstanding` : "Complete"}</td>
                      <td>{accounts.firmFee?.feeStatus}</td>
                      <td><StatusPill status={status} /></td>
                      <td>{safeText(accounts.lastAccountsNote, "No recent accounts note")}</td>
                      <td>
                        <button type="button" className="gba-accounts-btn primary" onClick={() => openAccountsPanel(caseItem)}>
                          Open accounts panel
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="gba-accounts-layout-grid">
          <section className="gba-accounts-panel">
            <div className="gba-accounts-panel-head">
              <div>
                <h2>My Accounts Tasks</h2>
                <p>Create tasks for cost follow-ups, transfer duty, clearances, disbursements, fee review, weekly reports and general admin.</p>
              </div>
              <StatusPill status={openTaskCount ? "Awaiting costs" : "Complete"} />
            </div>

            <form onSubmit={saveTask} className="gba-accounts-form-section">
              <div className="gba-accounts-form-grid">
                <TextInput label="Task title" value={taskDraft.title} onChange={(value) => setTaskDraft((prev) => ({ ...prev, title: value }))} placeholder="Follow up cost payment on COE9/0004" />
                <Field label="Matter reference optional">
                  <select
                    value={taskDraft.caseId || ""}
                    onChange={(event) => {
                      const caseId = event.target.value;
                      const selected = cases.find((caseItem) => caseItem._id === caseId);
                      setTaskDraft((prev) => ({ ...prev, caseId, matterReference: selected?.reference || prev.matterReference }));
                    }}
                  >
                    <option value="">Not linked</option>
                    {cases.map((caseItem) => (
                      <option key={caseItem._id} value={caseItem._id}>{safeText(caseItem.reference)} — {safeText(caseItem.parties)}</option>
                    ))}
                  </select>
                </Field>
                <TextInput label="Manual ref" value={taskDraft.matterReference} onChange={(value) => setTaskDraft((prev) => ({ ...prev, matterReference: value }))} placeholder="MAN10/0382" />
                <SelectInput label="Priority" value={taskDraft.priority} options={TASK_PRIORITIES} onChange={(value) => setTaskDraft((prev) => ({ ...prev, priority: value }))} />
                <TextInput label="Due date" value={taskDraft.dueDate} type="date" onChange={(value) => setTaskDraft((prev) => ({ ...prev, dueDate: value }))} />
                <SelectInput label="Category" value={taskDraft.category} options={TASK_CATEGORIES} onChange={(value) => setTaskDraft((prev) => ({ ...prev, category: value }))} />
                <SelectInput label="Status" value={taskDraft.status} options={TASK_STATUSES} onChange={(value) => setTaskDraft((prev) => ({ ...prev, status: value }))} />
                <TextAreaInput label="Notes" value={taskDraft.notes} onChange={(value) => setTaskDraft((prev) => ({ ...prev, notes: value }))} placeholder="What must be checked or followed up?" />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                {editingTaskId && <button type="button" className="gba-accounts-btn" onClick={resetTaskDraft}><FaTimes /> Cancel edit</button>}
                <button type="submit" className="gba-accounts-btn primary"><FaSave /> {editingTaskId ? "Update task" : "Create task"}</button>
              </div>
            </form>

            <div className="gba-task-list">
              {tasks.length === 0 ? (
                <div className="gba-task-card"><div><h4>No accounts tasks yet</h4><p>Add the first task above.</p></div></div>
              ) : tasks.map((task) => (
                <article key={task._id} className="gba-task-card">
                  <div>
                    <h4>{task.title}</h4>
                    <p>
                      {safeText(task.matterReference, "No matter linked")} · {task.category} · {task.priority} priority · Due {formatDate(task.dueDate)}
                    </p>
                    {task.notes && <p>{task.notes}</p>}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "start", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <StatusPill status={task.status === "Done" ? "Complete" : task.priority === "Urgent" ? "Urgent" : "Awaiting costs"} />
                    <button type="button" className="gba-accounts-btn icon-only" onClick={() => editTask(task)} title="Edit task"><FaEdit /></button>
                    <button type="button" className="gba-accounts-btn icon-only" onClick={() => updateTaskStatus(task, task.status === "Done" ? "Open" : "Done")} title={task.status === "Done" ? "Reopen task" : "Mark done"}><FaCheckCircle /></button>
                    <button type="button" className="gba-accounts-btn icon-only danger" onClick={() => deleteTask(task._id)} title="Delete task"><FaTrash /></button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="gba-accounts-panel">
            <div className="gba-accounts-panel-head">
              <div>
                <h2>Weekly Accounts Report Builder</h2>
                <p>Preview, export, save history and mark this week’s report as sent.</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <button type="button" className="gba-accounts-btn" onClick={() => setReportVisible((value) => !value)}><FaRegFileAlt /> Preview weekly report</button>
              <button type="button" className="gba-accounts-btn" onClick={generatePdf}><FaPrint /> Generate PDF</button>
              <button type="button" className="gba-accounts-btn" onClick={exportExcel}><FaDownload /> Export Excel</button>
              <button type="button" className="gba-accounts-btn" onClick={() => saveReportHistory(false)}><FaSave /> Save report history</button>
              <button type="button" className="gba-accounts-btn primary" onClick={() => saveReportHistory(true)}><FaCheckCircle /> Mark report as sent</button>
            </div>

            {(reportVisible || true) && (
              <div className="gba-report-preview">
                {reportGroups.map(([sectionName, items]) => (
                  <section key={sectionName} className="gba-report-section">
                    <h4>{sectionName} ({items.length})</h4>
                    {items.length === 0 ? (
                      <p className="gba-accounts-muted">No matters in this section.</p>
                    ) : (
                      <ul>
                        {items.slice(0, reportVisible ? 50 : 3).map((item) => (
                          <li key={`${sectionName}-${item.id}`}>
                            <strong>{item.reference}</strong> — {item.parties}. {item.reason}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <div className="gba-accounts-panel-head" style={{ marginBottom: 8, padding: 0 }}>
                <h3>Report history</h3>
              </div>
              <div className="gba-task-list">
                {reportHistory.length === 0 ? (
                  <div className="gba-task-card"><div><h4>No saved accounts reports yet</h4><p>Use Save report history after previewing the report.</p></div></div>
                ) : reportHistory.slice(0, 6).map((report) => (
                  <article key={report._id} className="gba-task-card">
                    <div>
                      <h4>{report.title || "Weekly Accounts Report"}</h4>
                      <p>{formatDate(report.weekStart)} to {formatDate(report.weekEnd)} · {report.matterCount || 0} matter(s) · {report.sentAt ? `Sent ${formatDate(report.sentAt)}` : "Saved only"}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      {selectedCase && draftAccounts && (
        <>
          <div className="gba-accounts-drawer-backdrop" onClick={closeAccountsPanel} />
          <aside className="gba-accounts-drawer" aria-label="Matter financial status panel">
            <div className="gba-accounts-drawer-head">
              <div>
                <span className="gba-accounts-kicker"><FaFileAlt /> Matter financial status panel</span>
                <h2>{safeText(selectedCase.reference)} — {safeText(selectedCase.parties)}</h2>
                <p>{safeText(selectedCase.property)} · {formatMoney(selectedCase.purchasePrice)} · {getMatterStage(selectedCase)}</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button type="button" className="gba-accounts-btn" onClick={() => navigate(`/case/${selectedCase._id}`)}>Open case page</button>
                <button type="button" className="gba-accounts-btn icon-only" onClick={closeAccountsPanel} title="Close"><FaTimes /></button>
              </div>
            </div>

            <section className="gba-accounts-form-section">
              <h3>A. Cost collection</h3>
              <div className="gba-accounts-form-grid">
                <SelectInput label="Cost estimate sent" value={draftAccounts.costCollection?.costEstimateSent} options={YES_NO} onChange={(value) => updateDraft("costCollection.costEstimateSent", value)} />
                <TextInput label="Date sent" type="date" value={draftAccounts.costCollection?.dateSent} onChange={(value) => updateDraft("costCollection.dateSent", value)} />
                <TextInput label="Amount requested" value={draftAccounts.costCollection?.amountRequested} onChange={(value) => updateDraft("costCollection.amountRequested", value)} placeholder="R 0.00" />
                <SelectInput label="Costs received" value={draftAccounts.costCollection?.costsReceivedStatus} options={YES_NO_PARTIAL} onChange={(value) => updateDraft("costCollection.costsReceivedStatus", value)} />
                <TextInput label="Amount received" value={draftAccounts.costCollection?.amountReceived} onChange={(value) => updateDraft("costCollection.amountReceived", value)} placeholder="R 0.00" />
                <TextInput label="Date received" type="date" value={draftAccounts.costCollection?.dateReceived} onChange={(value) => updateDraft("costCollection.dateReceived", value)} />
                <TextInput label="Shortfall amount" value={draftAccounts.costCollection?.shortfallAmount} onChange={(value) => updateDraft("costCollection.shortfallAmount", value)} placeholder="R 0.00" />
                <SelectInput label="Reminder required" value={draftAccounts.costCollection?.reminderRequired} options={YES_NO} onChange={(value) => updateDraft("costCollection.reminderRequired", value)} />
                <TextAreaInput label="Cost collection notes" value={draftAccounts.costCollection?.notes} onChange={(value) => updateDraft("costCollection.notes", value)} placeholder="Client promised POP by Friday, shortfall to be followed up, etc." />
              </div>
            </section>

            <section className="gba-accounts-form-section">
              <h3>B. Transfer duty</h3>
              <div className="gba-accounts-form-grid">
                <SelectInput label="Transfer duty applicable" value={draftAccounts.transferDuty?.applicable} options={TRANSFER_DUTY_APPLICABLE} onChange={(value) => updateDraft("transferDuty.applicable", value)} />
                <TextInput label="Transfer duty amount" value={draftAccounts.transferDuty?.amount} onChange={(value) => updateDraft("transferDuty.amount", value)} placeholder="R 0.00" />
                <SelectInput label="Submitted" value={draftAccounts.transferDuty?.submitted} options={YES_NO} onChange={(value) => updateDraft("transferDuty.submitted", value)} />
                <SelectInput label="Receipt received" value={draftAccounts.transferDuty?.receiptReceived} options={YES_NO} onChange={(value) => updateDraft("transferDuty.receiptReceived", value)} />
                <TextInput label="Date completed" type="date" value={draftAccounts.transferDuty?.dateCompleted} onChange={(value) => updateDraft("transferDuty.dateCompleted", value)} />
                <TextAreaInput label="Transfer duty notes" value={draftAccounts.transferDuty?.notes} onChange={(value) => updateDraft("transferDuty.notes", value)} />
              </div>
            </section>

            <section className="gba-accounts-form-section">
              <h3>C. Clearance costs</h3>
              <div className="gba-accounts-form-grid">
                <TextInput label="Rates clearance amount" value={draftAccounts.clearanceCosts?.ratesClearanceAmount} onChange={(value) => updateDraft("clearanceCosts.ratesClearanceAmount", value)} placeholder="R 0.00" />
                <SelectInput label="Rates clearance status" value={draftAccounts.clearanceCosts?.ratesClearanceStatus} options={CLEARANCE_STATUSES} onChange={(value) => updateDraft("clearanceCosts.ratesClearanceStatus", value)} />
                <TextInput label="Levy clearance amount" value={draftAccounts.clearanceCosts?.levyClearanceAmount} onChange={(value) => updateDraft("clearanceCosts.levyClearanceAmount", value)} placeholder="R 0.00" />
                <SelectInput label="Levy clearance status" value={draftAccounts.clearanceCosts?.levyClearanceStatus} options={CLEARANCE_STATUSES} onChange={(value) => updateDraft("clearanceCosts.levyClearanceStatus", value)} />
                <TextInput label="HOA clearance amount" value={draftAccounts.clearanceCosts?.hoaClearanceAmount} onChange={(value) => updateDraft("clearanceCosts.hoaClearanceAmount", value)} placeholder="R 0.00" />
                <SelectInput label="HOA status" value={draftAccounts.clearanceCosts?.hoaStatus} options={CLEARANCE_STATUSES} onChange={(value) => updateDraft("clearanceCosts.hoaStatus", value)} />
                <TextAreaInput label="Clearance notes" value={draftAccounts.clearanceCosts?.notes} onChange={(value) => updateDraft("clearanceCosts.notes", value)} placeholder="No banking action — only matter control." />
              </div>
            </section>

            <section className="gba-accounts-form-section">
              <div className="gba-accounts-panel-head" style={{ marginBottom: 0, padding: 0 }}>
                <h3>D. Disbursements and recoveries</h3>
                <button type="button" className="gba-accounts-btn" onClick={addDisbursement}><FaPlus /> Add recovery</button>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {(!draftAccounts.disbursements || draftAccounts.disbursements.length === 0) && (
                  <p className="gba-accounts-muted">No recoverable expenses have been added yet.</p>
                )}
                {(draftAccounts.disbursements || []).map((entry, index) => (
                  <div key={`${index}-${entry.description}`} className="gba-disbursement-row">
                    <TextInput label="Description" value={entry.description} onChange={(value) => updateDisbursement(index, "description", value)} placeholder="Courier / Searches / Deeds office" />
                    <TextInput label="Amount" value={entry.amount} onChange={(value) => updateDisbursement(index, "amount", value)} placeholder="R 0.00" />
                    <SelectInput label="Recoverable" value={entry.recoverable ? "Yes" : "No"} options={YES_NO} onChange={(value) => updateDisbursement(index, "recoverable", value === "Yes")} />
                    <SelectInput label="Recovered" value={entry.recovered ? "Yes" : "No"} options={YES_NO} onChange={(value) => updateDisbursement(index, "recovered", value === "Yes")} />
                    <TextInput label="Notes" value={entry.notes} onChange={(value) => updateDisbursement(index, "notes", value)} />
                    <button type="button" className="gba-accounts-btn icon-only danger" onClick={() => removeDisbursement(index)} title="Remove"><FaTrash /></button>
                  </div>
                ))}
              </div>
            </section>

            <section className="gba-accounts-form-section">
              <h3>E. Firm fee status</h3>
              <div className="gba-accounts-form-grid">
                <SelectInput label="Matter registered" value={draftAccounts.firmFee?.matterRegistered} options={YES_NO} onChange={(value) => updateDraft("firmFee.matterRegistered", value)} />
                <SelectInput label="Final account prepared" value={draftAccounts.firmFee?.finalAccountPrepared} options={YES_NO} onChange={(value) => updateDraft("firmFee.finalAccountPrepared", value)} />
                <TextInput label="Firm fee amount" value={draftAccounts.firmFee?.firmFeeAmount} onChange={(value) => updateDraft("firmFee.firmFeeAmount", value)} placeholder="R 0.00" />
                <SelectInput label="Fee status" value={draftAccounts.firmFee?.feeStatus} options={FEE_STATUSES} onChange={(value) => updateDraft("firmFee.feeStatus", value)} />
                <TextAreaInput label="Firm fee notes" value={draftAccounts.firmFee?.notes} onChange={(value) => updateDraft("firmFee.notes", value)} placeholder="Control checklist only. No payment instruction." />
              </div>
            </section>

            <section className="gba-accounts-form-section">
              <h3>Accounts status and report notes</h3>
              <div className="gba-accounts-form-grid">
                <SelectInput label="Accounts status" value={draftAccounts.accountsStatus} options={ACCOUNT_STATUSES} onChange={(value) => updateDraft("accountsStatus", value)} />
                <SelectInput label="Report priority" value={draftAccounts.reportPriority} options={["Normal", "High", "Urgent"]} onChange={(value) => updateDraft("reportPriority", value)} />
                <SelectInput label="Include in weekly report" value={draftAccounts.includeInWeeklyReport ? "Yes" : "No"} options={YES_NO} onChange={(value) => updateDraft("includeInWeeklyReport", value === "Yes")} />
                <TextAreaInput label="Last accounts note" value={draftAccounts.lastAccountsNote} onChange={(value) => updateDraft("lastAccountsNote", value)} placeholder="Client promised POP by Friday." />
                <TextAreaInput label="High-priority accounts note" value={draftAccounts.highPriorityNote} onChange={(value) => updateDraft("highPriorityNote", value)} placeholder="Use only where this matter must be escalated in the report." />
              </div>
            </section>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingBottom: 22 }}>
              <button type="button" className="gba-accounts-btn" onClick={closeAccountsPanel}>Cancel</button>
              <button type="button" className="gba-accounts-btn primary" onClick={saveAccounts} disabled={savingAccounts}>
                <FaSave /> {savingAccounts ? "Saving…" : "Save accounts panel"}
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
