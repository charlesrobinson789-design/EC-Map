"use client";

import React from "react";
import { NARRATIVE_PROMPTS } from "@/spine";

interface Props {
  narrativeResponses: Record<string, string>;
  onChange: (id: string, text: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function NarrativeView({ narrativeResponses, onChange, onNext, onBack }: Props) {
  return (
    <div className="narrative-view card">
      <div className="view-header">
        <h2>Narrative Capture</h2>
        <p>
          These questions ground your scores in lived context: what you are compensating for, where you pay for it privately, and what has helped.
        </p>
      </div>

      <div className="narrative-fields">
        {NARRATIVE_PROMPTS.map((p) => {
          const val = narrativeResponses[p.id] || "";
          return (
            <div key={p.id} className="form-group card">
              <label htmlFor={`narrative-${p.id}`} className="form-label">
                <strong>{p.label}</strong>
              </label>
              <textarea
                id={`narrative-${p.id}`}
                className="form-textarea"
                rows={4}
                placeholder="Share any context or examples here..."
                value={val}
                onChange={(e) => onChange(p.id, e.target.value)}
              />
            </div>
          );
        })}
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          ⬅ Adaptive Clarifiers
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Proceed to Validity Checks ➔
        </button>
      </div>
    </div>
  );
}
