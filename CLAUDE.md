# Claude Project Rules (magic-db)

## Canonical Product Spec
- Treat `DESIGN.md` as the source of truth for product behavior and workflow.

## PR Discipline
- Keep PRs scoped to the current milestone (PR1/PR2/PR3/etc.).
- Do not implement later milestones unless explicitly requested.

## Definition of Done (for any PR)
- Lint passes where applicable.
- Relevant tests pass (backend and/or frontend depending on changes).
- No behavior changes that contradict `PLAN.md` unless `PLAN.md` is updated in the same PR.
- Release notes are added to ~/Data/dev/magic-db/docs/release-notes

## Release Notes Format
# MDB-XXX: <Title>
- Create a PR doc in ~/Data/dev/magic-db/docs/release-notes named:
  MDB-XXX-<short-slug>.md
## Summary
- <1–3 bullets: what changed>

## Motivation
- <why this PR exists / what risk it reduces>

## Scope
### Included
- [ ] <thing>
- [ ] <thing>

### Not included
- <explicitly out-of-scope items>

## Implementation notes
- <key files touched>
- <any important architectural decisions>


## Known gaps / follow-ups
- <skipped TODOs, open questions links>
- Next PR(s):
  - MDB-XXX: <title>

## Risk & rollout
- Risk level: Low / Medium / High
- Rollout plan:
  - <how to validate, any flags>

## Validation checklist
- [ ] Unit tests pass
- [ ] CI green
- [ ] Docs updated (this file + any relevant docs)
