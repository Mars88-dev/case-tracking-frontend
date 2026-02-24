// File: src/components/WeeklyReport.js
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import html2canvas from "html2canvas";
import { useReactToPrint } from "react-to-print";

const COLORS = {
  navy: "#142a4f",
  gold: "#d2ac68",
  beige: "#f9f4ed",
  border: "#e5e7eb",
  white: "#ffffff",
};

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const EXPORT_SCALE = 2;

const BOX_STYLE = {
  border: "1px solid #c8b68b",
  backgroundColor: COLORS.beige,
  padding: "6px",
  fontSize: 11,
};

const BUTTON_STYLE = {
  padding: "8px 16px",
  margin: "10px 8px 0",
  backgroundColor: COLORS.navy,
  color: COLORS.white,
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
};

export default function WeeklyReport() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const reportRef = useRef();

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios
      .get(`https://case-tracking-backend.onrender.com/api/cases/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setCaseData(res.data))
      .catch(console.error);
  }, [id]);

  const handleDownloadJPG = async () => {
    if (!reportRef.current || !caseData) return;

    const el = reportRef.current;

    // Temporarily let the report grow to fit all content so it won't be clipped.
    const prev = {
      height: el.style.height,
      overflow: el.style.overflow,
      justifyContent: el.style.justifyContent,
    };

    el.style.height = "auto";
    el.style.overflow = "visible";
    el.style.justifyContent = "flex-start";

    try {
      const canvas = await html2canvas(el, {
        backgroundColor: COLORS.white,
        scale: EXPORT_SCALE,
        scrollX: 0,
        scrollY: 0,
        windowWidth: A4_WIDTH_PX,
        windowHeight: Math.max(A4_HEIGHT_PX, el.scrollHeight || A4_HEIGHT_PX),
        useCORS: true,
      });

      // Slice the tall canvas into A4-sized pages and download each page as a JPG.
      const pageWidth = canvas.width;
      const pageHeight = Math.round(pageWidth * (A4_HEIGHT_PX / A4_WIDTH_PX)); // keeps ratio correct

      const totalPages = Math.ceil(canvas.height / pageHeight);
      const safeRef = caseData.reference || `case_${id}`;

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const sy = pageIndex * pageHeight;
        const sliceHeight = Math.min(pageHeight, canvas.height - sy);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = pageWidth;
        pageCanvas.height = sliceHeight;

        const ctx = pageCanvas.getContext("2d");
        // White background (JPEG has no transparency)
        ctx.fillStyle = COLORS.white;
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

        ctx.drawImage(
          canvas,
          0,
          sy,
          pageWidth,
          sliceHeight,
          0,
          0,
          pageWidth,
          sliceHeight
        );

        const link = document.createElement("a");
        link.download =
          totalPages === 1
            ? `Weekly_Report_${safeRef}.jpg`
            : `Weekly_Report_${safeRef}_page_${pageIndex + 1}.jpg`;
        link.href = pageCanvas.toDataURL("image/jpeg", 0.95);
        link.click();
      }
    } finally {
      // Restore original layout so the on-screen view stays exactly as before.
      el.style.height = prev.height;
      el.style.overflow = prev.overflow;
      el.style.justifyContent = prev.justifyContent;
    }
  };

  const handlePrint = useReactToPrint({
    content: () => reportRef.current,
    documentTitle: caseData
      ? `${caseData.reference} - Weekly Report`
      : "Weekly Report",
    pageStyle: `
      @media print {
        @page {
          size: A4 portrait;
          margin: 0;
        }
        body {
          margin: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* KEY FIX:
           Let the content FLOW to page 2, 3, etc. instead of clipping it. */
        #report-container {
          width: ${A4_WIDTH_PX}px !important;
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
        }

        /* Prevent awkward splits inside small boxes where possible */
        .avoid-break {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        /* Make sure long comments wrap and keep line breaks */
        .comments-box {
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
      }
    `,
  });

  if (!caseData) return <div>Loading...</div>;
  const today = new Intl.DateTimeFormat("en-GB").format(new Date());

  // Safe date formatter that avoids swapping day/month.
  const formatDate = (value) => {
    if (!value) return "—";

    // If already a Date object
    if (value instanceof Date) {
      return new Intl.DateTimeFormat("en-GB").format(value);
    }

    const s = String(value).trim();
    if (!s) return "—";

    // 1) Day-first formats: DD/MM/YYYY or DD-MM-YYYY -> return normalized as DD/MM/YYYY
    const ddmmyyyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (ddmmyyyy) {
      let [, dd, mm, yy] = ddmmyyyy;
      const yyyy =
        yy.length === 2 ? (Number(yy) > 69 ? `19${yy}` : `20${yy}`) : yy;
      return `${dd.padStart(2, "0")}/${mm.padStart(
        2,
        "0"
      )}/${String(yyyy).padStart(4, "0")}`;
    }

    // 2) ISO format (YYYY-MM-DD[THH:mm:ssZ]?) -> safe to parse
    if (/^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(s)) {
      const d = new Date(s);
      if (!isNaN(d)) return new Intl.DateTimeFormat("en-GB").format(d);
    }

    // 3) Epoch timestamps (seconds or milliseconds)
    if (/^\d{10,13}$/.test(s)) {
      const ms = s.length === 13 ? Number(s) : Number(s) * 1000;
      const d = new Date(ms);
      if (!isNaN(d)) return new Intl.DateTimeFormat("en-GB").format(d);
    }

    // 4) Fallback: leave original text (handles "N/A", amounts, names, etc.)
    return s;
  };

  const Field = ({ label, value }) => (
    <div
      className="avoid-break"
      style={{ display: "flex", flexDirection: "column", fontSize: 11 }}
    >
      <label style={{ marginBottom: 2, fontWeight: "bold" }}>{label}</label>
      <div
        style={{
          border: "1px solid #c8b68b",
          minHeight: 20,
          backgroundColor: COLORS.beige,
          padding: "2px 4px",
        }}
      >
        {formatDate(value)}
      </div>
    </div>
  );

  const DualField = ({ label, requestedKey, receivedKey }) => (
    <div
      className="avoid-break"
      style={{
        fontSize: 11,
        border: "1px solid #c8b68b",
        backgroundColor: COLORS.beige,
        padding: 4,
      }}
    >
      <div
        style={{
          fontWeight: "bold",
          marginBottom: 2,
          backgroundColor: COLORS.navy,
          color: COLORS.white,
          padding: "4px 6px",
          borderRadius: 4,
        }}
      >
        {label}
      </div>
      <div>
        <strong>Requested:</strong> {formatDate(caseData[requestedKey])}
      </div>
      <div>
        <strong>Received:</strong> {formatDate(caseData[receivedKey])}
      </div>
    </div>
  );

  return (
    <div
      style={{
        background: COLORS.beige,
        padding: 10,
        fontFamily: "Arial, sans-serif",
        minHeight: "100vh",
      }}
    >
      <div
        id="report-container"
        ref={reportRef}
        style={{
          width: A4_WIDTH_PX,
          height: A4_HEIGHT_PX, // keep the on-screen "A4 preview" as-is
          margin: "auto",
          backgroundColor: COLORS.white,
          padding: 18,
          boxSizing: "border-box",
          fontFamily: "Arial, sans-serif",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <header style={{ marginBottom: 10 }} className="avoid-break">
            <img src="/header.png" alt="Header" style={{ width: "100%" }} />
          </header>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 10,
              fontSize: 13,
            }}
            className="avoid-break"
          >
            <div style={{ fontWeight: "bold", color: COLORS.navy }}>
              Our Transfer: {caseData.property || ""}
            </div>
            <div>
              <strong>Date:</strong> {today}
            </div>
          </div>

          <Section title="INFORMATION">
            <Grid cols={2}>
              <Field
                label="Instruction received"
                value={caseData.instructionReceived}
              />
              <Field label="Parties" value={caseData.parties} />
              <Field label="Agency" value={caseData.agency} />
              <Field label="Purchase Price" value={caseData.purchasePrice} />
              <Field label="Agent" value={caseData.agent} />
              <Field label="Property" value={caseData.property} />
            </Grid>
          </Section>

          <Section title="FINANCIALS">
            <Grid cols={4}>
              <Field label="Deposit Amount" value={caseData.depositAmount} />
              <Field label="Deposit Due" value={caseData.depositDueDate} />
              <Field
                label="Deposit Fulfilled"
                value={caseData.depositFulfilledDate}
              />
              <Field label="Notes" value="" />
              <Field label="Bond Amount" value={caseData.bondAmount} />
              <Field label="Bond Due" value={caseData.bondDueDate} />
              <Field
                label="Bond Fulfilled"
                value={caseData.bondFulfilledDate}
              />
              <Field label="Notes" value="" />
            </Grid>
          </Section>

          <Section title="TRANSFER PROCESS">
            <Grid cols={3}>
              <DualField
                label="Seller FICA Documents"
                requestedKey="sellerFicaDocumentsRequested"
                receivedKey="sellerFicaDocumentsReceived"
              />
              <DualField
                label="Purchaser FICA Documents"
                requestedKey="purchaserFicaDocumentsRequested"
                receivedKey="purchaserFicaDocumentsReceived"
              />
              <DualField
                label="Title Deed"
                requestedKey="titleDeedRequested"
                receivedKey="titleDeedReceived"
              />
              <DualField
                label="Bond Cancellation Figures"
                requestedKey="bondCancellationFiguresRequested"
                receivedKey="bondCancellationFiguresReceived"
              />
              <DualField
                label="Municipal Clearance Figures"
                requestedKey="municipalClearanceFiguresRequested"
                receivedKey="municipalClearanceFiguresReceived"
              />
              <DualField
                label="Transfer Duty Receipt"
                requestedKey="transferDutyReceiptRequested"
                receivedKey="transferDutyReceiptReceived"
              />
              <DualField
                label="Guarantees from Bond Attorneys"
                requestedKey="guaranteesFromBondAttorneysRequested"
                receivedKey="guaranteesFromBondAttorneysReceived"
              />
              <DualField
                label="Transfer Cost"
                requestedKey="transferCostRequested"
                receivedKey="transferCostReceived"
              />
              <DualField
                label="COC Electrical Compliance Certificate"
                requestedKey="electricalComplianceCertificateRequested"
                receivedKey="electricalComplianceCertificateReceived"
              />
              <DualField
                label="Municipal Clearance Certificate"
                requestedKey="municipalClearanceCertificateRequested"
                receivedKey="municipalClearanceCertificateReceived"
              />
              <DualField
                label="Levy Clearance Certificate"
                requestedKey="levyClearanceCertificateRequested"
                receivedKey="levyClearanceCertificateReceived"
              />
              <DualField
                label="HOA Certificate"
                requestedKey="hoaCertificateRequested"
                receivedKey="hoaCertificateReceived"
              />
            </Grid>
          </Section>

          <Section title="TRANSFER DOCUMENTS SIGNED">
            <Grid cols={2}>
              <Field label="Seller" value={caseData.transferSignedSellerDate} />
              <Field
                label="Purchaser"
                value={caseData.transferSignedPurchaserDate}
              />
            </Grid>
          </Section>

          <Section title="DEEDS OFFICE PROCESS">
            <Grid cols={3}>
              <Field label="Documents Lodged" value={caseData.documentsLodgedDate} />
              <Field label="Deeds Preparation" value={caseData.deedsPrepDate} />
              <Field label="Registration" value={caseData.registrationDate} />
            </Grid>
          </Section>

          <Section title="COMMENTS">
            <div
              className="comments-box"
              style={{
                ...BOX_STYLE,
                minHeight: 50,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
                lineHeight: 1.3,
              }}
            >
              {caseData.comments || "—"}
            </div>
          </Section>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 12 }}>
        <button onClick={handleDownloadJPG} style={BUTTON_STYLE}>
          Download Report as JPG
        </button>
        <button onClick={handlePrint} style={BUTTON_STYLE}>
          Print Report
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 10 }}>
      <h2
        style={{
          backgroundColor: COLORS.navy,
          color: "#fff",
          padding: "6px 10px",
          borderRadius: 4,
          fontSize: 13,
        }}
      >
        {title}
      </h2>
      <div style={{ marginTop: 8 }}>{children}</div>
    </section>
  );
}

function Grid({ cols = 2, children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 6,
      }}
    >
      {children}
    </div>
  );
}