// src/components/BondTransferCalculator.js
import React, { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ===================== helpers ===================== */
const VAT_RATE = 0.15;
const DISCLAIMER =
  "Additional amount to be added (if applicable) for pro rata rates & taxes, levies, investment fees, document generation costs, bank initiation cost, etc. Other expenses are Postage & Petties, FICA, Deeds Office Fees and VAT. NB. The above are estimates only; final account may vary.";

const money = (n) =>
  new Intl.NumberFormat("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const calculateTransferDuty = (price, dutyApplicable) => {
  if (!dutyApplicable) return 0;
  if (price <= 1100000) return 0;
  if (price <= 1512500) return (price - 1100000) * 0.03;
  if (price <= 2117500) return 12375 + (price - 1512500) * 0.06;
  if (price <= 2722500) return 48675 + (price - 2117500) * 0.08;
  if (price <= 12100000) return 97075 + (price - 2722500) * 0.11;
  return 1127775 + (price - 12100000) * 0.13;
};

const calculateTransferFees = (price) => {
  if (price <= 400000) return 13420;
  if (price <= 450000) return 15301;
  if (price <= 500000) return 17375;
  if (price <= 700000) return 19448;
  if (price <= 750000) return 21522;
  if (price <= 850000) return 23595;
  if (price <= 1000000) return 25669;
  if (price <= 1100000) return 27742;
  if (price <= 1200000) return 29816;
  if (price <= 1400000) return 31889;
  if (price <= 1500000) return 33036;
  if (price <= 1700000) return 35053;
  if (price <= 2000000) return 37070;
  if (price <= 2200000) return 36470;
  if (price <= 2400000) return 38487;
  if (price <= 2700000) return 40504;
  if (price <= 3000000) return 42521;
  if (price <= 3400000) return 46555;
  if (price <= 4000000) return 54512;
  // minor fix: correct parentheses for the >R4M scaling
  return Math.round(54512 + (price - 4000000) * 0.01 * (price / 1000000));
};

const calculateOtherFees = (price) => {
  const scale = price / 1_000_000;
  return {
    clearance: 1050,
    investmentDeposit: 750,
    deedsOffice: Math.round(1495 + scale * 786),
    deedsSearch: 105,
    postPetties: 950,
    docGen: 257,
    dotsTracking: 350,
    fica: 1900,
    submitDuty: 250,
  };
};

const calculateVATBreakdown = (fees, other) => {
  const v1 = fees * VAT_RATE;
  const v2 = other.postPetties * VAT_RATE;
  const v3 = other.docGen * VAT_RATE;
  const v4 = other.dotsTracking * VAT_RATE;
  const v5 = other.fica * VAT_RATE;
  const v6 = other.submitDuty * VAT_RATE;
  return {
    vatTransferFees: v1,
    vatPostPetties: v2,
    vatDocGen: v3,
    vatDots: v4,
    vatFica: v5,
    vatSubmit: v6,
    totalVAT: v1 + v2 + v3 + v4 + v5 + v6,
  };
};

const calculateBondCosts = (bond) => {
  if (!bond || bond <= 0)
    return { deedsOffice: 0, conveyancer: 0, postPetties: 0, docGen: 0, vat: 0, total: 0 };
  let conveyancer = 0;
  if (bond <= 500000) conveyancer = 17375;
  else if (bond <= 1000000) conveyancer = 25669;
  else if (bond <= 2000000) conveyancer = 37070;
  else conveyancer = 37070 + (bond - 2000000) * 0.008;
  const deedsOffice = 2281;
  const postPetties = 700;
  const docGen = 257;
  const vat = (conveyancer + postPetties + docGen) * VAT_RATE;
  const total = deedsOffice + conveyancer + postPetties + docGen + vat;
  return { deedsOffice, conveyancer, postPetties, docGen, vat, total };
};

// theme tokens from CSS
const cssVar = (name, fallback = "#142a4f") =>
  getComputedStyle(document.documentElement).getPropertyValue(name)?.trim() || fallback;
const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

/* ======== robust image loader: ALWAYS returns image/png data URL ======== */
async function urlToPngDataURL(url) {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const dataUrl = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(objectUrl);
        try {
          resolve(c.toDataURL("image/png")); // force PNG with proper mime
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = objectUrl;
    });
    return dataUrl;
  } catch {
    return null;
  }
}

const hasExt = (s) => /\.(png|jpg|jpeg)$/i.test(s);
async function loadFirstImage(candidates) {
  const urls = [];
  for (const base of candidates) {
    if (hasExt(base)) {
      urls.push(base);
    } else {
      urls.push(`${base}.jpg`, `${base}.jpeg`, `${base}.png`, base);
    }
  }
  // also try absolute forms
  const withOrigin = urls.map((u) => (u.startsWith("http") ? u : `${window.location.origin}${u}`));
  for (const url of [...urls, ...withOrigin]) {
    // eslint-disable-next-line no-await-in-loop
    const data = await urlToPngDataURL(url);
    if (data) return data;
  }
  return null;
}

/* ===================== component ===================== */
export default function BondTransferCalculator() {
  const [price, setPrice] = useState("");
  const [bond, setBond] = useState("");
  const [vatIncluded, setVatIncluded] = useState(false);
  const [dutyApplicable, setDutyApplicable] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // mutual exclusivity
  const toggleVAT = () =>
    setVatIncluded((v) => (!dutyApplicable ? !v : (setDutyApplicable(false), true)));
  const toggleDuty = () =>
    setDutyApplicable((d) => (!vatIncluded ? !d : (setVatIncluded(false), true)));

  const p = Number(price) || 0;
  const b = Number(bond) || 0;
  const basePrice = vatIncluded ? p / (1 + VAT_RATE) : p;

  const calc = useMemo(() => {
    const duty = calculateTransferDuty(basePrice, dutyApplicable);
    const fees = calculateTransferFees(basePrice);
    const other = calculateOtherFees(basePrice);
    const vat = calculateVATBreakdown(fees, other);
    const transferTotal =
      duty +
      fees +
      other.clearance +
      other.investmentDeposit +
      other.deedsOffice +
      other.deedsSearch +
      other.postPetties +
      other.docGen +
      other.dotsTracking +
      other.fica +
      other.submitDuty +
      vat.totalVAT;

    const bondCosts = calculateBondCosts(b);

    const otherSum =
      other.clearance +
      other.investmentDeposit +
      other.deedsOffice +
      other.deedsSearch +
      other.postPetties +
      other.docGen +
      other.dotsTracking +
      other.fica +
      other.submitDuty;

    return {
      duty,
      fees,
      other,
      vat,
      transferTotal,
      bondCosts,
      grandTotal: transferTotal + bondCosts.total,
      otherSum,
    };
  }, [basePrice, dutyApplicable, b]);

  /* ----------------- PDF (branded + reliable header image) ----------------- */
  const makePDF = async () => {
    const primary = cssVar("--color-primary");
    const accent = cssVar("--color-accent", "#d2ac68");
    const [pr, pg, pb] = hexToRgb(primary);
    const [ar, ag, ab] = hexToRgb(accent);

    // Try common /public paths
    const headerDataURL = await loadFirstImage(["/header2", "/client/public/header2"]);
    const logoDataURL = await loadFirstImage(["/logo", "/client/public/logo", "/logo.png", "/logo.jpg"]);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const M = 12;

    let y = 0;

    // ==== TOP BANNER ====
    try {
      if (headerDataURL) {
        const bannerH = 32;
        doc.addImage(headerDataURL, "PNG", 0, 0, pageW, bannerH); // force PNG type
        // gold underline
        doc.setDrawColor(ar, ag, ab);
        doc.setLineWidth(0.8);
        doc.line(0, bannerH, pageW, bannerH);
        y = bannerH + 6;
      } else {
        doc.setFillColor(pr, pg, pb);
        doc.rect(0, 0, pageW, 28, "F");
        y = 34;
      }
    } catch (e) {
      // Safe fallback if something goes wrong with the image
      doc.setFillColor(pr, pg, pb);
      doc.rect(0, 0, pageW, 28, "F");
      y = 34;
    }

    // ==== HEADER ROW (logo pill + title) ====
    if (logoDataURL) {
      doc.setFillColor(pr, pg, pb);
      doc.roundedRect(M, y, 74, 20, 4, 4, "F");
      try {
        doc.addImage(logoDataURL, "PNG", M + 4, y + 3, 14, 14);
      } catch {}
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Gerhard Barnard Attorneys", M + 22, y + 9);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Conveyancing Department", M + 22, y + 15);
    }

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("QUOTATION", pageW - M, y + 8, { align: "right" });
    y += 26;

    // ==== META ====
    const leftX = M;
    const rightX = pageW / 2 + 4;
    const estimateNo = String(Math.floor(Math.random() * 900000) + 100000);

    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text("ESTIMATE #", leftX, y);
    doc.setTextColor(0);
    doc.text(estimateNo, leftX + 28, y);
    y += 5;

    doc.setTextColor(90);
    doc.text("ISSUE DATE", leftX, y);
    doc.setTextColor(0);
    doc.text(new Date().toLocaleDateString("en-GB"), leftX + 28, y);
    y += 5;

    doc.setTextColor(90);
    doc.text("AMOUNT BASIS", leftX, y);
    doc.setTextColor(0);
    doc.text(
      `Purchase R ${money(p)}  •  VAT in price: ${vatIncluded ? "Yes" : "No"}  •  Duty: ${
        dutyApplicable ? "Yes" : "No"
      }`,
      leftX + 28,
      y
    );

    doc.setTextColor(90);
    doc.text("BOND AMOUNT", rightX, y - 10);
    doc.setTextColor(0);
    doc.text(b > 0 ? `R ${money(b)}` : "N/A", rightX + 32, y - 10);

    // divider
    y += 7;
    doc.setDrawColor(230);
    doc.setLineWidth(0.3);
    doc.line(M, y, pageW - M, y);
    y += 6;

    // ==== TRANSFER TABLE ====
    autoTable(doc, {
      startY: y,
      head: [["NO", "DESCRIPTION", "VAT", "AMOUNT (R)"]],
      body: [
        ["1", "Transfer fees", money(calc.vat.vatTransferFees), money(calc.fees)],
        ["2", "Transfer duty", "", money(calc.duty)],
        ["3", "Clearance certificate", "", money(calc.other.clearance)],
        ["4", "Investment of deposit", "", money(calc.other.investmentDeposit)],
        ["5", "Deeds office fee", "", money(calc.other.deedsOffice)],
        ["6", "Deeds office search", "", money(calc.other.deedsSearch)],
        ["7", "Postages & Petties", money(calc.vat.vatPostPetties), money(calc.other.postPetties)],
        ["8", "Document generation", money(calc.vat.vatDocGen), money(calc.other.docGen)],
        ["9", "DOTS tracking fee", money(calc.vat.vatDots), money(calc.other.dotsTracking)],
        ["10", "FICA verification", money(calc.vat.vatFica), money(calc.other.fica)],
        ["11", "Submitting transfer duty", money(calc.vat.vatSubmit), money(calc.other.submitDuty)],
        ["12", "VAT total", money(calc.vat.totalVAT), ""],
      ],
      margin: { left: M, right: M },
      styles: { fontSize: 8, cellPadding: 1.8, halign: "right", lineWidth: 0.1, lineColor: 220 },
      headStyles: { fillColor: [ar, ag, ab], textColor: [pr, pg, pb], halign: "center", fontStyle: "bold" },
      alternateRowStyles: { fillColor: [247, 247, 247] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { halign: "left" },
        2: { cellWidth: 30 },
        3: { cellWidth: 34 },
      },
      theme: "striped",
      didDrawPage: () => {
        // Footer with page number
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(
          "Gerhard Barnard Trust Acc · Standard Bank · Acc: 301 454 310 · Branch: 012 445 · EFT only (confirm telephonically).",
          M,
          pageH - 8
        );
        doc.setTextColor(pr, pg, pb);
        const n = doc.internal.getNumberOfPages();
        doc.text(`Page ${n}`, pageW - M, pageH - 8, { align: "right" });
      },
    });

    y = doc.lastAutoTable.finalY + 4;

    // ==== SUMMARY BOX ====
    const boxW = 70;
    const boxX = pageW - M - boxW;
    const lineH = 6;

    doc.setFillColor(245);
    doc.roundedRect(boxX, y, boxW, lineH, 2, 2, "F");
    doc.setTextColor(0);
    doc.setFontSize(9);
    doc.text("Sub-total", boxX + 4, y + 4);
    doc.text(`R ${money(calc.transferTotal - calc.vat.totalVAT)}`, boxX + boxW - 4, y + 4, { align: "right" });
    y += lineH + 2;

    doc.roundedRect(boxX, y, boxW, lineH, 2, 2, "F");
    doc.text("VAT", boxX + 4, y + 4);
    doc.text(`R ${money(calc.vat.totalVAT)}`, boxX + boxW - 4, y + 4, { align: "right" });
    y += lineH + 2;

    doc.setFillColor(ar, ag, ab);
    doc.roundedRect(boxX, y, boxW, lineH + 2, 3, 3, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.text("Total Due", boxX + 4, y + 5);
    doc.text(`R ${money(calc.transferTotal)}`, boxX + boxW - 4, y + 5, { align: "right" });
    y += lineH + 6;

    // ==== BOND TABLE (if any) ====
    if (b > 0) {
      autoTable(doc, {
        startY: y + 2,
        head: [["NO", "BOND COSTS (ESTIMATE)", "AMOUNT (R)"]],
        body: [
          ["1", "Deeds office fee", money(calc.bondCosts.deedsOffice)],
          ["2", "Conveyancer fee", money(calc.bondCosts.conveyancer)],
          ["3", "Post & Petties", money(calc.bondCosts.postPetties)],
          ["4", "Electronic doc generation", money(calc.bondCosts.docGen)],
        ["5", "VAT", money(calc.bondCosts.vat)],
          ["6", "Subtotal", money(calc.bondCosts.total)],
        ],
        margin: { left: M, right: M },
        styles: { fontSize: 8, cellPadding: 1.6, halign: "right", lineWidth: 0.1, lineColor: 220 },
        headStyles: { fillColor: [ar, ag, ab], textColor: [pr, pg, pb], halign: "center", fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 10, halign: "center" }, 1: { halign: "left" }, 2: { cellWidth: 40 } },
        theme: "striped",
      });

      y = doc.lastAutoTable.finalY + 4;

      doc.setFillColor(pr, pg, pb);
      doc.roundedRect(boxX, y, boxW, lineH + 2, 3, 3, "F");
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.text("Grand Total", boxX + 4, y + 5);
      doc.text(`R ${money(calc.grandTotal)}`, boxX + boxW - 4, y + 5, { align: "right" });
      y += lineH + 6;
    }

    // ==== PAYMENT + TERMS ====
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    doc.setFontSize(9);
    doc.text("Payment Method", M, y);
    y += 5;
    doc.setTextColor(80);
    doc.text("Bank:", M, y);
    doc.text("Gerhard Barnard Trust Account (Standard Bank)", M + 18, y);
    y += 5;
    doc.text("Account No:", M, y);
    doc.text("301 454 310  ·  Branch: 012 445", M + 18, y);
    y += 7;

    doc.setTextColor(0);
    doc.text("Terms & Conditions", M, y);
    y += 5;
    doc.setTextColor(90);
    doc.setFontSize(8);
    const terms = doc.splitTextToSize(DISCLAIMER, pageW - 2 * M);
    doc.text(terms, M, y);
    y += terms.length * 4 + 8;

    // ==== THANK YOU BAR ====
    const thankW = pageW - 2 * M;
    doc.setFillColor(30);
    doc.roundedRect(M, pageH - 20, thankW, 10, 4, 4, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("THANK YOU FOR YOUR BUSINESS", pageW / 2, pageH - 13, { align: "center" });

    doc.save(`Cost-Estimate-R${money(p)}.pdf`);
  };

  /* ----------------- UI ----------------- */
  const primary = "var(--color-primary)";
  const accent = "var(--color-accent)";

  return (
    <div style={styles.container}>
      <div className="neumo-surface" style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <img src="/logo.png" alt="Logo" style={styles.logo} />
          <div>
            <h1 style={{ ...styles.title, color: primary }}>Cost Calculator</h1>
            <p style={{ ...styles.subtitle, color: "var(--muted)" }}>
              Quick, clean estimates — theme-aware & print-ready
            </p>
          </div>
        </div>

        {/* Two-column layout */}
        <div style={styles.grid}>
          {/* Inputs */}
          <section className="neumo-surface" style={styles.panel}>
            <h3 style={styles.panelTitle}>Inputs</h3>

            <label style={styles.label}>Purchase Price (R)</label>
            <input
              className="neumo-input"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 2200000"
            />

            <label style={{ ...styles.label, marginTop: 12 }}>Bond Amount (R, optional)</label>
            <input
              className="neumo-input"
              type="number"
              value={bond}
              onChange={(e) => setBond(e.target.value)}
              placeholder="e.g. 2000000"
            />

            <div className="neumo-pressed" style={styles.toggleRow}>
              <label style={styles.check}>
                <input type="checkbox" checked={vatIncluded} onChange={toggleVAT} />
                <span>VAT included in purchase price</span>
              </label>
              <label style={styles.check}>
                <input type="checkbox" checked={dutyApplicable} onChange={toggleDuty} />
                <span>Transfer duty applicable</span>
              </label>
            </div>

            <button onClick={makePDF} className="neumo-button" style={{ width: "100%" }}>
              🖨️ Generate PDF
            </button>
          </section>

          {/* Summary */}
          <section className="neumo-surface" style={styles.panel}>
            <h3 style={styles.panelTitle}>Summary</h3>

            <div style={styles.kv}>
              <span>Transfer fees</span>
              <b>R {money(calc.fees)}</b>
            </div>
            <div style={styles.kv}>
              <span>Other fees (ex VAT)</span>
              <b>R {money(calc.otherSum)}</b>
            </div>
            <div style={styles.kv}>
              <span>Transfer duty</span>
              <b>R {money(calc.duty)}</b>
            </div>
            <div style={styles.kv}>
              <span>VAT total</span>
              <b>R {money(calc.vat.totalVAT)}</b>
            </div>

            <div style={styles.divider} />

            <div style={{ ...styles.kv, fontSize: 18, fontWeight: 800, color: primary }}>
              <span>Total transfer (incl. VAT)</span>
              <span>R {money(calc.transferTotal)}</span>
            </div>

            <div style={styles.kv}>
              <span>Bond costs (if any)</span>
              <b>R {money(calc.bondCosts.total)}</b>
            </div>

            <div style={{ ...styles.kv, fontSize: 20, fontWeight: 900, color: accent, marginTop: 4 }}>
              <span>Grand total</span>
              <span>R {money(calc.grandTotal)}</span>
            </div>

            <button
              className="neumo-button"
              style={{ marginTop: 12 }}
              onClick={() => setShowBreakdown((s) => !s)}
            >
              {showBreakdown ? "Hide" : "Show"} full breakdown
            </button>
          </section>
        </div>

        {/* Collapsible breakdown */}
        {showBreakdown && (
          <section className="neumo-surface" style={{ marginTop: 16, padding: 16, borderRadius: 14 }}>
            <h3 style={styles.panelTitle}>Full Breakdown</h3>
            <div style={styles.breakdownGrid}>
              <div className="neumo-pressed" style={styles.breakCard}>
                <h4 style={styles.breakTitle}>Transfer line items</h4>
                <ul style={styles.ul}>
                  <li>Transfer fees: <b>R {money(calc.fees)}</b></li>
                  <li>Transfer duty: <b>R {money(calc.duty)}</b></li>
                  <li>Clearance certificate: <b>R {money(calc.other.clearance)}</b></li>
                  <li>Investment of deposit: <b>R {money(calc.other.investmentDeposit)}</b></li>
                  <li>Deeds office fee: <b>R {money(calc.other.deedsOffice)}</b></li>
                  <li>Deeds office search: <b>R {money(calc.other.deedsSearch)}</b></li>
                  <li>Postage & Petties: <b>R {money(calc.other.postPetties)}</b></li>
                  <li>Document generation: <b>R {money(calc.other.docGen)}</b></li>
                  <li>DOTS tracking: <b>R {money(calc.other.dotsTracking)}</b></li>
                  <li>FICA verification: <b>R {money(calc.other.fica)}</b></li>
                  <li>Submitting transfer duty: <b>R {money(calc.other.submitDuty)}</b></li>
                  <li>VAT total: <b>R {money(calc.vat.totalVAT)}</b></li>
                </ul>
              </div>

              <div className="neumo-pressed" style={styles.breakCard}>
                <h4 style={styles.breakTitle}>Bond costs</h4>
                <ul style={styles.ul}>
                  <li>Deeds office: <b>R {money(calc.bondCosts.deedsOffice)}</b></li>
                  <li>Conveyancer: <b>R {money(calc.bondCosts.conveyancer)}</b></li>
                  <li>Post & Petties: <b>R {money(calc.bondCosts.postPetties)}</b></li>
                  <li>Electronic doc gen: <b>R {money(calc.bondCosts.docGen)}</b></li>
                  <li>VAT: <b>R {money(calc.bondCosts.vat)}</b></li>
                  <li>Subtotal: <b>R {money(calc.bondCosts.total)}</b></li>
                </ul>
              </div>
            </div>

            <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 12, lineHeight: 1.4 }}>
              {DISCLAIMER}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

/* ===================== styles (neumorphism + theme vars) ===================== */
const styles = {
  container: {
    minHeight: "calc(100vh - 76px)",
    padding: 16,
    background: "var(--bg)",
    color: "var(--text)",
  },
  card: { padding: 16, borderRadius: 14 },
  header: {
    display: "grid",
    gridTemplateColumns: "120px 1fr",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  logo: { height: 80, borderRadius: 8 },
  title: { margin: 0, fontWeight: 800 },
  subtitle: { margin: "4px 0 0", fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  panel: { padding: 16, borderRadius: 14 },
  panelTitle: {
    margin: "0 0 10px",
    padding: "6px 10px",
    background: "var(--table-header)",
    color: "var(--table-header-text)",
    borderRadius: 8,
    display: "inline-block",
    fontWeight: 800,
    fontSize: 14,
  },
  label: { fontWeight: 700, fontSize: 13, marginBottom: 6, display: "block", color: "var(--text)" },
  toggleRow: { display: "grid", gap: 8, padding: 10, borderRadius: 12, margin: "12px 0" },
  check: { display: "flex", gap: 8, alignItems: "center", fontWeight: 700 },
  kv: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    padding: "6px 8px",
    borderRadius: 10,
    background: "color-mix(in srgb, var(--surface) 85%, var(--bg) 15%)",
    marginBottom: 6,
  },
  divider: { height: 1, background: "color-mix(in srgb, var(--text) 18%, transparent)", margin: "6px 0" },
  breakdownGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 },
  breakCard: { padding: 12, borderRadius: 12 },
  breakTitle: { margin: "0 0 6px", color: "var(--color-primary)", fontWeight: 800, fontSize: 14 },
  ul: { margin: 0, paddingLeft: 16, lineHeight: 1.5 },
};
