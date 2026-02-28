import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCardById as scryfallGetCard } from "@/lib/scryfall/api";
import { scryfallToDbCard } from "@/lib/scryfall/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Try local DB first
  const [card] = await db.select().from(cards).where(eq(cards.id, id)).limit(1);

  if (card) {
    return NextResponse.json(card);
  }

  // Fallback to Scryfall API
  try {
    const scryfallCard = await scryfallGetCard(id);
    const dbCard = scryfallToDbCard(scryfallCard);
    await db.insert(cards).values(dbCard).onConflictDoUpdate({
      target: cards.id,
      set: dbCard,
    });
    return NextResponse.json(dbCard);
  } catch {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
}
