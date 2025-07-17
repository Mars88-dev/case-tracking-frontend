// File: src/pages/BondTransferCalculator.js
import React, { useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logo from "../assets/logo.png";

export default function BondTransferCalculator() {
  const [purchasePrice, setPurchasePrice] = useState(2200000);
  const [bondAmount, setBondAmount] = useState(0);
  const reportRef = useRef();

  const calculateCosts = () => {
    const transferDuty = purchasePrice > 1000000 ? purchasePrice * 0.03 : 0;
    const transferFees = 21815.22;
    const deedsOfficeFees = 4672.50;
    const vat = (transferFees + deedsOfficeFees) * 0.15;
    const bondRegistrationFees = bondAmount > 0 ? 0 : 0; // No bond for this example
    const total = transferDuty + transferFees + deedsOfficeFees + vat;

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
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("Bond_Transfer_Estimate.pdf");
    });
  };

  const { transferDuty, transferFees, bondRegistrationFees, deedsOfficeFees, vat, total } = calculateCosts();

  return (
    <div style={{ backgroundColor: "#f0ede6", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: 40 }}>
      <div ref={reportRef} style={{
        background: "#fff",
        padding: 40,
        borderRadius: 30,
        maxWidth: 794,
        width: "100%",
        boxShadow: "20px 20px 60px #bebebe, -20px -20px 60px #ffffff"
      }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <img src={logo} alt="Logo" style={{ height: 60, marginBottom: 10 }} />
          <h1 style={{ fontSize: 26, color: "#142a4f", fontWeight: "bold" }}>Bond & Transfer Cost Estimate</h1>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: "bold" }}>Purchase Price (R):</label>
          <input
            type="number"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(Number(e.target.value))}
            style={{
              width: "100%", padding: 12, fontSize: 16, borderRadius: 12,
              border: "none",
              backgroundColor: "#f0f0f3",
              boxShadow: "inset 4px 4px 8px #dcdcdc, inset -4px -4px 8px #ffffff"
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 30, marginTop: 30 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ color: "#142a4f", borderBottom: "3px solid #d2ac68", paddingBottom: 5, fontSize: 18 }}>Transfer Costs</h2>
            <CostItem label="Transfer Duty" value={transferDuty} />
            <CostItem label="Transfer Fees" value={transferFees} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ color: "#142a4f", borderBottom: "3px solid #d2ac68", paddingBottom: 5, fontSize: 18 }}>Bond Costs</h2>
            <CostItem label="Deeds Office Fees" value={deedsOfficeFees} />
            {/* Optionally show bond registration if needed */}
            {bondAmount > 0 && <CostItem label="Bond Registration Fees" value={bondRegistrationFees} />}
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <CostItem label="VAT (15%)" value={vat} />
        </div>

        <div style={{
          fontSize: 20,
          fontWeight: "bold",
          marginTop: 30,
          padding: 15,
          backgroundColor: "#d2ac68",
          borderRadius: 10,
          color: "#142a4f",
          textAlign: "center"
        }}>
          Grand Total: R {total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
        </div>

        <div style={{ fontSize: 10, marginTop: 20, color: "#444", lineHeight: 1.6 }}>
          <em>Additional amount to be added (if applicable) for pro rata rates & taxes, levies, investment fees, documents generating costs, bank initiation cost, etc. Other expenses are Postage & Petties, Fica, Deeds Office Fees and VAT. NB. The above are estimates only, final account may vary.</em>
        </div>

        <div style={{ marginTop: 30, textAlign: "center" }}>
          <button onClick={handleDownloadPDF} style={{
            padding: "12px 24px",
            fontSize: 16,
            backgroundColor: "#142a4f",
            color: "white",
            border: "none",
            borderRadius: 10,
            boxShadow: "4px 4px 10px #d2ac68",
            cursor: "pointer"
          }}>
            Download PDF Report
          </button>
        </div>
      </div>
    </div>
  );
}

function CostItem({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 15 }}>
      <span style={{ fontWeight: 500 }}>{label}</span>
      <span>R {value.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</span>
    </div>
  );
}
