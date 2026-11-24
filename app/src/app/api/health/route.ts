import { NextResponse } from "next/server";
import { sql } from "@/db";

export async function GET() {
  try {
    const [row] = await sql`select now() as now, version() as version`;
    return NextResponse.json({ ok: true, db: row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
