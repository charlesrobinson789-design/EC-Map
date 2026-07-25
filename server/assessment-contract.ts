import { MOCK_PATIENTS } from "./mock-patients";

const VALID_STATUSES = new Set(["in_progress", "completed"]);
const MOCK_PATIENT_IDS = new Set(MOCK_PATIENTS.map((patient) => patient.id));

export class ValidationError extends Error {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}

function isObject(value: any): boolean {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value: any, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

function requireMockPatientId(value: any): string {
  const patientId = requiredString(value, "patientId");
  if (!MOCK_PATIENT_IDS.has(patientId)) {
    throw new ValidationError("patientId must be a seeded mock patient id");
  }
  return patientId;
}

function requireMockDataAcknowledgement(value: any) {
  if (!isObject(value) || value.mockDataOnly !== true || value.scope !== "prototype-preview") {
    throw new ValidationError("Mock data acknowledgement is required before saving");
  }
  return {
    mockDataOnly: true,
    scope: "prototype-preview",
    acknowledgedAt: typeof value.acknowledgedAt === "string" ? value.acknowledgedAt : null
  };
}

function redactSessionForPersistence(session: any) {
  const { safetyResponses, ...safeSession } = session;
  return {
    ...safeSession,
    privateSafety: {
      redacted: true,
      answeredCount: isObject(safetyResponses) ? Object.keys(safetyResponses).length : 0
    }
  };
}

function redactReportForPersistence(report: any) {
  if (!isObject(report)) return {};
  if (!isObject(report.results)) return report;
  const { safetyFlags, ...safeResults } = report.results;
  return {
    ...report,
    results: {
      ...safeResults,
      privateSafety: {
        redacted: true,
        flagCount: Array.isArray(safetyFlags) ? safetyFlags.length : 0
      }
    }
  };
}

export function normalizeAssessmentPayload(payload: any = {}) {
  if (!isObject(payload)) {
    throw new ValidationError("Assessment payload must be an object");
  }

  const patientId = requireMockPatientId(payload.patientId);
  const status = VALID_STATUSES.has(payload.status) ? payload.status : "in_progress";
  const dataUseAcknowledgement = requireMockDataAcknowledgement(payload.dataUseAcknowledgement);

  if (!isObject(payload.session)) {
    throw new ValidationError("session payload is required");
  }

  return {
    patientId,
    status,
    session: redactSessionForPersistence(payload.session),
    report: redactReportForPersistence(payload.report),
    versions: isObject(payload.versions) ? payload.versions : {},
    dataUseAcknowledgement,
    completedAt: payload.completedAt || payload.session.completedAt || null
  };
}
