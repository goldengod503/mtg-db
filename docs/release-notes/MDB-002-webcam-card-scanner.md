# MDB-002: Webcam Card Scanner

## Summary
- Added webcam-based MTG card scanning using local Ollama vision model (Moondream 2)
- Scanner identifies card names from captured frames, searches local Scryfall DB for matches, and lets users add cards to their collection
- New `/scanner` page accessible from navigation bar

## Motivation
- Speed up the card entry workflow by scanning physical cards instead of manual text search
- Leverage local AI inference (Ollama + Moondream) to keep the entire pipeline offline-capable
- Reduce friction when cataloguing large collections of physical cards

## Scope
### Included
- [x] API route `/api/scanner/identify` for image-to-card-name via Ollama
- [x] Scanner page with webcam feed, capture, identification, printing selection, and collection add
- [x] Navigation link to scanner page
- [x] FTS-then-LIKE search fallback for card matching
- [x] Configurable `OLLAMA_URL` env var (defaults to `http://localhost:11434`)

### Not included
- Archidekt direct upload (no public API; existing CSV export covers this)
- Batch scanning / scan session tracking
- Card price comparison during scan
- Mobile-optimized camera controls (zoom, flash)

## Implementation notes
- Key files: `src/app/api/scanner/identify/route.ts`, `src/app/scanner/page.tsx`, `src/components/ui/navigation.tsx`
- Ollama call is server-side via API route to avoid browser CORS issues
- Uses `stream: false` since card name responses are only a few tokens
- Captured frames use JPEG 0.8 quality (~100-200KB payloads)
- Reuses existing `/api/collection` POST endpoint for adding cards
- FTS search pattern matches `/api/cards/route.ts`

## Known gaps / follow-ups
- Moondream accuracy varies with card art, lighting, and angle; may need prompt tuning
- No scan session history or export of scanned-only cards
- Next PR(s):
  - MDB-003: Scan session tracking and Archidekt-format export of scanned cards

## Risk & rollout
- Risk level: Low
- Rollout plan:
  - Requires Ollama running locally with Moondream model pulled (`ollama pull moondream`)
  - Scanner is a new standalone page; no impact on existing features
  - Graceful error handling if Ollama is not available (502 with descriptive message)

## Validation checklist
- [ ] `npm run lint` passes
- [ ] Navigate to `/scanner`, camera feed appears
- [ ] Capture a card image, Ollama returns a card name
- [ ] DB matches display with correct images and set info
- [ ] Select printing, configure qty/finish/condition, add to collection
- [ ] Card appears in `/collection` after adding
