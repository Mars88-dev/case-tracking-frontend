import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { FaBuilding, FaCheckCircle, FaCloudDownloadAlt, FaCloudUploadAlt, FaFileAlt, FaLock, FaShieldAlt, FaUser } from "react-icons/fa";
import FicaQuestionnaireForm from "./FicaQuestionnaireForm";
import "../styles/ficaHub.css";

const BASE_URL = "https://case-tracking-backend.onrender.com";

function newQuestionnaire(entityType) {
  return entityType === "company" ? { directors: [{}], shareholders: [{}] } : { party1: {}, party2: {} };
}

export default function FicaClientPortal() {
  const { token } = useParams();
  const [payload, setPayload] = useState(null);
  const [entityType, setEntityType] = useState("");
  const [entityConfirmed, setEntityConfirmed] = useState(false);
  const [questionnaire, setQuestionnaire] = useState({});
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(`${BASE_URL}/api/fica-public/${token}`)
      .then(({ data }) => {
        setPayload(data);
        const suggested = ["individual", "company"].includes(data.request?.entityType) ? data.request.entityType : "";
        setEntityType(suggested);
        setQuestionnaire(newQuestionnaire(suggested || "individual"));
      })
      .catch((err) => setError(err.response?.data?.message || "This secure FICA request could not be opened."))
      .finally(() => setLoading(false));
  }, [token]);

  const request = payload?.request;
  const submitted = ["Submitted", "Under review", "Complete"].includes(request?.status);
  const progress = useMemo(() => {
    const list = request?.checklist || [];
    const complete = list.filter((item) => ["Uploaded", "Verified", "Not applicable"].includes(item.status)).length;
    const questionnaireReady = !!request?.questionnaireCompletedAt;
    const total = list.length + 1;
    const ready = complete + (questionnaireReady ? 1 : 0);
    return { complete: ready, total, percentage: total ? Math.round((ready / total) * 100) : 0 };
  }, [request]);

  const confirmEntity = async () => {
    if (!entityType) return setError("Please choose Individual or Company to continue.");
    setBusy("entity"); setError(""); setNotice("");
    try {
      const { data } = await axios.put(`${BASE_URL}/api/fica-public/${token}/entity`, { entityType });
      setPayload((current) => ({ ...current, request: data.request }));
      setQuestionnaire(newQuestionnaire(entityType));
      setEntityConfirmed(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.response?.data?.message || "Your entity type could not be saved.");
    } finally { setBusy(""); }
  };

  const saveQuestionnaire = async (event) => {
    event.preventDefault();
    setBusy("questionnaire"); setError(""); setNotice("");
    try {
      const { data } = await axios.put(`${BASE_URL}/api/fica-public/${token}/questionnaire`, {
        entityType,
        questionnaire,
        consentAccepted,
      });
      setPayload((current) => ({ ...current, request: data.request }));
      setNotice("Your questionnaire has been saved securely.");
    } catch (err) {
      setError(err.response?.data?.message || "Your questionnaire could not be saved.");
    } finally { setBusy(""); }
  };

  const upload = async (item, file) => {
    if (!file) return;
    setBusy(item.code); setError(""); setNotice("");
    try {
      const fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data } = await axios.post(`${BASE_URL}/api/fica-public/${token}/upload`, {
        checklistCode: item.code,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileData,
      });
      setPayload((current) => ({
        ...current,
        request: data.request,
        documents: [...(current.documents || []).filter((document) => document.checklistCode !== item.code), data.document],
      }));
      setNotice(`${item.label} uploaded successfully.`);
    } catch (err) {
      setError(err.response?.data?.message || "The document could not be uploaded.");
    } finally { setBusy(""); }
  };

  const markNotApplicable = async (item) => {
    setBusy(item.code); setError(""); setNotice("");
    try {
      const { data } = await axios.put(`${BASE_URL}/api/fica-public/${token}/checklist/${encodeURIComponent(item.code)}`, { notApplicable: item.status !== "Not applicable" });
      setPayload((current) => ({ ...current, request: data.request }));
      setNotice(item.status === "Not applicable" ? `${item.label} is ready for an upload.` : `${item.label} marked not applicable.`);
    } catch (err) {
      setError(err.response?.data?.message || "The document status could not be updated.");
    } finally { setBusy(""); }
  };

  const download = async (document) => {
    if (!document?._id) return;
    setBusy(`download-${document._id}`); setError("");
    try {
      const response = await axios.get(`${BASE_URL}/api/fica-public/${token}/documents/${document._id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.fileName || "FICA-document";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Your document could not be downloaded.");
    } finally { setBusy(""); }
  };

  const submit = async () => {
    setBusy("submit"); setError("");
    try {
      const { data } = await axios.post(`${BASE_URL}/api/fica-public/${token}/submit`);
      setPayload((current) => ({ ...current, request: data.request }));
      setNotice("Thank you. Your FICA pack has been submitted for review.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.response?.data?.message || "Your FICA pack could not be submitted.");
    } finally { setBusy(""); }
  };

  if (loading) return <div className="fica-public-page"><div className="fica-public-loading"><FaShieldAlt /> Opening your secure request…</div></div>;
  if (error && !payload) return <div className="fica-public-page"><div className="fica-public-error"><FaLock /><h1>Secure link unavailable</h1><p>{error}</p><small>Please contact Gerhard Barnard Inc. for assistance.</small></div></div>;

  if (!entityConfirmed && !submitted) {
    return (
      <div className="fica-public-page">
        <header className="fica-public-header">
          <div className="fica-public-brand"><span>GB</span><div><strong>Gerhard Barnard Inc.</strong><small>Secure FICA Portal</small></div></div>
          <div className="fica-secure-pill"><FaLock /> Encrypted & secure</div>
        </header>
        <main className="fica-entity-main">
          <section className="fica-entity-card">
            <span className="fica-entity-shield"><FaShieldAlt /></span>
            <small>Before you begin</small>
            <h1>Are you completing FICA as an individual or a company?</h1>
            <p>This choice opens the correct digital questionnaire and helps us request the right supporting documents.</p>
            {request?.entityType && <div className="fica-entity-suggestion">The conveyancing team selected <strong>{request.entityType}</strong> for this request. Please confirm or change it below.</div>}
            {error && <div className="fica-notice error">{error}</div>}
            <div className="fica-entity-options">
              <button type="button" className={entityType === "individual" ? "selected" : ""} onClick={() => setEntityType("individual")}><FaUser /><strong>Individual</strong><span>A natural person completing FICA personally</span></button>
              <button type="button" className={entityType === "company" ? "selected" : ""} onClick={() => setEntityType("company")}><FaBuilding /><strong>Company</strong><span>A listed, public or registered business entity</span></button>
            </div>
            <button type="button" className="fica-entity-continue" onClick={confirmEntity} disabled={!entityType || busy === "entity"}>{busy === "entity" ? "Opening securely…" : "Confirm and continue"}</button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="fica-public-page">
      <header className="fica-public-header">
        <div className="fica-public-brand"><span>GB</span><div><strong>Gerhard Barnard Inc.</strong><small>Secure FICA Portal</small></div></div>
        <div className="fica-secure-pill"><FaLock /> Encrypted & secure</div>
      </header>
      <main className="fica-public-main">
        <section className="fica-public-welcome">
          <div>
            <span><FaShieldAlt /> {entityType === "company" ? "Company verification" : "Identity verification"}</span>
            <h1>{submitted ? "Your FICA pack has been received" : `Welcome${request.clientName ? `, ${request.clientName}` : ""}`}</h1>
            <p>{submitted ? "The conveyancing team will review your information and contact you if anything further is needed. You can still download copies of the documents you submitted below." : `Complete the ${entityType === "company" ? "listed/public company" : "natural person"} questionnaire and upload the requested documents below.`}</p>
          </div>
          <aside><small>Transaction</small><strong>{payload.matter?.reference || "Property transfer"}</strong><span>{payload.matter?.property || request.partyType}</span></aside>
        </section>
        {notice && <div className="fica-notice success"><FaCheckCircle /> {notice}</div>}
        {error && <div className="fica-notice error">{error}</div>}
        <section className="fica-progress-card"><div><strong>{progress.percentage}% complete</strong><span>{progress.complete} of {progress.total} requirements ready</span></div><div><i style={{ width: `${progress.percentage}%` }} /></div></section>

        {!submitted && (
          <FicaQuestionnaireForm entityType={entityType} values={questionnaire} onChange={setQuestionnaire} onSubmit={saveQuestionnaire} busy={busy} consentAccepted={consentAccepted} onConsentChange={setConsentAccepted} />
        )}

        <section className="fica-public-card">
          <div className="fica-card-heading"><span><FaCloudUploadAlt /></span><div><h2>Requested documents</h2><p>Upload clear PDF, JPG or PNG files. Each file may be up to 12 MB. Uploaded files remain available for you to download.</p></div></div>
          <div className="fica-upload-list">
            {(request.checklist || []).map((item) => {
              const document = (payload.documents || []).find((entry) => String(entry._id) === String(item.documentId) || entry.checklistCode === item.code);
              const ready = ["Uploaded", "Verified", "Not applicable"].includes(item.status);
              return (
                <article key={item.code} className={ready ? "done" : ""}>
                  <div className="fica-upload-icon">{["Uploaded", "Verified"].includes(item.status) ? <FaCheckCircle /> : <FaFileAlt />}</div>
                  <div><strong>{item.label}</strong><small>{item.required ? "Required" : "Only if applicable"} · {item.status}</small></div>
                  <div className="fica-upload-actions">
                    {document && <button type="button" className="fica-download-button" onClick={() => download(document)} disabled={busy === `download-${document._id}`}><FaCloudDownloadAlt /> {busy === `download-${document._id}` ? "Downloading…" : "Download"}</button>}
                    {!submitted && item.status !== "Not applicable" && <label className="fica-upload-button"><input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => upload(item, event.target.files?.[0])} disabled={!!busy} /><FaCloudUploadAlt /> {busy === item.code ? "Uploading…" : item.status === "Uploaded" ? "Replace" : "Choose file"}</label>}
                    {!submitted && !item.required && <button type="button" className="fica-na-button" onClick={() => markNotApplicable(item)} disabled={!!busy}>{item.status === "Not applicable" ? "Upload instead" : "Not applicable"}</button>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        {!submitted && <section className="fica-submit-card"><div><FaLock /><div><strong>Ready to send?</strong><span>Your submission will be securely linked to this transaction for review.</span></div></div><button type="button" onClick={submit} disabled={busy === "submit"}>{busy === "submit" ? "Submitting…" : "Submit FICA pack"}</button></section>}
        <footer className="fica-public-footer"><FaShieldAlt /> Your information and documents are available only to authorised staff handling this transaction.</footer>
      </main>
    </div>
  );
}
