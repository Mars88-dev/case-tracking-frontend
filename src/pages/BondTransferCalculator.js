import React from "react";
import logo from "../assets/logo.png";

const BondTransferCalculator = () => {
  const fees = [
    { description: "To transfer fees", vat: 5470.5, debit: 36470 },
    { description: "To Transfer Duty", vat: 0, debit: 45786 },
    { description: "To Clearance Certificate fee payable", vat: 0, debit: 1050 },
    { description: "To Application of Investment of Deposit", vat: 0, debit: 750 },
    { description: "To Deeds Office fee", vat: 0, debit: 2281 },
    { description: "To Deeds Office search", vat: 105, debit: 700 },
    { description: "To Postages and Petties", vat: 142.5, debit: 950 },
    { description: "To Document Generation Charge", vat: 38.55, debit: 257 },
    { description: "To DOTS Tracking Fee", vat: 52.5, debit: 350 },
    { description: "To FICA identification and verification fee", vat: 285, debit: 1900 },
    { description: "To Submitting of Transfer Duty Fee", vat: 37.5, debit: 250 },
  ];

  const totalVAT = fees.reduce((sum, item) => sum + item.vat, 0).toFixed(2);
  const totalDebit = fees.reduce((sum, item) => sum + item.debit, 0).toFixed(2);
  const totalAmount = (parseFloat(totalVAT) + parseFloat(totalDebit)).toFixed(2);

  return (
    <div className="max-w-4xl p-6 mx-auto text-black bg-white shadow-md rounded-xl">
      <div className="flex items-center justify-between pb-4 mb-4 border-b">
        <img src={logo} alt="Gerhard Barnard Inc" className="h-20" />
        <div className="text-right">
          <h2 className="text-xl font-semibold">Bond & Transfer Cost Estimate</h2>
          <p className="text-sm">For R2 200 000 Cash Deal</p>
        </div>
      </div>

      <table className="w-full text-sm border border-black">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 text-left border border-black">DESCRIPTION</th>
            <th className="p-2 text-right border border-black">VAT</th>
            <th className="p-2 text-right border border-black">DEBIT</th>
            <th className="p-2 text-right border border-black">CREDIT</th>
          </tr>
        </thead>
        <tbody>
          {fees.map((item, index) => (
            <tr key={index}>
              <td className="p-2 border border-black">{item.description}</td>
              <td className="p-2 text-right border border-black">R{item.vat.toFixed(2)}</td>
              <td className="p-2 text-right border border-black">R{item.debit.toFixed(2)}</td>
              <td className="p-2 text-right border border-black">R0.00</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="p-2 border border-black">VAT</td>
            <td className="p-2 text-right border border-black">R{totalVAT}</td>
            <td className="p-2 text-right border border-black">R{totalDebit}</td>
            <td className="p-2 text-right border border-black">R0.00</td>
          </tr>
          <tr className="font-bold bg-gray-200">
            <td className="p-2 border border-black">TOTAL AMOUNT DUE (incl. VAT)</td>
            <td className="p-2 border border-black" colSpan="3" align="right">
              R{totalAmount}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="pt-4 mt-6 text-xs italic border-t">
        <strong>Disclaimer:</strong> Additional amount to be added (if applicable) for pro rata rates & taxes,
        levies, investment fees, documents generating costs, bank initiation cost, etc. Other expenses are
        Postage & Petties, Fica, Deeds Office Fees and VAT. NB. The above are estimates only, final account may vary.
      </div>
    </div>
  );
};

export default BondTransferCalculator;
