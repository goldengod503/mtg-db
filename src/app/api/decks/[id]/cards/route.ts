import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deckCards, decks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deckId = parseInt(params.id);
  const body = await request.json();
  const { card_id, quantity = 1, category = "main", custom_tag } = body;

  if (!card_id) {
    return NextResponse.json({ error: "card_id is required" }, { status: 400 });
  }

  // Check for existing entry in same category
  const [existing] = await db
    .select()
    .from(deckCards)
    .where(
      and(
        eq(deckCards.deck_id, deckId),
        eq(deckCards.card_id, card_id),
        eq(deckCards.category, category)
      )
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(deckCards)
      .set({ quantity: existing.quantity + quantity })
      .where(eq(deckCards.id, existing.id))
      .returning();

    await db
      .update(decks)
      .set({ updated_at: new Date().toISOString() })
      .where(eq(decks.id, deckId));

    return NextResponse.json(updated);
  }

  const [result] = await db
    .insert(deckCards)
    .values({
      deck_id: deckId,
      card_id,
      quantity,
      category,
      custom_tag: custom_tag || null,
    })
    .returning();

  await db
    .update(decks)
    .set({ updated_at: new Date().toISOString() })
    .where(eq(decks.id, deckId));

  return NextResponse.json(result, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deckId = parseInt(params.id);
  const { searchParams } = request.nextUrl;
  const cardEntryId = searchParams.get("entryId");

  if (cardEntryId) {
    await db
      .delete(deckCards)
      .where(
        and(
          eq(deckCards.id, parseInt(cardEntryId)),
          eq(deckCards.deck_id, deckId)
        )
      );
  }

  await db
    .update(decks)
    .set({ updated_at: new Date().toISOString() })
    .where(eq(decks.id, deckId));

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const deckId = parseInt(params.id);
  const body = await request.json();
  const { entryId, ...updates } = body;

  if (!entryId) {
    return NextResponse.json({ error: "entryId is required" }, { status: 400 });
  }

  const [updated] = await db
    .update(deckCards)
    .set(updates)
    .where(
      and(eq(deckCards.id, entryId), eq(deckCards.deck_id, deckId))
    )
    .returning();

  await db
    .update(decks)
    .set({ updated_at: new Date().toISOString() })
    .where(eq(decks.id, deckId));

  return NextResponse.json(updated);
}
