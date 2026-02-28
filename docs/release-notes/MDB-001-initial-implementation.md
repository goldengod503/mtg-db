# MDB-001: Initial Implementation — Full MTG Collection Manager

## Summary
- Complete Next.js 14 app with SQLite backend for MTG card collection management and deck building
- Scryfall bulk data importer with FTS5 full-text search
- Collection CRUD with CSV import/export (Archidekt compatible) and deck builder with stats

## Motivation
- Build a locally-hosted Archidekt clone with no account or cloud dependency
- Catalog entire card collection, build decks visually, browse card data

## Scope
### Included
- [x] Next.js 14 + Tailwind CSS + Drizzle ORM + better-sqlite3 project setup
- [x] Database schema: cards, collection_cards, decks, deck_cards, tags, deck_tags
- [x] Scryfall bulk data importer (~90k cards) with FTS5 search index
- [x] Scryfall API fallback client for single-card lookups
- [x] Card search API with FTS5 and filters (color, set, rarity, type, format)
- [x] Collection CRUD API with search, filter, sort, pagination
- [x] Archidekt CSV import (28 columns) and CSV export
- [x] Collection stats API (total cards, value, color/rarity/type breakdowns)
- [x] Deck CRUD API with card management
- [x] Deck export (text, CSV, MTGO formats)
- [x] Dashboard page with stats, quick search, recent decks/additions
- [x] Collection browser with grid/table views, filters, add/remove/quantity controls
- [x] Card detail page with image, oracle text, prices, legalities
- [x] Deck list page with create/delete
- [x] Deck editor with card search panel, grouped card list, stats (mana curve, color pie, type breakdown)
- [x] Commander selection for Commander format decks
- [x] Format legality indicators
- [x] Dark mode (default)
- [x] Responsive layout

### Not included
- Card image caching to local filesystem (uses Scryfall CDN directly)
- Drag-and-drop between deck categories
- "Cards in collection" indicator on deck editor

## Implementation notes
- Key files: `src/lib/db/` (schema, connection with auto-migration), `src/lib/scryfall/` (types, API, bulk importer), `src/app/api/` (all REST endpoints), `src/app/` (all pages), `src/components/` (UI components)
- Database auto-creates tables on first connection — no manual migration step needed
- FTS5 virtual table built after bulk import for fast card name/text search
- Bulk import runs as API route (`POST /api/import`) or CLI script (`npm run import`)

## Known gaps / follow-ups
- No drag-and-drop in deck editor yet
- No "own/need" badges on deck cards from collection
- Image caching could be added for offline use
- Next PR(s):
  - MDB-002: Drag-and-drop deck editor enhancements
  - MDB-003: Collection-deck cross-referencing

## Risk & rollout
- Risk level: Low
- Rollout plan:
  - Run `npm run dev` and click "Import Card Data" to populate the database
  - Verify card search, collection add/remove, and deck building work
