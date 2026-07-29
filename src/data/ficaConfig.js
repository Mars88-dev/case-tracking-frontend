export const FICA_PRIVACY_NOTICE = "Please note that the information herein collected is required in terms of the Financial Intelligence Centre Act 38 of 2001 as amended and will be used for purposes stipulated within the FIC Act. In terms of the provisions contained in POPIA 2013, the information herein completed will not be shared with third parties unless so indicated or unless it is necessary to give effect to your property transaction and then only with other professionals involved in the transaction. Please note that some of the information you have supplied may need to be shared with outside authorities for formal verification purposes (such as the Deeds Office, FIC, SARS, the Court or similar) and your signature of this form constitutes your permission for the firm to share the information accordingly.";

export const FICA_CLIENT_IDENTIFICATION_NOTICE = "Client identification is an international requirement and we, an accountable institution as defined in the Financial Intelligence Centre Act and Regulations, are obliged to identify our clients. In terms of sections 21(a), (b), (c) and (d) of the FIC Act, we are also obliged to identify and verify: bank accounts used for purposes of payments to or from you and the source and origin of the cash monies.";

export const SOURCE_OF_FUNDS_NOTE = "Source of Funds means the origin of the money/funds involved in the particular transaction or series of transactions between yourself and the firm e.g.: bank loan, savings; family loan; donation; inheritance; pension fund; savings; divorce proceeds; sale of another property, etc. (FULL DETAILS ARE REQUIRED).";

export const SOURCE_OF_WEALTH_NOTE = "Source of Wealth means the activities that have generated the total net worth of your wealth such as those that produced your funds, property or which are derived from your inheritance for example inheritance or savings, salary, inheritance, pension, proceeds of sale, divorce settlement, company profits, investment maturing, private capital raise, sale of shares, bursary etc. Source of Wealth might not always be the same as Source of Funds. Note that Source of Funds and Source of Wealth are separated from one another as Source of Funds focuses on understanding how and where you obtained the money for a particular transaction, while Source of Wealth examines your overall financial position and how you have accrued the total wealth.";

export const POLITICALLY_EXPOSED_NOTE = "DOMESTIC POLITICALLY INFLUENTIAL PERSON: President or Deputy President of South Africa; Cabinet Minister or Deputy Minister; Premier of a province; MEC of a province; Mayor of a municipality; Leader of a political party; Member of a royal family; Senior traditional leader; Head, accounting officer or CFO of a national or provincial department; Manager or CFO of a municipality; Chairperson, CEO, accounting authority, CFO or chief investment officer of a public entity; Judge, Ambassador, high commissioner or other senior representative of a foreign country based in South Africa; Chairperson of board of directors; chairperson of audit committee; executive officer or CFO of a company doing more than the prescribed amount of business with Government. FOREIGN PROMINENT INFLUENTIAL PERSON: Head of State; Member of a royal family; Cabinet member; Senior member of a political party; Senior judicial officer; Senior executive of a state-owned entity; High rank in the military.";

export const DUAL_USE_NOTE = "DUAL-USE GOODS means dual use products and technologies normally used for civilian purposes, but which may have military applications. In politics, diplomacy and export control, “dual-use” refers to technology that can be used for both peaceful and military aims. Examples include global positioning satellites, missiles, nuclear technology, chemical and biological tools, night vision technology, thermal imaging, some models of drones, aluminum pipes with precise specifications or certain kinds of ball bearings.";

export const STAFF_SIGNATURES = [
  { key: "christa-du-plooy", name: "Christa du Plooy", role: "Senior Conveyancing Paralegal", phone: "079 510 8631", officePhone: "086 137 5221", email: "christa@barnardlaw.co.za", image: "/fica-signatures/christa-du-plooy.png" },
  { key: "nikay-jacobs", name: "Nikay Jacobs", role: "Conveyancing Assistant", phone: "012 330 1613", officePhone: "086 137 5221", email: "nikay@barnardlaw.co.za", image: "/fica-signatures/nikay-jacobs.png" },
  { key: "karen-gouws", name: "Karen Gouws", role: "Senior Conveyancing Paralegal", phone: "012 330 1613", officePhone: "086 137 5221", email: "karen@barnardlaw.co.za", image: "/fica-signatures/karen-gouws.png" },
  { key: "mariette-smit", name: "Mariette Smit", role: "Senior Conveyancing Secretary", phone: "012 330 1613", officePhone: "086 137 5221", email: "mariette@barnardlaw.co.za", image: "/fica-signatures/mariette-smit.png" },
  { key: "annebelle-scheepers", name: "Annebelle Scheepers", role: "Aktesassistent / Conveyancing Assistant", phone: "012 330 1613", officePhone: "086 137 5221", email: "aktes@barnardlaw.co.za", image: "/fica-signatures/annebelle-scheepers.png" },
  { key: "danica-erasmus", name: "Danica Erasmus", role: "Conveyancing Assistant", phone: "079 510 8631", officePhone: "086 137 5221", email: "danica@barnardlaw.co.za", image: "/fica-signatures/danica-erasmus.png" },
];

export const DOCUMENT_CATALOG = {
  individual: [
    { code: "identity", label: "Copy of South African ID (both sides of ID-card) or passport, if foreign and/or residency VISA, if applicable", required: true, selected: true },
    { code: "address", label: "Proof of residential address (issued by a third party and not older than 2 months)", required: true, selected: true },
    { code: "certified", label: "Certified copies of documents", required: false },
    { code: "tax", label: "Tax Clearance or official SARS document confirming the Income Tax Number", required: true, selected: true },
    { code: "marital", label: "Marriage Certificate and Antenuptial Agreement, if applicable", required: false },
    { code: "bank", label: "Proof of banking details", required: true, selected: true },
    { code: "source-funds", label: "Proof of Source of Funds", required: false },
    { code: "source-wealth", label: "Information regarding your Source of Wealth", required: false },
    { code: "rates", label: "Rates and Taxes account for this property", required: false },
    { code: "electricity", label: "Electricity account for this property", required: false },
    { code: "levies", label: "Levies account, if applicable", required: false },
  ],
  company: [
    { code: "incorporation", label: "Copy of incorporation documents (CIPC) reflecting the registered name and address of the company", required: true, selected: true },
    { code: "listed-proof", label: "Proof that the company is listed, if applicable", required: false },
    { code: "resolution", label: "Authorisation resolution signed by all directors authorising a representative or signatory to give instruction to Boy Louw Inc on the company’s behalf", required: true, selected: true },
    { code: "representative-id", label: "Copy of the ID of the representative authorised by the resolution", required: true, selected: true },
    { code: "shareholder-register", label: "Company shareholder register", required: true, selected: true },
    { code: "operating-address", label: "Proof of operating address of the company (not older than 2 months)", required: true, selected: true },
    { code: "company-tax", label: "Tax Clearance or official SARS document confirming the Income Tax Number of the company", required: true, selected: true },
    { code: "director-ids", label: "Copies of the IDs of all directors (both sides of ID-card)", required: true, selected: true },
    { code: "director-addresses", label: "Proof of residential address of all directors (not older than 2 months)", required: true, selected: true },
    { code: "ubo-ids", label: "Copies of the IDs of all shareholders or each UBO; for a trust, the ID of the main trustee", required: true, selected: true },
    { code: "entity-authority", label: "Incorporation documents or Letters of Authority if a shareholder is an entity or trust", required: false },
    { code: "ubo-addresses", label: "Proof of address of each UBO; for a trust, proof of address of the main trustee", required: true, selected: true },
    { code: "ubo-tax", label: "Tax document confirming the Income Tax Number of each UBO; for a trust, the main trustee’s Income Tax document", required: false },
    { code: "organogram", label: "Organogram setting out the full ownership structure and shareholding percentages", required: true, selected: true },
    { code: "certified", label: "Certified copies of documents", required: false },
    { code: "natural-person-forms", label: "Completed FICA form for natural persons for all directors, managers, authorised signatories and shareholders", required: true, selected: true },
    { code: "bank", label: "Proof of banking details", required: true, selected: true },
    { code: "source-funds", label: "Proof of Source of Funds", required: false },
    { code: "source-wealth", label: "Proof of Source of Wealth", required: false },
    { code: "rates", label: "Rates and Taxes account for this property", required: false },
    { code: "electricity", label: "Electricity account for this property", required: false },
    { code: "levies", label: "Levies account, if applicable", required: false },
  ],
};

const text = (key, label, options = {}) => ({ key, label, type: "text", ...options });
const textarea = (key, label, options = {}) => ({ key, label, type: "textarea", ...options });
const yesNo = (key, label, options = {}) => ({ key, label, type: "yesno", ...options });
const select = (key, label, choices, options = {}) => ({ key, label, type: "select", choices, ...options });

const maritalChoices = ["Unmarried", "In Community", "Out of Community", "Foreign Laws", "Traditional/Customary"];
const transactionChoices = ["Once off transaction", "Ongoing delivery of services by the firm"];

const individualPartyFields = (prefix, label) => [
  { heading: label },
  text(`${prefix}.fullNames`, "1. FULL NAMES & SURNAME", { required: true }),
  text(`${prefix}.idPassportNumber`, "2. ID / PASSPORT NUMBERS", { required: true, sensitive: true }),
  textarea(`${prefix}.address`, "3. ADDRESS (DOMICILIUM)", { required: true, sensitive: true }),
  text(`${prefix}.incomeTaxVat`, "4. INCOME TAX & VAT NR.", { required: true, sensitive: true }),
  text(`${prefix}.email`, "5. CONTACT EMAIL", { required: true, inputType: "email" }),
  text(`${prefix}.contactNumber`, "6. CONTACT NUMBER", { required: true, inputType: "tel" }),
  yesNo(`${prefix}.rsaResident`, "7. RSA RESIDENT", { required: true }),
  text(`${prefix}.placeOfBirth`, "8. IF FOREIGN - Place of birth"),
  text(`${prefix}.permanentResidency`, "8. IF FOREIGN - Place of permanent residency"),
  yesNo(`${prefix}.rsaVisa`, "8. IF FOREIGN - RSA visa issued if foreign"),
  text(`${prefix}.taxBase`, "8. IF FOREIGN - Tax base, if not South Africa"),
  select(`${prefix}.maritalStatus`, "9. MARITAL STATUS", maritalChoices, { required: true }),
  text(`${prefix}.mainOccupation`, "10. OCCUPATION - Main occupation", { required: true }),
  text(`${prefix}.industriesOfBusiness`, "10. OCCUPATION - Industries of business", { required: true }),
  text(`${prefix}.countriesOfTrade`, "10. OCCUPATION - Countries of trade", { required: true }),
  text(`${prefix}.employerName`, "13. EMPLOYER - Name"),
  text(`${prefix}.employerContact`, "13. EMPLOYER - Contact details"),
  textarea(`${prefix}.employerAddress`, "13. EMPLOYER - Address"),
  text(`${prefix}.nonPropertyAccountName`, "14. IF YOU ARE A NON-PROPERTY CLIENT - Account name"),
  text(`${prefix}.nonPropertyBank`, "14. IF YOU ARE A NON-PROPERTY CLIENT - Bank"),
  text(`${prefix}.nonPropertyAccountNumber`, "14. IF YOU ARE A NON-PROPERTY CLIENT - Bank account number", { sensitive: true }),
  text(`${prefix}.sellerAccountName`, "14. IF YOU ARE SELLING A PROPERTY - Account name"),
  text(`${prefix}.sellerBank`, "14. IF YOU ARE SELLING A PROPERTY - Bank"),
  text(`${prefix}.sellerAccountNumber`, "14. IF YOU ARE SELLING A PROPERTY - Bank account number", { sensitive: true }),
  text(`${prefix}.buyerAccountName`, "14. IF YOU ARE BUYING A PROPERTY - Account name"),
  text(`${prefix}.buyerBank`, "14. IF YOU ARE BUYING A PROPERTY - Bank"),
  text(`${prefix}.buyerAccountNumber`, "14. IF YOU ARE BUYING A PROPERTY - Bank account number", { sensitive: true }),
  yesNo(`${prefix}.politicallyExposed`, "15. Are you a domestic or foreign POLITICALLY EXPOSED OR INFLUENTIAL PERSON or a family member or associate of such a person?", { required: true }),
  textarea(`${prefix}.shareholderTrustee`, "16. Are you a SHAREHOLDER in any entity (Company) or TRUSTEE / BENEFICIARY of a trust registered in South Africa or abroad? Please list."),
  yesNo(`${prefix}.dualUseGoods`, "17. Are you involved in the trading of DUAL-USE GOODS subject to export control or is there any connection with a university or research facility involved in trading of dual-use goods or goods subject to export control?", { required: true }),
  textarea(`${prefix}.dualUseDetails`, "17. If YES, please elaborate"),
  yesNo(`${prefix}.armsWeapons`, "18. Are you involved in business activities directly or indirectly linked with the manufacturing or sale of ARMS OR WEAPONS?", { required: true }),
  textarea(`${prefix}.armsWeaponsDetails`, "18. If YES, please elaborate"),
];

export const INDIVIDUAL_FORM_SECTIONS = [
  { title: "Party details", description: "Complete Party 1. Complete Party 2 only if applicable.", fields: [...individualPartyFields("party1", "PARTY 1"), ...individualPartyFields("party2", "PARTY 2 (if applicable)").map((field) => field.heading ? field : { ...field, required: false }) ] },
  { title: "Transaction", fields: [
    select("transactionNature", "11. NATURE OF TRANSACTION", transactionChoices, { required: true }),
    textarea("sourceOfFunds", "12. SOURCE OF FUNDS", { required: true, note: SOURCE_OF_FUNDS_NOTE }),
  ] },
  { title: "Protection of personal information", fields: [
    yesNo("personalInformationConsent", "19. You hereby agree that personal information provided to the firm may be processed and shared with the professionals associated with the process, may be stored electronically or physically and that your personal information may be used for future services.", { required: true }),
    text("signatureParty1", "Signature (party 1)", { required: true }),
    text("signatureDateParty1", "Date", { required: true, inputType: "date" }),
    text("signatureParty2", "Signature (party 2 - if applicable)"),
    text("signatureDateParty2", "Date", { inputType: "date" }),
  ] },
];

export const COMPANY_FORM_SECTIONS = [
  { title: "Company information", fields: [
    text("registeredName", "1. REGISTERED NAME", { required: true }),
    text("tradingName", "2. TRADING NAME", { required: true }),
    text("registrationNumber", "3. REGISTRATION NUMBER", { required: true, sensitive: true }),
    text("incomeTaxNumber", "4. INCOME TAX NUMBER", { required: true, sensitive: true }),
    text("vatNumber", "5. VAT NUMBER", { sensitive: true }),
    textarea("registeredAddress", "6. REGISTERED ADDRESS", { required: true, sensitive: true }),
    textarea("operatingAddress", "7. OPERATING ADDRESS", { required: true, sensitive: true }),
    text("mainContactNumber", "8. CONTACT DETAILS - Main contact number", { required: true, inputType: "tel" }),
    text("mainContactEmail", "8. CONTACT DETAILS - Main contact email", { required: true, inputType: "email" }),
    text("mainContactPerson", "8. CONTACT DETAILS - Main contact person (name and surname)", { required: true }),
    text("mainIndustry", "9. NATURE OF BUSINESS - Main industry of business", { required: true }),
    text("countriesOfTrade", "9. NATURE OF BUSINESS - Countries of trade", { required: true }),
    text("mainCountryOfTrade", "9. NATURE OF BUSINESS - Main country of trade", { required: true }),
    yesNo("accountableInstitution", "10. ACCOUNTABLE INSTITUTION", { required: true }),
    textarea("accountableInstitutionDetails", "10. If yes, please attach a copy of your business’s RMCP and provide any relevant details"),
    yesNo("listedCompany", "11. LISTED COMPANY", { required: true }),
    yesNo("stateOwnedCompany", "12. STATE OWNED COMPANY", { required: true }),
  ] },
  { title: "Transaction and banking", fields: [
    select("transactionNature", "13. NATURE OF TRANSACTION", transactionChoices, { required: true }),
    textarea("sourceOfFunds", "14. SOURCE OF FUNDS", { required: true, note: SOURCE_OF_FUNDS_NOTE }),
    text("transactionAccountName", "15. BANKING DETAILS - Account name"),
    text("transactionBank", "15. BANKING DETAILS - Bank"),
    text("transactionAccountNumber", "15. BANKING DETAILS - Bank account number", { sensitive: true }),
    text("buyingAccountName", "15. IF BUYING A PROPERTY - Account name"),
    text("buyingBank", "15. IF BUYING A PROPERTY - Bank"),
    text("buyingAccountNumber", "15. IF BUYING A PROPERTY - Bank account number", { sensitive: true }),
    text("sellingAccountName", "15. IF SELLING A PROPERTY - Account name"),
    text("sellingBank", "15. IF SELLING A PROPERTY - Bank"),
    text("sellingAccountNumber", "15. IF SELLING A PROPERTY - Bank account number", { sensitive: true }),
  ] },
  { title: "Directors", description: "16. LIST ALL DIRECTORS", repeat: { key: "directors", addLabel: "Add director", fields: [
    text("name", "Director Name", { required: true }),
    text("idNumber", "ID Number", { required: true, sensitive: true }),
    text("occupationIndustry", "Occupation & Industry of Trade", { required: true }),
  ] } },
  { title: "Shareholders and ultimate beneficial owners", description: "17. LIST ALL SHAREHOLDERS (holding 10% or more of the shares) AND LIST ALL UBOs", repeat: { key: "shareholders", addLabel: "Add shareholder / UBO", fields: [
    text("name", "Name of Shareholder - Individual / Entity / Trust", { required: true }),
    text("idRegistrationNumber", "ID Number / Registration Number", { required: true, sensitive: true }),
    text("percentage", "Percentage Shareholding", { required: true }),
    text("ubo", "Ultimate Beneficial Owner (“UBO”) - must be an individual", { required: true }),
  ] }, note: "ULTIMATE BENEFICIAL OWNER “UBO”: An individual who directly or indirectly holds sufficient ownership or economic interest to exercise effective control over the legal entity or steer/influence the decision-making through voting rights for example." },
  { title: "Risk and compliance", fields: [
    yesNo("politicallyExposed", "18. Are any of the directors or shareholders a domestic or foreign POLITICALLY EXPOSED or INFLUENTIAL PERSON, family member or associate of such a person?", { required: true, note: POLITICALLY_EXPOSED_NOTE }),
    textarea("politicallyExposedDetails", "18. If YES, please elaborate"),
    yesNo("dualUseGoods", "19. Are any of the directors or shareholders involved in the trading of DUAL-USE GOODS subject to export control or is there any connection with a university or research facility involved in the trading of dual-use goods or goods subject to export control?", { required: true, note: DUAL_USE_NOTE }),
    textarea("dualUseDetails", "19. If YES, please elaborate"),
    yesNo("armsWeapons", "20. Are any of the directors, shareholders or office bearers involved in business activities directly or indirectly linked with the manufacturing or sale of ARMS OR WEAPONS?", { required: true }),
    textarea("armsWeaponsDetails", "20. If YES, please elaborate"),
  ] },
  { title: "Protection of personal information", fields: [
    yesNo("personalInformationConsent", "21. You hereby agree that personal information provided to THE FIRM may be processed and shared with the professionals associated with the process, may be stored electronically or physically and that your personal information may be used for future services.", { required: true }),
    text("signature", "Signature", { required: true }),
    text("signatureDate", "Date", { required: true, inputType: "date" }),
  ] },
];

export function defaultChecklist(entityType) {
  return (DOCUMENT_CATALOG[entityType] || []).filter((item) => item.selected).map(({ selected, ...item }) => item);
}

export function buildInitialLetter(entityType, matter, sender) {
  const isCompany = entityType === "company";
  const reference = matter?.reference || "[MATTER REFERENCE]";
  const parties = matter?.parties || "[PARTIES]";
  const property = matter?.property || "[PROPERTY]";
  const purchasePrice = matter?.purchasePrice || "[SELLING PRICE]";
  const sellingDate = matter?.date || "[SELLING DATE]";
  const bondAmount = matter?.bondAmount || "[BOND AMOUNT]";
  const bondDueDate = matter?.bondDueDate || "[BOND DUE DATE]";
  const name = sender?.name || "[CONTACT PERSON]";
  const phone = sender?.officePhone || sender?.phone || "[CONTACT NUMBER]";
  const email = sender?.email || "[CONTACT EMAIL]";
  const entityParagraph = isCompany
    ? "Please complete the listed/public company client questionnaire and upload the company and director FICA documents requested below so that we may attend to the preliminary steps in the transfer process as soon as possible."
    : "Please complete the natural person client questionnaire and upload the FICA documents requested below so that we may attend to the preliminary steps in the transfer process as soon as possible.";

  return `OUR REF: G BARNARD/${name}

YOUR REF: ${reference}

Good day,

TRANSFER: ${parties}

OVER ${property}

We refer to the above matter and confirm that we receive instructions to attend to the registration of the above property. We thank you for your instruction herein. We wish to confirm the following:

SELLING PRICE: ${purchasePrice}
SELLING DATE: ${sellingDate}
BOND AMOUNT: ${bondAmount}
BOND DUE DATE: ${bondDueDate}

We further confirm:

Please provide us with an electrical compliance certificate as well as a gas certificate if there is a gas installation at the property and electric fence certificate if there is an electric fence at the property (please confirm if this is the case).

If a bond has been registered over the property, we kindly request consent to proceed with the request for cancellation figures. Kindly provide us with the bond account number so that we can request this.

NB: Kindly note that should you have an access bond / flexi reserve facility, this facility will be cancelled as soon as cancellation figures have been requested from the bank. Please note that in many instances the financial institution requires a notice period, or penalties are charged, and it is therefore advisable that the figures are requested as soon as possible to limit any possible penalty.

${entityParagraph}

Please note that ${name} will be dealing with the day-to-day administration on the file and will therefore also be in contact with you from time to time. Feel free to contact ${name.split(" ")[0] || "them"} with any queries at Tel. ${phone} / ${email}`;
}

export function formSectionsFor(entityType) {
  return entityType === "company" ? COMPANY_FORM_SECTIONS : INDIVIDUAL_FORM_SECTIONS;
}
