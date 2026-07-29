import React from "react";
import { FaPlus, FaTrash } from "react-icons/fa";
import {
  DUAL_USE_NOTE,
  FICA_CLIENT_IDENTIFICATION_NOTICE,
  FICA_PRIVACY_NOTICE,
  POLITICALLY_EXPOSED_NOTE,
  SOURCE_OF_WEALTH_NOTE,
  formSectionsFor,
} from "../data/ficaConfig";

function getValue(source, path) {
  return String(path || "").split(".").reduce((value, key) => value?.[key], source) ?? "";
}

function setValue(source, path, value) {
  const keys = String(path || "").split(".");
  const next = { ...(source || {}) };
  let cursor = next;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) cursor[key] = value;
    else {
      cursor[key] = { ...(cursor[key] || {}) };
      cursor = cursor[key];
    }
  });
  return next;
}

function QuestionField({ field, value, onChange, idPrefix = "" }) {
  if (field.heading) return <h3 className="fica-question-party-heading">{field.heading}</h3>;
  const id = `fica-${idPrefix}-${field.key}`.replace(/[^a-zA-Z0-9-_]/g, "-");
  const shared = {
    id,
    required: !!field.required,
    value: value ?? "",
    onChange: (event) => onChange(event.target.value),
    autoComplete: field.sensitive ? "off" : undefined,
  };

  return (
    <label className={`fica-question-field ${field.type === "textarea" ? "wide" : ""}`} htmlFor={id}>
      <span>{field.label}{field.required ? " *" : ""}</span>
      {field.type === "textarea" ? (
        <textarea {...shared} rows="4" />
      ) : field.type === "yesno" ? (
        <select {...shared}>
          <option value="">Select yes or no</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      ) : field.type === "select" ? (
        <select {...shared}>
          <option value="">Select an option</option>
          {(field.choices || []).map((choice) => <option key={choice} value={choice}>{choice}</option>)}
        </select>
      ) : (
        <input {...shared} type={field.inputType || "text"} />
      )}
      {field.note && <small className="fica-question-note">{field.note}</small>}
    </label>
  );
}

function RepeatSection({ section, values, onChange }) {
  const repeat = section.repeat;
  const rows = Array.isArray(values?.[repeat.key]) ? values[repeat.key] : [];
  const updateRows = (nextRows) => onChange({ ...values, [repeat.key]: nextRows });
  const addRow = () => updateRows([...rows, {}]);
  const removeRow = (index) => updateRows(rows.filter((_, rowIndex) => rowIndex !== index));
  const updateRow = (index, key, value) => updateRows(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));

  return (
    <section className="fica-question-section">
      <div className="fica-question-section-heading">
        <div><h3>{section.title}</h3>{section.description && <p>{section.description}</p>}</div>
        <button type="button" className="fica-repeat-add" onClick={addRow}><FaPlus /> {repeat.addLabel}</button>
      </div>
      {section.note && <div className="fica-legal-note compact">{section.note}</div>}
      {rows.length === 0 && <div className="fica-repeat-empty">Add at least one entry to complete this section.</div>}
      {rows.map((row, index) => (
        <div className="fica-repeat-row" key={`${repeat.key}-${index}`}>
          <div className="fica-repeat-row-heading"><strong>{section.title} {index + 1}</strong><button type="button" onClick={() => removeRow(index)} aria-label={`Remove entry ${index + 1}`}><FaTrash /> Remove</button></div>
          <div className="fica-question-grid">
            {repeat.fields.map((field) => <QuestionField key={field.key} field={field} value={row?.[field.key]} onChange={(value) => updateRow(index, field.key, value)} idPrefix={`${repeat.key}-${index}`} />)}
          </div>
        </div>
      ))}
    </section>
  );
}

export default function FicaQuestionnaireForm({ entityType, values, onChange, onSubmit, busy, consentAccepted, onConsentChange }) {
  const sections = formSectionsFor(entityType);
  return (
    <form className="fica-public-card fica-questionnaire" onSubmit={onSubmit}>
      <div className="fica-questionnaire-intro">
        <span>{entityType === "company" ? "LISTED / PUBLIC COMPANIES" : "NATURAL PERSON"}</span>
        <h2>CLIENT QUESTIONNAIRE</h2>
        <p>{FICA_CLIENT_IDENTIFICATION_NOTICE}</p>
        <strong>ALL QUESTIONS BELOW ARE COMPULSORY</strong>
      </div>
      <div className="fica-legal-note">{FICA_PRIVACY_NOTICE}</div>
      {sections.map((section) => section.repeat ? (
        <RepeatSection key={section.title} section={section} values={values} onChange={onChange} />
      ) : (
        <section className="fica-question-section" key={section.title}>
          <div className="fica-question-section-heading"><div><h3>{section.title}</h3>{section.description && <p>{section.description}</p>}</div></div>
          <div className="fica-question-grid">
            {(section.fields || []).map((field, index) => field.heading ? (
              <React.Fragment key={`${field.heading}-${index}`}><div className="fica-question-divider" /><h3 className="fica-question-party-heading">{field.heading}</h3></React.Fragment>
            ) : (
              <QuestionField key={field.key} field={field} value={getValue(values, field.key)} onChange={(value) => onChange(setValue(values, field.key, value))} />
            ))}
          </div>
        </section>
      ))}
      <div className="fica-legal-note compact"><strong>Politically exposed or influential persons</strong><p>{POLITICALLY_EXPOSED_NOTE}</p></div>
      <div className="fica-legal-note compact"><strong>Dual-use goods</strong><p>{DUAL_USE_NOTE}</p></div>
      <div className="fica-legal-note compact"><strong>Source of wealth</strong><p>{SOURCE_OF_WEALTH_NOTE}</p></div>
      <label className="fica-consent-card"><input type="checkbox" checked={consentAccepted} onChange={(event) => onConsentChange(event.target.checked)} required /><span><strong>Privacy and accuracy declaration</strong>I confirm that the information supplied is accurate and consent to its secure processing for this transaction and applicable legal compliance requirements.</span></label>
      <div className="fica-questionnaire-actions">
        <span>Your answers are encrypted before they are stored.</span>
        <button type="submit" disabled={busy === "questionnaire"}>{busy === "questionnaire" ? "Saving securely…" : "Save questionnaire"}</button>
      </div>
    </form>
  );
}
