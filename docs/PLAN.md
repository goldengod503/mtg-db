# MTG Card Manager — Local Archidekt Clone

## Context

Build a locally-hosted Magic: The Gathering collection manager and deck builder inspired by Archidekt. The app will let you catalog your entire card collection, build decks visually, and browse card data — all running on your machine with no account or cloud dependency.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | SQLite via `better-sqlite3` |
| ORM | Drizzle ORM (lightweight, type-safe, great SQLite support) |
| Styling | Tailwind CSS |
| Card Data | Scryfall bulk data (primary) + Scryfall API (fallback/updates) |
| Card Images | Cached from Scryfall CDN, stored locally |
| Search | SQLite FTS5 (full-text search on card names, text, types) |

## Project Structure

```
mtg-collection/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Dashboard / home
│   │   ├── collection/
│   │   │   └── page.tsx        # Collection browser
│   │   ├── decks/
│   │   │   ├── page.tsx        # Deck list
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Deck editor/viewer
│   │   └── cards/
│   │       └── [id]/
│   │           └── page.tsx    # Single card detail
│   ├── components/
│   │   ├── card/               # Card display components
│   │   ├── collection/         # Collection-specific UI
│   │   ├── deck-builder/       # Deck builder UI
│   │   └── ui/                 # Shared UI primitives
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts       # Drizzle schema definitions
│   │   │   ├── index.ts        # DB connection
│   │   │   └── migrations/     # Schema migrations
│   │   ├── scryfall/
│   │   │   ├── bulk-import.ts  # Bulk data downloader/importer
│   │   │   ├── api.ts          # Scryfall API client (fallback)
│   │   │   └── types.ts        # Scryfall data types
│   │   └── utils.ts
│   └── api/                    # API routes (Next.js route handlers)
│       ├── cards/
│       ├── collection/
│       └── decks/
├── data/                       # SQLite DB file + cached images
├── drizzle.config.ts
├── package.json
└── tailwind.config.ts
```

## Database Schema

### Core Tables

**cards** — Scryfall card data (one row per unique printing)
- `id` (TEXT PK) — Scryfall UUID
- `oracle_id` (TEXT) — groups all printings of a card
- `name` (TEXT, indexed)
- `mana_cost` (TEXT), `cmc` (REAL — "Mana Value"), `oracle_text` (TEXT)
- `types` (TEXT — e.g. "Creature,Artifact")
- `subtypes` (TEXT — e.g. "Elf,Horror")
- `supertypes` (TEXT — e.g. "Legendary")
- `type_line` (TEXT — full Scryfall type line for display)
- `colors` (TEXT — comma-separated: "White,Blue")
- `color_identity` (TEXT — comma-separated)
- `set_code`, `set_name`, `collector_number`
- `rarity` (TEXT)
- `image_uri`, `image_uri_small` (TEXT)
- `multiverse_id` (INTEGER)
- `mtgo_id` (INTEGER)
- `price_card_kingdom` (REAL)
- `price_tcg_player` (REAL)
- `price_star_city` (REAL)
- `price_card_hoarder` (REAL)
- `price_card_market` (REAL)
- `legalities` (TEXT — JSON object: format → legality mapping)
- `power`, `toughness`, `loyalty` (TEXT)
- `keywords` (TEXT — JSON array)
- `released_at`, `updated_at` (TEXT — ISO dates)

**collection_cards** — Cards you own
- `id` (INTEGER PK)
- `card_id` (FK → cards.id)
- `quantity` (INTEGER, default 1)
- `finish` (TEXT — "Normal", "Foil", "Etched")
- `condition` (TEXT — NM/LP/MP/HP/DMG)
- `language` (TEXT — e.g. "EN", "JP")
- `purchase_price` (REAL — nullable, what you paid)
- `tags` (TEXT — comma-separated, e.g. "Collector Box")
- `notes` (TEXT)
- `added_at` (TEXT — ISO date)

**decks**
- `id` (INTEGER PK)
- `name` (TEXT)
- `format` (TEXT — commander/standard/modern/etc.)
- `description` (TEXT)
- `commander_id` (FK → cards.id, nullable)
- `created_at`, `updated_at`
- `cover_image` (TEXT — card image URL for deck thumbnail)

**deck_cards**
- `id` (INTEGER PK)
- `deck_id` (FK → decks.id)
- `card_id` (FK → cards.id)
- `quantity` (INTEGER)
- `category` (TEXT — main/sideboard/maybeboard/companion)
- `custom_tag` (TEXT — user-defined grouping like "Ramp", "Removal")

**tags** — For organizing decks
- `id`, `name`, `color`

**deck_tags** — Many-to-many join

### FTS Virtual Table
```sql
CREATE VIRTUAL TABLE cards_fts USING fts5(name, types, subtypes, supertypes, oracle_text, content=cards);
```

### Archidekt CSV Column Mapping

The import maps all 28 columns from an Archidekt collection export:

| CSV Column | DB Table | DB Column |
|---|---|---|
| Quantity | collection_cards | quantity |
| Name | cards | name |
| Finish | collection_cards | finish |
| Condition | collection_cards | condition |
| Date Added | collection_cards | added_at |
| Language | collection_cards | language |
| Purchase Price | collection_cards | purchase_price |
| Tags | collection_cards | tags |
| Edition Name | cards | set_name |
| Edition Code | cards | set_code |
| Multiverse Id | cards | multiverse_id |
| Scryfall ID | cards | id |
| MTGO ID | cards | mtgo_id |
| Collector Number | cards | collector_number |
| Mana Value | cards | cmc |
| Colors | cards | colors |
| Identities | cards | color_identity |
| Mana cost | cards | mana_cost |
| Types | cards | types |
| Sub-types | cards | subtypes |
| Super-types | cards | supertypes |
| Rarity | cards | rarity |
| Price (Card Kingdom) | cards | price_card_kingdom |
| Price (TCG Player) | cards | price_tcg_player |
| Price (Star City Games) | cards | price_star_city |
| Price (Card Hoarder) | cards | price_card_hoarder |
| Price (Card Market) | cards | price_card_market |
| Scryfall Oracle ID | cards | oracle_id |

## Implementation Phases

### Phase 1: Foundation & Card Data
1. Initialize Next.js project with Tailwind, Drizzle, better-sqlite3
2. Define database schema and run initial migration
3. Build Scryfall bulk data importer:
   - Download `default-cards` bulk JSON (~300MB compressed)
   - Parse and insert into `cards` table in batches
   - Build FTS5 index
   - Script to re-run for updates
4. Build Scryfall API client as fallback for single-card lookups
5. Create basic card search API route (`/api/cards?q=...`)
6. Build card display component (image + details)

### Phase 2: Collection Management
1. Collection API routes (CRUD for collection_cards)
2. Collection browser page:
   - Grid view (card images) and list/table view
   - Search and filter (by name, color, set, type, rarity, format)
   - Sort (name, CMC, price, date added)
   - Pagination
3. Add-to-collection flow (search → select printing → set qty/condition)
4. Bulk import from Archidekt CSV export (maps all 28 columns: Quantity, Name, Finish, Condition, Date Added, Language, Purchase Price, Tags, Edition Name/Code, Multiverse Id, Scryfall ID, MTGO ID, Collector Number, Mana Value, Colors, Identities, Mana cost, Types, Sub-types, Super-types, Rarity, 5x prices, Scryfall Oracle ID)
5. Collection stats dashboard (total cards, value estimate, color breakdown)

### Phase 3: Deck Builder
1. Deck CRUD API routes
2. Deck list page (all your decks with thumbnails)
3. Deck editor page:
   - Split layout: card search panel + deck contents
   - Visual stacking by category/CMC/color/type (like Archidekt)
   - Drag-and-drop between categories
   - Card count and mana curve chart
   - Format legality indicator
   - "Cards in collection" indicator (own/need badges)
4. Commander selection for Commander decks
5. Deck stats panel (mana curve, color pie, card type breakdown, price)

### Phase 4: Polish & Quality of Life
1. Dashboard home page (recent decks, collection summary, quick search)
2. Dark mode (default)
3. Card image caching to local filesystem
4. Deck export (text, CSV, MTGO format)
5. Collection export (CSV)
6. Responsive layout for different screen sizes

## Card Data Strategy

1. **Initial setup**: Download Scryfall bulk data (`default-cards`), parse JSON, insert ~90k unique cards into SQLite
2. **Updates**: CLI command or button to re-download bulk data and upsert changes
3. **Fallback**: If a card isn't found locally, query Scryfall API (`api.scryfall.com/cards/named?fuzzy=...`) and cache the result
4. **Images**: Reference Scryfall CDN URLs directly (fast, free, always available). Optionally cache to `data/images/` for offline use.

## Key Dependencies

```json
{
  "next": "^14",
  "react": "^18",
  "better-sqlite3": "^11",
  "drizzle-orm": "^0.34",
  "drizzle-kit": "^0.25",
  "tailwindcss": "^3",
  "@tanstack/react-table": "^8",
  "recharts": "^2",
  "zustand": "^4"
}
```

## Verification

1. `npm run dev` starts the app on `localhost:3000`
2. Run bulk import script — confirm cards populate in DB
3. Search for cards by name — results appear with images
4. Add cards to collection — appear in collection browser
5. Create a deck — add cards, categorize, see stats
6. Filter collection by color/set/type — correct results
7. Deck legality check works for chosen format
