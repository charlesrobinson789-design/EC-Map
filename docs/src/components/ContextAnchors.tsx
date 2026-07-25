"use client";

import React from "react";
import { ACTIVE_CONTEXT_PROMPTS } from "@/sections";
import { type AppState } from "./types";

interface Props {
  responses: Record<string, string>;
  onChange: (id: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ContextAnchors({ responses, onChange, onNext, onBack }: Props) {
  const isComplete = ACTIVE_CONTEXT_PROMPTS.every((p) => Boolean(responses[p.id]?.trim()));

  return (
    <div className="context-anchors-view card">
      <div className="view-header">
        <h2>Functional Context Anchors</h2>
        <p>
          Before scoring specific items, let's establish baseline context around your current role and demands.
        </p>
      </div>

      <form className="context-form" onSubmit={(e) => { e.preventDefault(); if (isComplete) onNext(); }}>
        {ACTIVE_CONTEXT_PROMPTS.map((prompt) => (
          <div key={prompt.id} className="form-group">
            <label htmlFor={prompt.id} className="form-label">
              <strong>{prompt.label}</strong>
              <span className="prompt-text">{prompt.prompt}</span>
            </label>
            {prompt.options ? (
              <select
                id={prompt.id}
                className="form-select"
                value={responses[prompt.id] || ""}
                onChange={(e) => onChange(prompt.id, e.target.value)}
              >
                <option value="">-- Select option --</option>
                {prompt.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                id={prompt.id}
                className="form-input"
                value={responses[prompt.id] || ""}
                onChange={(e) => onChange(prompt.id, e.target.value)}
                placeholder="Enter details..."
              />
            )}
          </div>
        ))}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Back to Intro
          </button>
          <button type="submit" className="btn btn-primary" disabled={!isComplete}>
            Proceed to Assessment Sections
          </button>
        </div>
      </form>
    </div>
  );
}
