import React, { useState } from "react";
import jsPDF from "jspdf";

const BondTransferCalculator = () => {
  const [purchasePrice, setPurchasePrice] = useState(0);
  const bondAmount = purchasePrice; // You can later allow user to enter a bond amount separately

  // === Transfer Cost Breakdown ===
  const transferFees = purchasePrice * 0.015 + 470.5;
  const transferDuty = purchasePrice > 1000000 ? (purchasePrice - 1000000) * 0.03 + 15000 : 0;
  const clearanceFee = 1050;
  const investmentApp = 750;
  const deedsOffice = 2281;
  const deedsSearch = 700;
  const postage = 950;
  const docGen = 257;
  const dots = 350;
  const fica = 1900;
  const dutySubmit = 257;

  const transferVAT = 470.5 + 142.5 + 38.5 + 52.5 + 37.5;

  const transferTotal =
    transferFees +
    transferDuty +
    clearanceFee +
    investmentApp +
    deedsOffice +
    deedsSearch +
    postage +
    docGen +
    dots +
    fica +
    dutySubmit;

  const transferVATTotal = transferVAT;
  const transferTotalDue = transferTotal + transferVAT;

  // === Bond Cost Breakdown ===
  const bondFee = bondAmount * 0.012 + 450; // bond reg + admin
  const bondDeeds = 1500;
  const bondPostage = 850;
  const bondVAT = 220; // estimate VAT

  const bondTotal = bondFee + bondDeeds + bondPostage;
  const bondTotalDue = bondTotal + bondVAT;

  const grandTotal = transferTotalDue + bondTotalDue;

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Bond & Transfer Cost Estimate", 20, 20);
    doc.setFontSize(12);
    doc.text(`Purchase Price: R${purchasePrice.toFixed(2)}`, 20, 30);
    doc.text(`Transfer Total: R${transferTotalDue.toFixed(2)}`, 20, 40);
    doc.text(`Bond Total: R${bondTotalDue.toFixed(2)}`, 20, 50);
    doc.text(`Grand Total Due: R${grandTotal.toFixed(2)}`, 20, 60);
    doc.save("BondTransferEstimate.pdf");
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#142a4f] p-6">
      <div className="text-center text-3xl font-bold mb-6 text-[#142a4f]">
        Bond & Transfer Cost Estimate
      </div>

      <div className="max-w-xl mx-auto mb-8">
        <label className="block mb-2 text-lg font-semibold">Purchase Price</label>
        <input
          type="number"
          value={purchasePrice}
          onChange={(e) => setPurchasePrice(Number(e.target.value))}
          className="w-full p-3 rounded-2xl shadow-inner bg-[#ecf0f3] border border-[#d2ac68] focus:outline-none"
        />
      </div>

      <div className="grid max-w-5xl grid-cols-1 gap-8 mx-auto md:grid-cols-2">
        {/* Transfer Costs */}
        <div className="bg-[#ecf0f3] rounded-2xl p-6 shadow-inner">
          <div className="text-xl font-semibold text-[#d2ac68] mb-4">Transfer Costs</div>
          <ul className="space-y-2">
            <li>To Transfer Fees: R{transferFees.toFixed(2)}</li>
            <li>To Transfer Duty: R{transferDuty.toFixed(2)}</li>
            <li>To Clearance Certificate: R{clearanceFee.toFixed(2)}</li>
            <li>To Application of Investment: R{investmentApp.toFixed(2)}</li>
            <li>To Deeds Office Fee: R{deedsOffice.toFixed(2)}</li>
            <li>To Deeds Office Search: R{deedsSearch.toFixed(2)}</li>
            <li>To Postage & Petties: R{postage.toFixed(2)}</li>
            <li>To Document Generation: R{docGen.toFixed(2)}</li>
            <li>To DOTS Tracking: R{dots.toFixed(2)}</li>
            <li>To FICA Identification: R{fica.toFixed(2)}</li>
            <li>To Submit Duty: R{dutySubmit.toFixed(2)}</li>
          </ul>
          <div className="mt-4 font-semibold">VAT: R{transferVATTotal.toFixed(2)}</div>
          <div className="font-bold text-lg text-[#142a4f]">Total: R{transferTotalDue.toFixed(2)}</div>
        </div>

        {/* Bond Costs */}
        <div className="bg-[#ecf0f3] rounded-2xl p-6 shadow-inner">
          <div className="text-xl font-semibold text-[#d2ac68] mb-4">Bond Costs</div>
          <ul className="space-y-2">
            <li>Registration Fee + Admin: R{bondFee.toFixed(2)}</li>
            <li>Deeds Office Registration: R{bondDeeds.toFixed(2)}</li>
            <li>Postage & Petties: R{bondPostage.toFixed(2)}</li>
          </ul>
          <div className="mt-4 font-semibold">VAT: R{bondVAT.toFixed(2)}</div>
          <div className="font-bold text-lg text-[#142a4f]">Total: R{bondTotalDue.toFixed(2)}</div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto text-center mt-10 bg-[#d2ac68] text-white p-6 rounded-2xl shadow-xl">
        <div className="text-2xl font-bold">Grand Total Due: R{grandTotal.toFixed(2)}</div>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={generatePDF}
          className="px-6 py-3 bg-[#142a4f] text-white rounded-xl shadow-md hover:bg-[#0e1c38]"
        >
          Download PDF Report
        </button>
      </div>
    </div>
  );
};

export default BondTransferCalculator;