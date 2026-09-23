# Copilot / agent instructions — aHA-watering

This repo is a **HACS custom Lovelace plugin**: a single card at
`dist/cistern-irrigation-card.js`. HACS installs a **released version**, so every
change that ships must produce a new version and GitHub release.

## Golden rule: bump the version on every PR

When you open a PR that changes the card, you MUST bump the version:

1. Edit `dist/cistern-irrigation-card.js` and increase `CARD_VERSION`
   (top of the file) following semver:
   - **patch** (`x.y.Z`) — bug fixes, styling tweaks.
   - **minor** (`x.Y.0`) — new backward-compatible features / config options.
   - **major** (`X.0.0`) — breaking config or behavior changes.
2. The console banner reads `CARD_VERSION`, so it stays in sync automatically.
3. Add a matching entry to `CHANGELOG.md`.

Docs- or CI-only PRs that don't touch `dist/` don't need a bump.

## How releasing works (automatic)

- On merge to `main`, `.github/workflows/auto-tag.yml` reads `CARD_VERSION` and,
  if a tag `v<version>` doesn't already exist, creates and pushes it.
- The tag push triggers `.github/workflows/release.yml`, which publishes a
  GitHub Release named `v<version>` with `dist/cistern-irrigation-card.js`
  attached. HACS then offers the update to users.

So the loop is: **bump `CARD_VERSION` → merge → CI tags and releases.**
Never tag or create releases by hand.

## Checklist before merging a card change

- [ ] `CARD_VERSION` bumped (semver) and higher than the latest release tag.
- [ ] `node --check dist/cistern-irrigation-card.js` passes.
- [ ] `CHANGELOG.md` updated.
- [ ] README config table updated if options changed.

## Conventions

- Single file, **no build step** — plain `HTMLElement` web component, no Lit or
  other dependencies, so `/hacsfiles/...` can serve the file directly.
- Do not remove the `window.customCards` registration or `getStubConfig`
  (both are needed for the dashboard card picker).
- Keep `hacs.json`'s `filename` equal to the card filename.
