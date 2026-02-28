import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "mtg.db");
const sqlite = new Database(dbPath);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Auto-create tables if they don't exist
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
  CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
  CREATE INDEX IF NOT EXISTS idx_cards_oracle_id ON cards(oracle_id);
  CREATE INDEX IF NOT EXISTS idx_cards_set_code ON cards(set_code);
  CREATE INDEX IF NOT EXISTS idx_cards_cmc ON cards(cmc);
`);

export const db = drizzle(sqlite, { schema });
export { sqlite };
