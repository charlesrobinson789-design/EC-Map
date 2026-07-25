import { NextResponse } from "next/server";
import { query } from "@server/db";

export async function GET() {
  try {
    await query("SELECT 1");
    return NextResponse.json({ ok: true, database: "ready" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Database error" }, { status: 500 });
  }
}
