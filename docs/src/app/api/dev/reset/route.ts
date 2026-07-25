import { NextResponse } from "next/server";
import { resetAssessments } from "@server/db";

export async function POST() {
  if (process.env.ENABLE_DEV_RESET !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    await resetAssessments();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
