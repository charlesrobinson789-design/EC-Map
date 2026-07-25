"use client";

import React from "react";
import { type AppState, type ServerState } from "./types";

interface Props {
  state: AppState;
  serverState: ServerState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onLoadPatient: (patientId: string) => void;
  onSaveAssessment: () => void;
  onLoadAssessment: (assessmentId: string) => void;
  onDeleteAssessment: (assessmentId: string) => void;
  onExportAssessment: () => void;
  onResetDev: () => void;
}

export function PersistencePanel({
  state,
  serverState,
  onUpdateState,
  onLoadPatient,
  onSaveAssessment,
  onLoadAssessment,
  onDeleteAssessment,
  onExportAssessment,
  onResetDev
}: Props) {
  const isStatic = typeof window !== "undefined" && window.location.port === "5173";

  return (
    <section className="persistence-panel card" aria-label="Session Persistence and Mock Profiles">
      <div className="persistence-header">
        <h2>Session Persistence & Demo Profiles</h2>
        <span className={`status-badge ${serverState.available ? "status-ok" : "status-warn"}`}>
          {serverState.message}
        </span>
      </div>

      <div className="persistence-controls">
        <div className="control-group">
          <label htmlFor="mock-patient-select">Load Demo Profile:</label>
          <select
            id="mock-patient-select"
            value={state.patientId}
            onChange={(e) => onLoadPatient(e.target.value)}
            disabled={!serverState.available || serverState.loading}
          >
            <option value="">-- Select Mock Patient --</option>
            {serverState.patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName} ({p.ageRange}, {p.menopauseStage}) - {p.adhdContext}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group ack-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              data-field="mock-data-ack"
              checked={state.mockDataAcknowledged}
              onChange={(e) =>
                onUpdateState((prev) => ({
                  ...prev,
                  mockDataAcknowledged: e.target.checked,
                  mockDataAcknowledgedAt: e.target.checked ? new Date().toISOString() : ""
                }))
              }
            />
            <span>Confirm this is demo/mock data only before saving.</span>
          </label>
        </div>

        <div className="action-buttons">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSaveAssessment}
            disabled={!serverState.available || !state.patientId || !state.mockDataAcknowledged}
          >
            Save Session
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            data-action="export-assessment"
            onClick={onExportAssessment}
          >
            Export JSON
          </button>
        </div>
      </div>

      {serverState.saveStatus && (
        <div className="save-status-msg">{serverState.saveStatus}</div>
      )}

      {serverState.assessments.length > 0 && (
        <div className="saved-assessments-list">
          <h3>Saved Assessments in Database</h3>
          <ul>
            {serverState.assessments.map((a) => (
              <li key={a.id} className="saved-item">
                <span>
                  <strong>{a.patientName || a.patientId}</strong> ({a.status}) — Completed:{" "}
                  {a.completedAt ? new Date(a.completedAt).toLocaleString() : "In Progress"}
                </span>
                <div className="saved-item-actions">
                  <button type="button" className="btn btn-sm" onClick={() => onLoadAssessment(a.id)}>
                    Load
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    data-action="delete-assessment"
                    onClick={() => onDeleteAssessment(a.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {process.env.NODE_ENV === "development" && (
        <div className="dev-reset-area">
          <button type="button" className="btn btn-xs btn-warning" onClick={onResetDev}>
            Reset Database Assessments (Dev)
          </button>
        </div>
      )}
    </section>
  );
}
