import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FaBirthdayCake,
  FaBuilding,
  FaChartLine,
  FaChevronDown,
  FaChevronUp,
  FaEnvelope,
  FaFilter,
  FaPhoneAlt,
  FaSave,
  FaSearch,
  FaStar,
  FaTimes,
  FaUserEdit,
  FaUsers,
} from "react-icons/fa";

const BASE_URL = "https://case-tracking-backend.onrender.com";

const BRANCH_META = {
  management: {
    label: "Management",
    accent: "var(--color-accent)",
    tint: "linear-gradient(135deg, rgba(210, 172, 104, 0.20), rgba(20, 42, 79, 0.08))",
    badgeBg: "rgba(210, 172, 104, 0.16)",
    badgeColor: "#7d5e22",
    ring: "rgba(210, 172, 104, 0.28)",
  },
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

const BRANCH_ORDER = ["management", "pretoria", "waterberg", "vaal"];

const DEFAULT_MANUAL_STATS = {
  activeFiles: "",
  listingsThisWeek: "",
  listingsThisMonth: "",
  dealsThisWeek: "",
  dealsThisMonth: "",
  dealsTotal: "",
};

const MANUAL_STAT_FIELDS = [
  { key: "activeFiles", label: "Active files" },
  { key: "listingsThisWeek", label: "Listings this week" },
  { key: "listingsThisMonth", label: "Listings this month" },
  { key: "dealsThisWeek", label: "Deals this week" },
  { key: "dealsThisMonth", label: "Deals this month" },
  { key: "dealsTotal", label: "Deals total" },
];

function getAuthConfig() {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
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
    manualStats: { ...DEFAULT_MANUAL_STATS },
  };
}

function safeNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function getInitials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((piece) => piece[0]?.toUpperCase() || "")
    .join("") || "AA";
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
    manualStats: {
      activeFiles: manual?.activeFiles ?? "",
      listingsThisWeek: manual?.listingsThisWeek ?? "",
      listingsThisMonth: manual?.listingsThisMonth ?? "",
      dealsThisWeek: manual?.dealsThisWeek ?? "",
      dealsThisMonth: manual?.dealsThisMonth ?? "",
      dealsTotal: manual?.dealsTotal ?? "",
    },
  };
}

function StatCard({ label, value, icon, accent }) {
  return (
    <div
      style={{
        minHeight: 112,
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
    </div>
  );
}

function AgentMetric({ label, value }) {
  return (
    <div
      style={{
        minHeight: 94,
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

export default function InhouseAgents() {
  const [agents, setAgents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingAgent, setEditingAgent] = useState(null);
  const [editState, setEditState] = useState(createEmptyEditState());
  const [expandedAgentIds, setExpandedAgentIds] = useState({});

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [agentsRes, userRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/inhouse-agents`, getAuthConfig()),
        axios.get(`${BASE_URL}/api/users/me`, getAuthConfig()),
      ]);

      setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : []);
      setCurrentUser(userRes.data || null);
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
    const timer = setTimeout(() => setSuccessMessage(""), 2800);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const filteredAgents = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return agents.filter((agent) => {
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

  const groupedAgents = useMemo(() => {
    return BRANCH_ORDER.map((branch) => ({
      branch,
      meta: BRANCH_META[branch],
      agents: filteredAgents.filter((agent) => agent.branch === branch),
    })).filter((group) => group.agents.length > 0);
  }, [filteredAgents]);

  const totals = useMemo(() => {
    return filteredAgents.reduce(
      (acc, agent) => {
        const stats = agent?.stats || {};
        acc.totalAgents += 1;
        acc.activeFiles += safeNumber(stats.activeFiles);
        acc.listingsThisMonth += safeNumber(stats.listingsThisMonth);
        acc.dealsThisMonth += safeNumber(stats.dealsThisMonth);
        return acc;
      },
      {
        totalAgents: 0,
        activeFiles: 0,
        listingsThisMonth: 0,
        dealsThisMonth: 0,
      }
    );
  }, [filteredAgents]);

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

  const handleSave = useCallback(async () => {
    if (!editingAgent?._id) return;

    try {
      setSaving(true);
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
        aliases: editState.aliasesText
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
        manualStats: Object.keys(editState.manualStats).reduce((acc, key) => {
          const raw = editState.manualStats[key];
          acc[key] = raw === "" ? null : Number(raw);
          return acc;
        }, {}),
      };

      const res = await axios.put(
        `${BASE_URL}/api/inhouse-agents/${editingAgent._id}`,
        payload,
        getAuthConfig()
      );

      setAgents((prev) =>
        prev.map((agent) => (agent._id === editingAgent._id ? res.data : agent))
      );
      setSuccessMessage(`${payload.fullName} updated successfully.`);
      closeEditor();
    } catch (err) {
      console.error("Failed to save agent:", err);
      setError(err?.response?.data?.message || "Failed to save the inhouse agent profile.");
    } finally {
      setSaving(false);
    }
  }, [closeEditor, editState, editingAgent]);

  const canEdit = !!currentUser?.isAdmin;

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
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
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
                Track every internal agent, branch, listing flow, and closed deal in one premium dashboard.
              </h1>

              <p
                style={{
                  margin: 0,
                  maxWidth: 840,
                  color: "var(--muted)",
                  lineHeight: 1.7,
                  fontSize: 15,
                }}
              >
                Cleaner square cards, tighter metrics, and expandable detail panels keep the page more professional and easier to scan.
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
                  icon={<FaBuilding />}
                  accent="var(--color-accent)"
                />
                <StatCard
                  label="Listings this month"
                  value={totals.listingsThisMonth}
                  icon={<FaChartLine />}
                  accent="#1ea7ff"
                />
                <StatCard
                  label="Deals this month"
                  value={totals.dealsThisMonth}
                  icon={<FaStar />}
                  accent="#6b7280"
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

              <div
                style={{
                  marginTop: 22,
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.9 }}>Editing access</div>

                <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, opacity: 0.88 }}>
                  {canEdit
                    ? "You are signed in as an admin, so every card can be edited and expanded without cluttering the main grid."
                    : "You are signed in as a standard user, so the page is view-only while admin users can update agent cards."}
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
                    <span style={branchStatBadge(group.meta)}>
                      {group.agents.length} agents
                    </span>

                    <span style={branchStatBadge(group.meta)}>
                      {group.agents.reduce(
                        (sum, agent) => sum + safeNumber(agent?.stats?.listingsThisMonth),
                        0
                      )}{" "}
                      listings this month
                    </span>

                    <span style={branchStatBadge(group.meta)}>
                      {group.agents.reduce(
                        (sum, agent) => sum + safeNumber(agent?.stats?.dealsThisMonth),
                        0
                      )}{" "}
                      deals this month
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
                  const hasManualOverrides = !!stats.hasManualOverrides;
                  const expanded = !!expandedAgentIds[agent._id];

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
                        minHeight: expanded ? "auto" : 468,
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
                                  width: 70,
                                  height: 70,
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
                                  width: 70,
                                  height: 70,
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
                                  fontSize: 20,
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
                                  {hasManualOverrides ? "Manual stats" : "Auto-tracked"}
                                </span>

                                {agent.featured ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      padding: "7px 10px",
                                      borderRadius: 999,
                                      background: "rgba(210, 172, 104, 0.16)",
                                      color: "#8a641a",
                                      fontWeight: 800,
                                      fontSize: 11,
                                    }}
                                  >
                                    <FaStar />
                                    Featured
                                  </span>
                                ) : null}
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
                          <AgentMetric label="Active files" value={stats.activeFiles} />
                          <AgentMetric label="Week deals" value={stats.dealsThisWeek} />
                          <AgentMetric label="Month deals" value={stats.dealsThisMonth} />
                          <AgentMetric label="Total deals" value={stats.dealsTotal} />
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
                            maxHeight: expanded ? 420 : 0,
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
                            <InfoRow
                              icon={<FaBirthdayCake />}
                              text={agent.birthday || "Birthday not set"}
                            />
                            <InfoRow
                              icon={<FaBuilding />}
                              text={`${safeNumber(stats.matchedMatterCount)} matched matters`}
                            />
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
                    background: BRANCH_META[editState.branch].badgeBg,
                    color: BRANCH_META[editState.branch].badgeColor,
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
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 24,
                marginTop: 22,
              }}
            >
              <div
                style={{
                  padding: 20,
                  borderRadius: 24,
                  background: BRANCH_META[editState.branch].tint,
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
                        background: `linear-gradient(135deg, ${BRANCH_META[editState.branch].accent}, var(--color-primary))`,
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
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 900,
                      color: "var(--text)",
                      marginBottom: 14,
                    }}
                  >
                    Manual stat overrides
                  </div>

                  <div style={fieldGridStyle}>
                    {MANUAL_STAT_FIELDS.map(({ key, label }) => (
                      <Field
                        key={key}
                        label={label}
                        type="number"
                        value={editState.manualStats[key]}
                        onChange={(value) =>
                          setEditState((prev) => ({
                            ...prev,
                            manualStats: {
                              ...prev.manualStats,
                              [key]: value,
                            },
                          }))
                        }
                      />
                    ))}
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
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      ...primaryButtonStyle,
                      opacity: saving ? 0.7 : 1,
                      cursor: saving ? "wait" : "pointer",
                    }}
                  >
                    <FaSave />
                    {saving ? "Saving..." : "Save changes"}
                  </button>
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
      <span style={{ color: "var(--color-primary)", display: "inline-flex", flexShrink: 0 }}>
        {icon}
      </span>
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
    background: active
      ? `linear-gradient(135deg, ${accent}, var(--color-primary))`
      : "rgba(255,255,255,0.06)",
    boxShadow: active
      ? "0 10px 24px rgba(0,0,0,0.18)"
      : "inset 4px 4px 10px rgba(0,0,0,0.18)",
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
  width: "min(1180px, 100%)",
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
  minHeight: 120,
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