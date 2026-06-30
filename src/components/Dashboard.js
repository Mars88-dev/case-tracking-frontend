import React, { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaBriefcase,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaComments,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaFileAlt,
  FaFilter,
  FaFolderOpen,
  FaHistory,
  FaInfoCircle,
  FaPaperPlane,
  FaPrint,
  FaSearch,
  FaTasks,
  FaUserCircle,
  FaUsers,
} from "react-icons/fa";
import MessageBox from "./MessageBox";

const BASE_URL = "https://case-tracking-backend.onrender.com";
const TOP_PANEL_STORAGE_KEY = "gbaDashboardTopPanelExpanded";
const PROFILE_STORAGE_KEY = "gbaDashboardSelectedProfile";
const ALL_PROFILES_KEY = "__all_profiles__";

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

const TRANSFER_LABELS = {
  sellerFicaDocuments: "Seller FICA",
  purchaserFicaDocuments: "Purchaser FICA",
  titleDeed: "Title deed",
  bondCancellationFigures: "Bond cancellation figures",
  municipalClearanceFigures: "Municipal figures",
  transferDutyReceipt: "Transfer duty receipt",
  guaranteesFromBondAttorneys: "Guarantees",
  transferCost: "Transfer cost",
  electricalComplianceCertificate: "Electrical COC",
  municipalClearanceCertificate: "Municipal clearance",
  levyClearanceCertificate: "Levy clearance",
  hoaCertificate: "HOA certificate",
};

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

/* -------------------- robust date helpers (all formats) -------------------- */
const isISODateOnly = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isDMY = (s) => typeof s === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(s);

const parseAnyDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val) ? null : val;
  if (typeof val === "string") {
    if (val.includes("T")) {
      const d = new Date(val);
      return isNaN(d) ? null : d;
    }
    if (isISODateOnly(val)) {
      const [y, m, d] = val.split("-");
      return new Date(+y, +m - 1, +d);
    }
    if (isDMY(val)) {
      const [d, m, y] = val.split("/");
      return new Date(+y, +m - 1, +d);
    }
    if (["N/A", "Partly", "Requested"].includes(val)) return null;
  }
  return null;
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const daysFromToday = (val) => {
  const d = parseAnyDate(val);
  if (!d) return null;
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((day.getTime() - startOfToday().getTime()) / 86400000);
};

const daysSince = (val) => {
  const d = parseAnyDate(val);
  if (!d) return "—";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / 86400000);
};

const safeDisplay = (val) => {
  if (val === 0) return "0";
  if (val === false) return "False";
  if (val === true) return "True";
  if (val == null || val === "") return "—";
  const d = parseAnyDate(val);
  return d ? d.toLocaleDateString("en-GB") : String(val);
};
/* -------------------------------------------------------------------------- */

const isMissing = (val) => {
  if (val == null) return true;
  const text = String(val).trim();
  if (!text) return true;
  return text === "—";
};

const isNotApplicable = (val) => String(val || "").trim().toLowerCase() === "n/a";

const isOutstandingCompletion = (val) => {
  if (isMissing(val)) return true;
  const text = String(val).trim().toLowerCase();
  return ["partly", "partial", "requested", "pending", "outstanding"].includes(text);
};

const summariseOutstandingDocuments = (items, maxVisible = 2) => {
  if (!items?.length) return "Outstanding documents";
  if (items.length === 1) return `Outstanding: ${items[0].label}`;
  const visible = items.slice(0, maxVisible).map((item) => item.label).join(", ");
  const extra = items.length - maxVisible;
  return extra > 0 ? `Outstanding: ${visible} + ${extra} more` : `Outstanding: ${visible}`;
};

const getOutstandingDocumentStatus = (caseItem, itemKey) => {
  const requested = caseItem?.[`${itemKey}Requested`];
  const received = caseItem?.[`${itemKey}Received`];
  const requestedText = safeDisplay(requested);
  const receivedText = safeDisplay(received);

  if (requestedText === "—" && receivedText === "—") return "Not requested or received yet";
  if (requestedText !== "—" && receivedText === "—") return "Requested, not received";
  if (["partly", "partial"].includes(String(received || "").trim().toLowerCase())) return "Partly received";
  if (String(received || "").trim().toLowerCase() === "requested") return "Still marked as requested";
  return "Needs review";
};

const buildDocumentDetailItems = (caseItem, items) =>
  (items || []).map((item) => ({
    key: item.key,
    label: item.label,
    status: getOutstandingDocumentStatus(caseItem, item.key),
    requested: safeDisplay(caseItem?.[`${item.key}Requested`]),
    received: safeDisplay(caseItem?.[`${item.key}Received`]),
  }));

const moneyValue = (value) => {
  if (value == null) return 0;
  const raw = String(value).replace(/[^0-9.-]/g, "");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatRelativeDue = (dateLike) => {
  const diff = daysFromToday(dateLike);
  if (diff == null) return "Review";
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Tomorrow";
  return `${diff} days`;
};

const priorityFromDueDate = (dateLike) => {
  const diff = daysFromToday(dateLike);
  if (diff == null) return "Medium";
  if (diff <= 0) return "High";
  if (diff <= 2) return "Medium";
  return "Low";
};

const priorityFromAge = (caseItem) => {
  const age = daysSince(caseItem?.instructionReceived || caseItem?.createdAt);
  if (typeof age !== "number") return "Medium";
  if (age >= 14) return "High";
  if (age >= 7) return "Medium";
  return "Low";
};

const dueFromAge = (caseItem) => {
  const age = daysSince(caseItem?.instructionReceived || caseItem?.createdAt);
  if (typeof age !== "number") return "Review";
  if (age >= 14) return "Overdue";
  if (age >= 7) return "Due today";
  if (age >= 4) return "Tomorrow";
  return "2 days";
};

const getCaseUserName = (caseItem) =>
  (caseItem?.createdBy && caseItem.createdBy.username) || "Unknown User";

const getCaseUserKey = (caseItem) => {
  const createdBy = caseItem?.createdBy;
  if (createdBy && createdBy._id) return String(createdBy._id);
  return getCaseUserName(caseItem);
};

const getCaseLabel = (caseItem) => {
  const reference = safeDisplay(caseItem?.reference);
  const property = safeDisplay(caseItem?.property);
  if (reference !== "—" && property !== "—") return `${reference} · ${property}`;
  if (reference !== "—") return reference;
  return property;
};

const getMissingDocumentItems = (caseItem) =>
  TRANSFER_ITEMS.filter((item) => {
    const requested = caseItem?.[`${item}Requested`];
    const received = caseItem?.[`${item}Received`];

    if (isNotApplicable(requested) || isNotApplicable(received)) return false;
    return isOutstandingCompletion(received);
  }).map((item) => ({
    key: item,
    label: TRANSFER_LABELS[item] || item.replace(/([A-Z])/g, " $1"),
  }));

const getOverdueItemsForCase = (caseItem) => {
  const items = [];

  if (!isMissing(caseItem?.depositDueDate) && isMissing(caseItem?.depositFulfilledDate)) {
    const diff = daysFromToday(caseItem.depositDueDate);
    if (diff != null && diff < 0) {
      items.push({
        type: "deposit",
        label: "Deposit overdue",
        dueText: formatRelativeDue(caseItem.depositDueDate),
        priority: "High",
        details: [
          { label: "Deposit", status: "Due date has passed", requested: safeDisplay(caseItem.depositDueDate), received: safeDisplay(caseItem.depositFulfilledDate) },
        ],
      });
    }
  }

  if (!isMissing(caseItem?.bondDueDate) && isMissing(caseItem?.bondFulfilledDate)) {
    const diff = daysFromToday(caseItem.bondDueDate);
    if (diff != null && diff < 0) {
      items.push({
        type: "bond",
        label: "Bond confirmation overdue",
        dueText: formatRelativeDue(caseItem.bondDueDate),
        priority: "High",
        details: [
          { label: "Bond", status: "Due date has passed", requested: safeDisplay(caseItem.bondDueDate), received: safeDisplay(caseItem.bondFulfilledDate) },
        ],
      });
    }
  }

  const missingDocuments = getMissingDocumentItems(caseItem);
  const age = daysSince(caseItem?.instructionReceived || caseItem?.createdAt);
  if (typeof age === "number" && age >= 14 && missingDocuments.length > 0) {
    items.push({
      type: "documents",
      label: summariseOutstandingDocuments(missingDocuments),
      dueText: `${age} days open`,
      priority: "High",
      details: buildDocumentDetailItems(caseItem, missingDocuments),
    });
  }

  return items;
};

const getCaseWorkItem = (caseItem) => {
  const overdue = getOverdueItemsForCase(caseItem)[0];
  if (overdue) {
    return {
      ...overdue,
      caseId: caseItem._id,
      caseItem,
    };
  }

  if (!isMissing(caseItem?.depositDueDate) && isMissing(caseItem?.depositFulfilledDate)) {
    return {
      type: "deposit",
      label: "Confirm deposit",
      dueText: formatRelativeDue(caseItem.depositDueDate),
      priority: priorityFromDueDate(caseItem.depositDueDate),
      details: [
        { label: "Deposit", status: "Awaiting fulfilment", requested: safeDisplay(caseItem.depositDueDate), received: safeDisplay(caseItem.depositFulfilledDate) },
      ],
      caseId: caseItem._id,
      caseItem,
    };
  }

  if (!isMissing(caseItem?.bondDueDate) && isMissing(caseItem?.bondFulfilledDate)) {
    return {
      type: "bond",
      label: "Confirm bond approval",
      dueText: formatRelativeDue(caseItem.bondDueDate),
      priority: priorityFromDueDate(caseItem.bondDueDate),
      details: [
        { label: "Bond", status: "Awaiting fulfilment", requested: safeDisplay(caseItem.bondDueDate), received: safeDisplay(caseItem.bondFulfilledDate) },
      ],
      caseId: caseItem._id,
      caseItem,
    };
  }

  const outstandingRequestedDocuments = getMissingDocumentItems(caseItem).filter(
    (item) => !isMissing(caseItem?.[`${item.key}Requested`]) && !isNotApplicable(caseItem?.[`${item.key}Requested`])
  );
  if (outstandingRequestedDocuments.length) {
    return {
      type: "documents",
      label:
        outstandingRequestedDocuments.length === 1
          ? `Obtain ${outstandingRequestedDocuments[0].label}`
          : summariseOutstandingDocuments(outstandingRequestedDocuments),
      dueText: dueFromAge(caseItem),
      priority: priorityFromAge(caseItem),
      details: buildDocumentDetailItems(caseItem, outstandingRequestedDocuments),
      caseId: caseItem._id,
      caseItem,
    };
  }

  const missingRequestItems = getMissingDocumentItems(caseItem).filter((item) =>
    isMissing(caseItem?.[`${item.key}Requested`])
  );
  if (missingRequestItems.length) {
    return {
      type: "documents",
      label:
        missingRequestItems.length === 1
          ? `Request ${missingRequestItems[0].label}`
          : summariseOutstandingDocuments(missingRequestItems),
      dueText: dueFromAge(caseItem),
      priority: priorityFromAge(caseItem),
      details: buildDocumentDetailItems(caseItem, missingRequestItems),
      caseId: caseItem._id,
      caseItem,
    };
  }

  if (isMissing(caseItem?.documentsLodgedDate)) {
    return {
      type: "transfer",
      label: "Prepare transfer documents",
      dueText: dueFromAge(caseItem),
      priority: priorityFromAge(caseItem),
      caseId: caseItem._id,
      caseItem,
    };
  }

  if (isMissing(caseItem?.deedsPrepDate)) {
    return {
      type: "deeds",
      label: "Follow up deeds office",
      dueText: dueFromAge(caseItem),
      priority: priorityFromAge(caseItem),
      caseId: caseItem._id,
      caseItem,
    };
  }

  if (isMissing(caseItem?.registrationDate)) {
    return {
      type: "registration",
      label: "Confirm registration",
      dueText: dueFromAge(caseItem),
      priority: priorityFromAge(caseItem),
      caseId: caseItem._id,
      caseItem,
    };
  }

  return {
    type: "review",
    label: "Review transaction progress",
    dueText: "Review",
    priority: "Low",
    caseId: caseItem._id,
    caseItem,
  };
};

const priorityScore = (priority) => {
  if (priority === "High") return 3;
  if (priority === "Medium") return 2;
  return 1;
};

const formatActivityTime = (dateLike) => {
  const d = parseAnyDate(dateLike);
  if (!d) return "Recently";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) {
    return `Today, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  }

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  if (isYesterday) {
    return `Yesterday, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

export default function Dashboard() {
  const [allCases, setAllCases] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [filterType, setFilterType] = useState("none");
  const [colorPickIndex, setColorPickIndex] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [dashboardModal, setDashboardModal] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [messageCounts, setMessageCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarHost, setSidebarHost] = useState(null);
  const [selectedProfileKey, setSelectedProfileKey] = useState(() => {
    try {
      return localStorage.getItem(PROFILE_STORAGE_KEY) || ALL_PROFILES_KEY;
    } catch {
      return ALL_PROFILES_KEY;
    }
  });
  const [topPanelExpanded, setTopPanelExpanded] = useState(() => {
    try {
      return localStorage.getItem(TOP_PANEL_STORAGE_KEY) !== "false";
    } catch {
      return true;
    }
  });

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    const id = "dashboard-compact-print-css";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      #compactPrintArea { display: none; }

      .gba-dashboard-lower-grid {
        grid-template-columns: minmax(0, 1fr) !important;
      }

      .gba-dashboard-lower-grid .gba-dashboard-table-card,
      .gba-dashboard-lower-grid .gba-recent-activity-card {
        width: 100%;
        max-width: 100%;
      }

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
        #compactPrintArea th, #compactPrintArea td { border: 1px solid #d5d5d5; padding: 2px 4px; }
        #compactPrintArea th { background: #f0f0f0; font-weight: 800; }
        #compactPrintArea tbody tr:nth-child(even) td { background: #f7f7f7; }
        #compactPrintArea .user-block { margin: 6px 0 10px; }
        #compactPrintArea table, #compactPrintArea thead, #compactPrintArea tbody, #compactPrintArea tr { break-inside: auto; page-break-inside: auto; }
        #compactPrintArea tr { page-break-after: auto; }
        #compactPrintArea td, #compactPrintArea th { break-inside: avoid; page-break-inside: avoid; }
        #compactPrintArea .w-days   { width: 7%;  text-align:center; }
        #compactPrintArea .w-ref    { width: 18%; }
        #compactPrintArea .w-agent  { width: 18%; }
        #compactPrintArea .w-parties{ width: 28%; }
        #compactPrintArea .w-prop   { width: 29%; }
        #compactPrintArea .ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    const attachSidebarHost = () => {
      setSidebarHost(document.getElementById("gba-sidebar-dynamic-slot"));
    };

    attachSidebarHost();
    const timer = window.setTimeout(attachSidebarHost, 0);
    window.addEventListener("resize", attachSidebarHost);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", attachSidebarHost);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(TOP_PANEL_STORAGE_KEY, topPanelExpanded ? "true" : "false");
    } catch {}
  }, [topPanelExpanded]);

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, selectedProfileKey);
    } catch {}
  }, [selectedProfileKey]);

  const fetchCases = useCallback(() => {
    if (!token) return;
    axios
      .get(`${BASE_URL}/api/cases`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const userRes = await axios.get(`${BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(userRes.data);

        const data = (Array.isArray(res.data) ? res.data : [])
          .slice()
          .sort((a, b) => (a.reference || "").localeCompare(b.reference || ""));

        setAllCases(data);

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

        Promise.all(messagePromises).then((counts) =>
          setMessageCounts(counts.reduce((m, it) => ((m[it.id] = it.count), m), {}))
        );
      })
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const profileOptions = useMemo(() => {
    const map = new Map();
    allCases.forEach((caseItem) => {
      const key = getCaseUserKey(caseItem);
      const name = getCaseUserName(caseItem);
      if (!map.has(key)) {
        map.set(key, { key, name, count: 0, active: 0, pending: 0 });
      }
      const profile = map.get(key);
      profile.count += 1;
      if (caseItem.isActive === false) profile.pending += 1;
      else profile.active += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allCases]);

  useEffect(() => {
    if (selectedProfileKey === ALL_PROFILES_KEY) return;
    if (!profileOptions.length) return;
    if (!profileOptions.some((profile) => profile.key === selectedProfileKey)) {
      setSelectedProfileKey(ALL_PROFILES_KEY);
    }
  }, [profileOptions, selectedProfileKey]);

  const selectedProfileName = useMemo(() => {
    if (selectedProfileKey === ALL_PROFILES_KEY) return "All profiles";
    return profileOptions.find((profile) => profile.key === selectedProfileKey)?.name || "Selected profile";
  }, [profileOptions, selectedProfileKey]);

  const selectedProfileCases = useMemo(() => {
    if (selectedProfileKey === ALL_PROFILES_KEY) return allCases;
    return allCases.filter((caseItem) => getCaseUserKey(caseItem) === selectedProfileKey);
  }, [allCases, selectedProfileKey]);

  const filteredCases = useMemo(() => {
    let data = selectedProfileCases.slice();

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter((c) => {
        return (
          (c.reference || "").toLowerCase().includes(q) ||
          (c.parties || "").toLowerCase().includes(q) ||
          (c.property || "").toLowerCase().includes(q) ||
          (c.agent || "").toLowerCase().includes(q) ||
          (c.agency || "").toLowerCase().includes(q)
        );
      });
    }

    if (filterType === "bond") data = data.filter((c) => !c.bondAmount);
    else if (filterType === "deposit") data = data.filter((c) => !c.depositAmount);
    else if (filterType === "transfer") data = data.filter((c) => !c.transferCostReceived);
    else if (filterType === "active") data = data.filter((c) => c.isActive !== false);
    else if (filterType === "inactive") data = data.filter((c) => c.isActive === false);

    return data;
  }, [filterType, searchQuery, selectedProfileCases]);

  const activeCases = useMemo(
    () => filteredCases.filter((caseItem) => caseItem.isActive !== false),
    [filteredCases]
  );

  const pendingCases = useMemo(
    () => filteredCases.filter((caseItem) => caseItem.isActive === false),
    [filteredCases]
  );

  const baseActiveCases = useMemo(
    () => selectedProfileCases.filter((caseItem) => caseItem.isActive !== false),
    [selectedProfileCases]
  );

  const basePendingCases = useMemo(
    () => selectedProfileCases.filter((caseItem) => caseItem.isActive === false),
    [selectedProfileCases]
  );

  const workQueue = useMemo(() => {
    return baseActiveCases
      .map((caseItem) => getCaseWorkItem(caseItem))
      .sort((a, b) => {
        const score = priorityScore(b.priority) - priorityScore(a.priority);
        if (score !== 0) return score;
        const daysA = typeof daysSince(a.caseItem?.instructionReceived) === "number" ? daysSince(a.caseItem.instructionReceived) : 0;
        const daysB = typeof daysSince(b.caseItem?.instructionReceived) === "number" ? daysSince(b.caseItem.instructionReceived) : 0;
        return daysB - daysA;
      })
      .slice(0, 6);
  }, [baseActiveCases]);

  const overdueItems = useMemo(
    () => baseActiveCases.flatMap((caseItem) => getOverdueItemsForCase(caseItem).map((item) => ({ ...item, caseItem }))),
    [baseActiveCases]
  );

  const missingDocumentCases = useMemo(
    () =>
      baseActiveCases
        .map((caseItem) => ({
          caseItem,
          missingCount: getMissingDocumentItems(caseItem).length,
        }))
        .filter((item) => item.missingCount > 0),
    [baseActiveCases]
  );

  const stuckCases = useMemo(() => {
    return baseActiveCases.filter((caseItem) => {
      const date = caseItem.updatedAt || caseItem.createdAt || caseItem.instructionReceived;
      const d = parseAnyDate(date);
      if (!d) return false;
      return Math.floor((Date.now() - d.getTime()) / 86400000) >= 7;
    });
  }, [baseActiveCases]);

  const totalUnreadMessages = useMemo(
    () => selectedProfileCases.reduce((sum, caseItem) => sum + Number(messageCounts[caseItem._id] || 0), 0),
    [messageCounts, selectedProfileCases]
  );

  const reportsSent = useMemo(() => {
    return selectedProfileCases.reduce((sum, caseItem) => {
      const directCount = Number(caseItem.reportsSent || caseItem.reportCount || 0);
      if (Number.isFinite(directCount) && directCount > 0) return sum + directCount;
      return sum + (!isMissing(caseItem.lastReportSentAt || caseItem.reportSentAt) ? 1 : 0);
    }, 0);
  }, [selectedProfileCases]);

  const totalValue = useMemo(
    () => selectedProfileCases.reduce((sum, caseItem) => sum + moneyValue(caseItem.purchasePrice), 0),
    [selectedProfileCases]
  );

  const recentActivity = useMemo(() => {
    return selectedProfileCases
      .slice()
      .sort((a, b) => {
        const aDate = parseAnyDate(a.updatedAt || a.createdAt || a.instructionReceived)?.getTime() || 0;
        const bDate = parseAnyDate(b.updatedAt || b.createdAt || b.instructionReceived)?.getTime() || 0;
        return bDate - aDate;
      })
      .slice(0, 5)
      .map((caseItem) => {
        const work = getCaseWorkItem(caseItem);
        return {
          id: caseItem._id,
          text: `${work.label} · ${getCaseLabel(caseItem)}`,
          time: formatActivityTime(caseItem.updatedAt || caseItem.createdAt || caseItem.instructionReceived),
          icon: work.type === "documents" ? "document" : work.type,
        };
      });
  }, [selectedProfileCases]);

  const filterOptions = useMemo(
    () => [
      { key: "none", label: "All matters" },
      { key: "bond", label: "No bond" },
      { key: "deposit", label: "No deposit" },
      { key: "transfer", label: "No transfer" },
      { key: "active", label: "Active" },
      { key: "inactive", label: "Pending" },
    ],
    []
  );

  const dashboardTotals = useMemo(
    () => ({
      total: selectedProfileCases.length,
      active: baseActiveCases.length,
      pending: basePendingCases.length,
      overdue: overdueItems.length,
      missingDocuments: missingDocumentCases.reduce((sum, item) => sum + item.missingCount, 0),
      stuck: stuckCases.length,
    }),
    [baseActiveCases.length, basePendingCases.length, missingDocumentCases, overdueItems.length, selectedProfileCases.length, stuckCases.length]
  );

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

  const openMatterFromModal = (caseId) => {
    setDashboardModal(null);
    navigate(`/case/${caseId}`);
  };

  const openWorkItemModal = (workItem) => {
    if (!workItem?.caseItem) return;
    const details = Array.isArray(workItem.details) ? workItem.details : [];
    setDashboardModal({
      tone: workItem.type || "documents",
      title: workItem.label,
      subtitle: getCaseLabel(workItem.caseItem),
      description: `${safeDisplay(workItem.caseItem?.parties)}${safeDisplay(workItem.caseItem?.agent) !== "—" ? ` · ${safeDisplay(workItem.caseItem?.agent)}` : ""}`,
      items: details.map((detail) => ({
        id: `${workItem.caseId}-${detail.key || detail.label}`,
        title: detail.label,
        subtitle: detail.status,
        meta: `Requested / due: ${detail.requested} · Received / done: ${detail.received}`,
      })),
      primaryCaseId: workItem.caseId,
      emptyText: "No detailed outstanding items were found for this step.",
    });
  };

  const handleWorkQueueClick = (workItem) => {
    if (Array.isArray(workItem?.details) && workItem.details.length) {
      openWorkItemModal(workItem);
      return;
    }
    navigate(`/case/${workItem.caseId}`);
  };

  const handleInsightClick = (type) => {
    if (type === "overdue") {
      setDashboardModal({
        tone: "red",
        title: "Overdue Transactions",
        subtitle: `${dashboardTotals.overdue} overdue item${dashboardTotals.overdue === 1 ? "" : "s"} in ${selectedProfileName}`,
        description: "These matters need the fastest follow-up based on due dates and open transfer steps.",
        items: overdueItems.slice(0, 80).map((item, index) => ({
          id: `${item.caseItem?._id || index}-${item.type}-${index}`,
          title: item.label,
          subtitle: getCaseLabel(item.caseItem),
          meta: item.dueText,
          details: item.details || [],
          caseId: item.caseItem?._id,
        })),
        filter: "active",
        emptyText: "No overdue transactions were found in this view.",
      });
      return;
    }

    if (type === "missing-documents") {
      setDashboardModal({
        tone: "gold",
        title: "Missing Documents",
        subtitle: `${dashboardTotals.missingDocuments} outstanding document${dashboardTotals.missingDocuments === 1 ? "" : "s"} across active files`,
        description: "Open each matter from here, or use the document breakdown to see exactly what is still missing.",
        items: missingDocumentCases.slice(0, 80).map(({ caseItem, missingCount }) => {
          const missingDocs = getMissingDocumentItems(caseItem);
          return {
            id: caseItem._id,
            title: `${missingCount} outstanding · ${getCaseLabel(caseItem)}`,
            subtitle: safeDisplay(caseItem.parties),
            meta: summariseOutstandingDocuments(missingDocs, 3),
            details: buildDocumentDetailItems(caseItem, missingDocs),
            caseId: caseItem._id,
          };
        }),
        filter: "transfer",
        emptyText: "No missing transfer documents were found in this view.",
      });
      return;
    }

    setDashboardModal({
      tone: "blue",
      title: "Stuck Transactions",
      subtitle: `${dashboardTotals.stuck} inactive file${dashboardTotals.stuck === 1 ? "" : "s"} in ${selectedProfileName}`,
      description: "These matters have not had recorded movement for more than 7 days.",
      items: stuckCases.slice(0, 80).map((caseItem) => {
        const date = caseItem.updatedAt || caseItem.createdAt || caseItem.instructionReceived;
        const age = daysSince(date);
        return {
          id: caseItem._id,
          title: getCaseLabel(caseItem),
          subtitle: safeDisplay(caseItem.parties),
          meta: `${typeof age === "number" ? `${age} days since last update` : "No recent update date"} · Last update: ${safeDisplay(date)}`,
          caseId: caseItem._id,
        };
      }),
      filter: "active",
      emptyText: "No stuck transactions were found in this view.",
    });
  };

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
      <div className="gba-case-detail-section-title">{title}</div>
      {fields.map(({ key, label }) => (
        <div key={key} className={key === "comments" ? "gba-case-detail-field full" : "gba-case-detail-field"}>
          <div className="gba-case-detail-label">{label}</div>
          <div
            className="gba-case-detail-value"
            style={{ backgroundColor: (data.colors || {})[key] || "var(--surface)" }}
          >
            {safeDisplay(data[key])}
          </div>
        </div>
      ))}
    </>
  );

  const statCards = [
    {
      label: "Active Transactions",
      value: dashboardTotals.active,
      detail: `${dashboardTotals.total} total in this view`,
      tone: "navy",
      icon: <FaFolderOpen />,
    },
    {
      label: "Pending Transactions",
      value: dashboardTotals.pending,
      detail: "Awaiting action or documents",
      tone: "gold",
      icon: <FaClock />,
    },
    {
      label: "Overdue Items",
      value: dashboardTotals.overdue,
      detail: dashboardTotals.overdue ? "Needs attention today" : "No overdue items found",
      tone: "red",
      icon: <FaExclamationCircle />,
    },
    {
      label: "Reports Sent",
      value: reportsSent,
      detail: reportsSent ? "Reports recorded for this view" : "No reports recorded for this view",
      tone: "green",
      icon: <FaFileAlt />,
    },
    {
      label: "Messages",
      value: totalUnreadMessages,
      detail: totalUnreadMessages ? `${totalUnreadMessages} unread` : "No unread matter messages",
      tone: "blue",
      icon: <FaComments />,
    },
  ];

  const insightCards = [
    {
      label: "Overdue Transactions",
      description: dashboardTotals.overdue
        ? `${dashboardTotals.overdue} overdue item${dashboardTotals.overdue === 1 ? "" : "s"}. Immediate attention required.`
        : "No overdue transfer items in this view.",
      tone: "red",
      icon: <FaExclamationTriangle />,
      key: "overdue",
    },
    {
      label: "Missing Documents",
      description: dashboardTotals.missingDocuments
        ? `${dashboardTotals.missingDocuments} outstanding document${dashboardTotals.missingDocuments === 1 ? "" : "s"} across active files.`
        : "All tracked transfer documents are currently captured.",
      tone: "gold",
      icon: <FaExclamationTriangle />,
      key: "missing-documents",
    },
    {
      label: "Stuck Transactions",
      description: dashboardTotals.stuck
        ? `${dashboardTotals.stuck} file${dashboardTotals.stuck === 1 ? " has" : "s have"} been inactive for more than 7 days.`
        : "No active files appear stuck from recent update dates.",
      tone: "blue",
      icon: <FaInfoCircle />,
      key: "stuck",
    },
  ];

  const sidebarControls = sidebarHost
    ? createPortal(
        <div className="gba-dashboard-sidebar-panel">
          <label className="gba-sidebar-search">
            <span>Profile view</span>
            <div>
              <FaUserCircle />
              <select
                value={selectedProfileKey}
                onChange={(e) => setSelectedProfileKey(e.target.value)}
                aria-label="Select dashboard profile"
              >
                <option value={ALL_PROFILES_KEY}>All profiles</option>
                {profileOptions.map((profile) => (
                  <option key={profile.key} value={profile.key}>
                    {profile.name} ({profile.active} active / {profile.pending} pending)
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="gba-sidebar-search">
            <span>Search matters</span>
            <div>
              <FaSearch />
              <input
                type="text"
                placeholder="Reference, party, agent or property"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </label>

          <div className="gba-sidebar-filter-group" aria-label="Dashboard filters">
            <span><FaFilter /> Filter view</span>
            {filterOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={filterType === option.key ? "active" : ""}
                onClick={() => setFilterType(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="gba-sidebar-stats">
            <div><strong>{dashboardTotals.total}</strong><span>Total</span></div>
            <div><strong>{dashboardTotals.active}</strong><span>Active</span></div>
            <div><strong>{dashboardTotals.pending}</strong><span>Pending</span></div>
          </div>

          <button type="button" className="gba-sidebar-print" onClick={() => window.print()}>
            <FaPrint /> Print report
          </button>
        </div>,
        sidebarHost
      )
    : null;

  const renderWorkQueue = () => (
    <section className="gba-dashboard-panel gba-dashboard-workqueue">
      <header className="gba-dashboard-panel-head">
        <div>
          <h2>Today&apos;s Work Queue <span>{workQueue.length}</span></h2>
          <p>Prioritised from due dates, missing documents and open transfer steps.</p>
        </div>
        <button type="button" onClick={() => setFilterType("active")}>View all</button>
      </header>
      <div className="gba-workqueue-list">
        {workQueue.length ? (
          workQueue.map((item) => (
            <button
              key={`${item.caseId}-${item.label}`}
              type="button"
              className="gba-workqueue-row"
              onClick={() => handleWorkQueueClick(item)}
            >
              <span className={`gba-workqueue-icon tone-${item.type}`}>
                {item.type === "documents" ? <FaFileAlt /> : item.type === "deposit" || item.type === "bond" ? <FaClock /> : <FaTasks />}
              </span>
              <span className="gba-workqueue-main">
                <strong>{item.label} — {getCaseLabel(item.caseItem)}</strong>
                <small>{safeDisplay(item.caseItem?.parties)}{safeDisplay(item.caseItem?.agent) !== "—" ? ` · ${safeDisplay(item.caseItem?.agent)}` : ""}</small>
              </span>
              <span className={`gba-due-text ${String(item.dueText).toLowerCase().includes("overdue") || item.dueText === "Due today" ? "urgent" : ""}`}>
                {item.dueText}
              </span>
              <span className={`gba-priority-pill priority-${item.priority.toLowerCase()}`}>{item.priority}</span>
            </button>
          ))
        ) : (
          <div className="gba-empty-state">No urgent work queue items for this profile.</div>
        )}
      </div>
    </section>
  );

  const renderInsights = () => (
    <section className="gba-dashboard-panel gba-dashboard-insights">
      <header className="gba-dashboard-panel-head">
        <div>
          <h2>Alerts &amp; Insights</h2>
          <p>Immediate risks generated from the live matter data.</p>
        </div>
      </header>
      <div className="gba-insight-list">
        {insightCards.map((card) => (
          <button
            key={card.label}
            type="button"
            className="gba-insight-row"
            onClick={() => handleInsightClick(card.key)}
          >
            <span className={`gba-insight-icon tone-${card.tone}`}>{card.icon}</span>
            <span>
              <strong>{card.label}</strong>
              <small>{card.description}</small>
            </span>
            <em>View</em>
          </button>
        ))}
      </div>
    </section>
  );

  const renderCasesTable = (cases, label, variant = "active") => (
    <section className="gba-dashboard-table-card">
      <header className="gba-dashboard-table-head">
        <div>
          <h2>{label} {variant === "pending" && <span>{cases.length}</span>}</h2>
          {variant === "active" && <p>{selectedProfileName} · {cases.length} transaction{cases.length === 1 ? "" : "s"}</p>}
        </div>
        <button type="button" onClick={() => setFilterType(variant === "pending" ? "inactive" : "active")}>View all</button>
      </header>

      <div className="gba-responsive-table-wrap">
        <table className="table gba-dashboard-table">
          <colgroup>
            <col className="col-days" />
            <col className="col-reference" />
            <col className="col-agent" />
            <col className="col-parties" />
            <col className="col-property" />
            <col className="col-status" />
            <col className="col-next-step" />
            <col className="col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th className="days-col">Days</th>
              <th>Reference</th>
              <th>Agent</th>
              <th>Parties</th>
              <th>Property</th>
              <th>Status</th>
              <th>Next Step</th>
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cases.length ? (
              cases.map((c, i) => {
                const work = getCaseWorkItem(c);
                return (
                  <React.Fragment key={c._id}>
                    <tr className={i % 2 === 0 ? "" : "is-alt"}>
                      <td
                        onClick={() => setColorPickIndex(colorPickIndex === c._id ? null : c._id)}
                        className="gba-days-cell"
                        style={{ background: (c.colors || {}).daysSinceInstruction || "var(--color-primary)" }}
                        title="Click to change the days highlight colour"
                      >
                        {daysSince(c.instructionReceived)}
                      </td>

                      {["reference", "agent", "parties", "property"].map((key) => (
                        <td
                          key={key}
                          style={{ background: (c.colors || {})[key] || "transparent" }}
                          className={`gba-field-cell field-${key}`}
                          title={safeDisplay(c[key])}
                        >
                          {safeDisplay(c[key])}
                        </td>
                      ))}

                      <td>
                        <span className={c.isActive === false ? "gba-status-pill pending" : "gba-status-pill active"}>
                          {c.isActive === false ? "Pending" : "In Progress"}
                        </span>
                      </td>

                      <td className="gba-next-step-cell">
                        <button
                          type="button"
                          className={Array.isArray(work.details) && work.details.length ? "gba-next-step-button has-details" : "gba-next-step-button"}
                          onClick={() => openWorkItemModal(work)}
                          title={Array.isArray(work.details) && work.details.length ? "View outstanding items" : "View next step"}
                        >
                          <strong>{work.label}</strong>
                          <small className={work.priority === "High" ? "urgent" : ""}>{work.dueText}</small>
                          {Array.isArray(work.details) && work.details.length > 1 && (
                            <em>{work.details.length} items</em>
                          )}
                        </button>
                      </td>

                      <td className="actions-col">
                        <div className="gba-action-group">
                          <button onClick={() => navigate(`/case/${c._id}`)} className="neumo-button">
                            Edit
                          </button>
                          <button onClick={() => navigate(`/report/${c._id}`)} className="neumo-button">
                            Report
                          </button>

                          <div className="gba-message-action-wrap">
                            <button
                              onClick={() => handleOpenMessages(c._id)}
                              className="neumo-button icon-only"
                              title="Messages"
                            >
                              <FaComments />
                            </button>
                            {messageCounts[c._id] > 0 && (
                              <span className="badge gba-action-badge">
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
                            className={c.isActive === false ? "neumo-button status-toggle pending" : "neumo-button status-toggle active"}
                          >
                            {c.isActive === false ? "Pending" : "Active"}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {colorPickIndex === c._id && (
                      <tr className="gba-colour-row">
                        <td colSpan={8}>
                          <div className="neumo-pressed gba-colour-picker-panel">
                            <label>Highlight colour:</label>
                            <input
                              type="color"
                              onChange={(e) => handleColorChange(c._id, e.target.value)}
                              value={(c.colors || {}).daysSinceInstruction || "#ffffff"}
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
                      <tr className="gba-expanded-row">
                        <td colSpan={8}>
                          <div className="gba-expanded-grid">
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
                );
              })
            ) : (
              <tr>
                <td colSpan={8}>
                  <div className="gba-empty-state">No transactions match this profile and filter.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderDashboardModal = () => {
    if (!dashboardModal || typeof document === "undefined") return null;

    return createPortal(
      <div
        className="gba-dashboard-modal-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setDashboardModal(null);
        }}
      >
        <section className="gba-dashboard-modal" role="dialog" aria-modal="true" aria-labelledby="gba-dashboard-modal-title">
          <header className="gba-dashboard-modal-head">
            <span className={`gba-insight-icon tone-${dashboardModal.tone || "blue"}`}>
              {dashboardModal.tone === "red" ? <FaExclamationTriangle /> : dashboardModal.tone === "gold" ? <FaExclamationCircle /> : <FaInfoCircle />}
            </span>
            <div>
              <h2 id="gba-dashboard-modal-title">{dashboardModal.title}</h2>
              {dashboardModal.subtitle && <p>{dashboardModal.subtitle}</p>}
            </div>
            <button type="button" className="gba-dashboard-modal-close" onClick={() => setDashboardModal(null)} aria-label="Close dashboard details">
              ×
            </button>
          </header>

          {dashboardModal.description && <p className="gba-dashboard-modal-description">{dashboardModal.description}</p>}

          <div className="gba-dashboard-modal-list">
            {dashboardModal.items?.length ? (
              dashboardModal.items.map((item) => (
                <article key={item.id} className="gba-dashboard-modal-item">
                  <div>
                    <strong>{item.title}</strong>
                    {item.subtitle && <span>{item.subtitle}</span>}
                    {item.meta && <small>{item.meta}</small>}
                  </div>

                  {Array.isArray(item.details) && item.details.length > 0 && (
                    <ul>
                      {item.details.slice(0, 12).map((detail) => (
                        <li key={`${item.id}-${detail.key || detail.label}`}>
                          <b>{detail.label}</b>
                          <span>{detail.status} · Requested: {detail.requested} · Received: {detail.received}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {item.caseId && (
                    <button type="button" className="neumo-button" onClick={() => openMatterFromModal(item.caseId)}>
                      Open matter
                    </button>
                  )}
                </article>
              ))
            ) : (
              <div className="gba-empty-state">{dashboardModal.emptyText || "No items found for this view."}</div>
            )}
          </div>

          <footer className="gba-dashboard-modal-footer">
            {dashboardModal.primaryCaseId && (
              <button type="button" className="neumo-button" onClick={() => openMatterFromModal(dashboardModal.primaryCaseId)}>
                Open matter
              </button>
            )}
            {dashboardModal.filter && (
              <button
                type="button"
                className="neumo-button secondary"
                onClick={() => {
                  setFilterType(dashboardModal.filter);
                  setDashboardModal(null);
                }}
              >
                Apply this view
              </button>
            )}
            <button type="button" className="gba-dashboard-modal-cancel" onClick={() => setDashboardModal(null)}>
              Close
            </button>
          </footer>
        </section>
      </div>,
      document.body
    );
  };

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
                <td className="w-ref ellipsis">{safeDisplay(c.reference)}</td>
                <td className="w-agent ellipsis">{safeDisplay(c.agent)}</td>
                <td className="w-parties ellipsis">{safeDisplay(c.parties)}</td>
                <td className="w-prop ellipsis">{safeDisplay(c.property)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  };

  return (
    <div className="app-container gba-dashboard-page">
      {sidebarControls}

      <div className="screen-only gba-dashboard-shell">
        <section className="gba-dashboard-hero">
          <div>
            <span className="gba-sidebar-kicker">Conveyancing command centre</span>
            <h1>Welcome back, {currentUser?.username || currentUser?.email?.split("@")[0] || "there"} <span>👋</span></h1>
            <p>Here&apos;s what&apos;s happening with {selectedProfileName.toLowerCase()} today.</p>
          </div>
          <div className="gba-dashboard-hero-brand" aria-hidden="true">
            <span>GB</span>
            <FaBriefcase />
          </div>
        </section>

        <div className={topPanelExpanded ? "gba-dashboard-top-panel expanded" : "gba-dashboard-top-panel collapsed"}>
          <div className="gba-top-panel-bar">
            <div>
              <strong>Dashboard overview</strong>
              <span>{topPanelExpanded ? "Showing work queue, alerts and KPI cards" : "Collapsed so active transactions stay visible first"}</span>
            </div>
            <button type="button" onClick={() => setTopPanelExpanded((value) => !value)}>
              {topPanelExpanded ? <FaChevronUp /> : <FaChevronDown />}
              {topPanelExpanded ? "Minimise overview" : "Expand overview"}
            </button>
          </div>

          {topPanelExpanded && (
            <>
              <div className="gba-stat-grid">
                {statCards.map((card) => (
                  <article key={card.label} className="gba-stat-card">
                    <span className={`gba-stat-icon tone-${card.tone}`}>{card.icon}</span>
                    <div>
                      <strong>{card.label}</strong>
                      <b>{card.value}</b>
                      <small>{card.detail}</small>
                    </div>
                  </article>
                ))}
              </div>

              <div className="gba-dashboard-upper-grid">
                {renderWorkQueue()}
                {renderInsights()}
              </div>
            </>
          )}
        </div>

        {renderCasesTable(activeCases, "Active Transactions", "active")}

        <div className="gba-dashboard-lower-grid">
          {renderCasesTable(pendingCases, "Pending Transactions", "pending")}

          <section className="gba-dashboard-panel gba-recent-activity-card">
            <header className="gba-dashboard-panel-head">
              <div>
                <h2>Recent Activity</h2>
                <p>Latest transaction movement in the selected profile.</p>
              </div>
              <button type="button" onClick={() => setFilterType("none")}>View all</button>
            </header>

            <div className="gba-activity-list">
              {recentActivity.length ? (
                recentActivity.map((activity) => (
                  <button key={activity.id} type="button" onClick={() => navigate(`/case/${activity.id}`)}>
                    <span className={`gba-activity-icon tone-${activity.icon}`}>
                      {activity.icon === "document" ? <FaFileAlt /> : activity.icon === "deposit" || activity.icon === "bond" ? <FaClock /> : <FaHistory />}
                    </span>
                    <strong>{activity.text}</strong>
                    <small>{activity.time}</small>
                  </button>
                ))
              ) : (
                <div className="gba-empty-state">No recent activity for this view.</div>
              )}
            </div>
          </section>
        </div>

        <section className="gba-dashboard-profile-strip" aria-label="Profile summary">
          <span><FaUsers /> {profileOptions.length || 0} profile{profileOptions.length === 1 ? "" : "s"}</span>
          <span><FaCheckCircle /> {dashboardTotals.active} active</span>
          <span><FaClock /> {dashboardTotals.pending} pending</span>
          <span><FaPaperPlane /> R {totalValue.toLocaleString("en-ZA")} tracked value</span>
        </section>

        {selectedCaseId && currentUser && (
          <MessageBox caseId={selectedCaseId} onClose={handleCloseMessages} currentUser={currentUser} />
        )}

        {renderDashboardModal()}
      </div>

      <div id="compactPrintArea">
        <div className="meta">
          <span>Conveyancing Portal</span>
          <span>{new Date().toLocaleString()}</span>
        </div>
        <h1>Dashboard Report — {selectedProfileName}</h1>
        <div className="user-block">
          {renderPrintTable(activeCases, "Active Transactions")}
          {renderPrintTable(pendingCases, "Pending Transactions")}
        </div>
      </div>
    </div>
  );
}
