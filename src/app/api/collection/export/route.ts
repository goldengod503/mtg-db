import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { collectionCards, cards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const results = await db
    .select({
      collection: collectionCards,
      card: cards,
    })
    .from(collectionCards)
    .innerJoin(cards, eq(collectionCards.card_id, cards.id));

  const headers = [
    "Quantity", "Name", "Finish", "Condition", "Date Added", "Language",
    "Purchase Price", "Tags", "Edition Name", "Edition Code",
    "Multiverse Id", "Scryfall ID", "MTGO ID", "Collector Number",
    "Mana Value", "Colors", "Identities", "Mana cost", "Types",
    "Sub-types", "Super-types", "Rarity", "TCG Price",
    "CM Price", "Scryfall Oracle ID",
  ];

  const rows = results.map(({ collection, card }) => [
    collection.quantity,
    `"${card.name}"`,
    collection.finish,
    collection.condition,
    collection.added_at,
    collection.language,
    collection.purchase_price ?? "",
    collection.tags ?? "",
    `"${card.set_name}"`,
    card.set_code,
    card.multiverse_id ?? "",
    card.id,
    card.mtgo_id ?? "",
    card.collector_number,
    card.cmc ?? "",
    card.colors ?? "",
    card.color_identity ?? "",
    card.mana_cost ?? "",
    card.types ?? "",
    card.subtypes ?? "",
    card.supertypes ?? "",
    card.rarity,
    card.price_tcg_player ?? "",
    card.price_card_market ?? "",
    card.oracle_id ?? "",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="collection-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
