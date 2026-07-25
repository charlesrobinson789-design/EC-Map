import { type NextRequest, NextResponse } from "next/server";
import { listAssessments, saveAssessment } from "@server/db";

export async function GET(request: NextRequest) {
  try {
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;
    const assessments = await listAssessments(limit);
    return NextResponse.json({ assessments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const saved = await saveAssessment(body);
    return NextResponse.json(saved, { status: 201 });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      { error: statusCode === 500 ? "Server error" : error.message },
      { status: statusCode }
    );
  }
}
