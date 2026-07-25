import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import { normalizeAssessmentPayload } from "./assessment-contract";
import { MOCK_PATIENTS } from "./mock-patients";

const { Pool } = pg;
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(serverDir, "schema.sql");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false
});

function mapPatient(row: any) {
  return {
    id: row.id,
    displayName: row.display_name,
    ageRange: row.age_range,
    menopauseStage: row.menopause_stage,
    adhdContext: row.adhd_context,
    profileNotes: row.profile_notes,
    createdAt: row.created_at
  };
}

function mapAssessment(row: any) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.display_name,
    status: row.status,
    session: row.session_payload,
    report: row.report_payload,
    versions: row.versions,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

let dbInitPromise: Promise<void> | null = null;

export async function ensureDbInitialized() {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        const schema = await readFile(schemaPath, "utf8");
        await query(schema);
        await seedMockPatients();
      } catch (err) {
        dbInitPromise = null;
        throw err;
      }
    })();
  }
  return dbInitPromise;
}

export async function initDatabase() {
  return ensureDbInitialized();
}

export async function seedMockPatients() {
  for (const patient of MOCK_PATIENTS) {
    await query(
      `
        INSERT INTO mock_patients (
          id, display_name, age_range, menopause_stage, adhd_context, profile_notes
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          age_range = EXCLUDED.age_range,
          menopause_stage = EXCLUDED.menopause_stage,
          adhd_context = EXCLUDED.adhd_context,
          profile_notes = EXCLUDED.profile_notes
      `,
      [
        patient.id,
        patient.displayName,
        patient.ageRange,
        patient.menopauseStage,
        patient.adhdContext,
        patient.profileNotes
      ]
    );
  }
}

export async function listMockPatients() {
  await ensureDbInitialized();
  const result = await query(
    `
      SELECT id, display_name, age_range, menopause_stage, adhd_context, profile_notes, created_at
      FROM mock_patients
      ORDER BY display_name ASC
    `
  );
  return result.rows.map(mapPatient);
}

export async function saveAssessment(rawPayload: any) {
  await ensureDbInitialized();
  const payload = normalizeAssessmentPayload(rawPayload);
  const id = randomUUID();
  const result = await query(
    `
      INSERT INTO assessment_sessions (
        id, patient_id, status, session_payload, report_payload, versions, completed_at
      )
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7)
      RETURNING *
    `,
    [
      id,
      payload.patientId,
      payload.status,
      JSON.stringify({
        ...payload.session,
        dataUseAcknowledgement: payload.dataUseAcknowledgement
      }),
      JSON.stringify(payload.report),
      JSON.stringify(payload.versions),
      payload.completedAt
    ]
  );
  return mapAssessment(result.rows[0]);
}

export async function listAssessments(limit = 25) {
  await ensureDbInitialized();
  const boundedLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const result = await query(
    `
      SELECT assessment_sessions.*, mock_patients.display_name
      FROM assessment_sessions
      LEFT JOIN mock_patients ON mock_patients.id = assessment_sessions.patient_id
      ORDER BY assessment_sessions.created_at DESC
      LIMIT $1
    `,
    [boundedLimit]
  );
  return result.rows.map(mapAssessment);
}

export async function getAssessment(id: string) {
  await ensureDbInitialized();
  const result = await query(
    `
      SELECT assessment_sessions.*, mock_patients.display_name
      FROM assessment_sessions
      LEFT JOIN mock_patients ON mock_patients.id = assessment_sessions.patient_id
      WHERE assessment_sessions.id = $1
    `,
    [id]
  );
  return result.rows[0] ? mapAssessment(result.rows[0]) : null;
}

export async function deleteAssessment(id: string) {
  await ensureDbInitialized();
  const result = await query(
    `
      DELETE FROM assessment_sessions
      WHERE id = $1
      RETURNING id
    `,
    [id]
  );
  return Boolean(result.rows[0]);
}

export async function resetAssessments() {
  await ensureDbInitialized();
  await query("DELETE FROM assessment_sessions");
  await seedMockPatients();
}
