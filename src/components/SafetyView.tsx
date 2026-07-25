"use client";

import React from "react";
import { SAFETY_ITEMS, RESPONSE_SCALE } from "@/spine";

interface Props {
  responses: Record<string, number>;
  onChange: (id: string, value: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function SafetyView({ responses, onChange, onNext, onBack }: Props) {
  const isComplete = SAFETY_ITEMS.every((item) => typeof responses[item.id] === "number");

  return (
    <div className="safety-view card">
      <div className="view-header">
        <h2>Private Safety Check (S1–S4)</h2>
        <div className="alert alert-warning">
          <strong>Privacy & Redaction Guarantee:</strong> Private safety scores are evaluated separately from capacity scoring. They trigger human review and referral routing when elevated, and are strictly redacted from public reports and database session storage.
        </div>
      </div>

      <div className="safety-items-list">
        {SAFETY_ITEMS.map((item) => {
          const currentScore = responses[item.id];
          return (
            <div key={item.id} className="item-card card safety-card">
              <h3>Safety Check ({item.id}) {item.flag ? `— ${item.flag}` : ""}</h3>
              <p className="item-prompt"><strong>{item.prompt}</strong></p>
              <div className="scale-options">
                {RESPONSE_SCALE.map((scaleObj) => (
                  <label
                    key={scaleObj.value}
                    className={`scale-option ${currentScore === scaleObj.value ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name={item.id}
                      value={scaleObj.value}
                      checked={currentScore === scaleObj.value}
                      onChange={() => onChange(item.id, scaleObj.value)}
                    />
                    <span className="scale-num">{scaleObj.value}</span>
                    <span className="scale-label">{scaleObj.label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          ⬅ Validity Check
        </button>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={!isComplete}
          onClick={onNext}
        >
          Generate Reports & Review Packets ➔
        </button>
      </div>
    </div>
  );
}
