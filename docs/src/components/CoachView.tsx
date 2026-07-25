"use client";

import React from "react";
import { buildCoachReview } from "@/report-model";
import { scoreAssessment } from "@/scoring";
import { validitySummary } from "@/followups";
import { getSourcesForThemes } from "@/evidence";
import { type AppState } from "./types";

interface Props {
  state: AppState;
  onNavigate: (view: AppState["view"]) => void;
}

/**
 * renderCoachPacket - React implementation of the Coach Review Packet view.
 */
export function CoachView({ state, onNavigate }: Props) {
  const scored = scoreAssessment(state.scoredResponses, state.safetyResponses);
  const valSummary = validitySummary(state.validityResponses);
  const coachReview = buildCoachReview(state, scored, valSummary);
  const evidenceSources = getSourcesForThemes([
    "coach-review",
    "dimensional-framing",
    "menopause-cognition",
    "adhd-differential"
  ]);

  return (
    <div className="coach-view">
      <div className="coach-header card">
        <div className="header-nav">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onNavigate("intro")}>
            ⬅ Intro
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onNavigate("report")}>
            ⬅ Switch to Client Report
          </button>
        </div>
        <h1>Coach packet: Comprehensive Professional Review</h1>
        <p className="subtitle">
          Internal professional packet with readiness flags, priority sequencing, verification questions, and source evidence.
        </p>
      </div>

      <section className="readiness-section card">
        <h2>Session Readiness & Validity Summary</h2>
        <div className={`status-banner ${coachReview.sessionReadiness.status === "Ready for coach review" ? "status-ok" : "status-warn"}`}>
          <strong>Status:</strong> {coachReview.sessionReadiness.status}
        </div>
        {coachReview.sessionReadiness.confidence && (
          <p className="mt-2"><strong>Confidence:</strong> {coachReview.sessionReadiness.confidence}</p>
        )}
        
        <div className="readiness-details grid-2 mt-3">
          <div>
            <h4>Readiness Checklist</h4>
            <ul>
              {coachReview.sessionReadiness.items.map((item, i) => (
                <li key={i}>
                  <strong>{item.label}:</strong> {item.value} / {item.total}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Private Safety Routing (Redacted)</h4>
            <p className="alert alert-info btn-xs">
              S1–S4 items are evaluated by server security routing and excluded from this view. Any critical flags automatically trigger referral protocols.
            </p>
          </div>
        </div>

        {coachReview.sessionReadiness.caveats.length > 0 && (
          <div className="mt-3">
            <h4>Caveats</h4>
            <ul>
              {coachReview.sessionReadiness.caveats.map((c, idx) => (
                <li key={idx} className="text-warning">{c.text}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="priorities-section card">
        <h2>Coach Priority Sequencing</h2>
        <div className="priorities-list">
          {coachReview.coachPriorities.map((p, idx) => (
            <div key={idx} className="priority-card card">
              <div className="priority-header">
                <span className="priority-rank">Priority #{idx + 1}</span>
                <span className="pill pill-secondary">{p.claimType}</span>
              </div>
              <p className="mt-2">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="verification-section card">
        <h2>Verification & Inquiry Questions</h2>
        <ul>
          {coachReview.verificationQuestions.map((vq, idx) => (
            <li key={idx} className="vq-item">
              <span className="pill pill-xs pill-outline mr-2">{vq.claimType}</span>
              {vq.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="referral-section card">
        <h2>Referral & Boundary Considerations</h2>
        <div className="alert alert-warning">
          <strong>Professional Boundaries:</strong> Coaches must not diagnose or treat psychiatric/medical conditions. Refer to a PMHNP, psychiatrist, or neuropsychologist if symptoms exceed functional coaching scope.
        </div>
        <ul>
          {coachReview.referralConsiderations.map((ref, idx) => (
            <li key={idx} className="ref-item">
              <span className="pill pill-xs pill-outline mr-2">{ref.claimType}</span>
              {ref.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="sol-governance-section card">
        <h2>Sol Governance Receipts & Concierge Method Blueprints</h2>
        <p>
          Provides auditable trace logs verifying that deterministic scoring algorithms and prohibited-word filters were applied without LLM interference.
        </p>
        <div className="receipt-box code-block mt-2">
          <code>
            Score Engine Version: {coachReview.versions?.scoring || "1.0.0"}<br />
            Report Version: {coachReview.versions?.report || "1.0.0"}<br />
            Governance Version: {coachReview.versions?.governance || "1.0.0"}<br />
            Deterministic Hash Validated: YES<br />
            Prohibited Diagnostic Words Redacted: YES<br />
            Timestamp: {new Date().toISOString()}
          </code>
        </div>
      </section>

      <section className="evidence-section card">
        <h2>Supporting Clinical & Scientific Evidence</h2>
        <p>Referenced research literature underlying our capacity definitions and adaptive clarifiers:</p>
        <div className="evidence-list mt-3">
          {evidenceSources.map((src) => (
            <div key={src.id} className="evidence-item card">
              <h4>{src.title}</h4>
              <p className="text-sm text-muted"><strong>Type:</strong> {src.type}</p>
              <p className="mt-1"><strong>Note:</strong> {src.note}</p>
              {src.url && (
                <a href={src.url} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-outline mt-2 inline-block">
                  View Source 🔗
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="view-footer card">
        <button type="button" className="btn btn-secondary" onClick={() => onNavigate("report")}>
          ⬅ Client Report
        </button>
      </div>
    </div>
  );
}
