// File: src/components/PublicPortalView.js
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  FaBuilding,
  FaCheckCircle,
  FaDownload,
  FaEnvelope,
  FaExclamationTriangle,
  FaFileAlt,
  FaLock,
  FaPhoneAlt,
  FaRegClock,
  FaShieldAlt,
} from "react-icons/fa";

const BASE_URL = "https://case-tracking-backend.onrender.com";

function injectPublicPortalStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("gba-public-portal-styles")) return;

  const style = document.createElement("style");
  style.id = "gba-public-portal-styles";
  style.textContent = `
    .gba-public-portal-page {
      min-height: 100vh;
      padding: clamp(14px, 2vw, 26px);
      background:
        radial-gradient(circle at 7% 12%, rgba(210,172,104,0.18), transparent 24rem),
        linear-gradient(135deg, #eef3f7 0%, #f7f9fb 58%, #eef1f4 100%);
      color: #0b203a;
    }

    .gba-public-portal-shell {
      display: grid;
      gap: 16px;
      width: min(1180px, 100%);
      margin: 0 auto;
    }

    .gba-public-portal-brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 24px;
      background: rgba(255,255,255,0.78);
      border: 1px solid rgba(148,163,184,0.22);
      box-shadow: 0 18px 40px rgba(15,23,42,0.08);
      backdrop-filter: blur(14px);
    }

    .gba-public-portal-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .gba-public-portal-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 54px;
      height: 54px;
      border-radius: 18px;
      background: #0b2746;
      color: #f0c66d;
      font-size: 24px;
      font-family: Georgia, serif;
      font-weight: 900;
      letter-spacing: -0.15em;
      box-shadow: inset 5px 5px 14px rgba(255,255,255,0.10), 0 14px 26px rgba(11,39,70,0.18);
    }

    .gba-public-portal-logo strong,
    .gba-public-portal-logo span {
      display: block;
    }

    .gba-public-portal-logo strong {
      font-size: 16px;
      line-height: 1.05;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .gba-public-portal-logo span,
    .gba-public-portal-safe span {
      color: #5d6b7f;
      font-size: 12px;
      font-weight: 700;
    }

    .gba-public-portal-safe {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      border-radius: 999px;
      color: #0b2746;
      background: rgba(210,172,104,0.13);
      border: 1px solid rgba(210,172,104,0.28);
      font-weight: 900;
      white-space: nowrap;
    }

    .gba-public-portal-hero {
      position: relative;
      overflow: hidden;
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
      gap: 16px;
      padding: clamp(18px, 2vw, 28px);
      border-radius: 32px;
      color: #fff;
      background:
        radial-gradient(circle at 100% 12%, rgba(210,172,104,0.28), transparent 18rem),
        linear-gradient(135deg, #0b2746 0%, #102f52 76%);
      box-shadow: 0 26px 70px rgba(7,31,57,0.24);
    }

    .gba-public-portal-hero h1 {
      margin: 10px 0 8px;
      font-size: clamp(30px, 4vw, 54px);
      line-height: 0.98;
      letter-spacing: -0.06em;
    }

    .gba-public-portal-hero p {
      max-width: 760px;
      margin: 0;
      color: rgba(255,255,255,0.76);
      font-size: 15px;
      line-height: 1.62;
    }

    .gba-public-portal-kicker {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: max-content;
      padding: 7px 11px;
      border-radius: 999px;
      color: #f0c66d;
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.14);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .gba-public-portal-hero-card {
      display: grid;
      gap: 10px;
      align-content: center;
      padding: 14px;
      border-radius: 24px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.13);
      backdrop-filter: blur(12px);
    }

    .gba-public-portal-hero-tile {
      padding: 12px;
      border-radius: 18px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.10);
    }

    .gba-public-portal-hero-tile span,
    .gba-public-portal-hero-tile strong {
      display: block;
    }

    .gba-public-portal-hero-tile span {
      color: rgba(255,255,255,0.60);
      font-size: 10px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .gba-public-portal-hero-tile strong {
      margin-top: 5px;
      color: #fff;
      font-size: 15px;
      line-height: 1.25;
      word-break: break-word;
    }

    .gba-public-portal-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
      gap: 16px;
      align-items: start;
    }

    .gba-public-portal-card {
      display: grid;
      gap: 14px;
      padding: 16px;
      border-radius: 26px;
      background: rgba(255,255,255,0.88);
      border: 1px solid rgba(148,163,184,0.22);
      box-shadow: 0 18px 42px rgba(15,23,42,0.08);
      backdrop-filter: blur(14px);
    }

    .gba-public-portal-card h2 {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 0;
      color: #0b203a;
      font-size: 20px;
      letter-spacing: -0.04em;
    }

    .gba-public-portal-card p {
      margin: 0;
      color: #5d6b7f;
      line-height: 1.55;
      font-size: 14px;
    }

    .gba-public-portal-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 6px 10px;
      border-radius: 999px;
      color: #9c6d18;
      background: rgba(210,172,104,0.13);
      border: 1px solid rgba(210,172,104,0.28);
      font-size: 11px;
      font-weight: 950;
      white-space: nowrap;
    }

    .gba-public-portal-pill.green {
      color: #14532d;
      background: rgba(34,197,94,0.12);
      border-color: rgba(34,197,94,0.22);
    }

    .gba-public-portal-pill.red {
      color: #7f1d1d;
      background: rgba(239,68,68,0.10);
      border-color: rgba(239,68,68,0.22);
    }

    .gba-public-portal-summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .gba-public-portal-tile,
    .gba-public-portal-row,
    .gba-public-portal-alert {
      border-radius: 18px;
      background: #f8fafc;
      border: 1px solid rgba(148,163,184,0.20);
      box-shadow: inset 2px 2px 8px rgba(15,23,42,0.03), inset -2px -2px 8px rgba(255,255,255,0.72);
    }

    .gba-public-portal-tile {
      padding: 12px;
      min-width: 0;
    }

    .gba-public-portal-tile span,
    .gba-public-portal-tile strong {
      display: block;
    }

    .gba-public-portal-tile span {
      color: #64748b;
      font-size: 10px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .gba-public-portal-tile strong {
      margin-top: 5px;
      color: #0b203a;
      font-size: 14px;
      line-height: 1.25;
      word-break: break-word;
    }

    .gba-public-portal-alert {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 13px 14px;
      color: #475569;
      line-height: 1.55;
      font-size: 14px;
    }

    .gba-public-portal-alert svg {
      margin-top: 2px;
      color: #d2ac68;
      flex: 0 0 auto;
    }

    .gba-public-portal-list {
      display: grid;
      gap: 9px;
    }

    .gba-public-portal-row {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      padding: 12px;
    }

    .gba-public-portal-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: rgba(210,172,104,0.22);
      border: 3px solid rgba(210,172,104,0.42);
    }

    .gba-public-portal-dot.done {
      background: #22c55e;
      border-color: rgba(34,197,94,0.22);
    }

    .gba-public-portal-row strong,
    .gba-public-portal-row small {
      display: block;
    }

    .gba-public-portal-row strong {
      color: #0b203a;
      font-size: 14px;
      line-height: 1.25;
    }

    .gba-public-portal-row small {
      margin-top: 3px;
      color: #64748b;
      font-size: 12px;
      line-height: 1.35;
    }

    .gba-public-portal-actions {
      display: grid;
      gap: 10px;
    }

    .gba-public-portal-button {
      min-height: 52px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      border: 0;
      border-radius: 18px;
      padding: 0 16px;
      color: #0b203a;
      font-weight: 950;
      text-decoration: none;
      background: linear-gradient(135deg, #f0c66d, #c79432);
      box-shadow: 0 14px 26px rgba(154,112,35,0.22);
    }

    .gba-public-portal-button.secondary {
      color: #0b203a;
      background: #f8fafc;
      border: 1px solid rgba(148,163,184,0.22);
      box-shadow: inset 2px 2px 8px rgba(15,23,42,0.03), inset -2px -2px 8px rgba(255,255,255,0.72);
    }

    .gba-public-portal-empty {
      padding: 16px;
      border-radius: 18px;
      color: #64748b;
      background: #f8fafc;
      border: 1px dashed rgba(148,163,184,0.36);
      font-size: 14px;
      line-height: 1.5;
    }

    .gba-public-portal-error {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 20px;
      background: #eef3f7;
    }

    .gba-public-portal-error-card {
      width: min(560px, 100%);
      display: grid;
      gap: 12px;
      text-align: center;
      padding: 28px;
      border-radius: 28px;
      background: #fff;
      border: 1px solid rgba(148,163,184,0.22);
      box-shadow: 0 24px 60px rgba(15,23,42,0.12);
    }

    .gba-public-portal-error-card svg {
      justify-self: center;
      color: #d2ac68;
      font-size: 34px;
    }

    .gba-public-portal-error-card h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: -0.05em;
    }

    .gba-public-portal-error-card p {
      margin: 0;
      color: #64748b;
      line-height: 1.6;
    }

    @media (max-width: 900px) {
      .gba-public-portal-hero,
      .gba-public-portal-grid,
      .gba-public-portal-summary {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .gba-public-portal-brand,
      .gba-public-portal-row {
        grid-template-columns: 1fr;
        align-items: flex-start;
      }

      .gba-public-portal-safe {
        width: 100%;
        justify-content: center;
      }
    }
  `;
  document.head.appendChild(style);
}

function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function safeText(value, fallback = "Not recorded") {
  const text = String(value || "").trim();
  return text || fallback;
}

export default function PublicPortalView() {
  const { token } = useParams();
  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    injectPublicPortalStyles();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchPortal() {
      setLoading(true);
      setError("");

      try {
        const res = await axios.get(`${BASE_URL}/api/portal/${token}`);
        if (!cancelled) setPortal(res.data);
      } catch (err) {
        console.error("Portal fetch error:", err);
        if (!cancelled) {
          setError(err?.response?.data?.message || "This portal link could not be opened.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPortal();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="gba-public-portal-error">
        <div className="gba-public-portal-error-card">
          <FaRegClock />
          <h1>Opening your progress update</h1>
          <p>Please wait while we load the latest matter information.</p>
        </div>
      </div>
    );
  }

  if (error || !portal) {
    return (
      <div className="gba-public-portal-error">
        <div className="gba-public-portal-error-card">
          <FaExclamationTriangle />
          <h1>Portal link unavailable</h1>
          <p>{error || "This link may have expired or may no longer be active."}</p>
          <p>Please contact Gerhard Barnard Inc if you need a fresh progress link.</p>
        </div>
      </div>
    );
  }

  const matter = portal.matter || {};
  const firm = portal.firm || {};
  const contact = portal.contact || {};
  const outstandingItems = Array.isArray(portal.outstandingItems) ? portal.outstandingItems : [];
  const milestones = Array.isArray(portal.milestones) ? portal.milestones : [];
  const finance = Array.isArray(portal.finance) ? portal.finance : [];
  const reportUrl = `${BASE_URL}${portal.reportDownloadUrl || `/api/portal/${token}/report`}`;

  return (
    <div className="gba-public-portal-page">
      <div className="gba-public-portal-shell">
        <header className="gba-public-portal-brand">
          <div className="gba-public-portal-logo">
            <span className="gba-public-portal-mark">GB</span>
            <div>
              <strong>{safeText(firm.name, "Gerhard Barnard Inc")}</strong>
              <span>{safeText(firm.subtitle, "Conveyancing Attorneys")}</span>
            </div>
          </div>
          <div className="gba-public-portal-safe">
            <FaShieldAlt /> <span>Private progress link</span>
          </div>
        </header>

        <section className="gba-public-portal-hero">
          <div>
            <span className="gba-public-portal-kicker"><FaLock /> {safeText(portal.portal?.audienceLabel, "Matter progress portal")}</span>
            <h1>{safeText(matter.reference, "Matter progress")}</h1>
            <p>
              {safeText(matter.parties, "This page shows the latest progress available for the selected matter.")}
            </p>
          </div>
          <div className="gba-public-portal-hero-card">
            <div className="gba-public-portal-hero-tile">
              <span>Current stage</span>
              <strong>{safeText(matter.currentStage)}</strong>
            </div>
            <div className="gba-public-portal-hero-tile">
              <span>Last update</span>
              <strong>{formatDate(matter.lastUpdate)}</strong>
            </div>
            <div className="gba-public-portal-hero-tile">
              <span>Status</span>
              <strong>{safeText(matter.status, "Active")}</strong>
            </div>
          </div>
        </section>

        <main className="gba-public-portal-grid">
          <section className="gba-public-portal-card">
            <h2>
              Progress summary
              <span className="gba-public-portal-pill green"><FaCheckCircle /> Live update</span>
            </h2>

            <div className="gba-public-portal-summary">
              <div className="gba-public-portal-tile">
                <span>Property</span>
                <strong>{safeText(matter.property)}</strong>
              </div>
              <div className="gba-public-portal-tile">
                <span>Reference</span>
                <strong>{safeText(matter.reference)}</strong>
              </div>
              <div className="gba-public-portal-tile">
                <span>Contact person</span>
                <strong>{safeText(contact.name, "Conveyancing team")}</strong>
              </div>
              {matter.agency && (
                <div className="gba-public-portal-tile">
                  <span>Agency</span>
                  <strong>{matter.agency}</strong>
                </div>
              )}
              {matter.agent && (
                <div className="gba-public-portal-tile">
                  <span>Agent</span>
                  <strong>{matter.agent}</strong>
                </div>
              )}
            </div>

            <div className="gba-public-portal-alert">
              <FaFileAlt />
              <span>{safeText(matter.nextStep, "The firm will share the next update as soon as there is movement.")}</span>
            </div>

            {matter.comments && (
              <div className="gba-public-portal-alert">
                <FaRegClock />
                <span>{matter.comments}</span>
              </div>
            )}
          </section>

          <aside className="gba-public-portal-card">
            <h2>
              Downloads & contact
              <span className="gba-public-portal-pill"><FaDownload /> Report</span>
            </h2>
            <div className="gba-public-portal-actions">
              <a className="gba-public-portal-button" href={reportUrl} target="_blank" rel="noopener noreferrer">
                <FaDownload /> Download progress report
              </a>
              {contact.email && (
                <a className="gba-public-portal-button secondary" href={`mailto:${contact.email}`}>
                  <FaEnvelope /> Email {safeText(contact.name, "the team")}
                </a>
              )}
              <div className="gba-public-portal-alert">
                <FaBuilding />
                <span>
                  {safeText(firm.name, "Gerhard Barnard Inc")} will update this page as the matter progresses.
                  {contact.email ? ` For urgent questions, contact ${contact.email}.` : ""}
                </span>
              </div>
            </div>
          </aside>

          <section className="gba-public-portal-card">
            <h2>
              Outstanding items
              <span className={outstandingItems.length ? "gba-public-portal-pill red" : "gba-public-portal-pill green"}>
                {outstandingItems.length ? `${outstandingItems.length} open` : "Clear"}
              </span>
            </h2>
            {outstandingItems.length ? (
              <div className="gba-public-portal-list">
                {outstandingItems.map((item) => (
                  <div className="gba-public-portal-row" key={item.key || item.label}>
                    <span className="gba-public-portal-dot" />
                    <div>
                      <strong>{safeText(item.label, "Outstanding item")}</strong>
                      <small>Requested: {safeText(item.requested, "Not requested yet")} · Received: {safeText(item.received, "Outstanding")}</small>
                    </div>
                    <span className={item.overdue ? "gba-public-portal-pill red" : "gba-public-portal-pill"}>
                      {item.overdue ? "Follow-up" : "Open"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="gba-public-portal-empty">No outstanding items are currently showing for this matter.</div>
            )}
          </section>

          <section className="gba-public-portal-card">
            <h2>
              Payment & cost overview
              <span className="gba-public-portal-pill"><FaPhoneAlt /> Summary</span>
            </h2>
            <div className="gba-public-portal-summary">
              {finance.map((item) => (
                <div className="gba-public-portal-tile" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{safeText(item.value)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="gba-public-portal-card" style={{ gridColumn: "1 / -1" }}>
            <h2>
              Progress timeline
              <span className="gba-public-portal-pill"><FaRegClock /> Matter steps</span>
            </h2>
            {milestones.length ? (
              <div className="gba-public-portal-list">
                {milestones.map((item) => (
                  <div className="gba-public-portal-row" key={item.label}>
                    <span className={item.completed ? "gba-public-portal-dot done" : "gba-public-portal-dot"} />
                    <div>
                      <strong>{safeText(item.label, "Progress step")}</strong>
                      <small>{safeText(item.displayValue, "Pending")}</small>
                    </div>
                    <span className={item.completed ? "gba-public-portal-pill green" : "gba-public-portal-pill"}>
                      {item.completed ? "Done" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="gba-public-portal-empty">The timeline will show here once progress steps are available.</div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
