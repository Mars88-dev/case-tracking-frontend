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
  patternBlue: "#3b5998", // Inspired by example's blue tones
  lightGray: "#e6e9ed",
};

const DARK_COLORS = {
  primary: "#d2ac68", // Gold for primary in dark
  accent: "#142a4f", // Blue accents
  background: "#1a1a1a",
  white: "#ffffff",
  gray: "#333333",
  border: "#4a4a4a",
  gold: "#d2ac68",
  blue: "#142a4f",
  text: "#f5f5f5",
  subtleText: "#bbbbbb",
  patternBlue: "#1c3a6e", // Darker blue for patterns
  lightGray: "#4a4a4a",
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
        color: ${darkMode ? colors.gold : colors.accent}; // Gold in dark for readability, accent in light
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

    // Full white background with subtle pattern (replicating example's textured bg)
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 297, 'F');
    // Add faint blue-gold gradient pattern lines (like example's subtle design)
    doc.setDrawColor(colors.patternBlue);
    doc.setLineWidth(0.1);
    for (let i = 0; i < 297; i += 5) {
      doc.line(0, i, 210, i + 2); // Diagonal-ish faint lines for texture
    }

    // Add header2.jpg stretched to width, calculate actual height to avoid overlap
    const headerWidth = 190;
    const headerAspectRatio = 3; // Assume typical banner ratio (width/height=3); adjust based on your header2.jpg (e.g., if 600x200, ratio=3)
    const headerHeight = headerWidth / headerAspectRatio;
    doc.addImage('/header2.jpg', 'JPG', 10, 10, headerWidth, headerHeight);

    // Heading with increased spacing (15mm post-header, no overlap)
    const headingY = 10 + headerHeight + 15; // Fixed overlap
    doc.setFillColor(colors.patternBlue);
    doc.rect(10, headingY, 190, 10, 'F'); // Blue header bar like example
    doc.setTextColor(colors.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('QUOTATION', 105, headingY + 7, { align: 'center' });

    // Input Summary (like "Invoice to" in example, compact)
    const summaryY = headingY + 15;
    doc.setFontSize(10);
    doc.setTextColor(colors.primary);
    doc.text(`Purchase Price: R ${purchasePrice || 'N/A'} (VAT Included: ${vatIncluded ? 'Yes' : 'No'})`, 20, summaryY);
    doc.text(`Bond Amount: R ${bondAmount || 'N/A'}`, 20, summaryY + 5);
    doc.text(`Transfer Duty Applicable: ${dutyApplicable ? 'Yes' : 'No'}`, 20, summaryY + 10);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 20, summaryY + 15);
    doc.text(`Quotation #: ${Math.floor(Math.random() * 1000000)}`, 20, summaryY + 20); // Added like example's invoice #

    // Redesigned Transfer Costs Table (exact match to example: numbered, colored header, alternating rows, right-aligned totals, neumorphic shadows)
    const tableBody = [
      [1, 'Transfer fees', `R ${vatBreakdown.vatTransferFees.toFixed(2)}`, `R ${transferFees.toFixed(2)}`, ''],
      [2, 'Transfer Duty', '', `R ${transferDuty.toFixed(2)}`, ''],
      [3, 'Clearance Certificate', '', `R ${otherFees.clearance.toFixed(2)}`, ''],
      [4, 'Investment of Deposit', '', `R ${otherFees.investmentDeposit.toFixed(2)}`, ''],
      [5, 'Deeds Office fee', '', `R ${otherFees.deedsOffice.toFixed(2)}`, ''],
      [6, 'Deeds Office search', '', `R ${otherFees.deedsSearch.toFixed(2)}`, ''],
      [7, 'Postages and Petties', `R ${vatBreakdown.vatPostPetties.toFixed(2)}`, `R ${otherFees.postPetties.toFixed(2)}`, ''],
      [8, 'Document Generation', `R ${vatBreakdown.vatDocGen.toFixed(2)}`, `R ${otherFees.docGen.toFixed(2)}`, ''],
      [9, 'DOTS Tracking Fee', `R ${vatBreakdown.vatDots.toFixed(2)}`, `R ${otherFees.dotsTracking.toFixed(2)}`, ''],
      [10, 'FICA verification', `R ${vatBreakdown.vatFica.toFixed(2)}`, `R ${otherFees.fica.toFixed(2)}`, ''],
      [11, 'Submitting Transfer Duty', `R ${vatBreakdown.vatSubmit.toFixed(2)}`, `R ${otherFees.submitDuty.toFixed(2)}`, ''],
      [12, 'VAT', `R ${vatBreakdown.totalVAT.toFixed(2)}`, `R ${(transferFees + otherFees.postPetties + otherFees.docGen + otherFees.dotsTracking + otherFees.fica + otherFees.submitDuty).toFixed(2)}`, '']
    ];

    autoTable(doc, {
      startY: summaryY + 30,
      head: [['NO', 'DESCRIPTION', 'VAT', 'DEBIT', 'CREDIT']],
      body: tableBody,
      theme: 'striped', // Alternating like example
      headStyles: { fillColor: colors.patternBlue, textColor: colors.white, fontStyle: 'bold', fontSize: 8, halign: 'center' },
      alternateRowStyles: { fillColor: colors.lightGray }, // Light gray like example
      margin: { left: 15, right: 15 },
      styles: { cellPadding: 2, fontSize: 8, overflow: 'linebreak', lineColor: [200, 200, 200], lineWidth: 0.1, halign: 'left', valign: 'middle' },
      columnStyles: { 
        0: { cellWidth: 10, halign: 'center' }, // Narrow NO like example
        1: { cellWidth: 80 },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
      },
      willDrawCell: (data) => {
        // Neumorphic shadow on rows
        if (data.section === 'body') {
          doc.setFillColor(data.row.index % 2 === 0 ? colors.lightGray : [255, 255, 255]);
          doc.setShadow(2, 2, 3, 0.1, 'black'); // Soft shadow for futurism
        }
      }
    });

    let finalY = doc.lastAutoTable.finalY + 5;

    // Total Section (like example's Total/Discount/GRAND TOTAL, right-aligned, bold)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.patternBlue);
    doc.text('Total', 150, finalY, { align: 'right' });
    doc.text(`R ${(totalTransfer - vatBreakdown.totalVAT).toFixed(2)}`, 190, finalY, { align: 'right' });
    finalY += 5;
    doc.text('VAT', 150, finalY, { align: 'right' });
    doc.text(`R ${vatBreakdown.totalVAT.toFixed(2)}`, 190, finalY, { align: 'right' });
    finalY += 7;
    doc.setFillColor(colors.gold);
    doc.rect(140, finalY - 3, 60, 7, 'F'); // Gold bg for grand total like example's highlight
    doc.setTextColor(colors.blue);
    doc.text('TOTAL AMOUNT DUE (incl. VAT)', 150, finalY + 2, { align: 'right' });
    doc.text(`R ${totalTransfer.toFixed(2)}`, 190, finalY + 2, { align: 'right' });
    finalY += 10;

    // Bond Costs (if applicable, compact table like example)
    if (bondNum > 0) {
      autoTable(doc, {
        startY: finalY,
        head: [['NO', 'BOND COSTS (ESTIMATE)', 'AMOUNT']],
        body: [
          [1, 'Deeds Office Fee', `R ${bondCosts.deedsOffice.toFixed(2)}`],
          [2, 'Conveyancer Fee', `R ${bondCosts.conveyancer.toFixed(2)}`],
          [3, 'Post & Petties', `R ${bondCosts.postPetties.toFixed(2)}`],
          [4, 'Electronic Doc Gen', `R ${bondCosts.docGen.toFixed(2)}`],
          [5, 'VAT', `R ${bondCosts.vat.toFixed(2)}`],
          [6, 'Subtotal', `R ${bondCosts.total.toFixed(2)}`]
        ],
        theme: 'striped',
        headStyles: { fillColor: colors.patternBlue, textColor: colors.white, fontStyle: 'bold', fontSize: 8, halign: 'center' },
        alternateRowStyles: { fillColor: colors.lightGray },
        margin: { left: 15, right: 15 },
        styles: { cellPadding: 2, fontSize: 8, lineColor: [200, 200, 200], lineWidth: 0.1, halign: 'left' },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 100 }, 2: { cellWidth: 60, halign: 'right' } },
      });
      finalY = doc.lastAutoTable.finalY + 10;
    }

    // Payment Details and Disclaimer (like example's Payment Terms)
    doc.setFontSize(8);
    doc.setTextColor(colors.subtleText);
    doc.text('GERHARD BARNARD TRUST ACCOUNT | STANDARD BANK | ACCOUNT: 301 454 310 | BRANCH: 012 445', 15, finalY);
    doc.text('*Payments via EFT only. Confirm details telephonically.', 15, finalY + 5);
    finalY += 10;
    const disclaimerLines = doc.splitTextToSize(DISCLAIMER, 180);
    doc.text(disclaimerLines, 15, finalY);

    // Thank You Footer (like example, with futuristic gold glow)
    finalY += disclaimerLines.length * 5 + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(colors.gold);
    doc.text('THANK YOU FOR YOUR BUSINESS', 105, finalY, { align: 'center' });

    doc.save(`QUOTATION - Estimation R ${purchasePrice || '0'}.pdf`);
  };

  return (
    <div style={{ ...styles.container, backgroundColor: colors.background }}>
      <div style={styles.patternBackground} className="pattern-background"></div>
      <div style={{ ...styles.card, backgroundColor: colors.background, boxShadow: darkMode ? '-8px -8px 16px rgba(0, 0, 0, 0.4), 8px 8px 16px rgba(255, 255, 255, 0.1), 0 0 10px rgba(210, 172, 104, 0.2)' : '8px 8px 16px rgba(0, 0, 0, 0.2), -8px -8px 16px rgba(255, 255, 255, 0.7), 0 0 10px rgba(210, 172, 104, 0.3)', border: `2px solid rgba(210, 172, 104, 0.3)` }} className="animated-card">
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
            style={{ ...styles.input, border: `1px solid ${colors.border}`, backgroundColor: colors.gray, boxShadow: darkMode ? 'inset -3px -3px 6px rgba(255,255,255,0.1), inset 3px 3px 6px rgba(0,0,0,0.3)' : 'inset 3px 3px 6px rgba(0,0,0,0.15), inset -3px -3px 6px rgba(255,255,255,0.6)', color: colors.text }}
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
            style={{ ...styles.input, border: `1px solid ${colors.border}`, backgroundColor: colors.gray, boxShadow: darkMode ? 'inset -3px -3px 6px rgba(255,255,255,0.1), inset 3px 3px 6px rgba(0,0,0,0.3)' : 'inset 3px 3px 6px rgba(0,0,0,0.15), inset -3px -3px 6px rgba(255,255,255,0.6)', color: colors.text }}
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
        
        <div style={{ ...styles.resultSection, backgroundColor: colors.gray, boxShadow: darkMode ? 'inset -2px -2px 4px rgba(255,255,255,0.1), inset 2px 2px 4px rgba(0,0,0,0.3)' : 'inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px rgba(255,255,255,0.5)' }}>
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
          <div style={{ ...styles.prominentSubtotal, backgroundColor: colors.gray, boxShadow: darkMode ? 'inset -2px -2px 4px rgba(255,255,255,0.1), inset 2px 2px 4px rgba(0,0,0,0.3), 0 0 8px rgba(210, 172, 104, 0.2)' : 'inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px rgba(255,255,255,0.5), 0 0 8px rgba(210, 172, 104, 0.3)' }} className="prominentSubtotal"><span>Subtotal:</span><span>R {(totalTransfer || 0).toFixed(2)}</span></div>
        </div>
        
        <div style={{ ...styles.resultSection, backgroundColor: colors.gray, boxShadow: darkMode ? 'inset -2px -2px 4px rgba(255,255,255,0.1), inset 2px 2px 4px rgba(0,0,0,0.3)' : 'inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px rgba(255,255,255,0.5)' }}>
          <h3 style={{ ...styles.sectionTitle, color: colors.primary, borderBottom: `1px solid rgba(210, 172, 104, 0.3)` }}>Bond Costs (Estimate) {(!bondAmount || bondAmount <= 0) && '(No Bond Entered)'}</h3>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>Deeds Office Fee:</span><span>R {(bondCosts.deedsOffice || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>Conveyancer Fee:</span><span>R {(bondCosts.conveyancer || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>Post & Petties:</span><span>R {(bondCosts.postPetties || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>Electronic Doc Gen:</span><span>R {(bondCosts.docGen || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.resultItem, color: colors.text }}><span>VAT:</span><span>R {(bondCosts.vat || 0).toFixed(2)}</span></div>
          <div style={{ ...styles.prominentSubtotal, backgroundColor: colors.gray, boxShadow: darkMode ? 'inset -2px -2px 4px rgba(255,255,255,0.1), inset 2px 2px 4px rgba(0,0,0,0.3), 0 0 8px rgba(210, 172, 104, 0.2)' : 'inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px rgba(255,255,255,0.5), 0 0 8px rgba(210, 172, 104, 0.3)' }} className="prominentSubtotal"><span>Subtotal:</span><span>R {(bondCosts.total || 0).toFixed(2)}</span></div>
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