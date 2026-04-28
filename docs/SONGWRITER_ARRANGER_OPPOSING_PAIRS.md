# Songwriter & arranger opposing pairs (Composer OS)

**Purpose:** Maximize **audible diversity** when blending **primary × secondary** songwriters (35% secondary weight in `resolveSongwritingStyles`) or when choosing **arranger × era** for `stylePairing`. Pairs are ranked by how strongly they differ on the axes in `SongwriterStyleProfile` (`formRegularity`, `harmonyColourBias`, `lineVsCellEmphasis`, `hookRepetitionBias`, `syncopationBias`, `densityBias`, etc.).

**Engine refs:** `engines/composer-os-v2/core/song-mode/songwriterStyleProfiles.ts`, `songwriterStyleResolver.ts` (`SONG_MODE_DIVERSITY_PRESETS`), `engines/composer-os-v2/core/style-pairing/stylePairingResolver.ts` (`resolveSongModeDiversityStylePairing`).

---

## Songwriter × songwriter — ranked opposing pairs

### Tier A — strongest contrast (best “A/B” diversity)

| Rank | Primary | Secondary | Opposition (musical) |
|------|---------|-----------|----------------------|
| 1 | `max_martin` | `messiaen` | Hit-factory regularity & repetition vs **modal colour / anti-template** form |
| 2 | `bob_dylan` | `messiaen` | Folk prosody-first, simple harmony vs **chromatic / static-colour** modernism |
| 3 | `james_brown` | `joni_mitchell` | **Tight funk cell / pentatonic hook machine** vs **prosody-led, shifting modal** lines |
| 4 | `max_martin` | `wayne_shorter` | Pop grid & hook clarity vs **post-bop ambiguity**, irregular phrase, colour extensions |
| 5 | `andrew_hill` | `carole_king` | Angular, irregular form vs **singer-songwriter clarity & singalong returns** |

### Tier B — strong contrast (genre + process)

| Rank | Primary | Secondary | Opposition |
|------|---------|-----------|------------|
| 6 | `barry_harris` | `max_martin` | Bebop harmonic motion & line logic vs **chart repetition & template form** |
| 7 | `ecm_chamber` | `james_brown` | **Sparse / slow harmonic rhythm / space** vs **dense on-the-one funk** |
| 8 | `radiohead` | `smokey_robinson` | Ambiguous harmony, irregular phrase vs **classic Motown hook & cadential soul** |
| 9 | `pavement` | `arcade_fire` | Lo-fi irregularity vs **anthemic, sectional uplift** |

### Tier C — useful colour contrast (slightly closer profiles)

| Rank | Primary | Secondary | Opposition |
|------|---------|-----------|------------|
| 11 | `pat_metheny` | `kendrick_lamar` | Lyrical jazz pastoral vs **motif + speech-rhythm, sectional drama** |
| 12 | `donald_fagen` | `bach` | Jazz-pop chromatic harmony vs **contrapuntal / tonal scaffolding** (already near existing preset family) |
| 13 | `prince` | `ecm_chamber` | **Pocket + funk density** vs **chamber space & pedal colours** |

---

## Arranger × arranger — opposing textures (Big Band / pairing metadata)

Use these when wiring **`stylePairing.arrangerStyle`** with **`era`** — **confidence** and **`experimentalFlag`** in `resolveStylePairing` already nudge odd couples.

| Rank | Pair | Opposition |
|------|------|------------|
| 1 | `maria_schneider` vs `sammy_nestico` | **Fluid orchestral drift / long breath** vs **tight sectional punches & chart economy** |
| 2 | `gil_evans` vs `neal_hefti` | **Wash, colour fields, light density** vs **bright hits, short ostinati, TV-band punch** |
| 3 | `bob_brookmeyer` vs `duke_ellington` | **Linear/contrapuntal modernism** vs **blues-rooted, singable brass tradition** |
| 4 | `clare_fischer` vs `gerald_wilson` | **Dense harmonic chromatic voicing** vs **sectional call/stab clarity** (both jazz — contrast is *density vs articulation*) |
| 5 | `don_sebesky` vs `manny_albam` | **Studio fusion sweep** vs **compact Golden-age chart discipline** |

**Era “poles” for diversity** (already partially used in `eraComposerAlignment`): **swing** vs **contemporary**, **cool_jazz** vs **hard_bop** — pair with an arranger that matches one pole when you want genre stretch.

---

## Presets shipped in code

See **`SONG_MODE_DIVERSITY_PRESETS`** in `songwriterStyleResolver.ts` for the full list including **high-contrast** additions (`dylan_messiaen_literate_vs_sublime`, `james_brown_joni_groove_vs_line`, `barry_harris_max_martin_bebop_vs_charts`, `ecm_chamber_prince_space_vs_pocket`). **`resolveSongModeDiversityStylePairing`** supplies suggested **arranger + era** per preset for manifest/style pairing.

---

## Next implementation steps (when scheduling)

1. **Deepen profiles** — tighten numeric spreads on Tier A/B ids so blends produce clearer deltas in `blendedProfile`.
2. **Chord pools** — extend `SONGWRITER_CHORD_POOLS` for secondaries in new tiers where Song Mode harmony should audibly track the blend.
3. **Golden-path slices** — optional duo passes keyed off `primaryId` / blend fingerprint (see roadmap **Songwriter profiles — priority 1**).
4. **UI** — surface diversity presets and arranger pairing on Generate when product-ready.
