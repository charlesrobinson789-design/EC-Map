import express, { type Request, type Response, type NextFunction } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  deleteAssessment,
  getAssessment,
  initDatabase,
  listAssessments,
  listMockPatients,
  query,
  resetAssessments,
  saveAssessment
} from "./db";

const port = Number(process.env.PORT ?? 3000);
const app = express();
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "connect-src 'self'",
  "img-src 'self' data:",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'"
].join("; ");

app.use((_request: Request, response: Response, next: NextFunction) => {
  response.setHeader("Content-Security-Policy", contentSecurityPolicy);
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("Cache-Control", "no-store");
  next();
});

app.use(express.json({ limit: "2mb" }));

async function initWithRetry(): Promise<void> {
  const attempts = Number(process.env.DB_INIT_ATTEMPTS ?? 20);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await initDatabase();
      return;
    } catch (error) {
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }
}

app.get("/api/health", async (_request: Request, response: Response, next: NextFunction) => {
  try {
    await query("SELECT 1");
    response.json({ ok: true, database: "ready" });
  } catch (error) {
    next(error);
  }
});

app.get("/api/mock-patients", async (_request: Request, response: Response, next: NextFunction) => {
  try {
    response.json({ patients: await listMockPatients() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/assessments", async (request: Request, response: Response, next: NextFunction) => {
  try {
    response.json({ assessments: await listAssessments(request.query.limit ? Number(request.query.limit) : undefined) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/assessments", async (request: Request, response: Response, next: NextFunction) => {
  try {
    const saved = await saveAssessment(request.body);
    response.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});

app.get("/api/assessments/:id", async (request: Request, response: Response, next: NextFunction) => {
  try {
    const assessment = await getAssessment(String(request.params.id));
    if (!assessment) {
      response.status(404).json({ error: "Assessment not found" });
      return;
    }
    response.json(assessment);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/assessments/:id", async (request: Request, response: Response, next: NextFunction) => {
  try {
    const deleted = await deleteAssessment(String(request.params.id));
    if (!deleted) {
      response.status(404).json({ error: "Assessment not found" });
      return;
    }
    response.json({ ok: true, id: String(request.params.id) });
  } catch (error) {
    next(error);
  }
});

if (process.env.ENABLE_DEV_RESET === "true") {
  app.post("/api/dev/reset", async (_request: Request, response: Response, next: NextFunction) => {
    try {
      await resetAssessments();
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });
}

app.use(express.static(rootDir));

app.get(/.*/, (_request: Request, response: Response) => {
  response.sendFile(path.join(rootDir, "index.html"));
});

app.use((error: any, _request: Request, response: Response, _next: NextFunction) => {
  const statusCode = error.statusCode || 500;
  response.status(statusCode).json({
    error: statusCode === 500 ? "Server error" : error.message
  });
});

await initWithRetry();

app.listen(port, () => {
  console.log(`EC Map app listening on http://localhost:${port}`);
});
