import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaBalanceScale,
  FaBirthdayCake,
  FaBuilding,
  FaCalendarAlt,
  FaChartLine,
  FaChevronDown,
  FaChevronUp,
  FaEnvelope,
  FaFilter,
  FaFolderOpen,
  FaPhoneAlt,
  FaPlus,
  FaSave,
  FaSearch,
  FaStar,
  FaTimes,
  FaTrashAlt,
  FaUserEdit,
  FaUsers,
} from "react-icons/fa";

const BASE_URL = "https://case-tracking-backend.onrender.com";

const BRANCH_META = {
  pretoria: {
    label: "Pretoria",
    accent: "#1d4ed8",
    tint: "linear-gradient(135deg, rgba(29, 78, 216, 0.12), rgba(20, 42, 79, 0.06))",
    badgeBg: "rgba(29, 78, 216, 0.12)",
    badgeColor: "#1d4ed8",
    ring: "rgba(29, 78, 216, 0.18)",
  },
  waterberg: {
    label: "Waterberg",
    accent: "#1ea7ff",
    tint: "linear-gradient(135deg, rgba(30, 167, 255, 0.18), rgba(20, 42, 79, 0.08))",
    badgeBg: "rgba(30, 167, 255, 0.16)",
    badgeColor: "#0676bb",
    ring: "rgba(30, 167, 255, 0.22)",
  },
  vaal: {
    label: "Vaal",
    accent: "#6b7280",
    tint: "linear-gradient(135deg, rgba(107, 114, 128, 0.18), rgba(20, 42, 79, 0.05))",
    badgeBg: "rgba(107, 114, 128, 0.16)",
    badgeColor: "#4b5563",
    ring: "rgba(107, 114, 128, 0.24)",
  },
};

const BRANCH_ORDER = ["pretoria", "waterberg", "vaal"];
const WINDOW_OPTIONS = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
];

const DEFAULT_MANUAL_STATS = {
  activeFiles: "",
  listingsThisWeek: "",
  listingsThisMonth: "",
  dealsThisWeek: "",
  dealsThisMonth: "",
  dealsTotal: "",
};

function getAuthConfig() {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

function getTodayInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function safeNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function getInitials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((piece) => piece[0]?.toUpperCase() || "")
    .join("") || "AA";
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
  return new Intl.DateTimeFormat("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function createEmptyEditState() {
  return {
    _id: "",
    fullName: "",
    branch: "pretoria",
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

async function fileToDataUrl(file) {
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

  const maxSize = 360;
  const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));

  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.86);
}

function buildEditState(agent) {
  const manual = agent?.stats?.manual || {};

  return {
    _id: agent?._id || "",
    fullName: agent?.fullName || "",
    branch: agent?.branch || "pretoria",
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

function windowValue(agent, type, windowKey) {
  const stats = agent?.stats || {};
  if (type === "listings") {
    return safeNumber(windowKey === "week" ? stats.listingsThisWeek : stats.listingsThisMonth);
  }

  if (type === "gbiDeals") {
    return safeNumber(windowKey === "week" ? stats.dealsToGBIWeek : stats.dealsToGBIMonth);
  }

  if (type === "otherDeals") {
    return safeNumber(windowKey === "week" ? stats.dealsToOtherWeek : stats.dealsToOtherMonth);
  }

  if (type === "allDeals") {
    return safeNumber(windowKey === "week" ? stats.dealsThisWeek : stats.dealsThisMonth);
  }

  return 0;
}

function buildTopList(agents, selector) {
  return [...agents]
    .map((agent) => ({ agent, value: selector(agent) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return String(a.agent?.fullName || "").localeCompare(String(b.agent?.fullName || ""));
    })
    .slice(0, 3);
}

function StatCard({ label, value, icon, accent, footnote = "" }) {
  return (
    <div
      style={{
        minHeight: 116,
        padding: 18,
        borderRadius: 22,
        background: "var(--surface)",
        boxShadow: "10px 10px 24px var(--shadow-lo), -10px -10px 24px var(--shadow-hi)",
        border: `1px solid ${accent}18`,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 42,
          height: 42,
          borderRadius: 14,
          background: `${accent}18`,
          color: accent,
          fontSize: 18,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          marginTop: 14,
          fontSize: 30,
          fontWeight: 800,
          color: "var(--text)",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 6,
          color: "var(--muted)",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {label}
      </div>

      {footnote ? (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{footnote}</div>
      ) : null}
    </div>
  );
}

function AgentMetric({ label, value }) {
  return (
    <div
      style={{
        minHeight: 96,
        padding: 14,
        borderRadius: 18,
        background: "rgba(255,255,255,0.58)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.26), 6px 6px 16px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: 0.35,
          textTransform: "uppercase",
          color: "var(--muted)",
          fontWeight: 900,
          lineHeight: 1.3,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 30,
          fontWeight: 900,
          color: "var(--text)",
          lineHeight: 1,
        }}
      >
        {safeNumber(value)}
      </div>
    </div>
  );
}

function RankingCard({ title, accent, subtitle, rows }) {
  const topValue = rows[0]?.value || 0;

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 24,
        background: "var(--surface)",
        boxShadow: "12px 12px 28px var(--shadow-lo), -12px -12px 28px var(--shadow-hi)",
        border: `1px solid ${accent}18`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div style={{ color: "var(--text)", fontWeight: 900, fontSize: 17 }}>{title}</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{subtitle}</div>
        </div>

        <div
          style={{
            minWidth: 56,
            height: 56,
            borderRadius: 18,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${accent}18`,
            color: accent,
            fontWeight: 900,
            fontSize: 24,
          }}
        >
          {topValue}
        </div>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {rows.length ? (
          rows.map((row, index) => (
            <div
              key={`${row.agent?._id || row.agent?.fullName}-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 12,
                alignItems: "center",
                padding: "11px 12px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.55)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 12,
                  background: `${accent}20`,
                  color: accent,
                  fontWeight: 900,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {index + 1}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {row.agent?.fullName || "—"}
                </div>
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
                  {BRANCH_META[row.agent?.branch]?.label || "Branch not set"}
                </div>
              </div>

              <div style={{ fontWeight: 900, color: accent, fontSize: 18 }}>{row.value}</div>
            </div>
          ))
        ) : (
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              background: "rgba(255,255,255,0.52)",
              color: "var(--muted)",
              fontWeight: 700,
            }}
          >
            No captured results for the selected filters yet.
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryTable({ columns, rows, emptyText }) {
  if (!rows.length) {
    return (
      <div
        style={{
          padding: 16,
          borderRadius: 18,
          background: "rgba(255,255,255,0.56)",
          color: "var(--muted)",
          fontWeight: 700,
        }}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 20,
        overflow: "hidden",
        background: "rgba(255,255,255,0.64)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.24)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: columns.map((column) => column.width || "1fr").join(" "),
          gap: 12,
          padding: "12px 14px",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          fontWeight: 900,
          color: "var(--muted)",
          borderBottom: "1px solid rgba(20,42,79,0.08)",
        }}
      >
        {columns.map((column) => (
          <div key={column.key}>{column.label}</div>
        ))}
      </div>

      <div style={{ maxHeight: 280, overflowY: "auto" }}>
        {rows.map((row, rowIndex) => (
          <div
            key={row.key || rowIndex}
            style={{
              display: "grid",
              gridTemplateColumns: columns.map((column) => column.width || "1fr").join(" "),
              gap: 12,
              padding: "13px 14px",
              borderBottom: rowIndex === rows.length - 1 ? "none" : "1px solid rgba(20,42,79,0.08)",
              alignItems: "center",
              fontSize: 13,
              color: "var(--text)",
            }}
          >
            {columns.map((column) => (
              <div key={column.key} style={{ minWidth: 0 }}>
                {row[column.key]}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InhouseAgents() {
  const [agents, setAgents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [performanceWindow, setPerformanceWindow] = useState("week");
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingAgent, setEditingAgent] = useState(null);
  const [editState, setEditState] = useState(createEmptyEditState());
  const [expandedAgentIds, setExpandedAgentIds] = useState({});

  const canEdit = !!currentUser?.isAdmin;

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [agentsRes, userRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/inhouse-agents`, getAuthConfig()),
        axios.get(`${BASE_URL}/api/users/me`, getAuthConfig()),
      ]);

      const nextAgents = Array.isArray(agentsRes.data) ? agentsRes.data : [];
      setAgents(nextAgents);
      setCurrentUser(userRes.data || null);

      setEditingAgent((prev) => {
        if (!prev?._id) return prev;
        return nextAgents.find((agent) => agent._id === prev._id) || prev;
      });
    } catch (err) {
      console.error("Failed to load inhouse agents:", err);
      setError(err?.response?.data?.message || "Failed to load the inhouse agent portal.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const filteredAgents = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return agents.filter((agent) => {
      if (!BRANCH_META[agent.branch]) return false;
      if (branchFilter !== "all" && agent.branch !== branchFilter) return false;
      if (!needle) return true;

      const haystack = [
        agent.fullName,
        agent.email,
        agent.phone,
        agent.area,
        agent.role,
        BRANCH_META[agent.branch]?.label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [agents, branchFilter, search]);

  const totals = useMemo(() => {
    return filteredAgents.reduce(
      (acc, agent) => {
        const stats = agent?.stats || {};
        acc.totalAgents += 1;
        acc.activeFiles += safeNumber(stats.activeFiles);
        acc.totalListings += safeNumber(stats.totalListings);
        acc.totalDeals += safeNumber(stats.dealsTotal);
        acc.windowListings += windowValue(agent, "listings", performanceWindow);
        acc.windowDeals += windowValue(agent, "allDeals", performanceWindow);
        return acc;
      },
      {
        totalAgents: 0,
        activeFiles: 0,
        totalListings: 0,
        totalDeals: 0,
        windowListings: 0,
        windowDeals: 0,
      }
    );
  }, [filteredAgents, performanceWindow]);

  const groupedAgents = useMemo(() => {
    return BRANCH_ORDER.map((branch) => ({
      branch,
      meta: BRANCH_META[branch],
      agents: filteredAgents.filter((agent) => agent.branch === branch),
    })).filter((group) => group.agents.length > 0);
  }, [filteredAgents]);

  const leaderboards = useMemo(() => {
    return {
      listings: buildTopList(filteredAgents, (agent) => windowValue(agent, "listings", performanceWindow)),
      gbiDeals: buildTopList(filteredAgents, (agent) => windowValue(agent, "gbiDeals", performanceWindow)),
      otherDeals: buildTopList(filteredAgents, (agent) => windowValue(agent, "otherDeals", performanceWindow)),
    };
  }, [filteredAgents, performanceWindow]);

  const applyUpdatedAgent = useCallback((updatedAgent, options = {}) => {
    setAgents((prev) => prev.map((agent) => (agent._id === updatedAgent._id ? updatedAgent : agent)));
    setEditingAgent((prev) => (prev?._id === updatedAgent._id ? updatedAgent : prev));

    if (options.refreshEditState) {
      setEditState((prev) => ({
        ...buildEditState(updatedAgent),
        listingCapture: options.resetListingCapture
          ? { captureDate: getTodayInputValue(), capturedCount: "", note: "" }
          : prev.listingCapture,
        dealCapture: options.resetDealCapture
          ? {
              dealDate: getTodayInputValue(),
              count: "1",
              transferAttorneyType: "gerhard_barnard_inc",
              transferAttorneyName: "",
              note: "",
            }
          : prev.dealCapture,
      }));
    } else {
      setEditState((prev) => ({
        ...prev,
        ...(options.resetListingCapture
          ? { listingCapture: { captureDate: getTodayInputValue(), capturedCount: "", note: "" } }
          : null),
        ...(options.resetDealCapture
          ? {
              dealCapture: {
                dealDate: getTodayInputValue(),
                count: "1",
                transferAttorneyType: "gerhard_barnard_inc",
                transferAttorneyName: "",
                note: "",
              },
            }
          : null),
      }));
    }
  }, []);

  const openEditor = useCallback((agent) => {
    setEditingAgent(agent);
    setEditState(buildEditState(agent));
  }, []);

  const closeEditor = useCallback(() => {
    setEditingAgent(null);
    setEditState(createEmptyEditState());
  }, []);

  const toggleExpanded = useCallback((agentId) => {
    setExpandedAgentIds((prev) => ({
      ...prev,
      [agentId]: !prev[agentId],
    }));
  }, []);

  const handleUploadImage = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setEditState((prev) => ({
        ...prev,
        profileImage: dataUrl,
      }));
    } catch (err) {
      console.error("Image processing failed:", err);
      alert("The image could not be processed. Please try a different file.");
    } finally {
      event.target.value = "";
    }
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!editingAgent?._id) return;

    try {
      setSavingAction("profile");
      setError("");

      const payload = {
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
          activeFiles:
            editState.manualStats.activeFiles === "" ? null : Number(editState.manualStats.activeFiles),
          listingsThisWeek:
            editState.manualStats.listingsThisWeek === "" ? null : Number(editState.manualStats.listingsThisWeek),
          listingsThisMonth:
            editState.manualStats.listingsThisMonth === "" ? null : Number(editState.manualStats.listingsThisMonth),
          dealsThisWeek:
            editState.manualStats.dealsThisWeek === "" ? null : Number(editState.manualStats.dealsThisWeek),
          dealsThisMonth:
            editState.manualStats.dealsThisMonth === "" ? null : Number(editState.manualStats.dealsThisMonth),
          dealsTotal:
            editState.manualStats.dealsTotal === "" ? null : Number(editState.manualStats.dealsTotal),
        },
      };

      const res = await axios.put(
        `${BASE_URL}/api/inhouse-agents/${editingAgent._id}`,
        payload,
        getAuthConfig()
      );

      applyUpdatedAgent(res.data, { refreshEditState: true });
      setSuccessMessage(`${payload.fullName} updated successfully.`);
    } catch (err) {
      console.error("Failed to save agent:", err);
      setError(err?.response?.data?.message || "Failed to save the inhouse agent profile.");
    } finally {
      setSavingAction("");
    }
  }, [applyUpdatedAgent, editState, editingAgent]);

  const handleSaveListingCapture = useCallback(async () => {
    if (!editingAgent?._id) return;

    try {
      setSavingAction("listingCapture");
      setError("");

      const payload = {
        captureDate: editState.listingCapture.captureDate,
        capturedCount: Number(editState.listingCapture.capturedCount || 0),
        note: editState.listingCapture.note.trim(),
      };

      const res = await axios.post(
        `${BASE_URL}/api/inhouse-agents/${editingAgent._id}/listing-capture`,
        payload,
        getAuthConfig()
      );

      applyUpdatedAgent(res.data, { resetListingCapture: true });
      setSuccessMessage("Weekly listing capture saved.");
    } catch (err) {
      console.error("Failed to save listing capture:", err);
      setError(err?.response?.data?.message || "Failed to save the weekly listing capture.");
    } finally {
      setSavingAction("");
    }
  }, [applyUpdatedAgent, editState.listingCapture, editingAgent]);

  const handleSaveDealCapture = useCallback(async () => {
    if (!editingAgent?._id) return;

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

      const res = await axios.post(
        `${BASE_URL}/api/inhouse-agents/${editingAgent._id}/deal-capture`,
        payload,
        getAuthConfig()
      );

      applyUpdatedAgent(res.data, { resetDealCapture: true });
      setSuccessMessage("Deal capture saved.");
    } catch (err) {
      console.error("Failed to save deal capture:", err);
      setError(err?.response?.data?.message || "Failed to save the deal capture.");
    } finally {
      setSavingAction("");
    }
  }, [applyUpdatedAgent, editState.dealCapture, editingAgent]);

  const handleDeleteListingHistory = useCallback(
    async (entryId) => {
      if (!editingAgent?._id || !entryId) return;
      const confirmed = window.confirm("Remove this weekly listing capture?");
      if (!confirmed) return;

      try {
        setSavingAction(`delete-listing-${entryId}`);
        setError("");

        const res = await axios.delete(
          `${BASE_URL}/api/inhouse-agents/${editingAgent._id}/listing-history/${entryId}`,
          getAuthConfig()
        );

        applyUpdatedAgent(res.data);
        setSuccessMessage("Listing capture removed.");
      } catch (err) {
        console.error("Failed to delete listing history:", err);
        setError(err?.response?.data?.message || "Failed to remove the listing history entry.");
      } finally {
        setSavingAction("");
      }
    },
    [applyUpdatedAgent, editingAgent]
  );

  const handleDeleteDealHistory = useCallback(
    async (entryId) => {
      if (!editingAgent?._id || !entryId) return;
      const confirmed = window.confirm("Remove this deal entry?");
      if (!confirmed) return;

      try {
        setSavingAction(`delete-deal-${entryId}`);
        setError("");

        const res = await axios.delete(
          `${BASE_URL}/api/inhouse-agents/${editingAgent._id}/deal-history/${entryId}`,
          getAuthConfig()
        );

        applyUpdatedAgent(res.data);
        setSuccessMessage("Deal history entry removed.");
      } catch (err) {
        console.error("Failed to delete deal history:", err);
        setError(err?.response?.data?.message || "Failed to remove the deal history entry.");
      } finally {
        setSavingAction("");
      }
    },
    [applyUpdatedAgent, editingAgent]
  );

  const modalListingHistory = useMemo(() => sortListingsDesc(editingAgent?.listingHistory), [editingAgent]);
  const modalDealHistory = useMemo(() => sortDealsDesc(editingAgent?.dealHistory), [editingAgent]);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px 20px 56px",
        background:
          "radial-gradient(circle at top left, rgba(210, 172, 104, 0.10), transparent 22%), radial-gradient(circle at top right, rgba(30, 167, 255, 0.10), transparent 18%), var(--bg)",
      }}
    >
      <div style={{ maxWidth: 1480, margin: "0 auto" }}>
        <section
          style={{
            padding: 28,
            borderRadius: 30,
            background: "var(--surface)",
            boxShadow: "16px 16px 36px var(--shadow-lo), -16px -16px 36px var(--shadow-hi)",
            border: "1px solid color-mix(in srgb, var(--color-accent) 16%, transparent)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: 24,
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: "rgba(210, 172, 104, 0.14)",
                  color: "var(--color-primary)",
                  fontWeight: 800,
                  letterSpacing: 0.3,
                }}
              >
                <FaUsers />
                All About Homes — Inhouse Agent Portal
              </div>

              <h1
                style={{
                  margin: "18px 0 12px",
                  fontSize: "clamp(2rem, 3vw, 3.2rem)",
                  lineHeight: 1.05,
                  color: "var(--text)",
                }}
              >
                Track the agents that win listings, route deals, and move work into the firm.
              </h1>

              <p
                style={{
                  margin: 0,
                  maxWidth: 820,
                  color: "var(--muted)",
                  lineHeight: 1.7,
                  fontSize: 15,
                }}
              >
                Management is removed from the live grid, weekly listing captures now roll into overall totals, and every captured deal stays in history with a clear attorney destination.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                  marginTop: 22,
                }}
              >
                <StatCard
                  label="Visible agents"
                  value={totals.totalAgents}
                  icon={<FaUsers />}
                  accent="var(--color-primary)"
                />
                <StatCard
                  label="Active files"
                  value={totals.activeFiles}
                  icon={<FaFolderOpen />}
                  accent="var(--color-accent)"
                />
                <StatCard
                  label="Overall listings"
                  value={totals.totalListings}
                  icon={<FaChartLine />}
                  accent="#1ea7ff"
                  footnote="Opening totals plus the latest weekly capture per agent."
                />
                <StatCard
                  label="Overall deals"
                  value={totals.totalDeals}
                  icon={<FaBalanceScale />}
                  accent="#6b7280"
                  footnote={`Showing ${performanceWindow === "week" ? totals.windowDeals : totals.windowDeals} deal${totals.windowDeals === 1 ? "" : "s"} ${performanceWindow === "week" ? "this week" : "this month"}.`}
                />
              </div>
            </div>

            <div
              style={{
                borderRadius: 26,
                padding: 22,
                background: "linear-gradient(135deg, rgba(20, 42, 79, 0.96), rgba(20, 42, 79, 0.76))",
                color: "#fff",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 12px 12px 26px rgba(7, 15, 30, 0.26)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.1, opacity: 0.82 }}>
                LIVE FILTERS
              </div>

              <div style={{ marginTop: 18, position: "relative" }}>
                <FaSearch
                  style={{
                    position: "absolute",
                    left: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "rgba(255,255,255,0.72)",
                  }}
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email, phone, area or branch"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "14px 16px 14px 46px",
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    outline: "none",
                    boxShadow:
                      "inset 5px 5px 12px rgba(0,0,0,0.22), inset -5px -5px 12px rgba(255,255,255,0.03)",
                  }}
                />
              </div>

              <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 10 }}>
                <FaFilter />
                <span style={{ fontWeight: 800 }}>Branch focus</span>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setBranchFilter("all")}
                  style={filterPill(branchFilter === "all", "var(--color-accent)")}
                >
                  All branches
                </button>

                {BRANCH_ORDER.map((branch) => (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => setBranchFilter(branch)}
                    style={filterPill(branchFilter === branch, BRANCH_META[branch].accent)}
                  >
                    {BRANCH_META[branch].label}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 10 }}>
                <FaCalendarAlt />
                <span style={{ fontWeight: 800 }}>Performance window</span>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
                {WINDOW_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setPerformanceWindow(option.key)}
                    style={filterPill(performanceWindow === option.key, "#1ea7ff")}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div
                style={{
                  marginTop: 22,
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.9 }}>Data capture rules</div>

                <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, opacity: 0.88 }}>
                  Weekly listing captures update the latest snapshot for that week. Total listings use the opening total plus the latest saved weekly figure. Deal captures are stored permanently and split between Gerhard Barnard Inc and other attorneys.
                </div>
              </div>
            </div>
          </div>
        </section>

        {successMessage ? (
          <div
            style={{
              marginTop: 18,
              padding: "14px 18px",
              borderRadius: 18,
              background: "rgba(34, 197, 94, 0.12)",
              color: "#15803d",
              fontWeight: 800,
              boxShadow: "8px 8px 18px var(--shadow-lo), -8px -8px 18px var(--shadow-hi)",
            }}
          >
            {successMessage}
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              marginTop: 18,
              padding: "14px 18px",
              borderRadius: 18,
              background: "rgba(239, 68, 68, 0.12)",
              color: "#b91c1c",
              fontWeight: 800,
              boxShadow: "8px 8px 18px var(--shadow-lo), -8px -8px 18px var(--shadow-hi)",
            }}
          >
            {error}
          </div>
        ) : null}

        {!loading && filteredAgents.length > 0 ? (
          <section
            style={{
              marginTop: 26,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 18,
            }}
          >
            <RankingCard
              title="Most listings"
              subtitle={`Top performers ${performanceWindow === "week" ? "this week" : "this month"}.`}
              accent="#1d4ed8"
              rows={leaderboards.listings}
            />
            <RankingCard
              title="Deals to Gerhard Barnard Inc"
              subtitle={`Top agents sending work to the firm ${performanceWindow === "week" ? "this week" : "this month"}.`}
              accent="var(--color-accent)"
              rows={leaderboards.gbiDeals}
            />
            <RankingCard
              title="Deals to other attorneys"
              subtitle={`Outgoing work captured ${performanceWindow === "week" ? "this week" : "this month"}.`}
              accent="#6b7280"
              rows={leaderboards.otherDeals}
            />
          </section>
        ) : null}

        {loading ? (
          <div
            style={{
              marginTop: 26,
              padding: 28,
              borderRadius: 28,
              background: "var(--surface)",
              boxShadow: "12px 12px 28px var(--shadow-lo), -12px -12px 28px var(--shadow-hi)",
              textAlign: "center",
              color: "var(--muted)",
              fontWeight: 800,
            }}
          >
            Loading the inhouse agent dashboard…
          </div>
        ) : groupedAgents.length === 0 ? (
          <div
            style={{
              marginTop: 26,
              padding: 28,
              borderRadius: 28,
              background: "var(--surface)",
              boxShadow: "12px 12px 28px var(--shadow-lo), -12px -12px 28px var(--shadow-hi)",
              textAlign: "center",
              color: "var(--muted)",
              fontWeight: 800,
            }}
          >
            No agents matched the current filters.
          </div>
        ) : (
          groupedAgents.map((group) => (
            <section key={group.branch} style={{ marginTop: 28 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 18,
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 30,
                      color: "var(--text)",
                    }}
                  >
                    {group.meta.label}
                  </h2>

                  <div
                    style={{
                      marginTop: 8,
                      display: "inline-flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={branchStatBadge(group.meta)}>{group.agents.length} agents</span>
                    <span style={branchStatBadge(group.meta)}>
                      {group.agents.reduce(
                        (sum, agent) => sum + windowValue(agent, "listings", performanceWindow),
                        0
                      )}{" "}
                      listings {performanceWindow === "week" ? "this week" : "this month"}
                    </span>
                    <span style={branchStatBadge(group.meta)}>
                      {group.agents.reduce(
                        (sum, agent) => sum + windowValue(agent, "allDeals", performanceWindow),
                        0
                      )}{" "}
                      deals {performanceWindow === "week" ? "this week" : "this month"}
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 360px))",
                  justifyContent: "center",
                  gap: 20,
                }}
              >
                {group.agents.map((agent) => {
                  const stats = agent?.stats || {};
                  const expanded = !!expandedAgentIds[agent._id];
                  const listingHistory = sortListingsDesc(agent?.listingHistory).slice(0, 4);
                  const dealHistory = sortDealsDesc(agent?.dealHistory).slice(0, 5);

                  return (
                    <article
                      key={agent._id}
                      style={{
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: 28,
                        padding: 20,
                        background: group.meta.tint,
                        boxShadow: "14px 14px 28px var(--shadow-lo), -14px -14px 28px var(--shadow-hi)",
                        border: `1px solid ${group.meta.ring}`,
                        minHeight: expanded ? "auto" : 540,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 5,
                          background: `linear-gradient(90deg, ${group.meta.accent}, var(--color-primary))`,
                          opacity: 0.95,
                        }}
                      />

                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.26), rgba(255,255,255,0.04))",
                          pointerEvents: "none",
                        }}
                      />

                      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                            {agent.profileImage ? (
                              <img
                                src={agent.profileImage}
                                alt={agent.fullName}
                                style={{
                                  width: 72,
                                  height: 72,
                                  borderRadius: 22,
                                  objectFit: "cover",
                                  flexShrink: 0,
                                  boxShadow:
                                    "inset 0 1px 0 rgba(255,255,255,0.28), 8px 8px 18px rgba(0,0,0,0.12)",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 72,
                                  height: 72,
                                  borderRadius: 22,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 900,
                                  fontSize: 22,
                                  letterSpacing: 0.8,
                                  color: "#fff",
                                  flexShrink: 0,
                                  background: `linear-gradient(135deg, ${group.meta.accent}, var(--color-primary))`,
                                  boxShadow: "8px 8px 18px rgba(0,0,0,0.14)",
                                }}
                              >
                                {getInitials(agent.fullName)}
                              </div>
                            )}

                            <div style={{ minWidth: 0 }}>
                              <h3
                                style={{
                                  margin: 0,
                                  fontSize: 21,
                                  lineHeight: 1.18,
                                  color: "var(--text)",
                                  wordBreak: "break-word",
                                }}
                              >
                                {agent.fullName}
                              </h3>

                              <div
                                style={{
                                  marginTop: 8,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span style={branchBadge(group.meta)}>{group.meta.label}</span>
                                {agent.area ? <span style={miniMetaBadge}>{agent.area}</span> : null}
                                {agent.featured ? (
                                  <span
                                    style={{
                                      ...miniMetaBadge,
                                      background: "rgba(210, 172, 104, 0.16)",
                                      color: "#8a641a",
                                    }}
                                  >
                                    <FaStar /> Featured
                                  </span>
                                ) : null}
                              </div>

                              <div
                                style={{
                                  marginTop: 8,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span style={miniMetaBadge}>
                                  {stats.hasManualOverrides ? "Portal-managed data" : "Case-match fallback"}
                                </span>
                                <span style={miniMetaBadge}>Active files {safeNumber(stats.activeFiles)}</span>
                                <span style={miniMetaBadge}>Total deals {safeNumber(stats.dealsTotal)}</span>
                              </div>
                            </div>
                          </div>

                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => openEditor(agent)}
                              style={{
                                border: "none",
                                borderRadius: 16,
                                width: 46,
                                height: 46,
                                flexShrink: 0,
                                background: "var(--surface)",
                                color: "var(--color-primary)",
                                boxShadow:
                                  "8px 8px 18px var(--shadow-lo), -8px -8px 18px var(--shadow-hi)",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 16,
                              }}
                              aria-label={`Edit ${agent.fullName}`}
                              title={`Edit ${agent.fullName}`}
                            >
                              <FaUserEdit />
                            </button>
                          ) : null}
                        </div>

                        <div
                          style={{
                            marginTop: 10,
                            color: "var(--muted)",
                            fontWeight: 700,
                            fontSize: 13,
                            minHeight: 18,
                          }}
                        >
                          {agent.role || "Inhouse Agent"}
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                            gap: 12,
                            marginTop: 18,
                          }}
                        >
                          <AgentMetric label="Week listings" value={stats.listingsThisWeek} />
                          <AgentMetric label="Month listings" value={stats.listingsThisMonth} />
                          <AgentMetric label="Total listings" value={stats.totalListings} />
                          <AgentMetric label="Week deals" value={stats.dealsThisWeek} />
                          <AgentMetric label="Month deals" value={stats.dealsThisMonth} />
                          <AgentMetric label="Total deals" value={stats.dealsTotal} />
                        </div>

                        <div
                          style={{
                            marginTop: 14,
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={miniMetaBadge}>GBI total {safeNumber(stats.dealsToGBITotal)}</span>
                          <span style={miniMetaBadge}>Other total {safeNumber(stats.dealsToOtherTotal)}</span>
                          <span style={miniMetaBadge}>Opening listings {safeNumber(stats.openingTotalListings)}</span>
                        </div>

                        <div
                          style={{
                            marginTop: 16,
                            display: "grid",
                            gridTemplateColumns: canEdit ? "1fr auto" : "1fr",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => toggleExpanded(agent._id)}
                            style={{
                              border: "none",
                              borderRadius: 16,
                              padding: "13px 16px",
                              background: "rgba(255,255,255,0.62)",
                              color: "var(--text)",
                              fontWeight: 800,
                              cursor: "pointer",
                              boxShadow:
                                "inset 0 1px 0 rgba(255,255,255,0.28), 6px 6px 16px rgba(0,0,0,0.05)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 10,
                            }}
                          >
                            {expanded ? <FaChevronUp /> : <FaChevronDown />}
                            {expanded ? "Hide details" : "View details"}
                          </button>

                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => openEditor(agent)}
                              style={{
                                border: "none",
                                borderRadius: 16,
                                padding: "13px 16px",
                                background: "var(--surface)",
                                color: "var(--color-primary)",
                                fontWeight: 800,
                                cursor: "pointer",
                                boxShadow:
                                  "8px 8px 18px var(--shadow-lo), -8px -8px 18px var(--shadow-hi)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                justifyContent: "center",
                              }}
                            >
                              <FaUserEdit />
                              Edit
                            </button>
                          ) : null}
                        </div>

                        <div
                          style={{
                            overflow: "hidden",
                            maxHeight: expanded ? 800 : 0,
                            opacity: expanded ? 1 : 0,
                            transition: "max-height 260ms ease, opacity 180ms ease, margin-top 180ms ease",
                            marginTop: expanded ? 16 : 0,
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                              gap: 12,
                            }}
                          >
                            <InfoRow icon={<FaEnvelope />} text={agent.email || "No email set"} />
                            <InfoRow icon={<FaPhoneAlt />} text={agent.phone || "No phone set"} />
                            <InfoRow icon={<FaBirthdayCake />} text={agent.birthday || "Birthday not set"} />
                            <InfoRow
                              icon={<FaBuilding />}
                              text={`${safeNumber(stats.matchedMatterCount)} matched matters`}
                            />
                          </div>

                          <div
                            style={{
                              marginTop: 14,
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                              gap: 12,
                            }}
                          >
                            <div
                              style={{
                                padding: 14,
                                borderRadius: 18,
                                background: "rgba(255,255,255,0.54)",
                              }}
                            >
                              <div style={{ fontWeight: 900, color: "var(--text)", marginBottom: 10 }}>
                                Recent weekly listings
                              </div>
                              <div style={{ display: "grid", gap: 8 }}>
                                {listingHistory.length ? (
                                  listingHistory.map((entry) => (
                                    <div
                                      key={entry._id || entry.weekKey}
                                      style={{
                                        padding: "10px 12px",
                                        borderRadius: 14,
                                        background: "rgba(255,255,255,0.55)",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 12,
                                      }}
                                    >
                                      <div>
                                        <div style={{ fontWeight: 800, color: "var(--text)", fontSize: 13 }}>
                                          {entry.weekLabel || formatDate(entry.periodStart)}
                                        </div>
                                        {entry.note ? (
                                          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{entry.note}</div>
                                        ) : null}
                                      </div>
                                      <div style={{ fontWeight: 900, color: group.meta.accent, fontSize: 18 }}>
                                        {safeNumber(entry.capturedCount)}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div style={{ color: "var(--muted)", fontWeight: 700 }}>No weekly listing history captured yet.</div>
                                )}
                              </div>
                            </div>

                            <div
                              style={{
                                padding: 14,
                                borderRadius: 18,
                                background: "rgba(255,255,255,0.54)",
                              }}
                            >
                              <div style={{ fontWeight: 900, color: "var(--text)", marginBottom: 10 }}>
                                Recent deal history
                              </div>
                              <div style={{ display: "grid", gap: 8 }}>
                                {dealHistory.length ? (
                                  dealHistory.map((entry) => (
                                    <div
                                      key={entry._id || `${entry.dealDate}-${entry.transferAttorneyType}`}
                                      style={{
                                        padding: "10px 12px",
                                        borderRadius: 14,
                                        background: "rgba(255,255,255,0.55)",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 12,
                                      }}
                                    >
                                      <div>
                                        <div style={{ fontWeight: 800, color: "var(--text)", fontSize: 13 }}>
                                          {formatDate(entry.dealDate)}
                                        </div>
                                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                                          {entry.transferAttorneyName || "Gerhard Barnard Inc"}
                                        </div>
                                      </div>
                                      <div style={{ fontWeight: 900, color: "var(--color-primary)", fontSize: 18 }}>
                                        {safeNumber(entry.count)}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div style={{ color: "var(--muted)", fontWeight: 700 }}>No deal history captured yet.</div>
                                )}
                              </div>
                            </div>
                          </div>

                          {agent.notes ? (
                            <div
                              style={{
                                marginTop: 14,
                                padding: 16,
                                borderRadius: 18,
                                background: "rgba(255,255,255,0.5)",
                                color: "var(--muted)",
                                fontSize: 14,
                                lineHeight: 1.65,
                              }}
                            >
                              {agent.notes}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {editingAgent ? (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 18,
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 999,
                    background: BRANCH_META[editState.branch]?.badgeBg || "rgba(29, 78, 216, 0.12)",
                    color: BRANCH_META[editState.branch]?.badgeColor || "#1d4ed8",
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  <FaUserEdit />
                  Edit agent profile
                </div>

                <h2 style={{ margin: "14px 0 0", color: "var(--text)" }}>
                  {editState.fullName || "Edit agent"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: 22,
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                gap: 24,
                marginTop: 22,
              }}
            >
              <div style={{ display: "grid", gap: 18 }}>
                <div
                  style={{
                    padding: 20,
                    borderRadius: 24,
                    background: BRANCH_META[editState.branch]?.tint || "rgba(255,255,255,0.5)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {editState.profileImage ? (
                      <img
                        src={editState.profileImage}
                        alt={editState.fullName}
                        style={{
                          width: 150,
                          height: 150,
                          borderRadius: 28,
                          objectFit: "cover",
                          boxShadow: "12px 12px 24px rgba(0,0,0,0.12)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 150,
                          height: 150,
                          borderRadius: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 44,
                          fontWeight: 900,
                          color: "#fff",
                          background: `linear-gradient(135deg, ${BRANCH_META[editState.branch]?.accent || "#1d4ed8"}, var(--color-primary))`,
                        }}
                      >
                        {getInitials(editState.fullName)}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <label style={uploadLabelStyle}>
                      Upload image
                      <input type="file" accept="image/*" onChange={handleUploadImage} hidden />
                    </label>

                    {editState.profileImage ? (
                      <button
                        type="button"
                        onClick={() => setEditState((prev) => ({ ...prev, profileImage: "" }))}
                        style={{
                          width: "100%",
                          marginTop: 10,
                          borderRadius: 14,
                          border: "1px solid rgba(239, 68, 68, 0.24)",
                          padding: "11px 14px",
                          background: "rgba(239, 68, 68, 0.08)",
                          color: "#b91c1c",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Remove current image
                      </button>
                    ) : null}
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <label style={fieldLabelStyle}>Profile image URL / data</label>
                    <textarea
                      value={editState.profileImage}
                      onChange={(event) =>
                        setEditState((prev) => ({ ...prev, profileImage: event.target.value }))
                      }
                      rows={4}
                      style={textareaStyle}
                      placeholder="Paste a hosted image URL or keep the uploaded image"
                    />
                  </div>
                </div>

                <div
                  style={{
                    padding: 18,
                    borderRadius: 22,
                    background: "var(--surface)",
                    boxShadow: "10px 10px 24px var(--shadow-lo), -10px -10px 24px var(--shadow-hi)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 900,
                      color: "var(--text)",
                      marginBottom: 14,
                    }}
                  >
                    Totals setup
                  </div>

                  <div style={fieldGridStyle}>
                    <Field
                      label="Opening total listings"
                      type="number"
                      value={editState.openingTotalListings}
                      onChange={(value) => setEditState((prev) => ({ ...prev, openingTotalListings: value }))}
                    />
                    <Field
                      label="Opening total deals"
                      type="number"
                      value={editState.openingTotalDeals}
                      onChange={(value) => setEditState((prev) => ({ ...prev, openingTotalDeals: value }))}
                    />
                    <Field
                      label="Active files override"
                      type="number"
                      value={editState.manualStats.activeFiles}
                      onChange={(value) =>
                        setEditState((prev) => ({
                          ...prev,
                          manualStats: {
                            ...prev.manualStats,
                            activeFiles: value,
                          },
                        }))
                      }
                    />
                  </div>

                  <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                    Weekly listing totals use the opening total plus the latest weekly capture. Historical deal totals use the opening deals plus every saved deal capture.
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 18 }}>
                <div style={fieldGridStyle}>
                  <Field
                    label="Full name"
                    value={editState.fullName}
                    onChange={(value) => setEditState((prev) => ({ ...prev, fullName: value }))}
                  />

                  <SelectField
                    label="Branch"
                    value={editState.branch}
                    onChange={(value) => setEditState((prev) => ({ ...prev, branch: value }))}
                    options={BRANCH_ORDER.map((branch) => ({
                      value: branch,
                      label: BRANCH_META[branch].label,
                    }))}
                  />

                  <Field
                    label="Role"
                    value={editState.role}
                    onChange={(value) => setEditState((prev) => ({ ...prev, role: value }))}
                  />

                  <Field
                    label="Area"
                    value={editState.area}
                    onChange={(value) => setEditState((prev) => ({ ...prev, area: value }))}
                  />

                  <Field
                    label="Email"
                    value={editState.email}
                    onChange={(value) => setEditState((prev) => ({ ...prev, email: value }))}
                    type="email"
                  />

                  <Field
                    label="Phone"
                    value={editState.phone}
                    onChange={(value) => setEditState((prev) => ({ ...prev, phone: value }))}
                  />

                  <Field
                    label="Birthday"
                    value={editState.birthday}
                    onChange={(value) => setEditState((prev) => ({ ...prev, birthday: value }))}
                    placeholder="e.g. 5 Aug"
                  />

                  <Field
                    label="Aliases"
                    value={editState.aliasesText}
                    onChange={(value) => setEditState((prev) => ({ ...prev, aliasesText: value }))}
                    placeholder="Comma separated aliases"
                  />
                </div>

                <div
                  style={{
                    padding: 18,
                    borderRadius: 22,
                    background: "var(--surface)",
                    boxShadow: "10px 10px 24px var(--shadow-lo), -10px -10px 24px var(--shadow-hi)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text)" }}>Weekly listing capture</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                        Save one listing snapshot per week. Saving again for the same week updates that week instead of duplicating it.
                      </div>
                    </div>
                    <div style={{ fontWeight: 900, color: "var(--color-primary)", fontSize: 20 }}>
                      {safeNumber(editingAgent?.stats?.totalListings)}
                    </div>
                  </div>

                  <div style={{ ...fieldGridStyle, marginTop: 14 }}>
                    <Field
                      label="Week date"
                      type="date"
                      value={editState.listingCapture.captureDate}
                      onChange={(value) =>
                        setEditState((prev) => ({
                          ...prev,
                          listingCapture: { ...prev.listingCapture, captureDate: value },
                        }))
                      }
                    />
                    <Field
                      label="Listings for that week"
                      type="number"
                      value={editState.listingCapture.capturedCount}
                      onChange={(value) =>
                        setEditState((prev) => ({
                          ...prev,
                          listingCapture: { ...prev.listingCapture, capturedCount: value },
                        }))
                      }
                    />
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <label style={fieldLabelStyle}>Note</label>
                    <textarea
                      value={editState.listingCapture.note}
                      onChange={(event) =>
                        setEditState((prev) => ({
                          ...prev,
                          listingCapture: { ...prev.listingCapture, note: event.target.value },
                        }))
                      }
                      rows={3}
                      style={textareaStyle}
                      placeholder="Optional note for the weekly listing capture"
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                    <button
                      type="button"
                      onClick={handleSaveListingCapture}
                      disabled={savingAction === "listingCapture"}
                      style={{
                        ...primaryButtonStyle,
                        opacity: savingAction === "listingCapture" ? 0.7 : 1,
                        cursor: savingAction === "listingCapture" ? "wait" : "pointer",
                      }}
                    >
                      <FaPlus />
                      {savingAction === "listingCapture" ? "Saving..." : "Save weekly capture"}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    padding: 18,
                    borderRadius: 22,
                    background: "var(--surface)",
                    boxShadow: "10px 10px 24px var(--shadow-lo), -10px -10px 24px var(--shadow-hi)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text)" }}>Deal capture</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                        Every deal is saved to history and split between Gerhard Barnard Inc and other attorneys for reporting.
                      </div>
                    </div>
                    <div style={{ fontWeight: 900, color: "var(--color-primary)", fontSize: 20 }}>
                      {safeNumber(editingAgent?.stats?.dealsTotal)}
                    </div>
                  </div>

                  <div style={{ ...fieldGridStyle, marginTop: 14 }}>
                    <Field
                      label="Deal date"
                      type="date"
                      value={editState.dealCapture.dealDate}
                      onChange={(value) =>
                        setEditState((prev) => ({
                          ...prev,
                          dealCapture: { ...prev.dealCapture, dealDate: value },
                        }))
                      }
                    />
                    <Field
                      label="Deal count"
                      type="number"
                      value={editState.dealCapture.count}
                      onChange={(value) =>
                        setEditState((prev) => ({
                          ...prev,
                          dealCapture: { ...prev.dealCapture, count: value },
                        }))
                      }
                    />
                    <SelectField
                      label="Transferring attorney"
                      value={editState.dealCapture.transferAttorneyType}
                      onChange={(value) =>
                        setEditState((prev) => ({
                          ...prev,
                          dealCapture: { ...prev.dealCapture, transferAttorneyType: value },
                        }))
                      }
                      options={[
                        { value: "gerhard_barnard_inc", label: "Gerhard Barnard Inc" },
                        { value: "other", label: "Other transferring attorney" },
                      ]}
                    />
                    {editState.dealCapture.transferAttorneyType === "other" ? (
                      <Field
                        label="Other attorney name"
                        value={editState.dealCapture.transferAttorneyName}
                        onChange={(value) =>
                          setEditState((prev) => ({
                            ...prev,
                            dealCapture: { ...prev.dealCapture, transferAttorneyName: value },
                          }))
                        }
                      />
                    ) : null}
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <label style={fieldLabelStyle}>Note</label>
                    <textarea
                      value={editState.dealCapture.note}
                      onChange={(event) =>
                        setEditState((prev) => ({
                          ...prev,
                          dealCapture: { ...prev.dealCapture, note: event.target.value },
                        }))
                      }
                      rows={3}
                      style={textareaStyle}
                      placeholder="Optional note for the deal capture"
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                    <button
                      type="button"
                      onClick={handleSaveDealCapture}
                      disabled={savingAction === "dealCapture"}
                      style={{
                        ...primaryButtonStyle,
                        opacity: savingAction === "dealCapture" ? 0.7 : 1,
                        cursor: savingAction === "dealCapture" ? "wait" : "pointer",
                      }}
                    >
                      <FaPlus />
                      {savingAction === "dealCapture" ? "Saving..." : "Add deal"}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={fieldLabelStyle}>Internal notes</label>
                  <textarea
                    value={editState.notes}
                    onChange={(event) =>
                      setEditState((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    rows={4}
                    style={textareaStyle}
                    placeholder="Add internal notes, targets, achievements or reminders for this agent."
                  />
                </div>

                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    fontWeight: 800,
                    color: "var(--text)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={editState.featured}
                    onChange={(event) =>
                      setEditState((prev) => ({ ...prev, featured: event.target.checked }))
                    }
                  />
                  Feature this agent card
                </label>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <button type="button" onClick={closeEditor} style={secondaryButtonStyle}>
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={savingAction === "profile"}
                    style={{
                      ...primaryButtonStyle,
                      opacity: savingAction === "profile" ? 0.7 : 1,
                      cursor: savingAction === "profile" ? "wait" : "pointer",
                    }}
                  >
                    <FaSave />
                    {savingAction === "profile" ? "Saving..." : "Save profile changes"}
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 18,
                marginTop: 24,
              }}
            >
              <div
                style={{
                  padding: 18,
                  borderRadius: 22,
                  background: "var(--surface)",
                  boxShadow: "10px 10px 24px var(--shadow-lo), -10px -10px 24px var(--shadow-hi)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 900, color: "var(--text)", fontSize: 16 }}>Weekly listing history</div>
                  <div style={{ color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
                    {modalListingHistory.length} saved week{modalListingHistory.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <HistoryTable
                    columns={[
                      { key: "week", label: "Week", width: "1.3fr" },
                      { key: "captured", label: "Weekly listings", width: "0.8fr" },
                      { key: "totalAfter", label: "Overall total", width: "0.8fr" },
                      { key: "note", label: "Note", width: "1.2fr" },
                      { key: "actions", label: "Action", width: "90px" },
                    ]}
                    rows={modalListingHistory.map((entry) => ({
                      key: entry._id || entry.weekKey,
                      week: (
                        <div>
                          <div style={{ fontWeight: 800 }}>{entry.weekLabel || formatDate(entry.periodStart)}</div>
                          <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
                            Saved {formatDate(entry.capturedAt)}
                          </div>
                        </div>
                      ),
                      captured: <strong>{safeNumber(entry.capturedCount)}</strong>,
                      totalAfter: <strong>{safeNumber(editingAgent?.openingTotalListings) + safeNumber(entry.capturedCount)}</strong>,
                      note: <span style={{ color: "var(--muted)" }}>{entry.note || "—"}</span>,
                      actions: canEdit ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteListingHistory(entry._id)}
                          style={dangerGhostButtonStyle}
                          title="Delete listing capture"
                        >
                          <FaTrashAlt />
                        </button>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      ),
                    }))}
                    emptyText="No weekly listing history captured yet."
                  />
                </div>
              </div>

              <div
                style={{
                  padding: 18,
                  borderRadius: 22,
                  background: "var(--surface)",
                  boxShadow: "10px 10px 24px var(--shadow-lo), -10px -10px 24px var(--shadow-hi)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 900, color: "var(--text)", fontSize: 16 }}>Deal history</div>
                  <div style={{ color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
                    {modalDealHistory.length} saved deal entr{modalDealHistory.length === 1 ? "y" : "ies"}
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <HistoryTable
                    columns={[
                      { key: "date", label: "Date", width: "0.9fr" },
                      { key: "count", label: "Count", width: "0.7fr" },
                      { key: "destination", label: "Destination", width: "1.2fr" },
                      { key: "note", label: "Note", width: "1.2fr" },
                      { key: "actions", label: "Action", width: "90px" },
                    ]}
                    rows={modalDealHistory.map((entry) => ({
                      key: entry._id || `${entry.dealDate}-${entry.transferAttorneyType}`,
                      date: (
                        <div>
                          <div style={{ fontWeight: 800 }}>{formatDate(entry.dealDate)}</div>
                          <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
                            Saved {formatDate(entry.capturedAt)}
                          </div>
                        </div>
                      ),
                      count: <strong>{safeNumber(entry.count)}</strong>,
                      destination: (
                        <div>
                          <div style={{ fontWeight: 800 }}>{entry.transferAttorneyName || "Gerhard Barnard Inc"}</div>
                          <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
                            {entry.transferAttorneyType === "other" ? "Other attorney" : "Gerhard Barnard Inc"}
                          </div>
                        </div>
                      ),
                      note: <span style={{ color: "var(--muted)" }}>{entry.note || "—"}</span>,
                      actions: canEdit ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteDealHistory(entry._id)}
                          style={dangerGhostButtonStyle}
                          title="Delete deal entry"
                        >
                          <FaTrashAlt />
                        </button>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      ),
                    }))}
                    emptyText="No deals have been captured for this agent yet."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({ icon, text }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: 50,
        padding: "13px 14px",
        borderRadius: 16,
        background: "rgba(255,255,255,0.52)",
        color: "var(--text)",
        fontWeight: 700,
        fontSize: 13,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
      }}
    >
      <span style={{ color: "var(--color-primary)", display: "inline-flex", flexShrink: 0 }}>{icon}</span>
      <span style={{ overflowWrap: "anywhere" }}>{text}</span>
    </div>
  );
}

function Field({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={fieldLabelStyle}>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={fieldLabelStyle}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function filterPill(active, accent) {
  return {
    border: "none",
    borderRadius: 999,
    padding: "11px 16px",
    cursor: "pointer",
    fontWeight: 800,
    color: active ? "#fff" : "#eef2ff",
    background: active ? `linear-gradient(135deg, ${accent}, var(--color-primary))` : "rgba(255,255,255,0.06)",
    boxShadow: active ? "0 10px 24px rgba(0,0,0,0.18)" : "inset 4px 4px 10px rgba(0,0,0,0.18)",
  };
}

function branchBadge(meta) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 12px",
    borderRadius: 999,
    background: meta.badgeBg,
    color: meta.badgeColor,
    fontWeight: 800,
    fontSize: 12,
  };
}

function branchStatBadge(meta) {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 999,
    background: meta.badgeBg,
    color: meta.badgeColor,
    fontWeight: 800,
    fontSize: 12,
  };
}

const miniMetaBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.58)",
  color: "var(--text)",
  fontWeight: 800,
  fontSize: 12,
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  padding: 20,
  background: "rgba(6, 15, 33, 0.42)",
  backdropFilter: "blur(8px)",
  zIndex: 9999,
  overflowY: "auto",
};

const modalStyle = {
  width: "min(1320px, 100%)",
  margin: "28px auto",
  padding: 24,
  borderRadius: 30,
  background: "var(--bg)",
  boxShadow: "18px 18px 38px rgba(0,0,0,0.18), -18px -18px 38px rgba(255,255,255,0.45)",
};

const fieldGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 14px",
  borderRadius: 16,
  border: "1px solid color-mix(in srgb, var(--text) 10%, transparent)",
  outline: "none",
  background: "var(--surface)",
  color: "var(--text)",
  boxShadow: "inset 4px 4px 10px var(--shadow-lo), inset -4px -4px 10px var(--shadow-hi)",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 110,
  resize: "vertical",
  fontFamily: "inherit",
};

const fieldLabelStyle = {
  fontWeight: 800,
  color: "var(--text)",
  fontSize: 13,
};

const uploadLabelStyle = {
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 14px",
  borderRadius: 14,
  cursor: "pointer",
  background: "var(--surface)",
  color: "var(--color-primary)",
  fontWeight: 800,
  boxShadow: "8px 8px 18px var(--shadow-lo), -8px -8px 18px var(--shadow-hi)",
};

const secondaryButtonStyle = {
  border: "none",
  borderRadius: 16,
  padding: "13px 18px",
  background: "var(--surface)",
  color: "var(--text)",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "8px 8px 18px var(--shadow-lo), -8px -8px 18px var(--shadow-hi)",
};

const primaryButtonStyle = {
  border: "none",
  borderRadius: 16,
  padding: "13px 18px",
  background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  boxShadow: "10px 10px 24px rgba(20,42,79,0.22)",
};

const dangerGhostButtonStyle = {
  border: "1px solid rgba(239, 68, 68, 0.18)",
  borderRadius: 12,
  padding: "9px 10px",
  background: "rgba(239, 68, 68, 0.08)",
  color: "#b91c1c",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
