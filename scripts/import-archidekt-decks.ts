// Run with: npx tsx scripts/import-archidekt-decks.ts <username>
import { sqlite } from "../src/lib/db";

const USERNAME = process.argv[2] || "goldengod503";
const RATE_LIMIT_MS = 200;
const USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36";

// Archidekt format IDs to names
const FORMAT_MAP: Record<number, string> = {
  1: "standard",
  2: "modern",
  3: "commander",
  4: "legacy",
  5: "vintage",
  6: "pauper",
  7: "frontier",
  8: "future",
  9: "penny",
  10: "1v1",
  11: "duel",
  12: "brawl",
  13: "oathbreaker",
  14: "pioneer",
  15: "historic",
  16: "gladiator",
  17: "premodern",
  18: "oldschool",
  19: "explorer",
  20: "alchemy",
  21: "historicbrawl",
  22: "paupercommander",
  23: "predh",
  24: "timeless",
  25: "canlander",
};

interface ArchidektDeckCard {
  id: number;
  categories: string[];
  companion: boolean;
  quantity: number;
  modifier: string;
  card: {
    uid: string; // Scryfall ID
    displayName?: string;
    oracleCard: {
      name: string;
      types: string[];
    };
  };
}

interface ArchidektDeck {
  id: number;
  name: string;
  deckFormat: number;
  description: string;
  featured: string;
  cards: ArchidektDeckCard[];
  commander?: { uid: string };
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchDeckIds(): Promise<{ id: number; name: string }[]> {
  // Scrape the user profile page to get deck IDs
  const res = await fetch(`https://archidekt.com/u/${USERNAME}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  const html = await res.text();

  // Extract deck IDs and names from the page
  const deckPattern = /\/decks\/(\d+)/g;
  const ids = new Set<number>();
  let match;
  while ((match = deckPattern.exec(html)) !== null) {
    ids.add(parseInt(match[1]));
  }

  return Array.from(ids).map((id) => ({ id, name: "" }));
}

async function fetchDeck(id: number): Promise<ArchidektDeck> {
  const res = await fetch(`https://archidekt.com/api/decks/${id}/`, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch deck ${id}: ${res.status}`);
  return res.json();
}

function mapCategory(categories: string[]): string {
  const lower = categories.map((c) => c.toLowerCase());
  if (lower.includes("maybeboard")) return "maybeboard";
  if (lower.includes("sideboard")) return "sideboard";
  if (lower.includes("companion")) return "companion";
  return "main";
}

function importDeck(deck: ArchidektDeck) {
  const format = FORMAT_MAP[deck.deckFormat] || null;
  const now = new Date().toISOString();

  // Find commander card (look for "Commander" category)
  let commanderId: string | null = null;
  for (const card of deck.cards) {
    if (card.categories.some((c) => c.toLowerCase() === "commander")) {
      // Check if this scryfall ID exists in our DB
      const exists = sqlite
        .prepare("SELECT id FROM cards WHERE id = ?")
        .get(card.card.uid) as { id: string } | undefined;
      if (exists) {
        commanderId = card.card.uid;
      }
      break;
    }
  }

  // Extract description text from Archidekt's delta format
  let description = "";
  if (deck.description) {
    try {
      const delta = JSON.parse(deck.description);
      if (delta.ops) {
        description = delta.ops
          .map((op: { insert?: string }) => op.insert || "")
          .join("")
          .trim();
      }
    } catch {
      description = deck.description;
    }
  }

  // Insert deck
  const insertDeck = sqlite.prepare(`
    INSERT INTO decks (name, format, description, commander_id, cover_image, created_at, updated_at)
    VALUES (@name, @format, @description, @commander_id, @cover_image, @created_at, @updated_at)
  `);

  const result = insertDeck.run({
    name: deck.name,
    format,
    description: description || null,
    commander_id: commanderId,
    cover_image: deck.featured || null,
    created_at: now,
    updated_at: now,
  });

  const deckId = result.lastInsertRowid;

  // Insert cards
  const insertCard = sqlite.prepare(`
    INSERT INTO deck_cards (deck_id, card_id, quantity, category, custom_tag)
    VALUES (@deck_id, @card_id, @quantity, @category, @custom_tag)
  `);

  let added = 0;
  let skipped = 0;

  const insertCards = sqlite.transaction((cards: ArchidektDeckCard[]) => {
    for (const entry of cards) {
      const scryfallId = entry.card.uid;
      if (!scryfallId) {
        skipped++;
        continue;
      }

      // Check card exists in our DB
      const exists = sqlite
        .prepare("SELECT id FROM cards WHERE id = ?")
        .get(scryfallId);
      if (!exists) {
        skipped++;
        continue;
      }

      const category = mapCategory(entry.categories);
      // Use the first non-standard category as custom_tag
      const standardCats = [
        "maybeboard", "sideboard", "companion", "commander",
      ];
      const customTags = entry.categories.filter(
        (c) => !standardCats.includes(c.toLowerCase())
      );

      insertCard.run({
        deck_id: deckId,
        card_id: scryfallId,
        quantity: entry.quantity,
        category,
        custom_tag: customTags.length > 0 ? customTags.join(",") : null,
      });
      added++;
    }
  });

  insertCards(deck.cards);

  return { added, skipped };
}

async function main() {
  console.log(`Fetching deck list for user: ${USERNAME}`);

  // Known deck IDs from user profile
  const deckIds = await fetchDeckIds();
  console.log(`Found ${deckIds.length} decks`);

  let totalImported = 0;
  let totalSkipped = 0;

  for (let i = 0; i < deckIds.length; i++) {
    const { id } = deckIds[i];
    try {
      await sleep(RATE_LIMIT_MS);
      const deck = await fetchDeck(id);
      console.log(
        `[${i + 1}/${deckIds.length}] ${deck.name} (${deck.cards.length} cards)...`
      );

      const { added, skipped } = importDeck(deck);
      totalImported += added;
      totalSkipped += skipped;
      console.log(`  -> ${added} cards added, ${skipped} skipped`);
    } catch (err) {
      console.error(`  -> Failed to import deck ${id}:`, err);
    }
  }

  console.log(`\nDone! Imported ${totalImported} cards across ${deckIds.length} decks (${totalSkipped} skipped)`);

  const deckCount = sqlite
    .prepare("SELECT COUNT(*) as count FROM decks")
    .get() as { count: number };
  console.log(`Total decks in database: ${deckCount.count}`);
}

main().catch(console.error);
