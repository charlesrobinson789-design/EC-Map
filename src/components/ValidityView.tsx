"use client";

import React from "react";
import { VALIDITY_ITEMS } from "@/followups";
import { RESPONSE_SCALE } from "@/spine";

interface Props {
  responses: Record<string, number>;
  onChange: (id: string, value: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ValidityView({ responses, onChange, onNext, onBack }: Props) {
  const isComplete = VALIDITY_ITEMS.every((item) => typeof responses[item.id] === "number");

  return (
    <div className="validity-view card">
      <div className="view-header">
        <h2>Session Validity & Confidence</h2>
        <p>
          Assess factors that might impact the clarity or consistency of today's answers.
        </p>
      </div>

      <div className="validity-items-list">
        {VALIDITY_ITEMS.map((item) => {
          const currentScore = responses[item.id];
          return (
            <div key={item.id} className="item-card card">
              <h3>Validity Check ({item.id})</h3>
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
          ⬅ Narrative Capture
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!isComplete}
          onClick={onNext}
        >
          Proceed to Private Safety Check ➔
        </button>
      </div>
    </div>
  );
}
