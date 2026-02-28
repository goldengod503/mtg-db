import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collectionCards, cards } from "@/lib/db/schema";
import { eq, sql, and, like } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q");
  const colors = searchParams.get("colors");
  const set = searchParams.get("set");
  const rarity = searchParams.get("rarity");
  const type = searchParams.get("type");
  const sort = searchParams.get("sort") || "added_at";
  const order = searchParams.get("order") === "asc" ? "ASC" : "DESC";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "40"), 100);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (q) conditions.push(like(cards.name, `%${q}%`));
  if (set) conditions.push(eq(cards.set_code, set));
  if (rarity) conditions.push(eq(cards.rarity, rarity));
  if (type) conditions.push(like(cards.types, `%${type}%`));
  if (colors) {
    for (const color of colors.split(",")) {
      conditions.push(like(cards.colors, `%${color}%`));
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(collectionCards)
    .innerJoin(cards, eq(collectionCards.card_id, cards.id))
    .where(where);

  const sortMap: Record<string, string> = {
    name: "cards.name",
    cmc: "cards.cmc",
    price: "cards.price_tcg_player",
    added_at: "collection_cards.added_at",
    quantity: "collection_cards.quantity",
  };
  const sortCol = sortMap[sort] || "collection_cards.added_at";

  const results = await db
    .select({
      collection: collectionCards,
      card: cards,
    })
    .from(collectionCards)
    .innerJoin(cards, eq(collectionCards.card_id, cards.id))
    .where(where)
    .orderBy(sql.raw(`${sortCol} ${order}`))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    items: results,
    total: countResult.count,
    page,
    totalPages: Math.ceil(countResult.count / limit),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { card_id, quantity = 1, finish = "Normal", condition = "NM", language = "EN", purchase_price, tags, notes } = body;

  if (!card_id) {
    return NextResponse.json({ error: "card_id is required" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(collectionCards)
    .where(
      and(
        eq(collectionCards.card_id, card_id),
        eq(collectionCards.finish, finish),
        eq(collectionCards.condition, condition)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(collectionCards)
      .set({ quantity: existing.quantity + quantity })
      .where(eq(collectionCards.id, existing.id));

    return NextResponse.json({ ...existing, quantity: existing.quantity + quantity });
  }

  const [result] = await db
    .insert(collectionCards)
    .values({
      card_id,
      quantity,
      finish,
      condition,
      language,
      purchase_price,
      tags,
      notes,
      added_at: new Date().toISOString(),
    })
    .returning();

  return NextResponse.json(result, { status: 201 });
}
