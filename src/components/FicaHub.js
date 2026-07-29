import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { FaBuilding, FaCheckCircle, FaClipboardList, FaCopy, FaDownload, FaEnvelope, FaExclamationTriangle, FaEye, FaPlus, FaSearch, FaShieldAlt, FaTimes, FaTrash, FaUser } from "react-icons/fa";
import { DOCUMENT_CATALOG, STAFF_SIGNATURES, buildInitialLetter, defaultChecklist } from "../data/ficaConfig";
import "../styles/ficaHub.css";

const BASE_URL = "https://case-tracking-backend.onrender.com";

function makeBlankForm() {
  const sender = STAFF_SIGNATURES[0];
  return {
    caseId: "",
    partyType: "seller",
    entityType: "individual",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    subject: "Secure FICA documents required",
    message: buildInitialLetter("individual", null, sender),
    sender,
    checklist: defaultChecklist("individual"),
    customLabel: "",
    customRequired: true,
    expiresInDays: 14,
    sendNow: true,
  };
}

function statusTone(status) {
  if (status === "Complete") return "complete";
  if (["Submitted", "Under review"].includes(status)) return "review";
  if (status === "Revoked") return "muted";
  return "progress";
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" });
}

function humanLabel(value) {
  return String(value || "").replace(/\./g, " · ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function flattenQuestionnaire(value, prefix = "", rows = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenQuestionnaire(item, `${prefix}${prefix ? " · " : ""}${index + 1}`, rows));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => flattenQuestionnaire(item, `${prefix}${prefix ? " · " : ""}${humanLabel(key)}`, rows));
  } else if (String(value || "").trim()) {
    rows.push({ label: prefix, value: String(value) });
  }
  return rows;
}

export default function FicaHub() {
  const token = localStorage.getItem("token");
  const [searchParams] = useSearchParams();
  const [data, setData] = useState({ cases: [], requests: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(makeBlankForm);
  const [saving, setSaving] = useState(false);
  const [sendingLabel, setSendingLabel] = useState("");
  const [sendFeedback, setSendFeedback] = useState(null);
  const [selected, setSelected] = useState(null);
  const [documents, setDocuments] = useState([]);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const casesById = useMemo(() => new Map(data.cases.map((item) => [String(item._id), item])), [data.cases]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/fica`, { headers });
      setData(response.data || { cases: [], requests: [] });
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load the FICA Hub.");
    } finally { setLoading(false); }
  }, [headers]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const caseId = searchParams.get("case");
    const party = searchParams.get("party");
    if (caseId) {
      setForm((current) => ({ ...current, caseId, partyType: party === "purchaser" ? "purchaser" : "seller" }));
      setShowCreate(true);
    }
  }, [searchParams]);
  useEffect(() => {
    if (!form.caseId || !data.cases.length || !form.message.includes("[MATTER REFERENCE]")) return;
    const matter = casesById.get(String(form.caseId));
    if (!matter) return;
    setForm((current) => ({
      ...current,
      subject: `Secure FICA documents required - ${matter.reference || "transaction"}`,
      message: buildInitialLetter(current.entityType, matter, current.sender),
    }));
  }, [casesById, data.cases.length, form.caseId, form.message]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data.requests;
    return data.requests.filter((item) => {
      const matter = casesById.get(String(item.caseId));
      return [item.clientName, item.clientEmail, item.partyType, item.entityType, item.status, matter?.reference, matter?.parties, matter?.property].filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [casesById, data.requests, query]);

  const totals = useMemo(() => ({
    all: data.requests.length,
    waiting: data.requests.filter((item) => !["Submitted", "Under review", "Complete", "Revoked"].includes(item.status)).length,
    review: data.requests.filter((item) => ["Submitted", "Under review"].includes(item.status)).length,
    complete: data.requests.filter((item) => item.status === "Complete").length,
  }), [data.requests]);

  const selectedCodes = useMemo(() => new Set((form.checklist || []).map((item) => item.code)), [form.checklist]);

  const setEntity = (entityType) => {
    const matter = casesById.get(String(form.caseId));
    setForm((current) => ({
      ...current,
      entityType,
      checklist: defaultChecklist(entityType),
      message: buildInitialLetter(entityType, matter, current.sender),
    }));
  };

  const setMatter = (caseId) => {
    const matter = casesById.get(String(caseId));
    setForm((current) => ({
      ...current,
      caseId,
      subject: matter?.reference ? `Secure FICA documents required - ${matter.reference}` : current.subject,
      message: buildInitialLetter(current.entityType, matter, current.sender),
    }));
  };

  const setSender = (key) => {
    const sender = STAFF_SIGNATURES.find((item) => item.key === key) || STAFF_SIGNATURES[0];
    const matter = casesById.get(String(form.caseId));
    setForm((current) => ({ ...current, sender, message: buildInitialLetter(current.entityType, matter, sender) }));
  };

  const toggleDocument = (catalogItem) => {
    setForm((current) => ({
      ...current,
      checklist: current.checklist.some((item) => item.code === catalogItem.code)
        ? current.checklist.filter((item) => item.code !== catalogItem.code)
        : [...current.checklist, { code: catalogItem.code, label: catalogItem.label, required: catalogItem.required }],
    }));
  };

  const addCustomDocument = () => {
    const label = form.customLabel.trim();
    if (!label) return;
    const code = `custom-${Date.now()}`;
    setForm((current) => ({
      ...current,
      checklist: [...current.checklist, { code, label, required: current.customRequired, custom: true }],
      customLabel: "",
      customRequired: true,
    }));
  };

  const openRequest = async (request) => {
    setSelected(request);
    try {
      const response = await axios.get(`${BASE_URL}/api/fica/${request._id}/documents`, { headers });
      setDocuments(Array.isArray(response.data) ? response.data : []);
    } catch { setDocuments([]); }
  };

  const createRequest = async (event) => {
    event.preventDefault();
    if (!form.caseId) return setError("Select a transaction first.");
    if (!form.entityType) return setError("Choose Individual or Company.");
    if (!form.sender?.key) return setError("Choose the staff member whose signature must be attached.");
    if (!form.checklist.length) return setError("Choose at least one requested document.");
    setSaving(true);
    setSendingLabel(form.sendNow ? `Sending the secure FICA request to ${form.clientEmail}…` : "Creating the secure FICA request…");
    setSendFeedback(null);
    try {
      const response = await axios.post(`${BASE_URL}/api/cases/${form.caseId}/fica`, form, { headers });
      const delivered = response.data.mail?.sent === true;
      setShowCreate(false);
      setSendFeedback({
        type: !form.sendNow || delivered ? "success" : "warning",
        title: !form.sendNow ? "Secure request created" : delivered ? "Email accepted for delivery" : "Request created, but email was not sent",
        message: !form.sendNow
          ? "The secure request is ready. Copy the link and send it to the client."
          : delivered
            ? `The mail server accepted the request for ${form.clientEmail}. The correct first letter, secure FICA link and ${form.sender.name}’s signature were included.`
            : response.data.mail?.reason || "The mail server did not accept the recipient. Copy the secure link and send it manually.",
        link: response.data.link || "",
      });
      setForm(makeBlankForm());
      setError("");
      await load();
    } catch (err) {
      const message = err.response?.data?.message || "Could not create the FICA request.";
      setSendFeedback({ type: "error", title: "The request could not be sent", message, link: "" });
      setError(message);
    } finally { setSaving(false); }
  };

  const sendReminder = async (request) => {
    setSaving(true);
    setSendingLabel(`Sending a secure reminder to ${request.clientEmail}…`);
    setSendFeedback(null);
    try {
      await axios.post(`${BASE_URL}/api/fica/${request._id}/remind`, {}, { headers });
      setSendFeedback({ type: "success", title: "Reminder accepted for delivery", message: `The reminder and staff signature were sent to ${request.clientEmail}.`, link: "" });
      await load();
    } catch (err) {
      const message = err.response?.data?.message || "Could not send the reminder.";
      setSendFeedback({ type: "error", title: "The reminder was not sent", message, link: "" });
      setError(message);
    } finally { setSaving(false); }
  };

  const deleteRequest = async (request) => {
    const matter = casesById.get(String(request.caseId));
    if (!window.confirm(`Delete the ${request.partyType} FICA request for ${request.clientName || request.clientEmail} on matter ${matter?.reference || "this transaction"}?\n\nThis permanently removes the request, invalidates its client link and deletes every uploaded FICA document. This cannot be undone.`)) return;
    setSaving(true);
    setSendingLabel("Securely deleting the FICA request and its uploaded documents…");
    try {
      const response = await axios.delete(`${BASE_URL}/api/fica/${request._id}`, { headers });
      if (selected?._id === request._id) setSelected(null);
      setSendFeedback({ type: "success", title: "FICA request deleted", message: `The request, secure client link and ${response.data?.documentsDeleted || 0} uploaded documents were permanently removed.`, link: "" });
      await load();
    } catch (err) {
      const message = err.response?.data?.message || "The FICA request could not be deleted.";
      setSendFeedback({ type: "error", title: "Deletion was not completed", message, link: "" });
      setError(message);
    } finally { setSaving(false); }
  };

  const markComplete = async (request) => {
    if (!window.confirm("Mark this FICA request as complete? Confirm the questionnaire and documents have been reviewed first.")) return;
    try {
      await axios.patch(`${BASE_URL}/api/fica/${request._id}`, { status: "Complete", note: "FICA pack reviewed and completed." }, { headers });
      setSelected(null);
      await load();
    } catch (err) { setError(err.response?.data?.message || "Could not update the request."); }
  };

  const download = async (document) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/fica-documents/${document._id}/download`, { headers, responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.fileName || "FICA-document";
      link.click();
      URL.revokeObjectURL(url);
    } catch { setError("The document could not be downloaded securely."); }
  };

  const questionnaireRows = selected?.questionnaireData ? flattenQuestionnaire(selected.questionnaireData) : [];

  return (
    <div className="fica-hub-page">
      <header className="fica-hub-hero">
        <div><span><FaShieldAlt /> Secure client onboarding</span><h1>FICA Hub</h1><p>Send the correct questionnaire, request only the documents needed and review every submission from its linked transaction.</p></div>
        <button onClick={() => { setForm(makeBlankForm()); setShowCreate(true); }}><FaPlus /> New FICA request</button>
      </header>

      {error && <div className="fica-notice error">{error}<button onClick={() => setError("")}><FaTimes /></button></div>}

      <section className="fica-stat-grid">
        <article><span>All requests</span><strong>{totals.all}</strong><small>Across linked matters</small></article>
        <article><span>Awaiting client</span><strong>{totals.waiting}</strong><small>Sent or in progress</small></article>
        <article><span>Ready to review</span><strong>{totals.review}</strong><small>Submitted by clients</small></article>
        <article><span>Complete</span><strong>{totals.complete}</strong><small>Reviewed and approved</small></article>
      </section>

      <section className="fica-panel">
        <div className="fica-panel-head"><div><h2>Client requests</h2><p>Open a request to review its questionnaire and documents.</p></div><label><FaSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reference, client or property" /></label></div>
        {loading ? <div className="fica-empty">Loading secure FICA requests…</div> : filtered.length === 0 ? <div className="fica-empty"><FaClipboardList /><strong>No FICA requests found</strong><span>Create a seller or purchaser request from this hub or a transaction.</span></div> : (
          <div className="fica-table-wrap"><table><thead><tr><th>Matter</th><th>Client</th><th>Entity</th><th>Party</th><th>Status</th><th>Progress</th><th>Expires</th><th>Actions</th></tr></thead><tbody>{filtered.map((request) => {
            const matter = casesById.get(String(request.caseId));
            const done = (request.checklist || []).filter((item) => ["Uploaded", "Verified", "Not applicable"].includes(item.status)).length;
            return <tr key={request._id}><td><strong>{matter?.reference || "—"}</strong><small>{matter?.property || matter?.parties || "Transaction"}</small></td><td><strong>{request.clientName || "Client"}</strong><small>{request.clientEmail}</small></td><td className="capitalize">{request.entityType || "Not chosen"}</td><td className="capitalize">{request.partyType}</td><td><span className={`fica-status ${statusTone(request.status)}`}>{request.status}</span></td><td>{done}/{request.checklist?.length || 0} documents</td><td>{formatDate(request.expiresAt)}</td><td><div className="fica-row-actions"><button onClick={() => openRequest(request)} title="Open profile"><FaEye /></button>{request.status !== "Complete" && <button onClick={() => sendReminder(request)} title="Send reminder"><FaEnvelope /></button>}<button className="danger" onClick={() => deleteRequest(request)} title="Delete FICA request"><FaTrash /></button></div></td></tr>;
          })}</tbody></table></div>
        )}
      </section>

      {saving && <div className="fica-send-overlay" role="status" aria-live="assertive" aria-busy="true"><div className="fica-send-dialog"><span className="fica-send-spinner"><FaEnvelope /></span><h2>Working securely</h2><p>{sendingLabel}</p><small>Please keep this window open while the server responds.</small></div></div>}

      {sendFeedback && !saving && <div className="fica-send-overlay" role="dialog" aria-modal="true" aria-labelledby="fica-send-result-title"><div className={`fica-send-dialog result ${sendFeedback.type}`}><span className="fica-send-result-icon">{sendFeedback.type === "success" ? <FaCheckCircle /> : <FaExclamationTriangle />}</span><h2 id="fica-send-result-title">{sendFeedback.title}</h2><p>{sendFeedback.message}</p>{sendFeedback.link && <div className="fica-send-link"><input readOnly value={sendFeedback.link} aria-label="Secure client link" /><button type="button" onClick={() => navigator.clipboard.writeText(sendFeedback.link)}><FaCopy /> Copy link</button></div>}<button type="button" className="fica-send-close" onClick={() => setSendFeedback(null)}>Done</button></div></div>}

      {showCreate && (
        <div className="fica-modal-backdrop">
          <div className="fica-modal fica-request-builder">
            <button className="fica-modal-close" onClick={() => setShowCreate(false)}><FaTimes /></button>
            <div className="fica-modal-title"><FaShieldAlt /><div><h2>Create a secure FICA request</h2><p>Choose the entity, requested documents and staff signature before sending.</p></div></div>
            <form onSubmit={createRequest} className="fica-form">
              <label className="full">Transaction<select required value={form.caseId} onChange={(event) => setMatter(event.target.value)}><option value="">Select a transaction</option>{data.cases.map((item) => <option key={item._id} value={item._id}>{item.reference || "No reference"} — {item.parties || item.property || "Transaction"}</option>)}</select></label>
              <label>Party<select value={form.partyType} onChange={(event) => setForm({ ...form, partyType: event.target.value })}><option value="seller">Seller</option><option value="purchaser">Purchaser</option></select></label>
              <label>Client name<input required value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} /></label>
              <label>Email address<input required type="email" value={form.clientEmail} onChange={(event) => setForm({ ...form, clientEmail: event.target.value })} /></label>
              <label>Contact number (optional)<input value={form.clientPhone} onChange={(event) => setForm({ ...form, clientPhone: event.target.value })} /></label>

              <fieldset className="fica-builder-section full"><legend>1. Client entity</legend><p>The client will still be asked to confirm this choice when opening the secure link.</p><div className="fica-entity-picks"><button type="button" className={form.entityType === "individual" ? "selected" : ""} onClick={() => setEntity("individual")}><FaUser /> Individual</button><button type="button" className={form.entityType === "company" ? "selected" : ""} onClick={() => setEntity("company")}><FaBuilding /> Company</button></div></fieldset>

              <fieldset className="fica-builder-section full"><legend>2. Requested documents</legend><p>Tick only the documents this client must upload. Conditional items will not block submission if marked not applicable.</p><div className="fica-document-picker">{(DOCUMENT_CATALOG[form.entityType] || []).map((item) => <label key={item.code} className="fica-document-choice"><input type="checkbox" checked={selectedCodes.has(item.code)} onChange={() => toggleDocument(item)} /><span><strong>{item.label}</strong><small>{item.required ? "Required" : "If applicable"}</small></span></label>)}</div><div className="fica-custom-request"><input value={form.customLabel} onChange={(event) => setForm({ ...form, customLabel: event.target.value })} placeholder="Type a custom document request" /><label><input type="checkbox" checked={form.customRequired} onChange={(event) => setForm({ ...form, customRequired: event.target.checked })} /> Required</label><button type="button" onClick={addCustomDocument}><FaPlus /> Add request</button></div>{form.checklist.filter((item) => item.custom).map((item) => <div className="fica-custom-chip" key={item.code}><span>{item.label} · {item.required ? "Required" : "If applicable"}</span><button type="button" onClick={() => setForm((current) => ({ ...current, checklist: current.checklist.filter((entry) => entry.code !== item.code) }))}><FaTimes /></button></div>)}</fieldset>

              <fieldset className="fica-builder-section full"><legend>3. Staff contact and email signature</legend><label>Select staff member<select value={form.sender.key} onChange={(event) => setSender(event.target.value)}>{STAFF_SIGNATURES.map((item) => <option key={item.key} value={item.key}>{item.name} — {item.email}</option>)}</select></label><div className="fica-signature-preview"><img src={form.sender.image} alt={`${form.sender.name} email signature`} /><div><strong>{form.sender.name}</strong><span>{form.sender.phone} · {form.sender.email}</span><small>This signature is attached to the outgoing email. Replies are directed to this staff member.</small></div></div></fieldset>

              <label className="full">Email subject<input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></label>
              <label className="full">First letter<textarea rows="16" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /><small>Review the transaction details before sending. The selected document list and secure link are added automatically.</small></label>
              <label>Link expires after<select value={form.expiresInDays} onChange={(event) => setForm({ ...form, expiresInDays: Number(event.target.value) })}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label>
              <label className="fica-check"><input type="checkbox" checked={form.sendNow} onChange={(event) => setForm({ ...form, sendNow: event.target.checked })} /> Email the client now</label>
              <div className="fica-form-actions full"><button type="button" className="secondary" onClick={() => setForm((current) => ({ ...current, message: buildInitialLetter(current.entityType, casesById.get(String(current.caseId)), current.sender) }))}>Reset first letter</button><button type="submit" disabled={saving}>{form.sendNow ? "Create & send" : "Create request"}</button></div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div className="fica-modal-backdrop">
          <div className="fica-modal fica-review-modal">
            <button className="fica-modal-close" onClick={() => setSelected(null)}><FaTimes /></button>
            <div className="fica-modal-title"><FaShieldAlt /><div><h2>{selected.clientName || "Client"} · {selected.partyType}</h2><p>{casesById.get(String(selected.caseId))?.reference || "Transaction"} · {selected.clientEmail} · {selected.entityType || "Entity not selected"}</p></div></div>
            <div className="fica-profile-grid"><div><span>Status</span><strong className={`fica-status ${statusTone(selected.status)}`}>{selected.status}</strong></div><div><span>Questionnaire</span><strong>{selected.questionnaireCompletedAt ? `Saved ${formatDate(selected.questionnaireCompletedAt)}` : "Not supplied"}</strong></div><div><span>Contact</span><strong>{selected.information?.phone || selected.clientPhone || "Not supplied"}</strong></div><div><span>Staff contact</span><strong>{selected.sender?.name || "Not recorded"}</strong></div></div>
            <h3 className="fica-subheading">Digital questionnaire</h3>
            {questionnaireRows.length ? <div className="fica-questionnaire-review">{questionnaireRows.map((row, index) => <div key={`${row.label}-${index}`}><span>{row.label}</span><strong>{row.value}</strong></div>)}</div> : <div className="fica-review-empty">The client has not saved the digital questionnaire yet.</div>}
            <h3 className="fica-subheading">Document checklist</h3>
            <div className="fica-doc-list">{(selected.checklist || []).map((item) => { const doc = documents.find((entry) => String(entry._id) === String(item.documentId)); return <div key={item.code}><span className={`fica-doc-state ${item.status.toLowerCase().replace(" ", "-")}`}>{["Uploaded", "Verified"].includes(item.status) ? <FaCheckCircle /> : <FaClipboardList />}</span><div><strong>{item.label}</strong><small>{item.required ? "Required" : "If applicable"} · {item.status}{item.note ? ` · ${item.note}` : ""}</small></div>{doc && <button onClick={() => download(doc)}><FaDownload /> Download</button>}</div>; })}</div>
            <div className="fica-form-actions"><button className="secondary" onClick={() => sendReminder(selected)}><FaEnvelope /> Send reminder</button>{selected.status !== "Complete" && <button onClick={() => markComplete(selected)}><FaCheckCircle /> Mark complete</button>}</div>
          </div>
        </div>
      )}
    </div>
  );
}
