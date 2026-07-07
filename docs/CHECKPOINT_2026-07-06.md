# Checkpoint — 2026-07-06 (priority 1a smoke debt)

Session pause before golden GCE comparison work.

## Done

- **Bucket B (DCR commit)** — `67ef7fce` — smoke/registry wiring drift fixed (`outputValidationSmoke`, riff VRB stubs, `riffGeneratorIntegration`).
- **LF-normalize golden compare (DCR refine)** — `6ada6683` — shared `goldenFixtureCompare.ts`; premium-melody golden tests normalize committed `.musicxml` fixtures before byte-exact/hash compare (cleared Bill Evans MusicXML row; BH / Wayne / Hendrix MusicXML still content-drift).

## Next (superseded)

- **Automated GCE comparison** — **DONE** — see [CHECKPOINT_2026-07-07.md](./CHECKPOINT_2026-07-07.md) for consolidated findings. No fixture regeneration until musical review confirms drift is correct.

## Smoke status (last full tier run, post LF-refine local)

- **Unexpected fail count: 9** (681 PASS rows logged in `_smoke_lf_refine.log`)
- Still red: BH / Wayne / Hendrix JSON + MusicXML (content drift); Bartok CLE lineSet + trace JSON; Bucket B items resolved on `main`.

## Resume pointer

1. Run GCE comparison harness (design-only probe scripts under repo root / `engines/composer-os-v2/scripts/_*` are scratch — do not commit).
2. Musical-review table from `_golden_musical_review.ts` (optional, incomplete run) informs regen vs keep-new before any golden rewrite.
