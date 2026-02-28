import { NextResponse } from "next/server";
import { runBulkImport } from "@/lib/scryfall/bulk-import";

export async function POST() {
  try {
    await runBulkImport();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
