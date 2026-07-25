export interface EvidenceSource {
  id: string;
  title: string;
  url: string;
  type: string;
  note: string;
}

export interface ContextResponses {
  role_type?: string;
  meeting_load?: string;
  sleep_stability?: string;
  lifelong_attention_pattern?: string;
  setting_spread?: string;
  timeline?: string;
  transition_context?: string;
  [key: string]: string | undefined;
}

export type ScoredResponses = Record<string, number>;

export type SafetyResponses = Record<string, number>;

export interface DifferentialLens {
  status: string;
  body: string;
  verify: string;
  caveat: string;
  headline?: string;
  summary?: string;
  lifelongSignals?: string[];
  currentAmplifiers?: string[];
  [key: string]: any;
}

export interface CoachPhrase {
  text: string;
  claimType: string;
}

export interface CoachPacket {
  versions: Record<string, string>;
  solGovernance: Record<string, any>;
  sessionReadiness: {
    status: string;
    items: Array<{ label: string; value: number; total: number }>;
    confidence: string;
    caveats: CoachPhrase[];
  };
  clientContext: {
    roleType?: string;
    meetingLoad?: string;
    sleepStability?: string;
    lifelongAttentionPattern?: string;
    settingSpread?: string;
    timeline?: string;
    compensationBurden?: CoachPhrase;
    [key: string]: any;
  };
  capacitySignature: Record<string, any>;
  differentialLens: DifferentialLens;
  coachPriorities: CoachPhrase[];
  verificationQuestions: CoachPhrase[];
  referralConsiderations: CoachPhrase[];
  evidenceThemes: string[];
  claimCaveats: CoachPhrase[];
}

export interface MockPatient {
  id: string;
  displayName: string;
  sexProfile: string;
  ageRange: string;
  menopauseStage: string;
  adhdContext: string;
  profileNotes: string;
}

export interface ClientReport {
  generatedAt?: string;
  summary: string;
  results: Record<string, any>;
  coachReview?: CoachPacket;
  [key: string]: any;
}

export interface AssessmentSession {
  patientId?: string;
  assessmentProfileVersion?: string;
  view?: string;
  itemIndex?: number;
  activeSectionId?: string | null;
  lastCompletedSectionId?: string | null;
  contextResponses?: ContextResponses;
  scoredResponses?: ScoredResponses;
  adaptiveResponses?: Record<string, string | string[]>;
  narrativeResponses?: Record<string, string>;
  validityResponses?: Record<string, number>;
  safetyResponses?: SafetyResponses;
  privateSafety?: {
    redacted?: boolean;
    answeredCount?: number;
    [key: string]: any;
  };
  completedAt?: string | null;
  mockDataAcknowledged?: boolean;
  mockDataAcknowledgedAt?: string | null;
  savedAssessmentId?: string;
  [key: string]: any;
}

// Additional domain helper interfaces
export interface SpineItem {
  id: string;
  kernelId: string;
  domain: string;
  kernel: string;
  function: string;
  heuristic: string;
  prompt: string;
  enterprisePrompt: string | null;
  privatePrompt: string | null;
  routing: string;
  evidenceThemes: string[];
}

export interface AssessmentSection {
  id: string;
  title: string;
  shortTitle?: string;
  subtitle?: string;
  purpose?: string;
  itemIds?: string[];
  kernelIds?: string[];
  voiceGoal?: string;
  status?: string;
  audience?: string;
  pauseReason?: string;
  whyThisMatters?: string;
  howWeScoreIt?: string;
}

export interface AdaptiveClarifier {
  id: string;
  title: string;
  prompt: string;
  options: string[];
  kernelId?: string | string[];
  trigger?: string | {
    kernelId: string;
    anyScoreAtOrAbove?: number;
    minCostScore?: number;
  };
  multi?: boolean;
}

export interface ContextPrompt {
  id: string;
  label: string;
  type?: string;
  prompt?: string;
  options?: string[];
}

export interface ResponseScaleOption {
  value: number;
  label: string;
}

export interface NarrativePrompt {
  id: string;
  label: string;
}

export interface SafetyItem {
  id: string;
  prompt: string;
  flag: string;
}

export interface KernelScoreItem {
  id: string;
  prompt: string;
  value: number;
}

export interface KernelScore {
  kernelId: string;
  kernel: string;
  domain: string;
  total: number;
  average: number;
  status: string;
  signal: number;
  cost: number;
  discriminator: number;
  modifiability: number;
  narrative: string;
  items?: KernelScoreItem[];
  evidenceThemes: string[];
}

export interface DriverConfidence {
  label?: string;
  score?: number;
  cognitionLed: number;
  chemistryLed: number;
  mixedPattern: boolean;
  interpretation: string;
}

export interface SafetyFlag {
  id: string;
  flag: string;
  value: number;
  prompt: string;
}

export interface ScoringResults {
  kernelScores: KernelScore[];
  topCognitionBottlenecks: KernelScore[];
  topChemistryAmplifiers: KernelScore[];
  topModifiabilityLevers: KernelScore[];
  driverConfidence: DriverConfidence;
  safetyFlags: SafetyFlag[];
  completion: {
    answered: number;
    total: number;
  };
}

export interface ReportCardItem {
  kernelId?: string;
  kernel: string;
  domain?: string;
  status: string;
  total: number;
  signal?: number;
  cost?: number;
  modifiability?: number;
  narrative?: string;
  items?: KernelScoreItem[];
  evidenceThemes?: string[];
}

export interface ReportCard {
  id: string;
  title: string;
  tone: string;
  items: ReportCardItem[];
  evidenceThemes: string[];
}
