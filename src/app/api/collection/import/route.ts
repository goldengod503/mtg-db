import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collectionCards, cards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface ArchidektRow {
  Quantity: string;
  Name: string;
  Finish: string;
  Condition: string;
  "Date Added": string;
  Language: string;
  "Purchase Price": string;
  Tags: string;
  "Edition Name": string;
  "Edition Code": string;
  "Multiverse Id": string;
  "Scryfall ID": string;
  "MTGO ID": string;
  "Collector Number": string;
  "Mana Value": string;
  Colors: string;
  Identities: string;
  "Mana cost": string;
  Types: string;
  "Sub-types": string;
  "Super-types": string;
  Rarity: string;
  "CK Price": string;
  "CK Foil Price": string;
  "TCG Price": string;
  "TCG Foil Price": string;
  "CM Price": string;
  "Scryfall Oracle ID": string;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return rows;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCSV(text) as unknown as ArchidektRow[];

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const scryfallId = row["Scryfall ID"]?.trim();
    if (!scryfallId) {
      skipped++;
      continue;
    }

    // Check if card exists in our cards table
    const [card] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, scryfallId))
      .limit(1);

    if (!card) {
      skipped++;
      continue;
    }

    const quantity = parseInt(row.Quantity) || 1;
    const finish = row.Finish || "Normal";
    const condition = row.Condition || "NM";
    const language = row.Language || "EN";
    const purchasePrice = row["Purchase Price"]
      ? parseFloat(row["Purchase Price"])
      : null;
    const tags = row.Tags || null;
    const addedAt = row["Date Added"]
      ? new Date(row["Date Added"]).toISOString()
      : new Date().toISOString();

    // Check for existing entry
    const [existing] = await db
      .select()
      .from(collectionCards)
      .where(
        and(
          eq(collectionCards.card_id, scryfallId),
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
    } else {
      await db.insert(collectionCards).values({
        card_id: scryfallId,
        quantity,
        finish,
        condition,
        language,
        purchase_price: purchasePrice,
        tags,
        added_at: addedAt,
      });
    }

    imported++;
  }

  return NextResponse.json({
    imported,
    skipped,
    total: rows.length,
  });
}
