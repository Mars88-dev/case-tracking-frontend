import React, { useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logo from "../assets/logo.png";

export default function BondTransferCalculator() {
  const [purchasePrice, setPurchasePrice] = useState(2200000);
  const reportRef = useRef();

  const calculateCosts = () => {
    const transferDuty = 45786;
    const transferFees = 36470;
    const clearanceCert = 1050;
    const investment = 750;
    const deedsOfficeFee = 2281;
    const deedsSearch = 700;
    const postage = 950;
    const docGen = 257;
    const dotsFee = 350;
    const fica = 1900;
    const submitTransferDuty = 250;

    const vat = 6131.55;
    const total = 96875.55;

    return {
      transferDuty,
      transferFees,
      clearanceCert,
      investment,
      deedsOfficeFee,
      deedsSearch,
      postage,
      docGen,
      dotsFee,
      fica,
      submitTransferDuty,
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
      pdf.save("Bond_Transfer_Report.pdf");
    });
  };

  const {
    transferDuty,
    transferFees,
    clearanceCert,
    investment,
    deedsOfficeFee,
    deedsSearch,
    postage,
    docGen,
    dotsFee,
    fica,
    submitTransferDuty,
    vat,
    total
  } = calculateCosts();

  const format = (value) => `R${value.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  return (
    <div style={{ backgroundColor: "#f9f4ed", minHeight: "100vh", padding: 20, display: "flex", justifyContent: "center" }}>
      <div ref={reportRef} style={{ backgroundColor: "#fff", padding: 40, width: "100%", maxWidth: 900, borderRadius: 20, boxShadow: "10px 10px 30px #c8b68b, -10px -10px 30px #ffffff" }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <img src={logo} alt="logo" style={{ height: 80, marginBottom: 10 }} />
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

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
          <thead>
            <tr style={{ backgroundColor: "#d2ac68", color: "#fff", textAlign: "left" }}>
              <th style={{ padding: 10 }}>DESCRIPTION</th>
              <th style={{ padding: 10 }}>VAT</th>
              <th style={{ padding: 10 }}>DEBIT</th>
              <th style={{ padding: 10 }}>CREDIT</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["To transfer fees", 5470.5, transferFees],
              ["To Transfer Duty", "", transferDuty],
              ["To Clearance Certificate fee payable", "", clearanceCert],
              ["To Application of Investment of Deposit", "", investment],
              ["To Deeds Office fee", "", deedsOfficeFee],
              ["To Deeds Office search", 105.0, deedsSearch],
              ["To Postages and Petties", 142.5, postage],
              ["To Document Generation Charge", 38.55, docGen],
              ["To DOTS Tracking Fee", 52.5, dotsFee],
              ["To FICA identification and verification fee", 285.0, fica],
              ["To Submitting of Transfer Duty Fee", 37.5, submitTransferDuty]
            ].map(([label, vatVal, debit], idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #ccc" }}>
                <td style={{ padding: 8 }}>{label}</td>
                <td style={{ padding: 8 }}>{vatVal !== "" ? format(vatVal) : ""}</td>
                <td style={{ padding: 8 }}>{format(debit)}</td>
                <td style={{ padding: 8 }}></td>
              </tr>
            ))}
            <tr style={{ fontWeight: "bold" }}>
              <td style={{ padding: 8 }}>VAT</td>
              <td style={{ padding: 8 }}>{format(vat)}</td>
              <td style={{ padding: 8 }}>{format(vat)}</td>
              <td style={{ padding: 8 }}>R0.00</td>
            </tr>
            <tr style={{ backgroundColor: "#d2ac68", color: "#fff", fontWeight: "bold" }}>
              <td style={{ padding: 10 }} colSpan={3}>TOTAL AMOUNT DUE (incl. VAT)</td>
              <td style={{ padding: 10 }}>{format(total)}</td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: 11, color: "#555" }}>
          <em>
            Additional amount to be added (if applicable) for pro rata rates & taxes, levies, investment fees, documents generating costs, bank initiation cost, etc. Other expenses are Postage & Petties, Fica, Deeds Office Fees and VAT. NB. The above are estimates only, final account may vary.
          </em>
        </p>

        <div style={{ marginTop: 30, textAlign: "center" }}>
          <button onClick={handleDownloadPDF} style={{ padding: "12px 24px", fontSize: 16, backgroundColor: "#142a4f", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
            Download PDF Report
          </button>
        </div>
      </div>
    </div>
  );
}
