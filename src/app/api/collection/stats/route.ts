import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const totalCards = sqlite
    .prepare(
      `SELECT COALESCE(SUM(cc.quantity), 0) as total
       FROM collection_cards cc`
    )
    .get() as { total: number };

  const uniqueCards = sqlite
    .prepare(`SELECT COUNT(*) as total FROM collection_cards`)
    .get() as { total: number };

  const totalValue = sqlite
    .prepare(
      `SELECT COALESCE(SUM(cc.quantity * COALESCE(c.price_tcg_player, 0)), 0) as value
       FROM collection_cards cc
       JOIN cards c ON cc.card_id = c.id`
    )
    .get() as { value: number };

  const colorBreakdown = sqlite
    .prepare(
      `SELECT c.colors, SUM(cc.quantity) as count
       FROM collection_cards cc
       JOIN cards c ON cc.card_id = c.id
       WHERE c.colors IS NOT NULL AND c.colors != ''
       GROUP BY c.colors
       ORDER BY count DESC`
    )
    .all() as { colors: string; count: number }[];

  const rarityBreakdown = sqlite
    .prepare(
      `SELECT c.rarity, SUM(cc.quantity) as count
       FROM collection_cards cc
       JOIN cards c ON cc.card_id = c.id
       GROUP BY c.rarity
       ORDER BY count DESC`
    )
    .all() as { rarity: string; count: number }[];

  const typeBreakdown = sqlite
    .prepare(
      `SELECT c.types, SUM(cc.quantity) as count
       FROM collection_cards cc
       JOIN cards c ON cc.card_id = c.id
       WHERE c.types IS NOT NULL
       GROUP BY c.types
       ORDER BY count DESC
       LIMIT 10`
    )
    .all() as { types: string; count: number }[];

  const recentAdditions = sqlite
    .prepare(
      `SELECT cc.*, c.name, c.image_uri_small, c.set_name
       FROM collection_cards cc
       JOIN cards c ON cc.card_id = c.id
       ORDER BY cc.added_at DESC
       LIMIT 10`
    )
    .all();

  return NextResponse.json({
    totalCards: totalCards.total,
    uniqueCards: uniqueCards.total,
    estimatedValue: Math.round(totalValue.value * 100) / 100,
    colorBreakdown,
    rarityBreakdown,
    typeBreakdown,
    recentAdditions,
  });
}
