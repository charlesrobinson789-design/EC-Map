import { type NextRequest, NextResponse } from "next/server";
import { deleteAssessment, getAssessment } from "@server/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assessment = await getAssessment(id);
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }
    return NextResponse.json(assessment);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      { error: statusCode === 500 ? "Server error" : error.message },
      { status: statusCode }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deleted = await deleteAssessment(id);
    if (!deleted) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return NextResponse.json(
      { error: statusCode === 500 ? "Server error" : error.message },
      { status: statusCode }
    );
  }
}
