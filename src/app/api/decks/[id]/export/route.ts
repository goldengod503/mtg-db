import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decks, deckCards, cards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  const format = request.nextUrl.searchParams.get("format") || "text";

  const [deck] = await db.select().from(decks).where(eq(decks.id, id)).limit(1);
  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  const deckCardList = await db
    .select({ deckCard: deckCards, card: cards })
    .from(deckCards)
    .innerJoin(cards, eq(deckCards.card_id, cards.id))
    .where(eq(deckCards.deck_id, id));

  const mainCards = deckCardList.filter((c) => c.deckCard.category === "main");
  const sideboardCards = deckCardList.filter((c) => c.deckCard.category === "sideboard");
  const maybeboardCards = deckCardList.filter((c) => c.deckCard.category === "maybeboard");

  if (format === "csv") {
    const headers = ["Quantity", "Name", "Category", "Set Code", "Collector Number"];
    const rows = deckCardList.map(({ deckCard, card }) =>
      [deckCard.quantity, `"${card.name}"`, deckCard.category, card.set_code, card.collector_number].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${deck.name}.csv"`,
      },
    });
  }

  // MTGO format
  if (format === "mtgo") {
    let text = "";
    for (const { deckCard, card } of mainCards) {
      text += `${deckCard.quantity} ${card.name}\n`;
    }
    if (sideboardCards.length > 0) {
      text += "\nSideboard\n";
      for (const { deckCard, card } of sideboardCards) {
        text += `${deckCard.quantity} ${card.name}\n`;
      }
    }

    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="${deck.name}.txt"`,
      },
    });
  }

  // Default text format
  let text = `// ${deck.name}\n`;
  if (deck.format) text += `// Format: ${deck.format}\n`;
  text += "\n";

  if (deck.commander_id) {
    const commander = deckCardList.find((c) => c.card.id === deck.commander_id);
    if (commander) text += `// Commander\n1 ${commander.card.name}\n\n`;
  }

  text += "// Main Deck\n";
  for (const { deckCard, card } of mainCards) {
    text += `${deckCard.quantity} ${card.name}\n`;
  }

  if (sideboardCards.length > 0) {
    text += "\n// Sideboard\n";
    for (const { deckCard, card } of sideboardCards) {
      text += `${deckCard.quantity} ${card.name}\n`;
    }
  }

  if (maybeboardCards.length > 0) {
    text += "\n// Maybeboard\n";
    for (const { deckCard, card } of maybeboardCards) {
      text += `${deckCard.quantity} ${card.name}\n`;
    }
  }

  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="${deck.name}.txt"`,
    },
  });
}
