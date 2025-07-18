// src/components/BondTransferCalculator.js
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // For tables in PDF (install: npm i jspdf-autotable)

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

const VAT_RATE = 0.15; // 15% VAT in SA

// Transfer Duty Calculation (2025 SARS rates)
const calculateTransferDuty = (price) => {
  if (price <= 1100000) return 0;
  if (price <= 1512500) return (price - 1100000) * 0.03;
  if (price <= 2117500) return 12375 + (price - 1512500) * 0.06;
  if (price <= 2722500) return 48750 + (price - 2117500) * 0.08;
  if (price <= 12800000) return 97375 + (price - 2722500) * 0.11;
  return 1417500 + (price - 12800000) * 0.13;
};

// Deeds Office Fees (simplified sliding scale; match mcvdberg)
const calculateDeedsOfficeFee = (price) => {
  if (price <= 100000) return 500;
  if (price <= 500000) return 1000;
  if (price <= 1000000) return 2000;
  if (price <= 2000000) return 3000;
  return 4000 + (price - 2000000) * 0.001; // Example; adjust per exact rates
};

// Conveyancer Fees (example tiers; customize to match your firm's or mcvdberg)
const calculateConveyancerFee = (price) => {
  if (price <= 500000) return 15000;
  if (price <= 1000000) return 20000;
  if (price <= 2000000) return 30000;
  return 40000 + (price - 2000000) * 0.01;
};

// Bond Registration Fees (sliding scale)
const calculateBondRegFee = (bond) => {
  if (!bond || bond <= 0) return 0;
  if (bond <= 100000) return 5000;
  if (bond <= 500000) return 10000;
  if (bond <= 1000000) return 20000;
  if (bond <= 2000000) return 30000;
  return 40000 + (bond - 2000000) * 0.01;
};

export default function BondTransferCalculator() {
  const [purchasePrice, setPurchasePrice] = useState('');
  const [bondAmount, setBondAmount] = useState('');
  const [vatIncluded, setVatIncluded] = useState(false);
  const [dutyApplicable, setDutyApplicable] = useState(true);

  // Adjust price for VAT if included
  const adjustedPrice = vatIncluded ? Number(purchasePrice) / (1 + VAT_RATE) : Number(purchasePrice);

  // Transfer Costs
  const transferDuty = dutyApplicable ? calculateTransferDuty(adjustedPrice) : 0;
  const deedsOfficeTransfer = calculateDeedsOfficeFee(adjustedPrice);
  const conveyancerTransfer = calculateConveyancerFee(adjustedPrice);
  const postPettiesTransfer = 500; // Fixed; adjust
  const ficaTransfer = 1000; // Fixed
  const electronicGenTransfer = 200; // Fixed
  const vatTransfer = (conveyancerTransfer + postPettiesTransfer + ficaTransfer + electronicGenTransfer) * VAT_RATE;
  const totalTransfer = transferDuty + deedsOfficeTransfer + conveyancerTransfer + postPettiesTransfer + ficaTransfer + electronicGenTransfer + vatTransfer;

  // Bond Costs
  const deedsOfficeBond = calculateDeedsOfficeFee(Number(bondAmount));
  const conveyancerBond = calculateBondRegFee(Number(bondAmount));
  const postPettiesBond = 300; // Fixed
  const electronicGenBond = 150; // Fixed
  const vatBond = (conveyancerBond + postPettiesBond + electronicGenBond) * VAT_RATE;
  const totalBond = deedsOfficeBond + conveyancerBond + postPettiesBond + electronicGenBond + vatBond;

  const grandTotal = totalTransfer + totalBond;

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header with Logo and Title
    doc.addImage('/logo.png', 'PNG', 150, 10, 40, 20); // Assuming logo.png in public
    doc.setFillColor(COLORS.primary);
    doc.rect(0, 0, 210, 40, 'F'); // Blue header background
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Bond Transfer Cost Report', 20, 25);
    
    // Input Summary
    doc.setTextColor(COLORS.primary);
    doc.setFontSize(12);
    doc.text(`Purchase Price: R ${purchasePrice || 'N/A'} (VAT Included: ${vatIncluded ? 'Yes' : 'No'})`, 20, 50);
    doc.text(`Bond Amount: R ${bondAmount || 'N/A'}`, 20, 60);
    doc.text(`Transfer Duty Applicable: ${dutyApplicable ? 'Yes' : 'No'}`, 20, 70);

    // Transfer Costs Table
    doc.autoTable({
      startY: 80,
      head: [['Transfer Costs', 'Amount']],
      body: [
        ['Transfer Duty', `R ${transferDuty.toFixed(2)}`],
        ['Deeds Office Fee', `R ${deedsOfficeTransfer.toFixed(2)}`],
        ['Conveyancer Fee', `R ${conveyancerTransfer.toFixed(2)}`],
        ['Post & Petties', `R ${postPettiesTransfer.toFixed(2)}`],
        ['FICA', `R ${ficaTransfer.toFixed(2)}`],
        ['Electronic Doc Generation', `R ${electronicGenTransfer.toFixed(2)}`],
        ['VAT', `R ${vatTransfer.toFixed(2)}`],
        ['Subtotal', `R ${totalTransfer.toFixed(2)}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary, textColor: 255 },
      alternateRowStyles: { fillColor: COLORS.gray },
      margin: { left: 20 },
    });

    // Bond Costs Table
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Bond Costs', 'Amount']],
      body: [
        ['Deeds Office Fee', `R ${deedsOfficeBond.toFixed(2)}`],
        ['Conveyancer Fee', `R ${conveyancerBond.toFixed(2)}`],
        ['Post & Petties', `R ${postPettiesBond.toFixed(2)}`],
        ['Electronic Doc Generation', `R ${electronicGenBond.toFixed(2)}`],
        ['VAT', `R ${vatBond.toFixed(2)}`],
        ['Subtotal', `R ${totalBond.toFixed(2)}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary, textColor: 255 },
      alternateRowStyles: { fillColor: COLORS.gray },
      margin: { left: 20 },
    });

    // Grand Total
    doc.setFontSize(14);
    doc.setTextColor(COLORS.primary);
    doc.text(`Grand Total: R ${grandTotal.toFixed(2)}`, 20, doc.lastAutoTable.finalY + 20);

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Generated by Gerhard Barnard Inc Attorneys and Conveyancers', 20, doc.lastAutoTable.finalY + 40);

    doc.save('bond_transfer_report.pdf');
  };

  return (
    <div style={styles.container}>
      <div style={styles.animatedBackground}></div>
      <div style={styles.card}>
        <h1 style={styles.title}>Bond Transfer Calculator</h1>
        <p style={styles.subtitle}>Enter details for a detailed breakdown</p>
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>Purchase Price (R)</label>
          <input
            type="number"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            style={styles.input}
            placeholder="e.g. 2200000"
          />
        </div>
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>Bond Amount (R, optional)</label>
          <input
            type="number"
            value={bondAmount}
            onChange={(e) => setBondAmount(e.target.value)}
            style={styles.input}
            placeholder="e.g. 2000000"
          />
        </div>
        
        <div style={styles.checkboxGroup}>
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={vatIncluded} onChange={(e) => setVatIncluded(e.target.checked)} />
            VAT Included in Purchase Price?
          </label>
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={dutyApplicable} onChange={(e) => setDutyApplicable(e.target.checked)} />
            Transfer Duty Applicable?
          </label>
        </div>
        
        <div style={styles.resultSection}>
          <h3 style={styles.sectionTitle}>Transfer Costs</h3>
          <div style={styles.resultItem}><span>Transfer Duty:</span><span>R {transferDuty.toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Deeds Office Fee:</span><span>R {deedsOfficeTransfer.toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Conveyancer Fee:</span><span>R {conveyancerTransfer.toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Post & Petties:</span><span>R {postPettiesTransfer.toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>FICA:</span><span>R {ficaTransfer.toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Electronic Doc Gen:</span><span>R {electronicGenTransfer.toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>VAT:</span><span>R {vatTransfer.toFixed(2)}</span></div>
          <div style={styles.subtotal}><span>Subtotal:</span><span>R {totalTransfer.toFixed(2)}</span></div>
        </div>
        
        <div style={styles.resultSection}>
          <h3 style={styles.sectionTitle}>Bond Costs</h3>
          <div style={styles.resultItem}><span>Deeds Office Fee:</span><span>R {deedsOfficeBond.toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Conveyancer Fee:</span><span>R {conveyancerBond.toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Post & Petties:</span><span>R {postPettiesBond.toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Electronic Doc Gen:</span><span>R {electronicGenBond.toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>VAT:</span><span>R {vatBond.toFixed(2)}</span></div>
          <div style={styles.subtotal}><span>Subtotal:</span><span>R {totalBond.toFixed(2)}</span></div>
        </div>
        
        <div style={styles.total}>
          <span>Grand Total:</span>
          <span>R {grandTotal.toFixed(2)}</span>
        </div>
        
        <button onClick={generatePDF} style={styles.button}>Generate PDF Report</button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    position: 'relative',
    overflow: 'hidden',
    fontFamily: 'Arial, sans-serif',
    padding: 20,
  },
  animatedBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.blue} 100%)`,
    opacity: 0.1,
    animation: 'gradientMove 15s ease infinite',
    backgroundSize: '200% 200%',
  },
  card: {
    backgroundColor: COLORS.gray,
    borderRadius: 16,
    padding: 40,
    maxWidth: 600,
    width: '100%',
    boxShadow: '6px 6px 12px #c8c9cc, -6px -6px 12px #ffffff', // Neumorphic
    zIndex: 1,
  },
  title: {
    color: COLORS.primary,
    fontSize: 28,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.primary,
    fontSize: 16,
    marginBottom: 24,
    opacity: 0.8,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: 12,
    border: 'none',
    borderRadius: 12,
    background: COLORS.background,
    boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff',
    fontSize: 16,
    transition: 'box-shadow 0.3s ease',
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 24,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    color: COLORS.primary,
    gap: 8,
  },
  resultSection: {
    margin: '20px 0',
    padding: 16,
    background: COLORS.gray,
    borderRadius: 12,
    boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff',
  },
  sectionTitle: {
    fontSize: 18,
    color: COLORS.primary,
    marginBottom: 12,
    borderBottom: `1px solid ${COLORS.border}`,
    paddingBottom: 8,
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 16,
    color: COLORS.primary,
  },
  subtotal: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    borderTop: `1px solid ${COLORS.border}`,
    paddingTop: 8,
  },
  total: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 24,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    background: COLORS.gray,
    padding: 16,
    borderRadius: 12,
    boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff',
  },
  button: {
    width: '100%',
    padding: '12px',
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.blue})`,
    color: COLORS.white,
    border: 'none',
    borderRadius: 12,
    fontSize: 16,
    cursor: 'pointer',
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    marginTop: 24,
  },
};

// Add animation keyframes
const keyframes = `@keyframes gradientMove {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}`;
document.head.insertAdjacentHTML("beforeend", `<style>${keyframes}</style>`);