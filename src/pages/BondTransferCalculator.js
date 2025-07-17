import React, { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const BondTransferCalculator = () => {
  const [purchasePrice, setPurchasePrice] = useState(0);

  const calculateTransferCosts = () => {
    const price = parseFloat(purchasePrice);
    const transferFees = price * 0.0152;
    const transferDuty = price > 1000000 ? 51000 : 0;
    const vatTransferFees = transferFees * 0.15;
    const otherFees = {
      clearance: 1050,
      investment: 750,
      deedsOffice: 2281,
      search: 700,
      postage: 950,
      document: 257,
      dots: 350,
      fica: 1900,
      submit: 257,
    };
    const totalTransfer =
      transferFees +
      transferDuty +
      vatTransferFees +
      Object.values(otherFees).reduce((a, b) => a + b, 0);

    return {
      transferFees,
      transferDuty,
      vatTransferFees,
      ...otherFees,
      totalTransfer,
    };
  };

  const calculateBondCosts = () => {
    const registrationFee = 2680;
    const deedsRegistration = 1500;
    const postage = 850;
    const vat = (registrationFee + postage) * 0.15;
    const totalBond = registrationFee + deedsRegistration + postage + vat;

    return {
      registrationFee,
      deedsRegistration,
      postage,
      vat,
      totalBond,
    };
  };

  const handleDownload = () => {
    const input = document.getElementById("calculator-report");
    html2canvas(input).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF();
      pdf.addImage(imgData, "PNG", 0, 0);
      pdf.save("bond-transfer-costs.pdf");
    });
  };

  const transfer = calculateTransferCosts();
  const bond = calculateBondCosts();
  const grandTotal = transfer.totalTransfer + bond.totalBond;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem",
        backgroundColor: "#f1f4f9",
        minHeight: "100vh",
      }}
    >
      <div
        id="calculator-report"
        style={{
          maxWidth: "1000px",
          width: "100%",
          background: "#e0e5ec",
          boxShadow: "inset 7px 7px 15px #c2c6cc, inset -7px -7px 15px #ffffff",
          borderRadius: "25px",
          padding: "2rem",
          fontFamily: "Arial",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            color: "#142a4f",
            marginBottom: "1.5rem",
          }}
        >
          Bond & Transfer Cost Estimate
        </h2>

        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <label style={{ marginRight: "0.5rem" }}>Purchase Price:</label>
          <input
            type="number"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "12px",
              border: "none",
              background: "#e0e5ec",
              boxShadow:
                "inset 5px 5px 10px #c2c6cc, inset -5px -5px 10px #ffffff",
            }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: "2rem" }}>
          {/* Transfer Costs */}
          <div style={{ flex: 1 }}>
            <h3 style={{ color: "#142a4f" }}>Transfer Costs</h3>
            <ul>
              <li>To Transfer Fees: R{transfer.transferFees.toFixed(2)}</li>
              <li>To Transfer Duty: R{transfer.transferDuty.toFixed(2)}</li>
              <li>To Clearance Certificate: R{transfer.clearance.toFixed(2)}</li>
              <li>To Application of Investment: R{transfer.investment.toFixed(2)}</li>
              <li>To Deeds Office Fee: R{transfer.deedsOffice.toFixed(2)}</li>
              <li>To Deeds Office Search: R{transfer.search.toFixed(2)}</li>
              <li>To Postage & Petties: R{transfer.postage.toFixed(2)}</li>
              <li>To Document Generation: R{transfer.document.toFixed(2)}</li>
              <li>To DOTS Tracking: R{transfer.dots.toFixed(2)}</li>
              <li>To FICA Identification: R{transfer.fica.toFixed(2)}</li>
              <li>To Submit Duty: R{transfer.submit.toFixed(2)}</li>
            </ul>
            <p>VAT: R{transfer.vatTransferFees.toFixed(2)}</p>
            <strong>Total: R{transfer.totalTransfer.toFixed(2)}</strong>
          </div>

          {/* Bond Costs */}
          <div style={{ flex: 1 }}>
            <h3 style={{ color: "#142a4f" }}>Bond Costs</h3>
            <ul>
              <li>Registration Fee + Admin: R{bond.registrationFee.toFixed(2)}</li>
              <li>Deeds Office Registration: R{bond.deedsRegistration.toFixed(2)}</li>
              <li>Postage & Petties: R{bond.postage.toFixed(2)}</li>
            </ul>
            <p>VAT: R{bond.vat.toFixed(2)}</p>
            <strong>Total: R{bond.totalBond.toFixed(2)}</strong>
          </div>
        </div>

        {/* Grand Total */}
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            background: "#d2ac68",
            borderRadius: "15px",
            textAlign: "center",
            fontSize: "1.2rem",
            color: "white",
            fontWeight: "bold",
            boxShadow: "4px 4px 10px #b1945d, -4px -4px 10px #edd1a3",
          }}
        >
          Grand Total Due: R{grandTotal.toFixed(2)}
        </div>

        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button
            onClick={handleDownload}
            style={{
              padding: "0.7rem 2rem",
              background: "#142a4f",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "4px 4px 10px #0f2038, -4px -4px 10px #1a3e6b",
            }}
          >
            Download PDF Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default BondTransferCalculator;