// src/pages/BondTransferCalculator.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FaBalanceScale,
  FaCalculator,
  FaChevronDown,
  FaChevronUp,
  FaClipboardList,
  FaEllipsisV,
  FaFilePdf,
  FaInfoCircle,
  FaPlus,
  FaRegBookmark,
  FaRegFileAlt,
  FaTrash,
  FaUniversity,
  FaUndo,
} from "react-icons/fa";

const API_BASE_URL =
  process.env.REACT_APP_BASE_URL || "https://case-tracking-backend.onrender.com";

const DISCLAIMER =
  "This is an estimate only. Final account may vary according to SARS, Deeds Office, bank, municipality, levy, HOA, pro-rata rates/taxes, document generation, clearance and other third-party requirements applicable to the matter.";

const emptyForm = {
  clientName: "",
  propertyDescription: "",
  purchasePrice: "",
  bondAmount: "",
  depositAmount: "",
  vatTransaction: false,
  purchasePriceIncludesVat: true,
  transferDutyApplicable: true,
  includeTransfer: true,
  includeBond: true,
  notes: "",
};

const defaultExtras = {
  transfer: [],
  bond: [],
};

const formatRand = (value, prefix = "R ") =>
  `${prefix}${new Intl.NumberFormat("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))}`;

const parseMoneyInput = (value) => {
  const cleaned = String(value ?? "").replace(/[^0-9.]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const cssVar = (name, fallback = "#142a4f") => {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name)?.trim() || fallback;
};

const hexToRgb = (hex) => {
  const safe = String(hex || "#142a4f").replace("#", "");
  const full = safe.length === 3 ? safe.split("").map((c) => c + c).join("") : safe;
  const bigint = parseInt(full, 16);
  if (Number.isNaN(bigint)) return [20, 42, 79];
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

const loadFirstImage = async (candidates) => {
  for (const src of candidates) {
    const variants = [src, `${src}.jpg`, `${src}.png`, `${src}.jpeg`];
    for (const path of variants) {
      // eslint-disable-next-line no-await-in-loop
      const loaded = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            resolve({
              dataURL: canvas.toDataURL("image/jpeg", 0.94),
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = path;
      });
      if (loaded) return loaded;
    }
  }
  return null;
};

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normaliseExtraList(list) {
  return (Array.isArray(list) ? list : []).map((entry, index) => ({
    key: entry?.key || `extra-${index}`,
    label: entry?.label || "Extra allowance",
    amount: Number(entry?.amount || 0),
    vatApplicable: !!entry?.vatApplicable,
    enabled: entry?.enabled !== false,
  }));
}

export default function BondTransferCalculator() {
  const [form, setForm] = useState(emptyForm);
  const [settings, setSettings] = useState(null);
  const [transferExtras, setTransferExtras] = useState(defaultExtras.transfer);
  const [bondExtras, setBondExtras] = useState(defaultExtras.bond);
  const [adminTransferExtras, setAdminTransferExtras] = useState(defaultExtras.transfer);
  const [adminBondExtras, setAdminBondExtras] = useState(defaultExtras.bond);
  const [adminNotes, setAdminNotes] = useState("");
  const [user, setUser] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [breakdownOpen, setBreakdownOpen] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const buildPayload = useCallback(
    (extra = {}) => ({
      ...form,
      ...extra,
      purchasePrice: parseMoneyInput(form.purchasePrice),
      bondAmount: parseMoneyInput(form.bondAmount),
      depositAmount: parseMoneyInput(form.depositAmount),
      transferExtras,
      bondExtras,
    }),
    [form, transferExtras, bondExtras]
  );

  const fetchHistory = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/calculator/quotes`, {
        headers: authHeaders(),
      });
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Could not load calculator history:", err);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const [meRes, settingsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/users/me`, { headers: authHeaders() }),
        axios.get(`${API_BASE_URL}/api/calculator/settings`, { headers: authHeaders() }),
      ]);

      const nextSettings = settingsRes.data || {};
      setUser(meRes.data || null);
      setSettings(nextSettings);

      const nextTransfer = normaliseExtraList(nextSettings?.extras?.transfer);
      const nextBond = normaliseExtraList(nextSettings?.extras?.bond);
      setTransferExtras(nextTransfer);
      setBondExtras(nextBond);
      setAdminTransferExtras(nextTransfer);
      setAdminBondExtras(nextBond);
      setAdminNotes(nextSettings?.notes || "");
    } catch (err) {
      console.error("Could not load calculator settings:", err);
      setError("Calculator settings could not be loaded. Please check that the backend has deployed.");
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchHistory();
  }, [fetchSettings, fetchHistory]);

  const calculateNow = useCallback(
    async (payloadOverride = {}) => {
      const payload = buildPayload(payloadOverride);
      if (!payload.purchasePrice && !payload.bondAmount) {
        setResult(null);
        return null;
      }

      setLoading(true);
      setError("");
      try {
        const res = await axios.post(`${API_BASE_URL}/api/calculator/calculate`, payload, {
          headers: authHeaders(),
        });
        setResult(res.data);
        return res.data;
      } catch (err) {
        console.error("Calculator failed:", err);
        setError(err?.response?.data?.message || "The estimate could not be calculated.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [buildPayload]
  );

  useEffect(() => {
    const payload = buildPayload();
    if (!payload.purchasePrice && !payload.bondAmount) {
      setResult(null);
      return undefined;
    }

    const timer = setTimeout(() => {
      calculateNow();
    }, 350);

    return () => clearTimeout(timer);
  }, [buildPayload, calculateNow]);

  const updateForm = (field, value) => {
    setSuccess("");
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "vatTransaction" && value) {
        next.transferDutyApplicable = false;
      }
      if (field === "transferDutyApplicable" && value) {
        next.vatTransaction = false;
      }
      return next;
    });
  };

  const updateExtra = (section, index, patch, adminMode = false) => {
    const setter = adminMode
      ? section === "transfer"
        ? setAdminTransferExtras
        : setAdminBondExtras
      : section === "transfer"
      ? setTransferExtras
      : setBondExtras;

    setter((current) =>
      current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
    );
  };

  const addExtra = (section, adminMode = false) => {
    const setter = adminMode
      ? section === "transfer"
        ? setAdminTransferExtras
        : setAdminBondExtras
      : section === "transfer"
      ? setTransferExtras
      : setBondExtras;

    setter((current) => [
      ...current,
      {
        key: `custom-${section}-${Date.now()}`,
        label: "Custom allowance",
        amount: 0,
        vatApplicable: false,
        enabled: true,
      },
    ]);
  };

  const removeExtra = (section, index, adminMode = false) => {
    const setter = adminMode
      ? section === "transfer"
        ? setAdminTransferExtras
        : setAdminBondExtras
      : section === "transfer"
      ? setTransferExtras
      : setBondExtras;

    setter((current) => current.filter((_, i) => i !== index));
  };

  const resetToFirmDefaults = () => {
    const nextTransfer = normaliseExtraList(settings?.extras?.transfer);
    const nextBond = normaliseExtraList(settings?.extras?.bond);
    setTransferExtras(nextTransfer);
    setBondExtras(nextBond);
  };

  const saveAdminSettings = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/calculator/settings`,
        {
          name: settings?.name || "GBA Conveyancing Tariff - July 2026",
          vatRate: settings?.vatRate || 0.15,
          extras: {
            transfer: adminTransferExtras,
            bond: adminBondExtras,
          },
          notes: adminNotes,
        },
        { headers: authHeaders() }
      );

      setSettings(res.data);
      const nextTransfer = normaliseExtraList(res.data?.extras?.transfer);
      const nextBond = normaliseExtraList(res.data?.extras?.bond);
      setTransferExtras(nextTransfer);
      setBondExtras(nextBond);
      setAdminTransferExtras(nextTransfer);
      setAdminBondExtras(nextBond);
      setSuccess("Calculator settings saved. New estimates now use the updated firm allowances.");
    } catch (err) {
      console.error("Admin settings save failed:", err);
      setError(err?.response?.data?.message || "Calculator settings could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const saveQuote = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const latest = result || (await calculateNow());
      if (!latest) {
        setError("Please enter a purchase price or bond amount before saving the estimate.");
        return;
      }
      const payload = buildPayload({ estimateNumber: latest.estimateNumber });
      const res = await axios.post(`${API_BASE_URL}/api/calculator/quotes`, payload, {
        headers: authHeaders(),
      });
      setHistory((current) => [res.data, ...current].slice(0, 30));
      setSuccess("Estimate saved to calculator history.");
    } catch (err) {
      console.error("Quote save failed:", err);
      setError(err?.response?.data?.message || "Estimate could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const deleteQuote = async (quoteId) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/calculator/quotes/${quoteId}`, {
        headers: authHeaders(),
      });
      setHistory((current) => current.filter((quote) => quote._id !== quoteId));
    } catch (err) {
      console.error("Quote delete failed:", err);
      setError(err?.response?.data?.message || "Estimate could not be deleted.");
    }
  };

  const loadQuote = (quote) => {
    const inputs = quote?.result?.inputs || quote?.inputs || {};
    setForm({
      ...emptyForm,
      ...inputs,
      purchasePrice: inputs.purchasePrice ? String(inputs.purchasePrice) : "",
      bondAmount: inputs.bondAmount ? String(inputs.bondAmount) : "",
      depositAmount: inputs.depositAmount ? String(inputs.depositAmount) : "",
    });
    setTransferExtras(normaliseExtraList(inputs.transferExtras));
    setBondExtras(normaliseExtraList(inputs.bondExtras));
    setResult(quote?.result || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const makePDF = async (source = result) => {
    const latest = source || (await calculateNow());
    if (!latest) {
      setError("Please calculate an estimate before exporting the PDF.");
      return;
    }

    const primaryHex = cssVar("--color-primary", "#142a4f");
    const accentHex = cssVar("--color-accent", "#d2ac68");
    const [pr, pg, pb] = hexToRgb(primaryHex);
    const [ar, ag, ab] = hexToRgb(accentHex);
    const header = await loadFirstImage(["/header2", "/header", "/logo"]);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 12;
    let y = 12;

    const addHeader = () => {
      if (header?.dataURL) {
        const headerH = Math.min(38, pageW * (header.height / header.width));
        doc.addImage(header.dataURL, "JPEG", 0, 0, pageW, headerH);
        doc.setDrawColor(ar, ag, ab);
        doc.setLineWidth(0.8);
        doc.line(0, headerH, pageW, headerH);
        y = headerH + 10;
      } else {
        doc.setFillColor(pr, pg, pb);
        doc.rect(0, 0, pageW, 28, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("GERHARD BARNARD INC", margin, 18);
        y = 38;
      }
    };

    const drawPageNumber = () => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(90);
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageW - margin, pageH - 7, {
        align: "right",
      });
    };

    addHeader();

    doc.setTextColor(pr, pg, pb);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Conveyancing Cost Estimate", margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setTextColor(80);
    const issued = new Date(latest.generatedAt || Date.now()).toLocaleDateString("en-GB");
    const metaRows = [
      ["Estimate", latest.estimateNumber || "Draft"],
      ["Issued", issued],
      ["Client", latest.inputs?.clientName || "Not specified"],
      ["Property", latest.inputs?.propertyDescription || "Not specified"],
      ["Tariff", latest.rate?.name || "Current active calculator rate"],
    ];

    metaRows.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(pr, pg, pb);
      doc.text(`${label}:`, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(25);
      doc.text(String(value), margin + 28, y, { maxWidth: pageW - margin * 2 - 28 });
      y += 5;
    });

    y += 3;
    autoTable(doc, {
      startY: y,
      head: [["Input", "Amount / setting"]],
      body: [
        ["Purchase price", formatRand(latest.inputs?.purchasePrice)],
        ["Bond amount", formatRand(latest.inputs?.bondAmount)],
        ["VAT/vendor sale", latest.inputs?.vatTransaction ? "Yes - transfer duty excluded" : "No"],
        ["Rateable transfer value", formatRand(latest.derived?.rateableTransferValue)],
      ],
      theme: "grid",
      margin: { left: margin, right: margin },
      styles: { fontSize: 8.5, cellPadding: 2, lineColor: 230, lineWidth: 0.1 },
      headStyles: { fillColor: [pr, pg, pb], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 58 }, 1: { halign: "right" } },
      didDrawPage: drawPageNumber,
    });

    y = doc.lastAutoTable.finalY + 6;

    const transferRows = [
      ["Conveyancing fee", formatRand(latest.transfer?.conveyancingFee), formatRand(latest.transfer?.vatOnConveyancingFee)],
      ["Deeds Office levy", formatRand(latest.transfer?.deedsOfficeLevy), "-"],
      ["Transfer duty", formatRand(latest.transfer?.transferDuty), "-"],
      ...((latest.transfer?.extras?.items || []).map((item) => [
        item.label,
        formatRand(item.amount),
        item.vatApplicable ? formatRand(item.amount * (latest.rate?.vatRate || 0.15)) : "-",
      ])),
      ["Transfer total", formatRand(latest.transfer?.total), formatRand((latest.transfer?.vatOnConveyancingFee || 0) + (latest.transfer?.extras?.vat || 0))],
    ];

    autoTable(doc, {
      startY: y,
      head: [["Transfer costs", "Amount", "VAT"]],
      body: transferRows,
      theme: "striped",
      margin: { left: margin, right: margin },
      styles: { fontSize: 8.2, cellPadding: 1.9, lineColor: 235, lineWidth: 0.1 },
      headStyles: { fillColor: [ar, ag, ab], textColor: [pr, pg, pb], fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
      didDrawPage: drawPageNumber,
    });

    y = doc.lastAutoTable.finalY + 6;

    if (latest.bond?.included) {
      const bondRows = [
        ["Bond conveyancing fee", formatRand(latest.bond?.conveyancingFee), formatRand(latest.bond?.vatOnConveyancingFee)],
        ["Deeds Office levy", formatRand(latest.bond?.deedsOfficeLevy), "-"],
        ...((latest.bond?.extras?.items || []).map((item) => [
          item.label,
          formatRand(item.amount),
          item.vatApplicable ? formatRand(item.amount * (latest.rate?.vatRate || 0.15)) : "-",
        ])),
        ["Bond total", formatRand(latest.bond?.total), formatRand((latest.bond?.vatOnConveyancingFee || 0) + (latest.bond?.extras?.vat || 0))],
      ];

      autoTable(doc, {
        startY: y,
        head: [["Bond costs", "Amount", "VAT"]],
        body: bondRows,
        theme: "striped",
        margin: { left: margin, right: margin },
        styles: { fontSize: 8.2, cellPadding: 1.9, lineColor: 235, lineWidth: 0.1 },
        headStyles: { fillColor: [pr, pg, pb], textColor: 255, fontStyle: "bold" },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
        didDrawPage: drawPageNumber,
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    if (y > pageH - 72) {
      doc.addPage();
      addHeader();
    }

    const summaryX = pageW - margin - 82;
    const summaryW = 82;
    const summaryRows = [
      ["Transfer total", latest.totals?.transferTotal],
      ["Bond total", latest.totals?.bondTotal],
      ["Total legal costs", latest.totals?.grandTotal],
    ];

    summaryRows.forEach(([label, amount], index) => {
      const isTotal = index === summaryRows.length - 1;
      doc.setFillColor(isTotal ? pr : 248, isTotal ? pg : 248, isTotal ? pb : 248);
      doc.roundedRect(summaryX, y, summaryW, 7, 2, 2, "F");
      doc.setFont("helvetica", isTotal ? "bold" : "normal");
      doc.setFontSize(isTotal ? 9 : 8.5);
      doc.setTextColor(isTotal ? 255 : 20);
      doc.text(label, summaryX + 3, y + 4.8);
      doc.text(formatRand(amount), summaryX + summaryW - 3, y + 4.8, { align: "right" });
      y += 8;
    });

    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(pr, pg, pb);
    doc.setFontSize(10);
    doc.text("Notes", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize(latest.inputs?.notes || DISCLAIMER, pageW - margin * 2), margin, y);

    drawPageNumber();
    doc.save(`${latest.estimateNumber || "GBA-Cost-Estimate"}.pdf`);
  };

  const summaryCards = useMemo(() => {
    if (!result) {
      return [
        {
          label: "Transfer total",
          value: formatRand(0),
          note: "Enter a purchase price",
          icon: "transfer",
        },
        {
          label: "Bond total",
          value: formatRand(0),
          note: "Optional bond estimate",
          icon: "bond",
        },
        {
          label: "Total legal costs",
          value: formatRand(0),
          note: "Transfer + bond costs only",
          icon: "legal",
        },
      ];
    }

    return [
      {
        label: "Transfer total",
        value: formatRand(result.totals?.transferTotal),
        note: "Tariff + duty + firm allowances",
        icon: "transfer",
      },
      {
        label: "Bond total",
        value: formatRand(result.totals?.bondTotal),
        note: result.bond?.included ? "Bond registration estimate" : "No bond included",
        icon: "bond",
      },
      {
        label: "Total legal costs",
        value: formatRand(result.totals?.grandTotal),
        note: "Transfer + bond costs only",
        icon: "legal",
      },
    ];
  }, [result]);

  const liveVatRate = Math.round((result?.rate?.vatRate || settings?.vatRate || 0.15) * 100);

  return (
    <div style={styles.container}>
      <header style={styles.heroBanner}>
        <div style={styles.heroTexture} />
        <div style={styles.heroContent}>
          <div style={styles.heroCopy}>
            <span style={styles.eyebrow}>Advanced cost engine</span>
            <h1 style={styles.title}>Conveyancing Cost Calculator</h1>
            <p style={styles.subtitle}>
              Current SARS transfer duty, July 2026 transfer and bond tariff logic, editable firm allowances, saved quote history and branded PDF exports.
            </p>
          </div>

          <div style={styles.heroActions}>
            <button style={styles.heroPrimaryButton} onClick={() => calculateNow()} disabled={loading}>
              <FaCalculator /> {loading ? "Calculating..." : "Calculate"}
            </button>
            <button style={styles.heroGhostButton} onClick={() => makePDF()} disabled={!result && loading}>
              <FaFilePdf /> Export PDF
            </button>
            <button style={styles.heroGhostButton} onClick={saveQuote} disabled={saving || !result}>
              <FaRegBookmark /> {saving ? "Saving..." : "Save estimate"}
            </button>
          </div>
        </div>
      </header>

      {error && <div style={styles.errorBox}>{error}</div>}
      {success && <div style={styles.successBox}>{success}</div>}

      <section className="gba-calculator-summary-grid" style={styles.summaryGrid} aria-label="Calculator totals">
        {summaryCards.map((card) => (
          <article key={card.label} style={styles.summaryCard}>
            <div style={styles.summaryIcon}>{renderSummaryIcon(card.icon)}</div>
            <div>
              <span style={styles.summaryLabel}>{card.label}</span>
              <strong style={styles.summaryValue}>{card.value}</strong>
              <small style={styles.summaryNote}>{card.note}</small>
            </div>
          </article>
        ))}
      </section>

      <div className="gba-calculator-content-grid" style={styles.contentGrid}>
        <div style={styles.leftColumn}>
          <section style={styles.panel}>
            <div style={styles.panelHeader}>
              <div style={styles.panelTitleWrap}>
                <FaRegFileAlt />
                <h2 style={styles.panelTitle}>1. Matter Inputs</h2>
              </div>
              <span style={styles.ratePill}>{settings?.name || "Loading tariff..."}</span>
            </div>

            <div className="gba-calculator-two-col" style={styles.twoCol}>
              <Field label="Client / party name">
                <input className="neumo-input" value={form.clientName} onChange={(e) => updateForm("clientName", e.target.value)} placeholder="e.g. Coetzee / Scott" />
              </Field>
              <Field label="Property / reference">
                <input className="neumo-input" value={form.propertyDescription} onChange={(e) => updateForm("propertyDescription", e.target.value)} placeholder="e.g. ERF 517 West Park" />
              </Field>
              <Field label="Purchase price">
                <input className="neumo-input" inputMode="decimal" value={form.purchasePrice} onChange={(e) => updateForm("purchasePrice", e.target.value)} placeholder="e.g. 1 800 000,00" />
              </Field>
              <Field label="Bond amount">
                <input className="neumo-input" inputMode="decimal" value={form.bondAmount} onChange={(e) => updateForm("bondAmount", e.target.value)} placeholder="e.g. 1 200 000,00" />
              </Field>
              <Field label="Internal notes for PDF" wide>
                <input className="neumo-input" value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} placeholder="Optional note for the estimate" />
              </Field>
            </div>

            <div className="gba-calculator-toggle-grid" style={styles.toggleGrid}>
              <Toggle label="Include transfer estimate" checked={form.includeTransfer} onChange={(checked) => updateForm("includeTransfer", checked)} />
              <Toggle label="Include bond estimate" checked={form.includeBond} onChange={(checked) => updateForm("includeBond", checked)} />
              <Toggle label="Transfer duty applicable" checked={form.transferDutyApplicable} onChange={(checked) => updateForm("transferDutyApplicable", checked)} />
              <Toggle label="VAT / vendor sale" checked={form.vatTransaction} onChange={(checked) => updateForm("vatTransaction", checked)} />
              <Toggle label="Purchase price includes VAT" checked={form.purchasePriceIncludesVat} disabled={!form.vatTransaction} onChange={(checked) => updateForm("purchasePriceIncludesVat", checked)} />
            </div>

            {result?.warnings?.length > 0 && (
              <div style={styles.warningBox}>
                <FaInfoCircle />
                <div>
                  {result.warnings.map((warning) => (
                    <p key={warning}>• {warning}</p>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section style={styles.panel}>
            <div style={styles.panelHeader}>
              <div style={styles.panelTitleWrap}>
                <FaBalanceScale />
                <h2 style={styles.panelTitle}>2. Optional firm allowances</h2>
              </div>
              <button style={styles.utilityButton} onClick={resetToFirmDefaults}>
                <FaUndo /> Reset all allowances
              </button>
            </div>
            <div className="gba-calculator-extras-grid" style={styles.extrasGrid}>
              <ExtrasEditor title="Transfer allowances" section="transfer" extras={transferExtras} onUpdate={updateExtra} onAdd={addExtra} onRemove={removeExtra} />
              <ExtrasEditor title="Bond allowances" section="bond" extras={bondExtras} onUpdate={updateExtra} onAdd={addExtra} onRemove={removeExtra} />
            </div>
          </section>

          <section style={styles.panel}>
            <button style={styles.foldButton} onClick={() => setBreakdownOpen((value) => !value)}>
              <span style={styles.panelTitleWrap}>
                <FaClipboardList />
                <span>3. Detailed breakdown preview</span>
              </span>
              {breakdownOpen ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            {breakdownOpen && result && (
              <div className="gba-calculator-breakdown-grid" style={styles.breakdownGrid}>
                <BreakdownCard title="Transfer calculation" rows={[
                  ["Conveyancing fee", result.transfer?.conveyancingFee],
                  ["VAT on transfer fee", result.transfer?.vatOnConveyancingFee],
                  ["Deeds Office levy", result.transfer?.deedsOfficeLevy],
                  ["Transfer duty", result.transfer?.transferDuty],
                  ["Optional allowances ex VAT", result.transfer?.extras?.exVat],
                  ["VAT on allowances", result.transfer?.extras?.vat],
                  ["Transfer total", result.transfer?.total],
                ]} />
                <BreakdownCard title="Bond calculation" rows={[
                  ["Conveyancing fee", result.bond?.conveyancingFee],
                  ["VAT on bond fee", result.bond?.vatOnConveyancingFee],
                  ["Deeds Office levy", result.bond?.deedsOfficeLevy],
                  ["Optional allowances ex VAT", result.bond?.extras?.exVat],
                  ["VAT on allowances", result.bond?.extras?.vat],
                  ["Bond total", result.bond?.total],
                ]} />
              </div>
            )}
            {breakdownOpen && !result && (
              <p style={styles.emptyState}>Enter a purchase price or bond amount to preview the detailed calculation.</p>
            )}
          </section>

          {user?.isAdmin && (
            <section style={styles.panel}>
              <button style={styles.foldButton} onClick={() => setSettingsOpen((value) => !value)}>
                <span style={styles.panelTitleWrap}>
                  <FaUniversity />
                  <span>Admin calculator settings</span>
                </span>
                {settingsOpen ? <FaChevronUp /> : <FaChevronDown />}
              </button>
              {settingsOpen && (
                <div style={{ marginTop: 14 }}>
                  <p style={styles.mutedText}>
                    These settings update the firm allowance defaults. The core SARS duty table, conveyancing fee formula and Deeds Office levy bands remain locked to the active July 2026 tariff service until you deliberately add a new tariff version.
                  </p>
                  <Field label="Admin notes">
                    <textarea className="neumo-input" style={styles.textarea} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
                  </Field>
                  <div className="gba-calculator-extras-grid" style={styles.extrasGrid}>
                    <ExtrasEditor title="Default transfer allowances" section="transfer" extras={adminTransferExtras} onUpdate={updateExtra} onAdd={addExtra} onRemove={removeExtra} adminMode />
                    <ExtrasEditor title="Default bond allowances" section="bond" extras={adminBondExtras} onUpdate={updateExtra} onAdd={addExtra} onRemove={removeExtra} adminMode />
                  </div>
                  <button className="neumo-button" style={{ marginTop: 12 }} onClick={saveAdminSettings} disabled={saving}>
                    {saving ? "Saving settings..." : "Save calculator defaults"}
                  </button>
                </div>
              )}
            </section>
          )}

          <section style={styles.panel}>
            <button style={styles.foldButton} onClick={() => setHistoryOpen((value) => !value)}>
              <span style={styles.panelTitleWrap}>
                <FaRegBookmark />
                <span>Saved estimate history</span>
              </span>
              {historyOpen ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            {historyOpen && (
              <div style={styles.historyList}>
                {!history.length && <p style={styles.emptyState}>No saved calculator estimates yet.</p>}
                {history.map((quote) => (
                  <article key={quote._id} style={styles.historyCard}>
                    <div>
                      <strong style={styles.historyNumber}>{quote.estimateNumber}</strong>
                      <p style={styles.historyMeta}>
                        {(quote.clientName || "No client")} • {(quote.propertyDescription || "No property")} • {new Date(quote.createdAt).toLocaleDateString("en-GB")}
                      </p>
                      <p style={styles.historyMeta}>
                        Total legal costs: <b>{formatRand(quote.result?.totals?.grandTotal)}</b>
                      </p>
                    </div>
                    <div style={styles.historyActions}>
                      <button style={styles.utilityButton} onClick={() => loadQuote(quote)}>Load</button>
                      <button style={styles.utilityButton} onClick={() => makePDF(quote.result)}>PDF</button>
                      <button style={styles.dangerButton} onClick={() => deleteQuote(quote._id)}>
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="gba-calculator-right-column" style={styles.rightColumn}>
          <section style={styles.liveSummaryCard}>
            <div style={styles.liveHeader}>
              <h2 style={styles.liveTitle}>Live summary</h2>
              <span style={styles.vatPill}>VAT {liveVatRate}%</span>
            </div>

            <SummaryRow label="Rateable transfer value" value={formatRand(result?.derived?.rateableTransferValue)} />
            <SummaryRow label="Transfer duty" value={formatRand(result?.transfer?.transferDuty)} />
            <SummaryRow label="Transfer tariff subtotal" value={formatRand(result?.transfer?.tariffSubtotal)} />
            <SummaryRow label="Transfer extras (incl. VAT)" value={formatRand(result?.transfer?.extras?.total)} />
            <SummaryRow label="Bond tariff subtotal" value={formatRand(result?.bond?.tariffSubtotal)} />
            <SummaryRow label="Bond extras (incl. VAT)" value={formatRand(result?.bond?.extras?.total)} />
            <div style={styles.liveDivider} />
            <div style={styles.liveTotalBox}>
              <span>Total legal costs</span>
              <strong>{formatRand(result?.totals?.grandTotal)}</strong>
            </div>
          </section>

          <section style={styles.basisCard}>
            <div style={styles.basisIcon}>ℹ</div>
            <div>
              <strong>Calculation basis</strong>
              <p>
                Transfer and bond tariff subtotals use conveyancing fees, VAT and Deeds Office levy. Transfer duty is then added for non-VAT transactions. Firm allowances are separated so the estimate stays transparent.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function renderSummaryIcon(icon) {
  if (icon === "bond") return <FaUniversity />;
  if (icon === "legal") return <FaBalanceScale />;
  return <FaRegFileAlt />;
}

function Field({ label, children, wide = false }) {
  return (
    <label style={{ ...styles.field, ...(wide ? styles.fieldWide : null) }}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange, disabled = false }) {
  return (
    <label style={{ ...styles.toggle, opacity: disabled ? 0.55 : 1 }}>
      <input style={styles.hiddenCheckbox} type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span style={styles.toggleBox}>{checked ? "✓" : ""}</span>
      <span>{label}</span>
    </label>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={styles.summaryRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ExtrasEditor({ title, section, extras, onUpdate, onAdd, onRemove, adminMode = false }) {
  return (
    <div style={styles.extraPanel}>
      <div style={styles.extraHeader}>
        <h3 style={styles.extraTitle}>{title}</h3>
        <button style={styles.addItemButton} onClick={() => onAdd(section, adminMode)}>
          <FaPlus /> Add item
        </button>
      </div>
      <div style={styles.extraRows}>
        {extras.map((item, index) => (
          <div key={`${item.key}-${index}`} style={styles.extraRow}>
            <input type="checkbox" checked={item.enabled !== false} onChange={(e) => onUpdate(section, index, { enabled: e.target.checked }, adminMode)} />
            <input className="neumo-input" style={styles.extraName} value={item.label} onChange={(e) => onUpdate(section, index, { label: e.target.value }, adminMode)} />
            <input className="neumo-input" style={styles.extraAmount} inputMode="decimal" value={item.amount} onChange={(e) => onUpdate(section, index, { amount: parseMoneyInput(e.target.value) }, adminMode)} />
            <label style={styles.vatCheck}>
              <input type="checkbox" checked={!!item.vatApplicable} onChange={(e) => onUpdate(section, index, { vatApplicable: e.target.checked }, adminMode)} /> VAT
            </label>
            <button style={styles.moreButton} onClick={() => onRemove(section, index, adminMode)} title="Remove allowance">
              <FaEllipsisV />
            </button>
          </div>
        ))}
        {!extras.length && <p style={styles.emptyState}>No allowances loaded for this section.</p>}
      </div>
    </div>
  );
}

function BreakdownCard({ title, rows }) {
  return (
    <article style={styles.breakCard}>
      <h3 style={styles.extraTitle}>{title}</h3>
      {rows.map(([label, amount]) => (
        <SummaryRow key={label} label={label} value={formatRand(amount)} />
      ))}
    </article>
  );
}

const styles = {
  container: {
    minHeight: "calc(100vh - var(--topbar-height))",
    padding: "18px clamp(12px, 1.5vw, 24px) 32px",
    background: "transparent",
    color: "var(--text)",
  },
  heroBanner: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    marginBottom: 14,
    background: "linear-gradient(135deg, #071f39 0%, #0b2b4d 55%, #061c34 100%)",
    boxShadow: "0 22px 50px rgba(7, 31, 57, 0.18)",
  },
  heroTexture: {
    position: "absolute",
    inset: 0,
    opacity: 0.8,
    background:
      "radial-gradient(circle at 52% 48%, rgba(29, 123, 180, 0.24), transparent 15rem), radial-gradient(circle at 94% 20%, rgba(210, 172, 104, 0.16), transparent 12rem), repeating-radial-gradient(circle at 56% 50%, rgba(255,255,255,0.08) 0 1px, transparent 1px 10px)",
  },
  heroContent: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "minmax(280px, 1fr) minmax(360px, auto)",
    gap: 16,
    alignItems: "center",
    padding: "22px clamp(18px, 2vw, 30px)",
  },
  heroCopy: {
    maxWidth: 760,
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
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  title: {
    margin: "12px 0 8px",
    color: "#fff",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "clamp(34px, 3vw, 52px)",
    lineHeight: 0.96,
    fontWeight: 800,
    letterSpacing: -1.3,
  },
  subtitle: {
    margin: 0,
    color: "rgba(255,255,255,0.84)",
    maxWidth: 720,
    fontSize: 14,
    lineHeight: 1.5,
  },
  heroActions: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  heroPrimaryButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    minWidth: 166,
    minHeight: 54,
    padding: "0 20px",
    border: "none",
    borderRadius: 14,
    color: "#fff",
    fontSize: 16,
    fontWeight: 900,
    cursor: "pointer",
    background: "linear-gradient(135deg, #f1cf7a, #b98632 62%, #d2ac68)",
    boxShadow: "0 18px 34px rgba(126, 91, 30, 0.36), inset 0 1px 0 rgba(255,255,255,0.45)",
  },
  heroGhostButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    minWidth: 150,
    minHeight: 54,
    padding: "0 18px",
    borderRadius: 14,
    color: "#fff",
    fontSize: 15,
    fontWeight: 900,
    cursor: "pointer",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.45)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
  },
  errorBox: {
    padding: 13,
    borderRadius: 14,
    marginBottom: 12,
    background: "#fee2e2",
    color: "#7f1d1d",
    fontWeight: 850,
    border: "1px solid #fecaca",
  },
  successBox: {
    padding: 13,
    borderRadius: 14,
    marginBottom: 12,
    background: "#dcfce7",
    color: "#14532d",
    fontWeight: 850,
    border: "1px solid #bbf7d0",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(210px, 1fr))",
    gap: 14,
    margin: "0 0 16px",
  },
  summaryCard: {
    display: "grid",
    gridTemplateColumns: "64px 1fr",
    gap: 14,
    alignItems: "center",
    minHeight: 108,
    padding: "18px 20px",
    borderRadius: 18,
    background: "var(--surface)",
    border: "1px solid rgba(16, 42, 74, 0.08)",
    boxShadow: "0 16px 34px rgba(16, 42, 74, 0.09)",
  },
  summaryIcon: {
    display: "grid",
    placeItems: "center",
    width: 54,
    height: 54,
    borderRadius: "50%",
    color: "#fff",
    fontSize: 24,
    background: "linear-gradient(135deg, #102a4a, #061c34)",
    boxShadow: "0 15px 28px rgba(16,42,74,0.24)",
  },
  summaryLabel: {
    display: "block",
    color: "var(--text)",
    fontWeight: 700,
    marginBottom: 8,
  },
  summaryValue: {
    display: "block",
    color: "var(--color-primary)",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "clamp(26px, 2vw, 34px)",
    lineHeight: 1,
    letterSpacing: -0.6,
  },
  summaryNote: {
    display: "block",
    marginTop: 9,
    color: "var(--muted)",
    fontSize: 13,
    fontWeight: 700,
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 400px)",
    gap: 16,
    alignItems: "start",
  },
  leftColumn: {
    display: "grid",
    gap: 12,
  },
  rightColumn: {
    position: "sticky",
    top: "calc(var(--topbar-height) + 18px)",
    display: "grid",
    gap: 12,
  },
  panel: {
    padding: "18px 22px",
    borderRadius: 18,
    background: "var(--surface)",
    border: "1px solid rgba(16, 42, 74, 0.08)",
    boxShadow: "0 16px 34px rgba(16, 42, 74, 0.08)",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 17,
  },
  panelTitleWrap: {
    display: "inline-flex",
    alignItems: "center",
    gap: 11,
    color: "var(--color-primary)",
    fontWeight: 950,
  },
  panelTitle: {
    margin: 0,
    color: "var(--color-primary)",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 22,
    fontWeight: 850,
  },
  ratePill: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "0 14px",
    background: "rgba(16, 42, 74, 0.07)",
    color: "var(--color-primary)",
    fontWeight: 900,
    fontSize: 12,
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "13px 20px",
  },
  field: {
    display: "grid",
    gap: 7,
    minWidth: 0,
  },
  fieldWide: {
    gridColumn: "1 / -1",
  },
  label: {
    fontWeight: 900,
    fontSize: 13,
    color: "var(--color-primary)",
  },
  textarea: {
    minHeight: 90,
    resize: "vertical",
  },
  toggleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(140px, 1fr))",
    gap: 12,
    marginTop: 17,
  },
  toggle: {
    display: "grid",
    gridTemplateColumns: "24px 1fr",
    gap: 10,
    alignItems: "center",
    minHeight: 54,
    padding: "10px 12px",
    borderRadius: 12,
    background: "linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%)",
    border: "1px solid rgba(16, 42, 74, 0.09)",
    color: "var(--color-primary)",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
  },
  hiddenCheckbox: {
    display: "none",
  },
  toggleBox: {
    display: "grid",
    placeItems: "center",
    width: 22,
    height: 22,
    borderRadius: 6,
    background: "var(--color-primary)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 950,
  },
  warningBox: {
    display: "grid",
    gridTemplateColumns: "28px 1fr",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginTop: 16,
    background: "linear-gradient(135deg, rgba(210,172,104,0.13), rgba(210,172,104,0.04))",
    color: "var(--text)",
    border: "1px solid rgba(210,172,104,0.2)",
    fontWeight: 750,
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
  summaryRow: {
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
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
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
    boxShadow: "0 18px 38px rgba(7, 31, 57, 0.18)",
  },
  basisIcon: {
    color: "#f3c86f",
    fontSize: 24,
    fontWeight: 900,
  },
  extrasGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  extraPanel: {
    minWidth: 0,
    padding: 12,
    borderRadius: 16,
    background: "linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%)",
    border: "1px solid rgba(16, 42, 74, 0.08)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
  },
  extraHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  extraTitle: {
    margin: 0,
    color: "var(--color-primary)",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 850,
    fontSize: 16,
  },
  addItemButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 29,
    padding: "0 12px",
    borderRadius: 999,
    border: "1px solid rgba(16, 42, 74, 0.14)",
    background: "var(--surface)",
    color: "var(--color-primary)",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
  },
  extraRows: {
    display: "grid",
    gap: 12,
  },
  extraRow: {
    display: "grid",
    gridTemplateColumns: "24px minmax(150px, 1fr) 110px 70px 34px",
    gap: 8,
    alignItems: "center",
  },
  extraName: {
    padding: "8px 9px",
    fontSize: 12,
    fontWeight: 750,
  },
  extraAmount: {
    padding: "8px 9px",
    textAlign: "right",
    fontSize: 12,
    fontWeight: 850,
  },
  vatCheck: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    fontWeight: 900,
    color: "var(--color-primary)",
  },
  moreButton: {
    display: "grid",
    placeItems: "center",
    width: 31,
    height: 31,
    border: "none",
    borderRadius: 10,
    background: "rgba(16, 42, 74, 0.06)",
    color: "var(--color-primary)",
    cursor: "pointer",
  },
  utilityButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 34,
    padding: "0 13px",
    borderRadius: 999,
    border: "1px solid rgba(16, 42, 74, 0.12)",
    background: "var(--surface)",
    color: "var(--color-primary)",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
  },
  dangerButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 34,
    padding: "0 13px",
    borderRadius: 999,
    border: "1px solid rgba(127,29,29,0.16)",
    background: "#fee2e2",
    color: "#7f1d1d",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
  },
  foldButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background: "transparent",
    color: "var(--color-primary)",
    border: "none",
    fontWeight: 950,
    fontSize: 18,
    cursor: "pointer",
    padding: 0,
    textAlign: "left",
  },
  breakdownGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
    marginTop: 16,
  },
  breakCard: {
    padding: 14,
    borderRadius: 16,
    background: "linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%)",
    border: "1px solid rgba(16, 42, 74, 0.08)",
  },
  mutedText: {
    color: "var(--muted)",
    lineHeight: 1.45,
  },
  emptyState: {
    margin: "12px 0 0",
    color: "var(--muted)",
    fontWeight: 750,
    lineHeight: 1.45,
  },
  historyList: {
    display: "grid",
    gap: 10,
    marginTop: 16,
  },
  historyCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    padding: 14,
    borderRadius: 16,
    background: "linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%)",
    border: "1px solid rgba(16, 42, 74, 0.08)",
  },
  historyNumber: {
    color: "var(--color-primary)",
  },
  historyMeta: {
    margin: "5px 0 0",
    color: "var(--muted)",
    fontSize: 13,
  },
  historyActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
};
