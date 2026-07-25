"use client";

import React from "react";
import { activeClarifiers } from "@/followups";

interface Props {
  scoredResponses: Record<string, number>;
  adaptiveResponses: Record<string, string | string[]>;
  onChange: (id: string, values: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ClarifiersView({ scoredResponses, adaptiveResponses, onChange, onNext, onBack }: Props) {
  const clarifiers = activeClarifiers(scoredResponses);

  return (
    <div className="clarifiers-view card">
      <div className="view-header">
        <h2>Adaptive Follow-Up Clarifiers</h2>
        <p>
          Based on your item scores, we triggered specific contextual clarifiers. Select all contributing factors that apply.
        </p>
      </div>

      {clarifiers.length === 0 ? (
        <div className="empty-clarifiers alert alert-info">
          No elevated bottleneck patterns required adaptive clarifiers for this profile.
        </div>
      ) : (
        <div className="clarifiers-list">
          {clarifiers.map((clarifier) => {
            const currentVal = adaptiveResponses[clarifier.id];
            const selectedArr = Array.isArray(currentVal) ? currentVal : currentVal ? [currentVal] : [];

            const toggleOption = (opt: string) => {
              const exists = selectedArr.includes(opt);
              const next = exists ? selectedArr.filter((o) => o !== opt) : [...selectedArr, opt];
              onChange(clarifier.id, next);
            };

            const kernelStr = Array.isArray(clarifier.kernelId)
              ? clarifier.kernelId.join(", ")
              : clarifier.kernelId || "General";

            return (
              <div key={clarifier.id} className="clarifier-item card">
                <h3>{clarifier.title} — {kernelStr}</h3>
                <p className="clarifier-prompt"><strong>{clarifier.prompt}</strong></p>
                <div className="options-grid">
                  {clarifier.options.map((opt) => {
                    const isChecked = selectedArr.includes(opt);
                    return (
                      <label key={opt} className={`checkbox-option ${isChecked ? "checked" : ""}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOption(opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          ⬅ Assessment Sections
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Proceed to Narrative Capture ➔
        </button>
      </div>
    </div>
  );
}
