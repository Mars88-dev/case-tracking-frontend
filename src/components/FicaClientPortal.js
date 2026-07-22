import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { FaCheckCircle, FaCloudUploadAlt, FaFileAlt, FaLock, FaShieldAlt } from "react-icons/fa";
import "../styles/ficaHub.css";

const BASE_URL = "https://case-tracking-backend.onrender.com";
const initialInfo = {
  fullLegalName: "", idType: "", idNumber: "", phone: "", residentialAddress: "", actingCapacity: "",
};

export default function FicaClientPortal() {
  const { token } = useParams();
  const [payload, setPayload] = useState(null);
  const [information, setInformation] = useState(initialInfo);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(`${BASE_URL}/api/fica-public/${token}`)
      .then(({ data }) => {
        setPayload(data);
        setInformation((current) => ({ ...current, ...(data.request?.information || {}), idNumber: "", residentialAddress: "" }));
      })
      .catch((err) => setError(err.response?.data?.message || "This secure FICA request could not be opened."))
      .finally(() => setLoading(false));
  }, [token]);

  const progress = useMemo(() => {
    const list = payload?.request?.checklist || [];
    const complete = list.filter((item) => ["Uploaded", "Verified", "Not applicable"].includes(item.status)).length;
    return { complete, total: list.length, percentage: list.length ? Math.round((complete / list.length) * 100) : 0 };
  }, [payload]);

  const updateInfo = (key, value) => setInformation((current) => ({ ...current, [key]: value }));

  const saveInformation = async (event) => {
    event.preventDefault(); setBusy("info"); setError("");
    try {
      const { data } = await axios.put(`${BASE_URL}/api/fica-public/${token}/information`, { information, consentAccepted });
      setPayload((current) => ({ ...current, request: data.request }));
      setNotice("Your information has been saved securely.");
    } catch (err) { setError(err.response?.data?.message || "Your information could not be saved."); }
    finally { setBusy(""); }
  };

  const upload = async (item, file) => {
    if (!file) return;
    setBusy(item.code); setError(""); setNotice("");
    try {
      const fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file);
      });
      const { data } = await axios.post(`${BASE_URL}/api/fica-public/${token}/upload`, {
        checklistCode: item.code, fileName: file.name, fileType: file.type, fileSize: file.size, fileData,
      });
      setPayload((current) => ({ ...current, request: data.request }));
      setNotice(`${item.label} uploaded successfully.`);
    } catch (err) { setError(err.response?.data?.message || "The document could not be uploaded."); }
    finally { setBusy(""); }
  };

  const submit = async () => {
    setBusy("submit"); setError("");
    try {
      const { data } = await axios.post(`${BASE_URL}/api/fica-public/${token}/submit`);
      setPayload((current) => ({ ...current, request: data.request }));
      setNotice("Thank you. Your FICA pack has been submitted for review.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) { setError(err.response?.data?.message || "Your FICA pack could not be submitted."); }
    finally { setBusy(""); }
  };

  if (loading) return <div className="fica-public-page"><div className="fica-public-loading"><FaShieldAlt /> Opening your secure request…</div></div>;
  if (error && !payload) return <div className="fica-public-page"><div className="fica-public-error"><FaLock /><h1>Secure link unavailable</h1><p>{error}</p><small>Please contact Gerhard Barnard Inc. for assistance.</small></div></div>;

  const request = payload.request;
  const submitted = ["Submitted", "Under review", "Complete"].includes(request.status);

  return (
    <div className="fica-public-page">
      <header className="fica-public-header">
        <div className="fica-public-brand"><span>GB</span><div><strong>Gerhard Barnard Inc.</strong><small>Secure FICA Portal</small></div></div>
        <div className="fica-secure-pill"><FaLock /> Encrypted & secure</div>
      </header>
      <main className="fica-public-main">
        <section className="fica-public-welcome">
          <div><span><FaShieldAlt /> Identity verification</span><h1>{submitted ? "Your documents have been received" : `Welcome${request.clientName ? `, ${request.clientName}` : ""}`}</h1><p>{submitted ? "The conveyancing team will review your information and contact you if anything further is needed." : request.message || "Please provide the information and documents below so we can progress your property transaction."}</p></div>
          <aside><small>Transaction</small><strong>{payload.matter?.reference || "Property transfer"}</strong><span>{payload.matter?.property || request.partyType}</span></aside>
        </section>
        {notice && <div className="fica-notice success"><FaCheckCircle /> {notice}</div>}
        {error && <div className="fica-notice error">{error}</div>}
        <section className="fica-progress-card"><div><strong>{progress.percentage}% complete</strong><span>{progress.complete} of {progress.total} checklist items ready</span></div><div><i style={{ width: `${progress.percentage}%` }} /></div></section>

        {!submitted && (
          <form className="fica-public-card fica-info-form" onSubmit={saveInformation}>
            <div className="fica-card-heading"><span><FaFileAlt /></span><div><h2>Your information</h2><p>Complete these details exactly as they appear on your identity document.</p></div></div>
            <div className="fica-form">
              <label>Full legal name<input required value={information.fullLegalName} onChange={(e) => updateInfo("fullLegalName", e.target.value)} /></label>
              <label>Identity document type<select required value={information.idType} onChange={(e) => updateInfo("idType", e.target.value)}><option value="">Select an option</option><option>South African ID</option><option>Passport</option></select></label>
              <label>ID or passport number<input required autoComplete="off" value={information.idNumber} onChange={(e) => updateInfo("idNumber", e.target.value)} /></label>
              <label>Contact number<input required value={information.phone} onChange={(e) => updateInfo("phone", e.target.value)} /></label>
              <label className="full">Residential address<textarea required rows="3" value={information.residentialAddress} onChange={(e) => updateInfo("residentialAddress", e.target.value)} /></label>
              <label className="full">Capacity in this transaction (optional)<input value={information.actingCapacity} onChange={(e) => updateInfo("actingCapacity", e.target.value)} placeholder="For example: acting personally or as a trustee/director" /></label>
              <label className="fica-check full"><input type="checkbox" required checked={consentAccepted} onChange={(e) => setConsentAccepted(e.target.checked)} /><span>I confirm that the information supplied is accurate and consent to its secure processing for this transaction and applicable legal compliance requirements.</span></label>
              <div className="full fica-form-actions"><button type="submit" disabled={busy === "info"}>{busy === "info" ? "Saving securely…" : "Save my information"}</button></div>
            </div>
          </form>
        )}

        <section className="fica-public-card">
          <div className="fica-card-heading"><span><FaCloudUploadAlt /></span><div><h2>Requested documents</h2><p>Upload clear PDF, JPG or PNG files. Each file may be up to 12 MB.</p></div></div>
          <div className="fica-upload-list">
            {request.checklist.map((item) => (
              <article key={item.code} className={["Uploaded", "Verified", "Not applicable"].includes(item.status) ? "done" : ""}>
                <div className="fica-upload-icon">{["Uploaded", "Verified"].includes(item.status) ? <FaCheckCircle /> : <FaFileAlt />}</div>
                <div><strong>{item.label}</strong><small>{item.required ? "Required" : "Only if applicable"} · {item.status}</small></div>
                {!submitted && item.status !== "Not applicable" && <label className="fica-upload-button"><input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => upload(item, e.target.files?.[0])} disabled={!!busy} /><FaCloudUploadAlt /> {busy === item.code ? "Uploading…" : item.status === "Uploaded" ? "Replace" : "Choose file"}</label>}
              </article>
            ))}
          </div>
        </section>
        {!submitted && <section className="fica-submit-card"><div><FaLock /><div><strong>Ready to send?</strong><span>Your submission will be securely linked to this transaction for review.</span></div></div><button type="button" onClick={submit} disabled={busy === "submit"}>{busy === "submit" ? "Submitting…" : "Submit FICA pack"}</button></section>}
        <footer className="fica-public-footer"><FaShieldAlt /> Your documents are available only to authorised staff handling this transaction.</footer>
      </main>
    </div>
  );
}
