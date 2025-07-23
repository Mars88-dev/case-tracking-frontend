// src/components/BondTransferCalculator.js
import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = {
  primary: "#142a4f",
  accent: "#d2ac68",
  background: "#f5f5f5",
  white: "#ffffff",
  gray: "#f9fafb",
  border: "#cbd5e1",
  gold: "#d2ac68",
  blue: "#142a4f"
};

const VAT_RATE = 0.15; // 15% VAT in SA
const DISCLAIMER = "Additional amount to be added (if applicable) for pro rata rates & taxes, levies, investment fees, documents generating costs, bank initiation cost, etc. Other expenses are Postage & Petties, Fica, Deeds Office Fees and VAT. NB. The above are estimates only, final account may vary.";

// Updated South African Transfer Duty calculation (2025 SARS rates, matches your 2.2M example at 45,786)
const calculateTransferDuty = (price, dutyApplicable) => {
  if (!dutyApplicable) return 0;
  if (price <= 1210000) return 0;
  if (price <= 1663800) return (price - 1210000) * 0.03;
  if (price <= 2329300) return 13614 + (price - 1663800) * 0.06;
  if (price <= 2994800) return 53544 + (price - 2329300) * 0.08;
  if (price <= 13310000) return 106784 + (price - 2994800) * 0.11;
  return 1241456 + (price - 13310000) * 0.13;
};

// Transfer Fees based on your 2023 cost list (proportional scaling, matches 2.2M at 36,470; add exact brackets if needed)
const calculateTransferFees = (price) => {
  // Example brackets; refine with your full list
  if (price <= 100000) return 5000;
  if (price <= 200000) return 6000;
  if (price <= 300000) return 7000;
  // For higher values, proportional to 2.2M example
  return Math.round(36470 * (price / 2200000));
};

// Other fees from your example and cost list
const calculateOtherFees = (price) => ({
  clearance: 1050,
  investmentDeposit: 750,
  deedsOffice: 2281, // Fixed from example; scale if needed
  deedsSearch: 105,
  postPetties: 950, // Updated to match example (was 700 + VAT, but base here)
  docGen: 257,
  dotsTracking: 350,
  fica: 1900,
  submitDuty: 250,
});

// VAT breakdown (dynamic, matches example exactly for 2.2M)
const calculateVATBreakdown = (fees, otherFees) => {
  const vatTransferFees = fees * VAT_RATE;
  const vatPostPetties = otherFees.postPetties * VAT_RATE;
  const vatDocGen = otherFees.docGen * VAT_RATE;
  const vatDots = otherFees.dotsTracking * VAT_RATE;
  const vatFica = otherFees.fica * VAT_RATE;
  const vatSubmit = otherFees.submitDuty * VAT_RATE;
  const totalVAT = vatTransferFees + vatPostPetties + vatDocGen + vatDots + vatFica + vatSubmit;
  return {
    vatTransferFees,
    vatPostPetties,
    vatDocGen,
    vatDots,
    vatFica,
    vatSubmit,
    totalVAT,
  };
};

// Bond Costs (estimate, based on 2023 list; dynamic for bond amount)
const calculateBondCosts = (bond) => {
  if (!bond || bond <= 0) return { deedsOffice: 0, conveyancer: 0, postPetties: 0, docGen: 0, vat: 0, total: 0 };
  let conveyancer = 0;
  if (bond <= 500000) conveyancer = 15000;
  else if (bond <= 1000000) conveyancer = 20000;
  else conveyancer = 20000 + (bond - 1000000) * 0.01; // Scaled estimate
  const deedsOffice = 2281;
  const postPetties = 700;
  const docGen = 257;
  const vat = (conveyancer + postPetties + docGen) * VAT_RATE;
  const total = deedsOffice + conveyancer + postPetties + docGen + vat;
  return { deedsOffice, conveyancer, postPetties, docGen, vat, total };
};

export default function BondTransferCalculator() {
  const [purchasePrice, setPurchasePrice] = useState('');
  const [bondAmount, setBondAmount] = useState('');
  const [vatIncluded, setVatIncluded] = useState(false);
  const [dutyApplicable, setDutyApplicable] = useState(true);

  // Mutual exclusivity: Can't have both VAT included and duty applicable
  const handleVatChange = (e) => {
    setVatIncluded(e.target.checked);
    if (e.target.checked) setDutyApplicable(false);
  };

  const handleDutyChange = (e) => {
    setDutyApplicable(e.target.checked);
    if (e.target.checked) setVatIncluded(false);
  };

  // Enhanced futuristic neumorphic animations with particles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes glowPulse {
        0% { box-shadow: 0 0 8px rgba(210, 172, 104, 0.4), inset 0 0 8px rgba(20, 42, 79, 0.3); }
        50% { box-shadow: 0 0 20px rgba(210, 172, 104, 0.7), inset 0 0 15px rgba(20, 42, 79, 0.5); }
        100% { box-shadow: 0 0 8px rgba(210, 172, 104, 0.4), inset 0 0 8px rgba(20, 42, 79, 0.3); }
      }
      @keyframes waveGradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes particleFloat {
        0% { transform: translateY(0); opacity: 0.5; }
        100% { transform: translateY(-100px); opacity: 0; }
      }
      .animated-card {
        animation: glowPulse 3s ease-in-out infinite;
        position: relative;
        overflow: hidden;
      }
      .pattern-background {
        background: linear-gradient(135deg, ${COLORS.blue}, ${COLORS.gold}, ${COLORS.blue});
        background-size: 400% 400%;
        animation: waveGradient 15s ease infinite;
        opacity: 0.2;
      }
      .particles {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      .particle {
        position: absolute;
        background: rgba(210, 172, 104, 0.3);
        border-radius: 50%;
        animation: particleFloat 5s linear infinite;
      }
      .input-hover:hover, .button-hover:hover {
        transform: scale(1.05) translateY(-2px);
        box-shadow: 0 6px 15px rgba(210, 172, 104, 0.6), inset 0 3px 8px rgba(20, 42, 79, 0.4);
        transition: all 0.4s ease;
      }
    `;
    document.head.appendChild(style);

    // Add particles dynamically
    const card = document.querySelector('.animated-card');
    if (card) {
      const particlesContainer = document.createElement('div');
      particlesContainer.className = 'particles';
      for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.width = `${Math.random() * 5 + 2}px`;
        particle.style.height = particle.style.width;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDuration = `${Math.random() * 3 + 2}s`;
        particle.style.animationDelay = `${Math.random() * 2}s`;
        particlesContainer.appendChild(particle);
      }
      card.appendChild(particlesContainer);
    }

    return () => {
      document.head.removeChild(style);
      if (card) card.removeChild(card.querySelector('.particles'));
    };
  }, []);

  const priceNum = Number(purchasePrice) || 0;
  const bondNum = Number(bondAmount) || 0;
  const adjustedPrice = vatIncluded ? priceNum / (1 + VAT_RATE) : priceNum;

  // Calculations with zero defaults
  const transferDuty = priceNum ? calculateTransferDuty(adjustedPrice, dutyApplicable) : 0;
  const transferFees = priceNum ? calculateTransferFees(adjustedPrice) : 0;
  const otherFees = priceNum ? calculateOtherFees(adjustedPrice) : { clearance: 0, investmentDeposit: 0, deedsOffice: 0, deedsSearch: 0, postPetties: 0, docGen: 0, dotsTracking: 0, fica: 0, submitDuty: 0 };
  const vatBreakdown = priceNum ? calculateVATBreakdown(transferFees, otherFees) : { vatTransferFees: 0, vatPostPetties: 0, vatDocGen: 0, vatDots: 0, vatFica: 0, vatSubmit: 0, totalVAT: 0 };
  const totalTransfer = transferDuty + transferFees + otherFees.clearance + otherFees.investmentDeposit + otherFees.deedsOffice + otherFees.deedsSearch + otherFees.postPetties + otherFees.docGen + otherFees.dotsTracking + otherFees.fica + otherFees.submitDuty + vatBreakdown.totalVAT;

  const bondCosts = bondNum ? calculateBondCosts(bondNum) : { deedsOffice: 0, conveyancer: 0, postPetties: 0, docGen: 0, vat: 0, total: 0 };

  const generatePDF = () => {
    const doc = new jsPDF();

    // Logo with optional white-out fix (uncomment if your PNG isn't transparent)
    // doc.setFillColor(255, 255, 255);
    // doc.rect(80, 5, 50, 25, 'F');
    doc.addImage('/logo.png', 'PNG', 80, 5, 50, 25);

    // Title (larger, bolder)
    doc.setTextColor(COLORS.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('QUOTATION - Estimation', 105, 40, { align: 'center' });

    // Input Summary (improved spacing and font)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Purchase Price: R ${purchasePrice || 'N/A'} (VAT Included: ${vatIncluded ? 'Yes' : 'No'})`, 20, 55);
    doc.text(`Bond Amount: R ${bondAmount || 'N/A'}`, 20, 65);
    doc.text(`Transfer Duty Applicable: ${dutyApplicable ? 'Yes' : 'No'}`, 20, 75);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 20, 85);

    // Transfer Costs Table (enhanced readability: larger font, more padding)
    autoTable(doc, {
      startY: 95,
      head: [['Description', 'VAT', 'Debit', 'Credit']],
      body: [
        ['To transfer fees', `R ${vatBreakdown.vatTransferFees.toFixed(2)}`, `R ${transferFees.toFixed(2)}`, ''],
        ['To Transfer Duty', '', `R ${transferDuty.toFixed(2)}`, ''],
        ['To Clearance Certificate fee payable', '', `R ${otherFees.clearance.toFixed(2)}`, ''],
        ['To Application of Investment of Deposit', '', `R ${otherFees.investmentDeposit.toFixed(2)}`, ''],
        ['To Deeds Office fee', '', `R ${otherFees.deedsOffice.toFixed(2)}`, ''],
        ['To Deeds Office search', '', `R ${otherFees.deedsSearch.toFixed(2)}`, ''],
        ['To Postages and Petties', `R ${vatBreakdown.vatPostPetties.toFixed(2)}`, `R ${otherFees.postPetties.toFixed(2)}`, ''],
        ['To Document Generation Charge', `R ${vatBreakdown.vatDocGen.toFixed(2)}`, `R ${otherFees.docGen.toFixed(2)}`, ''],
        ['To DOTS Tracking Fee', `R ${vatBreakdown.vatDots.toFixed(2)}`, `R ${otherFees.dotsTracking.toFixed(2)}`, ''],
        ['To FICA identification and verification fee', `R ${vatBreakdown.vatFica.toFixed(2)}`, `R ${otherFees.fica.toFixed(2)}`, ''],
        ['To Submitting of Transfer Duty Fee', `R ${vatBreakdown.vatSubmit.toFixed(2)}`, `R ${otherFees.submitDuty.toFixed(2)}`, ''],
        ['VAT', `R ${vatBreakdown.totalVAT.toFixed(2)}`, `R ${(transferFees + otherFees.postPetties + otherFees.docGen + otherFees.dotsTracking + otherFees.fica + otherFees.submitDuty).toFixed(2)}`, ''],
        ['TOTAL AMOUNT DUE (incl. VAT)', '', `R ${totalTransfer.toFixed(2)}`, '']
      ],
      theme: 'grid',
      headStyles: { fillColor: COLORS.blue, textColor: COLORS.gold, fontStyle: 'bold', fontSize: 10, lineWidth: 0.5, lineColor: COLORS.gold },
      alternateRowStyles: { fillColor: COLORS.gray, textColor: COLORS.primary },
      margin: { left: 15, right: 15 }, // Wider margins for readability
      styles: { cellPadding: 3, fontSize: 9, overflow: 'linebreak', lineColor: COLORS.border, lineWidth: 0.1 },
      didDrawCell: (data) => {
        // Highlight final total row with neumorphic style
        if (data.row.index === data.table.body.length - 1 && data.column.index === 2) {
          doc.setFillColor(COLORS.gray);
          doc.setDrawColor(COLORS.gold);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'FD');
          doc.setTextColor(COLORS.accent);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
        }
      }
    });

    let finalY = doc.lastAutoTable.finalY + 10; // Extra space

    // Bond Costs Table (similar enhancements)
    if (bondNum > 0) {
      autoTable(doc, {
        startY: finalY,
        head: [['Bond Costs (Estimate)', 'Amount']],
        body: [
          ['Deeds Office Fee', `R ${bondCosts.deedsOffice.toFixed(2)}`],
          ['Conveyancer Fee', `R ${bondCosts.conveyancer.toFixed(2)}`],
          ['Post & Petties', `R ${bondCosts.postPetties.toFixed(2)}`],
          ['Electronic Doc Gen', `R ${bondCosts.docGen.toFixed(2)}`],
          ['VAT', `R ${bondCosts.vat.toFixed(2)}`],
          ['Subtotal', `R ${bondCosts.total.toFixed(2)}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: COLORS.blue, textColor: COLORS.gold, fontStyle: 'bold', fontSize: 10 },
        alternateRowStyles: { fillColor: COLORS.gray },
        margin: { left: 15, right: 15 },
        styles: { cellPadding: 3, fontSize: 9, lineColor: COLORS.border, lineWidth: 0.1 },
        didDrawCell: (data) => {
          // Highlight subtotal
          if (data.row.index === data.table.body.length - 1 && data.column.index === 1) {
            doc.setFillColor(COLORS.gray);
            doc.setDrawColor(COLORS.gold);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'FD');
            doc.setTextColor(COLORS.accent);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
          }
        }
      });
      finalY = doc.lastAutoTable.finalY + 10;
    }

    // Footer (smaller font, more space)
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'normal');
    doc.text('GERHARD BARNARD TRUST ACCOUNT | STANDARD BANK | ACCOUNT: 301 454 310 | BRANCH: 012 445', 15, finalY + 10);
    doc.text('*Payments via EFT only. Confirm details telephonically.', 15, finalY + 20);
    doc.text(DISCLAIMER, 15, finalY + 30, { maxWidth: 180 });

    doc.save(`QUOTATION - Estimation R ${purchasePrice || '0'}.pdf`);
  };

  return (
    <div style={styles.container}>
      <div style={styles.patternBackground} className="pattern-background"></div>
      <div style={styles.card} className="animated-card">
        <img src="/logo.png" alt="Firm Logo" style={styles.logo} />
        <h1 style={styles.title}>Bond Transfer Calculator</h1>
        <p style={styles.subtitle}>Futuristic Quotation Generator</p>
        
        <div style={styles.inputGroup}>
          <label style={styles.label}>Purchase Price (R)</label>
          <input
            type="number"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            style={styles.input}
            placeholder="e.g. 2200000"
            className="input-hover"
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
            className="input-hover"
          />
        </div>
        
        <div style={styles.checkboxGroup}>
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={vatIncluded} onChange={handleVatChange} style={styles.checkbox} />
            VAT Included in Purchase Price?
          </label>
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={dutyApplicable} onChange={handleDutyChange} style={styles.checkbox} />
            Transfer Duty Applicable?
          </label>
        </div>
        
        <div style={styles.resultSection}>
          <h3 style={styles.sectionTitle}>Transfer Costs</h3>
          <div style={styles.resultItem}><span>Transfer Fees:</span><span>R {(transferFees || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>VAT (Fees):</span><span>R {(vatBreakdown.vatTransferFees || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Transfer Duty:</span><span>R {(transferDuty || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Clearance Certificate:</span><span>R {(otherFees.clearance || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Investment of Deposit:</span><span>R {(otherFees.investmentDeposit || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Deeds Office Fee:</span><span>R {(otherFees.deedsOffice || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Deeds Office Search:</span><span>R {(otherFees.deedsSearch || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Postages and Petties:</span><span>R {(otherFees.postPetties || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>VAT (Postages):</span><span>R {(vatBreakdown.vatPostPetties || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Document Generation:</span><span>R {(otherFees.docGen || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>VAT (Doc Gen):</span><span>R {(vatBreakdown.vatDocGen || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>DOTS Tracking Fee:</span><span>R {(otherFees.dotsTracking || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>VAT (DOTS):</span><span>R {(vatBreakdown.vatDots || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>FICA Verification:</span><span>R {(otherFees.fica || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>VAT (FICA):</span><span>R {(vatBreakdown.vatFica || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Submitting Transfer Duty:</span><span>R {(otherFees.submitDuty || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>VAT (Submit Duty):</span><span>R {(vatBreakdown.vatSubmit || 0).toFixed(2)}</span></div>
          <div style={styles.prominentSubtotal}><span>Subtotal:</span><span>R {(totalTransfer || 0).toFixed(2)}</span></div>
        </div>
        
        <div style={styles.resultSection}>
          <h3 style={styles.sectionTitle}>Bond Costs (Estimate) {(!bondAmount || bondAmount <= 0) && '(No Bond Entered)'}</h3>
          <div style={styles.resultItem}><span>Deeds Office Fee:</span><span>R {(bondCosts.deedsOffice || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Conveyancer Fee:</span><span>R {(bondCosts.conveyancer || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Post & Petties:</span><span>R {(bondCosts.postPetties || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>Electronic Doc Gen:</span><span>R {(bondCosts.docGen || 0).toFixed(2)}</span></div>
          <div style={styles.resultItem}><span>VAT:</span><span>R {(bondCosts.vat || 0).toFixed(2)}</span></div>
          <div style={styles.prominentSubtotal}><span>Subtotal:</span><span>R {(bondCosts.total || 0).toFixed(2)}</span></div>
        </div>
        
        <p style={styles.disclaimer}>{DISCLAIMER}</p>
        
        <button onClick={generatePDF} style={styles.button} className="button-hover">Generate PDF Quotation</button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: COLORS.background,
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  patternBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
  },
  card: {
    background: `linear-gradient(135deg, ${COLORS.white}, ${COLORS.gray})`,
    borderRadius: '24px',
    padding: '40px',
    boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.2), -8px -8px 16px rgba(255, 255, 255, 0.7), 0 0 10px rgba(210, 172, 104, 0.3)',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    border: `2px solid rgba(210, 172, 104, 0.3)`,
  },
  logo: {
    width: '120px',
    height: 'auto',
    marginBottom: '20px',
    filter: 'drop-shadow(0 0 8px rgba(210, 172, 104, 0.5))',
  },
  title: {
    fontSize: '28px',
    color: COLORS.primary,
    marginBottom: '10px',
    textShadow: '2px 2px 4px rgba(210, 172, 104, 0.4)',
  },
  subtitle: {
    fontSize: '16px',
    color: COLORS.accent,
    marginBottom: '30px',
  },
  inputGroup: {
    marginBottom: '20px',
    textAlign: 'left',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
    background: `linear-gradient(135deg, ${COLORS.gray}, ${COLORS.white})`,
    boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.15), inset -3px -3px 6px rgba(255,255,255,0.6)',
    fontSize: '16px',
    transition: 'all 0.3s ease',
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: '30px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    color: COLORS.primary,
    marginBottom: '10px',
  },
  checkbox: {
    marginRight: '10px',
  },
  resultSection: {
    marginBottom: '30px',
    textAlign: 'left',
    background: `linear-gradient(135deg, ${COLORS.gray}, ${COLORS.white})`,
    borderRadius: '12px',
    padding: '15px',
    boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px rgba(255,255,255,0.5)',
  },
  sectionTitle: {
    fontSize: '18px',
    color: COLORS.primary,
    marginBottom: '15px',
    borderBottom: `1px solid rgba(210, 172, 104, 0.3)`,
    paddingBottom: '5px',
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    color: COLORS.primary,
    fontSize: '14px', // Slightly larger for readability
  },
  prominentSubtotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '24px', // Bigger and prominent
    fontWeight: 'bold',
    color: COLORS.accent,
    marginTop: '15px',
    padding: '10px',
    background: `linear-gradient(135deg, ${COLORS.gray}, ${COLORS.white})`,
    borderRadius: '8px',
    boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px rgba(255,255,255,0.5), 0 0 8px rgba(210, 172, 104, 0.3)', // Neumorphic glow
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '30px',
    textAlign: 'center',
  },
  button: {
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.blue})`,
    color: COLORS.white,
    padding: '15px 30px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    boxShadow: '3px 3px 6px rgba(0,0,0,0.15), -3px -3px 6px rgba(255,255,255,0.6)',
    transition: 'all 0.3s ease',
  },
};