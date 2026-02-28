import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decks } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const allDecks = await db
    .select()
    .from(decks)
    .orderBy(desc(decks.updated_at));

  return NextResponse.json(allDecks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, format, description, commander_id, cover_image } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const [deck] = await db
    .insert(decks)
    .values({
      name,
      format: format || null,
      description: description || null,
      commander_id: commander_id || null,
      cover_image: cover_image || null,
      created_at: now,
      updated_at: now,
    })
    .returning();

  return NextResponse.json(deck, { status: 201 });
}
