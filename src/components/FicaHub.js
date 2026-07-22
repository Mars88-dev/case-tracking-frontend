import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { FaCheckCircle, FaClipboardList, FaCopy, FaDownload, FaEnvelope, FaEye, FaPlus, FaSearch, FaShieldAlt, FaTimes } from "react-icons/fa";
import "../styles/ficaHub.css";

const BASE_URL = "https://case-tracking-backend.onrender.com";
const PRESET_MESSAGE = `To help us progress your property transfer, please complete your details and upload the requested FICA documents using the secure link below. Your information will be used only for the transaction and our legal compliance obligations.`;

const blankForm = {
  caseId: "",
  partyType: "seller",
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  subject: "Secure FICA documents required",
  message: PRESET_MESSAGE,
  expiresInDays: 14,
  sendNow: true,
};

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

export default function FicaHub() {
  const token = localStorage.getItem("token");
  const [searchParams] = useSearchParams();
  const [data, setData] = useState({ cases: [], requests: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [createdLink, setCreatedLink] = useState("");
  const [selected, setSelected] = useState(null);
  const [documents, setDocuments] = useState([]);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/fica`, { headers });
      setData(response.data || { cases: [], requests: [] });
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load the FICA Hub.");
    } finally {
      setLoading(false);
    }
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

  const casesById = useMemo(() => new Map(data.cases.map((item) => [item._id, item])), [data.cases]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data.requests;
    return data.requests.filter((item) => {
      const matter = casesById.get(item.caseId);
      return [item.clientName, item.clientEmail, item.partyType, item.status, matter?.reference, matter?.parties, matter?.property].filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [casesById, data.requests, query]);

  const totals = useMemo(() => ({
    all: data.requests.length,
    waiting: data.requests.filter((item) => !["Submitted", "Under review", "Complete", "Revoked"].includes(item.status)).length,
    review: data.requests.filter((item) => ["Submitted", "Under review"].includes(item.status)).length,
    complete: data.requests.filter((item) => item.status === "Complete").length,
  }), [data.requests]);

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
    setSaving(true);
    setCreatedLink("");
    try {
      const response = await axios.post(`${BASE_URL}/api/cases/${form.caseId}/fica`, form, { headers });
      setCreatedLink(response.data.link || "");
      setError(response.data.mail?.sent === false && form.sendNow ? "The secure request was created, but email is not configured yet. Copy the link below and send it manually." : "");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create the FICA request.");
    } finally { setSaving(false); }
  };

  const sendReminder = async (request) => {
    try {
      await axios.post(`${BASE_URL}/api/fica/${request._id}/remind`, {}, { headers });
      await load();
    } catch (err) { setError(err.response?.data?.message || "Could not send the reminder."); }
  };

  const markComplete = async (request) => {
    if (!window.confirm("Mark this FICA request as complete? Confirm the documents have been reviewed first.")) return;
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

  return (
    <div className="fica-hub-page">
      <header className="fica-hub-hero">
        <div><span><FaShieldAlt /> Secure client onboarding</span><h1>FICA Hub</h1><p>Request, receive and review seller and purchaser information from one secure transaction-linked workspace.</p></div>
        <button onClick={() => { setCreatedLink(""); setForm(blankForm); setShowCreate(true); }}><FaPlus /> New FICA request</button>
      </header>

      {error && <div className="fica-notice error">{error}<button onClick={() => setError("")}><FaTimes /></button></div>}

      <section className="fica-stat-grid">
        <article><span>All requests</span><strong>{totals.all}</strong><small>Across linked matters</small></article>
        <article><span>Awaiting client</span><strong>{totals.waiting}</strong><small>Sent or in progress</small></article>
        <article><span>Ready to review</span><strong>{totals.review}</strong><small>Submitted by clients</small></article>
        <article><span>Complete</span><strong>{totals.complete}</strong><small>Reviewed and approved</small></article>
      </section>

      <section className="fica-panel">
        <div className="fica-panel-head"><div><h2>Client requests</h2><p>Open a request to review its profile and documents.</p></div><label><FaSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reference, client or property" /></label></div>
        {loading ? <div className="fica-empty">Loading secure FICA requests…</div> : filtered.length === 0 ? <div className="fica-empty"><FaClipboardList /><strong>No FICA requests found</strong><span>Create a seller or purchaser request from this hub or a transaction.</span></div> : (
          <div className="fica-table-wrap"><table><thead><tr><th>Matter</th><th>Client</th><th>Party</th><th>Status</th><th>Progress</th><th>Expires</th><th>Actions</th></tr></thead><tbody>{filtered.map((request) => {
            const matter = casesById.get(String(request.caseId));
            const done = (request.checklist || []).filter((item) => ["Uploaded", "Verified", "Not applicable"].includes(item.status)).length;
            return <tr key={request._id}><td><strong>{matter?.reference || "—"}</strong><small>{matter?.property || matter?.parties || "Transaction"}</small></td><td><strong>{request.clientName || "Client"}</strong><small>{request.clientEmail}</small></td><td className="capitalize">{request.partyType}</td><td><span className={`fica-status ${statusTone(request.status)}`}>{request.status}</span></td><td>{done}/{request.checklist?.length || 0} items</td><td>{formatDate(request.expiresAt)}</td><td><div className="fica-row-actions"><button onClick={() => openRequest(request)} title="Open profile"><FaEye /></button>{request.status !== "Complete" && <button onClick={() => sendReminder(request)} title="Send reminder"><FaEnvelope /></button>}</div></td></tr>;
          })}</tbody></table></div>
        )}
      </section>

      {showCreate && <div className="fica-modal-backdrop"><div className="fica-modal wide"><button className="fica-modal-close" onClick={() => setShowCreate(false)}><FaTimes /></button><div className="fica-modal-title"><FaShieldAlt /><div><h2>Create a secure FICA request</h2><p>The request is kept separate for each seller and purchaser.</p></div></div><form onSubmit={createRequest} className="fica-form"><label className="full">Transaction<select required value={form.caseId} onChange={(event) => setForm({ ...form, caseId: event.target.value })}><option value="">Select a transaction</option>{data.cases.map((item) => <option key={item._id} value={item._id}>{item.reference || "No reference"} — {item.parties || item.property || "Transaction"}</option>)}</select></label><label>Party<select value={form.partyType} onChange={(event) => setForm({ ...form, partyType: event.target.value })}><option value="seller">Seller</option><option value="purchaser">Purchaser</option></select></label><label>Client name<input required value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} /></label><label>Email address<input required type="email" value={form.clientEmail} onChange={(event) => setForm({ ...form, clientEmail: event.target.value })} /></label><label>Contact number (optional)<input value={form.clientPhone} onChange={(event) => setForm({ ...form, clientPhone: event.target.value })} /></label><label className="full">Email subject<input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></label><label className="full">Message<textarea rows="6" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></label><label>Link expires after<select value={form.expiresInDays} onChange={(event) => setForm({ ...form, expiresInDays: Number(event.target.value) })}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label><label className="fica-check"><input type="checkbox" checked={form.sendNow} onChange={(event) => setForm({ ...form, sendNow: event.target.checked })} /> Email the client now</label><div className="fica-form-actions full"><button type="button" className="secondary" onClick={() => setForm({ ...form, message: PRESET_MESSAGE })}>Use standard message</button><button type="submit" disabled={saving}>{saving ? "Creating…" : form.sendNow ? "Create & send" : "Create request"}</button></div>{createdLink && <div className="fica-created-link full"><strong>Secure link created</strong><input readOnly value={createdLink} /><button type="button" onClick={() => navigator.clipboard.writeText(createdLink)}><FaCopy /> Copy link</button></div>}</form></div></div>}

      {selected && <div className="fica-modal-backdrop"><div className="fica-modal wide"><button className="fica-modal-close" onClick={() => setSelected(null)}><FaTimes /></button><div className="fica-modal-title"><FaShieldAlt /><div><h2>{selected.clientName || "Client"} · {selected.partyType}</h2><p>{casesById.get(String(selected.caseId))?.reference || "Transaction"} · {selected.clientEmail}</p></div></div><div className="fica-profile-grid"><div><span>Status</span><strong className={`fica-status ${statusTone(selected.status)}`}>{selected.status}</strong></div><div><span>Legal name</span><strong>{selected.information?.fullLegalName || "Not supplied"}</strong></div><div><span>ID / passport</span><strong>{selected.information?.idNumber || "Not supplied"}</strong></div><div><span>Phone</span><strong>{selected.information?.phone || selected.clientPhone || "Not supplied"}</strong></div><div className="full"><span>Residential address</span><strong>{selected.information?.residentialAddress || "Not supplied"}</strong></div></div><h3 className="fica-subheading">Document checklist</h3><div className="fica-doc-list">{(selected.checklist || []).map((item) => { const doc = documents.find((entry) => entry._id === item.documentId); return <div key={item.code}><span className={`fica-doc-state ${item.status.toLowerCase().replace(" ", "-")}`}>{["Uploaded", "Verified"].includes(item.status) ? <FaCheckCircle /> : <FaClipboardList />}</span><div><strong>{item.label}</strong><small>{item.status}{item.note ? ` · ${item.note}` : ""}</small></div>{doc && <button onClick={() => download(doc)}><FaDownload /> Download</button>}</div>; })}</div><div className="fica-form-actions"><button className="secondary" onClick={() => sendReminder(selected)}><FaEnvelope /> Send reminder</button>{selected.status !== "Complete" && <button onClick={() => markComplete(selected)}><FaCheckCircle /> Mark complete</button>}</div></div></div>}
    </div>
  );
}
