import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decks, deckCards, cards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);

  const [deck] = await db.select().from(decks).where(eq(decks.id, id)).limit(1);

  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  const deckCardList = await db
    .select({
      deckCard: deckCards,
      card: cards,
    })
    .from(deckCards)
    .innerJoin(cards, eq(deckCards.card_id, cards.id))
    .where(eq(deckCards.deck_id, id));

  return NextResponse.json({
    ...deck,
    cards: deckCardList,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  const body = await request.json();

  const [existing] = await db
    .select()
    .from(decks)
    .where(eq(decks.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(decks)
    .set({ ...body, updated_at: new Date().toISOString() })
    .where(eq(decks.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  await db.delete(decks).where(eq(decks.id, id));
  return NextResponse.json({ success: true });
}
