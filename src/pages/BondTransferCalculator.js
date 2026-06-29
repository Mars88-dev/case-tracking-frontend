// src/pages/BondTransferCalculator.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  const primary = "var(--color-primary)";
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
        { label: "Transfer total", value: formatRand(0), note: "Enter a purchase price" },
        { label: "Bond total", value: formatRand(0), note: "Optional bond estimate" },
        { label: "Total legal costs", value: formatRand(0), note: "Transfer + bond costs only" },
      ];
    }

    return [
      { label: "Transfer total", value: formatRand(result.totals?.transferTotal), note: "Tariff + duty + firm allowances" },
      { label: "Bond total", value: formatRand(result.totals?.bondTotal), note: result.bond?.included ? "Bond registration estimate" : "No bond included" },
      { label: "Total legal costs", value: formatRand(result.totals?.grandTotal), note: "Transfer + bond costs only" },
    ];
  }, [result]);

  return (
    <div style={styles.container}>
      <div className="neumo-surface" style={styles.shell}>
        <header style={styles.hero}>
          <div style={styles.brandBlock}>
            <img src="/logo.png" alt="Gerhard Barnard Inc" style={styles.logo} />
            <div>
              <div style={styles.eyebrow}>Advanced cost engine</div>
              <h1 style={{ ...styles.title, color: primary }}>Conveyancing Cost Calculator</h1>
              <p style={styles.subtitle}>
                Current SARS transfer duty, July 2026 transfer and bond tariff logic, editable firm allowances, saved quote history and branded PDF exports.
              </p>
            </div>
          </div>
          <div style={styles.heroActions}>
            <button className="neumo-button" style={styles.actionButton} onClick={() => calculateNow()} disabled={loading}>
              {loading ? "Calculating..." : "Calculate"}
            </button>
            <button className="neumo-button" style={styles.secondaryButton} onClick={() => makePDF()} disabled={!result && loading}>
              Export PDF
            </button>
            <button className="neumo-button" style={styles.secondaryButton} onClick={saveQuote} disabled={saving || !result}>
              {saving ? "Saving..." : "Save estimate"}
            </button>
          </div>
        </header>

        {error && <div style={styles.errorBox}>{error}</div>}
        {success && <div style={styles.successBox}>{success}</div>}

        <section style={styles.summaryGrid}>
          {summaryCards.map((card) => (
            <article key={card.label} className="neumo-surface" style={styles.summaryCard}>
              <span style={styles.summaryLabel}>{card.label}</span>
              <strong style={{ ...styles.summaryValue, color: primary }}>
                {card.value}
              </strong>
              <small style={styles.summaryNote}>{card.note}</small>
            </article>
          ))}
        </section>

        <main style={styles.mainGrid}>
          <section className="neumo-surface" style={styles.panel}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>1. Matter inputs</h2>
              <span style={styles.ratePill}>{settings?.name || "Loading tariff..."}</span>
            </div>

            <div style={styles.twoCol}>
              <Field label="Client / party name">
                <input className="neumo-input" value={form.clientName} onChange={(e) => updateForm("clientName", e.target.value)} placeholder="e.g. Coetzee / Scott" />
              </Field>
              <Field label="Property / reference">
                <input className="neumo-input" value={form.propertyDescription} onChange={(e) => updateForm("propertyDescription", e.target.value)} placeholder="e.g. ERF 517 West Park" />
              </Field>
              <Field label="Purchase price">
                <input className="neumo-input" inputMode="decimal" value={form.purchasePrice} onChange={(e) => updateForm("purchasePrice", e.target.value)} placeholder="e.g. 1500000" />
              </Field>
              <Field label="Bond amount">
                <input className="neumo-input" inputMode="decimal" value={form.bondAmount} onChange={(e) => updateForm("bondAmount", e.target.value)} placeholder="e.g. 1200000" />
              </Field>
              <Field label="Internal notes for PDF">
                <input className="neumo-input" value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} placeholder="Optional note for the estimate" />
              </Field>
            </div>

            <div style={styles.toggleGrid}>
              <Toggle label="Include transfer estimate" checked={form.includeTransfer} onChange={(checked) => updateForm("includeTransfer", checked)} />
              <Toggle label="Include bond estimate" checked={form.includeBond} onChange={(checked) => updateForm("includeBond", checked)} />
              <Toggle label="Transfer duty applicable" checked={form.transferDutyApplicable} onChange={(checked) => updateForm("transferDutyApplicable", checked)} />
              <Toggle label="VAT / vendor sale" checked={form.vatTransaction} onChange={(checked) => updateForm("vatTransaction", checked)} />
              <Toggle label="Purchase price includes VAT" checked={form.purchasePriceIncludesVat} disabled={!form.vatTransaction} onChange={(checked) => updateForm("purchasePriceIncludesVat", checked)} />
            </div>

            {result?.warnings?.length > 0 && (
              <div style={styles.warningBox}>
                {result.warnings.map((warning) => (
                  <div key={warning}>• {warning}</div>
                ))}
              </div>
            )}
          </section>

          <section className="neumo-surface" style={styles.panel}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>2. Live summary</h2>
              <span style={styles.ratePill}>VAT {Math.round((result?.rate?.vatRate || settings?.vatRate || 0.15) * 100)}%</span>
            </div>

            <SummaryRow label="Rateable transfer value" value={formatRand(result?.derived?.rateableTransferValue)} />
            <SummaryRow label="Transfer duty" value={formatRand(result?.transfer?.transferDuty)} />
            <SummaryRow label="Transfer tariff subtotal" value={formatRand(result?.transfer?.tariffSubtotal)} />
            <SummaryRow label="Transfer extras incl. VAT" value={formatRand(result?.transfer?.extras?.total)} />
            <SummaryRow label="Bond tariff subtotal" value={formatRand(result?.bond?.tariffSubtotal)} />
            <SummaryRow label="Bond extras incl. VAT" value={formatRand(result?.bond?.extras?.total)} />
            <div style={styles.rule} />
            <SummaryRow label="Total legal costs" value={formatRand(result?.totals?.grandTotal)} highlight />

            <div style={styles.explainBox}>
              <strong>Calculation basis</strong>
              <p>
                Transfer and bond tariff subtotals use conveyancing fees, VAT and Deeds Office levy. Transfer duty is then added for non-VAT transactions. Firm allowances are separated so the estimate stays transparent.
              </p>
            </div>
          </section>
        </main>

        <section className="neumo-surface" style={styles.panelWide}>
          <div style={styles.panelHeader}>
            <h2 style={styles.panelTitle}>3. Optional firm allowances</h2>
            <button className="neumo-button" style={styles.smallButton} onClick={resetToFirmDefaults}>Reset to firm defaults</button>
          </div>
          <div style={styles.extrasGrid}>
            <ExtrasEditor title="Transfer allowances" section="transfer" extras={transferExtras} onUpdate={updateExtra} onAdd={addExtra} onRemove={removeExtra} />
            <ExtrasEditor title="Bond allowances" section="bond" extras={bondExtras} onUpdate={updateExtra} onAdd={addExtra} onRemove={removeExtra} />
          </div>
        </section>

        <section className="neumo-surface" style={styles.panelWide}>
          <button style={styles.foldButton} onClick={() => setBreakdownOpen((value) => !value)}>
            {breakdownOpen ? "Hide" : "Show"} detailed calculation breakdown
          </button>
          {breakdownOpen && result && (
            <div style={styles.breakdownGrid}>
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
        </section>

        {user?.isAdmin && (
          <section className="neumo-surface" style={styles.panelWide}>
            <button style={styles.foldButton} onClick={() => setSettingsOpen((value) => !value)}>
              {settingsOpen ? "Hide" : "Show"} admin calculator settings
            </button>
            {settingsOpen && (
              <div style={{ marginTop: 14 }}>
                <p style={styles.mutedText}>
                  These settings update the firm allowance defaults. The core SARS duty table, conveyancing fee formula and Deeds Office levy bands remain locked to the active July 2026 tariff service until you deliberately add a new tariff version.
                </p>
                <Field label="Admin notes">
                  <textarea className="neumo-input" style={styles.textarea} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
                </Field>
                <div style={styles.extrasGrid}>
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

        <section className="neumo-surface" style={styles.panelWide}>
          <button style={styles.foldButton} onClick={() => setHistoryOpen((value) => !value)}>
            {historyOpen ? "Hide" : "Show"} saved estimate history
          </button>
          {historyOpen && (
            <div style={styles.historyList}>
              {!history.length && <p style={styles.mutedText}>No saved calculator estimates yet.</p>}
              {history.map((quote) => (
                <article key={quote._id} className="neumo-pressed" style={styles.historyCard}>
                  <div>
                    <strong style={{ color: primary }}>{quote.estimateNumber}</strong>
                    <p style={styles.historyMeta}>
                      {(quote.clientName || "No client")} • {(quote.propertyDescription || "No property")} • {new Date(quote.createdAt).toLocaleDateString("en-GB")}
                    </p>
                    <p style={styles.historyMeta}>
                      Total legal costs: <b>{formatRand(quote.result?.totals?.grandTotal)}</b>
                    </p>
                  </div>
                  <div style={styles.historyActions}>
                    <button className="neumo-button" style={styles.smallButton} onClick={() => loadQuote(quote)}>Load</button>
                    <button className="neumo-button" style={styles.smallButton} onClick={() => makePDF(quote.result)}>PDF</button>
                    <button className="neumo-button" style={styles.dangerButton} onClick={() => deleteQuote(quote._id)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange, disabled = false }) {
  return (
    <label style={{ ...styles.toggle, opacity: disabled ? 0.55 : 1 }}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function SummaryRow({ label, value, strong = false, highlight = false }) {
  return (
    <div style={{ ...styles.summaryRow, ...(highlight ? styles.highlightRow : null) }}>
      <span>{label}</span>
      <strong style={{ fontSize: strong || highlight ? 18 : 15 }}>{value}</strong>
    </div>
  );
}

function ExtrasEditor({ title, section, extras, onUpdate, onAdd, onRemove, adminMode = false }) {
  return (
    <div className="neumo-pressed" style={styles.extraPanel}>
      <div style={styles.extraHeader}>
        <h3 style={styles.extraTitle}>{title}</h3>
        <button className="neumo-button" style={styles.smallButton} onClick={() => onAdd(section, adminMode)}>Add item</button>
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
            <button style={styles.removeButton} onClick={() => onRemove(section, index, adminMode)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BreakdownCard({ title, rows }) {
  return (
    <article className="neumo-pressed" style={styles.breakCard}>
      <h3 style={styles.extraTitle}>{title}</h3>
      {rows.map(([label, amount]) => (
        <SummaryRow key={label} label={label} value={formatRand(amount)} />
      ))}
    </article>
  );
}

const styles = {
  container: {
    minHeight: "calc(100vh - 76px)",
    padding: 16,
    background: "var(--bg)",
    color: "var(--text)",
  },
  shell: {
    padding: "26px clamp(14px, 2vw, 28px)",
    borderRadius: 18,
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 18,
  },
  brandBlock: {
    display: "grid",
    gridTemplateColumns: "110px minmax(220px, 760px)",
    gap: 18,
    alignItems: "center",
  },
  logo: {
    width: 110,
    maxHeight: 82,
    objectFit: "contain",
  },
  eyebrow: {
    display: "inline-flex",
    background: "color-mix(in srgb, var(--color-accent) 22%, transparent)",
    color: "var(--color-primary)",
    padding: "7px 12px",
    borderRadius: 999,
    fontWeight: 900,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  title: {
    margin: 0,
    fontSize: "clamp(30px, 4vw, 52px)",
    lineHeight: 0.95,
    fontWeight: 950,
    letterSpacing: -1.4,
  },
  subtitle: {
    margin: "10px 0 0",
    color: "var(--muted)",
    fontSize: 15,
    lineHeight: 1.45,
  },
  heroActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  actionButton: { minWidth: 132 },
  secondaryButton: {
    minWidth: 118,
    background: "linear-gradient(135deg, var(--color-primary), #0d5b9f)",
  },
  smallButton: {
    padding: "8px 10px",
    fontSize: 12,
    borderRadius: 10,
  },
  dangerButton: {
    padding: "8px 10px",
    fontSize: 12,
    borderRadius: 10,
    background: "linear-gradient(135deg, #a43c3c, #4a1520)",
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    background: "#fee2e2",
    color: "#7f1d1d",
    fontWeight: 800,
  },
  successBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    background: "#dcfce7",
    color: "#14532d",
    fontWeight: 800,
  },
  warningBox: {
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
    background: "color-mix(in srgb, var(--color-accent) 20%, var(--surface) 80%)",
    color: "var(--text)",
    fontWeight: 700,
    lineHeight: 1.5,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  summaryCard: {
    padding: 18,
    borderRadius: 18,
    border: "1px solid color-mix(in srgb, var(--color-primary) 8%, transparent)",
  },
  summaryLabel: {
    display: "block",
    color: "var(--muted)",
    fontWeight: 800,
    marginBottom: 10,
  },
  summaryValue: {
    display: "block",
    fontSize: 28,
    lineHeight: 1,
    letterSpacing: -0.6,
  },
  summaryNote: {
    display: "block",
    marginTop: 8,
    color: "var(--muted)",
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 18,
    alignItems: "start",
  },
  panel: {
    padding: 18,
    borderRadius: 18,
  },
  panelWide: {
    padding: 18,
    borderRadius: 18,
    marginTop: 18,
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  panelTitle: {
    margin: 0,
    color: "var(--color-primary)",
    fontSize: 20,
    fontWeight: 950,
  },
  ratePill: {
    borderRadius: 999,
    padding: "7px 10px",
    background: "color-mix(in srgb, var(--color-primary) 10%, var(--surface) 90%)",
    color: "var(--color-primary)",
    fontWeight: 850,
    fontSize: 12,
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 12,
  },
  field: {
    display: "grid",
    gap: 6,
  },
  label: {
    fontWeight: 850,
    fontSize: 13,
    color: "var(--text)",
  },
  textarea: {
    minHeight: 90,
    resize: "vertical",
  },
  toggleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 10,
    marginTop: 14,
  },
  toggle: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 12px",
    borderRadius: 12,
    background: "color-mix(in srgb, var(--surface) 88%, var(--bg) 12%)",
    fontWeight: 850,
    boxShadow: "inset 2px 2px 5px var(--shadow-lo), inset -2px -2px 5px var(--shadow-hi)",
  },
  summaryRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "9px 10px",
    borderRadius: 12,
    marginBottom: 7,
    background: "color-mix(in srgb, var(--surface) 82%, var(--bg) 18%)",
  },
  highlightRow: {
    background: "linear-gradient(135deg, var(--color-accent), var(--color-primary))",
    color: "#fff",
    fontWeight: 950,
  },
  rule: {
    height: 1,
    margin: "9px 0",
    background: "color-mix(in srgb, var(--text) 16%, transparent)",
  },
  explainBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    background: "color-mix(in srgb, var(--color-primary) 9%, var(--surface) 91%)",
    lineHeight: 1.45,
  },
  extrasGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
    gap: 14,
  },
  extraPanel: {
    padding: 14,
    borderRadius: 16,
  },
  extraHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  extraTitle: {
    margin: 0,
    color: "var(--color-primary)",
    fontWeight: 950,
    fontSize: 16,
  },
  extraRows: {
    display: "grid",
    gap: 9,
  },
  extraRow: {
    display: "grid",
    gridTemplateColumns: "24px minmax(120px, 1fr) 110px 72px 32px",
    gap: 8,
    alignItems: "center",
  },
  extraName: {
    padding: "8px 9px",
  },
  extraAmount: {
    padding: "8px 9px",
    textAlign: "right",
  },
  vatCheck: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    fontWeight: 850,
  },
  removeButton: {
    border: "none",
    borderRadius: 9,
    height: 30,
    cursor: "pointer",
    background: "#fee2e2",
    color: "#7f1d1d",
    fontWeight: 950,
  },
  foldButton: {
    width: "100%",
    textAlign: "left",
    background: "transparent",
    color: "var(--color-primary)",
    border: "none",
    fontWeight: 950,
    fontSize: 18,
    cursor: "pointer",
  },
  breakdownGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 14,
    marginTop: 14,
  },
  breakCard: {
    padding: 14,
    borderRadius: 16,
  },
  mutedText: {
    color: "var(--muted)",
    lineHeight: 1.45,
  },
  historyList: {
    display: "grid",
    gap: 10,
    marginTop: 14,
  },
  historyCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    padding: 14,
    borderRadius: 14,
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
