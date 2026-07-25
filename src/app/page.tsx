"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CORE_PROFILE_VERSION } from "@/session-profile";
import { type AppState, type ServerState, type ViewMode } from "@/components/types";
import { PersistencePanel } from "@/components/PersistencePanel";
import { Hero } from "@/components/Hero";
import { ContextAnchors } from "@/components/ContextAnchors";
import { SectionNav } from "@/components/SectionNav";
import { AssessmentQuestions } from "@/components/AssessmentQuestions";
import { ClarifiersView } from "@/components/ClarifiersView";
import { NarrativeView } from "@/components/NarrativeView";
import { ValidityView } from "@/components/ValidityView";
import { SafetyView } from "@/components/SafetyView";
import { ReportView } from "@/components/ReportView";
import { CoachView } from "@/components/CoachView";

const defaultState: AppState = {
  assessmentProfileVersion: CORE_PROFILE_VERSION,
  view: "intro",
  itemIndex: 0,
  activeSectionId: null,
  lastCompletedSectionId: null,
  contextResponses: {},
  scoredResponses: {},
  adaptiveResponses: {},
  narrativeResponses: {},
  validityResponses: {},
  safetyResponses: {},
  patientId: "",
  mockDataAcknowledged: false,
  mockDataAcknowledgedAt: "",
  savedAssessmentId: "",
  completedAt: null
};

export default function HomePage() {
  const [state, setState] = useState<AppState>(defaultState);
  const [serverState, setServerState] = useState<ServerState>({
    loading: true,
    available: false,
    message: "Connecting to server...",
    patients: [],
    assessments: [],
    saveStatus: ""
  });

  const fetchServerData = useCallback(async () => {
    try {
      const [healthRes, patientsRes, assessmentsRes] = await Promise.all([
        fetch("/api/health").catch(() => null),
        fetch("/api/mock-patients").catch(() => null),
        fetch("/api/assessments").catch(() => null)
      ]);

      if (healthRes && healthRes.ok && patientsRes && patientsRes.ok) {
        const patientsData = await patientsRes.json();
        const assessmentsData = assessmentsRes && assessmentsRes.ok ? await assessmentsRes.json() : { assessments: [] };
        
        setServerState({
          loading: false,
          available: true,
          message: "Database Connected (PostgreSQL)",
          patients: patientsData.patients || [],
          assessments: assessmentsData.assessments || [],
          saveStatus: ""
        });
      } else {
        setServerState((prev) => ({
          ...prev,
          loading: false,
          available: false,
          message: "Standalone Preview Mode (No DB)"
        }));
      }
    } catch {
      setServerState((prev) => ({
        ...prev,
        loading: false,
        available: false,
        message: "Standalone Preview Mode (No DB)"
      }));
    }
  }, []);

  useEffect(() => {
    fetchServerData();
  }, [fetchServerData]);

  const handleNavigate = (view: ViewMode) => {
    setState((prev) => ({ ...prev, view }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLoadPatient = async (patientId: string) => {
    if (!patientId) {
      setState(defaultState);
      return;
    }
    const patient = serverState.patients.find((p) => p.id === patientId);
    if (!patient) return;

    // Prefill some context based on mock patient
    const context: Record<string, string> = {
      "context-role": "Corporate Executive / Leader",
      "context-meeting-load": "Heavy (5+ hours/day)",
      "context-sleep": patient.menopauseStage !== "Pre-menopause" ? "Disrupted / Light" : "Stable",
      "context-attention-history": patient.adhdContext.includes("Longstanding") ? "Lifelong pattern" : "Recent shift",
      "context-setting-spread": "Multi-context (work + home)",
      "context-timeline": "Over the past 1-2 years"
    };

    // Pre-populate realistic mock scores for demonstration
    const scored: Record<string, number> = {
      "exec-1": 3, "exec-2": 4, "exec-3": 3, "exec-4": 2, "exec-5": 3, "exec-6": 4, "exec-7": 2, "exec-8": 3,
      "attn-1": 4, "attn-2": 3, "attn-3": 4, "attn-4": 3, "attn-5": 2, "attn-6": 3, "attn-7": 4, "attn-8": 3,
      "mem-1": 3, "mem-2": 4, "mem-3": 3, "mem-4": 2, "mem-5": 4, "mem-6": 3, "mem-7": 3, "mem-8": 4,
      "init-1": 3, "init-2": 2, "init-3": 3, "init-4": 4, "init-5": 2, "init-6": 3, "init-7": 3, "init-8": 2,
      "org-1": 2, "org-2": 3, "org-3": 2, "org-4": 3, "org-5": 3, "org-6": 2, "org-7": 3, "org-8": 2,
      "emot-1": 3, "emot-2": 4, "emot-3": 3, "emot-4": 3, "emot-5": 2, "emot-6": 4, "emot-7": 3, "emot-8": 3,
      "body-1": 4, "body-2": 3, "body-3": 4, "body-4": 3, "body-5": 4, "body-6": 3, "body-7": 4, "body-8": 3
    };

    const validity: Record<string, number> = { "val-1": 3, "val-2": 4, "val-3": 3, "val-4": 4 };
    const safety: Record<string, number> = { "safe-1": 0, "safe-2": 0, "safe-3": 0, "safe-4": 0 };

    setState({
      ...defaultState,
      patientId: patient.id,
      view: "report",
      contextResponses: context,
      scoredResponses: scored,
      validityResponses: validity,
      safetyResponses: safety,
      completedAt: new Date().toISOString()
    });
  };

  const handleSaveAssessment = async () => {
    if (!state.patientId || !state.mockDataAcknowledged) return;
    setServerState((prev) => ({ ...prev, saveStatus: "Saving assessment session..." }));

    try {
      const payload = {
        patientId: state.patientId,
        status: state.completedAt ? "completed" : "in-progress",
        session: {
          assessmentProfileVersion: state.assessmentProfileVersion,
          contextResponses: state.contextResponses,
          scoredResponses: state.scoredResponses,
          adaptiveResponses: state.adaptiveResponses,
          narrativeResponses: state.narrativeResponses,
          validityResponses: state.validityResponses,
          safetyResponses: state.safetyResponses
        },
        report: {
          generatedAt: new Date().toISOString(),
          version: state.assessmentProfileVersion
        },
        versions: {
          profileVersion: state.assessmentProfileVersion,
          engineVersion: "1.0.0"
        },
        dataUseAcknowledgement: {
          acknowledged: state.mockDataAcknowledged,
          timestamp: state.mockDataAcknowledgedAt || new Date().toISOString()
        },
        completedAt: state.completedAt || new Date().toISOString()
      };

      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setServerState((prev) => ({
          ...prev,
          saveStatus: `Saved successfully! ID: ${data.assessment.id.slice(0, 8)}...`,
          assessments: [data.assessment, ...prev.assessments.filter((a) => a.id !== data.assessment.id)]
        }));
        setState((prev) => ({ ...prev, savedAssessmentId: data.assessment.id }));
      } else {
        setServerState((prev) => ({ ...prev, saveStatus: "Error saving assessment to server." }));
      }
    } catch {
      setServerState((prev) => ({ ...prev, saveStatus: "Network error saving assessment." }));
    }
  };

  const handleLoadAssessment = async (assessmentId: string) => {
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`);
      if (!res.ok) return;
      const data = await res.json();
      const sess = data.assessment.session || {};
      
      setState({
        ...defaultState,
        assessmentProfileVersion: sess.assessmentProfileVersion || CORE_PROFILE_VERSION,
        patientId: data.assessment.patientId || "",
        view: "report",
        contextResponses: sess.contextResponses || {},
        scoredResponses: sess.scoredResponses || {},
        adaptiveResponses: sess.adaptiveResponses || {},
        narrativeResponses: sess.narrativeResponses || {},
        validityResponses: sess.validityResponses || {},
        safetyResponses: sess.safetyResponses || {},
        savedAssessmentId: data.assessment.id,
        completedAt: data.assessment.completedAt || null,
        mockDataAcknowledged: true
      });
    } catch {}
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    try {
      const res = await fetch(`/api/assessments/${assessmentId}`, { method: "DELETE" });
      if (res.ok) {
        setServerState((prev) => ({
          ...prev,
          assessments: prev.assessments.filter((a) => a.id !== assessmentId),
          saveStatus: "Assessment deleted."
        }));
      }
    } catch {}
  };

  const handleExportAssessment = () => {
    const exportObj = {
      version: state.assessmentProfileVersion,
      exportedAt: new Date().toISOString(),
      patientId: state.patientId,
      contextResponses: state.contextResponses,
      scoredResponses: state.scoredResponses,
      adaptiveResponses: state.adaptiveResponses,
      narrativeResponses: state.narrativeResponses,
      validityResponses: state.validityResponses,
      completedAt: state.completedAt,
      notice: "Private safety responses (S1-S4) are strictly excluded from exported payloads."
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ec-map-assessment-${state.patientId || "export"}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetDev = async () => {
    try {
      await Promise.all(serverState.assessments.map((a) => fetch(`/api/assessments/${a.id}`, { method: "DELETE" })));
      setServerState((prev) => ({ ...prev, assessments: [], saveStatus: "Database assessments reset." }));
      setState(defaultState);
    } catch {}
  };

  return (
    <main className="app-shell container" id="app">
      <PersistencePanel
        state={state}
        serverState={serverState}
        onUpdateState={setState}
        onLoadPatient={handleLoadPatient}
        onSaveAssessment={handleSaveAssessment}
        onLoadAssessment={handleLoadAssessment}
        onDeleteAssessment={handleDeleteAssessment}
        onExportAssessment={handleExportAssessment}
        onResetDev={handleResetDev}
      />

      <div className="main-content mt-4">
        {state.view === "intro" && (
          <Hero
            state={state}
            onStart={() => handleNavigate("context")}
            onNavigate={handleNavigate}
          />
        )}

        {state.view === "context" && (
          <ContextAnchors
            responses={state.contextResponses}
            onChange={(id, val) => setState((prev) => ({ ...prev, contextResponses: { ...prev.contextResponses, [id]: val } }))}
            onNext={() => handleNavigate("sections")}
            onBack={() => handleNavigate("intro")}
          />
        )}

        {state.view === "sections" && (
          <SectionNav
            scoredResponses={state.scoredResponses}
            activeSectionId={state.activeSectionId}
            onSelectSection={(secId) => setState((prev) => ({ ...prev, activeSectionId: secId, view: "assessment" }))}
            onContinueToClarifiers={() => handleNavigate("clarifiers")}
            onBack={() => handleNavigate("context")}
          />
        )}

        {state.view === "assessment" && state.activeSectionId && (
          <AssessmentQuestions
            sectionId={state.activeSectionId}
            scoredResponses={state.scoredResponses}
            onChangeScore={(id, val) => setState((prev) => ({ ...prev, scoredResponses: { ...prev.scoredResponses, [id]: val } }))}
            onBackToSections={() => handleNavigate("sections")}
            onNextSection={(nextId) => setState((prev) => ({ ...prev, activeSectionId: nextId }))}
            onFinishAll={() => handleNavigate("clarifiers")}
          />
        )}

        {state.view === "clarifiers" && (
          <ClarifiersView
            scoredResponses={state.scoredResponses}
            adaptiveResponses={state.adaptiveResponses}
            onChange={(id, val) => setState((prev) => ({ ...prev, adaptiveResponses: { ...prev.adaptiveResponses, [id]: val } }))}
            onNext={() => handleNavigate("narrative")}
            onBack={() => handleNavigate("sections")}
          />
        )}

        {state.view === "narrative" && (
          <NarrativeView
            narrativeResponses={state.narrativeResponses}
            onChange={(id, val) => setState((prev) => ({ ...prev, narrativeResponses: { ...prev.narrativeResponses, [id]: val } }))}
            onNext={() => handleNavigate("validity")}
            onBack={() => handleNavigate("clarifiers")}
          />
        )}

        {state.view === "validity" && (
          <ValidityView
            responses={state.validityResponses}
            onChange={(id, val) => setState((prev) => ({ ...prev, validityResponses: { ...prev.validityResponses, [id]: val } }))}
            onNext={() => handleNavigate("safety")}
            onBack={() => handleNavigate("narrative")}
          />
        )}

        {state.view === "safety" && (
          <SafetyView
            responses={state.safetyResponses}
            onChange={(id, val) => setState((prev) => ({ ...prev, safetyResponses: { ...prev.safetyResponses, [id]: val }, completedAt: new Date().toISOString() }))}
            onNext={() => handleNavigate("report")}
            onBack={() => handleNavigate("validity")}
          />
        )}

        {state.view === "report" && (
          <ReportView
            state={state}
            onNavigate={handleNavigate}
            onReset={() => setState(defaultState)}
          />
        )}

        {state.view === "coach" && (
          <CoachView
            state={state}
            onNavigate={handleNavigate}
          />
        )}
      </div>
    </main>
  );
}
