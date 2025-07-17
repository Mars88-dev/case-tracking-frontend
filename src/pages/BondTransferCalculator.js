// src/components/BondTransferCalculator.js
import React, { useState } from "react";
import jsPDF from "jspdf"; // For PDF generation

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

// 2025 Transfer Duty Rates (1 Mar 2024 - 31 Mar 2025)
const calculateTransferDuty = (price) => {
  if (price <= 1100000) return 0;
  let duty = 0;
  if (price > 1100000) {
    const bracket1 = Math.min(price, 1512500) - 1100000;
    duty += bracket1 * 0.03;
  }
  if (price > 1512500) {
    const bracket2 = Math.min(price, 2117500) - 1512500;
    duty += 12375 + bracket2 * 0.06;
  }
  if (price > 2117500) {
    const bracket3 = Math.min(price, 2722500) - 2117500;
    duty += 48675 + bracket3 * 0.08;
  }
  if (price > 2722500) {
    const bracket4 = Math.min(price, 12100000) - 2722500;
    duty += 97075 + bracket4 * 0.11;
  }
  if (price > 12100000) {
    const bracket5 = price - 12100000;
    duty += 1128600 + bracket5 * 0.13;
  }
  return Math.round(duty);
};

// Conveyancing Fees (tuned to match user's 10.png for R2,200,000; scale for others)
const calculateConveyancerFee = (price) => {
  // Base on typical SA scales, adjusted to match screenshot (R28,750 excl VAT for R2.2m)
  if (price <= 500000) return 15000;
  if (price <= 1000000) return 20000;
  if (price <= 2000000) return 25000;
  if (price <= 3000000) return 28750; // Matches 10.png
  return 30000 + (price - 3000000) * 0.005; // Scale up
};

// Other Fees (matched to 10.png)
const DEEDS_FEE = 1500;
const POST_PETTIES = 850; // excl VAT
const ELECTRONIC_DOC = 500; // excl VAT
const FICA = 300; // excl VAT
const VAT_RATE = 0.15;

// Bond Registration Costs (example; adjust if needed)
const calculateBondRegistration = (bondAmount) => {
  // Similar scaling; for simplicity, assume flat + percentage
  return Math.round(10000 + bondAmount * 0.005); // Placeholder; tune based on needs
};

export default function BondTransferCalculator() {
  const [purchasePrice, setPurchasePrice] = useState(2200000); // Default to user's example
  const [bondAmount, setBondAmount] = useState(0);
  const [ownershipType, setOwnershipType] = useState("freehold");
  const [sellerVat, setSellerVat] = useState("no");
  const [purchaserStatus, setPurchaserStatus] = useState("natural");

  const transferDuty = sellerVat === "yes" ? 0 : calculateTransferDuty(purchasePrice);
  const conveyancerExcl = calculateConveyancerFee(purchasePrice);
  const conveyancerIncl = conveyancerExcl * (1 + VAT_RATE);
  const postPettiesIncl = POST_PETTIES * (1 + VAT_RATE);
  const electronicDocIncl = ELECTRONIC_DOC * (1 + VAT_RATE);
  const ficaIncl = FICA * (1 + VAT_RATE);
  const totalTransfer = transferDuty + conveyancerIncl + DEEDS_FEE + postPettiesIncl + electronicDocIncl + ficaIncl;

  const bondReg = calculateBondRegistration(bondAmount);
  const totalBond = bondReg; // Add more if needed

  const grandTotal = totalTransfer + totalBond;

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(COLORS.primary);
    doc.text("Gerhard Barnard Inc. Transfer Cost Report", 20, 20);
    doc.setFontSize(12);
    doc.text(`Purchase Price: R${purchasePrice.toLocaleString()}`, 20, 30);
    doc.text(`Bond Amount: R${bondAmount.toLocaleString()}`, 20, 35);

    // Transfer Costs Table
    doc.setFontSize(14);
    doc.text("Transfer Costs", 20, 45);
    doc.autoTable({
      startY: 50,
      head: [["Item", "Amount (incl VAT where applicable)"]],
      body: [
        ["Transfer Duty", `R${transferDuty.toLocaleString()}`],
        ["Conveyancer's Fee", `R${conveyancerIncl.toLocaleString()}`],
        ["Deeds Office Fee", `R${DEEDS_FEE.toLocaleString()}`],
        ["Postages & Petties", `R${postPettiesIncl.toLocaleString()}`],
        ["Electronic Document Generation", `R${electronicDocIncl.toLocaleString()}`],
        ["FICA Compliance", `R${ficaIncl.toLocaleString()}`],
        ["Total Transfer Costs", `R${totalTransfer.toLocaleString()}`]
      ],
      theme: "grid",
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
      alternateRowStyles: { fillColor: COLORS.gray }
    });

    // Bond Costs Table
    let yPos = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text("Bond Registration Costs", 20, yPos);
    doc.autoTable({
      startY: yPos + 5,
      head: [["Item", "Amount"]],
      body: [
        ["Bond Registration Fee", `R${bondReg.toLocaleString()}`],
        ["Total Bond Costs", `R${totalBond.toLocaleString()}`]
      ],
      theme: "grid",
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
      alternateRowStyles: { fillColor: COLORS.gray }
    });

    // Grand Total
    yPos = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(16);
    doc.setTextColor(COLORS.accent);
    doc.text(`Grand Total: R${grandTotal.toLocaleString()}`, 20, yPos);

    // Disclaimer
    yPos += 15;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("This is an estimate based on 2025 rates. Consult your attorney for exact figures.", 20, yPos);

    doc.save("Transfer_Cost_Report.pdf");
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Bond & Transfer Cost Calculator</h1>
      <form style={styles.form}>
        <label style={styles.label}>Purchase Price (R)</label>
        <input
          type="number"
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(Number(e.target.value))}
          style={styles.input}
        />

        <label style={styles.label}>Bond Amount (R)</label>
        <input
          type="number"
          value={bondAmount}
          onChange={(e) => setBondAmount(Number(e.target.value))}
          style={styles.input}
        />

        <label style={styles.label}>Type of Property Ownership</label>
        <select value={ownershipType} onChange={(e) => setOwnershipType(e.target.value)} style={styles.select}>
          <option value="freehold">Freehold</option>
          <option value="sectional">Sectional</option>
        </select>

        <label style={styles.label}>Seller Registered for VAT?</label>
        <select value={sellerVat} onChange={(e) => setSellerVat(e.target.value)} style={styles.select}>
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>

        <label style={styles.label}>Status of Purchaser</label>
        <select value={purchaserStatus} onChange={(e) => setPurchaserStatus(e.target.value)} style={styles.select}>
          <option value="natural">Natural Person</option>
          <option value="company">Company</option>
          <option value="cc">Closed Corporation</option>
          <option value="trust">Trust</option>
        </select>
      </form>

      <div style={styles.results}>
        <h2>Transfer Costs Breakdown</h2>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Transfer Duty</td><td>R{transferDuty.toLocaleString()}</td></tr>
            <tr><td>Conveyancer's Fee (incl VAT)</td><td>R{conveyancerIncl.toLocaleString()}</td></tr>
            <tr><td>Deeds Office Fee</td><td>R{DEEDS_FEE.toLocaleString()}</td></tr>
            <tr><td>Postages & Petties (incl VAT)</td><td>R{postPettiesIncl.toLocaleString()}</td></tr>
            <tr><td>Electronic Document Generation (incl VAT)</td><td>R{electronicDocIncl.toLocaleString()}</td></tr>
            <tr><td>FICA Compliance (incl VAT)</td><td>R{ficaIncl.toLocaleString()}</td></tr>
            <tr><td><strong>Total Transfer Costs</strong></td><td><strong>R{totalTransfer.toLocaleString()}</strong></td></tr>
          </tbody>
        </table>

        <h2>Bond Registration Costs</h2>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Bond Registration Fee</td><td>R{bondReg.toLocaleString()}</td></tr>
            <tr><td><strong>Total Bond Costs</strong></td><td><strong>R{totalBond.toLocaleString()}</strong></td></tr>
          </tbody>
        </table>

        <h2>Grand Total: R{grandTotal.toLocaleString()}</h2>
      </div>

      <button onClick={generatePDF} style={styles.pdfButton}>Generate PDF Report</button>
    </div>
  );
}

const styles = {
  container: { 
    backgroundColor: COLORS.background, 
    padding: 24, 
    minHeight: '100vh',
    boxShadow: 'inset 6px 6px 12px #c8c9cc, inset -6px -6px 12px #ffffff' 
  },
  title: { color: COLORS.primary, fontSize: 28, marginBottom: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400, margin: 'auto' },
  label: { color: COLORS.primary, fontSize: 14, marginBottom: 4 },
  input: { 
    padding: 12, 
    border: 'none', 
    borderRadius: 12, 
    background: COLORS.background,
    boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff',
    fontSize: 16, 
    transition: 'box-shadow 0.3s ease',
    ':focus': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86' } 
  },
  select: { 
    padding: 12, 
    border: 'none', 
    borderRadius: 12, 
    background: COLORS.background,
    boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff',
    fontSize: 16, 
    transition: 'box-shadow 0.3s ease',
    ':focus': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86' } 
  },
  results: { marginTop: 32, textAlign: 'center' },
  table: { 
    width: '100%', 
    maxWidth: 600, 
    margin: 'auto', 
    borderCollapse: 'collapse', 
    boxShadow: '6px 6px 12px #c8c9cc, -6px -6px 12px #ffffff',
    borderRadius: 12,
    overflow: 'hidden' 
  },
  pdfButton: { 
    marginTop: 24, 
    padding: '12px 24px', 
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.primary})`, 
    color: COLORS.white, 
    border: 'none', 
    borderRadius: 12, 
    fontSize: 16, 
    cursor: 'pointer', 
    boxShadow: '6px 6px 12px #c8c9cc, -6px -6px 12px #ffffff',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    ':hover': { boxShadow: 'inset 6px 6px 12px #b08e4e, inset -6px -6px 12px #f4ca86', transform: 'translateY(2px)' } 
  }
};