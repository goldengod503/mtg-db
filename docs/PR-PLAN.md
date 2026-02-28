# MTG Card Manager — PR Development Plan

> See [PLAN.md](./PLAN.md) for full tech stack, database schema, project structure, and CSV column mapping.

Each PR is a vertical slice that leaves the app in a working, runnable state. PRs are small enough to keep context fresh and build incrementally on each other.

---

## PR Summary

| PR | Slice | What you can do after merging |
|----|-------|-------------------------------|
| 1 | Scaffold | App runs, nav works, placeholder pages |
| 2 | Database | DB created with full schema on startup |
| 3 | CSV Import | Import your Archidekt collection, see cards in a table |
| 4 | Card Images | See card art in a grid layout |
| 5 | Search + Filter | Find cards by name, filter by color/set/type/rarity |
| 6 | Card Detail | Click any card for full info page |
| 7 | Collection CRUD | Add/edit/remove cards manually |
| 8 | Collection Stats | See charts and value breakdowns |
| 9 | Deck CRUD | Create and manage deck shells |
| 10 | Deck Editor | Add cards to decks with search panel |
| 11 | Deck Visuals | Archidekt-style card stacking + mana curve |
| 12 | Commander | Commander-specific validation and display |
| 13 | Scryfall Bulk | Full card database with oracle text, legalities, images |
| 14 | Export | Export decks and collection to standard formats |
| 15 | Dashboard | Polished home page + dark mode |

---

## PR 1: Project scaffold + hello world
**Branch:** `01-scaffold`

**Goal:** Bootable Next.js app with Tailwind, basic layout shell, and dev tooling.

**Work:**
- `npx create-next-app@14` with TypeScript, App Router, Tailwind
- Add shared layout with app header/nav bar (Collection, Decks, Cards links)
- Home page (`/`) with project title and placeholder content
- Add `.gitignore` entries for `data/` directory (DB + cached images)
- Verify: `npm run dev` → app loads at localhost:3000 with nav

**Files created:**
- `src/app/layout.tsx` — root layout with nav
- `src/app/page.tsx` — home placeholder
- `src/components/ui/nav.tsx` — navigation bar
- `tailwind.config.ts`, `package.json`, `tsconfig.json`

---

## PR 2: Database schema + connection
**Branch:** `02-database`

**Goal:** SQLite database with all tables created via Drizzle migrations. App connects to DB on startup.

**Work:**
- Install `better-sqlite3`, `drizzle-orm`, `drizzle-kit`
- Define Drizzle schema for all tables (see [PLAN.md — Database Schema](./PLAN.md#database-schema) for full field list):
  - `cards` — all fields from Archidekt CSV + Scryfall extras
  - `collection_cards` — quantity, finish, condition, language, purchase_price, tags, notes, added_at
  - `decks` — name, format, description, commander_id, timestamps, cover_image
  - `deck_cards` — deck_id, card_id, quantity, category, custom_tag
  - `tags`, `deck_tags`
- Create DB connection singleton (`src/lib/db/index.ts`)
- Create `drizzle.config.ts`, generate and run initial migration
- Add FTS5 virtual table creation in a post-migration script
- Verify: app starts, `data/mtg.db` is created with all tables

**Files created:**
- `src/lib/db/schema.ts`
- `src/lib/db/index.ts`
- `drizzle.config.ts`
- `src/lib/db/migrations/`

---

## PR 3: Archidekt CSV import with visible results
**Branch:** `03-csv-import`

**Goal:** Import your Archidekt CSV export and see your collection in the browser. First "real" vertical slice — data in, data visible.

**Work:**
- Build CSV parser that maps all 28 Archidekt columns (see [PLAN.md — CSV Column Mapping](./PLAN.md#archidekt-csv-column-mapping)):
  - Upserts into `cards` table (keyed on Scryfall ID)
  - Inserts into `collection_cards` (handles duplicates: same Scryfall ID with different finish/condition = separate rows)
- API route: `POST /api/collection/import` — accepts CSV file upload
- Import page (`/collection/import`) with file picker + progress indicator
- After import, redirect to collection page
- Basic collection page (`/collection`) — table view showing: card name, set, quantity, finish, condition, price
- API route: `GET /api/collection` — paginated collection list
- Verify: upload your CSV → see all your cards listed in a table

**Files created:**
- `src/lib/csv/import.ts` — CSV parsing + DB insertion logic
- `src/app/api/collection/import/route.ts`
- `src/app/collection/import/page.tsx`
- `src/app/collection/page.tsx` — basic table view
- `src/app/api/collection/route.ts` — GET collection list

---

## PR 4: Card images + grid view
**Branch:** `04-card-images`

**Goal:** Collection page shows card images in a visual grid, with toggle between grid and table view.

**Work:**
- Fetch card image URIs from Scryfall API based on Scryfall IDs already in DB
  - API route: `POST /api/cards/fetch-images` — batch lookup via Scryfall `/cards/collection` endpoint
  - Store `image_uri` and `image_uri_small` on the `cards` table
  - Rate-limit aware (Scryfall allows 10 req/s)
- Card image component with lazy loading + fallback placeholder
- Grid view for collection page — card images in a responsive CSS grid
- View toggle (grid / table) persisted in URL params
- Verify: collection page shows card images in a grid, can switch to table view

**Files created:**
- `src/lib/scryfall/api.ts` — Scryfall API client
- `src/lib/scryfall/types.ts` — Scryfall response types
- `src/app/api/cards/fetch-images/route.ts`
- `src/components/card/card-image.tsx`
- `src/components/collection/view-toggle.tsx`

---

## PR 5: Card search + filtering
**Branch:** `05-search-filter`

**Goal:** Search your collection by name, filter by color/set/type/rarity.

**Work:**
- Populate FTS5 index from existing card data
- Search API: `GET /api/cards/search?q=...&colors=...&set=...&type=...&rarity=...`
  - FTS5 for text search, SQL filters for structured fields
  - Pagination with cursor or offset
- Search bar component with debounced input
- Filter sidebar/dropdown: colors (WUBRGC checkboxes), set, type, rarity
- Sort dropdown: name, CMC, price, date added
- Update collection page to use search + filters
- Verify: type a card name → results filter live; apply color filter → only matching cards shown

**Files created:**
- `src/app/api/cards/search/route.ts`
- `src/components/collection/search-bar.tsx`
- `src/components/collection/filter-panel.tsx`
- `src/components/collection/sort-dropdown.tsx`

---

## PR 6: Card detail page
**Branch:** `06-card-detail`

**Goal:** Click any card for a full detail page with all metadata.

**Work:**
- Card detail page: `/cards/[id]`
  - Large card image
  - Card stats: name, mana cost (with mana symbols), type line, oracle text, P/T or loyalty
  - Price table (all 5 sources)
  - Set info + collector number
  - Color identity icons
  - Legality table (formats where legal/banned/restricted)
  - "In your collection" section — all copies you own with finish/condition
  - "Other printings" — other sets via same oracle_id
- API route: `GET /api/cards/[id]`
- Mana symbol rendering component (`{W}`, `{U}`, `{2}` → styled icons)
- Clicking a card anywhere in the app navigates here
- Verify: click a card → see full details with all fields populated

**Files created:**
- `src/app/cards/[id]/page.tsx`
- `src/app/api/cards/[id]/route.ts`
- `src/components/card/card-detail.tsx`
- `src/components/card/mana-symbols.tsx`
- `src/components/card/legality-table.tsx`
- `src/components/card/price-table.tsx`

---

## PR 7: Collection CRUD — add, edit, remove cards
**Branch:** `07-collection-crud`

**Goal:** Manually add/edit/remove cards in your collection.

**Work:**
- "Add to collection" flow: search → select printing → set quantity/finish/condition/language/price/tags → submit
- Edit collection entry: inline edit or modal for quantity, condition, finish, notes
- Remove from collection: delete button with confirmation
- API routes:
  - `POST /api/collection` — add card
  - `PATCH /api/collection/[id]` — update entry
  - `DELETE /api/collection/[id]` — remove entry
- Verify: add a card manually, edit its quantity, delete it — all reflected in collection view

**Files created:**
- `src/app/api/collection/[id]/route.ts`
- `src/components/collection/add-card-modal.tsx`
- `src/components/collection/edit-entry.tsx`

---

## PR 8: Collection statistics dashboard
**Branch:** `08-collection-stats`

**Goal:** Charts and summaries for your collection — value, color distribution, rarity breakdown.

**Work:**
- Stats API: `GET /api/collection/stats`
  - Total unique cards + total count (with quantities)
  - Estimated total value (price_tcg_player × quantity)
  - Color distribution, rarity distribution
  - Top 10 most valuable cards
  - Cards by set (top sets)
- Charts using Recharts: color pie chart, rarity bar chart, value by set
- Verify: after CSV import, stats page shows accurate totals and charts

**Files created:**
- `src/app/api/collection/stats/route.ts`
- `src/app/collection/stats/page.tsx`
- `src/components/collection/stats-charts.tsx`
- `src/components/collection/value-summary.tsx`

---

## PR 9: Deck CRUD — create, list, delete decks
**Branch:** `09-deck-crud`

**Goal:** Create and manage deck shells (no card editing yet).

**Work:**
- Decks list page: `/decks` — deck tiles with name, format, card count, cover image
- Create deck: modal with name, format dropdown, description
- Delete deck with confirmation
- Deck detail page: `/decks/[id]` — deck info (empty card list placeholder)
- API routes:
  - `GET /api/decks`, `POST /api/decks`
  - `GET /api/decks/[id]`, `PATCH /api/decks/[id]`, `DELETE /api/decks/[id]`
- Verify: create "Mono Red Aggro" Standard deck → appears in list → click in → see empty deck page

**Files created:**
- `src/app/decks/page.tsx`
- `src/app/decks/[id]/page.tsx`
- `src/app/api/decks/route.ts`
- `src/app/api/decks/[id]/route.ts`
- `src/components/deck-builder/deck-card-tile.tsx`
- `src/components/deck-builder/create-deck-modal.tsx`

---

## PR 10: Deck editor — add/remove cards
**Branch:** `10-deck-editor`

**Goal:** Split-pane deck editor: search for cards, add them to your deck, organize by category.

**Work:**
- Deck editor layout: left panel = card search, right panel = deck contents
- Card search panel (reuses search/filter from PR 5)
- Click card in search → add to deck (default: "main" category, qty 1)
- Deck contents panel:
  - Cards grouped by category (main/sideboard/maybeboard)
  - Each card: name, mana cost, quantity, set
  - +/- quantity buttons, remove button
  - Category dropdown, custom tag field ("Ramp", "Removal", "Draw")
- Card count display ("60/60" Standard, "100/100" Commander)
- API routes:
  - `POST /api/decks/[id]/cards`
  - `PATCH /api/decks/[id]/cards/[cardId]`
  - `DELETE /api/decks/[id]/cards/[cardId]`
- Verify: open deck → search "Lightning Bolt" → add → shows in main → change qty to 4 → move to sideboard

**Files created:**
- `src/components/deck-builder/deck-editor.tsx`
- `src/components/deck-builder/search-panel.tsx`
- `src/components/deck-builder/deck-contents.tsx`
- `src/components/deck-builder/card-row.tsx`
- `src/app/api/decks/[id]/cards/route.ts`
- `src/app/api/decks/[id]/cards/[cardId]/route.ts`

---

## PR 11: Deck visual stacking + mana curve
**Branch:** `11-deck-visuals`

**Goal:** Archidekt-style visual card stacking and deck statistics panel.

**Work:**
- Visual stacking view: overlapping card images in columns, grouped by:
  - Category (default), CMC, Color, Card type, Custom tag
- Group-by selector dropdown
- Deck stats panel:
  - Mana curve bar chart (CMC distribution)
  - Color pie chart
  - Card type breakdown
  - Total deck price
- "In collection" badges (green = owned, red = need to acquire)
- Verify: add ~20 cards → switch grouping modes → charts update → collection badges correct

**Files created:**
- `src/components/deck-builder/visual-stack.tsx`
- `src/components/deck-builder/stack-column.tsx`
- `src/components/deck-builder/group-selector.tsx`
- `src/components/deck-builder/deck-stats.tsx`
- `src/components/deck-builder/collection-badge.tsx`

---

## PR 12: Commander support
**Branch:** `12-commander`

**Goal:** Commander-specific deck features — commander selection, color identity validation, singleton enforcement.

**Work:**
- When format = "Commander":
  - Commander selection (search legendary creatures/planeswalkers)
  - Commander displayed prominently at top of deck
  - Color identity validation: warn on cards outside commander's identity
  - Card count target: 100 (including commander)
  - Singleton enforcement: warn on duplicates (except basic lands)
- Commander card as deck cover image
- Verify: create Commander deck → set commander → add cards → see warnings for off-color/duplicate cards

**Files created:**
- `src/components/deck-builder/commander-picker.tsx`
- `src/components/deck-builder/deck-warnings.tsx`
- `src/lib/deck-validation.ts`

---

## PR 13: Scryfall bulk data import
**Branch:** `13-scryfall-bulk`

**Goal:** Full Scryfall card database import for oracle text, legalities, keywords, and images beyond what the CSV provides.

**Work:**
- Bulk data downloader:
  - Fetch URL from `api.scryfall.com/bulk-data`
  - Download `default-cards` JSON (~1.5GB uncompressed)
  - Stream-parse (don't load full file into memory)
  - Upsert into `cards` in batches of 1000
  - Fill in: oracle_text, legalities, keywords, image_uri, image_uri_small, power, toughness, loyalty, released_at
  - Rebuild FTS5 index after import
- Settings page (`/settings`) with "Update Card Database" button + progress bar
- Show last update timestamp
- Verify: click update → progress fills → card detail pages now show oracle text, legalities, keywords

**Files created:**
- `src/lib/scryfall/bulk-import.ts`
- `src/app/api/scryfall/bulk-import/route.ts`
- `src/app/settings/page.tsx`
- `src/components/ui/progress-bar.tsx`

---

## PR 14: Deck and collection export
**Branch:** `14-export`

**Goal:** Export decks and collection to standard formats.

**Work:**
- Deck export formats:
  - Plain text ("4 Lightning Bolt")
  - Archidekt-compatible CSV
  - MTGO format (.txt with sideboard section)
- Collection export:
  - Archidekt-compatible CSV (same 28-column format as import)
- Export buttons on deck detail and collection pages
- API routes:
  - `GET /api/decks/[id]/export?format=text|csv|mtgo`
  - `GET /api/collection/export?format=csv`
- Verify: export deck as text → paste into another tool → recognized. Export collection → re-import → same data.

**Files created:**
- `src/lib/export/deck-export.ts`
- `src/lib/export/collection-export.ts`
- `src/app/api/decks/[id]/export/route.ts`
- `src/app/api/collection/export/route.ts`
- `src/components/ui/export-button.tsx`

---

## PR 15: Dashboard home page + dark mode
**Branch:** `15-dashboard-polish`

**Goal:** Polished home page with at-a-glance info, dark mode as default.

**Work:**
- Home page dashboard:
  - Collection summary (total cards, estimated value)
  - Recent decks (last 5 modified)
  - Quick search bar (global card search)
  - Color identity breakdown widget
- Dark mode:
  - Tailwind `class` strategy, dark palette as default
  - Theme toggle in nav bar
  - Persist in localStorage
- Verify: app loads dark → dashboard shows real stats → quick search works → toggle to light mode

**Files created:**
- `src/components/ui/theme-toggle.tsx`
- `src/components/dashboard/collection-summary.tsx`
- `src/components/dashboard/recent-decks.tsx`
- `src/components/dashboard/quick-search.tsx`
