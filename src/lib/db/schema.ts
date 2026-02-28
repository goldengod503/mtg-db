import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const cards = sqliteTable("cards", {
  id: text("id").primaryKey(),
  oracle_id: text("oracle_id"),
  name: text("name").notNull(),
  mana_cost: text("mana_cost"),
  cmc: real("cmc"),
  oracle_text: text("oracle_text"),
  types: text("types"),
  subtypes: text("subtypes"),
  supertypes: text("supertypes"),
  type_line: text("type_line"),
  colors: text("colors"),
  color_identity: text("color_identity"),
  set_code: text("set_code"),
  set_name: text("set_name"),
  collector_number: text("collector_number"),
  rarity: text("rarity"),
  image_uri: text("image_uri"),
  image_uri_small: text("image_uri_small"),
  multiverse_id: integer("multiverse_id"),
  mtgo_id: integer("mtgo_id"),
  price_card_kingdom: real("price_card_kingdom"),
  price_tcg_player: real("price_tcg_player"),
  price_star_city: real("price_star_city"),
  price_card_hoarder: real("price_card_hoarder"),
  price_card_market: real("price_card_market"),
  legalities: text("legalities"),
  power: text("power"),
  toughness: text("toughness"),
  loyalty: text("loyalty"),
  keywords: text("keywords"),
  released_at: text("released_at"),
  updated_at: text("updated_at"),
});

export const collectionCards = sqliteTable("collection_cards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  card_id: text("card_id")
    .notNull()
    .references(() => cards.id),
  quantity: integer("quantity").notNull().default(1),
  finish: text("finish").default("Normal"),
  condition: text("condition").default("NM"),
  language: text("language").default("EN"),
  purchase_price: real("purchase_price"),
  tags: text("tags"),
  notes: text("notes"),
  added_at: text("added_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const decks = sqliteTable("decks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  format: text("format"),
  description: text("description"),
  commander_id: text("commander_id").references(() => cards.id),
  cover_image: text("cover_image"),
  created_at: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updated_at: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const deckCards = sqliteTable("deck_cards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deck_id: integer("deck_id")
    .notNull()
    .references(() => decks.id, { onDelete: "cascade" }),
  card_id: text("card_id")
    .notNull()
    .references(() => cards.id),
  quantity: integer("quantity").notNull().default(1),
  category: text("category").default("main"),
  custom_tag: text("custom_tag"),
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color"),
});

export const deckTags = sqliteTable("deck_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deck_id: integer("deck_id")
    .notNull()
    .references(() => decks.id, { onDelete: "cascade" }),
  tag_id: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});
