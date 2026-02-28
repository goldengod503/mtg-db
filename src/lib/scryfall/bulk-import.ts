import fs from "fs";
import path from "path";
import { sqlite } from "../db";
import { ScryfallCard, ScryfallBulkDataInfo, scryfallToDbCard } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const BULK_DIR = path.join(DATA_DIR, "bulk");
const BATCH_SIZE = 1000;

async function getBulkDataUrl(): Promise<string> {
  const res = await fetch("https://api.scryfall.com/bulk-data");
  if (!res.ok) throw new Error("Failed to fetch bulk data catalog");
  const data = await res.json();
  const defaultCards = data.data.find(
    (d: ScryfallBulkDataInfo) => d.type === "default_cards"
  );
  if (!defaultCards) throw new Error("default_cards bulk data not found");
  return defaultCards.download_uri;
}

async function downloadBulkData(url: string): Promise<string> {
  if (!fs.existsSync(BULK_DIR)) {
    fs.mkdirSync(BULK_DIR, { recursive: true });
  }
  const filePath = path.join(BULK_DIR, "default-cards.json");

  console.log("Downloading Scryfall bulk data...");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  console.log(`Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);

  return filePath;
}

function createTables() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      oracle_id TEXT,
      name TEXT NOT NULL,
      mana_cost TEXT,
      cmc REAL,
      oracle_text TEXT,
      types TEXT,
      subtypes TEXT,
      supertypes TEXT,
      type_line TEXT,
      colors TEXT,
      color_identity TEXT,
      set_code TEXT,
      set_name TEXT,
      collector_number TEXT,
      rarity TEXT,
      image_uri TEXT,
      image_uri_small TEXT,
      multiverse_id INTEGER,
      mtgo_id INTEGER,
      price_card_kingdom REAL,
      price_tcg_player REAL,
      price_star_city REAL,
      price_card_hoarder REAL,
      price_card_market REAL,
      legalities TEXT,
      power TEXT,
      toughness TEXT,
      loyalty TEXT,
      keywords TEXT,
      released_at TEXT,
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
    CREATE INDEX IF NOT EXISTS idx_cards_oracle_id ON cards(oracle_id);
    CREATE INDEX IF NOT EXISTS idx_cards_set_code ON cards(set_code);
    CREATE INDEX IF NOT EXISTS idx_cards_colors ON cards(colors);
    CREATE INDEX IF NOT EXISTS idx_cards_type_line ON cards(type_line);
    CREATE INDEX IF NOT EXISTS idx_cards_cmc ON cards(cmc);
    CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);

    CREATE TABLE IF NOT EXISTS collection_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id TEXT NOT NULL REFERENCES cards(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      finish TEXT DEFAULT 'Normal',
      condition TEXT DEFAULT 'NM',
      language TEXT DEFAULT 'EN',
      purchase_price REAL,
      tags TEXT,
      notes TEXT,
      added_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS decks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      format TEXT,
      description TEXT,
      commander_id TEXT REFERENCES cards(id),
      cover_image TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deck_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      card_id TEXT NOT NULL REFERENCES cards(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      category TEXT DEFAULT 'main',
      custom_tag TEXT
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS deck_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE
    );
  `);
}

function createFTS() {
  sqlite.exec(`
    DROP TABLE IF EXISTS cards_fts;
    CREATE VIRTUAL TABLE cards_fts USING fts5(
      name,
      types,
      subtypes,
      supertypes,
      oracle_text,
      content=cards,
      content_rowid=rowid
    );
  `);
}

function rebuildFTS() {
  sqlite.exec(`INSERT INTO cards_fts(cards_fts) VALUES('rebuild')`);
}

function insertCards(cards: ScryfallCard[]) {
  const insertStmt = sqlite.prepare(`
    INSERT OR REPLACE INTO cards (
      id, oracle_id, name, mana_cost, cmc, oracle_text,
      types, subtypes, supertypes, type_line,
      colors, color_identity,
      set_code, set_name, collector_number, rarity,
      image_uri, image_uri_small,
      multiverse_id, mtgo_id,
      price_card_kingdom, price_tcg_player, price_star_city, price_card_hoarder, price_card_market,
      legalities, power, toughness, loyalty, keywords,
      released_at, updated_at
    ) VALUES (
      @id, @oracle_id, @name, @mana_cost, @cmc, @oracle_text,
      @types, @subtypes, @supertypes, @type_line,
      @colors, @color_identity,
      @set_code, @set_name, @collector_number, @rarity,
      @image_uri, @image_uri_small,
      @multiverse_id, @mtgo_id,
      @price_card_kingdom, @price_tcg_player, @price_star_city, @price_card_hoarder, @price_card_market,
      @legalities, @power, @toughness, @loyalty, @keywords,
      @released_at, @updated_at
    )
  `);

  const runBatch = sqlite.transaction((batch: ScryfallCard[]) => {
    for (const card of batch) {
      // Skip tokens, emblems, art series etc. with no oracle_id
      if (!card.oracle_id) continue;
      // Skip digital-only layouts
      if (card.layout === "art_series" || card.layout === "token" || card.layout === "double_faced_token" || card.layout === "emblem") continue;

      const dbCard = scryfallToDbCard(card);
      insertStmt.run(dbCard);
    }
  });

  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE);
    runBatch(batch);
    if (i % 10000 === 0) {
      console.log(`  Inserted ${i}/${cards.length} cards...`);
    }
  }
}

export async function runBulkImport() {
  console.log("Starting Scryfall bulk import...");

  createTables();

  const url = await getBulkDataUrl();
  const filePath = await downloadBulkData(url);

  console.log("Parsing JSON...");
  const raw = fs.readFileSync(filePath, "utf-8");
  const cards: ScryfallCard[] = JSON.parse(raw);
  console.log(`Parsed ${cards.length} cards`);

  console.log("Inserting cards into database...");
  insertCards(cards);

  console.log("Building full-text search index...");
  createFTS();
  rebuildFTS();

  const count = sqlite.prepare("SELECT COUNT(*) as count FROM cards").get() as { count: number };
  console.log(`Import complete! ${count.count} cards in database.`);
}

// Allow running as a script
if (require.main === module) {
  runBulkImport().catch(console.error);
}
