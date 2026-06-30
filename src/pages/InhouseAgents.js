import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaBalanceScale,
  FaBuilding,
  FaChartLine,
  FaChevronRight,
  FaEye,
  FaFilter,
  FaFolderOpen,
  FaImage,
  FaPlus,
  FaSave,
  FaSearch,
  FaTimes,
  FaTrashAlt,
  FaUserEdit,
  FaUsers,
} from "react-icons/fa";

const BASE_URL = "https://case-tracking-backend.onrender.com";

const DEFAULT_BRANCH_ACCENTS = ["#d2ac68", "#1ea7ff", "#1d4ed8", "#6b7280", "#0f6da8"];

const DEFAULT_BRANCH_META = {
  pretoria: {
    key: "pretoria",
    name: "Pretoria",
    region: "Pretoria",
    logoUrl: "/inhouse-branches/all-about-homes-pretoria.png",
    accent: "#d2ac68",
    sortOrder: 10,
  },
  waterberg: {
    key: "waterberg",
    name: "Waterberg",
    region: "Waterberg",
    logoUrl: "/inhouse-branches/all-about-homes-waterberg.png",
    accent: "#1ea7ff",
    sortOrder: 20,
  },
  vaal: {
    key: "vaal",
    name: "Vaal",
    region: "Vaal",
    logoUrl: "/inhouse-branches/all-about-homes-vaal.png",
    accent: "#6b7280",
    sortOrder: 30,
  },
  familia: {
    key: "familia",
    name: "Familia",
    region: "Familia",
    logoUrl: "/inhouse-branches/all-about-homes-familia.png",
    accent: "#0f6da8",
    sortOrder: 40,
  },
};

const DEFAULT_MANUAL_STATS = {
  activeFiles: "",
  listingsThisWeek: "",
  listingsThisMonth: "",
  dealsThisWeek: "",
  dealsThisMonth: "",
  dealsTotal: "",
};

const EMPTY_BRANCH_STATE = {
  _id: "",
  key: "",
  name: "",
  region: "",
  contactName: "",
  phone: "",
  email: "",
  logoUrl: "",
  accent: "#d2ac68",
  sortOrder: "999",
  notes: "",
  active: true,
};

function getAuthConfig() {
  const token = localStorage.getItem("token");
  return { headers: { Authorization: `Bearer ${token}` } };
}

function getTodayInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthKeyFromDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getCurrentMonthKey() {
  return buildMonthKeyFromDate(new Date());
}

function parseMonthKey(monthKey) {
  const match = String(monthKey || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addMonthsToMonthKey(monthKey, amount) {
  const parsed = parseMonthKey(monthKey) || new Date();
  parsed.setMonth(parsed.getMonth() + amount);
  return buildMonthKeyFromDate(parsed);
}

function formatMonthLabel(monthKey) {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return "Selected month";
  return new Intl.DateTimeFormat("en-ZA", { year: "numeric", month: "long" }).format(parsed);
}

function monthKeyFromValue(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const monthMatch = value.match(/^(\d{4})-(\d{2})/);
    if (monthMatch) return `${monthMatch[1]}-${monthMatch[2]}`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : buildMonthKeyFromDate(parsed);
}

function getListingMonthKey(entry) {
  return (
    entry?.monthKey ||
    monthKeyFromValue(entry?.periodStart) ||
    monthKeyFromValue(entry?.captureDate) ||
    monthKeyFromValue(entry?.weekKey) ||
    monthKeyFromValue(entry?.capturedAt)
  );
}

function getDealMonthKey(entry) {
  return entry?.monthKey || monthKeyFromValue(entry?.dealDate) || monthKeyFromValue(entry?.capturedAt);
}

function safeNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function formatInteger(value) {
  return new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 0 }).format(safeNumber(value));
}

function getInitials(name) {
  return (
    String(name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((piece) => piece[0]?.toUpperCase() || "")
      .join("") || "AA"
  );
}

function sortDealsDesc(history) {
  return [...(Array.isArray(history) ? history : [])].sort(
    (a, b) => new Date(b?.dealDate || b?.capturedAt || 0).getTime() - new Date(a?.dealDate || a?.capturedAt || 0).getTime()
  );
}

function sortListingsDesc(history) {
  return [...(Array.isArray(history) ? history : [])].sort(
    (a, b) => new Date(b?.periodStart || b?.capturedAt || 0).getTime() - new Date(a?.periodStart || a?.capturedAt || 0).getTime()
  );
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", { year: "numeric", month: "short", day: "2-digit" }).format(date);
}

function createEmptyEditState(branchKey = "pretoria") {
  return {
    _id: "",
    fullName: "",
    branch: branchKey || "pretoria",
    role: "Inhouse Agent",
    birthday: "",
    phone: "",
    email: "",
    area: "",
    profileImage: "",
    notes: "",
    featured: false,
    aliasesText: "",
    openingTotalListings: "0",
    openingTotalDeals: "0",
    manualStats: { ...DEFAULT_MANUAL_STATS },
    listingCapture: {
      captureDate: getTodayInputValue(),
      capturedCount: "",
      note: "",
    },
    dealCapture: {
      dealDate: getTodayInputValue(),
      count: "1",
      transferAttorneyType: "gerhard_barnard_inc",
      transferAttorneyName: "",
      note: "",
    },
  };
}

async function fileToDataUrl(file, maxSize = 520) {
  const rawDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = reject;
    element.src = rawDataUrl;
  });

  const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function buildEditState(agent, fallbackBranch = "pretoria") {
  const manual = agent?.stats?.manual || {};
  return {
    _id: agent?._id || "",
    fullName: agent?.fullName || "",
    branch: agent?.branch || fallbackBranch || "pretoria",
    role: agent?.role || "Inhouse Agent",
    birthday: agent?.birthday || "",
    phone: agent?.phone || "",
    email: agent?.email || "",
    area: agent?.area || "",
    profileImage: agent?.profileImage || "",
    notes: agent?.notes || "",
    featured: !!agent?.featured,
    aliasesText: Array.isArray(agent?.aliases) ? agent.aliases.join(", ") : "",
    openingTotalListings: String(agent?.openingTotalListings ?? agent?.stats?.openingTotalListings ?? 0),
    openingTotalDeals: String(agent?.openingTotalDeals ?? agent?.stats?.openingTotalDeals ?? 0),
    manualStats: {
      activeFiles: manual?.activeFiles ?? "",
      listingsThisWeek: manual?.listingsThisWeek ?? "",
      listingsThisMonth: manual?.listingsThisMonth ?? "",
      dealsThisWeek: manual?.dealsThisWeek ?? "",
      dealsThisMonth: manual?.dealsThisMonth ?? "",
      dealsTotal: manual?.dealsTotal ?? "",
    },
    listingCapture: { captureDate: getTodayInputValue(), capturedCount: "", note: "" },
    dealCapture: {
      dealDate: getTodayInputValue(),
      count: "1",
      transferAttorneyType: "gerhard_barnard_inc",
      transferAttorneyName: "",
      note: "",
    },
  };
}

function getMonthlyListingEntries(agent, monthKey) {
  return sortListingsDesc(agent?.listingHistory).filter((entry) => getListingMonthKey(entry) === monthKey);
}

function getMonthlyDealEntries(agent, monthKey, transferAttorneyType = "all") {
  return sortDealsDesc(agent?.dealHistory).filter((entry) => {
    if (getDealMonthKey(entry) !== monthKey) return false;
    if (transferAttorneyType === "all") return true;
    return entry?.transferAttorneyType === transferAttorneyType;
  });
}

function getMonthlyListingValue(agent, monthKey) {
  const entries = getMonthlyListingEntries(agent, monthKey);
  if (entries.length) return safeNumber(entries[0]?.capturedCount);
  if (monthKey === getCurrentMonthKey()) return safeNumber(agent?.stats?.listingsThisMonth);
  return 0;
}

function getMonthlyDealValue(agent, monthKey, transferAttorneyType = "all") {
  const entries = getMonthlyDealEntries(agent, monthKey, transferAttorneyType);
  if (entries.length) return entries.reduce((sum, entry) => sum + safeNumber(entry?.count), 0);
  if (monthKey === getCurrentMonthKey()) {
    const stats = agent?.stats || {};
    if (transferAttorneyType === "gerhard_barnard_inc") return safeNumber(stats.dealsToGBIMonth);
    if (transferAttorneyType === "other") return safeNumber(stats.dealsToOtherMonth);
    return safeNumber(stats.dealsThisMonth);
  }
  return 0;
}

function normalizeBranch(branch, index = 0) {
  const fallback = DEFAULT_BRANCH_META[branch?.key] || {};
  const key = branch?.key || fallback.key || "pretoria";
  return {
    key,
    name: branch?.name || fallback.name || key.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    region: branch?.region || fallback.region || "",
    contactName: branch?.contactName || "",
    phone: branch?.phone || "",
    email: branch?.email || "",
    logoUrl: branch?.logoUrl || fallback.logoUrl || "",
    accent: branch?.accent || fallback.accent || DEFAULT_BRANCH_ACCENTS[index % DEFAULT_BRANCH_ACCENTS.length],
    notes: branch?.notes || "",
    sortOrder: branch?.sortOrder ?? fallback.sortOrder ?? 999,
    active: branch?.active !== false,
    _id: branch?._id || "",
  };
}

function buildAgentPayload(editState) {
  return {
    fullName: editState.fullName.trim(),
    branch: editState.branch,
    role: editState.role.trim(),
    birthday: editState.birthday.trim(),
    phone: editState.phone.trim(),
    email: editState.email.trim(),
    area: editState.area.trim(),
    profileImage: editState.profileImage,
    notes: editState.notes.trim(),
    featured: !!editState.featured,
    openingTotalListings: Number(editState.openingTotalListings || 0),
    openingTotalDeals: Number(editState.openingTotalDeals || 0),
    aliases: editState.aliasesText
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    manualStats: {
      activeFiles: editState.manualStats.activeFiles === "" ? null : Number(editState.manualStats.activeFiles),
      listingsThisWeek: editState.manualStats.listingsThisWeek === "" ? null : Number(editState.manualStats.listingsThisWeek),
      listingsThisMonth: editState.manualStats.listingsThisMonth === "" ? null : Number(editState.manualStats.listingsThisMonth),
      dealsThisWeek: editState.manualStats.dealsThisWeek === "" ? null : Number(editState.manualStats.dealsThisWeek),
      dealsThisMonth: editState.manualStats.dealsThisMonth === "" ? null : Number(editState.manualStats.dealsThisMonth),
      dealsTotal: editState.manualStats.dealsTotal === "" ? null : Number(editState.manualStats.dealsTotal),
    },
  };
}

function summarizeBranchAgents(agents, branchKey, selectedMonth) {
  const branchAgents = agents.filter((agent) => agent.branch === branchKey);
  return branchAgents.reduce(
    (acc, agent) => {
      const stats = agent?.stats || {};
      acc.agents += 1;
      acc.activeFiles += safeNumber(stats.activeFiles);
      acc.totalListings += safeNumber(stats.totalListings);
      acc.totalDeals += safeNumber(stats.dealsTotal);
      acc.monthListings += getMonthlyListingValue(agent, selectedMonth);
      acc.monthDeals += getMonthlyDealValue(agent, selectedMonth, "all");
      acc.monthDealsToGBI += getMonthlyDealValue(agent, selectedMonth, "gerhard_barnard_inc");
      acc.monthDealsToOther += getMonthlyDealValue(agent, selectedMonth, "other");
      return acc;
    },
    { agents: 0, activeFiles: 0, totalListings: 0, totalDeals: 0, monthListings: 0, monthDeals: 0, monthDealsToGBI: 0, monthDealsToOther: 0 }
  );
}

function MetricCard({ label, value, icon, detail }) {
  return (
    <div style={metricCardStyle}>
      <div style={metricIconStyle}>{icon}</div>
      <div style={metricValueStyle}>{formatInteger(value)}</div>
      <div style={metricLabelStyle}>{label}</div>
      {detail ? <div style={metricDetailStyle}>{detail}</div> : null}
    </div>
  );
}

export default function InhouseAgents() {
  const [agents, setAgents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingAgent, setEditingAgent] = useState(null);
  const [editState, setEditState] = useState(createEmptyEditState());
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchState, setBranchState] = useState(EMPTY_BRANCH_STATE);
  const [expandedAgentIds, setExpandedAgentIds] = useState({});

  const canEdit = !!currentUser?.isAdmin;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [agentsRes, branchesRes, userRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/inhouse-agents`, getAuthConfig()),
        axios.get(`${BASE_URL}/api/inhouse-branches`, getAuthConfig()),
        axios.get(`${BASE_URL}/api/users/me`, getAuthConfig()),
      ]);

      const nextAgents = Array.isArray(agentsRes.data) ? agentsRes.data : [];
      const nextBranches = Array.isArray(branchesRes.data) ? branchesRes.data.map(normalizeBranch) : [];
      setAgents(nextAgents);
      setBranches(nextBranches);
      setCurrentUser(userRes.data || null);

      setEditingAgent((prev) => {
        if (!prev?._id) return prev;
        return nextAgents.find((agent) => agent._id === prev._id) || prev;
      });
    } catch (err) {
      console.error("Failed to load inhouse agents:", err);
      setError(err?.response?.data?.message || "Could not load the inhouse agents page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(""), 3200);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const branchOptions = useMemo(() => {
    const map = new Map();
    Object.values(DEFAULT_BRANCH_META).forEach((branch, index) => map.set(branch.key, normalizeBranch(branch, index)));
    branches.forEach((branch, index) => map.set(branch.key, normalizeBranch(branch, index)));
    agents.forEach((agent, index) => {
      if (agent?.branch && !map.has(agent.branch)) map.set(agent.branch, normalizeBranch({ key: agent.branch }, index));
    });
    return [...map.values()].filter((branch) => branch.active !== false).sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));
  }, [agents, branches]);

  const branchMap = useMemo(() => {
    return branchOptions.reduce((acc, branch) => {
      acc[branch.key] = branch;
      return acc;
    }, {});
  }, [branchOptions]);

  const selectedMonthLabel = useMemo(() => formatMonthLabel(selectedMonth), [selectedMonth]);

  const monthOptions = useMemo(() => {
    const keys = new Set([getCurrentMonthKey(), selectedMonth]);
    agents.forEach((agent) => {
      (Array.isArray(agent?.dealHistory) ? agent.dealHistory : []).forEach((entry) => {
        const key = getDealMonthKey(entry);
        if (key) keys.add(key);
      });
      (Array.isArray(agent?.listingHistory) ? agent.listingHistory : []).forEach((entry) => {
        const key = getListingMonthKey(entry);
        if (key) keys.add(key);
      });
    });
    return [...keys]
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => ({ value: key, label: formatMonthLabel(key) }));
  }, [agents, selectedMonth]);

  const filteredAgents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return agents.filter((agent) => {
      if (branchFilter !== "all" && agent.branch !== branchFilter) return false;
      if (!needle) return true;
      const branch = branchMap[agent.branch];
      const haystack = [agent.fullName, agent.email, agent.phone, agent.area, agent.role, branch?.name, branch?.region]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [agents, branchFilter, branchMap, search]);

  const totals = useMemo(() => {
    return filteredAgents.reduce(
      (acc, agent) => {
        const stats = agent?.stats || {};
        acc.totalAgents += 1;
        acc.activeFiles += safeNumber(stats.activeFiles);
        acc.totalListings += safeNumber(stats.totalListings);
        acc.totalDeals += safeNumber(stats.dealsTotal);
        acc.monthListings += getMonthlyListingValue(agent, selectedMonth);
        acc.monthDeals += getMonthlyDealValue(agent, selectedMonth, "all");
        acc.monthDealsToGBI += getMonthlyDealValue(agent, selectedMonth, "gerhard_barnard_inc");
        acc.monthDealsToOther += getMonthlyDealValue(agent, selectedMonth, "other");
        return acc;
      },
      { totalAgents: 0, activeFiles: 0, totalListings: 0, totalDeals: 0, monthListings: 0, monthDeals: 0, monthDealsToGBI: 0, monthDealsToOther: 0 }
    );
  }, [filteredAgents, selectedMonth]);

  const branchSummaries = useMemo(() => {
    return branchOptions.map((branch) => ({ branch, summary: summarizeBranchAgents(agents, branch.key, selectedMonth) }));
  }, [agents, branchOptions, selectedMonth]);

  const activeBranch = branchFilter === "all" ? null : branchMap[branchFilter];

  const applyUpdatedAgent = useCallback((updatedAgent, options = {}) => {
    setAgents((prev) => {
      const exists = prev.some((agent) => agent._id === updatedAgent._id);
      if (!exists) return [...prev, updatedAgent].sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || "")));
      return prev.map((agent) => (agent._id === updatedAgent._id ? updatedAgent : agent));
    });
    setEditingAgent((prev) => (prev?._id === updatedAgent._id ? updatedAgent : prev));
    setEditState((prev) => ({
      ...(options.refreshEditState ? buildEditState(updatedAgent, prev.branch) : prev),
      ...(options.resetListingCapture ? { listingCapture: { captureDate: getTodayInputValue(), capturedCount: "", note: "" } } : null),
      ...(options.resetDealCapture
        ? { dealCapture: { dealDate: getTodayInputValue(), count: "1", transferAttorneyType: "gerhard_barnard_inc", transferAttorneyName: "", note: "" } }
        : null),
    }));
  }, []);

  const openNewAgent = useCallback(() => {
    const preferredBranch = branchFilter !== "all" ? branchFilter : branchOptions[0]?.key || "pretoria";
    setEditingAgent({ _id: "", isNew: true });
    setEditState(createEmptyEditState(preferredBranch));
  }, [branchFilter, branchOptions]);

  const openEditor = useCallback((agent) => {
    setEditingAgent(agent);
    setEditState(buildEditState(agent, branchOptions[0]?.key || "pretoria"));
  }, [branchOptions]);

  const closeEditor = useCallback(() => {
    setEditingAgent(null);
    setEditState(createEmptyEditState(branchOptions[0]?.key || "pretoria"));
  }, [branchOptions]);

  const openNewBranch = useCallback(() => {
    setEditingBranch({ isNew: true });
    setBranchState({ ...EMPTY_BRANCH_STATE, sortOrder: String((branchOptions.length + 1) * 10), accent: DEFAULT_BRANCH_ACCENTS[branchOptions.length % DEFAULT_BRANCH_ACCENTS.length] });
  }, [branchOptions.length]);

  const openBranchEditor = useCallback((branch) => {
    setEditingBranch(branch);
    setBranchState({
      _id: branch._id || "",
      key: branch.key || "",
      name: branch.name || "",
      region: branch.region || "",
      contactName: branch.contactName || "",
      phone: branch.phone || "",
      email: branch.email || "",
      logoUrl: branch.logoUrl || "",
      accent: branch.accent || "#d2ac68",
      sortOrder: String(branch.sortOrder ?? 999),
      notes: branch.notes || "",
      active: branch.active !== false,
    });
  }, []);

  const closeBranchEditor = useCallback(() => {
    setEditingBranch(null);
    setBranchState(EMPTY_BRANCH_STATE);
  }, []);

  const handleUploadImage = useCallback(async (event, target = "agent") => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file, target === "branch" ? 780 : 520);
      if (target === "branch") {
        setBranchState((prev) => ({ ...prev, logoUrl: dataUrl }));
      } else {
        setEditState((prev) => ({ ...prev, profileImage: dataUrl }));
      }
    } catch (err) {
      console.error("Image processing failed:", err);
      alert("The image could not be processed. Please try a different file.");
    } finally {
      event.target.value = "";
    }
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!canEdit) return;
    if (!editState.fullName.trim()) {
      setError("Agent name is required.");
      return;
    }
    try {
      setSavingAction("profile");
      setError("");
      const payload = buildAgentPayload(editState);
      const res = editingAgent?.isNew || !editingAgent?._id
        ? await axios.post(`${BASE_URL}/api/inhouse-agents`, payload, getAuthConfig())
        : await axios.put(`${BASE_URL}/api/inhouse-agents/${editingAgent._id}`, payload, getAuthConfig());
      applyUpdatedAgent(res.data, { refreshEditState: true });
      setSuccessMessage(editingAgent?.isNew ? "Agent added." : "Agent profile saved.");
      if (editingAgent?.isNew) setEditingAgent(res.data);
      await loadData();
    } catch (err) {
      console.error("Failed to save agent profile:", err);
      setError(err?.response?.data?.message || "Failed to save the agent profile.");
    } finally {
      setSavingAction("");
    }
  }, [applyUpdatedAgent, canEdit, editState, editingAgent, loadData]);

  const handleSaveBranch = useCallback(async () => {
    if (!canEdit) return;
    if (!branchState.name.trim()) {
      setError("Branch name is required.");
      return;
    }
    try {
      setSavingAction("branch");
      setError("");
      const payload = {
        name: branchState.name.trim(),
        region: branchState.region.trim(),
        contactName: branchState.contactName.trim(),
        phone: branchState.phone.trim(),
        email: branchState.email.trim(),
        logoUrl: branchState.logoUrl.trim(),
        accent: branchState.accent.trim() || "#d2ac68",
        sortOrder: Number(branchState.sortOrder || 999),
        notes: branchState.notes.trim(),
        active: branchState.active !== false,
      };
      const res = editingBranch?.isNew || !branchState._id
        ? await axios.post(`${BASE_URL}/api/inhouse-branches`, payload, getAuthConfig())
        : await axios.put(`${BASE_URL}/api/inhouse-branches/${branchState._id}`, payload, getAuthConfig());
      setBranches((prev) => {
        const normalized = normalizeBranch(res.data);
        const exists = prev.some((branch) => branch._id === normalized._id);
        if (!exists) return [...prev, normalized];
        return prev.map((branch) => (branch._id === normalized._id ? normalized : branch));
      });
      setBranchFilter(res.data.key || branchFilter);
      setSuccessMessage(editingBranch?.isNew ? "Branch added." : "Branch saved.");
      closeBranchEditor();
      await loadData();
    } catch (err) {
      console.error("Failed to save branch:", err);
      setError(err?.response?.data?.message || "Failed to save the branch.");
    } finally {
      setSavingAction("");
    }
  }, [branchFilter, branchState, canEdit, closeBranchEditor, editingBranch, loadData]);

  const handleSaveListingCapture = useCallback(async () => {
    if (!editingAgent?._id || editingAgent?.isNew) {
      setError("Save the agent profile before capturing monthly figures.");
      return;
    }
    try {
      setSavingAction("listingCapture");
      setError("");
      const payload = {
        captureDate: editState.listingCapture.captureDate,
        capturedCount: Number(editState.listingCapture.capturedCount || 0),
        note: editState.listingCapture.note.trim(),
      };
      const res = await axios.post(`${BASE_URL}/api/inhouse-agents/${editingAgent._id}/listing-capture`, payload, getAuthConfig());
      applyUpdatedAgent(res.data, { resetListingCapture: true });
      setSuccessMessage("Monthly listing figure saved.");
    } catch (err) {
      console.error("Failed to save listing capture:", err);
      setError(err?.response?.data?.message || "Failed to save the monthly listing figure.");
    } finally {
      setSavingAction("");
    }
  }, [applyUpdatedAgent, editState.listingCapture, editingAgent]);

  const handleSaveDealCapture = useCallback(async () => {
    if (!editingAgent?._id || editingAgent?.isNew) {
      setError("Save the agent profile before capturing deals.");
      return;
    }
    try {
      setSavingAction("dealCapture");
      setError("");
      const payload = {
        dealDate: editState.dealCapture.dealDate,
        count: Number(editState.dealCapture.count || 1),
        transferAttorneyType: editState.dealCapture.transferAttorneyType,
        transferAttorneyName: editState.dealCapture.transferAttorneyName.trim(),
        note: editState.dealCapture.note.trim(),
      };
      const res = await axios.post(`${BASE_URL}/api/inhouse-agents/${editingAgent._id}/deal-capture`, payload, getAuthConfig());
      applyUpdatedAgent(res.data, { resetDealCapture: true });
      setSuccessMessage("Deal capture saved.");
    } catch (err) {
      console.error("Failed to save deal capture:", err);
      setError(err?.response?.data?.message || "Failed to save the deal capture.");
    } finally {
      setSavingAction("");
    }
  }, [applyUpdatedAgent, editState.dealCapture, editingAgent]);

  const handleDeleteListingHistory = useCallback(async (entryId) => {
    if (!editingAgent?._id || !entryId) return;
    if (!window.confirm("Remove this monthly listing entry?")) return;
    try {
      setSavingAction(`delete-listing-${entryId}`);
      setError("");
      const res = await axios.delete(`${BASE_URL}/api/inhouse-agents/${editingAgent._id}/listing-history/${entryId}`, getAuthConfig());
      applyUpdatedAgent(res.data);
      setSuccessMessage("Listing entry removed.");
    } catch (err) {
      console.error("Failed to remove listing history:", err);
      setError(err?.response?.data?.message || "Failed to remove the listing entry.");
    } finally {
      setSavingAction("");
    }
  }, [applyUpdatedAgent, editingAgent]);

  const handleDeleteDealHistory = useCallback(async (entryId) => {
    if (!editingAgent?._id || !entryId) return;
    if (!window.confirm("Remove this deal entry?")) return;
    try {
      setSavingAction(`delete-deal-${entryId}`);
      setError("");
      const res = await axios.delete(`${BASE_URL}/api/inhouse-agents/${editingAgent._id}/deal-history/${entryId}`, getAuthConfig());
      applyUpdatedAgent(res.data);
      setSuccessMessage("Deal entry removed.");
    } catch (err) {
      console.error("Failed to remove deal history:", err);
      setError(err?.response?.data?.message || "Failed to remove the deal entry.");
    } finally {
      setSavingAction("");
    }
  }, [applyUpdatedAgent, editingAgent]);

  const modalListingHistory = useMemo(() => sortListingsDesc(editingAgent?.listingHistory), [editingAgent]);
  const modalDealHistory = useMemo(() => sortDealsDesc(editingAgent?.dealHistory), [editingAgent]);

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <section style={heroStyle}>
          <div style={heroPatternStyle} />
          <div style={heroContentStyle}>
            <div style={{ minWidth: 0 }}>
              <div style={heroKickerStyle}><FaUsers /> INHOUSE AGENTS</div>
              <h1 style={heroTitleStyle}>Branch performance, agent activity and deal referrals in one clear view.</h1>
              <p style={heroTextStyle}>Track branch totals, open agent profiles, capture monthly listings, and record where each deal is being sent.</p>
            </div>

            <div style={heroControlPanelStyle}>
              <div style={searchWrapStyle}>
                <FaSearch style={searchIconStyle} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search agent, branch, email, phone or area"
                  style={searchInputStyle}
                />
              </div>

              <div style={heroControlsGridStyle}>
                <button type="button" onClick={() => setSelectedMonth((prev) => addMonthsToMonthKey(prev, -1))} style={lightHeroButtonStyle}>Previous month</button>
                <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} style={heroSelectStyle} aria-label="Select reporting month">
                  {monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <button type="button" onClick={() => setSelectedMonth((prev) => addMonthsToMonthKey(prev, 1))} style={lightHeroButtonStyle}>Next month</button>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setSelectedMonth(getCurrentMonthKey())} style={goldHeroButtonStyle}>Current month</button>
                {canEdit ? <button type="button" onClick={openNewBranch} style={goldHeroButtonStyle}><FaPlus /> Add branch</button> : null}
                {canEdit ? <button type="button" onClick={openNewAgent} style={goldHeroButtonStyle}><FaPlus /> Add agent</button> : null}
              </div>
            </div>
          </div>
        </section>

        {successMessage ? <div style={successStyle}>{successMessage}</div> : null}
        {error ? <div style={errorStyle}>{error}</div> : null}

        <section style={metricGridStyle}>
          <MetricCard label="Visible agents" value={totals.totalAgents} icon={<FaUsers />} />
          <MetricCard label="Active files" value={totals.activeFiles} icon={<FaFolderOpen />} />
          <MetricCard label="Listings in selected month" value={totals.monthListings} icon={<FaChartLine />} detail={selectedMonthLabel} />
          <MetricCard label="Deals in selected month" value={totals.monthDeals} icon={<FaBalanceScale />} detail={`${totals.monthDealsToGBI} to Gerhard Barnard Inc · ${totals.monthDealsToOther} other`} />
        </section>

        <section style={contentPanelStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={sectionKickerStyle}><FaFilter /> Branch register</div>
              <h2 style={sectionTitleStyle}>{activeBranch ? `${activeBranch.name} branch` : "All branches"}</h2>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button type="button" onClick={() => setBranchFilter("all")} style={filterButtonStyle(branchFilter === "all")}>All branches</button>
              {branchOptions.map((branch) => (
                <button key={branch.key} type="button" onClick={() => setBranchFilter(branch.key)} style={filterButtonStyle(branchFilter === branch.key)}>{branch.name}</button>
              ))}
            </div>
          </div>

          <div style={branchGridStyle}>
            {branchSummaries.map(({ branch, summary }) => {
              const selected = branchFilter === branch.key;
              return (
                <button key={branch.key} type="button" onClick={() => setBranchFilter(branch.key)} style={branchCardStyle(selected, branch.accent)}>
                  <div style={branchLogoBoxStyle}>
                    {branch.logoUrl ? <img src={branch.logoUrl} alt={branch.name} style={branchLogoStyle} /> : <FaBuilding />}
                  </div>
                  <div style={{ minWidth: 0, textAlign: "left" }}>
                    <div style={branchNameStyle}>{branch.name}</div>
                    <div style={branchSubStyle}>{branch.region || "Branch details"}</div>
                    <div style={branchMiniGridStyle}>
                      <span>{summary.agents} agents</span>
                      <span>{summary.activeFiles} active files</span>
                      <span>{summary.monthListings} listings</span>
                      <span>{summary.monthDeals} deals</span>
                    </div>
                  </div>
                  <FaChevronRight style={{ color: selected ? "#fff" : "var(--color-primary)", flexShrink: 0 }} />
                </button>
              );
            })}
          </div>

          {activeBranch ? (
            <div style={branchDetailStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
                <div style={branchDetailLogoStyle}>{activeBranch.logoUrl ? <img src={activeBranch.logoUrl} alt={activeBranch.name} style={branchLogoStyle} /> : <FaBuilding />}</div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, color: "var(--text)", fontSize: 24 }}>{activeBranch.name}</h3>
                  <div style={{ color: "var(--muted)", marginTop: 6, fontWeight: 700 }}>{activeBranch.region || "Branch profile"}</div>
                  {activeBranch.notes ? <p style={{ margin: "10px 0 0", color: "var(--muted)", lineHeight: 1.55 }}>{activeBranch.notes}</p> : null}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {activeBranch.contactName ? <span style={smallPillStyle}>{activeBranch.contactName}</span> : null}
                {activeBranch.phone ? <span style={smallPillStyle}>{activeBranch.phone}</span> : null}
                {activeBranch.email ? <span style={smallPillStyle}>{activeBranch.email}</span> : null}
                {canEdit ? <button type="button" onClick={() => openBranchEditor(activeBranch)} style={secondaryButtonStyle}><FaUserEdit /> Edit branch</button> : null}
              </div>
            </div>
          ) : null}
        </section>

        <section style={contentPanelStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={sectionKickerStyle}><FaUsers /> Agent list</div>
              <h2 style={sectionTitleStyle}>{filteredAgents.length} agents shown</h2>
            </div>
            {canEdit ? <button type="button" onClick={openNewAgent} style={primaryButtonStyle}><FaPlus /> Add agent</button> : null}
          </div>

          {loading ? (
            <div style={emptyStateStyle}>Loading inhouse agents…</div>
          ) : filteredAgents.length === 0 ? (
            <div style={emptyStateStyle}>No agents matched the current filters.</div>
          ) : (
            <div style={tableWrapStyle}>
              <div style={tableHeaderStyle}>
                <div>Agent</div>
                <div>Branch</div>
                <div>Contact</div>
                <div>Active files</div>
                <div>{selectedMonthLabel} listings</div>
                <div>{selectedMonthLabel} deals</div>
                <div>Actions</div>
              </div>

              {filteredAgents.map((agent) => {
                const branch = branchMap[agent.branch] || normalizeBranch({ key: agent.branch });
                const stats = agent?.stats || {};
                const expanded = !!expandedAgentIds[agent._id];
                const listingsMonth = getMonthlyListingValue(agent, selectedMonth);
                const dealsMonth = getMonthlyDealValue(agent, selectedMonth, "all");
                const gbiDeals = getMonthlyDealValue(agent, selectedMonth, "gerhard_barnard_inc");
                const otherDeals = getMonthlyDealValue(agent, selectedMonth, "other");
                return (
                  <Fragment key={agent._id}>
                    <div style={tableRowStyle}>
                      <div style={agentCellStyle}>
                        {agent.profileImage ? <img src={agent.profileImage} alt={agent.fullName} style={avatarStyle} /> : <div style={avatarFallbackStyle(branch.accent)}>{getInitials(agent.fullName)}</div>}
                        <div style={{ minWidth: 0 }}>
                          <div style={strongTextStyle}>{agent.fullName || "—"}</div>
                          <div style={mutedTextStyle}>{agent.role || "Inhouse Agent"}</div>
                          {agent.area ? <div style={mutedTextStyle}>{agent.area}</div> : null}
                        </div>
                      </div>
                      <div><span style={branchPillStyle(branch.accent)}>{branch.name}</span></div>
                      <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
                        <span style={mutedTextStyle}>{agent.phone || "No phone"}</span>
                        <span style={mutedTextStyle}>{agent.email || "No email"}</span>
                      </div>
                      <div style={numberCellStyle}>{formatInteger(stats.activeFiles)}</div>
                      <div>
                        <div style={numberCellStyle}>{formatInteger(listingsMonth)}</div>
                        <div style={mutedTextStyle}>{formatInteger(stats.totalListings)} total</div>
                      </div>
                      <div>
                        <div style={numberCellStyle}>{formatInteger(dealsMonth)}</div>
                        <div style={mutedTextStyle}>{formatInteger(gbiDeals)} Gerhard Barnard Inc · {formatInteger(otherDeals)} other</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" onClick={() => setExpandedAgentIds((prev) => ({ ...prev, [agent._id]: !prev[agent._id] }))} style={compactButtonStyle}><FaEye /> {expanded ? "Hide" : "Details"}</button>
                        {canEdit ? <button type="button" onClick={() => openEditor(agent)} style={compactGoldButtonStyle}><FaUserEdit /> Edit</button> : null}
                      </div>
                    </div>
                    {expanded ? (
                      <div style={expandedRowStyle}>
                        <div style={miniPanelStyle}>
                          <div style={miniPanelTitleStyle}>Latest listing captures</div>
                          {sortListingsDesc(agent?.listingHistory).slice(0, 4).length ? sortListingsDesc(agent?.listingHistory).slice(0, 4).map((entry) => (
                            <div key={entry._id || `${entry.monthKey}-${entry.capturedAt}`} style={historyLineStyle}>
                              <span>{entry.monthLabel || formatMonthLabel(getListingMonthKey(entry))}</span>
                              <strong>{formatInteger(entry.capturedCount)}</strong>
                            </div>
                          )) : <div style={mutedTextStyle}>No listing captures yet.</div>}
                        </div>
                        <div style={miniPanelStyle}>
                          <div style={miniPanelTitleStyle}>Deals in selected month</div>
                          {getMonthlyDealEntries(agent, selectedMonth, "all").length ? getMonthlyDealEntries(agent, selectedMonth, "all").map((entry) => (
                            <div key={entry._id || `${entry.dealDate}-${entry.capturedAt}`} style={historyLineStyle}>
                              <span>{formatDate(entry.dealDate)} · {entry.transferAttorneyName || "Gerhard Barnard Inc"}</span>
                              <strong>{formatInteger(entry.count)}</strong>
                            </div>
                          )) : <div style={mutedTextStyle}>No deals captured for this month.</div>}
                        </div>
                        <div style={miniPanelStyle}>
                          <div style={miniPanelTitleStyle}>Notes</div>
                          <div style={{ ...mutedTextStyle, lineHeight: 1.6 }}>{agent.notes || "No agent notes captured."}</div>
                        </div>
                      </div>
                    ) : null}
                  </Fragment>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {editingBranch ? (
        <div style={overlayStyle}>
          <div style={branchModalStyle}>
            <ModalHeader title={editingBranch.isNew ? "Add branch" : "Edit branch"} kicker="Branch management" icon={<FaBuilding />} onClose={closeBranchEditor} />
            <div style={branchEditorGridStyle}>
              <div style={logoEditorStyle}>
                <div style={branchLogoPreviewStyle}>{branchState.logoUrl ? <img src={branchState.logoUrl} alt={branchState.name || "Branch logo"} style={branchLogoStyle} /> : <FaImage />}</div>
                <label style={uploadLabelStyle}>Upload branch logo<input type="file" accept="image/*" onChange={(event) => handleUploadImage(event, "branch")} hidden /></label>
                <Field label="Logo URL / uploaded logo data" value={branchState.logoUrl} onChange={(value) => setBranchState((prev) => ({ ...prev, logoUrl: value }))} placeholder="Paste a logo URL or upload a file" />
              </div>
              <div style={{ display: "grid", gap: 16 }}>
                <div style={fieldGridStyle}>
                  <Field label="Branch name" value={branchState.name} onChange={(value) => setBranchState((prev) => ({ ...prev, name: value }))} />
                  <Field label="Region" value={branchState.region} onChange={(value) => setBranchState((prev) => ({ ...prev, region: value }))} />
                  <Field label="Contact person" value={branchState.contactName} onChange={(value) => setBranchState((prev) => ({ ...prev, contactName: value }))} />
                  <Field label="Phone" value={branchState.phone} onChange={(value) => setBranchState((prev) => ({ ...prev, phone: value }))} />
                  <Field label="Email" value={branchState.email} onChange={(value) => setBranchState((prev) => ({ ...prev, email: value }))} />
                  <Field label="Sort order" type="number" value={branchState.sortOrder} onChange={(value) => setBranchState((prev) => ({ ...prev, sortOrder: value }))} />
                  <label style={{ display: "grid", gap: 8 }}>
                    <span style={fieldLabelStyle}>Accent colour</span>
                    <input type="color" value={branchState.accent || "#d2ac68"} onChange={(event) => setBranchState((prev) => ({ ...prev, accent: event.target.value }))} style={{ ...inputStyle, padding: 6, height: 48 }} />
                  </label>
                </div>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={fieldLabelStyle}>Branch notes</span>
                  <textarea value={branchState.notes} onChange={(event) => setBranchState((prev) => ({ ...prev, notes: event.target.value }))} style={textareaStyle} placeholder="Add useful branch notes for the team" />
                </label>
                <div style={modalActionsStyle}>
                  <button type="button" onClick={closeBranchEditor} style={secondaryButtonStyle}>Cancel</button>
                  <button type="button" onClick={handleSaveBranch} disabled={savingAction === "branch"} style={primaryButtonStyle}><FaSave /> {savingAction === "branch" ? "Saving…" : "Save branch"}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editingAgent ? (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <ModalHeader title={editingAgent.isNew ? "Add agent" : editState.fullName || "Edit agent"} kicker="Agent management" icon={<FaUserEdit />} onClose={closeEditor} />
            <div style={editorGridStyle}>
              <div style={{ display: "grid", gap: 18 }}>
                <div style={logoEditorStyle}>
                  {editState.profileImage ? <img src={editState.profileImage} alt={editState.fullName} style={profilePreviewStyle} /> : <div style={profilePreviewFallbackStyle}>{getInitials(editState.fullName)}</div>}
                  <label style={uploadLabelStyle}>Upload agent image<input type="file" accept="image/*" onChange={(event) => handleUploadImage(event, "agent")} hidden /></label>
                  {editState.profileImage ? <button type="button" onClick={() => setEditState((prev) => ({ ...prev, profileImage: "" }))} style={dangerOutlineButtonStyle}>Remove image</button> : null}
                  <Field label="Image URL / uploaded image data" value={editState.profileImage} onChange={(value) => setEditState((prev) => ({ ...prev, profileImage: value }))} placeholder="Paste a hosted image URL or upload a file" />
                </div>

                <div style={modalCardStyle}>
                  <div style={modalCardTitleStyle}>Totals setup</div>
                  <div style={fieldGridStyle}>
                    <Field label="Opening total listings" type="number" value={editState.openingTotalListings} onChange={(value) => setEditState((prev) => ({ ...prev, openingTotalListings: value }))} />
                    <Field label="Opening total deals" type="number" value={editState.openingTotalDeals} onChange={(value) => setEditState((prev) => ({ ...prev, openingTotalDeals: value }))} />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 18 }}>
                <div style={modalCardStyle}>
                  <div style={modalCardTitleStyle}>Agent profile</div>
                  <div style={fieldGridStyle}>
                    <Field label="Full name" value={editState.fullName} onChange={(value) => setEditState((prev) => ({ ...prev, fullName: value }))} />
                    <SelectField label="Branch" value={editState.branch} onChange={(value) => setEditState((prev) => ({ ...prev, branch: value }))} options={branchOptions.map((branch) => ({ value: branch.key, label: branch.name }))} />
                    <Field label="Role" value={editState.role} onChange={(value) => setEditState((prev) => ({ ...prev, role: value }))} />
                    <Field label="Area" value={editState.area} onChange={(value) => setEditState((prev) => ({ ...prev, area: value }))} />
                    <Field label="Phone" value={editState.phone} onChange={(value) => setEditState((prev) => ({ ...prev, phone: value }))} />
                    <Field label="Email" value={editState.email} onChange={(value) => setEditState((prev) => ({ ...prev, email: value }))} />
                    <Field label="Birthday" value={editState.birthday} onChange={(value) => setEditState((prev) => ({ ...prev, birthday: value }))} placeholder="DD/MM or full date" />
                    <Field label="Aliases" value={editState.aliasesText} onChange={(value) => setEditState((prev) => ({ ...prev, aliasesText: value }))} placeholder="Optional search names, comma separated" />
                  </div>
                  <label style={{ display: "grid", gap: 8, marginTop: 14 }}>
                    <span style={fieldLabelStyle}>Notes</span>
                    <textarea value={editState.notes} onChange={(event) => setEditState((prev) => ({ ...prev, notes: event.target.value }))} style={textareaStyle} placeholder="Helpful notes for the team" />
                  </label>
                  <div style={modalActionsStyle}>
                    <button type="button" onClick={closeEditor} style={secondaryButtonStyle}>Close</button>
                    <button type="button" onClick={handleSaveProfile} disabled={savingAction === "profile"} style={primaryButtonStyle}><FaSave /> {savingAction === "profile" ? "Saving…" : "Save profile"}</button>
                  </div>
                </div>

                {!editingAgent.isNew ? (
                  <div style={captureGridStyle}>
                    <div style={modalCardStyle}>
                      <div style={modalCardTitleStyle}>Monthly listing capture</div>
                      <div style={fieldGridStyle}>
                        <Field label="Capture month" type="date" value={editState.listingCapture.captureDate} onChange={(value) => setEditState((prev) => ({ ...prev, listingCapture: { ...prev.listingCapture, captureDate: value } }))} />
                        <Field label="Listing count" type="number" value={editState.listingCapture.capturedCount} onChange={(value) => setEditState((prev) => ({ ...prev, listingCapture: { ...prev.listingCapture, capturedCount: value } }))} />
                      </div>
                      <textarea value={editState.listingCapture.note} onChange={(event) => setEditState((prev) => ({ ...prev, listingCapture: { ...prev.listingCapture, note: event.target.value } }))} style={{ ...textareaStyle, marginTop: 12 }} placeholder="Optional note" />
                      <button type="button" onClick={handleSaveListingCapture} disabled={savingAction === "listingCapture"} style={{ ...primaryButtonStyle, marginTop: 12 }}><FaSave /> Save listing figure</button>
                    </div>

                    <div style={modalCardStyle}>
                      <div style={modalCardTitleStyle}>Deal capture</div>
                      <div style={fieldGridStyle}>
                        <Field label="Deal date" type="date" value={editState.dealCapture.dealDate} onChange={(value) => setEditState((prev) => ({ ...prev, dealCapture: { ...prev.dealCapture, dealDate: value } }))} />
                        <Field label="Deal count" type="number" value={editState.dealCapture.count} onChange={(value) => setEditState((prev) => ({ ...prev, dealCapture: { ...prev.dealCapture, count: value } }))} />
                        <SelectField label="Transfer attorney" value={editState.dealCapture.transferAttorneyType} onChange={(value) => setEditState((prev) => ({ ...prev, dealCapture: { ...prev.dealCapture, transferAttorneyType: value } }))} options={[{ value: "gerhard_barnard_inc", label: "Gerhard Barnard Inc" }, { value: "other", label: "Other attorney" }]} />
                        {editState.dealCapture.transferAttorneyType === "other" ? <Field label="Other attorney" value={editState.dealCapture.transferAttorneyName} onChange={(value) => setEditState((prev) => ({ ...prev, dealCapture: { ...prev.dealCapture, transferAttorneyName: value } }))} /> : null}
                      </div>
                      <textarea value={editState.dealCapture.note} onChange={(event) => setEditState((prev) => ({ ...prev, dealCapture: { ...prev.dealCapture, note: event.target.value } }))} style={{ ...textareaStyle, marginTop: 12 }} placeholder="Optional note" />
                      <button type="button" onClick={handleSaveDealCapture} disabled={savingAction === "dealCapture"} style={{ ...primaryButtonStyle, marginTop: 12 }}><FaSave /> Save deal</button>
                    </div>
                  </div>
                ) : null}

                {!editingAgent.isNew ? (
                  <div style={captureGridStyle}>
                    <div style={modalCardStyle}>
                      <div style={modalCardTitleStyle}>Listing history</div>
                      <HistoryList rows={modalListingHistory.map((entry) => ({ key: entry._id || `${entry.monthKey}-${entry.capturedAt}`, title: entry.monthLabel || formatMonthLabel(getListingMonthKey(entry)), meta: `${formatDate(entry.capturedAt)}${entry.note ? ` · ${entry.note}` : ""}`, value: entry.capturedCount, onDelete: canEdit ? () => handleDeleteListingHistory(entry._id) : null }))} emptyText="No listing captures have been saved for this agent yet." />
                    </div>
                    <div style={modalCardStyle}>
                      <div style={modalCardTitleStyle}>Deal history</div>
                      <HistoryList rows={modalDealHistory.map((entry) => ({ key: entry._id || `${entry.dealDate}-${entry.capturedAt}`, title: `${formatDate(entry.dealDate)} · ${entry.transferAttorneyName || "Gerhard Barnard Inc"}`, meta: entry.note || (entry.transferAttorneyType === "other" ? "Other attorney" : "Gerhard Barnard Inc"), value: entry.count, onDelete: canEdit ? () => handleDeleteDealHistory(entry._id) : null }))} emptyText="No deals have been saved for this agent yet." />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ModalHeader({ title, kicker, icon, onClose }) {
  return (
    <div style={modalHeaderStyle}>
      <div>
        <div style={modalKickerStyle}>{icon} {kicker}</div>
        <h2 style={{ margin: "10px 0 0", color: "var(--text)", fontSize: 28 }}>{title}</h2>
      </div>
      <button type="button" onClick={onClose} style={iconButtonStyle}><FaTimes /></button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={fieldLabelStyle}>{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} style={inputStyle} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={fieldLabelStyle}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function HistoryList({ rows, emptyText }) {
  if (!rows.length) return <div style={emptySmallStyle}>{emptyText}</div>;
  return (
    <div style={{ display: "grid", gap: 10, maxHeight: 320, overflowY: "auto", paddingRight: 4 }}>
      {rows.map((row) => (
        <div key={row.key} style={modalHistoryRowStyle}>
          <div style={{ minWidth: 0 }}>
            <div style={strongTextStyle}>{row.title}</div>
            <div style={mutedTextStyle}>{row.meta}</div>
          </div>
          <strong style={{ color: "var(--color-primary)", fontSize: 20 }}>{formatInteger(row.value)}</strong>
          {row.onDelete ? <button type="button" onClick={row.onDelete} style={dangerIconButtonStyle}><FaTrashAlt /></button> : null}
        </div>
      ))}
    </div>
  );
}

function filterButtonStyle(active) {
  return {
    border: active ? "1px solid rgba(210, 172, 104, 0.55)" : "1px solid rgba(20,42,79,0.08)",
    borderRadius: 999,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 900,
    color: active ? "#0b2a4a" : "var(--text)",
    background: active ? "linear-gradient(135deg, #f0c96f, #c6922f)" : "var(--surface)",
    boxShadow: active ? "0 10px 24px rgba(198, 146, 47, 0.22)" : "6px 6px 14px var(--shadow-lo), -6px -6px 14px var(--shadow-hi)",
  };
}

function branchCardStyle(selected, accent) {
  return {
    width: "100%",
    border: selected ? `1px solid ${accent}` : "1px solid rgba(20,42,79,0.08)",
    borderRadius: 22,
    padding: 14,
    display: "grid",
    gridTemplateColumns: "72px minmax(0, 1fr) auto",
    gap: 14,
    alignItems: "center",
    cursor: "pointer",
    textAlign: "left",
    background: selected ? `linear-gradient(135deg, ${accent}, #0b2a4a)` : "var(--surface)",
    color: selected ? "#fff" : "var(--text)",
    boxShadow: selected ? "0 18px 34px rgba(7,15,30,0.18)" : "9px 9px 20px var(--shadow-lo), -9px -9px 20px var(--shadow-hi)",
  };
}

function avatarFallbackStyle(accent) {
  return {
    width: 48,
    height: 48,
    borderRadius: 16,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: `linear-gradient(135deg, ${accent || "#d2ac68"}, #0b2a4a)`,
    color: "#fff",
    fontWeight: 900,
  };
}

function branchPillStyle(accent) {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 11px",
    borderRadius: 999,
    background: `${accent || "#d2ac68"}22`,
    color: "var(--text)",
    fontWeight: 900,
    fontSize: 12,
  };
}

const pageStyle = {
  minHeight: "100vh",
  padding: "22px 20px 56px",
  background: "radial-gradient(circle at top left, rgba(210, 172, 104, 0.10), transparent 22%), radial-gradient(circle at top right, rgba(30, 167, 255, 0.10), transparent 18%), var(--bg)",
};

const heroStyle = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 22,
  padding: "28px 30px",
  background: "linear-gradient(135deg, #082746 0%, #0f3458 48%, #071d35 100%)",
  boxShadow: "16px 16px 34px rgba(7,15,30,0.18), -12px -12px 24px rgba(255,255,255,0.52)",
  color: "#fff",
};

const heroPatternStyle = {
  position: "absolute",
  inset: 0,
  opacity: 0.24,
  background: "radial-gradient(circle at 70% 20%, rgba(210,172,104,0.42), transparent 0 1px, transparent 1px), repeating-radial-gradient(circle at 72% 0%, rgba(255,255,255,0.18) 0 1px, transparent 1px 18px)",
  pointerEvents: "none",
};

const heroContentStyle = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  gridTemplateColumns: "minmax(320px, 1fr) minmax(360px, 620px)",
  gap: 24,
  alignItems: "center",
};

const heroKickerStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "7px 12px",
  borderRadius: 999,
  background: "rgba(210,172,104,0.16)",
  color: "#f5d58d",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 1.2,
};

const heroTitleStyle = {
  margin: "16px 0 8px",
  maxWidth: 760,
  fontSize: "clamp(2rem, 3.1vw, 3.35rem)",
  lineHeight: 1.03,
  color: "#fff",
};

const heroTextStyle = {
  margin: 0,
  maxWidth: 720,
  color: "rgba(255,255,255,0.86)",
  lineHeight: 1.58,
  fontSize: 15,
  fontWeight: 600,
};

const heroControlPanelStyle = {
  display: "grid",
  gap: 14,
  justifyItems: "stretch",
};

const searchWrapStyle = { position: "relative" };
const searchIconStyle = { position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "#0b2a4a", zIndex: 1 };
const searchInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "15px 18px 15px 50px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.96)",
  color: "#0b2a4a",
  outline: "none",
  fontWeight: 800,
  boxShadow: "0 14px 30px rgba(0,0,0,0.18)",
};

const heroControlsGridStyle = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 };
const lightHeroButtonStyle = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  padding: "13px 14px",
  background: "rgba(255,255,255,0.10)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 900,
  boxShadow: "inset 4px 4px 12px rgba(0,0,0,0.18)",
};
const heroSelectStyle = { ...lightHeroButtonStyle, outline: "none" };
const goldHeroButtonStyle = {
  border: "none",
  borderRadius: 14,
  padding: "13px 16px",
  background: "linear-gradient(135deg, #f0c96f, #c6922f)",
  color: "#092946",
  cursor: "pointer",
  fontWeight: 900,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  boxShadow: "0 12px 26px rgba(198,146,47,0.28)",
};

const metricGridStyle = { marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 };
const metricCardStyle = {
  minHeight: 112,
  padding: 18,
  borderRadius: 22,
  background: "var(--surface)",
  boxShadow: "10px 10px 24px var(--shadow-lo), -10px -10px 24px var(--shadow-hi)",
  border: "1px solid rgba(20,42,79,0.08)",
};
const metricIconStyle = { width: 42, height: 42, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(210,172,104,0.14)", color: "var(--color-primary)", fontSize: 17 };
const metricValueStyle = { marginTop: 12, color: "var(--text)", fontSize: 30, fontWeight: 950, lineHeight: 1 };
const metricLabelStyle = { marginTop: 7, color: "var(--text)", fontSize: 14, fontWeight: 900 };
const metricDetailStyle = { marginTop: 6, color: "var(--muted)", fontSize: 12, fontWeight: 700 };

const contentPanelStyle = {
  marginTop: 20,
  padding: 18,
  borderRadius: 24,
  background: "var(--surface)",
  border: "1px solid rgba(20,42,79,0.08)",
  boxShadow: "12px 12px 28px var(--shadow-lo), -12px -12px 28px var(--shadow-hi)",
};
const sectionHeaderStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 };
const sectionKickerStyle = { display: "inline-flex", alignItems: "center", gap: 9, color: "var(--color-accent)", fontWeight: 900, letterSpacing: 0.7, textTransform: "uppercase", fontSize: 12 };
const sectionTitleStyle = { margin: "6px 0 0", color: "var(--text)", fontSize: 28, lineHeight: 1.1 };
const branchGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 14 };
const branchLogoBoxStyle = { width: 72, height: 58, borderRadius: 18, background: "rgba(255,255,255,0.78)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28)" };
const branchLogoStyle = { width: "100%", height: "100%", objectFit: "contain", display: "block" };
const branchNameStyle = { fontWeight: 950, fontSize: 17, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const branchSubStyle = { marginTop: 3, opacity: 0.75, fontWeight: 800, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const branchMiniGridStyle = { marginTop: 9, display: "flex", flexWrap: "wrap", gap: 7, fontSize: 11, fontWeight: 900, opacity: 0.86 };
const branchDetailStyle = { marginTop: 16, padding: 16, borderRadius: 22, background: "linear-gradient(135deg, rgba(210,172,104,0.10), rgba(255,255,255,0.55))", display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", border: "1px solid rgba(210,172,104,0.18)" };
const branchDetailLogoStyle = { ...branchLogoBoxStyle, width: 116, height: 86, background: "#fff" };
const smallPillStyle = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "9px 12px", background: "rgba(20,42,79,0.08)", color: "var(--text)", fontWeight: 900, fontSize: 12 };

const tableWrapStyle = { borderRadius: 20, overflowX: "auto", border: "1px solid rgba(20,42,79,0.08)", background: "rgba(255,255,255,0.45)" };
const tableHeaderStyle = { minWidth: 1120, display: "grid", gridTemplateColumns: "2.1fr 1fr 1.4fr 0.8fr 1fr 1fr 1.35fr", gap: 12, padding: "13px 16px", background: "#0b2a4a", color: "#fff", fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.45 };
const tableRowStyle = { minWidth: 1120, display: "grid", gridTemplateColumns: "2.1fr 1fr 1.4fr 0.8fr 1fr 1fr 1.35fr", gap: 12, alignItems: "center", padding: "13px 16px", borderBottom: "1px solid rgba(20,42,79,0.08)", color: "var(--text)", background: "rgba(255,255,255,0.76)" };
const agentCellStyle = { display: "flex", alignItems: "center", gap: 12, minWidth: 0 };
const avatarStyle = { width: 48, height: 48, borderRadius: 16, objectFit: "cover", flexShrink: 0 };
const strongTextStyle = { color: "var(--text)", fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const mutedTextStyle = { color: "var(--muted)", fontSize: 12, fontWeight: 750, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const numberCellStyle = { color: "var(--text)", fontWeight: 950, fontSize: 18 };
const expandedRowStyle = { minWidth: 1120, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, padding: 16, background: "rgba(20,42,79,0.035)", borderBottom: "1px solid rgba(20,42,79,0.08)" };
const miniPanelStyle = { padding: 14, borderRadius: 18, background: "rgba(255,255,255,0.72)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28)" };
const miniPanelTitleStyle = { marginBottom: 10, color: "var(--text)", fontWeight: 950 };
const historyLineStyle = { display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid rgba(20,42,79,0.06)", color: "var(--text)", fontSize: 13, fontWeight: 800 };
const emptyStateStyle = { padding: 28, borderRadius: 20, background: "rgba(255,255,255,0.62)", color: "var(--muted)", fontWeight: 900, textAlign: "center" };
const emptySmallStyle = { padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.6)", color: "var(--muted)", fontWeight: 800 };

const overlayStyle = { position: "fixed", inset: 0, padding: 20, background: "rgba(6, 15, 33, 0.42)", backdropFilter: "blur(8px)", zIndex: 9999, overflowY: "auto" };
const modalStyle = { width: "min(1320px, 100%)", margin: "28px auto", padding: 24, borderRadius: 30, background: "var(--bg)", boxShadow: "18px 18px 38px rgba(0,0,0,0.18), -18px -18px 38px rgba(255,255,255,0.45)" };
const branchModalStyle = { width: "min(1040px, 100%)", margin: "28px auto", padding: 24, borderRadius: 30, background: "var(--bg)", boxShadow: "18px 18px 38px rgba(0,0,0,0.18), -18px -18px 38px rgba(255,255,255,0.45)" };
const modalHeaderStyle = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, marginBottom: 20 };
const modalKickerStyle = { display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, background: "rgba(210,172,104,0.14)", color: "var(--color-primary)", fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.7 };
const iconButtonStyle = { width: 42, height: 42, borderRadius: 14, border: "none", background: "var(--surface)", color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "8px 8px 18px var(--shadow-lo), -8px -8px 18px var(--shadow-hi)" };
const editorGridStyle = { display: "grid", gridTemplateColumns: "minmax(260px, 360px) minmax(0, 1fr)", gap: 22 };
const branchEditorGridStyle = { display: "grid", gridTemplateColumns: "minmax(260px, 360px) minmax(0, 1fr)", gap: 22 };
const logoEditorStyle = { padding: 18, borderRadius: 24, background: "var(--surface)", boxShadow: "10px 10px 24px var(--shadow-lo), -10px -10px 24px var(--shadow-hi)", display: "grid", gap: 14 };
const branchLogoPreviewStyle = { width: "100%", height: 190, borderRadius: 22, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", color: "var(--muted)", fontSize: 36 };
const profilePreviewStyle = { width: 160, height: 160, borderRadius: 28, objectFit: "cover", justifySelf: "center", boxShadow: "12px 12px 24px rgba(0,0,0,0.12)" };
const profilePreviewFallbackStyle = { width: 160, height: 160, borderRadius: 28, justifySelf: "center", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46, fontWeight: 950, color: "#fff", background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" };
const modalCardStyle = { padding: 18, borderRadius: 22, background: "var(--surface)", boxShadow: "10px 10px 24px var(--shadow-lo), -10px -10px 24px var(--shadow-hi)" };
const modalCardTitleStyle = { marginBottom: 14, color: "var(--text)", fontWeight: 950, fontSize: 16 };
const fieldGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 };
const captureGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 };
const inputStyle = { width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: 16, border: "1px solid rgba(20,42,79,0.10)", outline: "none", background: "var(--surface)", color: "var(--text)", boxShadow: "inset 4px 4px 10px var(--shadow-lo), inset -4px -4px 10px var(--shadow-hi)", fontWeight: 700 };
const textareaStyle = { ...inputStyle, minHeight: 104, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 };
const fieldLabelStyle = { fontWeight: 900, color: "var(--text)", fontSize: 13 };
const uploadLabelStyle = { width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "12px 14px", borderRadius: 14, cursor: "pointer", background: "var(--surface)", color: "var(--color-primary)", fontWeight: 900, boxShadow: "8px 8px 18px var(--shadow-lo), -8px -8px 18px var(--shadow-hi)" };
const modalActionsStyle = { marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" };
const primaryButtonStyle = { border: "none", borderRadius: 16, padding: "13px 18px", background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))", color: "#fff", fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "10px 10px 24px rgba(20,42,79,0.22)" };
const secondaryButtonStyle = { border: "none", borderRadius: 16, padding: "13px 18px", background: "var(--surface)", color: "var(--text)", fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, boxShadow: "8px 8px 18px var(--shadow-lo), -8px -8px 18px var(--shadow-hi)" };
const compactButtonStyle = { border: "none", borderRadius: 13, padding: "10px 12px", background: "var(--surface)", color: "var(--text)", fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, boxShadow: "5px 5px 12px var(--shadow-lo), -5px -5px 12px var(--shadow-hi)" };
const compactGoldButtonStyle = { ...compactButtonStyle, background: "linear-gradient(135deg, #f0c96f, #c6922f)", color: "#0b2a4a" };
const dangerOutlineButtonStyle = { border: "1px solid rgba(239,68,68,0.22)", borderRadius: 14, padding: "11px 14px", background: "rgba(239,68,68,0.08)", color: "#b91c1c", cursor: "pointer", fontWeight: 900 };
const dangerIconButtonStyle = { border: "1px solid rgba(239,68,68,0.18)", borderRadius: 12, padding: "9px 10px", background: "rgba(239,68,68,0.08)", color: "#b91c1c", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
const modalHistoryRowStyle = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: 12, alignItems: "center", padding: "11px 12px", borderRadius: 16, background: "rgba(255,255,255,0.62)", border: "1px solid rgba(20,42,79,0.06)" };
const successStyle = { marginTop: 18, padding: "14px 18px", borderRadius: 18, background: "rgba(34, 197, 94, 0.12)", color: "#15803d", fontWeight: 900, boxShadow: "8px 8px 18px var(--shadow-lo), -8px -8px 18px var(--shadow-hi)" };
const errorStyle = { marginTop: 18, padding: "14px 18px", borderRadius: 18, background: "rgba(239, 68, 68, 0.12)", color: "#b91c1c", fontWeight: 900, boxShadow: "8px 8px 18px var(--shadow-lo), -8px -8px 18px var(--shadow-hi)" };
