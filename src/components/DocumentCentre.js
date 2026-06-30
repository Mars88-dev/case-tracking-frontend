// src/components/DocumentCentre.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import axios from "axios";
import {
  FaCheckCircle,
  FaClipboardList,
  FaCloudUploadAlt,
  FaCopy,
  FaDownload,
  FaExclamationTriangle,
  FaEye,
  FaFileAlt,
  FaFileImage,
  FaFilePdf,
  FaFilter,
  FaFolderOpen,
  FaHourglassHalf,
  FaRegCalendarAlt,
  FaSave,
  FaSearch,
  FaShieldAlt,
  FaSyncAlt,
  FaTimes,
  FaTrash,
  FaUpload,
} from "react-icons/fa";

const BASE_URL = "https://case-tracking-backend.onrender.com";
const DOCUMENT_TYPES = [
  { label: "Seller FICA", requestFields: ["sellerFicaDocumentsRequested"], receivedFields: ["sellerFicaDocumentsReceived"] },
  { label: "Purchaser FICA", requestFields: ["purchaserFicaDocumentsRequested"], receivedFields: ["purchaserFicaDocumentsReceived"] },
  { label: "Title deed", requestFields: ["titleDeedRequested"], receivedFields: ["titleDeedReceived"] },
  { label: "Bond cancellation figures", requestFields: ["bondCancellationFiguresRequested"], receivedFields: ["bondCancellationFiguresReceived"] },
  { label: "Guarantees", requestFields: ["guaranteesFromBondAttorneysRequested"], receivedFields: ["guaranteesFromBondAttorneysReceived"] },
  { label: "Transfer duty receipt", requestFields: ["transferDutyReceiptRequested"], receivedFields: ["transferDutyReceiptReceived"] },
  { label: "Electrical certificate", requestFields: ["electricalComplianceCertificateRequested"], receivedFields: ["electricalComplianceCertificateReceived"] },
  { label: "Municipal clearance", requestFields: ["municipalClearanceCertificateRequested", "municipalClearanceFiguresRequested"], receivedFields: ["municipalClearanceCertificateReceived", "municipalClearanceFiguresReceived"] },
  { label: "Levy clearance", requestFields: ["levyClearanceCertificateRequested"], receivedFields: ["levyClearanceCertificateReceived"] },
  { label: "HOA certificate", requestFields: ["hoaCertificateRequested"], receivedFields: ["hoaCertificateReceived"] },
  { label: "Signed transfer documents", requestFields: [], receivedFields: ["transferSignedSellerDate", "transferSignedPurchaserDate"] },
  { label: "Signed bond documents", requestFields: [], receivedFields: [] },
  { label: "POP / payment proof", requestFields: ["transferCostRequested"], receivedFields: ["transferCostReceived"] },
];

const STATUSES = ["Missing", "Requested", "Received", "Verified", "Expired", "Not applicable"];
const FILTERS = [
  { key: "all", label: "All matters" },
  { key: "missing", label: "Missing documents" },
  { key: "requested", label: "Requested" },
  { key: "received", label: "Verification needed" },
  { key: "expiring", label: "Expiring soon" },
  { key: "ready", label: "Ready document pack" },
];

const EMPTY_FORM = {
  documentType: "Seller FICA",
  status: "Received",
  requestedDate: "",
  receivedDate: "",
  verifiedDate: "",
  expiryDate: "",
  notes: "",
};

function injectDocumentCentreCss() {
  if (document.getElementById("gba-document-centre-css")) return;

  const style = document.createElement("style");
  style.id = "gba-document-centre-css";
  style.innerHTML = `
    .gba-doc-page {
      min-height: calc(100vh - var(--topbar-height));
      padding: clamp(12px, 1.2vw, 20px);
      color: var(--text);
    }

    .gba-doc-page-inner {
      width: 100%;
      max-width: 1920px;
      margin: 0 auto;
      display: grid;
      gap: 14px;
    }

    .gba-doc-hero {
      position: relative;
      overflow: hidden;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: linear-gradient(135deg, #071f39 0%, #0b2b4d 55%, #061c34 100%);
      box-shadow: 0 22px 50px rgba(7, 31, 57, 0.18);
    }

    .gba-doc-hero::before {
      content: "";
      position: absolute;
      inset: 0;
      opacity: 0.82;
      background:
        radial-gradient(circle at 52% 48%, rgba(29, 123, 180, 0.24), transparent 15rem),
        radial-gradient(circle at 94% 20%, rgba(210, 172, 104, 0.16), transparent 12rem),
        repeating-radial-gradient(circle at 56% 50%, rgba(255,255,255,0.08) 0 1px, transparent 1px 10px);
      pointer-events: none;
    }

    .gba-doc-hero::after {
      content: "GB";
      position: absolute;
      right: 34px;
      bottom: 16px;
      color: rgba(243, 200, 111, 0.24);
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 76px;
      line-height: 1;
      font-weight: 900;
      pointer-events: none;
    }

    .gba-doc-hero-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: minmax(310px, 1fr) minmax(520px, auto);
      gap: 18px;
      align-items: center;
      min-height: 150px;
      padding: 20px clamp(20px, 2vw, 30px);
    }

    .gba-doc-kicker {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 30px;
      margin-bottom: 12px;
      padding: 0 14px;
      border-radius: 999px;
      color: #fff;
      background: linear-gradient(135deg, rgba(210, 172, 104, 0.38), rgba(210, 172, 104, 0.16));
      border: 1px solid rgba(210, 172, 104, 0.38);
      font-size: 12px;
      font-weight: 950;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .gba-doc-hero h1 {
      margin: 0;
      color: #fff;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: clamp(30px, 2.55vw, 46px);
      line-height: 0.98;
      letter-spacing: -0.035em;
      font-weight: 850;
    }

    .gba-doc-hero p {
      max-width: 780px;
      margin: 10px 0 0;
      color: rgba(255,255,255,0.84);
      font-size: 13.5px;
      line-height: 1.45;
      font-weight: 650;
    }

    .gba-doc-hero-actions {
      display: grid;
      grid-template-columns: minmax(250px, 1fr) auto auto;
      gap: 11px;
      align-items: center;
      justify-content: end;
    }

    .gba-doc-search {
      position: relative;
      min-width: 0;
    }

    .gba-doc-search svg {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-primary);
      pointer-events: none;
    }

    .gba-doc-search input,
    .gba-doc-field input,
    .gba-doc-field select,
    .gba-doc-field textarea {
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

    .gba-doc-search input {
      min-height: 48px;
      padding-left: 42px;
      background: #fff;
      color: #071f39;
      border-color: rgba(255,255,255,0.46);
      box-shadow: 0 16px 34px rgba(0,0,0,0.18), inset 2px 2px 7px rgba(16,42,74,0.08), inset -2px -2px 7px rgba(255,255,255,0.78);
    }

    .gba-doc-btn {
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

    .gba-doc-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 14px 28px rgba(16, 42, 74, 0.12);
    }

    .gba-doc-btn.primary {
      color: #071f39;
      border-color: rgba(255,255,255,.34);
      background: linear-gradient(135deg, var(--color-accent-2), #d2ac68 68%, #b98a39);
    }

    .gba-doc-btn.danger {
      color: #7f1d1d;
      background: #fee2e2;
      border-color: #fecaca;
    }

    .gba-doc-btn.ghost {
      background: rgba(255,255,255,0.96);
      border-color: rgba(255,255,255,0.5);
      box-shadow: 0 16px 34px rgba(0,0,0,0.15);
    }

    .gba-doc-btn.icon-only {
      width: 42px;
      padding: 0;
    }

    .gba-doc-summary-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 12px;
    }

    .gba-doc-card {
      position: relative;
      overflow: hidden;
      min-height: 120px;
      border: 1px solid rgba(16, 42, 74, 0.1);
      border-radius: 22px;
      padding: 16px;
      background: var(--surface);
      box-shadow: 10px 14px 30px var(--shadow-lo), -8px -8px 22px var(--shadow-hi);
    }

    .gba-doc-card::after {
      content: "";
      position: absolute;
      inset: auto -24px -44px auto;
      width: 112px;
      height: 112px;
      border-radius: 999px;
      background: rgba(210, 172, 104, 0.14);
      pointer-events: none;
    }

    .gba-doc-card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      position: relative;
      z-index: 1;
    }

    .gba-doc-card-icon {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 14px;
      color: var(--color-primary);
      background: rgba(210, 172, 104, 0.18);
    }

    .gba-doc-card strong {
      display: block;
      margin-top: 14px;
      font-size: 30px;
      line-height: 1;
      color: var(--color-primary);
      font-weight: 950;
      position: relative;
      z-index: 1;
    }

    .gba-doc-card span,
    .gba-doc-card p {
      position: relative;
      z-index: 1;
    }

    .gba-doc-card span {
      color: var(--text);
      font-size: 13px;
      font-weight: 950;
    }

    .gba-doc-card p {
      margin: 9px 0 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
      font-weight: 700;
    }

    .gba-doc-panel {
      border: 1px solid rgba(16, 42, 74, 0.1);
      border-radius: 24px;
      background: var(--surface);
      box-shadow: 10px 14px 30px var(--shadow-lo), -8px -8px 22px var(--shadow-hi);
      padding: 16px;
      min-width: 0;
    }

    .gba-doc-panel-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 13px;
    }

    .gba-doc-panel-head h2,
    .gba-doc-panel-head h3 {
      margin: 0;
      color: var(--color-primary);
      font-size: 19px;
      font-weight: 950;
      letter-spacing: -0.02em;
    }

    .gba-doc-panel-head p {
      margin: 5px 0 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
      font-weight: 700;
    }

    .gba-doc-filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .gba-doc-filter-chip {
      border: 1px solid rgba(16, 42, 74, 0.1);
      border-radius: 999px;
      background: var(--surface-soft);
      color: var(--text);
      padding: 8px 11px;
      font-size: 12px;
      font-weight: 900;
      cursor: pointer;
    }

    .gba-doc-filter-chip.active,
    .gba-doc-filter-chip:hover {
      color: #071f39;
      border-color: rgba(210,172,104,.58);
      background: linear-gradient(135deg, #f3c86f, #d2ac68);
    }

    .gba-doc-table-scroller {
      width: 100%;
      overflow: auto;
      border-radius: 18px;
      border: 1px solid rgba(16, 42, 74, 0.09);
    }

    .gba-doc-table {
      width: 100%;
      min-width: 1240px;
      border-collapse: collapse;
      background: var(--surface);
    }

    .gba-doc-table th {
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

    .gba-doc-table td {
      padding: 11px 10px;
      border-bottom: 1px solid rgba(16, 42, 74, 0.08);
      vertical-align: top;
      font-size: 13px;
      color: var(--text);
    }

    .gba-doc-table tr:hover td {
      background: rgba(210, 172, 104, 0.08);
    }

    .gba-doc-ref strong,
    .gba-doc-cell-strong {
      color: var(--color-primary);
      font-weight: 950;
    }

    .gba-doc-muted {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }

    .gba-doc-status-pill {
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

    .gba-doc-status-pill.verified,
    .gba-doc-status-pill.ready {
      background: #dcfce7;
      border-color: #bbf7d0;
      color: #14532d;
    }

    .gba-doc-status-pill.received,
    .gba-doc-status-pill.requested {
      background: #fef3c7;
      border-color: #fde68a;
      color: #713f12;
    }

    .gba-doc-status-pill.missing,
    .gba-doc-status-pill.expired {
      background: #fee2e2;
      border-color: #fecaca;
      color: #7f1d1d;
    }

    .gba-doc-checklist-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .gba-doc-check-item {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      padding: 11px;
      border-radius: 16px;
      border: 1px solid rgba(16,42,74,.08);
      background: var(--surface-soft);
    }

    .gba-doc-check-icon {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 13px;
      color: var(--color-primary);
      background: rgba(210,172,104,.18);
    }

    .gba-doc-drawer-backdrop {
      position: fixed;
      inset: 0;
      z-index: 130;
      background: rgba(7, 31, 57, 0.32);
      backdrop-filter: blur(4px);
    }

    .gba-doc-drawer {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 140;
      width: min(980px, calc(100vw - 20px));
      height: 100vh;
      overflow: auto;
      background: var(--bg);
      color: var(--text);
      border-left: 1px solid rgba(16,42,74,.14);
      box-shadow: -22px 0 60px rgba(7,31,57,.26);
      padding: 18px;
    }

    .gba-doc-drawer-head {
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

    .gba-doc-drawer-head h2 {
      margin: 6px 0 4px;
      color: var(--color-primary);
      font-size: 26px;
      font-weight: 950;
      letter-spacing: -0.03em;
    }

    .gba-doc-drawer-head p {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
      font-weight: 700;
    }

    .gba-doc-form-section {
      display: grid;
      gap: 12px;
      padding: 16px;
      margin-bottom: 14px;
      border-radius: 22px;
      background: var(--surface);
      border: 1px solid rgba(16,42,74,.1);
      box-shadow: 0 10px 24px rgba(16,42,74,.075);
    }

    .gba-doc-form-section h3 {
      margin: 0;
      color: var(--color-primary);
      font-size: 17px;
      font-weight: 950;
    }

    .gba-doc-form-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .gba-doc-field {
      display: grid;
      gap: 7px;
      min-width: 0;
    }

    .gba-doc-field.full {
      grid-column: 1 / -1;
    }

    .gba-doc-field label {
      color: var(--muted);
      font-size: 12px;
      font-weight: 950;
      letter-spacing: .04em;
      text-transform: uppercase;
    }

    .gba-doc-field textarea {
      min-height: 92px;
      resize: vertical;
      line-height: 1.45;
    }

    .gba-doc-upload-box {
      display: grid;
      gap: 8px;
      padding: 14px;
      border-radius: 18px;
      border: 1px dashed rgba(16,42,74,.24);
      background: var(--surface-soft);
      color: var(--muted);
      font-size: 13px;
      font-weight: 750;
      cursor: pointer;
    }

    .gba-doc-upload-box strong {
      color: var(--color-primary);
      font-weight: 950;
    }

    .gba-doc-request-box {
      white-space: pre-wrap;
      min-height: 160px;
      padding: 14px;
      border-radius: 18px;
      background: var(--surface-soft);
      border: 1px solid rgba(16,42,74,.08);
      color: var(--text);
      font-size: 13px;
      line-height: 1.55;
      font-weight: 750;
    }

    .gba-doc-preview-modal {
      position: fixed;
      inset: 28px;
      z-index: 180;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      border-radius: 24px;
      background: var(--surface);
      border: 1px solid rgba(16,42,74,.14);
      box-shadow: 0 24px 80px rgba(7,31,57,.34);
      overflow: hidden;
    }

    .gba-doc-preview-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid rgba(16,42,74,.09);
    }

    .gba-doc-preview-body {
      display: grid;
      place-items: center;
      min-height: 0;
      background: #111827;
    }

    .gba-doc-preview-body iframe,
    .gba-doc-preview-body img {
      width: 100%;
      height: 100%;
      border: 0;
      object-fit: contain;
      background: #111827;
    }

    .gba-sidebar-doc-panel {
      display: grid;
      gap: 12px;
      min-width: 0;
    }

    .gba-sidebar-doc-panel .gba-sidebar-filter-group button {
      justify-content: space-between;
      width: 100%;
    }

    @media (max-width: 1500px) {
      .gba-doc-hero-grid {
        grid-template-columns: 1fr;
      }

      .gba-doc-summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 860px) {
      .gba-doc-hero-actions,
      .gba-doc-form-grid,
      .gba-doc-checklist-grid {
        grid-template-columns: 1fr;
      }

      .gba-doc-summary-grid {
        grid-template-columns: 1fr;
      }

      .gba-doc-drawer {
        width: 100vw;
      }

      .gba-doc-preview-modal {
        inset: 8px;
      }
    }
  `;
  document.head.appendChild(style);
}

function getTokenHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function safeText(value, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function isCompleteField(value) {
  const text = String(value ?? "").trim().toUpperCase();
  return !!text && !["", "N/A", "NA", "NO", "NONE", "NULL", "UNDEFINED", "—", "PARTLY", "PARTIAL", "REQUESTED"].includes(text);
}

function hasRequestedField(value) {
  const text = String(value ?? "").trim().toUpperCase();
  return !!text && !["", "N/A", "NA", "NO", "NONE", "NULL", "UNDEFINED", "—"].includes(text);
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const [year, month, day] = text.slice(0, 10).split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split("/").map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(text);
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

function isExpiringSoon(value) {
  const parsed = parseDate(value);
  if (!parsed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const future = new Date(today);
  future.setDate(today.getDate() + 30);
  return parsed >= today && parsed <= future;
}

function isExpired(value) {
  const parsed = parseDate(value);
  if (!parsed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed < today;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function groupDocumentsByCase(documents) {
  return documents.reduce((acc, doc) => {
    const key = String(doc.caseId || "");
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});
}

function normaliseStatus(status) {
  return STATUSES.includes(status) ? status : "Missing";
}

function getFieldStatus(caseItem, config) {
  const received = (config.receivedFields || []).some((field) => isCompleteField(caseItem?.[field]));
  if (received) return "Received";
  const requested = (config.requestFields || []).some((field) => hasRequestedField(caseItem?.[field]));
  if (requested) return "Requested";
  return "Missing";
}

function getChecklist(caseItem, documents) {
  return DOCUMENT_TYPES.map((config) => {
    const docsForType = documents
      .filter((doc) => String(doc.documentType || "").toLowerCase() === config.label.toLowerCase())
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

    const latest = docsForType[0] || null;
    const verified = docsForType.find((doc) => doc.status === "Verified");
    const received = docsForType.find((doc) => doc.status === "Received" || doc.secureUrl);
    const requested = docsForType.find((doc) => doc.status === "Requested");
    const notApplicable = docsForType.find((doc) => doc.status === "Not applicable");

    let status = getFieldStatus(caseItem, config);
    if (notApplicable) status = "Not applicable";
    if (requested) status = "Requested";
    if (received) status = "Received";
    if (verified) status = "Verified";
    if ((verified || received) && isExpired((verified || received).expiryDate)) status = "Expired";

    return {
      type: config.label,
      status,
      document: latest,
      secureUrl: latest?.secureUrl || "",
      expiryDate: latest?.expiryDate || "",
      notes: latest?.notes || "",
    };
  });
}

function getSummary(caseItem, documents) {
  const checklist = getChecklist(caseItem, documents);
  const counts = checklist.reduce(
    (acc, item) => {
      acc.total += 1;
      const status = normaliseStatus(item.status);
      if (status === "Missing") acc.missing += 1;
      if (status === "Requested") acc.requested += 1;
      if (status === "Received") acc.received += 1;
      if (status === "Verified") acc.verified += 1;
      if (status === "Expired") acc.expired += 1;
      if (isExpiringSoon(item.expiryDate)) acc.expiringSoon += 1;
      return acc;
    },
    { total: 0, missing: 0, requested: 0, received: 0, verified: 0, expired: 0, expiringSoon: 0 }
  );

  let nextAction = "Document pack in good order";
  if (counts.expired > 0) nextAction = "Review expired documents";
  else if (counts.missing > 0) nextAction = `Request ${counts.missing} missing document${counts.missing === 1 ? "" : "s"}`;
  else if (counts.requested > 0) nextAction = "Follow up requested documents";
  else if (counts.received > 0) nextAction = "Verify received documents";
  else if (counts.expiringSoon > 0) nextAction = "Check document expiry dates";

  return { checklist, counts, nextAction };
}

function statusTone(status) {
  const clean = String(status || "").toLowerCase().replace(/\s+/g, "-");
  if (clean.includes("verified")) return "verified";
  if (clean.includes("received")) return "received";
  if (clean.includes("requested")) return "requested";
  if (clean.includes("expired")) return "expired";
  if (clean.includes("missing")) return "missing";
  if (clean.includes("ready")) return "ready";
  return "";
}

function fileIcon(doc) {
  const type = String(doc?.fileType || doc?.cloudinaryFormat || "").toLowerCase();
  if (type.includes("pdf")) return <FaFilePdf />;
  if (type.includes("image") || ["jpg", "jpeg", "png", "webp"].some((ext) => type.includes(ext))) return <FaFileImage />;
  return <FaFileAlt />;
}

export default function DocumentCentre() {
  const location = useLocation();
  const [cases, setCases] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [sidebarHost, setSidebarHost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [editingDocumentId, setEditingDocumentId] = useState("");
  const [documentForm, setDocumentForm] = useState(EMPTY_FORM);
  const [requestMessage, setRequestMessage] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    injectDocumentCentreCss();
  }, []);

  useEffect(() => {
    const attachSidebarHost = () => setSidebarHost(document.getElementById("gba-sidebar-dynamic-slot"));
    attachSidebarHost();
    const timer = setTimeout(attachSidebarHost, 0);
    return () => clearTimeout(timer);
  }, []);

  const loadDocumentCentre = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/document-centre`, { headers: getTokenHeaders() });
      setCases(Array.isArray(res.data?.cases) ? res.data.cases : []);
      setDocuments(Array.isArray(res.data?.documents) ? res.data.documents : []);
    } catch (err) {
      console.error("Document Centre load error:", err);
      alert(err?.response?.data?.message || "Could not load the Document Centre.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocumentCentre();
  }, [loadDocumentCentre]);

  const docsByCase = useMemo(() => groupDocumentsByCase(documents), [documents]);

  const rows = useMemo(() => {
    return cases.map((caseItem) => {
      const caseDocs = docsByCase[String(caseItem._id)] || [];
      const summary = getSummary(caseItem, caseDocs);
      return {
        caseItem,
        documents: caseDocs,
        summary,
      };
    });
  }, [cases, docsByCase]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const caseId = params.get("case");
    if (!caseId || !rows.length) return;
    if (rows.some((row) => String(row.caseItem._id) === String(caseId))) {
      setSelectedCaseId(caseId);
    }
  }, [location.search, rows]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return rows.filter(({ caseItem, summary }) => {
      const haystack = [
        caseItem.reference,
        caseItem.parties,
        caseItem.agent,
        caseItem.agency,
        caseItem.property,
        caseItem.purchasePrice,
        caseItem.createdBy?.username,
        summary.nextAction,
      ]
        .join(" ")
        .toLowerCase();

      if (query && !haystack.includes(query)) return false;
      if (activeFilter === "missing") return summary.counts.missing > 0;
      if (activeFilter === "requested") return summary.counts.requested > 0;
      if (activeFilter === "received") return summary.counts.received > 0;
      if (activeFilter === "expiring") return summary.counts.expiringSoon > 0 || summary.counts.expired > 0;
      if (activeFilter === "ready") return summary.counts.missing === 0 && summary.counts.requested === 0 && summary.counts.received === 0 && summary.counts.expired === 0;
      return true;
    });
  }, [rows, searchQuery, activeFilter]);

  const selectedRow = useMemo(() => {
    if (!selectedCaseId) return null;
    return rows.find((row) => String(row.caseItem._id) === String(selectedCaseId)) || null;
  }, [rows, selectedCaseId]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.matters += 1;
        acc.missing += row.summary.counts.missing;
        acc.requested += row.summary.counts.requested;
        acc.verify += row.summary.counts.received;
        acc.expiring += row.summary.counts.expiringSoon + row.summary.counts.expired;
        if (row.summary.counts.missing === 0 && row.summary.counts.requested === 0 && row.summary.counts.received === 0 && row.summary.counts.expired === 0) acc.ready += 1;
        return acc;
      },
      { matters: 0, missing: 0, requested: 0, verify: 0, expiring: 0, ready: 0 }
    );
  }, [rows]);

  const resetForm = () => {
    setDocumentForm(EMPTY_FORM);
    setUploadFile(null);
    setEditingDocumentId("");
  };

  const openMatter = (caseId) => {
    setSelectedCaseId(String(caseId));
    setRequestMessage("");
    resetForm();
  };

  const formChange = (event) => {
    const { name, value } = event.target;
    setDocumentForm((prev) => ({ ...prev, [name]: value }));
  };

  const editDocument = (doc) => {
    setEditingDocumentId(String(doc._id));
    setDocumentForm({
      documentType: doc.documentType || "Seller FICA",
      status: doc.status || "Received",
      requestedDate: toInputDate(doc.requestedDate),
      receivedDate: toInputDate(doc.receivedDate),
      verifiedDate: toInputDate(doc.verifiedDate),
      expiryDate: toInputDate(doc.expiryDate),
      notes: doc.notes || "",
    });
    setUploadFile(null);
  };

  const saveDocument = async (event) => {
    event.preventDefault();
    if (!selectedRow) return;

    setSaving(true);
    try {
      const headers = getTokenHeaders();
      let saved;
      if (uploadFile) {
        const fileData = await fileToDataUrl(uploadFile);
        const res = await axios.post(
          `${BASE_URL}/api/cases/${selectedRow.caseItem._id}/documents/upload`,
          {
            ...documentForm,
            fileData,
            fileName: uploadFile.name,
            fileType: uploadFile.type,
            fileSize: uploadFile.size,
          },
          { headers }
        );
        saved = res.data;
      } else if (editingDocumentId) {
        const res = await axios.put(`${BASE_URL}/api/documents/${editingDocumentId}`, documentForm, { headers });
        saved = res.data;
      } else {
        const res = await axios.post(`${BASE_URL}/api/cases/${selectedRow.caseItem._id}/documents`, documentForm, { headers });
        saved = res.data;
      }

      setDocuments((prev) => {
        const exists = prev.some((doc) => String(doc._id) === String(saved._id));
        if (exists) return prev.map((doc) => (String(doc._id) === String(saved._id) ? saved : doc));
        return [saved, ...prev];
      });
      resetForm();
    } catch (err) {
      console.error("Document save error:", err);
      alert(err?.response?.data?.message || "Could not save the document item.");
    } finally {
      setSaving(false);
    }
  };

  const quickStatus = async (type, status) => {
    if (!selectedRow) return;
    setSaving(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/api/cases/${selectedRow.caseItem._id}/documents`,
        { documentType: type, status, notes: `${type} marked as ${status.toLowerCase()}.` },
        { headers: getTokenHeaders() }
      );
      setDocuments((prev) => [res.data, ...prev]);
    } catch (err) {
      console.error("Quick document status error:", err);
      alert(err?.response?.data?.message || "Could not update the document checklist.");
    } finally {
      setSaving(false);
    }
  };

  const deleteDocument = async (doc) => {
    const confirmed = window.confirm(`Delete ${doc.fileName || doc.documentType}?`);
    if (!confirmed) return;

    try {
      await axios.delete(`${BASE_URL}/api/documents/${doc._id}`, { headers: getTokenHeaders() });
      setDocuments((prev) => prev.filter((item) => String(item._id) !== String(doc._id)));
    } catch (err) {
      console.error("Document delete error:", err);
      alert(err?.response?.data?.message || "Could not delete the document item.");
    }
  };

  const generateRequestMessage = () => {
    if (!selectedRow) return;
    const missing = selectedRow.summary.checklist.filter((item) => item.status === "Missing" || item.status === "Expired");
    const requested = selectedRow.summary.checklist.filter((item) => item.status === "Requested");
    const lines = [...missing, ...requested].map((item) => `• ${item.type}${item.status === "Expired" ? " - updated copy required" : ""}`);

    const text = `Good day,\n\nPlease send the following documents for matter ${safeText(selectedRow.caseItem.reference)} (${safeText(selectedRow.caseItem.parties)}):\n\n${lines.length ? lines.join("\n") : "• No outstanding documents currently listed."}\n\nKind regards,\nGerhard Barnard Inc`;
    setRequestMessage(text);
  };

  const copyRequestMessage = async () => {
    if (!requestMessage) return;
    try {
      await navigator.clipboard.writeText(requestMessage);
      alert("Document request message copied.");
    } catch {
      alert("Could not copy automatically. Please highlight and copy the message manually.");
    }
  };

  const summaryCards = [
    { label: "Missing documents", value: totals.missing, note: "Checklist items still required across open matters.", icon: <FaExclamationTriangle /> },
    { label: "Requested not received", value: totals.requested, note: "Documents already requested and waiting for follow-up.", icon: <FaHourglassHalf /> },
    { label: "Verification queue", value: totals.verify, note: "Received uploads that still need to be checked.", icon: <FaShieldAlt /> },
    { label: "Expiry attention", value: totals.expiring, note: "Documents expired or close to expiry within 30 days.", icon: <FaRegCalendarAlt /> },
    { label: "Ready document packs", value: totals.ready, note: "Matters with no outstanding checklist action.", icon: <FaCheckCircle /> },
  ];

  const sidebarPortal = sidebarHost
    ? createPortal(
        <div className="gba-sidebar-doc-panel">
          <label className="gba-sidebar-search">
            <span><FaSearch /> Search</span>
            <div>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Reference, parties, agent or property"
              />
            </div>
          </label>

          <div className="gba-sidebar-filter-group" aria-label="Document Centre filters">
            <span><FaFilter /> Document queues</span>
            {FILTERS.map((filter) => (
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
            <div><strong>{totals.matters}</strong><span>Matters</span></div>
            <div><strong>{totals.missing}</strong><span>Missing</span></div>
            <div><strong>{totals.verify}</strong><span>To verify</span></div>
          </div>
        </div>,
        sidebarHost
      )
    : null;

  if (loading) {
    return <div className="gba-doc-page"><div className="gba-doc-panel">Loading Document Centre…</div></div>;
  }

  return (
    <div className="gba-doc-page">
      {sidebarPortal}
      <div className="gba-doc-page-inner">
        <section className="gba-doc-hero">
          <div className="gba-doc-hero-grid">
            <div>
              <span className="gba-doc-kicker"><FaFolderOpen /> Document Centre</span>
              <h1>Keep every matter document under control.</h1>
              <p>
                Track requested, received, verified and expiring documents across all matters. Open a matter to upload files, update the checklist and prepare a clean document request message.
              </p>
            </div>

            <div className="gba-doc-hero-actions">
              <label className="gba-doc-search">
                <FaSearch />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search reference, parties, agent or property"
                />
              </label>
              <button type="button" className="gba-doc-btn ghost" onClick={loadDocumentCentre}>
                <FaSyncAlt /> Refresh
              </button>
              <button
                type="button"
                className="gba-doc-btn primary"
                onClick={() => filteredRows[0] && openMatter(filteredRows[0].caseItem._id)}
                disabled={!filteredRows.length}
              >
                <FaUpload /> Upload document
              </button>
            </div>
          </div>
        </section>

        <section className="gba-doc-summary-grid" aria-label="Document Centre summary">
          {summaryCards.map((card) => (
            <article key={card.label} className="gba-doc-card">
              <div className="gba-doc-card-top">
                <span>{card.label}</span>
                <div className="gba-doc-card-icon">{card.icon}</div>
              </div>
              <strong>{card.value}</strong>
              <p>{card.note}</p>
            </article>
          ))}
        </section>

        <section className="gba-doc-panel">
          <div className="gba-doc-panel-head">
            <div>
              <h2>Matter Document Register</h2>
              <p>One register for missing documents, uploaded files, verification work and expiry reminders.</p>
            </div>
            <span className={`gba-doc-status-pill ${statusTone(activeFilter === "all" ? "ready" : activeFilter)}`}>
              {FILTERS.find((filter) => filter.key === activeFilter)?.label || "All matters"}
            </span>
          </div>

          <div className="gba-doc-filter-row">
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={activeFilter === filter.key ? "gba-doc-filter-chip active" : "gba-doc-filter-chip"}
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="gba-doc-table-scroller">
            <table className="gba-doc-table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Parties</th>
                  <th>Property</th>
                  <th>Agent</th>
                  <th>Handler</th>
                  <th>Uploaded</th>
                  <th>Missing</th>
                  <th>Requested</th>
                  <th>To verify</th>
                  <th>Expiry</th>
                  <th>Next action</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(({ caseItem, documents: caseDocs, summary }) => (
                  <tr key={caseItem._id}>
                    <td className="gba-doc-ref"><strong>{safeText(caseItem.reference)}</strong></td>
                    <td><span className="gba-doc-cell-strong">{safeText(caseItem.parties)}</span></td>
                    <td>{safeText(caseItem.property)}</td>
                    <td>{safeText(caseItem.agent || caseItem.agency)}</td>
                    <td>{safeText(caseItem.createdBy?.username || caseItem.createdBy)}</td>
                    <td>{caseDocs.filter((doc) => doc.secureUrl).length}</td>
                    <td><span className={`gba-doc-status-pill ${summary.counts.missing ? "missing" : "verified"}`}>{summary.counts.missing}</span></td>
                    <td><span className={`gba-doc-status-pill ${summary.counts.requested ? "requested" : "verified"}`}>{summary.counts.requested}</span></td>
                    <td><span className={`gba-doc-status-pill ${summary.counts.received ? "received" : "verified"}`}>{summary.counts.received}</span></td>
                    <td><span className={`gba-doc-status-pill ${summary.counts.expired || summary.counts.expiringSoon ? "expired" : "verified"}`}>{summary.counts.expired + summary.counts.expiringSoon}</span></td>
                    <td><strong>{summary.nextAction}</strong></td>
                    <td>
                      <button type="button" className="gba-doc-btn primary" onClick={() => openMatter(caseItem._id)}>
                        Open panel
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredRows.length && (
                  <tr>
                    <td colSpan="12">No matters match this document view.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedRow && (
        <>
          <div className="gba-doc-drawer-backdrop" onClick={() => setSelectedCaseId("")} />
          <aside className="gba-doc-drawer" aria-label="Matter document panel">
            <div className="gba-doc-drawer-head">
              <div>
                <span className="gba-doc-kicker"><FaClipboardList /> Matter documents</span>
                <h2>{safeText(selectedRow.caseItem.reference)}</h2>
                <p>{safeText(selectedRow.caseItem.parties)} · {safeText(selectedRow.caseItem.property)}</p>
              </div>
              <button type="button" className="gba-doc-btn icon-only" onClick={() => setSelectedCaseId("")} aria-label="Close document panel">
                <FaTimes />
              </button>
            </div>

            <section className="gba-doc-form-section">
              <div className="gba-doc-panel-head">
                <div>
                  <h3>Missing document checklist</h3>
                  <p>Mark documents as requested, received or verified as the file progresses.</p>
                </div>
                <button type="button" className="gba-doc-btn" onClick={generateRequestMessage}>
                  <FaCopy /> Build request message
                </button>
              </div>
              <div className="gba-doc-checklist-grid">
                {selectedRow.summary.checklist.map((item) => (
                  <div key={item.type} className="gba-doc-check-item">
                    <span className="gba-doc-check-icon">{item.status === "Verified" ? <FaCheckCircle /> : item.status === "Received" ? <FaShieldAlt /> : item.status === "Requested" ? <FaHourglassHalf /> : <FaFileAlt />}</span>
                    <div>
                      <strong>{item.type}</strong>
                      <div className="gba-doc-muted">
                        {item.secureUrl ? `Uploaded: ${safeText(item.document?.fileName, "file saved")}` : item.status}
                        {item.expiryDate ? ` · Expires ${formatDate(item.expiryDate)}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" className="gba-doc-btn icon-only" title="Mark requested" onClick={() => quickStatus(item.type, "Requested")} disabled={saving}>R</button>
                      <button type="button" className="gba-doc-btn icon-only" title="Mark verified" onClick={() => quickStatus(item.type, "Verified")} disabled={saving}>V</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <form className="gba-doc-form-section" onSubmit={saveDocument}>
              <div className="gba-doc-panel-head">
                <div>
                  <h3>{editingDocumentId ? "Update document item" : "Upload or update a document"}</h3>
                  <p>Select the document type, upload the file where available, and keep verification notes in one place.</p>
                </div>
                <button type="button" className="gba-doc-btn" onClick={resetForm}>Clear</button>
              </div>

              <div className="gba-doc-form-grid">
                <label className="gba-doc-field">
                  <span>Document type</span>
                  <select name="documentType" value={documentForm.documentType} onChange={formChange}>
                    {DOCUMENT_TYPES.map((type) => <option key={type.label} value={type.label}>{type.label}</option>)}
                  </select>
                </label>
                <label className="gba-doc-field">
                  <span>Status</span>
                  <select name="status" value={documentForm.status} onChange={formChange}>
                    {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <label className="gba-doc-field">
                  <span>Expiry date</span>
                  <input type="date" name="expiryDate" value={documentForm.expiryDate} onChange={formChange} />
                </label>
                <label className="gba-doc-field">
                  <span>Requested date</span>
                  <input type="date" name="requestedDate" value={documentForm.requestedDate} onChange={formChange} />
                </label>
                <label className="gba-doc-field">
                  <span>Received date</span>
                  <input type="date" name="receivedDate" value={documentForm.receivedDate} onChange={formChange} />
                </label>
                <label className="gba-doc-field">
                  <span>Verified date</span>
                  <input type="date" name="verifiedDate" value={documentForm.verifiedDate} onChange={formChange} />
                </label>
                <label className="gba-doc-field full">
                  <span>Notes</span>
                  <textarea name="notes" value={documentForm.notes} onChange={formChange} placeholder="Add who sent it, what must still be checked, or any expiry instruction." />
                </label>
                <label className="gba-doc-upload-box full">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    style={{ display: "none" }}
                    onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                  />
                  <strong><FaCloudUploadAlt /> {uploadFile ? uploadFile.name : "Choose PDF or image to upload"}</strong>
                  <span>PDFs and images are stored against this matter and can be previewed from the document list.</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                <button type="submit" className="gba-doc-btn primary" disabled={saving}>
                  <FaSave /> {saving ? "Saving…" : editingDocumentId ? "Save changes" : uploadFile ? "Upload document" : "Save checklist item"}
                </button>
              </div>
            </form>

            <section className="gba-doc-form-section">
              <div className="gba-doc-panel-head">
                <div>
                  <h3>Uploaded and tracked documents</h3>
                  <p>Preview saved files and update the verification status when the document has been checked.</p>
                </div>
              </div>
              <div className="gba-doc-table-scroller">
                <table className="gba-doc-table" style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Status</th>
                      <th>Uploaded by</th>
                      <th>Uploaded</th>
                      <th>Expiry</th>
                      <th>Notes</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRow.documents.map((doc) => (
                      <tr key={doc._id}>
                        <td><span className="gba-doc-cell-strong">{fileIcon(doc)} {safeText(doc.documentType)}</span><br /><span className="gba-doc-muted">{safeText(doc.fileName, "Checklist item")}</span></td>
                        <td><span className={`gba-doc-status-pill ${statusTone(doc.status)}`}>{safeText(doc.status)}</span></td>
                        <td>{safeText(doc.uploadedByName || doc.uploadedBy?.username)}</td>
                        <td>{formatDate(doc.createdAt)}</td>
                        <td>{formatDate(doc.expiryDate)}</td>
                        <td>{safeText(doc.notes)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                            {doc.secureUrl && <button type="button" className="gba-doc-btn icon-only" title="Preview" onClick={() => setPreviewDoc(doc)}><FaEye /></button>}
                            {doc.secureUrl && <a className="gba-doc-btn icon-only" title="Open" href={doc.secureUrl} target="_blank" rel="noopener noreferrer"><FaDownload /></a>}
                            <button type="button" className="gba-doc-btn icon-only" title="Edit" onClick={() => editDocument(doc)}><FaSave /></button>
                            <button type="button" className="gba-doc-btn icon-only danger" title="Delete" onClick={() => deleteDocument(doc)}><FaTrash /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!selectedRow.documents.length && (
                      <tr><td colSpan="7">No documents have been uploaded or tracked for this matter yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {requestMessage && (
              <section className="gba-doc-form-section">
                <div className="gba-doc-panel-head">
                  <div>
                    <h3>Document request message</h3>
                    <p>Copy this message into email or WhatsApp when following up outstanding documents.</p>
                  </div>
                  <button type="button" className="gba-doc-btn primary" onClick={copyRequestMessage}><FaCopy /> Copy message</button>
                </div>
                <div className="gba-doc-request-box">{requestMessage}</div>
              </section>
            )}
          </aside>
        </>
      )}

      {previewDoc && (
        <>
          <div className="gba-doc-drawer-backdrop" onClick={() => setPreviewDoc(null)} />
          <div className="gba-doc-preview-modal" role="dialog" aria-label="Document preview">
            <div className="gba-doc-preview-head">
              <strong>{safeText(previewDoc.fileName || previewDoc.documentType)}</strong>
              <button type="button" className="gba-doc-btn icon-only" onClick={() => setPreviewDoc(null)}><FaTimes /></button>
            </div>
            <div className="gba-doc-preview-body">
              {String(previewDoc.fileType || previewDoc.cloudinaryFormat || "").toLowerCase().includes("pdf") ? (
                <iframe title="Document preview" src={previewDoc.secureUrl} />
              ) : (
                <img src={previewDoc.secureUrl} alt={previewDoc.fileName || previewDoc.documentType} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
