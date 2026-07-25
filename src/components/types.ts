import { type AssessmentSession, type MockPatient } from "@/types";

export type ViewMode =
  | "intro"
  | "context"
  | "sections"
  | "assessment"
  | "clarifiers"
  | "narrative"
  | "validity"
  | "safety"
  | "report"
  | "coach";

export interface AppState {
  assessmentProfileVersion: string;
  view: ViewMode;
  itemIndex: number;
  activeSectionId: string | null;
  lastCompletedSectionId: string | null;
  contextResponses: Record<string, string>;
  scoredResponses: Record<string, number>;
  adaptiveResponses: Record<string, string | string[]>;
  narrativeResponses: Record<string, string>;
  validityResponses: Record<string, number>;
  safetyResponses: Record<string, number>;
  patientId: string;
  mockDataAcknowledged: boolean;
  mockDataAcknowledgedAt: string;
  savedAssessmentId: string;
  completedAt: string | null;
}

export interface ServerState {
  loading: boolean;
  available: boolean;
  message: string;
  patients: MockPatient[];
  assessments: any[];
  saveStatus: string;
}
