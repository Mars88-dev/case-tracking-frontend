// src/components/BondTransferCalculator.js
import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LIGHT_COLORS = {
  primary: "#142a4f",
  accent: "#d2ac68",
  background: "#f5f5f5",
  white: "#ffffff",
  gray: "#f9fafb",
  border: "#cbd5e1",
  gold: "#d2ac68",
  blue: "#142a4f",
  text: "#142a4f",
  subtleText: "#666",
};

const DARK_COLORS = {
  primary: "#d2ac68", // Gold for primary in dark
  accent: "#142a4f", // Blue accents
  background: "#1a1a1a",
  white: "#2a2a2a",
  gray: "#333333",
  border: "#4a4a4a",
  gold: "#d2ac68",
  blue: "#142a4f",
  text: "#f5f5f5", // Light text for readability
  subtleText: "#bbbbbb",
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

// Updated Transfer Fees with brackets from your cost list (fixed 13,420 up to 400k, scaling up)
const calculateTransferFees = (price) => {
  if (price <= 400000) return 13420; // Fixed as per your update up to 400k
  if (price <= 450000) return 15301;
  if (price <= 500000) return 17375;
  if (price <= 700000) return 19448;
  if (price <= 750000) return 21522;
  if (price <= 850000) return 23595;
  if (price <= 1000000) return 25669;
  if (price <= 1100000) return 27742;
  if (price <= 1200000) return 29816;
  if (price <= 1400000) return 31889;
  if (price <= 1500000) return 33036; // Approx from list
  if (price <= 1700000) return 35053;
  if (price <= 2000000) return 37070;
  if (price <= 2200000) return 39087; // Matches list for 2.2M
  if (price <= 2400000) return 41104;
  if (price <= 2700000) return 43121;
  if (price <= 3000000) return 45138;
  if (price <= 3400000) return 49172;
  if (price <= 4000000) return 57129; // Upper end approx; add more if needed
  // For >4M, proportional scale based on list pattern
  return Math.round(57129 + (price - 4000000) * 0.014); // Adjust rate if needed
};

// Other fees (base from example, with slight scaling based on your list patterns for expenses)
const calculateOtherFees = (price) => {
  const baseExpenses = 5600.90; // From low end
  const scaledExpenses = baseExpenses + (price * 0.002); // Approx increase from list (e.g., ~13k at 4M)
  return {
    clearance: 1050,
    investmentDeposit: 750,
    deedsOffice: 2281,
    deedsSearch: 105,
    postPetties: 950,
    docGen: 257,
    dotsTracking: 350,
    fica: 1900,
    submitDuty: 250,
    totalExpenses: scaledExpenses, // Use this if you want to aggregate, but keeping separate for now
  };
};

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

// Bond Costs (estimate, based on 2023 list; dynamic for bond amount, updated from your table)
const calculateBondCosts = (bond) => {
  if (!bond || bond <= 0) return { deedsOffice: 0, conveyancer: 0, postPetties: 0, docGen: 0, vat: 0, total: 0 };
  let conveyancer = 0;
  if (bond <= 500000) conveyancer = 17375; // Updated from list
  else if (bond <= 1000000) conveyancer = 25669;
  else conveyancer = 25669 + (bond - 1000000) * 0.01; // Scaled estimate from higher brackets
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
  const [darkMode, setDarkMode] = useState(false); // Dark mode state

  const colors = darkMode ? DARK_COLORS : LIGHT_COLORS;

  // Mutual exclusivity: Can't have both VAT included and duty applicable
  const handleVatChange = (e) => {
    setVatIncluded(e.target.checked);
    if (e.target.checked) setDutyApplicable(false);
  };

  const handleDutyChange = (e) => {
    setDutyApplicable(e.target.checked);
    if (e.target.checked) setVatIncluded(false);
  };

  // Enhanced futuristic neumorphic animations with particles (adapted for dark mode)
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
        background: linear-gradient(135deg, ${colors.blue}, ${colors.gold}, ${colors.blue});
        background-size: 400% 400%;
        animation: waveGradient 15s ease infinite;
        opacity: ${darkMode ? 0.1 : 0.2}; // Subtler in dark
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
        background: rgba(210, 172, 104, ${darkMode ? 0.2 : 0.3});
        border-radius: 50%;
        animation: particleFloat 5s linear infinite;
      }
      .input-hover:hover, .button-hover:hover {
        transform: scale(1.05) translateY(-2px);
        box-shadow: 0 6px 15px rgba(210, 172, 104, 0.6), inset 0 3px 8px rgba(20, 42, 79, 0.4);
        transition: all 0.4s ease;
      }
      .toggle-switch {
        display: inline-flex;
        align-items: center;
        margin-bottom: 20px;
      }
      .toggle-switch input {
        display: none;
      }
      .toggle-switch label {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 24px;
        background-color: ${colors.gray};
        border-radius: 12px;
        transition: background-color 0.3s;
        box-shadow: inset 2px 2px 4px rgba(0,0,0,0.2);
      }
      .toggle-switch label::before {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 20px;
        height: 20px;
        background-color: ${colors.white};
        border-radius: 50%;
        transition: transform 0.3s;
        box-shadow: 1px 1px 3px rgba(0,0,0,0.3);
      }
      .toggle-switch input:checked + label {
        background-color: ${colors.gold};
      }
      .toggle-switch input:checked + label::before {
        transform: translateX(26px);
      }
      .prominentSubtotal {
        color: ${darkMode ? colors.white : colors.accent}; // White in dark mode for readability
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
  }, [darkMode]); // Re-run on darkMode change

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

    // Full white background for header area to force transparency to white (no black underlays)
    doc.setFillColor(255, 255, 255);
    doc.rect(10, 5, 190, 40, 'F'); // Covers the entire header zone

    // Add header image as smaller logo (to avoid full-width issues), centered
    doc.addImage('/header.png', 'PNG', 75, 10, 60, 25); // Smaller, centered for pro look

    // Professional text header (firm name in gold, subtle divider)
    doc.setTextColor(colors.gold);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('Gerhard Barnard Inc.', 105, 45, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Attorneys and Conveyancers', 105, 52, { align: 'center' });
    // Subtle gold divider line
    doc.setLineWidth(0.5);
    doc.setDrawColor(colors.gold);
    doc.line(20, 55, 190, 55);

    // Input Summary (shifted down)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.primary);
    doc.text(`Purchase Price: R ${purchasePrice || 'N/A'} (VAT Included: ${vatIncluded ? 'Yes' : 'No'})`, 20, 65);
    doc.text(`Bond Amount: R ${bondAmount || 'N/A'}`, 20, 75);
    doc.text(`Transfer Duty Applicable: ${dutyApplicable ? 'Yes' : 'No'}`, 20, 85);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 20, 95);

    // Transfer Costs Table (cleaner style: lighter borders, no heavy black lines)
    autoTable(doc, {
      startY: 105,
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
      headStyles: { fillColor: colors.white, textColor: colors.blue, fontStyle: 'bold', fontSize: 10, lineWidth: 0.2, lineColor: colors.border },
      alternateRowStyles: { fillColor: colors.gray, textColor: colors.primary },
      margin: { left: 15, right: 15 },
      styles: { cellPadding: 3, fontSize: 9, overflow: 'linebreak', lineColor: colors.border, lineWidth: 0.1 },
      willDrawCell: (data) => {
        // Standout for total row: light gold bg, bold gold text, thicker bottom border
        if (data.row.index === data.table.body.length - 1) {
          data.cell.styles.fillColor = [255, 250, 240]; // Light gold-ish for subtle pop
          data.cell.styles.textColor = colors.gold;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize - 11;
          data.cell.styles.lineWidth = { bottom: 0.5 }; // Thicker bottom only
        }
      }
    });

    let finalY = doc.lastAutoTable.finalY + 10; // Extra space

    // Bond Costs Table (similar clean style)
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
        headStyles: { fillColor: colors.white, textColor: colors.blue, fontStyle: 'bold', fontSize: 10, lineWidth: 0.2, lineColor: colors.border },
        alternateRowStyles: { fillColor: colors.gray },
        margin: { left: 15, right: 15 },
        styles: { cellPadding: 3, fontSize: 9, lineColor: colors.border, lineWidth: 0.1 },
        willDrawCell: (data) => {
          // Highlight subtotal subtly
          if (data.row.index === data.table.body.length - 1 && data.column.index === 1) {
            data.cell.styles.textColor = colors.gold;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 11;
          }
        }
      });
      finalY = doc.lastAutoTable.finalY + 10;
    }

    // Footer with disclaimer (added space, larger font to prevent clipping)
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text('GERHARD BARNARD TRUST ACCOUNT | STANDARD BANK | ACCOUNT: 301 454 310 | BRANCH: 012 445', 15, finalY + 10);
    doc.text('*Payments via EFT only. Confirm details telephonically.', 15, finalY + 20);
    doc.text(DISCLAIMER, 15, finalY + 40, { maxWidth: 180 });

    doc.save(`QUOTATION - Estimation R ${purchasePrice || '0'}.pdf`);
  };

  return (
    <div style={{ ...styles.container, backgroundColor: colors.background }}>
      <div style={styles.patternBackground} className="pattern-background"></div>
      <div style={{ ...styles.card, background: `linear-gradient(135deg, ${colors.white}, ${colors.gray})`, boxShadow: darkMode ? '-8px -8px 16px rgba(0, 0, 0, 0.4), 8px 8px 16px rgba(255, 255, 255, 0.1), 0 0 10px rgba(210, 172, 104, 0.2)' : '8px 8px 16px rgba(0, 0, 0, 0.2), -8px -8px 16px rgba(255, 255, 255, 0.7), 0 0 10px rgba(210, 172, 104, 0.3)', border: `2px solid rgba(210, 172, 104, 0.3)` }} className="animated-card">
        <div style={styles.toggleSwitch} className="toggle-switch">
          <span style={{ color: colors.text, marginRight: '10px' }}>Dark Mode</span>
          <input type="checkbox" id="darkModeToggle" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
          <label htmlFor="darkModeToggle"></label>
        </div>
        <img src="/logo.png" alt="Firm Logo" style={styles.logo} />
        <h1 style={{ ...styles.title, color: colors.primary }}>Bond Transfer Calculator</h1>
        <p style={{ ...styles.subtitle, color: colors.accent }}>Futuristic Quotation Generator</p>
        
        <div style={styles.inputGroup}>
          <label style={{ ...styles.label, color: colors.primary }}>Purchase Price (R)</label>
          <input
            type="number"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            style={{ ...styles.input, border: `1px solid ${colors.border}`, background: `linear-gradient(135deg, ${colors.gray}, ${colors.white})`, boxShadow: darkMode ? 'inset -3px -3px 6px rgba(255,255,255,0.1), inset 3px 3px 6px rgba(0,0,0,0.3)' : 'inset 3px 3px 6px rgba(0,0,0,0.15), inset -3px -3px 6px rgba(255,255,255,0.6)', color: colors.text }}
            placeholder="e.g. 2200000"
            className="input-hover"
          />
        </div>
        
        <div style={styles.inputGroup}>
          <label style={{ ...styles.label, color: colors.primary }}>Bond Amount (R, optional)</label>
          <input
            type="number"
            value={bondAmount}
            onChange={(e) => setBondAmount(e.target.value)}
            style={{ ...styles.input, border: `1px solid ${colors.border}`, background: `linear-gradient(135deg, ${colors.gray}, ${colors.white})`, boxShadow: darkMode ? 'inset -3px -3px 6px rgba(255,255,255,0.1), inset 3px 3px 6px rgba(0,0,0,0.3)' : 'inset 3px 3px 6px rgba(0,0,0,0.15), inset -3px -3px 6px rgba(255,255,255,0.6)', color: colors.text }}
            placeholder="e.g. 2000000"
            className="input-hover"
          />
        </div>
        
        <div style={styles.checkboxGroup}>
          <label style={{ ...styles.checkboxLabel, color: colors.primary }}>
            <input type="checkbox" checked={vatIncluded} onChange={handleVatChange} style={styles.checkbox} />
            VAT Included in Purchase Price?
          </label>
          <label style={{ ...styles.checkboxLabel, color: colors.primary }}>
            <input type="checkbox" checked={dutyApplicable} onChange={handleDutyChange} style={styles.checkbox} />
            Transfer Duty Applicable?
          </label>
        </div>
        
        <div style={{ ...styles.resultSection, background: `linear-gradient(135deg, ${colors.gray}, ${colors.white})`, boxShadow: darkMode ? 'inset -2px -2px 4px rgba(255,255,255,0.1), inset 2px 2px 4px rgba(0,0,0,0.3)' : 'inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px rgba(255,255,255,0.5)' }}>
          <h3 style={{ ...styles.sectionTitle, color: colors.primary, borderBottom: `1px solid rgba(210, 172, 104, 0.3)` }}>Transfer Costs</h3>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>Transfer Fees:</span><span>R {(transferFees || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>VAT (Fees):</span><span>R {(vatBreakdown.vatTransferFees || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>Transfer Duty:</span><span>R {(transferDuty || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>Clearance Certificate:</span><span>R {(otherFees.clearance || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>Investment of Deposit:</span><span>R {(otherFees.investmentDeposit || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>Deeds Office Fee:</span><span>R {(otherFees.deedsOffice || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>Deeds Office Search:</span><span>R {(otherFees.deedsSearch || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>Postages and Petties:</span><span>R {(otherFees.postPetties || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>VAT (Postages):</span><span>R {(vatBreakdown.vatPostPetties || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>Document Generation:</span><span>R {(otherFees.docGen || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>VAT (Doc Gen):</span><span>R {(vatBreakdown.vatDocGen || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>DOTS Tracking Fee:</span><span>R {(otherFees.dotsTracking || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>VAT (DOTS):</span><span>R {(vatBreakdown.vatDots || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>FICA Verification:</span><span>R {(otherFees.fica || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>VAT (FICA):</span><span>R {(vatBreakdown.vatFica || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>Submitting Transfer Duty:</span><span>R {(otherFees.submitDuty || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>VAT (Submit Duty):</span><span>R {(vatBreakdown.vatSubmit || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.prominentSubtotal, background: `linear-gradient(135deg, ${colors.gray}, ${colors.white})`, boxShadow: darkMode ? 'inset -2px -2px 4px rgba(255,255,255,0.1), inset 2px 2px 4px rgba(0,0,0,0.3), 0 0 8px rgba(210, 172, 104, 0.2)' : 'inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px rgba(255,255,255,0.5), 0 0 8px rgba(210, 172, 104, 0.3)' }} className="prominentSubtotal"><span>Subtotal:</span><span>R {(totalTransfer || 0).toFixed(2)}</span></div>
        </div>
        
        <div style={{ ...styles.resultSection, background: `linear-gradient(135deg, ${colors.gray}, ${colors.white})`, boxShadow: darkMode ? 'inset -2px -2px 4px rgba(255,255,255,0.1), inset 2px 2px 4px rgba(0,0,0,0.3)' : 'inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px rgba(255,255,255,0.5)' }}>
          <h3 style={{ ...styles.sectionTitle, color: colors.primary, borderBottom: `1px solid rgba(210, 172, 104, 0.3)` }}>Bond Costs (Estimate) {(!bondAmount || bondAmount <= 0) && '(No Bond Entered)'}</h3>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>Deeds Office Fee:</span><span>R {(bondCosts.deedsOffice || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>Conveyancer Fee:</span><span>R {(bondCosts.conveyancer || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>Post & Petties:</span><span>R {(bondCosts.postPetties || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>Electronic Doc Gen:</span><span>R {(bondCosts.docGen || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>VAT:</span><span>R {(bondCosts.vat || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.prominentSubtotal, background: `linear-gradient(135deg, ${colors.gray}, ${colors.white})`, boxShadow: darkMode ? 'inset -2px -2px 4px rgba(255,255,255,0.1), inset 2px 2px 4px rgba(0,0,0,0.3), 0 0 8px rgba(210, 172, 104, 0.2)' : 'inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px rgba(255,255,255,0.5), 0 0 8px rgba(210, 172, 104, 0.3)' }} className="prominentSubtotal"><span>Subtotal:</span><span>R {(bondCosts.total || 0).toFixed(2)}</span></div>
        </div>
        
        <p style={{ ...styles.disclaimer, color: colors.subtleText }}>{DISCLAIMER}</p>
        
        <button onClick={generatePDF} style={{ ...styles.button, background: `linear-gradient(135deg, ${colors.primary}, ${colors.blue})`, color: colors.white, boxShadow: darkMode ? '-3px -3px 6px rgba(255,255,255,0.1), 3px 3px 6px rgba(0,0,0,0.3)' : '3px 3px 6px rgba(0,0,0,0.15), -3px -3px 6px rgba(255,255,255,0.6)' }} className="button-hover">Generate PDF Quotation</button>
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
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
  },
  toggleSwitch: {
    justifyContent: 'center',
  },
  logo: {
    width: '120px',
    height: 'auto',
    marginBottom: '20px',
    filter: 'drop-shadow(0 0 8px rgba(210, 172, 104, 0.5))',
  },
  title: {
    fontSize: '28px',
    marginBottom: '10px',
    textShadow: '2px 2px 4px rgba(210, 172, 104, 0.4)',
  },
  subtitle: {
    fontSize: '16px',
    marginBottom: '30px',
  },
  inputGroup: {
    marginBottom: '20px',
    textAlign: 'left',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
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
    marginBottom: '10px',
  },
  checkbox: {
    marginRight: '10px',
  },
  resultSection: {
    marginBottom: '30px',
    textAlign: 'left',
    borderRadius: '12px',
    padding: '15px',
  },
  sectionTitle: {
    fontSize: '18px',
    marginBottom: '15px',
    paddingBottom: '5px',
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
  },
  prominentSubtotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '24px',
    fontWeight: 'bold',
    marginTop: '15px',
    padding: '10px',
    borderRadius: '8px',
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: '12px',
    marginBottom: '30px',
    textAlign: 'center',
  },
  button: {
    padding: '15px 30px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
};