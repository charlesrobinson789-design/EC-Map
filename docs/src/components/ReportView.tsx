"use client";

import React from "react";
import {
  buildCapacitySignature,
  buildSectionSummaries,
  buildDifferentialLens,
  buildExperiments,
  buildConversationPrompts
} from "@/report-model";
import { scoreAssessment } from "@/scoring";
import { validitySummary } from "@/followups";
import { type AppState } from "./types";

interface Props {
  state: AppState;
  onNavigate: (view: AppState["view"]) => void;
  onReset: () => void;
}

export function ReportView({ state, onNavigate, onReset }: Props) {
  const scored = scoreAssessment(state.scoredResponses, state.safetyResponses);
  const valSummary = validitySummary(state.validityResponses);
  const signature = buildCapacitySignature(scored);
  const summaries = buildSectionSummaries(scored);
  const lens = buildDifferentialLens(state, scored);
  const experiments = buildExperiments(scored);
  const prompts = buildConversationPrompts(scored, valSummary);

  return (
    <div className="report-view">
      <div className="report-header card">
        <div className="header-nav">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onNavigate("intro")}>
            ⬅ Intro
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onNavigate("coach")}>
            Switch to Coach Packet ➔
          </button>
        </div>
        <h1>Client Capacity Report</h1>
        <p className="subtitle">
          Calibrated summary of functional patterns, bottleneck drivers, and structured experiments.
        </p>
      </div>

      <section className="signature-section card">
        <h2>Capacity Signature</h2>
        <div className="signature-box">
          <h3>{signature.headline || signature.title}</h3>
          <p><strong>{signature.title}</strong></p>
          <p>{signature.body}</p>
          {signature.lever && <p className="mt-2 text-sm text-primary"><strong>Next Lever:</strong> {signature.lever}</p>}
        </div>
      </section>

      <section className="differential-section card">
        <h2>Differential Lens (ADHD vs. Midlife Cognitive Load)</h2>
        <div className="differential-card">
          <span className="status-pill">{lens.status}</span>
          <p className="lens-summary mt-2"><strong>{lens.body}</strong></p>
          <div className="lens-columns mt-3">
            <div className="lens-col">
              <h4>To Verify</h4>
              <p>{lens.verify}</p>
            </div>
            <div className="lens-col">
              <h4>Clinical Caveat</h4>
              <p>{lens.caveat}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="summaries-section card">
        <h2>Domain Breakdown</h2>
        <div className="summaries-grid">
          {summaries.map((sum) => (
            <div key={sum.id} className="summary-card card">
              <div className="summary-card-header">
                <h3>{sum.title}</h3>
                <span className={`pill ${sum.status === "High friction" ? "pill-warn" : sum.status === "Moderate friction" ? "pill-warning" : "pill-ok"}`}>
                  {sum.status}
                </span>
              </div>
              <p className="mt-2"><strong>Score:</strong> {sum.total} / {sum.max} (Avg: {sum.average})</p>
              <div className="top-drivers mt-2">
                <strong>Top Signal Kernel:</strong>
                <p>{sum.topKernel}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="experiments-section card">
        <h2>Structured Experiments</h2>
        <div className="experiments-list">
          {experiments.map((exp, idx) => (
            <div key={idx} className="experiment-card card">
              <div className="flex justify-between items-center">
                <h3>{exp.title}</h3>
                <span className="pill pill-secondary">{exp.kernel}</span>
              </div>
              <p className="mt-2"><strong>Experiment Prompt:</strong> {exp.prompt}</p>
              {exp.severity && <p className="text-sm text-muted mt-1">Severity: {exp.severity}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="prompts-section card">
        <h2>Coach Conversation Prompts</h2>
        <ul>
          {prompts.map((p, idx) => (
            <li key={idx} className="prompt-item">
              {p}
            </li>
          ))}
        </ul>
      </section>

      <div className="view-footer card">
        <button type="button" className="btn btn-secondary" onClick={() => onNavigate("coach")}>
          View Coach Packet
        </button>
        <button type="button" className="btn btn-outline" onClick={onReset}>
          Start New Session
        </button>
      </div>
    </div>
  );
}
