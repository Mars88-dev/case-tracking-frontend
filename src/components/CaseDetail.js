// src/components/CaseDetail.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

/* ===================== config / tokens ===================== */
const BASE_URL = "https://case-tracking-backend.onrender.com";

// Theme tokens (use CSS vars so dark/light works; each has a safe fallback)
const COLORS = {
  primary: "var(--color-primary, #142a4f)",
  accent:  "var(--color-accent, #d2ac68)",
  background: "var(--bg, #f5f5f5)",
  white: "var(--surface, #ffffff)",
  gray:  "color-mix(in srgb, var(--surface, #ffffff) 90%, var(--bg, #f5f5f5) 10%)",
  border: "color-mix(in srgb, var(--text, #142a4f) 15%, transparent)",
  blue:  "var(--color-primary, #142a4f)",
  text:  "var(--text, #142a4f)",
};

const DATE_OPTIONS = ["N/A", "Partly", "Requested"];

/* ===================== initial form ===================== */
const initialForm = {
  instructionReceived: "",
  parties: "",
  agency: "",
  purchasePrice: "",
  agent: "",
  property: "",
  reference: "",
  depositAmount: "",
  depositDueDate: "",
  depositFulfilledDate: "",
  bondAmount: "",
  bondDueDate: "",
  bondFulfilledDate: "",
  comments: "",
  transferSignedSellerDate: "",
  transferSignedPurchaserDate: "",
  documentsLodgedDate: "",
  deedsPrepDate: "",
  registrationDate: "",
  isActive: true,
  colors: {},
};

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

TRANSFER_ITEMS.forEach((item) => {
  initialForm[`${item}Requested`] = "";
  initialForm[`${item}Received`] = "";
});

/* ===================== small field building blocks ===================== */
const ColorInput = ({ name, value, onChange }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
    <input
      aria-label="Highlight colour"
      type="color"
      name={`colors.${name}`}
      value={value || "#ffffff"}
      onChange={(e) =>
        onChange({ target: { name: `colors.${name}`, value: e.target.value } })
      }
      style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer" }}
    />
    <button
      type="button"
      onClick={() => onChange({ target: { name: `colors.${name}`, value: "" } })}
      style={styles.resetBtn}
    >
      Reset
    </button>
  </div>
);

const FieldChrome = ({ label, children }) => (
  <div style={styles.field}>
    <div style={styles.subLabel}>{label}</div>
    {children}
  </div>
);

const Input = ({ label, name, value, onChange, color, type = "text", placeholder }) => (
  <div style={{ ...styles.fieldWrap, backgroundColor: color }}>
    <FieldChrome label={label}>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        style={styles.input}
      />
    </FieldChrome>
    <ColorInput name={name} value={color} onChange={onChange} />
  </div>
);

const TextArea = ({ label, name, value, onChange, color, placeholder }) => (
  <div style={{ ...styles.fieldWrap, backgroundColor: color }}>
    <FieldChrome label={label}>
      <textarea
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        style={styles.textarea}
      />
    </FieldChrome>
    <ColorInput name={name} value={color} onChange={onChange} />
  </div>
);

const DateSelect = ({ label, name, value, onChange, color, pureDate = false }) => {
  // Normalize for <input type="date">
  let displayValue = value;
  if (typeof value === "string") {
    if (value.includes("T")) {
      // ISO from Mongo
      const d = new Date(value);
      if (!isNaN(d)) displayValue = d.toISOString().split("T")[0];
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split("/");
      displayValue = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  const isDate = typeof displayValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(displayValue);

  return (
    <div style={{ ...styles.fieldWrap, backgroundColor: color }}>
      <FieldChrome label={label}>
        <div style={styles.dateRow}>
          <input
            type="date"
            name={name}
            value={isDate ? displayValue : ""}
            onChange={onChange}
            style={styles.input}
          />
          {!pureDate && (
            <select
              name={name}
              value={!isDate ? displayValue || "" : ""}
              onChange={onChange}
              style={styles.select}
            >
              <option value="" hidden>--</option>
              {DATE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
        </div>
      </FieldChrome>
      <ColorInput name={name} value={color} onChange={onChange} />
    </div>
  );
};

/* ===================== main component ===================== */
export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function fetchCase() {
      if (isNew) return;
      try {
        const token = localStorage.getItem("token");
        const { data } = await axios.get(`${BASE_URL}/api/cases/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setForm({ ...initialForm, ...data, colors: data?.colors || {} });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || "Failed to load transaction.");
        }
      } finally {
        if (!cancelled) setLoading(false);   // <-- always clear loading
      }
    }
    fetchCase();
    return () => { cancelled = true; };
  }, [id, isNew]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("colors.")) {
      const fieldName = name.split(".")[1];
      setForm((prev) => ({ ...prev, colors: { ...prev.colors, [fieldName]: value } }));
    } else if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Robust formatter: handles ISO, YYYY-MM-DD and keeps N/A/Partly/Requested
  const formatToDMY = (val) => {
    if (!val || typeof val !== "string" || DATE_OPTIONS.includes(val)) return val;
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
      const d = new Date(val);
      return isNaN(d) ? val : d.toLocaleDateString("en-GB");
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split("-");
      return `${d}/${m}/${y}`;
    }
    return val; // already DD/MM/YYYY or a label
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const url = isNew ? `${BASE_URL}/api/cases` : `${BASE_URL}/api/cases/${id}`;
    try {
      const token = localStorage.getItem("token");
      const cfg = { headers: { Authorization: `Bearer ${token}` } };

      const dataToSave = { ...form };
      const dateFields = Object.keys(dataToSave).filter(
        (k) => k.toLowerCase().includes("date") || k === "instructionReceived"
      );
      dateFields.forEach((field) => { dataToSave[field] = formatToDMY(dataToSave[field]); });

      if (isNew) dataToSave.date = new Date().toLocaleDateString("en-GB");

      await axios({ method: isNew ? "post" : "put", url, data: dataToSave, ...cfg });
      navigate("/mytransactions");
    } catch (err) {
      setError(err?.response?.data?.message || "Error saving transaction.");
    }
  };

  if (loading) return <div style={styles.loading}>Loading…</div>;

  const sections = [
    {
      title: "Information",
      icon: "📝",
      cols: 3,
      fields: [
        { label: "Reference", name: "reference", type: "text", placeholder: "e.g. APP8/0001" },
        { label: "Instruction Received", name: "instructionReceived", type: "date", pureDate: true },
        { label: "Parties", name: "parties", type: "text", placeholder: "APPOLIS / MANIKUS" },
        { label: "Agency", name: "agency", type: "text", placeholder: "Agency name" },
        { label: "Purchase Price", name: "purchasePrice", type: "text", placeholder: "R 1 300 000.00" },
        { label: "Agent", name: "agent", type: "text", placeholder: "Agent name / reference" },
        { label: "Property", name: "property", type: "text", placeholder: "ERF & Address" },
        { label: "Active Case?", name: "isActive", type: "checkbox" },
      ],
    },
    {
      title: "Financials",
      icon: "💰",
      cols: 3,
      fields: [
        { label: "Deposit Amount", name: "depositAmount", type: "text", placeholder: "N/A or amount" },
        { label: "Deposit Due", name: "depositDueDate", type: "date" },
        { label: "Deposit Fulfilled", name: "depositFulfilledDate", type: "date" },
        { label: "Bond Amount", name: "bondAmount", type: "text", placeholder: "Amount" },
        { label: "Bond Due", name: "bondDueDate", type: "date" },
        { label: "Bond Fulfilled", name: "bondFulfilledDate", type: "date" },
      ],
    },
    {
      title: "Transfer Process",
      icon: "🔄",
      cols: 2,
      fields: TRANSFER_ITEMS.flatMap((item) => {
        const pretty =
          item === "electricalComplianceCertificate"
            ? "COC ELECTRICAL COMPLIANCE CERTIFICATE"
            : item.replace(/([A-Z])/g, " $1").toUpperCase();
        return [
          { label: `${pretty} — REQUESTED`, name: `${item}Requested`, type: "date" },
          { label: `${pretty} — RECEIVED`, name: `${item}Received`, type: "date" },
        ];
      }),
    },
    {
      title: "Transfer Documents Signed",
      icon: "✍️",
      cols: 2,
      fields: [
        { label: "Seller Signed", name: "transferSignedSellerDate", type: "date" },
        { label: "Purchaser Signed", name: "transferSignedPurchaserDate", type: "date" },
      ],
    },
    {
      title: "Deeds Office Process",
      icon: "🏛️",
      cols: 3,
      fields: [
        { label: "Docs Lodged", name: "documentsLodgedDate", type: "date" },
        { label: "Deeds Prep", name: "deedsPrepDate", type: "date" },
        { label: "Registration", name: "registrationDate", type: "date" },
      ],
    },
    {
      title: "Comments",
      icon: "✏️",
      cols: 1,
      fields: [{ label: "Comments", name: "comments", type: "textarea", placeholder: "Add timeline notes / call logs / follow-ups…" }],
    },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.animatedBackground} />
      <div style={styles.formCard}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>

        <h1 style={styles.title}>{isNew ? "New" : "Edit"} Transaction</h1>
        <p style={styles.subtitle}>Fill in the details below</p>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {sections.map((sec) => (
            <section key={sec.title} style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionIcon}>{sec.icon}</span>
                <h2 style={styles.sectionTitle}>{sec.title}</h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: `repeat(${sec.cols}, 1fr)`, gap: 16, marginTop: 12 }}>
                {sec.fields.map((field) => {
                  const common = {
                    key: field.name,
                    label: field.label,
                    name: field.name,
                    value: form[field.name],
                    color: form.colors?.[field.name],
                    onChange: handleChange,
                    placeholder: field.placeholder,
                  };
                  if (field.type === "textarea") return <TextArea {...common} />;
                  if (field.type === "date") return <DateSelect {...common} pureDate={field.pureDate} />;
                  if (field.type === "checkbox")
                    return (
                      <div key={field.name} style={styles.fieldWrap}>
                        <div style={styles.subLabel}>{field.label}</div>
                        <label style={styles.checkboxRow}>
                          <input
                            type="checkbox"
                            name={field.name}
                            checked={!!form[field.name]}
                            onChange={handleChange}
                            style={{ width: 18, height: 18 }}
                          />
                          <span>Active</span>
                        </label>
                      </div>
                    );
                  return <Input {...common} type="text" />;
                })}
              </div>
            </section>
          ))}

          <button type="submit" style={styles.saveBtn}>Save Transaction</button>
        </form>
      </div>
    </div>
  );
}

/* ===================== styles ===================== */
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    position: "relative",
    overflow: "hidden",
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    padding: 20,
  },
  animatedBackground: {
    position: "absolute",
    inset: 0,
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.blue} 100%)`,
    opacity: 0.08,
    animation: "gradientMove 16s ease infinite",
    backgroundSize: "200% 200%",
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 28,
    maxWidth: 1100,
    width: "100%",
    boxShadow: "0 8px 20px color-mix(in srgb, var(--text, #142a4f) 10%, transparent)",
    zIndex: 1,
  },
  backBtn: {
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.blue})`,
    color: "white",
    border: "none",
    padding: "8px 14px",
    borderRadius: 12,
    cursor: "pointer",
    marginBottom: 10,
    fontWeight: 700,
  },
  title: { color: COLORS.primary, fontSize: 32, margin: "6px 0 4px", fontWeight: 900, letterSpacing: 0.3 },
  subtitle: { color: COLORS.text, fontSize: 15, margin: 0, opacity: 0.8 },

  error: {
    marginTop: 10,
    marginBottom: 6,
    padding: "10px 12px",
    borderRadius: 10,
    background: "color-mix(in srgb, var(--color-accent, #d2ac68) 15%, transparent)",
    color: COLORS.text,
    border: "1px solid " + COLORS.border,
    fontWeight: 700,
  },

  form: { display: "flex", flexDirection: "column", gap: 18, marginTop: 10 },

  section: {
    padding: 14,
    borderRadius: 14,
    background: COLORS.gray,
    boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--text, #142a4f) 8%, transparent)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.blue})`,
    padding: "8px 12px",
    borderRadius: 10, // main header corners
  },
  sectionIcon: { fontSize: 18, color: "white", lineHeight: 1 },
  sectionTitle: { color: "white", fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: 0.4 },

  fieldWrap: {
    padding: 10,
    borderRadius: 12,
    background: COLORS.white,
    boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--text, #142a4f) 8%, transparent)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  field: { display: "flex", flexDirection: "column", gap: 8 },

  // GOLD sub-heading: use same radius as header (10px), not pill
  subLabel: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.4,
    padding: "6px 12px",
    backgroundColor: COLORS.accent,
    color: COLORS.blue,
    borderRadius: 10,
    width: "fit-content",
    boxShadow: "0 1px 0 color-mix(in srgb, var(--text, #142a4f) 6%, transparent)",
    textTransform: "uppercase",
  },

  input: {
    marginTop: 6,
    padding: "12px 14px",
    border: "1px solid " + COLORS.border,
    borderRadius: 12,
    background: "color-mix(in srgb, var(--surface, #ffffff) 85%, var(--bg, #f5f5f5) 15%)",
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.text,
    outline: "none",
  },
  textarea: {
    marginTop: 6,
    padding: "12px 14px",
    border: "1px solid " + COLORS.border,
    borderRadius: 12,
    background: "color-mix(in srgb, var(--surface, #ffffff) 85%, var(--bg, #f5f5f5) 15%)",
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.text,
    minHeight: 120,
    outline: "none",
    lineHeight: 1.45,
  },
  select: {
    padding: "12px 14px",
    border: "1px solid " + COLORS.border,
    borderRadius: 12,
    background: "color-mix(in srgb, var(--surface, #ffffff) 85%, var(--bg, #f5f5f5) 15%)",
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.text,
    outline: "none",
    minWidth: 120,
  },
  dateRow: { display: "flex", gap: 10, alignItems: "center" },

  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 12,
    background: "color-mix(in srgb, var(--surface, #ffffff) 85%, var(--bg, #f5f5f5) 15%)",
    border: "1px solid " + COLORS.border,
    fontSize: 15,
    fontWeight: 800,
    color: COLORS.text,
    userSelect: "none",
  },

  resetBtn: {
    fontSize: 12,
    background: "none",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "4px 8px",
    cursor: "pointer",
    color: COLORS.blue,
    fontWeight: 700,
  },

  saveBtn: {
    alignSelf: "flex-end",
    padding: "12px 22px",
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.blue})`,
    color: "white",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
  },

  loading: { textAlign: "center", padding: 40, fontSize: 18, color: COLORS.text },
};

/* subtle animated bg */
const keyframes = `@keyframes gradientMove {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}`;
if (typeof document !== "undefined") {
  const ID = "case-detail-anim";
  if (!document.getElementById(ID)) {
    const style = document.createElement("style");
    style.id = ID;
    style.innerHTML = keyframes;
    document.head.appendChild(style);
  }
}
