"use client";

import React from "react";
import { itemsForSection, sectionStats, nextIncompleteSectionId, ASSESSMENT_SECTIONS } from "@/sections";
import { RESPONSE_SCALE } from "@/spine";

interface Props {
  sectionId: string;
  scoredResponses: Record<string, number>;
  onChangeScore: (itemId: string, score: number) => void;
  onBackToSections: () => void;
  onNextSection: (nextId: string) => void;
  onFinishAll: () => void;
}

export function AssessmentQuestions({
  sectionId,
  scoredResponses,
  onChangeScore,
  onBackToSections,
  onNextSection,
  onFinishAll
}: Props) {
  const section = ASSESSMENT_SECTIONS.find((s) => s.id === sectionId);
  const items = itemsForSection(sectionId);
  const stats = sectionStats(sectionId, scoredResponses);
  const nextId = nextIncompleteSectionId(sectionId, scoredResponses);
  const allComplete = ASSESSMENT_SECTIONS.every((sec) => sectionStats(sec.id, scoredResponses).complete);

  if (!section) return <div>Section not found.</div>;

  return (
    <div className="assessment-questions-view">
      <div className="view-header card">
        <div className="header-nav">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onBackToSections}>
            ⬅ All Sections
          </button>
          <span className="stats-badge">
            {stats.answered} of {stats.total} Answered
          </span>
        </div>
        <h2>{section.title}</h2>
        <p>{section.subtitle}</p>
      </div>

      <div className="items-list">
        {items.map((item, idx) => {
          const currentScore = scoredResponses[item.id];
          return (
            <div key={item.id} className="item-card card">
              <div className="item-header">
                <span className="item-number">Item {idx + 1}</span>
                <span className="item-domain">{item.domain} — {item.kernel}</span>
              </div>
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
                      onChange={() => onChangeScore(item.id, scaleObj.value)}
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

      <div className="section-footer card">
        {stats.complete ? (
          <div className="complete-banner">
            <span className="success-icon">✓</span>
            <span>Section Complete!</span>
            {nextId ? (
              <button type="button" className="btn btn-primary" onClick={() => onNextSection(nextId)}>
                Next Section ➔
              </button>
            ) : allComplete ? (
              <button type="button" className="btn btn-primary btn-lg" onClick={onFinishAll}>
                Proceed to Adaptive Clarifiers ➔
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={onBackToSections}>
                Return to Sections List
              </button>
            )}
          </div>
        ) : (
          <div className="pending-notice">
            Please answer all {stats.total - stats.answered} remaining items in this section to proceed.
          </div>
        )}
      </div>
    </div>
  );
}
