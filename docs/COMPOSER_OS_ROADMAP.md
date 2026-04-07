# Composer OS Roadmap [2026-04-07]

**Canonical handoff doc for assistants (e.g. Claude).** Detail also lives in [CHANGELOG.md](CHANGELOG.md), [README.md](../README.md), and [COMPOSER_OS_ARCHITECTURE.md](COMPOSER_OS_ARCHITECTURE.md). **Update this file’s title date** when you refresh the roadmap.

**Convention:** Whenever the user asks for a “roadmap,” use the title **`Composer OS Roadmap [YYYY-MM-DD]`** (snapshot date, typically today) and align content with this file or replace sections intentionally.

---

## Product scope (Composer OS V2)

- **Core:** `engines/composer-os-v2/` — single pipeline: preset → planning → score → MusicXML → gates → readiness.
- **Apps:** `apps/composer-os-app`, `apps/composer-os-desktop` — call **app API** (`app-api/`), not raw core only.
- **Modes matrix (honest):** see `app-api/releaseMetadata.ts` — duo / ECM / Song Mode / riff / Wyble / **Big Band** / **String Quartet** = **full ensemble MusicXML** (**planning JSON** fallback on failure). **String Quartet** is **COMPLETE** (4 string parts + section markers + chords/harmony wiring). **In progress:** piano **naming** fix (Sibelius import labels for ensemble piano) and a **dedicated String Quartet piano part** (not yet a fifth staff).

---

## Past (delivered)

### Foundation & export

- **V9.0 chord baseline:** unified parsing/normalization (#19); Sibelius-safe MusicXML rhythm (undotted decomposition); multi-voice export discipline.
- **Golden Path:** Guitar–Bass Duo 8-bar default; 16/32-bar long-form; optional modulation planning for 32-bar route.
- **ECM Chamber:** full MusicXML golden path (`ecm_chamber`), Metheny vs Schneider feel scoring, ECM-specific style stack.
- **Key signatures (V3.4):** infer / override / hide from harmony API.

### Guitar polyphony (Phase 18.2)

- **18.2A–B:** Voice 2 polyphony, Sibelius/GP8-safe export, span-based continuity, rhythm footprint (bar-level planning).
- **18.2C (partial, historical):** validators/sweep/pitch floor; some bass musical issues deferred to phrase layer.
- **18.2D:** Bass phrase intelligence (contour, phrase intents, `bassPlan.style`); pitch floor discipline.
- **18.2E (2026-04-07):** Phrase-arrival gate loosened (±2 semitones); 24-bar forms skip that gate; 32-bar checks phrase 1 only; bass **written** pitch offset for Sibelius (`acoustic_upright_bass`, export −24 MIDI vs score + `clef-octave-change` -1).

### Form & app wiring

- **Phase 19:** Song Form UI, `formId` → engine, rehearsal marks in MusicXML; bar cap ≤32 in UI; longer forms staged (e.g. Phase 19.1).
- **24-bar end-to-end (2026-04-07):** `formId` on API `req_`, chord/bar validation for 24-bar through-composed forms, MusicXML enclosure schema fix (`rehearsal`).

### Song Mode (structural + realisation)

- **compile:** `runSongMode` → `CompiledSong`, lead-sheet contract, songwriting rules from bundled research (`core/song-mode/`).
- **realise:** `runSongStructure` → `runGoldenPath` as **guitar_bass_duo** with Song Mode flags → **MusicXML** + universal lead sheet.
- **Songwriter id → harmony:** `wayne_shorter` enables **`shorterMode`** chord-tone behaviour (upper extensions), not the Python `wayne-shorter-engine`.

### Other presets

- **Riff Generator:** short-loop MusicXML to library path.
- **Wyble Etude:** Jimmy Wyble engine → MusicXML (chord resolution required).

### Big Band (2026-04-07) — **COMPLETE**

- **App wiring:** `runBigBandRealisation` after planning → **full 7-part ensemble MusicXML** when the ensemble export pipeline passes; **planning JSON** if realisation or export fails.
- **Parts:** Alto Sax, Tenor Sax, Trumpet, Trombone, Piano, Double Bass, Jazz Drums (percussion clef, MIDI channel 10 — confirmed).
- **Chords / UI:** chord symbols on piano staff; **Generate** chord input wired.
- **In progress:** Sibelius **piano part naming** polish (`Piano` / `Pno.` / `keyboard.piano` — see CHANGELOG).
- **Verification:** `engines/composer-os-v2/scripts/bigband-verify.ts` — **11/11** checks.
- **Scope:** behavioural scoring — not full professional arranging.

### String Quartet (2026-04-07) — **COMPLETE**

- **App wiring:** `runQuartetRealisation` after planning → **full 4-part ensemble MusicXML** when the ensemble export pipeline passes; **planning JSON** if realisation or export fails.
- **Parts:** Violin I, Violin II, Viola, Violoncello (complete). **In progress:** optional fifth **piano** comping part (not in score model yet).
- **Section markers:** statement, development, contrast, return, coda (rehearsal / form slices in export).
- **Chords / UI:** chord symbols on harmony-guide staves; **Generate** chord input wired for String Quartet (and Big Band).
- **Scope:** behavioural scoring — not full professional arranging.

---

## Current (as of roadmap date)

| Area | State |
|------|--------|
| **Duo / ECM / Song Mode / Riff / Wyble** | Shipping **MusicXML** path; validation + receipts; chord diagnostics (#17) |
| **Phase 18.2E** | **Complete** (gates + bass export) |
| **Phase 19** | **Complete** (UI ≤32 bars); longer forms not fully in UI |
| **Song Mode D-phase** | **D1** intent resolution + C1–C7: **done** per architecture doc; **D2** UI sliders → `intent`: **in progress** (wire contract notes: pattern 0.5); **D3** reserved |
| **Big Band + String Quartet — follow-ups** | **Chord input:** wired (Generate). **In progress:** **piano naming** fix (import labels); **String Quartet piano part** (fifth staff) — see [CHANGELOG.md](CHANGELOG.md) |
| **Python engines** (`engines/wayne-shorter-engine`, `shorter-form-engine`, etc.) | **Not** integrated into Composer OS TS Generate path |
| **Roadmap doc (#16)** | README still lists chord robustness as ongoing UX/edge-case work (see architecture for partial completion notes) |

---

## Future (prioritized directions)

### Near term (high leverage)

1. **Wayne Shorter “engine integration” (product meaning)** — deepen **Composer OS** integration: style modules, duo grammar, or UI surfacing; distinguish from standalone Python `wayne-shorter-engine`.
2. **Piano part (String Quartet) + piano naming polish (Big Band):** fifth staff / comping part and Sibelius-friendly piano labels — chord input for both ensembles is wired (see CHANGELOG).
3. **Song Mode diversity:** expose **`styleStack`** (or presets) in UI; complete **D2** intent wiring per architecture.
4. **18.2D verification sweep** — automated harness on new bass/phrase layer (parallel track).

### Medium term

- **Voice 2:** Phase **18.2B.3**-style melodic imitation / counterpoint refinement.
- **Phase 19.1** — forms **>32 bars** in UI where engine supports.
- **Wyble** — expressive/rhetorical refinement (rhythm, phrasing, lower voice).
- **Chord #16** — continued edge cases + UX messaging.

### Longer term / explicit non-goals until designed

- **D3** — undefined control surface.
- **Full** Python composer engines inside Electron without a bridge strategy.
- **creative-rule-engines** repo split — engine definitions live there per root README policy.

---

## Related paths

| Doc / code | Role |
|------------|------|
| [CHANGELOG.md](CHANGELOG.md) | Dated entries, phase completions |
| [README.md](../README.md) | Product narrative, phase summaries |
| [COMPOSER_OS_ARCHITECTURE.md](COMPOSER_OS_ARCHITECTURE.md) | C1–C7, D1–D3, pipeline diagram |
| `engines/composer-os-v2/app-api/releaseMetadata.ts` | Honest capability matrix |
| `docs/COMPOSER_OS_ROADMAP.md` | This roadmap (update title date when refreshing) |

---

*End of Composer OS Roadmap [2026-04-07].*
