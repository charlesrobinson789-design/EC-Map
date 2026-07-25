"use client";

import React from "react";
import { ASSESSMENT_SECTIONS, sectionStats } from "@/sections";

interface Props {
  scoredResponses: Record<string, number>;
  activeSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  onContinueToClarifiers: () => void;
  onBack: () => void;
}

export function SectionNav({
  scoredResponses,
  activeSectionId,
  onSelectSection,
  onContinueToClarifiers,
  onBack
}: Props) {
  const allComplete = ASSESSMENT_SECTIONS.every((sec) => sectionStats(sec.id, scoredResponses).complete);

  return (
    <div className="section-nav-view">
      <div className="view-header card">
        <h2>Assessment Sections</h2>
        <p>Select a section below to complete the 8 items for each domain.</p>
        <div className="nav-top-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>
            Back to Context
          </button>
          {allComplete && (
            <button type="button" className="btn btn-primary" onClick={onContinueToClarifiers}>
              Proceed to Adaptive Clarifiers ➔
            </button>
          )}
        </div>
      </div>

      <div className="sections-grid">
        {ASSESSMENT_SECTIONS.map((sec) => {
          const stats = sectionStats(sec.id, scoredResponses);
          const isActive = activeSectionId === sec.id;

          return (
            <div
              key={sec.id}
              className={`section-card card ${isActive ? "active-section" : ""} ${stats.complete ? "completed-section" : ""}`}
              onClick={() => onSelectSection(sec.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelectSection(sec.id); }}
            >
              <div className="section-card-header">
                <h3>{sec.title}</h3>
                <span className={`pill ${stats.complete ? "pill-success" : "pill-pending"}`}>
                  {stats.answered} / {stats.total}
                </span>
              </div>
              <p className="section-desc">{sec.subtitle}</p>
              <div className="section-card-footer">
                <span>{stats.complete ? "✓ Complete" : "In Progress"}</span>
                <button type="button" className="btn btn-sm btn-outline">
                  {stats.complete ? "Review" : "Start"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
