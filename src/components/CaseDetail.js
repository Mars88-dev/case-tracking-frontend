// src/components/CaseDetail.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const BASE_URL = "https://case-tracking-backend.onrender.com";
const COLORS = {
  primary: "#142a4f",
  accent: "#d2ac68",
  background: "#f5f5f5",
  white: "#ffff",
  gray: "#f9fafb",
  border: "#cbd5e1",
  gold: "#d2ac68",
  blue: "#142a4f"
};
const DATE_OPTIONS = ["N/A", "Partly", "Requested"];

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
  "hoaCertificate"
];

TRANSFER_ITEMS.forEach(item => {
  initialForm[`${item}Requested`] = "";
  initialForm[`${item}Received`] = "";
});

const ColorInput = ({ name, value, onChange }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
    <input
      type="color"
      name={`colors.${name}`}
      value={value || "#ffffff"}
      onChange={e => onChange({ target: { name: `colors.${name}`, value: e.target.value } })}
      style={{ border: "none", background: "transparent" }}
    />
    <button
      type="button"
      onClick={() => onChange({ target: { name: `colors.${name}`, value: "" } })}
      style={{ fontSize: 12, background: "none", border: "1px solid #ccc", borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}
    >
      Reset
    </button>
  </div>
);

const Input = ({ label, name, value, onChange, color, type = "text" }) => (
  <div style={{ ...styles.field, backgroundColor: color }}>
    <label style={styles.label}>{label}</label>
    {type === "textarea" ? (
      <textarea
        name={name}
        value={value || ""}
        onChange={onChange}
        style={styles.textarea}
      />
    ) : (
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        style={styles.input}
      />
    )}
    <ColorInput name={name} value={color} onChange={onChange} />
  </div>
);

const DateSelect = ({ label, name, value, onChange, color, pureDate = false }) => {
  // Normalize value to YYYY-MM-DD if it's a full ISO string (for display after fetch)
  let displayValue = value;
  if (typeof value === 'string' && value.includes('T')) {
    displayValue = value.split('T')[0];
  }
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(displayValue);

  return (
    <div style={{ ...styles.field, backgroundColor: color }}>
      <div style={styles.subLabel}>{label}</div>
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
            {DATE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        )}
      </div>
      <ColorInput name={name} value={color} onChange={onChange} />
    </div>
  );
};

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (!isNew) {
      const token = localStorage.getItem("token");
      axios.get(`${BASE_URL}/api/cases/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          // Normalize all date fields from ISO to YYYY-MM-DD for display
          const normalizedData = { ...res.data };
          const dateFields = Object.keys(normalizedData).filter(k => k.toLowerCase().includes("date") || k === "instructionReceived");
          dateFields.forEach(field => {
            if (typeof normalizedData[field] === 'string' && normalizedData[field].includes('T')) {
              normalizedData[field] = normalizedData[field].split('T')[0];
            }
          });
          setForm(normalizedData);
          setLoading(false);
        })
        .catch(console.error);
    }
  }, [id, isNew]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("colors.")) {
      const fieldName = name.split(".")[1];
      setForm(prev => ({ ...prev, colors: { ...prev.colors, [fieldName]: value } }));
    } else if (type === "checkbox") {
      setForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const url = isNew ? `${BASE_URL}/api/cases` : `${BASE_URL}/api/cases/${id}`;
    try {
      const token = localStorage.getItem("token");
      const cfg = { headers: { Authorization: `Bearer ${token}` } };

      const formatDateToISO = (str) => {
        if (!str || typeof str !== "string" || DATE_OPTIONS.includes(str)) return str; // Skip non-date options like "N/A"
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) { // Old DD/MM/YYYY format
          const [day, month, year] = str.split("/");
          return new Date(`${year}-${month}-${day}`).toISOString().split('T')[0]; // Convert to YYYY-MM-DD
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) { // Already YYYY-MM-DD from calendar
          return str;
        }
        return str; // Fallback for other cases
      };

      const dataToSave = { ...form };
      const dateFields = Object.keys(dataToSave).filter(k => k.toLowerCase().includes("date") || k === "instructionReceived"); // Explicitly include instructionReceived
      dateFields.forEach(field => {
        dataToSave[field] = formatDateToISO(dataToSave[field]);
      });

      if (isNew) {
        dataToSave.date = new Date().toISOString();
      }

      console.log("✅ Data to save:", dataToSave); // Debug: Check this in browser console before sending
      const response = await axios({ method: isNew ? "post" : "put", url, data: dataToSave, ...cfg });
      console.log("✅ Save response:", response.data);
      navigate("/mytransactions");
    } catch (err) {
      console.error("❌ Save error:", err.response || err);
      alert(err.response?.data?.message || "Error saving transaction");
    }
  };

  if (loading) return <div style={styles.loading}>Loading…</div>;

  const sections = [
    {
      title: "Information",
      icon: "📝",
      cols: 3,
      fields: [
        { label: "Reference", name: "reference" },
        { label: "Instruction Received", name: "instructionReceived", type: "date", pureDate: true }, // pureDate: true to remove select options
        { label: "Parties", name: "parties" },
        { label: "Agency", name: "agency" },
        { label: "Purchase Price", name: "purchasePrice" },
        { label: "Agent", name: "agent" },
        { label: "Property", name: "property" },
        { label: "Active Case?", name: "isActive", type: "checkbox" }
      ]
    },
    {
      title: "Financials",
      icon: "💰",
      cols: 3,
      fields: [
        { label: "Deposit Amount", name: "depositAmount" },
        { label: "Deposit Due", name: "depositDueDate", type: "date" },
        { label: "Deposit Fulfilled", name: "depositFulfilledDate", type: "date" },
        { label: "Bond Amount", name: "bondAmount" },
        { label: "Bond Due", name: "bondDueDate", type: "date" },
        { label: "Bond Fulfilled", name: "bondFulfilledDate", type: "date" }
      ]
    },
    {
      title: "Transfer Process",
      icon: "🔄",
      cols: 2,
      fields: TRANSFER_ITEMS.flatMap(item => ([
        { label: `${item === 'electricalComplianceCertificate' ? 'COC ELECTRICAL COMPLIANCE CERTIFICATE' : item.replace(/([A-Z])/g, ' $1').toUpperCase()} - REQUESTED`, name: `${item}Requested`, type: "date" },
        { label: `${item === 'electricalComplianceCertificate' ? 'COC ELECTRICAL COMPLIANCE CERTIFICATE' : item.replace(/([A-Z])/g, ' $1').toUpperCase()} - RECEIVED`, name: `${item}Received`, type: "date" }
      ]))
    },
    {
      title: "Transfer Documents Signed",
      icon: "✍️",
      cols: 2,
      fields: [
        { label: "Seller Signed", name: "transferSignedSellerDate", type: "date" },
        { label: "Purchaser Signed", name: "transferSignedPurchaserDate", type: "date" }
      ]
    },
    {
      title: "Deeds Office Process",
      icon: "🏛️",
      cols: 3,
      fields: [
        { label: "Docs Lodged", name: "documentsLodgedDate", type: "date" },
        { label: "Deeds Prep", name: "deedsPrepDate", type: "date" },
        { label: "Registration", name: "registrationDate", type: "date" }
      ]
    },
    {
      title: "Comments",
      icon: "✏️",
      cols: 1,
      fields: [
        { label: "Comments", name: "comments", type: "textarea" }
      ]
    }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.animatedBackground}></div>
      <div style={styles.formCard}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>
        <h1 style={styles.title}>{isNew ? "New" : "Edit"} Transaction</h1>
        <p style={styles.subtitle}>Fill in the details below</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          {sections.map(sec => (
            <div key={sec.title} style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionIcon}>{sec.icon}</span>
                <h2 style={styles.sectionTitle}>{sec.title}</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sec.cols}, 1fr)`, gap: 16, marginTop: 12 }}>
                {sec.fields.map(field => (
                  field.type === 'date'
                    ? <DateSelect key={field.name} {...field} value={form[field.name]} color={form.colors?.[field.name]} onChange={handleChange} />
                    : <Input key={field.name} {...field} value={form[field.name]} color={form.colors?.[field.name]} onChange={handleChange} />
                ))}
              </div>
            </div>
          ))}
          <button type="submit" style={styles.saveBtn}>Save Transaction</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    position: "relative",
    overflow: "hidden",
    fontFamily: "Arial, sans-serif",
    padding: 20
  },
  animatedBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 50%, ${COLORS.primary} 100%)`,
    opacity: 0.1,
    animation: "gradientMove 15s ease infinite",
    backgroundSize: "200% 200%"
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 40,
    maxWidth: 1000,
    width: "100%",
    boxShadow: '6px 6px 12px #c8c9cc, -6px -6px 12px #ffffff', // Neumorphic card
    zIndex: 1,
    textAlign: "center"
  },
  backBtn: {
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
    color: COLORS.white,
    border: "none",
    padding: "8px 14px",
    borderRadius: 12,
    cursor: "pointer",
    marginBottom: 16,
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    ':hover': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86', transform: 'translateY(2px)' }
  },
  title: {
    color: COLORS.primary,
    fontSize: 28,
    marginBottom: 8
  },
  subtitle: {
    color: COLORS.primary,
    fontSize: 16,
    marginBottom: 24,
    opacity: 0.8
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 24
  },
  section: {
    padding: 16,
    borderRadius: 12,
    background: COLORS.gray,
    boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff' // Neumorphic section
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.gold})`, // Gold header
    padding: '6px 12px',
    borderRadius: 8,
    marginBottom: 12,
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff'
  },
  sectionIcon: { marginRight: 8, fontSize: 18, color: COLORS.primary },
  sectionTitle: { color: COLORS.primary, fontSize: 18, fontWeight: 600 },
  field: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: 14, color: COLORS.primary, marginBottom: 6 },
  subLabel: { fontSize: 13, fontWeight: 600, padding: '4px 8px', backgroundColor: COLORS.primary, color: COLORS.white, borderRadius: 4, marginBottom: 6, textAlign: 'center' }, // Blue sub headers restored
  input: {
    padding: 12,
    border: "none",
    borderRadius: 12,
    background: COLORS.background,
    boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff', // Inset neumorphic
    fontSize: 16,
    transition: 'box-shadow 0.3s ease',
    ':focus': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86' } // Gold focus glow
  },
  textarea: {
    padding: 12,
    border: "none",
    borderRadius: 12,
    background: COLORS.background,
    boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff',
    fontSize: 16,
    minHeight: 100,
    transition: 'box-shadow 0.3s ease',
    ':focus': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86' }
  },
  select: {
    padding: 12,
    border: "none",
    borderRadius: 12,
    background: COLORS.background,
    boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff',
    fontSize: 16,
    transition: 'box-shadow 0.3s ease',
    ':focus': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86' }
  },
  dateRow: { display: 'flex', gap: 12 },
  saveBtn: {
    alignSelf: 'flex-end',
    padding: "12px 24px",
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.primary})`,
    color: COLORS.white,
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    cursor: "pointer",
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    ':hover': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86', transform: 'translateY(2px)' }
  },
  loading: { textAlign: 'center', padding: 40, fontSize: 18 }
};

// Add this to your global CSS or inline (for animation)
const keyframes = `@keyframes gradientMove {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}`;
document.head.insertAdjacentHTML("beforeend", `<style>${keyframes}</style>`);