# Composer OS — V64 Roadmap
Status: **complete** · V64 closed **2026-05-24**

## V64 final baseline
Smoke: **fast 307/73/0** · **full 472/87/0**  
Last commit: *(P7 closeout — this release)*  
Desktop: `apps/composer-os-desktop/release/Composer-OS.exe` + `Composer-OS-Setup.exe` (rebuilt P7)

## Goal (achieved)
Section architecture + Zappa GCE structural layer + per-section VRB/meter; promote off-smoke goldens into smoke tier.

## Shipped (P1–P6)

| Prompt | Scope | Commit |
|--------|-------|--------|
| **P1** | Per-section VRB — `SectionMarker` + `resolveSectionVrb`; sonic_youth A/B Slonimsky | **067eaa6b** |
| **P2** | Zappa GCE structural fingerprint — auto meter splice, absurdist section kinds | **f9e3d3e4** |
| **P3** | FZ_* receipt promotion — `FZ_BURST`, `FZ_METRIC_SHIFT`, `FZ_REGISTER_COLLISION` | **3adbb634** |
| **P4** | Section architecture domain model — `sectionArchitectureDomain.ts` | **580c548a** |
| **P5** | Song schema types + behavioural contract | **29bae570** |
| **P6** | Per-section meter resolution + `zappaGceMeterMode` | **f00ace6f** |
| **CI** | Full smoke Zappa gate relax + fast runner | **8ec9f35b** |

## P7 closeout (2026-05-24)
- **Stash assessment:** out-of-scope CI fix stash **discarded** (full smoke **435/15** with stash applied — not merged)
- **Smoke suite:** **+22** rows, **+7** suites — V64 off-smoke goldens promoted:
  - `sonicYouthPerSectionVrb.test.ts` (75002)
  - `zappaGceFingerprint.test.ts` (76001)
  - `fzBurstReceipt.test.ts` (77001)
  - `fzMetricShiftReceipt.test.ts` (77002)
  - `fzRegisterCollisionReceipt.test.ts` (77003)
  - `sectionArchitectureDomain.test.ts` (78001)
  - `perSectionMeter.test.ts` (79001–79003)
- **Fix:** `zappaStructuralActiveForMeterResolution` — Zappa auto meter when `primarySongwriterStyle` set before Song Mode metadata block
- **Docs:** `COMPOSER_OS_ROADMAP.md` V65 header · `CHANGELOG.md` · `CLAUDE.md` smoke counts
- **Desktop rebuild** (no version bump)

## Rules (carried forward)
- Golden fixture required before marking a V64 slice done
- Only P7 closeout may add new smoke rows (this release)
- Musician guide updated for section architecture + FZ receipts

## Backlog (V65+)
- Remaining **12** FZ_* receipt stubs (3 of 15 promoted)
- Section editor UI — per-section meter + VRB
- Fretboard view
- MusicXML import depth
- Sibelius QA per mode
