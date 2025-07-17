// File: src/pages/BondTransferCalculator.js
import React, { useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logo from "../assets/logo.png";

export default function BondTransferCalculator() {
  const [purchasePrice, setPurchasePrice] = useState(2200000);
  const reportRef = useRef();

  const calculateCosts = () => {
    const transferDuty = purchasePrice > 1000000 ? purchasePrice * 0.03 : 0;
    const transferFees = 15000;
    const bondRegistrationFees = 12000;
    const deedsOfficeFees = 4000;
    const vat = (transferFees + bondRegistrationFees + deedsOfficeFees) * 0.15;
    const total = transferDuty + transferFees + bondRegistrationFees + deedsOfficeFees + vat;

    return {
      transferDuty,
      transferFees,
      bondRegistrationFees,
      deedsOfficeFees,
      vat,
      total
    };
  };

  const handleDownloadPDF = () => {
    if (!reportRef.current) return;
    html2canvas(reportRef.current, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("Bond_Transfer_Report.pdf");
    });
  };

  const { transferDuty, transferFees, bondRegistrationFees, deedsOfficeFees, vat, total } = calculateCosts();

  return (
    <div style={{ backgroundColor: "#f9f4ed", minHeight: "100vh", padding: 20, display: "flex", justifyContent: "center" }}>
      <div ref={reportRef} style={{ backgroundColor: "#ffffff", padding: 30, width: "100%", maxWidth: 794, borderRadius: 20, boxShadow: "10px 10px 30px #c8b68b, -10px -10px 30px #ffffff" }}>
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <img src={logo} alt="logo" style={{ height: 60, marginBottom: 10 }} />
          <h1 style={{ fontSize: 24, color: "#142a4f" }}>Bond & Transfer Cost Estimate</h1>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: "bold", fontSize: 14 }}>Purchase Price:</label>
          <input
            type="number"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(Number(e.target.value))}
            style={{ width: "100%", padding: 10, fontSize: 16, borderRadius: 10, border: "1px solid #d2ac68", backgroundColor: "#f5f5f5", boxShadow: "inset 4px 4px 8px #d2ac68, inset -4px -4px 8px #ffffff" }}
          />
        </div>

        <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, color: "#142a4f", borderBottom: "2px solid #d2ac68" }}>Transfer Costs</h2>
            <CostItem label="Transfer Duty" value={transferDuty} />
            <CostItem label="Transfer Fees" value={transferFees} />
          </div>

          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, color: "#142a4f", borderBottom: "2px solid #d2ac68" }}>Bond Costs</h2>
            <CostItem label="Bond Registration Fees" value={bondRegistrationFees} />
            <CostItem label="Deeds Office Fees" value={deedsOfficeFees} />
          </div>
        </div>

        <CostItem label="VAT (15%)" value={vat} />

        <div style={{ fontSize: 20, fontWeight: "bold", marginTop: 20, padding: 15, backgroundColor: "#d2ac68", borderRadius: 10, color: "#142a4f", textAlign: "center" }}>
          Grand Total: R {total.toLocaleString("en-ZA")}
        </div>

        <div style={{ fontSize: 10, marginTop: 20, color: "#444" }}>
          <em>Additional amount to be added (if applicable) for pro rata rates & taxes, levies, investment fees, documents generating costs, bank initiation cost, etc. Other expenses are Postage & Petties, Fica, Deeds Office Fees and VAT. NB. The above are estimates only, final account may vary.</em>
        </div>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button onClick={handleDownloadPDF} style={{ padding: "10px 20px", fontSize: 16, backgroundColor: "#142a4f", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
            Download PDF Report
          </button>
        </div>
      </div>
    </div>
  );
}

function CostItem({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14 }}>
      <span>{label}</span>
      <span>R {value.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
    </div>
  );
}
