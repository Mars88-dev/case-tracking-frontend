// File: src/components/ReportCentre.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import html2canvas from "html2canvas";
import { useReactToPrint } from "react-to-print";
import {
  FaCheckCircle,
  FaClipboardList,
  FaDownload,
  FaEnvelope,
  FaExclamationTriangle,
  FaEye,
  FaFileAlt,
  FaFilter,
  FaHistory,
  FaLayerGroup,
  FaPaperPlane,
  FaPrint,
  FaSearch,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";

const BASE_URL = "https://case-tracking-backend.onrender.com";

const COLORS = {
  navy: "#142a4f",
  gold: "#d2ac68",
  beige: "#f9f4ed",
  border: "#e5e7eb",
  white: "#ffffff",
};

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const EXPORT_SCALE = 2;

const DATE_LABELS = new Set(["", "N/A", "NA", "PARTLY", "REQUESTED", "PENDING", "NONE"]);
const INCOMPLETE_LABELS = new Set(["", "N/A", "NA", "PARTLY", "REQUESTED", "PENDING", "NONE", "NO"]);
const DAY_MS = 24 * 60 * 60 * 1000;

const REPORT_TYPES = [
  {
    value: "agent-update",
    label: "Agent update",
    description: "A clean weekly progress report for the estate agent or agency contact.",
  },
  {
    value: "client-update",
    label: "Buyer / seller update",
    description: "Client-friendly wording with a professional covering message.",
  },
  {
    value: "internal-attorney",
    label: "Internal attorney report",
    description: "Internal review pack for attorneys and conveyancing staff.",
  },
  {
    value: "full-progress",
    label: "Full progress report",
    description: "Full matter pack using the current approved GBA report format.",
  },
  {
    value: "exception-only",
    label: "Exception report only",
    description: "Focuses the pack on matters with overdue or unresolved items.",
  },
];

const REPORT_OPTIONS = [
  { key: "previewBeforeSending", label: "Preview before sending", locked: false },
  { key: "changedFilesOnly", label: "Only include changed files since last report", locked: true },
  { key: "highlightOverdue", label: "Highlight overdue items", locked: false },
  { key: "includeAttorneyDestination", label: "Include attorney destination", locked: false },
  { key: "includeFirmBranding", label: "Include firm branding", locked: false },
  { key: "includeStatusSummary", label: "Include case status summary", locked: false },
  { key: "outstandingOnly", label: "Include outstanding items only", locked: true },
];

const PROCESS_ITEMS = [
  { key: "sellerFicaDocuments", label: "Seller FICA Documents", overdueAfterDays: 7 },
  { key: "purchaserFicaDocuments", label: "Purchaser FICA Documents", overdueAfterDays: 7 },
  { key: "titleDeed", label: "Title Deed", overdueAfterDays: 14 },
  { key: "bondCancellationFigures", label: "Bond Cancellation Figures", overdueAfterDays: 21 },
  { key: "municipalClearanceFigures", label: "Municipal Clearance Figures", overdueAfterDays: 21 },
  { key: "transferDutyReceipt", label: "Transfer Duty Receipt", overdueAfterDays: 14 },
  { key: "guaranteesFromBondAttorneys", label: "Guarantees from Bond Attorneys", overdueAfterDays: 14 },
  { key: "transferCost", label: "Transfer Cost", overdueAfterDays: 7 },
  { key: "electricalComplianceCertificate", label: "COC Electrical Compliance Certificate", overdueAfterDays: 14 },
  { key: "municipalClearanceCertificate", label: "Municipal Clearance Certificate", overdueAfterDays: 21 },
  { key: "levyClearanceCertificate", label: "Levy Clearance Certificate", overdueAfterDays: 14 },
  { key: "hoaCertificate", label: "HOA Certificate", overdueAfterDays: 14 },
];

function injectReportCentreStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("gba-report-centre-styles")) return;

  const style = document.createElement("style");
  style.id = "gba-report-centre-styles";
  style.textContent = `
    .gba-report-centre-page {
      min-height: calc(100vh - var(--topbar-height));
      padding: clamp(12px, 1.35vw, 22px);
      color: var(--text);
      background: transparent;
    }

    .gba-report-centre-shell {
      display: grid;
      gap: 14px;
      max-width: 1760px;
      margin: 0 auto;
    }

    .gba-report-centre-hero {
      position: relative;
      overflow: hidden;
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(340px, 0.6fr);
      gap: 16px;
      padding: clamp(16px, 1.5vw, 24px);
      border-radius: 28px;
      background:
        radial-gradient(circle at 12% 14%, rgba(210,172,104,0.28), transparent 20rem),
        linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-2) 78%);
      color: #fff;
      box-shadow: 0 22px 60px rgba(7,31,57,0.22);
    }

    .gba-report-centre-hero::after {
      content: "";
      position: absolute;
      inset: auto -80px -130px auto;
      width: 340px;
      height: 340px;
      border-radius: 50%;
      background: rgba(210,172,104,0.18);
      pointer-events: none;
    }

    .gba-report-centre-hero-content,
    .gba-report-centre-hero-card {
      position: relative;
      z-index: 1;
    }

    .gba-report-centre-kicker {
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

    .gba-report-centre-hero h1 {
      margin: 12px 0 7px;
      font-size: clamp(28px, 3vw, 46px);
      line-height: 1;
      letter-spacing: -0.055em;
    }

    .gba-report-centre-hero p {
      max-width: 760px;
      margin: 0;
      color: rgba(255,255,255,0.76);
      font-size: 14px;
      line-height: 1.65;
    }

    .gba-report-centre-hero-card {
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

    .gba-report-stat {
      min-width: 0;
      padding: 12px;
      border-radius: 16px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.10);
    }

    .gba-report-stat strong,
    .gba-report-stat span {
      display: block;
    }

    .gba-report-stat strong {
      font-size: 24px;
      line-height: 1;
      color: #fff;
    }

    .gba-report-stat span {
      margin-top: 5px;
      color: rgba(255,255,255,0.62);
      font-size: 11px;
      font-weight: 850;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .gba-report-centre-grid {
      display: grid;
      grid-template-columns: minmax(420px, 0.72fr) minmax(0, 1.28fr);
      gap: 14px;
      align-items: start;
    }

    .gba-report-panel {
      display: grid;
      gap: 14px;
      padding: 16px;
      border-radius: 24px;
      background: var(--surface);
      border: 1px solid var(--border-soft);
      box-shadow: 12px 16px 34px var(--shadow-lo), -10px -10px 26px var(--shadow-hi);
    }

    .gba-report-panel.sticky {
      position: sticky;
      top: calc(var(--topbar-height) + 14px);
    }

    .gba-report-panel-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .gba-report-panel-head h2 {
      margin: 0;
      font-size: 18px;
      letter-spacing: -0.03em;
      color: var(--text);
    }

    .gba-report-panel-head p {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
    }

    .gba-report-field-group {
      display: grid;
      gap: 8px;
    }

    .gba-report-label {
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

    .gba-report-label small {
      color: var(--color-accent);
      font-size: 10px;
      text-transform: none;
      letter-spacing: 0;
    }

    .gba-report-select,
    .gba-report-input,
    .gba-report-textarea {
      width: 100%;
      min-height: 44px;
      border-radius: 14px;
      border: 1px solid var(--border-soft);
      background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
      color: var(--text);
      outline: none;
      padding: 0 13px;
      box-shadow: inset 2px 2px 5px rgba(16,42,74,0.08), inset -2px -2px 5px rgba(255,255,255,0.72);
      font-weight: 700;
    }

    .gba-report-textarea {
      min-height: 168px;
      resize: vertical;
      padding: 12px 13px;
      line-height: 1.5;
      font-weight: 650;
    }

    .gba-report-search-field {
      position: relative;
    }

    .gba-report-search-field svg {
      position: absolute;
      left: 13px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-accent);
    }

    .gba-report-search-field input {
      padding-left: 39px;
    }

    .gba-report-type-grid,
    .gba-report-scope-grid {
      display: grid;
      gap: 9px;
    }

    .gba-report-type-card,
    .gba-report-scope-button,
    .gba-report-option-row {
      display: grid;
      gap: 4px;
      width: 100%;
      padding: 12px;
      border-radius: 16px;
      border: 1px solid var(--border-soft);
      background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
      color: var(--text);
      text-align: left;
      cursor: pointer;
    }

    .gba-report-type-card.active,
    .gba-report-scope-button.active {
      border-color: rgba(210,172,104,0.68);
      box-shadow: 0 0 0 4px rgba(210,172,104,0.12), inset 0 1px 0 rgba(255,255,255,0.65);
    }

    .gba-report-type-card strong,
    .gba-report-scope-button strong {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .gba-report-type-card span,
    .gba-report-scope-button span {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.4;
    }

    .gba-report-scope-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .gba-report-option-row {
      grid-template-columns: 24px minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      cursor: default;
      padding: 10px 12px;
    }

    .gba-report-option-row input {
      width: 18px;
      height: 18px;
      accent-color: var(--color-accent);
    }

    .gba-report-option-row strong {
      font-size: 12px;
      line-height: 1.3;
    }

    .gba-report-option-row small {
      color: var(--muted);
      font-size: 10px;
      font-weight: 850;
    }

    .gba-report-lock-pill,
    .gba-report-status-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 25px;
      padding: 0 9px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 950;
      white-space: nowrap;
    }

    .gba-report-lock-pill {
      color: #6f4c15;
      background: rgba(210,172,104,0.16);
      border: 1px solid rgba(210,172,104,0.24);
    }

    .gba-report-status-pill {
      color: var(--color-primary);
      background: rgba(16,42,74,0.07);
      border: 1px solid rgba(16,42,74,0.10);
    }

    .gba-report-status-pill.critical {
      color: #991b1b;
      background: rgba(254,226,226,0.82);
      border-color: rgba(220,38,38,0.18);
    }

    .gba-report-status-pill.ready {
      color: #166534;
      background: rgba(220,252,231,0.82);
      border-color: rgba(22,101,52,0.18);
    }

    .gba-report-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .gba-report-actions .neumo-button {
      flex: 1 1 190px;
      min-height: 44px;
      padding: 0 14px;
    }

    .gba-report-actions .neumo-button.secondary {
      color: var(--color-primary);
      background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
      border: 1px solid rgba(16,42,74,0.10);
      box-shadow: 8px 10px 24px var(--shadow-lo), -8px -8px 20px var(--shadow-hi);
    }

    .gba-report-actions .neumo-button.disabled,
    .gba-report-actions .neumo-button:disabled {
      filter: grayscale(0.2);
      opacity: 0.58;
    }

    .gba-report-alert {
      display: grid;
      grid-template-columns: 36px minmax(0, 1fr);
      gap: 10px;
      align-items: start;
      padding: 12px;
      border-radius: 16px;
      background: rgba(210,172,104,0.12);
      border: 1px solid rgba(210,172,104,0.22);
      color: var(--text);
    }

    .gba-report-alert svg {
      margin-top: 2px;
      color: var(--color-accent);
      font-size: 20px;
    }

    .gba-report-alert strong,
    .gba-report-alert span {
      display: block;
    }

    .gba-report-alert strong {
      font-size: 13px;
    }

    .gba-report-alert span {
      margin-top: 3px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.4;
    }

    .gba-report-pack-table-wrap {
      overflow-x: auto;
      border-radius: 18px;
      border: 1px solid var(--border-soft);
    }

    .gba-report-pack-table {
      width: 100%;
      min-width: 820px;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 12px;
    }

    .gba-report-pack-table th,
    .gba-report-pack-table td {
      padding: 10px 11px;
      border-bottom: 1px solid var(--border-soft);
      text-align: left;
      vertical-align: middle;
    }

    .gba-report-pack-table th {
      background: var(--table-header);
      color: var(--table-header-text);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .gba-report-pack-table td {
      color: var(--text);
      background: var(--surface);
      font-weight: 700;
    }

    .gba-report-pack-table tr:last-child td {
      border-bottom: 0;
    }

    .gba-report-pack-table .muted {
      color: var(--muted);
      font-weight: 650;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .gba-report-preview-wrap {
      display: grid;
      gap: 12px;
    }

    .gba-report-preview-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 16px;
      background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
      border: 1px solid var(--border-soft);
    }

    .gba-report-preview-toolbar strong {
      color: var(--text);
      font-size: 13px;
    }

    .gba-report-preview-toolbar span {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }

    .gba-report-preview-scroll {
      max-height: calc(100vh - 220px);
      overflow: auto;
      padding: 14px;
      border-radius: 22px;
      border: 1px solid var(--border-soft);
      background: linear-gradient(180deg, rgba(16,42,74,0.05), rgba(210,172,104,0.08));
    }

    .gba-report-a4-scale {
      width: ${A4_WIDTH_PX}px;
      max-width: 100%;
      margin: 0 auto;
      transform-origin: top center;
    }

    .gba-report-hidden-pack {
      position: absolute;
      left: -10000px;
      top: 0;
      width: ${A4_WIDTH_PX}px;
      background: #fff;
      pointer-events: none;
      opacity: 0;
    }

    .gba-report-email-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .gba-report-history-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .gba-report-history-card {
      padding: 12px;
      border-radius: 16px;
      border: 1px solid var(--border-soft);
      background: var(--surface-soft);
    }

    .gba-report-history-card span,
    .gba-report-history-card strong {
      display: block;
    }

    .gba-report-history-card span {
      color: var(--muted);
      font-size: 10px;
      font-weight: 950;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .gba-report-history-card strong {
      margin-top: 5px;
      color: var(--text);
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (max-width: 1480px) {
      .gba-report-centre-grid {
        grid-template-columns: 1fr;
      }

      .gba-report-panel.sticky {
        position: static;
      }

      .gba-report-preview-scroll {
        max-height: none;
      }
    }

    @media (max-width: 1120px) {
      .gba-report-centre-hero,
      .gba-report-email-grid,
      .gba-report-history-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 820px) {
      .gba-report-scope-grid,
      .gba-report-centre-hero-card {
        grid-template-columns: 1fr;
      }

      .gba-report-preview-scroll {
        padding: 8px;
      }
    }

    @media print {
      @page { size: A4 portrait; margin: 0; }
      body { margin: 0; background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .gba-sidebar,
      .gba-topbar,
      .gba-report-centre-page {
        display: none !important;
      }
      .gba-report-hidden-pack {
        position: static !important;
        left: auto !important;
        opacity: 1 !important;
        width: ${A4_WIDTH_PX}px !important;
        pointer-events: auto !important;
      }
      .gba-report-pack-page {
        page-break-after: always;
        break-after: page;
      }
      .gba-report-pack-page:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      #report-centre-print-pack {
        display: block !important;
      }
      #report-centre-print-pack .avoid-break {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      #report-centre-print-pack .comments-box {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
    }
  `;
  document.head.appendChild(style);
}

const parseAnyDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed || DATE_LABELS.has(trimmed.toUpperCase())) return null;

  if (/^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(trimmed)) {
    const [day, month, yearRaw] = trimmed.split(/[/-]/);
    const year = yearRaw.length === 2 ? (Number(yearRaw) > 69 ? `19${yearRaw}` : `20${yearRaw}`) : yearRaw;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (date) => {
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const todayStart = () => startOfDay(new Date());

const daysSince = (value) => {
  const date = startOfDay(parseAnyDate(value));
  if (!date) return null;
  return Math.max(0, Math.floor((todayStart().getTime() - date.getTime()) / DAY_MS));
};

const normaliseValue = (value) => String(value ?? "").trim().toUpperCase();
const hasValue = (value) => !INCOMPLETE_LABELS.has(normaliseValue(value));
const hasCompleted = (value) => hasValue(value);
const hasRequested = (value) => {
  const normalised = normaliseValue(value);
  return normalised === "REQUESTED" || hasValue(value);
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = parseAnyDate(value);
  if (!date) return String(value);
  return date.toLocaleDateString("en-GB");
};

const displayText = (value) => {
  if (value === 0) return "0";
  if (value === false) return "No";
  if (value === true) return "Yes";
  if (value == null || value === "") return "—";
  return formatDate(value);
};

const safeId = (caseItem) => String(caseItem?._id || caseItem?.id || "");

const getAgentName = (caseItem) => String(caseItem?.agent || "No agent captured").trim() || "No agent captured";

const stageFromCase = (caseItem) => {
  if (hasCompleted(caseItem.registrationDate)) return "Registered";
  if (hasCompleted(caseItem.deedsPrepDate)) return "Prep";
  if (hasCompleted(caseItem.documentsLodgedDate)) return "Lodged";
  if (hasCompleted(caseItem.guaranteesFromBondAttorneysReceived)) return "Guarantees received";
  if (hasCompleted(caseItem.transferSignedSellerDate) && hasCompleted(caseItem.transferSignedPurchaserDate)) return "Signed";
  if (hasCompleted(caseItem.sellerFicaDocumentsReceived) && hasCompleted(caseItem.purchaserFicaDocumentsReceived)) return "FICA complete";
  if (hasCompleted(caseItem.instructionReceived)) return "Instruction received";
  return "Not started";
};

const buildRequestedTaskDelay = (caseItem, item) => {
  const requested = caseItem[`${item.key}Requested`];
  const received = caseItem[`${item.key}Received`];
  if (!hasRequested(requested) || hasCompleted(received)) return null;

  const delay = daysSince(requested);
  if (delay == null) return null;

  return {
    label: item.label,
    days: delay,
    overdueAfterDays: item.overdueAfterDays,
  };
};

const getCaseInsight = (caseItem) => {
  const overdueItems = PROCESS_ITEMS
    .map((item) => buildRequestedTaskDelay(caseItem, item))
    .filter(Boolean)
    .filter((item) => item.days > item.overdueAfterDays)
    .sort((a, b) => b.days - a.days);

  const outstandingItems = PROCESS_ITEMS
    .filter((item) => hasRequested(caseItem[`${item.key}Requested`]) && !hasCompleted(caseItem[`${item.key}Received`]))
    .map((item) => item.label);

  const instructionAge = daysSince(caseItem.instructionReceived || caseItem.date || caseItem.createdAt);
  const daysSinceUpdate = daysSince(caseItem.updatedAt || caseItem.createdAt);
  const stage = stageFromCase(caseItem);
  const comments = String(caseItem.comments || "").trim();

  let risk = "On track";
  let tone = "ready";
  let nextAction = stage === "Registered" ? "Matter completed" : "Continue transfer process";

  if (overdueItems.length) {
    risk = "Attention needed";
    tone = "critical";
    nextAction = overdueItems[0].label;
  } else if (daysSinceUpdate != null && daysSinceUpdate >= 10 && caseItem.isActive !== false) {
    risk = "Needs update";
    tone = "warning";
    nextAction = "Update matter comments";
  } else if (stage === "Registered") {
    risk = "Completed";
    tone = "ready";
  }

  return {
    stage,
    risk,
    tone,
    nextAction,
    overdueItems,
    outstandingItems,
    instructionAge,
    daysSinceUpdate,
    comments,
  };
};

const buildMessageTemplate = ({ selectedCase, reportTypeLabel, senderName, senderEmail }) => {
  const reference = selectedCase?.reference || "the selected matter";
  const parties = selectedCase?.parties ? ` for ${selectedCase.parties}` : "";
  const propertyLine = selectedCase?.property ? `\n\nProperty: ${selectedCase.property}` : "";
  const commentLine = selectedCase?.comments
    ? `\n\nCurrent update:\n${selectedCase.comments}`
    : "\n\nCurrent update:\nPlease find the latest progress report attached for your records.";

  return `Good day,

Please find attached the ${reportTypeLabel.toLowerCase()} for matter ${reference}${parties}.${propertyLine}${commentLine}

Should you require any further information, please feel free to contact us.

Kind regards,
${senderName || "Gerhard Barnard Inc"}
${senderEmail || ""}`;
};

function ReportDocument({ caseData, className = "", reportDate }) {
  const today = reportDate || new Intl.DateTimeFormat("en-GB").format(new Date());

  const Field = ({ label, value }) => (
    <div className="avoid-break" style={{ display: "flex", flexDirection: "column", fontSize: 11 }}>
      <label style={{ marginBottom: 2, fontWeight: "bold" }}>{label}</label>
      <div
        style={{
          border: "1px solid #c8b68b",
          minHeight: 20,
          backgroundColor: COLORS.beige,
          padding: "2px 4px",
        }}
      >
        {displayText(value)}
      </div>
    </div>
  );

  const DualField = ({ label, requestedKey, receivedKey }) => (
    <div
      className="avoid-break"
      style={{
        fontSize: 11,
        border: "1px solid #c8b68b",
        backgroundColor: COLORS.beige,
        padding: 4,
      }}
    >
      <div
        style={{
          fontWeight: "bold",
          marginBottom: 2,
          backgroundColor: COLORS.navy,
          color: COLORS.white,
          padding: "4px 6px",
          borderRadius: 4,
        }}
      >
        {label}
      </div>
      <div>
        <strong>Requested:</strong> {displayText(caseData[requestedKey])}
      </div>
      <div>
        <strong>Received:</strong> {displayText(caseData[receivedKey])}
      </div>
    </div>
  );

  return (
    <div
      data-report-case-id={safeId(caseData)}
      className={className}
      style={{
        width: A4_WIDTH_PX,
        minHeight: A4_HEIGHT_PX,
        margin: "0 auto",
        backgroundColor: COLORS.white,
        padding: 18,
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        color: "#111827",
      }}
    >
      <div>
        <header style={{ marginBottom: 10 }} className="avoid-break">
          <img src="/header.png" alt="Header" style={{ width: "100%" }} />
        </header>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
            fontSize: 13,
          }}
          className="avoid-break"
        >
          <div style={{ fontWeight: "bold", color: COLORS.navy }}>
            Our Transfer: {caseData.property || ""}
          </div>
          <div>
            <strong>Date:</strong> {today}
          </div>
        </div>

        <ReportSection title="INFORMATION">
          <ReportGrid cols={2}>
            <Field label="Instruction received" value={caseData.instructionReceived} />
            <Field label="Parties" value={caseData.parties} />
            <Field label="Agency" value={caseData.agency} />
            <Field label="Purchase Price" value={caseData.purchasePrice} />
            <Field label="Agent" value={caseData.agent} />
            <Field label="Property" value={caseData.property} />
          </ReportGrid>
        </ReportSection>

        <ReportSection title="FINANCIALS">
          <ReportGrid cols={4}>
            <Field label="Deposit Amount" value={caseData.depositAmount} />
            <Field label="Deposit Due" value={caseData.depositDueDate} />
            <Field label="Deposit Fulfilled" value={caseData.depositFulfilledDate} />
            <Field label="Notes" value="" />
            <Field label="Bond Amount" value={caseData.bondAmount} />
            <Field label="Bond Due" value={caseData.bondDueDate} />
            <Field label="Bond Fulfilled" value={caseData.bondFulfilledDate} />
            <Field label="Notes" value="" />
          </ReportGrid>
        </ReportSection>

        <ReportSection title="TRANSFER PROCESS">
          <ReportGrid cols={3}>
            <DualField label="Seller FICA Documents" requestedKey="sellerFicaDocumentsRequested" receivedKey="sellerFicaDocumentsReceived" />
            <DualField label="Purchaser FICA Documents" requestedKey="purchaserFicaDocumentsRequested" receivedKey="purchaserFicaDocumentsReceived" />
            <DualField label="Title Deed" requestedKey="titleDeedRequested" receivedKey="titleDeedReceived" />
            <DualField label="Bond Cancellation Figures" requestedKey="bondCancellationFiguresRequested" receivedKey="bondCancellationFiguresReceived" />
            <DualField label="Municipal Clearance Figures" requestedKey="municipalClearanceFiguresRequested" receivedKey="municipalClearanceFiguresReceived" />
            <DualField label="Transfer Duty Receipt" requestedKey="transferDutyReceiptRequested" receivedKey="transferDutyReceiptReceived" />
            <DualField label="Guarantees from Bond Attorneys" requestedKey="guaranteesFromBondAttorneysRequested" receivedKey="guaranteesFromBondAttorneysReceived" />
            <DualField label="Transfer Cost" requestedKey="transferCostRequested" receivedKey="transferCostReceived" />
            <DualField label="COC Electrical Compliance Certificate" requestedKey="electricalComplianceCertificateRequested" receivedKey="electricalComplianceCertificateReceived" />
            <DualField label="Municipal Clearance Certificate" requestedKey="municipalClearanceCertificateRequested" receivedKey="municipalClearanceCertificateReceived" />
            <DualField label="Levy Clearance Certificate" requestedKey="levyClearanceCertificateRequested" receivedKey="levyClearanceCertificateReceived" />
            <DualField label="HOA Certificate" requestedKey="hoaCertificateRequested" receivedKey="hoaCertificateReceived" />
          </ReportGrid>
        </ReportSection>

        <ReportSection title="TRANSFER DOCUMENTS SIGNED">
          <ReportGrid cols={2}>
            <Field label="Seller" value={caseData.transferSignedSellerDate} />
            <Field label="Purchaser" value={caseData.transferSignedPurchaserDate} />
          </ReportGrid>
        </ReportSection>

        <ReportSection title="DEEDS OFFICE PROCESS">
          <ReportGrid cols={3}>
            <Field label="Documents Lodged" value={caseData.documentsLodgedDate} />
            <Field label="Deeds Preparation" value={caseData.deedsPrepDate} />
            <Field label="Registration" value={caseData.registrationDate} />
          </ReportGrid>
        </ReportSection>

        <ReportSection title="COMMENTS">
          <div
            className="comments-box"
            style={{
              border: "1px solid #c8b68b",
              backgroundColor: COLORS.beige,
              padding: "6px",
              fontSize: 11,
              minHeight: 50,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
              lineHeight: 1.3,
            }}
          >
            {caseData.comments || "—"}
          </div>
        </ReportSection>
      </div>
    </div>
  );
}

function ReportSection({ title, children }) {
  return (
    <section style={{ marginBottom: 10 }}>
      <h2
        style={{
          backgroundColor: COLORS.navy,
          color: "#fff",
          padding: "6px 10px",
          borderRadius: 4,
          fontSize: 13,
        }}
      >
        {title}
      </h2>
      <div style={{ marginTop: 8 }}>{children}</div>
    </section>
  );
}

function ReportGrid({ cols = 2, children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 6,
      }}
    >
      {children}
    </div>
  );
}

export default function ReportCentre() {
  const reportPackRef = useRef(null);
  const [cases, setCases] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scope, setScope] = useState("case");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [reportType, setReportType] = useState("agent-update");
  const [search, setSearch] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageTouched, setMessageTouched] = useState(false);
  const [draftStatus, setDraftStatus] = useState(null);
  const [options, setOptions] = useState({
    previewBeforeSending: true,
    changedFilesOnly: false,
    highlightOverdue: true,
    includeAttorneyDestination: true,
    includeFirmBranding: true,
    includeStatusSummary: true,
    outstandingOnly: false,
  });

  useEffect(() => {
    injectReportCentreStyles();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [casesRes, userRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/cases`, { headers }),
          axios.get(`${BASE_URL}/api/users/me`, { headers }).catch(() => null),
        ]);

        if (cancelled) return;

        const safeCases = Array.isArray(casesRes.data) ? casesRes.data : [];
        const safeUser = userRes?.data || (() => {
          try {
            const stored = localStorage.getItem("user");
            return stored ? JSON.parse(stored) : null;
          } catch {
            return null;
          }
        })();

        const sorted = safeCases.slice().sort((a, b) => {
          const aActive = a.isActive === false ? 1 : 0;
          const bActive = b.isActive === false ? 1 : 0;
          if (aActive !== bActive) return aActive - bActive;
          return String(a.reference || "").localeCompare(String(b.reference || ""));
        });

        setCases(sorted);
        setCurrentUser(safeUser);
        if (!selectedCaseId && sorted.length) {
          const firstActive = sorted.find((item) => item.isActive !== false) || sorted[0];
          setSelectedCaseId(safeId(firstActive));
        }
      } catch (err) {
        console.error("Report Centre fetch failed:", err);
        if (!cancelled) {
          setError(err.response?.data?.message || "Could not load the Report Centre data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentReportType = useMemo(
    () => REPORT_TYPES.find((item) => item.value === reportType) || REPORT_TYPES[0],
    [reportType]
  );

  const agents = useMemo(() => {
    const unique = new Set();
    cases.forEach((caseItem) => {
      if (caseItem.isActive !== false) unique.add(getAgentName(caseItem));
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [cases]);

  useEffect(() => {
    if (scope === "agent" && !selectedAgent && agents.length) {
      setSelectedAgent(agents[0]);
    }
  }, [agents, scope, selectedAgent]);

  const selectedCase = useMemo(
    () => cases.find((caseItem) => safeId(caseItem) === selectedCaseId) || cases[0] || null,
    [cases, selectedCaseId]
  );

  const selectedCasesBeforeSearch = useMemo(() => {
    let base = [];
    if (scope === "case") {
      base = selectedCase ? [selectedCase] : [];
    } else if (scope === "agent") {
      base = cases.filter((caseItem) => caseItem.isActive !== false && getAgentName(caseItem) === selectedAgent);
    } else {
      base = cases.filter((caseItem) => caseItem.isActive !== false);
    }

    if (reportType === "exception-only") {
      base = base.filter((caseItem) => {
        const insight = getCaseInsight(caseItem);
        return insight.overdueItems.length || insight.tone === "warning";
      });
    }

    return base;
  }, [cases, reportType, scope, selectedAgent, selectedCase]);

  const selectedCases = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return selectedCasesBeforeSearch;

    return selectedCasesBeforeSearch.filter((caseItem) => {
      const haystack = [
        caseItem.reference,
        caseItem.parties,
        caseItem.agency,
        caseItem.agent,
        caseItem.property,
        caseItem.comments,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(term);
    });
  }, [search, selectedCasesBeforeSearch]);

  const previewCase = selectedCases[0] || selectedCase || null;
  const senderName = currentUser?.username || currentUser?.name || currentUser?.email?.split("@")[0] || "Gerhard Barnard Inc";
  const senderEmail = currentUser?.email || "";

  useEffect(() => {
    if (!previewCase || messageTouched) return;
    setMessage(
      buildMessageTemplate({
        selectedCase: previewCase,
        reportTypeLabel: currentReportType.label,
        senderName,
        senderEmail,
      })
    );
  }, [currentReportType.label, messageTouched, previewCase, senderEmail, senderName]);

  useEffect(() => {
    setDraftStatus(null);
  }, [recipientEmail, reportType, scope, selectedAgent, selectedCaseId, message]);

  const stats = useMemo(() => {
    const activeCases = cases.filter((caseItem) => caseItem.isActive !== false);
    const insights = activeCases.map(getCaseInsight);
    const attention = insights.filter((item) => item.tone === "critical" || item.tone === "warning").length;
    const ready = selectedCases.length;
    return {
      active: activeCases.length,
      attention,
      ready,
      agents: agents.length,
    };
  }, [agents.length, cases, selectedCases.length]);

  const printPack = useReactToPrint({
    content: () => reportPackRef.current,
    documentTitle: `Report Centre Pack - ${new Intl.DateTimeFormat("en-GB").format(new Date())}`,
    pageStyle: `
      @media print {
        @page { size: A4 portrait; margin: 0; }
        body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `,
  });

  const handleDownloadPreviewJpg = useCallback(async () => {
    if (!previewCase) return;
    const root = reportPackRef.current;
    if (!root) return;

    const target = root.querySelector(`[data-report-case-id="${safeId(previewCase)}"]`);
    if (!target) return;

    const previous = {
      opacity: root.style.opacity,
      left: root.style.left,
      pointerEvents: root.style.pointerEvents,
    };

    root.style.opacity = "1";
    root.style.left = "0";
    root.style.pointerEvents = "none";

    try {
      const canvas = await html2canvas(target, {
        backgroundColor: COLORS.white,
        scale: EXPORT_SCALE,
        scrollX: 0,
        scrollY: 0,
        windowWidth: A4_WIDTH_PX,
        windowHeight: Math.max(A4_HEIGHT_PX, target.scrollHeight || A4_HEIGHT_PX),
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = `Report_${previewCase.reference || safeId(previewCase) || "matter"}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    } finally {
      root.style.opacity = previous.opacity;
      root.style.left = previous.left;
      root.style.pointerEvents = previous.pointerEvents;
    }
  }, [previewCase]);

  const handleStageEmail = () => {
    if (!selectedCases.length) {
      setDraftStatus({
        tone: "critical",
        title: "No reports selected",
        detail: "Select at least one active matter before preparing the email pack.",
      });
      return;
    }

    if (!recipientEmail.trim()) {
      setDraftStatus({
        tone: "critical",
        title: "Recipient email required",
        detail: "Enter the client, agent or attorney email address before this pack can be sent later.",
      });
      return;
    }

    if (!senderEmail) {
      setDraftStatus({
        tone: "critical",
        title: "Sender email not available",
        detail: "The user profile must contain an email address before the backend mail sender is connected.",
      });
      return;
    }

    setDraftStatus({
      tone: "ready",
      title: "Email pack prepared",
      detail: `The front-end draft is ready from ${senderEmail} to ${recipientEmail.trim()}. Backend sending is intentionally not connected yet.`,
    });
  };

  const toggleOption = (key) => {
    const option = REPORT_OPTIONS.find((item) => item.key === key);
    if (option?.locked) return;
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const lastHistory = useMemo(() => {
    if (!previewCase) return null;
    return {
      sentAt: previewCase.lastReportSentAt || previewCase.reportSentAt || "Not recorded yet",
      sentBy: previewCase.lastReportSentBy || previewCase.reportSentBy || "Not recorded yet",
      sentTo: previewCase.lastReportSentTo || previewCase.reportSentTo || recipientEmail || "Not recorded yet",
    };
  }, [previewCase, recipientEmail]);

  return (
    <>
      <div className="gba-report-centre-page">
      <div className="gba-report-centre-shell">
        <section className="gba-report-centre-hero">
          <div className="gba-report-centre-hero-content">
            <span className="gba-report-centre-kicker">
              <FaClipboardList /> Report Centre
            </span>
            <h1>Weekly report packs, ready before email sending goes live.</h1>
            <p>
              Build and preview professional matter updates from the existing approved GBA report format. The current report pages remain untouched while this new workflow is tested safely.
            </p>
          </div>
          <div className="gba-report-centre-hero-card" aria-label="Report centre summary">
            <div className="gba-report-stat">
              <strong>{stats.active}</strong>
              <span>Active matters</span>
            </div>
            <div className="gba-report-stat">
              <strong>{stats.ready}</strong>
              <span>Reports in pack</span>
            </div>
            <div className="gba-report-stat">
              <strong>{stats.attention}</strong>
              <span>Need attention</span>
            </div>
            <div className="gba-report-stat">
              <strong>{stats.agents}</strong>
              <span>Active agents</span>
            </div>
          </div>
        </section>

        {error && (
          <div className="gba-report-alert">
            <FaExclamationTriangle />
            <div>
              <strong>Report Centre could not load</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        <section className="gba-report-centre-grid">
          <div className="sticky gba-report-panel">
            <div className="gba-report-panel-head">
              <div>
                <h2>Pack setup</h2>
                <p>Choose the scope, report type and email details without changing the existing report pages.</p>
              </div>
              <span className="gba-report-status-pill">{loading ? "Loading" : "Front-end ready"}</span>
            </div>

            <div className="gba-report-field-group">
              <div className="gba-report-label">
                <span>Report scope</span>
              </div>
              <div className="gba-report-scope-grid">
                <button type="button" className={scope === "case" ? "gba-report-scope-button active" : "gba-report-scope-button"} onClick={() => setScope("case")}>
                  <strong><FaFileAlt /> One case</strong>
                  <span>Preview and prepare one matter.</span>
                </button>
                <button type="button" className={scope === "agent" ? "gba-report-scope-button active" : "gba-report-scope-button"} onClick={() => setScope("agent")}>
                  <strong><FaUserTie /> One agent</strong>
                  <span>Pack all active matters for an agent.</span>
                </button>
                <button type="button" className={scope === "all" ? "gba-report-scope-button active" : "gba-report-scope-button"} onClick={() => setScope("all")}>
                  <strong><FaUsers /> All active</strong>
                  <span>Weekly firm-wide active pack.</span>
                </button>
              </div>
            </div>

            {scope === "case" && (
              <div className="gba-report-field-group">
                <label className="gba-report-label" htmlFor="report-case-select">
                  <span>Select matter</span>
                  <small>{cases.length} total</small>
                </label>
                <select
                  id="report-case-select"
                  className="gba-report-select"
                  value={selectedCaseId}
                  onChange={(event) => {
                    setSelectedCaseId(event.target.value);
                    setMessageTouched(false);
                  }}
                >
                  {cases.map((caseItem) => (
                    <option key={safeId(caseItem)} value={safeId(caseItem)}>
                      {caseItem.reference || "No reference"} — {caseItem.parties || caseItem.property || "No parties captured"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {scope === "agent" && (
              <div className="gba-report-field-group">
                <label className="gba-report-label" htmlFor="report-agent-select">
                  <span>Select agent</span>
                  <small>{agents.length} active</small>
                </label>
                <select
                  id="report-agent-select"
                  className="gba-report-select"
                  value={selectedAgent}
                  onChange={(event) => setSelectedAgent(event.target.value)}
                >
                  {agents.map((agent) => (
                    <option key={agent} value={agent}>{agent}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="gba-report-field-group">
              <div className="gba-report-label">
                <span>Report type</span>
              </div>
              <div className="gba-report-type-grid">
                {REPORT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    className={reportType === type.value ? "gba-report-type-card active" : "gba-report-type-card"}
                    onClick={() => {
                      setReportType(type.value);
                      setMessageTouched(false);
                    }}
                  >
                    <strong>{type.label}</strong>
                    <span>{type.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="gba-report-field-group">
              <label className="gba-report-label" htmlFor="report-search">
                <span>Filter pack</span>
                <small>Reference, parties, agency, property</small>
              </label>
              <div className="gba-report-search-field">
                <FaSearch />
                <input
                  id="report-search"
                  className="gba-report-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search selected pack..."
                />
              </div>
            </div>
          </div>

          <div className="gba-report-preview-wrap">
            <div className="gba-report-panel">
              <div className="gba-report-panel-head">
                <div>
                  <h2>Selected report pack</h2>
                  <p>{currentReportType.description}</p>
                </div>
                <span className={selectedCases.length ? "gba-report-status-pill ready" : "gba-report-status-pill critical"}>
                  {selectedCases.length ? `${selectedCases.length} report${selectedCases.length === 1 ? "" : "s"}` : "No reports"}
                </span>
              </div>

              <div className="gba-report-pack-table-wrap">
                <table className="gba-report-pack-table">
                  <thead>
                    <tr>
                      <th style={{ width: "13%" }}>Reference</th>
                      <th style={{ width: "20%" }}>Parties</th>
                      <th style={{ width: "17%" }}>Agent / Agency</th>
                      <th style={{ width: "17%" }}>Stage</th>
                      <th style={{ width: "17%" }}>Next focus</th>
                      <th style={{ width: "16%" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCases.length ? selectedCases.slice(0, 12).map((caseItem) => {
                      const insight = getCaseInsight(caseItem);
                      return (
                        <tr key={safeId(caseItem)}>
                          <td>{caseItem.reference || "—"}</td>
                          <td className="muted" title={displayText(caseItem.parties)}>{displayText(caseItem.parties)}</td>
                          <td>
                            <div>{displayText(caseItem.agent)}</div>
                            <div className="muted" title={displayText(caseItem.agency)}>{displayText(caseItem.agency)}</div>
                          </td>
                          <td>{insight.stage}</td>
                          <td className="muted" title={insight.nextAction}>{insight.nextAction}</td>
                          <td>
                            <span className={insight.tone === "critical" ? "gba-report-status-pill critical" : "gba-report-status-pill"}>
                              {insight.risk}
                            </span>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="6" className="muted">No matters match the current report selection.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {selectedCases.length > 12 && (
                <div className="gba-report-alert">
                  <FaLayerGroup />
                  <div>
                    <strong>{selectedCases.length - 12} more reports are included in the pack</strong>
                    <span>The table only shows the first 12 rows to keep the screen clean. Print/PDF generation includes the full selected pack.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="gba-report-panel">
              <div className="gba-report-panel-head">
                <div>
                  <h2>Email draft setup</h2>
                  <p>Backend email sending is intentionally staged for later, but the front-end flow and data are ready.</p>
                </div>
                <span className="gba-report-status-pill"><FaEnvelope /> Draft only</span>
              </div>

              <div className="gba-report-email-grid">
                <div className="gba-report-field-group">
                  <label className="gba-report-label" htmlFor="sender-email">
                    <span>From user email</span>
                    <small>Auto pulled</small>
                  </label>
                  <input id="sender-email" className="gba-report-input" value={senderEmail || "No user email found"} readOnly />
                </div>
                <div className="gba-report-field-group">
                  <label className="gba-report-label" htmlFor="recipient-email">
                    <span>To recipient email</span>
                    <small>Client / agent / attorney</small>
                  </label>
                  <input
                    id="recipient-email"
                    className="gba-report-input"
                    type="email"
                    value={recipientEmail}
                    onChange={(event) => setRecipientEmail(event.target.value)}
                    placeholder="client@example.co.za"
                  />
                </div>
              </div>

              <div className="gba-report-field-group">
                <label className="gba-report-label" htmlFor="report-message">
                  <span>Professional message</span>
                  <small>Editable before sending later</small>
                </label>
                <textarea
                  id="report-message"
                  className="gba-report-textarea"
                  value={message}
                  onChange={(event) => {
                    setMessageTouched(true);
                    setMessage(event.target.value);
                  }}
                />
              </div>

              <div className="gba-report-field-group">
                <div className="gba-report-label">
                  <span>Pack options</span>
                  <small>Safe front-end controls</small>
                </div>
                {REPORT_OPTIONS.map((option) => (
                  <label key={option.key} className="gba-report-option-row">
                    <input
                      type="checkbox"
                      checked={!!options[option.key]}
                      disabled={option.locked}
                      onChange={() => toggleOption(option.key)}
                    />
                    <strong>{option.label}</strong>
                    {option.locked ? <span className="gba-report-lock-pill">History needed</span> : <small>Enabled</small>}
                  </label>
                ))}
              </div>

              <div className="gba-report-actions">
                <button type="button" className="neumo-button secondary" onClick={() => setMessageTouched(false)} disabled={!previewCase}>
                  <FaEnvelope /> Reload message
                </button>
                <button type="button" className="neumo-button" onClick={handleStageEmail}>
                  <FaPaperPlane /> Prepare email pack
                </button>
              </div>

              {draftStatus && (
                <div className="gba-report-alert">
                  {draftStatus.tone === "ready" ? <FaCheckCircle /> : <FaExclamationTriangle />}
                  <div>
                    <strong>{draftStatus.title}</strong>
                    <span>{draftStatus.detail}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="gba-report-panel">
              <div className="gba-report-panel-head">
                <div>
                  <h2>Report history placeholder</h2>
                  <p>This panel will display saved backend history once report sending is connected.</p>
                </div>
                <span className="gba-report-status-pill"><FaHistory /> Ready for backend</span>
              </div>

              <div className="gba-report-history-grid">
                <div className="gba-report-history-card">
                  <span>Last sent</span>
                  <strong>{displayText(lastHistory?.sentAt)}</strong>
                </div>
                <div className="gba-report-history-card">
                  <span>Sent by</span>
                  <strong>{displayText(lastHistory?.sentBy)}</strong>
                </div>
                <div className="gba-report-history-card">
                  <span>Sent to</span>
                  <strong>{displayText(lastHistory?.sentTo)}</strong>
                </div>
              </div>
            </div>

            <div className="gba-report-panel">
              <div className="gba-report-preview-toolbar">
                <div>
                  <strong>Current approved GBA report preview</strong>
                  <span> {previewCase ? `${previewCase.reference || "No reference"} · ${previewCase.parties || previewCase.property || "Matter preview"}` : "No matter selected"}</span>
                </div>
                <span className="gba-report-status-pill"><FaEye /> Preview</span>
              </div>

              <div className="gba-report-actions">
                <button type="button" className="neumo-button" onClick={printPack} disabled={!selectedCases.length}>
                  <FaPrint /> Generate PDF pack
                </button>
                <button type="button" className="neumo-button secondary" onClick={handleDownloadPreviewJpg} disabled={!previewCase}>
                  <FaDownload /> Download preview JPG
                </button>
              </div>

              <div className="gba-report-preview-scroll">
                {previewCase ? (
                  <div className="gba-report-a4-scale">
                    <ReportDocument caseData={previewCase} />
                  </div>
                ) : (
                  <div className="gba-report-alert">
                    <FaFilter />
                    <div>
                      <strong>No preview available</strong>
                      <span>Adjust the pack filters or select another scope to preview a report.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      </div>

      <div id="report-centre-print-pack" ref={reportPackRef} className="gba-report-hidden-pack">
        {selectedCases.map((caseItem) => (
          <ReportDocument key={safeId(caseItem)} caseData={caseItem} className="gba-report-pack-page" />
        ))}
      </div>
    </>
  );
}
