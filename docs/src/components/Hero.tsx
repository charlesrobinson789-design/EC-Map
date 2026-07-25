"use client";

import React from "react";
import { type AppState } from "./types";

interface Props {
  state: AppState;
  onStart: () => void;
  onNavigate: (view: AppState["view"]) => void;
}

/**
 * renderIntro - The developer-grade Hero view for Phase 1 migration.
 */
export function Hero({ state, onStart, onNavigate }: Props) {
  return (
    <div className="hero-view">
      <header className="hero-banner card">
        <h1>EC Map Guided Capacity Assessment</h1>
        <p className="subtitle">
          Structured, deterministic capacity mapping for midlife cognition, attention, and executive load.
        </p>
        
        <div className="alert alert-info">
          <strong>Phase 1 Prototype Notice:</strong> This assessment is a deterministic, non-diagnostic executive capacity intake tool. No LLM touches scoring, safety routing, or claim generation.
        </div>

        <div className="paused-module-notice alert alert-warning">
          <strong>Paused Module Notice:</strong> The H1/H2 Hormonal and Sleep Transition sections are explicitly paused for review and are excluded from active scoring and diagnostic routing.
        </div>

        <div className="hero-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={onStart}>
            {Object.keys(state.scoredResponses).length > 0 ? "Resume Assessment" : "Start Assessment"}
          </button>
          
          {state.completedAt && (
            <>
              <button type="button" className="btn btn-secondary btn-lg" onClick={() => onNavigate("report")}>
                View Client Report
              </button>
              <button type="button" className="btn btn-secondary btn-lg" onClick={() => onNavigate("coach")}>
                View Coach Review
              </button>
            </>
          )}
        </div>
      </header>

      <section className="info-grid">
        <div className="info-card card">
          <h3>Deterministic Scoring</h3>
          <p>
            Every item score is processed through fixed, transparent algorithms to identify cognitive bottlenecks and capacity drivers.
          </p>
        </div>
        <div className="info-card card">
          <h3>Safety First</h3>
          <p>
            Private safety flags (S1-S4) are separated from standard capacity scores and redacted from public summaries.
          </p>
        </div>
        <div className="info-card card">
          <h3>Coach Ready</h3>
          <p>
            Generates structured review packets with calibrated language, source evidence links, and clear boundaries.
          </p>
        </div>
      </section>
    </div>
  );
}
