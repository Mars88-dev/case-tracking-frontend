// src/components/CaseDetail.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

/* ===================== config / tokens ===================== */
const BASE_URL = "https://case-tracking-backend.onrender.com";
const COLORS = {
  primary: "#142a4f",
  accent:  "#d2ac68",
  background: "#f5f5f5",
  white: "#ffffff",
  gray:  "#f9fafb",
  border: "#cbd5e1",
  gold:  "#d2ac68",
  blue:  "#142a4f",
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

/* ===================== helpers ===================== */
const isISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isDMY = (s) => typeof s === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(s);

const isoToDMY = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const dmyToISO = (dmy) => {
  const [d, m, y] = dmy.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
};

/** For the ONLY true Date field in your schema: instructionReceived (Date) */
const toISODateOrNull = (val) => {
  if (!val) return null;
  if (typeof val === "string") {
    if (DATE_OPTIONS.includes(val)) return null;
    if (isISO(val)) return val;         // "YYYY-MM-DD" is OK
    if (isDMY(val)) return dmyToISO(val);
  }
  return null;
};

/** For all the other date-like fields stored as String in the schema */
const toDMYString = (val) => {
  if (!val) return "";
  if (typeof val === "string") {
    if (DATE_OPTIONS.includes(val)) return val; // keep labels as text
    if (isISO(val)) return isoToDMY(val);
    if (isDMY(val)) return val;
  }
  return "";
};

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
  // Normalize incoming value for <input type="date">
  let displayValue = value;
  if (typeof value === "string") {
    if (value.includes("T")) {
      displayValue = new Date(value).toISOString().split("T")[0];
    } else if (isDMY(value)) {
      const [day, month, year] = value.split("/");
      displayValue = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  const isDate = isISO(displayValue);

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
              value={!isDate ? (displayValue || "") : ""}
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
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!isNew) {
      const token = localStorage.getItem("token");
      axios
        .get(`${BASE_URL}/api/cases/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          // merge into initialForm so missing keys are defined
          setForm({ ...initialForm, ...res.data });
          setLoading(false);
        })
        .catch((err) => {
          console.error("Fetch error:", err);
          setLoading(false);
          setSaveError("Could not load case. Please try again.");
        });
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError("");

    const token = localStorage.getItem("token");
    const payload = {};

    // ----- non-date fields -----
    [
      "reference","parties","agency","purchasePrice","agent","property",
      "depositAmount","bondAmount","comments","isActive",
    ].forEach((key) => {
      payload[key] = form[key];
    });

    // ----- the ONLY true Date in your schema -----
    payload.instructionReceived = toISODateOrNull(form.instructionReceived);

    // ----- all the other date-like fields are STRINGS in your schema -----
    const STRING_DATE_FIELDS = [
      "depositDueDate","depositFulfilledDate",
      "bondDueDate","bondFulfilledDate",
      "transferSignedSellerDate","transferSignedPurchaserDate",
      "documentsLodgedDate","deedsPrepDate","registrationDate",
      ...TRANSFER_ITEMS.map(i => `${i}Requested`),
      ...TRANSFER_ITEMS.map(i => `${i}Received`),
    ];
    STRING_DATE_FIELDS.forEach((k) => {
      payload[k] = toDMYString(form[k]);
    });

    // Optional UI-only colours (allowed by schema Mixed)
    payload.colors = form.colors || {};

    // Creation date (your schema stores String; keep DMY for new)
    if (isNew && !payload.date) {
      payload.date = new Date().toLocaleDateString("en-GB");
    }

    try {
      const url = isNew ? `${BASE_URL}/api/cases` : `${BASE_URL}/api/cases/${id}`;
      const method = isNew ? "post" : "put";
      await axios({
        method,
        url,
        data: payload,
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate("/mytransactions");
    } catch (err) {
      console.error("❌ Save error:", err?.response || err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Server error while saving. Please check dates.";
      setSaveError(apiMsg);
      alert(apiMsg);
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

        {saveError && <div style={styles.error}>{saveError}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {sections.map((sec) => (
            <section key={sec.title} style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionIcon}>{sec.icon}</span>
                <h2 style={styles.sectionTitle}>{sec.title}</h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${sec.cols}, 1fr)`,
                  gap: 16,
                  marginTop: 12,
                }}
              >
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
    backgroundColor: COLORS.gray,
    borderRadius: 18,
    padding: 28,
    maxWidth: 1100,
    width: "100%",
    boxShadow: "9px 9px 18px #d6d7da, -9px -9px 18px #ffffff",
    zIndex: 1,
  },
  backBtn: {
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.blue})`,
    color: COLORS.white,
    border: "none",
    padding: "8px 14px",
    borderRadius: 12,
    cursor: "pointer",
    marginBottom: 10,
    fontWeight: 700,
  },
  title: { color: COLORS.primary, fontSize: 32, margin: "6px 0 4px", fontWeight: 900, letterSpacing: 0.3 },
  subtitle: { color: COLORS.primary, fontSize: 15, margin: 0, opacity: 0.8 },
  form: { display: "flex", flexDirection: "column", gap: 18, marginTop: 10 },

  section: {
    padding: 14,
    borderRadius: 14,
    background: COLORS.gray,
    boxShadow: "inset 3px 3px 7px #d2d3d6, inset -3px -3px 7px #ffffff",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.blue})`,
    padding: "8px 12px",
    borderRadius: 10,
  },
  sectionIcon: { fontSize: 18, color: COLORS.white, lineHeight: 1 },
  sectionTitle: { color: COLORS.white, fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: 0.4 },

  fieldWrap: {
    padding: 10,
    borderRadius: 12,
    background: COLORS.white,
    boxShadow: "inset 3px 3px 7px #dfe0e3, inset -3px -3px 7px #ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  field: { display: "flex", flexDirection: "column", gap: 8 },

  // GOLD sub-heading chips (square-ish corners to match cards)
  subLabel: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.4,
    padding: "6px 12px",
    backgroundColor: COLORS.accent,
    color: COLORS.blue,
    borderRadius: 10,
    width: "fit-content",
    boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
    textTransform: "uppercase",
  },

  input: {
    marginTop: 6,
    padding: "12px 14px",
    border: "none",
    borderRadius: 12,
    background: COLORS.gray,
    boxShadow: "inset 3px 3px 6px #d2d3d6, inset -3px -3px 6px #ffffff",
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.blue,
    outline: "none",
  },
  textarea: {
    marginTop: 6,
    padding: "12px 14px",
    border: "none",
    borderRadius: 12,
    background: COLORS.gray,
    boxShadow: "inset 3px 3px 6px #d2d3d6, inset -3px -3px 6px #ffffff",
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.blue,
    minHeight: 120,
    outline: "none",
    lineHeight: 1.45,
  },
  select: {
    padding: "12px 14px",
    border: "none",
    borderRadius: 12,
    background: COLORS.gray,
    boxShadow: "inset 3px 3px 6px #d2d3d6, inset -3px -3px 6px #ffffff",
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.blue,
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
    background: COLORS.gray,
    boxShadow: "inset 3px 3px 6px #d2d3d6, inset -3px -3px 6px #ffffff",
    fontSize: 15,
    fontWeight: 800,
    color: COLORS.blue,
    userSelect: "none",
  },

  resetBtn: {
    fontSize: 12,
    background: "none",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    padding: "4px 8px",
    cursor: "pointer",
    color: COLORS.blue,
    fontWeight: 700,
  },

  saveBtn: {
    alignSelf: "flex-end",
    padding: "12px 22px",
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.blue})`,
    color: COLORS.white,
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
  },

  error: {
    margin: "10px 0",
    padding: "10px 12px",
    borderRadius: 10,
    background: "#fff3cd",
    color: "#664d03",
    border: "1px solid #ffecb5",
    fontWeight: 700,
  },

  loading: { textAlign: "center", padding: 40, fontSize: 18, color: COLORS.blue },
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
