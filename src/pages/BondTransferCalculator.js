// src/components/BondTransferCalculator.js
import React, { useState } from 'react';
import jsPDF from 'jspdf'; // For PDF generation (install via npm if not already: npm i jspdf)

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

const calculateTransferDuty = (price) => {
  if (price <= 1100000) return 0;
  if (price <= 1512500) return (price - 1100000) * 0.03;
  if (price <= 2117500) return 12375 + (price - 1512500) * 0.06;
  if (price <= 2722500) return 48750 + (price - 2117500) * 0.08;
  if (price <= 12800000) return 97375 + (price - 2722500) * 0.11;
  return 1417500 + (price - 12800000) * 0.13;
};

const calculateBondRegistration = (bond) => {
  if (!bond) return 0;
  if (bond <= 1100000) return 0; // Assuming no reg fee below threshold; adjust if needed
  // Sliding scale based on mcvdberg/SARS 2025 (simplified; expand as needed)
  if (bond <= 1000000) return 15000;
  if (bond <= 2000000) return 25000;
  if (bond <= 3000000) return 35000;
  return 45000 + (bond - 3000000) * 0.01; // Example scale; match your ref
};

const calculateConveyancingFees = (price) => {
  // Based on mcvdberg calculator and your 10.png ref (e.g., for 2.2M: ~R35,000 bond, etc.)
  // Add more tiers/logic here to match exactly
  if (price <= 1000000) return 20000;
  if (price <= 2000000) return 30000;
  return 40000 + (price - 2000000) * 0.005;
};

export default function BondTransferCalculator() {
  const [purchasePrice, setPurchasePrice] = useState('');
  const [bondAmount, setBondAmount] = useState('');

  const transferDuty = calculateTransferDuty(Number(purchasePrice));
  const bondReg = calculateBondRegistration(Number(bondAmount));
  const conveyancing = calculateConveyancingFees(Number(purchasePrice));
  const total = transferDuty + bondReg + conveyancing;

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Bond Transfer Cost Report', 20, 20);
    doc.addImage('/logo.png', 'PNG', 150, 10, 40, 20); // Assuming logo.png in public

    doc.setFontSize(12);
    doc.text(`Purchase Price: R ${purchasePrice || 'N/A'}`, 20, 40);
    doc.text(`Bond Amount: R ${bondAmount || 'N/A'}`, 20, 50);
    doc.text(`Transfer Duty: R ${transferDuty.toFixed(2)}`, 20, 60);
    doc.text(`Bond Registration: R ${bondReg.toFixed(2)}`, 20, 70);
    doc.text(`Conveyancing Fees: R ${conveyancing.toFixed(2)}`, 20, 80);
    doc.text(`Total: R ${total.toFixed(2)}`, 20, 90);

    doc.save('bond_transfer_report.pdf');
  };

  return (
    <div style={styles.container}>
      <div style={styles.animatedBackground}></div>
      <div style={styles.card}>
        <h1 style={styles.title}>Bond Transfer Calculator</h1>
        <p style={styles.subtitle}>Enter details for instant calculation</p>
        
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
        
        <div style={styles.resultSection}>
          <div style={styles.resultItem}>
            <span>Transfer Duty:</span>
            <span>R {transferDuty.toFixed(2)}</span>
          </div>
          <div style={styles.resultItem}>
            <span>Bond Registration:</span>
            <span>R {bondReg.toFixed(2)}</span>
          </div>
          <div style={styles.resultItem}>
            <span>Conveyancing Fees:</span>
            <span>R {conveyancing.toFixed(2)}</span>
          </div>
          <div style={styles.total}>
            <span>Total:</span>
            <span>R {total.toFixed(2)}</span>
          </div>
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
    maxWidth: 500,
    width: '100%',
    boxShadow: '6px 6px 12px #c8c9cc, -6px -6px 12px #ffffff', // Neumorphic
    zIndex: 1,
    textAlign: 'center',
  },
  title: {
    color: COLORS.primary,
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.primary,
    fontSize: 16,
    marginBottom: 24,
    opacity: 0.8,
  },
  inputGroup: {
    marginBottom: 20,
    textAlign: 'left',
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
  resultSection: {
    margin: '20px 0',
    padding: 16,
    background: COLORS.gray,
    borderRadius: 12,
    boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff',
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 16,
    color: COLORS.primary,
  },
  total: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 12,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    borderTop: `1px solid ${COLORS.border}`,
    paddingTop: 8,
  },
  button: {
    padding: '12px 24px',
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.blue})`,
    color: COLORS.white,
    border: 'none',
    borderRadius: 12,
    fontSize: 16,
    cursor: 'pointer',
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    ':hover': { boxShadow: 'inset 3px 3px 6px #0f1f3d, inset -3px -3px 6px #1e3a6e', transform: 'translateY(2px)' },
  },
};

// Add animation keyframes
const keyframes = `@keyframes gradientMove {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}`;
document.head.insertAdjacentHTML("beforeend", `<style>${keyframes}</style>`);