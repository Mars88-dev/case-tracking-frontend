// src/components/MyTransactions.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaArchive,
  FaBolt,
  FaCalendarDay,
  FaChartLine,
  FaCheckCircle,
  FaClock,
  FaComments,
  FaEdit,
  FaExclamationTriangle,
  FaFileSignature,
  FaFilter,
  FaFlag,
  FaFolderOpen,
  FaGavel,
  FaHandshake,
  FaHourglassHalf,
  FaLayerGroup,
  FaListUl,
  FaPrint,
  FaRegCalendarCheck,
  FaRegFileAlt,
  FaSearch,
  FaShieldAlt,
  FaTasks,
  FaTimesCircle,
  FaTrash,
  FaUndo,
  FaUserTie,
} from "react-icons/fa";
import MessageBox from "./MessageBox";

const BASE_URL = "https://case-tracking-backend.onrender.com";
const DAY_MS = 86400000;
const STALE_UPDATE_DAYS = 9;
const CRITICAL_UPDATE_DAYS = 14;
const LONG_FILE_DAYS = 90;

const CORE_TRANSFER_ITEMS = [
  {
    key: "sellerFicaDocuments",
    label: "Seller FICA",
    type: "fica",
    overdueAfterDays: 5,
  },
  {
    key: "purchaserFicaDocuments",
    label: "Purchaser FICA",
    type: "fica",
    overdueAfterDays: 5,
  },
  {
    key: "titleDeed",
    label: "Title deed",
    type: "title",
    overdueAfterDays: 10,
  },
  {
    key: "municipalClearanceFigures",
    label: "Municipal clearance figures",
    type: "municipal",
    overdueAfterDays: 12,
  },
  {
    key: "municipalClearanceCertificate",
    label: "Municipal clearance certificate",
    type: "municipal",
    overdueAfterDays: 14,
  },
  {
    key: "guaranteesFromBondAttorneys",
    label: "Guarantees",
    type: "guarantees",
    overdueAfterDays: 7,
  },
  {
    key: "transferCost",
    label: "Transfer costs",
    type: "costs",
    overdueAfterDays: 5,
  },
  {
    key: "electricalComplianceCertificate",
    label: "Electrical compliance",
    type: "compliance",
    overdueAfterDays: 10,
  },
  {
    key: "levyClearanceCertificate",
    label: "Levy clearance",
    type: "clearance",
    overdueAfterDays: 12,
  },
  {
    key: "hoaCertificate",
    label: "HOA certificate",
    type: "clearance",
    overdueAfterDays: 12,
  },
];

const DATE_LABELS = new Set(["N/A", "Partly", "Requested"]);
const INCOMPLETE_LABELS = new Set(["", "N/A", "PARTLY", "REQUESTED", "NULL", "UNDEFINED", "—"]);

function injectTransactionsCss() {
  if (document.getElementById("gba-transactions-intelligence-css")) return;

  const style = document.createElement("style");
  style.id = "gba-transactions-intelligence-css";
  style.innerHTML = `
    #transactionsPrintArea { display: none; }

    .gba-transactions-page {
      min-height: calc(100vh - var(--topbar-height));
      padding: 18px clamp(12px, 1.5vw, 24px) 34px;
      color: var(--text);
    }

    .gba-transactions-hero-content {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: minmax(320px, 1fr) minmax(440px, auto);
      gap: 18px;
      align-items: center;
      padding: 24px clamp(18px, 2.1vw, 32px);
    }

    .gba-transactions-hero-actions {
      display: grid;
      grid-template-columns: minmax(260px, 1fr) auto auto;
      gap: 12px;
      align-items: center;
      justify-content: end;
    }

    .gba-transactions-search {
      position: relative;
      width: min(380px, 100%);
    }

    .gba-transactions-search svg {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-primary);
      pointer-events: none;
    }

    .gba-transactions-search input {
      padding-left: 42px;
      min-height: 48px;
      font-weight: 800;
    }

    .gba-transactions-summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(180px, 1fr));
      gap: 14px;
      margin: 16px 0;
    }

    .gba-transactions-content-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(330px, 390px);
      gap: 16px;
      align-items: start;
    }

    .gba-transactions-right-column {
      position: sticky;
      top: calc(var(--topbar-height) + 18px);
      display: grid;
      gap: 14px;
    }

    .gba-queue-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(155px, 1fr));
      gap: 10px;
    }

    .gba-queue-button {
      min-height: 68px;
      width: 100%;
      display: grid;
      grid-template-columns: 32px 1fr auto;
      gap: 10px;
      align-items: center;
      text-align: left;
      border: 1px solid rgba(16, 42, 74, 0.1);
      border-radius: 16px;
      background: var(--surface);
      color: var(--text);
      cursor: pointer;
      padding: 11px 12px;
      box-shadow: 0 10px 24px rgba(16, 42, 74, 0.06);
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }

    .gba-queue-button:hover,
    .gba-queue-button.active {
      transform: translateY(-1px);
      border-color: rgba(210, 172, 104, 0.48);
      box-shadow: 0 16px 30px rgba(16, 42, 74, 0.1);
    }

    .gba-queue-button.active {
      background: linear-gradient(135deg, rgba(210, 172, 104, 0.18), var(--surface));
    }

    .gba-queue-button small,
    .gba-case-meta small,
    .gba-insight-list small {
      color: var(--muted);
      font-weight: 750;
    }

    .gba-case-table-wrap {
      width: 100%;
      overflow-x: auto;
      border-radius: 18px;
      scrollbar-width: thin;
      scrollbar-color: rgba(16, 42, 74, 0.25) transparent;
    }

    .gba-case-table-wrap::-webkit-scrollbar {
      height: 8px;
    }

    .gba-case-table-wrap::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: rgba(16, 42, 74, 0.22);
    }

    .gba-case-table {
      width: 100%;
      min-width: 1120px;
      border-collapse: separate;
      border-spacing: 0 10px;
    }

    .gba-case-table th {
      padding: 0 12px 6px;
      color: var(--muted);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      text-align: left;
      white-space: nowrap;
    }

    .gba-case-table td {
      padding: 13px 12px;
      background: var(--surface);
      border-top: 1px solid var(--border-soft);
      border-bottom: 1px solid var(--border-soft);
      vertical-align: middle;
    }

    .gba-case-table tbody tr.gba-case-row td:first-child {
      border-left: 1px solid var(--border-soft);
      border-radius: 18px 0 0 18px;
    }

    .gba-case-table tbody tr.gba-case-row td:last-child {
      border-right: 1px solid var(--border-soft);
      border-radius: 0 18px 18px 0;
    }

    .gba-case-row:hover td {
      box-shadow: 0 12px 28px rgba(16, 42, 74, 0.08);
    }

    .gba-case-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 7px;
      flex-wrap: wrap;
    }

    .gba-action-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-height: 34px;
      padding: 0 10px;
      border-radius: 12px;
      border: 1px solid rgba(16, 42, 74, 0.09);
      background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
      color: var(--color-primary);
      cursor: pointer;
      font-size: 12px;
      font-weight: 900;
      text-decoration: none;
    }

    .gba-action-button.primary {
      border-color: rgba(210, 172, 104, 0.38);
      background: linear-gradient(135deg, var(--color-accent-2), #c79742 62%, var(--color-accent));
      color: #071f39;
    }

    .gba-action-button.danger {
      border-color: rgba(220, 38, 38, 0.26);
      color: #991b1b;
      background: rgba(254, 226, 226, 0.8);
    }

    .gba-action-button.success {
      border-color: rgba(22, 163, 74, 0.26);
      color: #14532d;
      background: rgba(220, 252, 231, 0.8);
    }

    .gba-risk-pill,
    .gba-stage-pill,
    .gba-status-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-height: 28px;
      border-radius: 999px;
      padding: 0 10px;
      white-space: nowrap;
      font-size: 11px;
      font-weight: 950;
    }

    .gba-expanded-row td {
      border-radius: 18px !important;
      border: 1px solid var(--border-soft) !important;
      background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%) !important;
      padding: 16px !important;
    }

    .gba-timeline-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(210px, 1fr));
      gap: 12px;
    }

    .gba-milestone-card {
      display: grid;
      gap: 8px;
      padding: 14px;
      border-radius: 16px;
      border: 1px solid rgba(16, 42, 74, 0.09);
      background: var(--surface);
    }

    .gba-milestone-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .gba-insight-list {
      display: grid;
      gap: 10px;
    }

    .gba-insight-list > div {
      display: grid;
      grid-template-columns: 34px 1fr;
      gap: 10px;
      align-items: start;
      padding: 12px;
      border-radius: 15px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.06);
    }

    @media (max-width: 1500px) {
      .gba-transactions-summary-grid {
        grid-template-columns: repeat(2, minmax(190px, 1fr));
      }

      .gba-queue-grid {
        grid-template-columns: repeat(3, minmax(155px, 1fr));
      }
    }

    @media (max-width: 1220px) {
      .gba-transactions-hero-content,
      .gba-transactions-content-grid {
        grid-template-columns: 1fr;
      }

      .gba-transactions-right-column {
        position: static;
      }

      .gba-transactions-hero-actions {
        justify-content: stretch;
      }
    }

    @media (max-width: 820px) {
      .gba-transactions-hero-actions,
      .gba-transactions-summary-grid,
      .gba-queue-grid,
      .gba-timeline-grid {
        grid-template-columns: 1fr;
      }

      .gba-transactions-search {
        width: 100%;
      }
    }

    @media print {
      @page { size: A4 portrait; margin: 8mm; }
      html, body, #root { height: auto !important; }
      body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .screen-only { display: none !important; }
      #transactionsPrintArea { display: block !important; color: #000; font-size: 10px; line-height: 1.25; }
      #transactionsPrintArea h1 { margin: 0 0 8px; font-size: 17px; }
      #transactionsPrintArea h2 { margin: 10px 0 5px; font-size: 12px; }
      #transactionsPrintArea table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      #transactionsPrintArea th, #transactionsPrintArea td { border: 1px solid #d7d7d7; padding: 3px 4px; }
      #transactionsPrintArea th { background: #f0f0f0; font-weight: 900; }
      #transactionsPrintArea .print-meta { display: flex; justify-content: space-between; margin-bottom: 8px; color: #333; }
      #transactionsPrintArea .ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    }
  `;
  document.head.appendChild(style);
}

const parseAnyDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed || DATE_LABELS.has(trimmed)) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/").map(Number);
    return new Date(y, m - 1, d);
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

const daysUntil = (value) => {
  const date = startOfDay(parseAnyDate(value));
  if (!date) return null;
  return Math.ceil((date.getTime() - todayStart().getTime()) / DAY_MS);
};

const daysBetween = (startValue, endValue) => {
  const start = startOfDay(parseAnyDate(startValue));
  const end = startOfDay(parseAnyDate(endValue));
  if (!start || !end) return null;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / DAY_MS));
};

const formatDate = (value) => {
  const date = parseAnyDate(value);
  if (!date) return value ? String(value) : "—";
  return date.toLocaleDateString("en-GB");
};

const formatNumber = (value) => new Intl.NumberFormat("en-ZA").format(Number(value || 0));

const displayText = (value) => {
  if (value === 0) return "0";
  if (value === false) return "No";
  if (value === true) return "Yes";
  if (value == null || value === "") return "—";
  return formatDate(value);
};

const normaliseValue = (value) => String(value ?? "").trim().toUpperCase();

const hasValue = (value) => !INCOMPLETE_LABELS.has(normaliseValue(value));
const hasCompleted = (value) => hasValue(value);
const hasRequested = (value) => {
  const normalised = normaliseValue(value);
  return normalised === "REQUESTED" || hasValue(value);
};

const getOwnerName = (caseItem, currentUser) =>
  caseItem?.createdBy?.username || currentUser?.username || currentUser?.name || "My matters";

const thisWeekRange = () => {
  const today = todayStart();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(today);
  start.setDate(today.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
};

const isThisWeek = (value) => {
  const date = startOfDay(parseAnyDate(value));
  if (!date) return false;
  const { start, end } = thisWeekRange();
  return date >= start && date < end;
};

const isDueToday = (dueDate, completedDate) => {
  if (hasCompleted(completedDate)) return false;
  return daysUntil(dueDate) === 0;
};

const isOverdue = (dueDate, completedDate) => {
  if (hasCompleted(completedDate)) return false;
  const remaining = daysUntil(dueDate);
  return typeof remaining === "number" && remaining < 0;
};

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

const ageCategory = (days) => {
  if (days == null) return "No instruction date";
  if (days <= 14) return "0-14 days";
  if (days <= 30) return "15-30 days";
  if (days <= 60) return "31-60 days";
  if (days <= 90) return "61-90 days";
  return "90+ days";
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

const buildOverdueItems = (caseItem) => {
  const items = [];

  if (isOverdue(caseItem.depositDueDate, caseItem.depositFulfilledDate)) {
    const days = Math.abs(daysUntil(caseItem.depositDueDate));
    items.push({ label: "Deposit overdue", days });
  }

  if (isOverdue(caseItem.bondDueDate, caseItem.bondFulfilledDate)) {
    const days = Math.abs(daysUntil(caseItem.bondDueDate));
    items.push({ label: "Bond overdue", days });
  }

  CORE_TRANSFER_ITEMS.forEach((item) => {
    const task = buildRequestedTaskDelay(caseItem, item);
    if (task && task.days >= task.overdueAfterDays) {
      items.push({ label: `${task.label} overdue`, days: task.days });
    }
  });

  return items;
};

const buildMilestone = ({ title, requested, received, completed, fallbackRequested, assignedTo, notes, overdueAfterDays = 7 }) => {
  const requestedStarted = hasRequested(requested) || !!fallbackRequested;
  const isCompleted = !!completed || hasCompleted(received);
  const requestedDate = parseAnyDate(requested) ? requested : fallbackRequested;
  const receivedDate = received;
  const openDelay = requestedDate ? daysSince(requestedDate) : null;
  const completedDelay = requestedDate && receivedDate ? daysBetween(requestedDate, receivedDate) : null;
  let status = "not-started";

  if (isCompleted) status = "completed";
  else if (requestedStarted && openDelay != null && openDelay >= overdueAfterDays) status = "overdue";
  else if (requestedStarted) status = "requested";

  return {
    title,
    status,
    requestedDate,
    receivedDate,
    assignedTo,
    notes,
    delayDays: isCompleted ? completedDelay : openDelay,
  };
};

const analyseCase = (caseItem, currentUser) => {
  const ownerName = getOwnerName(caseItem, currentUser);
  const daysSinceInstruction = daysSince(caseItem.instructionReceived);
  const daysSinceLastUpdate = daysSince(caseItem.updatedAt || caseItem.createdAt || caseItem.instructionReceived);
  const daysToBondDue = daysUntil(caseItem.bondDueDate);
  const daysToDepositDue = daysUntil(caseItem.depositDueDate);
  const overdueItems = buildOverdueItems(caseItem);

  const sellerFicaReady = hasCompleted(caseItem.sellerFicaDocumentsReceived);
  const purchaserFicaReady = hasCompleted(caseItem.purchaserFicaDocumentsReceived);
  const ficaReady = sellerFicaReady && purchaserFicaReady;
  const sellerSigned = hasCompleted(caseItem.transferSignedSellerDate);
  const purchaserSigned = hasCompleted(caseItem.transferSignedPurchaserDate);
  const docsSigned = sellerSigned && purchaserSigned;
  const costsPaid = hasCompleted(caseItem.transferCostReceived);
  const hasBond = hasCompleted(caseItem.bondAmount);
  const depositExpected = hasCompleted(caseItem.depositAmount);
  const bondFulfilled = hasCompleted(caseItem.bondFulfilledDate);
  const depositFulfilled = hasCompleted(caseItem.depositFulfilledDate);
  const guaranteesReady = !hasBond || hasCompleted(caseItem.guaranteesFromBondAttorneysReceived);
  const titleDeedReady = hasCompleted(caseItem.titleDeedReceived);
  const municipalFiguresReady = hasCompleted(caseItem.municipalClearanceFiguresReceived);
  const municipalCertificateReady = hasCompleted(caseItem.municipalClearanceCertificateReceived);
  const clearanceReady = municipalCertificateReady || municipalFiguresReady;
  const lodged = hasCompleted(caseItem.documentsLodgedDate);
  const prep = hasCompleted(caseItem.deedsPrepDate);
  const registered = hasCompleted(caseItem.registrationDate);
  const active = caseItem.isActive !== false;
  const readyForLodgement = active && !registered && !lodged && ficaReady && docsSigned && costsPaid && guaranteesReady && clearanceReady && titleDeedReady;
  const readyForReport = active && !registered && (daysSinceLastUpdate == null || daysSinceLastUpdate >= 6);

  const dueToday =
    isDueToday(caseItem.depositDueDate, caseItem.depositFulfilledDate) ||
    isDueToday(caseItem.bondDueDate, caseItem.bondFulfilledDate);

  let risk = "Healthy";
  let riskTone = "healthy";

  if (!active && registered) {
    risk = "Archived";
    riskTone = "muted";
  } else if (readyForLodgement) {
    risk = "Ready for lodgement";
    riskTone = "ready";
  } else if (overdueItems.length >= 2 || (daysSinceLastUpdate != null && daysSinceLastUpdate >= CRITICAL_UPDATE_DAYS) || (daysSinceInstruction != null && daysSinceInstruction > LONG_FILE_DAYS && !registered)) {
    risk = "Critical";
    riskTone = "critical";
  } else if (overdueItems.length || (daysSinceLastUpdate != null && daysSinceLastUpdate >= STALE_UPDATE_DAYS)) {
    risk = "Stuck";
    riskTone = "stuck";
  } else if (!ficaReady || !docsSigned || (hasBond && !bondFulfilled) || (depositExpected && !depositFulfilled) || !clearanceReady || !titleDeedReady) {
    risk = "Needs attention";
    riskTone = "attention";
  }

  const nextAction = (() => {
    if (!active && registered) return "Registration captured. Keep this matter archived.";
    if (registered) return "Registration captured. Archive the file when final admin is complete.";
    if (!sellerFicaReady) return "Request seller FICA documents.";
    if (!purchaserFicaReady) return "Request purchaser FICA documents.";
    if (isOverdue(caseItem.depositDueDate, caseItem.depositFulfilledDate)) return `Deposit is overdue by ${Math.abs(daysUntil(caseItem.depositDueDate))} day(s). Follow up today.`;
    if (daysToDepositDue != null && daysToDepositDue >= 0 && daysToDepositDue <= 2 && !depositFulfilled) return `Deposit due in ${daysToDepositDue} day(s). Confirm payment plan.`;
    if (hasBond && isOverdue(caseItem.bondDueDate, caseItem.bondFulfilledDate)) return `Bond is overdue by ${Math.abs(daysUntil(caseItem.bondDueDate))} day(s). Follow up bond attorneys.`;
    if (hasBond && daysToBondDue != null && daysToBondDue >= 0 && daysToBondDue <= 2 && !bondFulfilled) return `Bond due in ${daysToBondDue} day(s). Follow up bond approval.`;
    if (!sellerSigned) return "Arrange seller transfer document signature.";
    if (!purchaserSigned) return "Arrange purchaser transfer document signature.";
    if (!costsPaid) return "Follow up transfer costs payment.";
    if (hasBond && !hasCompleted(caseItem.guaranteesFromBondAttorneysReceived)) return "Follow up guarantees from bond attorneys.";
    if (!municipalFiguresReady) return "Request municipal clearance figures.";
    if (!municipalCertificateReady) return "Follow up municipal clearance certificate.";
    if (!titleDeedReady) return "Request or confirm title deed availability.";
    if (readyForLodgement) return "Ready to lodge. Prepare lodgement pack.";
    if (lodged && !prep) return "Matter lodged. Monitor Deeds Office progress.";
    if (prep && !registered) return "Prep received. Prepare registration confirmation.";
    if (daysSinceLastUpdate != null && daysSinceLastUpdate >= STALE_UPDATE_DAYS) return `No update for ${daysSinceLastUpdate} day(s). Capture progress or send a follow-up.`;
    if (readyForReport) return "Ready for weekly report update.";
    return "Keep matter moving and capture the next update.";
  })();

  const milestoneOwner = ownerName;
  const milestones = [
    buildMilestone({
      title: "Instruction received",
      received: caseItem.instructionReceived,
      completed: hasCompleted(caseItem.instructionReceived),
      assignedTo: milestoneOwner,
      notes: "Matter opened and instruction date captured.",
      overdueAfterDays: 1,
    }),
    buildMilestone({
      title: "FICA requested",
      requested: caseItem.sellerFicaDocumentsRequested || caseItem.purchaserFicaDocumentsRequested,
      received: ficaReady ? caseItem.sellerFicaDocumentsReceived || caseItem.purchaserFicaDocumentsReceived : "",
      completed: ficaReady,
      fallbackRequested: caseItem.instructionReceived,
      assignedTo: milestoneOwner,
      notes: "Seller and purchaser FICA must both be received.",
      overdueAfterDays: 5,
    }),
    buildMilestone({
      title: "Transfer documents signed",
      requested: caseItem.transferSignedSellerDate || caseItem.transferSignedPurchaserDate,
      received: docsSigned ? caseItem.transferSignedSellerDate || caseItem.transferSignedPurchaserDate : "",
      completed: docsSigned,
      fallbackRequested: caseItem.instructionReceived,
      assignedTo: milestoneOwner,
      notes: "Seller and purchaser signatures are required.",
      overdueAfterDays: 7,
    }),
    buildMilestone({
      title: "Costs paid",
      requested: caseItem.transferCostRequested,
      received: caseItem.transferCostReceived,
      completed: costsPaid,
      assignedTo: milestoneOwner,
      notes: "Transfer cost confirmation captured.",
      overdueAfterDays: 5,
    }),
    buildMilestone({
      title: "Guarantees received",
      requested: caseItem.guaranteesFromBondAttorneysRequested,
      received: caseItem.guaranteesFromBondAttorneysReceived,
      completed: guaranteesReady,
      assignedTo: milestoneOwner,
      notes: hasBond ? "Bond guarantees from bond attorneys." : "No bond amount captured; marked as not required.",
      overdueAfterDays: 7,
    }),
    buildMilestone({
      title: "Clearance received",
      requested: caseItem.municipalClearanceFiguresRequested || caseItem.municipalClearanceCertificateRequested,
      received: caseItem.municipalClearanceCertificateReceived || caseItem.municipalClearanceFiguresReceived,
      completed: clearanceReady,
      assignedTo: milestoneOwner,
      notes: "Municipal clearance figures/certificate tracked here.",
      overdueAfterDays: 14,
    }),
    buildMilestone({
      title: "Lodged",
      received: caseItem.documentsLodgedDate,
      completed: lodged,
      fallbackRequested: readyForLodgement ? new Date() : null,
      assignedTo: milestoneOwner,
      notes: "Ready once core documents, costs, guarantees and clearance are in place.",
      overdueAfterDays: 3,
    }),
    buildMilestone({
      title: "Prep",
      requested: caseItem.documentsLodgedDate,
      received: caseItem.deedsPrepDate,
      completed: prep,
      assignedTo: milestoneOwner,
      notes: "Deeds Office prep date.",
      overdueAfterDays: 7,
    }),
    buildMilestone({
      title: "Registered",
      requested: caseItem.deedsPrepDate,
      received: caseItem.registrationDate,
      completed: registered,
      assignedTo: milestoneOwner,
      notes: "Registration date captured.",
      overdueAfterDays: 4,
    }),
  ];

  const missingDocuments = [];
  if (!sellerFicaReady) missingDocuments.push("Seller FICA");
  if (!purchaserFicaReady) missingDocuments.push("Purchaser FICA");
  if (!titleDeedReady) missingDocuments.push("Title deed");
  if (!clearanceReady) missingDocuments.push("Municipal clearance");
  if (hasBond && !hasCompleted(caseItem.guaranteesFromBondAttorneysReceived)) missingDocuments.push("Guarantees");
  if (!costsPaid) missingDocuments.push("Transfer costs");

  return {
    ownerName,
    active,
    daysSinceInstruction,
    daysSinceLastUpdate,
    daysToBondDue,
    daysToDepositDue,
    ageCategory: ageCategory(daysSinceInstruction),
    overdueItems,
    dueToday,
    risk,
    riskTone,
    stage: stageFromCase(caseItem),
    nextAction,
    milestones,
    missingDocuments,
    readyForLodgement,
    readyForReport,
    flags: {
      hasBond,
      bondFulfilled,
      depositExpected,
      depositFulfilled,
      ficaReady,
      docsSigned,
      costsPaid,
      guaranteesReady,
      titleDeedReady,
      clearanceReady,
      lodged,
      prep,
      registered,
      inactive: !active,
      registrationThisWeek: isThisWeek(caseItem.registrationDate),
      noBondReceived: hasBond && !bondFulfilled,
      noDepositReceived: depositExpected && !depositFulfilled,
    },
  };
};

const queueDefinitions = [
  { key: "all", label: "All matters", icon: <FaLayerGroup />, predicate: () => true },
  { key: "dueToday", label: "Due today", icon: <FaCalendarDay />, predicate: (_caseItem, insight) => insight.dueToday },
  { key: "overdue", label: "Overdue", icon: <FaExclamationTriangle />, predicate: (_caseItem, insight) => insight.overdueItems.length > 0 },
  { key: "noBondReceived", label: "No bond received", icon: <FaShieldAlt />, predicate: (_caseItem, insight) => insight.flags.noBondReceived },
  { key: "noDepositReceived", label: "No deposit received", icon: <FaHourglassHalf />, predicate: (_caseItem, insight) => insight.flags.noDepositReceived },
  { key: "docsUnsigned", label: "Transfer docs unsigned", icon: <FaFileSignature />, predicate: (_caseItem, insight) => !insight.flags.docsSigned && insight.active },
  { key: "awaitingFica", label: "Awaiting FICA", icon: <FaUserTie />, predicate: (_caseItem, insight) => !insight.flags.ficaReady && insight.active },
  { key: "awaitingMunicipal", label: "Awaiting municipal", icon: <FaRegFileAlt />, predicate: (_caseItem, insight) => !insight.flags.clearanceReady && insight.active },
  { key: "awaitingTitleDeed", label: "Awaiting title deed", icon: <FaFolderOpen />, predicate: (_caseItem, insight) => !insight.flags.titleDeedReady && insight.active },
  { key: "awaitingGuarantees", label: "Awaiting guarantees", icon: <FaHandshake />, predicate: (_caseItem, insight) => insight.flags.hasBond && !insight.flags.guaranteesReady && insight.active },
  { key: "lodged", label: "Lodged matters", icon: <FaGavel />, predicate: (_caseItem, insight) => insight.flags.lodged && !insight.flags.registered },
  { key: "prep", label: "Prep matters", icon: <FaRegCalendarCheck />, predicate: (_caseItem, insight) => insight.flags.prep && !insight.flags.registered },
  { key: "registrationsThisWeek", label: "Registrations this week", icon: <FaCheckCircle />, predicate: (_caseItem, insight) => insight.flags.registrationThisWeek },
  { key: "inactive", label: "Inactive / archived", icon: <FaArchive />, predicate: (_caseItem, insight) => insight.flags.inactive },
];

const riskStyles = {
  healthy: { color: "#14532d", background: "#dcfce7", border: "1px solid #bbf7d0" },
  attention: { color: "#713f12", background: "#fef3c7", border: "1px solid #fde68a" },
  stuck: { color: "#7c2d12", background: "#ffedd5", border: "1px solid #fed7aa" },
  critical: { color: "#7f1d1d", background: "#fee2e2", border: "1px solid #fecaca" },
  ready: { color: "#071f39", background: "linear-gradient(135deg, #f3c86f, #d2ac68)", border: "1px solid rgba(210,172,104,0.65)" },
  muted: { color: "#475569", background: "#f1f5f9", border: "1px solid #e2e8f0" },
};

const statusMeta = {
  completed: { label: "Completed", icon: <FaCheckCircle />, style: riskStyles.healthy },
  requested: { label: "Requested", icon: <FaClock />, style: riskStyles.attention },
  overdue: { label: "Overdue", icon: <FaExclamationTriangle />, style: riskStyles.critical },
  "not-started": { label: "Not started", icon: <FaTimesCircle />, style: riskStyles.muted },
};

export default function MyTransactions() {
  const [currentUser, setCurrentUser] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQueue, setActiveQueue] = useState("all");
  const [expandedCaseId, setExpandedCaseId] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [messageCounts, setMessageCounts] = useState({});
  const [colorPickCaseId, setColorPickCaseId] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    injectTransactionsCss();
  }, []);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const me = await axios.get(`${BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const nextUser = me.data || null;
      setCurrentUser(nextUser);

      const casesUrl = nextUser?.isAdmin ? `${BASE_URL}/api/cases` : `${BASE_URL}/api/mycases`;
      const res = await axios.get(casesUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const nextCases = Array.isArray(res.data) ? res.data : [];
      setCases(nextCases);

      const counts = await Promise.all(
        nextCases.map((caseItem) =>
          axios
            .get(`${BASE_URL}/api/cases/${caseItem._id}/messages`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .then((messageRes) => ({
              id: caseItem._id,
              count: (Array.isArray(messageRes.data) ? messageRes.data : []).filter(
                (message) => !(message.readBy || []).includes(nextUser?._id)
              ).length,
            }))
            .catch(() => ({ id: caseItem._id, count: 0 }))
        )
      );

      setMessageCounts(counts.reduce((map, item) => ({ ...map, [item.id]: item.count }), {}));
    } catch (err) {
      console.error("Transaction intelligence fetch failed:", err);
      setError("Could not load transaction intelligence. Please refresh or sign in again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const analysedCases = useMemo(
    () =>
      cases.map((caseItem) => ({
        caseItem,
        insight: analyseCase(caseItem, currentUser),
      })),
    [cases, currentUser]
  );

  const queueCounts = useMemo(() => {
    const counts = {};
    queueDefinitions.forEach((queue) => {
      counts[queue.key] = analysedCases.filter(({ caseItem, insight }) => queue.predicate(caseItem, insight)).length;
    });
    return counts;
  }, [analysedCases]);

  const totals = useMemo(() => {
    const active = analysedCases.filter(({ insight }) => insight.active).length;
    const critical = analysedCases.filter(({ insight }) => insight.riskTone === "critical").length;
    const ready = analysedCases.filter(({ insight }) => insight.readyForLodgement).length;
    const stale = analysedCases.filter(({ insight }) => insight.daysSinceLastUpdate != null && insight.daysSinceLastUpdate >= STALE_UPDATE_DAYS).length;

    return {
      total: analysedCases.length,
      active,
      critical,
      ready,
      stale,
    };
  }, [analysedCases]);

  const filteredCases = useMemo(() => {
    const queue = queueDefinitions.find((item) => item.key === activeQueue) || queueDefinitions[0];
    const query = searchQuery.trim().toLowerCase();

    return analysedCases
      .filter(({ caseItem, insight }) => queue.predicate(caseItem, insight))
      .filter(({ caseItem, insight }) => {
        if (!query) return true;
        return [
          caseItem.reference,
          caseItem.parties,
          caseItem.property,
          caseItem.agent,
          caseItem.agency,
          insight.ownerName,
          insight.stage,
          insight.risk,
          insight.nextAction,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        const rank = { critical: 0, stuck: 1, attention: 2, ready: 3, healthy: 4, muted: 5 };
        const riskRank = (rank[a.insight.riskTone] ?? 9) - (rank[b.insight.riskTone] ?? 9);
        if (riskRank !== 0) return riskRank;
        const aUpdated = parseAnyDate(a.caseItem.updatedAt || a.caseItem.createdAt)?.getTime() || 0;
        const bUpdated = parseAnyDate(b.caseItem.updatedAt || b.caseItem.createdAt)?.getTime() || 0;
        return bUpdated - aUpdated;
      });
  }, [activeQueue, analysedCases, searchQuery]);

  const highRiskItems = useMemo(
    () => analysedCases.filter(({ insight }) => ["critical", "stuck"].includes(insight.riskTone)).slice(0, 5),
    [analysedCases]
  );

  const handleOpenMessages = (caseId) => {
    setSelectedCaseId(caseId);
    setMessageCounts((prev) => ({ ...prev, [caseId]: 0 }));
  };

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
      alert("Could not update the matter status.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction? This cannot be undone.")) return;
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

  const handleColorChange = async (caseId, color) => {
    try {
      const { data: existingCase } = await axios.get(`${BASE_URL}/api/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedColors = { ...(existingCase.colors || {}), daysSinceInstruction: color };
      await axios.put(
        `${BASE_URL}/api/cases/${caseId}`,
        { ...existingCase, colors: updatedColors },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setColorPickCaseId(null);
      fetchAll();
    } catch (err) {
      console.error("Colour update failed:", err);
      alert("Could not update the highlight colour.");
    }
  };

  const summaryCards = [
    { label: "Total matters", value: totals.total, note: `${formatNumber(filteredCases.length)} shown now`, icon: <FaListUl /> },
    { label: "Active matters", value: totals.active, note: "Live transaction workload", icon: <FaTasks /> },
    { label: "Critical", value: totals.critical, note: "Overdue or stale matters", icon: <FaExclamationTriangle /> },
    { label: "Ready to lodge", value: totals.ready, note: "No guessing required", icon: <FaBolt /> },
  ];

  const activeQueueLabel = queueDefinitions.find((queue) => queue.key === activeQueue)?.label || "All matters";

  return (
    <div className="gba-transactions-page">
      <div className="screen-only">
        <header style={styles.heroBanner}>
          <div style={styles.heroTexture} />
          <div className="gba-transactions-hero-content">
            <div style={styles.heroCopy}>
              <span style={styles.eyebrow}>Daily work queue</span>
              <h1 style={styles.heroTitle}>Transaction Intelligence</h1>
              <p style={styles.heroSubtitle}>
                A separate transaction command centre for work queues, deadlines, milestone timelines, risk flags and next best actions. The main dashboard stays untouched.
              </p>
            </div>

            <div className="gba-transactions-hero-actions">
              <div className="gba-transactions-search">
                <FaSearch />
                <input
                  className="neumo-input"
                  type="text"
                  placeholder="Search reference, party, agent, property..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <button className="neumo-button" onClick={() => window.print()}>
                <FaPrint /> Print queue
              </button>
              <button className="neumo-button" onClick={() => navigate("/case/new")}>
                <FaFileSignature /> New matter
              </button>
            </div>
          </div>
        </header>

        {error && <div style={styles.errorBox}>{error}</div>}

        <section className="gba-transactions-summary-grid" aria-label="Transaction intelligence summary">
          {summaryCards.map((card) => (
            <article key={card.label} style={styles.summaryCard}>
              <div style={styles.summaryIcon}>{card.icon}</div>
              <div>
                <span style={styles.summaryLabel}>{card.label}</span>
                <strong style={styles.summaryValue}>{loading ? "…" : formatNumber(card.value)}</strong>
                <small style={styles.summaryNote}>{card.note}</small>
              </div>
            </article>
          ))}
        </section>

        <div className="gba-transactions-content-grid">
          <main style={styles.mainColumn}>
            <section style={styles.panel}>
              <div style={styles.sectionHeader}>
                <div>
                  <span style={styles.panelKicker}><FaFilter /> Work queue</span>
                  <h2 style={styles.panelTitle}>What needs attention today?</h2>
                </div>
                <span style={styles.ratePill}>{activeQueueLabel}</span>
              </div>

              <div className="gba-queue-grid">
                {queueDefinitions.map((queue) => (
                  <button
                    key={queue.key}
                    type="button"
                    className={activeQueue === queue.key ? "gba-queue-button active" : "gba-queue-button"}
                    onClick={() => setActiveQueue(queue.key)}
                  >
                    <span style={styles.queueIcon}>{queue.icon}</span>
                    <span>
                      <strong style={styles.queueLabel}>{queue.label}</strong>
                      <small>{queue.key === "all" ? "Every transaction" : "Filtered focus list"}</small>
                    </span>
                    <b style={styles.queueCount}>{formatNumber(queueCounts[queue.key])}</b>
                  </button>
                ))}
              </div>
            </section>

            <section style={styles.panel}>
              <div style={styles.sectionHeader}>
                <div>
                  <span style={styles.panelKicker}><FaChartLine /> Case intelligence</span>
                  <h2 style={styles.panelTitle}>{loading ? "Loading matters..." : `${formatNumber(filteredCases.length)} matter(s) in this view`}</h2>
                </div>
                <button className="gba-action-button" onClick={fetchAll} disabled={loading}>
                  <FaUndo /> Refresh
                </button>
              </div>

              {loading ? (
                <div style={styles.emptyState}>Loading transaction intelligence…</div>
              ) : filteredCases.length === 0 ? (
                <div style={styles.emptyState}>No matters match this queue yet.</div>
              ) : (
                <div className="gba-case-table-wrap">
                  <table className="gba-case-table">
                    <thead>
                      <tr>
                        <th>Risk</th>
                        <th>Days</th>
                        <th>Reference</th>
                        <th>Parties / property</th>
                        <th>Agent</th>
                        <th>Stage</th>
                        <th>Next best action</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCases.map(({ caseItem, insight }) => (
                        <React.Fragment key={caseItem._id}>
                          <tr className="gba-case-row">
                            <td>
                              <span className="gba-risk-pill" style={riskStyles[insight.riskTone] || riskStyles.muted}>
                                {insight.riskTone === "critical" ? <FaExclamationTriangle /> : insight.riskTone === "ready" ? <FaBolt /> : <FaFlag />}
                                {insight.risk}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => setColorPickCaseId(colorPickCaseId === caseItem._id ? null : caseItem._id)}
                                style={{
                                  ...styles.daysBadge,
                                  background: caseItem.colors?.daysSinceInstruction || "linear-gradient(135deg, #102a4a, #061c34)",
                                }}
                                title="Click to highlight this matter"
                              >
                                {insight.daysSinceInstruction == null ? "—" : insight.daysSinceInstruction}
                              </button>
                              <small style={styles.daysNote}>{insight.ageCategory}</small>
                            </td>
                            <td>
                              <strong style={styles.referenceText}>{displayText(caseItem.reference)}</strong>
                              <small style={styles.ownerText}>{insight.ownerName}</small>
                              {colorPickCaseId === caseItem._id && (
                                <div style={styles.colorPickerRow}>
                                  <input
                                    type="color"
                                    value={caseItem.colors?.daysSinceInstruction || "#102a4a"}
                                    onChange={(event) => handleColorChange(caseItem._id, event.target.value)}
                                  />
                                  <button type="button" className="gba-action-button" onClick={() => handleColorChange(caseItem._id, "")}>
                                    Reset
                                  </button>
                                </div>
                              )}
                            </td>
                            <td>
                              <div className="gba-case-meta">
                                <strong>{displayText(caseItem.parties)}</strong>
                                <small>{displayText(caseItem.property)}</small>
                              </div>
                            </td>
                            <td>
                              <div className="gba-case-meta">
                                <strong>{displayText(caseItem.agent)}</strong>
                                <small>{displayText(caseItem.agency)}</small>
                              </div>
                            </td>
                            <td>
                              <span className="gba-stage-pill" style={styles.stagePill}>{insight.stage}</span>
                              <small style={styles.daysNote}>Updated {insight.daysSinceLastUpdate == null ? "—" : `${insight.daysSinceLastUpdate}d ago`}</small>
                            </td>
                            <td style={{ maxWidth: 290 }}>
                              <div style={styles.nextAction}>{insight.nextAction}</div>
                              {insight.overdueItems.length > 0 && (
                                <small style={styles.overdueText}>{insight.overdueItems[0].label}</small>
                              )}
                            </td>
                            <td>
                              <div className="gba-case-actions">
                                <button className="gba-action-button primary" onClick={() => navigate(`/case/${caseItem._id}`)}>
                                  <FaEdit /> Edit
                                </button>
                                <button className="gba-action-button" onClick={() => navigate(`/report/${caseItem._id}`)}>
                                  <FaPrint /> Report
                                </button>
                                <button className="gba-action-button" onClick={() => handleOpenMessages(caseItem._id)} style={{ position: "relative" }}>
                                  <FaComments /> Messages
                                  {messageCounts[caseItem._id] > 0 && <span className="badge" style={styles.messageBadge}>{messageCounts[caseItem._id]}</span>}
                                </button>
                                <button className="gba-action-button" onClick={() => setExpandedCaseId(expandedCaseId === caseItem._id ? null : caseItem._id)}>
                                  <FaClock /> {expandedCaseId === caseItem._id ? "Hide" : "Timeline"}
                                </button>
                                <button
                                  className={caseItem.isActive === false ? "gba-action-button danger" : "gba-action-button success"}
                                  onClick={() => toggleActive(caseItem._id, caseItem.isActive !== false)}
                                >
                                  {caseItem.isActive === false ? "Inactive" : "Active"}
                                </button>
                                <button className="gba-action-button danger" onClick={() => handleDelete(caseItem._id)}>
                                  <FaTrash /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>

                          {expandedCaseId === caseItem._id && (
                            <tr className="gba-expanded-row">
                              <td colSpan={8}>
                                <div style={styles.expandedHeader}>
                                  <div>
                                    <span style={styles.panelKicker}><FaClock /> Milestone timeline</span>
                                    <h3 style={styles.expandedTitle}>{displayText(caseItem.reference)} — progress view</h3>
                                  </div>
                                  <span className="gba-risk-pill" style={riskStyles[insight.riskTone] || riskStyles.muted}>{insight.risk}</span>
                                </div>

                                <div className="gba-timeline-grid">
                                  {insight.milestones.map((milestone) => {
                                    const meta = statusMeta[milestone.status] || statusMeta["not-started"];
                                    return (
                                      <article key={milestone.title} className="gba-milestone-card">
                                        <div className="gba-milestone-head">
                                          <strong style={styles.milestoneTitle}>{milestone.title}</strong>
                                          <span className="gba-status-pill" style={meta.style}>{meta.icon}{meta.label}</span>
                                        </div>
                                        <div style={styles.milestoneGrid}>
                                          <span>Requested</span><strong>{displayText(milestone.requestedDate)}</strong>
                                          <span>Received</span><strong>{displayText(milestone.receivedDate)}</strong>
                                          <span>Assigned</span><strong>{milestone.assignedTo}</strong>
                                          <span>Delay</span><strong>{milestone.delayDays == null ? "—" : `${milestone.delayDays} day(s)`}</strong>
                                        </div>
                                        <p style={styles.milestoneNote}>{milestone.notes}</p>
                                      </article>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </main>

          <aside className="gba-transactions-right-column">
            <section style={styles.liveSummaryCard}>
              <div style={styles.liveHeader}>
                <h2 style={styles.liveTitle}>Live summary</h2>
                <span style={styles.vatPill}>Today</span>
              </div>
              <SummaryLine label="Due today" value={queueCounts.dueToday} />
              <SummaryLine label="Overdue" value={queueCounts.overdue} />
              <SummaryLine label="Awaiting FICA" value={queueCounts.awaitingFica} />
              <SummaryLine label="Awaiting guarantees" value={queueCounts.awaitingGuarantees} />
              <SummaryLine label="Registrations this week" value={queueCounts.registrationsThisWeek} />
              <div style={styles.liveDivider} />
              <div style={styles.liveTotalBox}>
                <span>Stale updates</span>
                <strong>{formatNumber(totals.stale)}</strong>
              </div>
            </section>

            <section style={styles.insightCard}>
              <div style={styles.liveHeader}>
                <h2 style={styles.sideTitle}>Problem watch</h2>
                <FaExclamationTriangle />
              </div>
              <div className="gba-insight-list">
                {highRiskItems.length === 0 ? (
                  <div>
                    <span style={styles.sideIcon}><FaCheckCircle /></span>
                    <div>
                      <strong>No critical matters</strong>
                      <small>Nothing is currently flagged as stuck or critical.</small>
                    </div>
                  </div>
                ) : (
                  highRiskItems.map(({ caseItem, insight }) => (
                    <div key={`watch-${caseItem._id}`}>
                      <span style={styles.sideIcon}><FaFlag /></span>
                      <div>
                        <strong>{displayText(caseItem.reference)}</strong>
                        <small>{insight.nextAction}</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section style={styles.basisCard}>
              <div style={styles.basisIcon}><FaBolt /></div>
              <div>
                <strong>How the page works</strong>
                <p>
                  Each matter is analysed from your existing case dates and fields. The page calculates delays, overdue items, risk level and a recommended next action without changing the main dashboard.
                </p>
              </div>
            </section>
          </aside>
        </div>

        {selectedCaseId && currentUser && (
          <MessageBox caseId={selectedCaseId} onClose={() => setSelectedCaseId(null)} currentUser={currentUser} />
        )}
      </div>

      <div id="transactionsPrintArea">
        <div className="print-meta">
          <span>Gerhard Barnard Inc Conveyancing Portal</span>
          <span>{new Date().toLocaleString("en-GB")}</span>
        </div>
        <h1>Transaction Intelligence Report</h1>
        <h2>{activeQueueLabel}</h2>
        <table>
          <thead>
            <tr>
              <th style={{ width: "13%" }}>Risk</th>
              <th style={{ width: "8%" }}>Days</th>
              <th style={{ width: "14%" }}>Reference</th>
              <th style={{ width: "17%" }}>Agent</th>
              <th style={{ width: "18%" }}>Parties</th>
              <th style={{ width: "30%" }}>Next action</th>
            </tr>
          </thead>
          <tbody>
            {filteredCases.map(({ caseItem, insight }) => (
              <tr key={`print-${caseItem._id}`}>
                <td>{insight.risk}</td>
                <td>{insight.daysSinceInstruction == null ? "—" : insight.daysSinceInstruction}</td>
                <td className="ellipsis">{displayText(caseItem.reference)}</td>
                <td className="ellipsis">{displayText(caseItem.agent)}</td>
                <td className="ellipsis">{displayText(caseItem.parties)}</td>
                <td>{insight.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div style={styles.summaryLine}>
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  );
}

const styles = {
  heroBanner: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    marginBottom: 0,
    background: "linear-gradient(135deg, #071f39 0%, #0b2b4d 55%, #061c34 100%)",
    boxShadow: "0 22px 50px rgba(7, 31, 57, 0.18)",
  },
  heroTexture: {
    position: "absolute",
    inset: 0,
    opacity: 0.82,
    background:
      "radial-gradient(circle at 52% 48%, rgba(29, 123, 180, 0.24), transparent 15rem), radial-gradient(circle at 94% 20%, rgba(210, 172, 104, 0.16), transparent 12rem), repeating-radial-gradient(circle at 56% 50%, rgba(255,255,255,0.08) 0 1px, transparent 1px 10px)",
  },
  heroCopy: {
    maxWidth: 820,
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    height: 28,
    padding: "0 14px",
    borderRadius: 999,
    color: "#fff",
    background: "linear-gradient(135deg, rgba(210, 172, 104, 0.38), rgba(210, 172, 104, 0.16))",
    border: "1px solid rgba(210, 172, 104, 0.38)",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  heroTitle: {
    margin: "12px 0 8px",
    color: "#fff",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "clamp(34px, 3vw, 52px)",
    lineHeight: 0.96,
    fontWeight: 850,
    letterSpacing: -1.3,
  },
  heroSubtitle: {
    margin: 0,
    color: "rgba(255,255,255,0.84)",
    maxWidth: 820,
    fontSize: 14,
    lineHeight: 1.55,
  },
  errorBox: {
    marginTop: 14,
    padding: 13,
    borderRadius: 14,
    background: "#fee2e2",
    color: "#7f1d1d",
    fontWeight: 850,
    border: "1px solid #fecaca",
  },
  summaryCard: {
    display: "grid",
    gridTemplateColumns: "58px 1fr",
    gap: 14,
    alignItems: "center",
    minHeight: 106,
    padding: "17px 19px",
    borderRadius: 18,
    background: "var(--surface)",
    border: "1px solid rgba(16, 42, 74, 0.08)",
    boxShadow: "0 16px 34px rgba(16, 42, 74, 0.09)",
  },
  summaryIcon: {
    display: "grid",
    placeItems: "center",
    width: 52,
    height: 52,
    borderRadius: "50%",
    color: "#fff",
    fontSize: 22,
    background: "linear-gradient(135deg, #102a4a, #061c34)",
    boxShadow: "0 15px 28px rgba(16,42,74,0.24)",
  },
  summaryLabel: {
    display: "block",
    color: "var(--text)",
    fontWeight: 750,
    marginBottom: 7,
  },
  summaryValue: {
    display: "block",
    color: "var(--color-primary)",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "clamp(25px, 2vw, 34px)",
    lineHeight: 1,
  },
  summaryNote: {
    display: "block",
    marginTop: 8,
    color: "var(--muted)",
    fontSize: 12,
    fontWeight: 750,
  },
  mainColumn: {
    display: "grid",
    gap: 16,
    minWidth: 0,
  },
  panel: {
    padding: "18px 20px",
    borderRadius: 18,
    background: "var(--surface)",
    border: "1px solid rgba(16, 42, 74, 0.08)",
    boxShadow: "0 16px 34px rgba(16, 42, 74, 0.08)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  panelKicker: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    color: "var(--color-accent)",
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  panelTitle: {
    margin: "6px 0 0",
    color: "var(--color-primary)",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 26,
    lineHeight: 1.05,
  },
  ratePill: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 32,
    borderRadius: 999,
    padding: "0 14px",
    background: "rgba(16, 42, 74, 0.07)",
    color: "var(--color-primary)",
    fontWeight: 900,
    fontSize: 12,
  },
  queueIcon: {
    display: "grid",
    placeItems: "center",
    width: 32,
    height: 32,
    borderRadius: "50%",
    color: "#fff",
    background: "linear-gradient(135deg, #102a4a, #061c34)",
  },
  queueLabel: {
    display: "block",
    marginBottom: 2,
    color: "var(--text)",
    fontSize: 13,
  },
  queueCount: {
    display: "grid",
    placeItems: "center",
    minWidth: 30,
    height: 30,
    borderRadius: 999,
    color: "#071f39",
    background: "linear-gradient(135deg, var(--color-accent-2), var(--color-accent))",
    fontSize: 13,
  },
  emptyState: {
    padding: 22,
    borderRadius: 16,
    background: "var(--surface-soft)",
    color: "var(--muted)",
    border: "1px dashed var(--border-soft)",
    fontWeight: 800,
  },
  daysBadge: {
    display: "grid",
    placeItems: "center",
    width: 48,
    height: 42,
    border: "none",
    borderRadius: 14,
    color: "#fff",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(16,42,74,0.16)",
  },
  daysNote: {
    display: "block",
    marginTop: 7,
    color: "var(--muted)",
    fontSize: 11,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  referenceText: {
    display: "block",
    color: "var(--color-primary)",
    fontSize: 14,
  },
  ownerText: {
    display: "block",
    marginTop: 4,
    color: "var(--muted)",
    fontSize: 11,
    fontWeight: 800,
  },
  colorPickerRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  stagePill: {
    color: "var(--color-primary)",
    background: "rgba(16, 42, 74, 0.07)",
    border: "1px solid rgba(16, 42, 74, 0.08)",
  },
  nextAction: {
    color: "var(--text)",
    fontWeight: 850,
    lineHeight: 1.35,
  },
  overdueText: {
    display: "block",
    marginTop: 6,
    color: "#991b1b",
    fontWeight: 900,
  },
  messageBadge: {
    position: "absolute",
    top: -8,
    right: -8,
  },
  expandedHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  expandedTitle: {
    margin: "6px 0 0",
    color: "var(--color-primary)",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 22,
  },
  milestoneTitle: {
    color: "var(--color-primary)",
  },
  milestoneGrid: {
    display: "grid",
    gridTemplateColumns: "92px 1fr",
    gap: "6px 10px",
    color: "var(--muted)",
    fontSize: 12,
  },
  milestoneNote: {
    margin: 0,
    color: "var(--muted)",
    fontSize: 12,
    lineHeight: 1.45,
  },
  liveSummaryCard: {
    padding: 22,
    borderRadius: 18,
    color: "#fff",
    background: "linear-gradient(150deg, #0a2a4b 0%, #071d34 100%)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 18px 38px rgba(7, 31, 57, 0.22)",
  },
  liveHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  liveTitle: {
    margin: 0,
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 24,
  },
  vatPill: {
    borderRadius: 999,
    padding: "7px 11px",
    background: "rgba(255,255,255,0.09)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 900,
  },
  summaryLine: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 0",
    color: "inherit",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontSize: 14,
  },
  liveDivider: {
    height: 1,
    margin: "9px 0 12px",
    background: "rgba(255,255,255,0.16)",
  },
  liveTotalBox: {
    display: "grid",
    gap: 6,
    padding: "17px 18px",
    borderRadius: 14,
    color: "#fff",
    background: "linear-gradient(135deg, rgba(210,172,104,0.24), rgba(210,172,104,0.78))",
    border: "1px solid rgba(210,172,104,0.48)",
  },
  insightCard: {
    padding: 20,
    borderRadius: 18,
    color: "#fff",
    background: "linear-gradient(150deg, #0a2a4b 0%, #071d34 100%)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 18px 38px rgba(7, 31, 57, 0.18)",
  },
  sideTitle: {
    margin: 0,
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 22,
  },
  sideIcon: {
    display: "grid",
    placeItems: "center",
    width: 32,
    height: 32,
    borderRadius: "50%",
    color: "#071f39",
    background: "linear-gradient(135deg, var(--color-accent-2), var(--color-accent))",
  },
  basisCard: {
    display: "grid",
    gridTemplateColumns: "34px 1fr",
    gap: 14,
    padding: "18px 22px",
    borderRadius: 18,
    color: "#fff",
    background: "linear-gradient(150deg, #0a2a4b 0%, #071d34 100%)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 18px 38px rgba(7, 31, 57, 0.16)",
  },
  basisIcon: {
    display: "grid",
    placeItems: "center",
    width: 34,
    height: 34,
    borderRadius: "50%",
    color: "#071f39",
    background: "linear-gradient(135deg, var(--color-accent-2), var(--color-accent))",
    fontWeight: 950,
  },
};
