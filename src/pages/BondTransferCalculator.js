// src/pages/BondTransferCalculator.js
import React, { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const BondTransferCalculator = () => {
  const [price, setPrice] = useState(2200000);

  const fixedFees = {
    transferFees: 36470,
    transferFeesVAT: 5470.5,
    transferDuty: 45786,
    clearance: 1050,
    investment: 750,
    deedsOffice: 2281,
    search: 700,
    searchVAT: 105,
    postage: 950,
    postageVAT: 142.5,
    docGen: 257,
    docGenVAT: 38.55,
    dots: 350,
    dotsVAT: 52.5,
    fica: 1900,
    dutySubmit: 250,
    dutySubmitVAT: 37.5,
  };

  const vatTotal =
    fixedFees.transferFeesVAT +
    fixedFees.searchVAT +
    fixedFees.postageVAT +
    fixedFees.docGenVAT +
    fixedFees.dotsVAT +
    fixedFees.dutySubmitVAT;

  const totalDue =
    fixedFees.transferFees +
    fixedFees.transferFeesVAT +
    fixedFees.transferDuty +
    fixedFees.clearance +
    fixedFees.investment +
    fixedFees.deedsOffice +
    fixedFees.search +
    fixedFees.searchVAT +
    fixedFees.postage +
    fixedFees.postageVAT +
    fixedFees.docGen +
    fixedFees.docGenVAT +
    fixedFees.dots +
    fixedFees.dotsVAT +
    fixedFees.fica +
    fixedFees.dutySubmit +
    fixedFees.dutySubmitVAT;

  const generatePDF = () => {
    const report = document.getElementById("report");
    html2canvas(report).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("quotation.pdf");
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f0f3] p-6">
      <div className="bg-[#f0f0f3] rounded-2xl shadow-inner p-6 w-full max-w-3xl">
        <h2 className="text-xl font-bold text-center text-[#142a4f] mb-4">
          Bond & Transfer Cost Estimate
        </h2>

        <div className="flex flex-col gap-4 mb-4">
          <label className="text-[#142a4f] font-semibold">
            Purchase Price:
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full p-2 mt-1 bg-white shadow-inner outline-none rounded-xl"
            />
          </label>
        </div>

        <div
          id="report"
          className="bg-white rounded-2xl shadow-md p-6 text-sm text-[#142a4f]"
        >
          <h3 className="mb-4 text-lg font-bold">Quotation for R{price.toLocaleString()}</h3>
          <table className="w-full mb-4 border-collapse">
            <thead>
              <tr>
                <th className="text-left">Description</th>
                <th className="text-right">VAT</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>To Transfer Fees</td>
                <td>R{fixedFees.transferFeesVAT.toFixed(2)}</td>
                <td>R{fixedFees.transferFees.toFixed(2)}</td>
              </tr>
              <tr>
                <td>To Transfer Duty</td>
                <td>-</td>
                <td>R{fixedFees.transferDuty.toFixed(2)}</td>
              </tr>
              <tr>
                <td>To Clearance Certificate fee</td>
                <td>-</td>
                <td>R{fixedFees.clearance.toFixed(2)}</td>
              </tr>
              <tr>
                <td>To Application of Investment</td>
                <td>-</td>
                <td>R{fixedFees.investment.toFixed(2)}</td>
              </tr>
              <tr>
                <td>To Deeds Office fee</td>
                <td>-</td>
                <td>R{fixedFees.deedsOffice.toFixed(2)}</td>
              </tr>
              <tr>
                <td>To Deeds Office search</td>
                <td>R{fixedFees.searchVAT.toFixed(2)}</td>
                <td>R{fixedFees.search.toFixed(2)}</td>
              </tr>
              <tr>
                <td>To Postages and Petties</td>
                <td>R{fixedFees.postageVAT.toFixed(2)}</td>
                <td>R{fixedFees.postage.toFixed(2)}</td>
              </tr>
              <tr>
                <td>To Document Generation</td>
                <td>R{fixedFees.docGenVAT.toFixed(2)}</td>
                <td>R{fixedFees.docGen.toFixed(2)}</td>
              </tr>
              <tr>
                <td>To DOTS Tracking Fee</td>
                <td>R{fixedFees.dotsVAT.toFixed(2)}</td>
                <td>R{fixedFees.dots.toFixed(2)}</td>
              </tr>
              <tr>
                <td>To FICA Identification</td>
                <td>-</td>
                <td>R{fixedFees.fica.toFixed(2)}</td>
              </tr>
              <tr>
                <td>To Submit Transfer Duty</td>
                <td>R{fixedFees.dutySubmitVAT.toFixed(2)}</td>
                <td>R{fixedFees.dutySubmit.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-between font-semibold">
            <span>Total VAT:</span>
            <span>R{vatTotal.toFixed(2)}</span>
          </div>
          <div className="font-bold text-lg flex justify-between text-[#d2ac68] mt-2">
            <span>TOTAL DUE (incl. VAT):</span>
            <span>R{totalDue.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={generatePDF}
          className="mt-6 w-full p-3 rounded-xl bg-[#d2ac68] text-[#142a4f] font-semibold shadow hover:opacity-90"
        >
          Download PDF Report
        </button>
      </div>
    </div>
  );
};

export default BondTransferCalculator;
