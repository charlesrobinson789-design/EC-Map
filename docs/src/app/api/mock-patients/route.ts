import { NextResponse } from "next/server";
import { listMockPatients } from "@server/db";

export async function GET() {
  try {
    const patients = await listMockPatients();
    return NextResponse.json({ patients });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
