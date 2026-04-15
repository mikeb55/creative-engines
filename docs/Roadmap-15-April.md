# Composer OS Roadmap [2026-04-15]

Snapshot for **15 April 2026**. Canonical living doc: [COMPOSER_OS_ROADMAP.md](COMPOSER_OS_ROADMAP.md). Detail also in [CHANGELOG.md](../CHANGELOG.md), [README.md](../README.md), and [COMPOSER_OS_ARCHITECTURE.md](COMPOSER_OS_ARCHITECTURE.md).

---

## Completed (high level)

### Composer OS V2 core and apps

- **Golden path:** preset → planning → score → MusicXML → gates → readiness (`engines/composer-os-v2/`).
- **Apps:** `composer-os-app` + `composer-os-desktop` call **app API** (`app-api/`), not raw core only.
- **V9.0 chord baseline:** unified parsing/normalization; Sibelius-safe MusicXML rhythm; multi-voice export discipline (#19, #16, #17 aligned).
- **Modes:** Duo, ECM Chamber, Song Mode, Riff, Wyble — **full MusicXML** where advertised; capability matrix in `app-api/releaseMetadata.ts`.

### Guitar–bass duo and Voice 2

- **18.2A–B:** Voice 2 polyphony, export-safe spans, rhythm footprint, diagnostics.
- **18.2D:** Bass phrase intelligence (rhythmic cells, contour, motif echo vs guitar, walking cap); `npm run test:duo` + `npm run test:bass`.
- **18.2E:** Phrase-arrival gate tuning by form length; bass written pitch / clef-octave for Sibelius.
- **Voice 2 counterpoint (2026-04-09):** Wyble rules, pre-planned goals, clash / repeated-pitch prevention, range C2–A3, breathing validator bypass for duo family where intended.
- **Wyble Voice 2 inject:** extended to **`guitar_bass_duo_single_line`** via **`isGuitarBassDuoFamily`**.

### Form and ensembles

- **Phase 19:** Song Form UI, `formId` → engine, rehearsal marks; bar cap ≤32 in UI.
- **24-bar:** end-to-end chord/bar validation and MusicXML rehearsal schema fixes.
- **Big Band:** seven-part ensemble MusicXML (or planning JSON fallback); chords on piano; piano naming for hosts; verify script 11/11.
- **String Quartet:** strings + piano reduction, section markers, chord symbols on piano, `SQ_PART_*` import fix; Song Form + 16/24/32 bars on Generate.

### Song Mode

- **compile / realise:** `runSongMode` → `CompiledSong`; `runSongStructure` → golden path with Song Mode flags → MusicXML + universal lead sheet.
- **Songwriters & arrangers (core):** typed ids, `songwriterRuleRegistry`, `resolveSongwritingStyles`, `stylePairingResolver`, `buildCompiledSong` — delivered.
- **D-phase:** D1 + C1–C7 done; **D2** (groove / space / expression / surprise on receipt) done per architecture/changelog.
- **Vocal lead sheet:** Python `songwriting_bridge` + checkbox wired from generation — **receipt/download path still incomplete** (`CompiledSong` → bridge input gap).

### Research bundles (reference only until implemented)

- ECM / Bacharach / Barry Harris; Slonimsky; jazz era; Big Band depth; string quartet parameters — local Perplexity files referenced from the canonical roadmap.

### Adjacent in-repo engines (not TS Generate path)

- **Thelonious Monk Engine v1.0 (2026-04-15):** shipped under `engines/monk-engine/` — blues/custom form, GCE melody, Monk prompt + RAG from five transcriptions, twelve validators including density, rhythm variety, breathing; see root [CHANGELOG.md](../CHANGELOG.md).
- **Python engines** (e.g. Wayne Shorter, shorter-form) remain **outside** the main Composer OS Generate pipeline unless bridged.

---

## Current (in flight / honest gaps)

| Area | State |
|------|--------|
| Duo / ECM / Song / Riff / Wyble | Shipping MusicXML; validation and receipts |
| Phase 18.2D / 18.2E | **Complete** |
| Phase 19 | **Complete** for ≤32 bars; longer forms staged |
| Song Mode UI vs engine | Style controls (primary/secondary/author/classical, arranger pairing) **thinner** than core surface |
| Vocal lead sheet | Bridge **wired**; app **pipeline** for path/download **not closed** |
| Wyble single-line | **Inject** aligned; full stack parity (stabilisers, guards, tests) still **open** |
| Big Band / SQ | **Chord input**, Song Form, bar length, piano naming **wired**; polish (copy, host smoke tests) ongoing |

---

## Ahead (prioritized)

### Next possible devs (from canonical roadmap)

1. **Wyble single-line parity** — align `stabiliseGuitarVoice2Wyble18_2B_*` and remaining `presetId === 'guitar_bass_duo'` guards with `isGuitarBassDuoFamily` where behaviour should match; duo/single-line test seeds.
2. **Wyble “realized” normalization** — review `normalizeRealizedVoice2PostInjection182B3` vs stabiliser targets for duo vs single-line.
3. **Wyble Etude / product preset** — optional dedicated study mode or release-metadata row.
4. **Phase 19.1** — **>32** bar forms in UI where engine supports + validation.
5. **Wayne Shorter (product)** — deepen TS `shorterMode` / style / UI; distinct from Python `wayne-shorter-engine`.
6. **Big Band / String Quartet polish** — rehearsal copy refinement, import smoke tests, optional extra `formId` presets.
7. **Song Mode style exposure** — surface primary/secondary songwriter, overlays, arranger pairing, `styleStack` / named presets in Generate.
8. **Vocal lead sheet pipeline** — close `CompiledSong` → bridge shape so vocal MusicXML appears in receipts/downloads.
9. **Bass / duo regression expansion** — more seeds, property tests, CI for `test:duo` / `test:bass`.
10. **Research-driven extensions** — ECM/Bacharach/Harris; Slonimsky lines; chord UX polish (rare symbols, help, tests) without reopening #16 baseline.

### Near and medium term (summary)

- **Near:** Wayne Shorter integration (Composer OS meaning); ensemble polish; Song Mode UI diversity + vocal E2E; Wyble parity and expressiveness.
- **Medium:** Voice 2 imitation / counterpoint refinement; Phase 19.1 long forms; optional chord UX polish.
- **Longer / undefined:** D3 control surface; full Python engines inside Electron without a bridge strategy; `creative-rule-engines` repo split per root README.

---

*End of snapshot. Refresh the canonical [COMPOSER_OS_ROADMAP.md](COMPOSER_OS_ROADMAP.md) title date when merging this into the single source of truth.*
