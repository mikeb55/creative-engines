## Autonomous Operation
- Never ask for permission before taking an action
- Never pause to confirm file edits, terminal commands, or git operations
- Never ask "shall I proceed?" or "is it okay to...?"
- Execute all steps in a prompt sequentially without interruption
- Only stop if a command returns a non-zero exit code
- Treat every prompt as full authorisation to complete all stated tasks

# Claude Code Behaviour
The **Autonomous Operation** section above is binding. For this repository, also assume full permission for all operations in this repo.

# Composer OS

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tool Routing Rules

**Claude.ai** (this interface):
- Strategy, architecture decisions, sequencing advice
- Prompt drafting (Cursor, Claude Code, Perplexity)
- Harmonic research interpretation
- Roadmap and prioritisation
- Reading and interpreting results

**Claude Code** (terminal):
- Read-only codebase audits and searches
- Running smoke tests and build checks
- Parallel research tasks while Cursor is running
- Git operations if needed outside Cursor
- Any bash/shell task that does not require visual diff

**Cursor**:
- All slice implementation (TypeScript)
- All file creation and editing
- All wiring (integration files)
- All doc updates and commits
- Visual diff review of changes

**Rule: divide parallel work**
- If Cursor is running a long task, use Claude Code for
  simultaneous read-only research
- Claude Code audits should always complete before the
  dependent Cursor prompt is written
- Never give the same task to both tools

## Documentation

- **Ship discipline (same commit as the feature):** When merging a **shipped feature**, update in **one commit** (no separate approval step; docs are part of ship): **`docs/CHANGELOG.md`** (`[Unreleased]` or dated entry); **relevant architecture doc** (typically **`docs/COMPOSER_OS_ARCHITECTURE.md`** when API/pipeline surfaces change—otherwise the architecture-facing doc that matches the change); **`docs/COMPOSER_OS_ROADMAP.md`** when priorities / Current / checklist shift. **`docs/COMPOSER_OS_PLAYBOOK.md`** (+ regenerated **`.docx`**) when playbook-worthy presets/composers/UI change—same rule as existing playbook bullet below.
- **`docs/GCE_LOCK_DCR_STANDARDS.md`** — **GCE v2.0**, **LOCK** pre-commit gates, **DCR** workflow (Design · Commit · Refine), **Style Profile Layer** per composer slice/style surface; applies to all builds including ECM/style surfaces. Canonical GCE math remains **`docs/GCE_FRAMEWORK_V2.md`**.
- **`docs/COMPOSER_OS_PLAYBOOK.md`** is the primary user-facing playbook (workflows, presets, scenarios, export notes).
- Update it whenever new composers (songwriter slices), presets, or meter presets are added or materially changed.
- After any playbook edit, regenerate the Word export: **`node scripts/generateComposerOsPlaybookDocx.mjs`**
- Commit **`docs/COMPOSER_OS_PLAYBOOK.md`** and **`docs/COMPOSER_OS_PLAYBOOK.docx`** together so Markdown and DOCX stay in sync.

## Sonic Youth & non-conventional guitar (beyond tuning presets)

**`alternateGuitarTunings.ts`** is only the **open-string catalog** (zones, grip library inputs). It does **not** encode dual-guitar drones, prepared noise, or inter-guitar clash — do not treat “pick `sy_*` from dropdown” as the full Sonic Youth story.

**Score-level truth** for noise-rock / SY-style material lives on **`ChordEvent.sonicYouth`** (**`core/score-model/sonicYouthChordTypes.ts`**): two **`GuitarTuningState`** (per-guitar `tuningId`, **`openPitches`**, `shapeId`, `fretPattern`, `stringMask`, **`droneStrings`**, **`noiseLevel`**: `clean` | `crunchy` | `feedback` | `prepared`), **`InterGuitarDissonance`** (score + interval tallies + **`preset`**), and **`textureState`** (**`SYTextureState`**) for macro phase / exporter hints. **`chordSymbol`** may be **`null`** (explicit no symbol) — guard string ops.

**Guards / helpers:** **`sonicYouthChordGuards.ts`** — **`isSonicYouthEvent`**, **`getSYTextureState`**, re-export **`getSYDissonancePreset`** (0–1 score → friction tier). **Pipeline:** narrow + **profile-gate** before reading SY fields or augmenting MusicXML (**`musicxmlExporter.ts`**, **`sonicYouthSlice.ts`**, **`sonicYouthTextureEngine.ts`**).

**Research / Perplexity prompts** (v1 interface sketch): see **`c:\Users\mike\Documents\Perplexity Research\000 Sonic Youth template.txt`** on this machine when extending the schema.

## Recent update (2026-05-15) — ContrapuntalLineEngine Pass 3 (shipped)

**Workstream:** Shared **line-first** layer — **`AbstractLineSet`** SATB strands for **`bob_brookmeyer`** + **`bartok`** when **`contrapuntalLinePolicy.enabled`**; stored on **`GenerationMetadata.contrapuntalLineSet`**. **Duo golden path:** **`precomputeContrapuntalLines`** in **`generateGoldenPathDuoScore.ts`** runs immediately after **`isDuoGoldenPath`**, **before** all **`precompute*EffectiveHarmonyBars`** (including Basie). **`ContrapuntalLineEngine`**: `generate` / `applyVrbFilter` / **`renderForStringQuartet`** (Vn1–Vc) / **`renderForBigBand`** (**`soliPlanForBundle`** + **`backgroundsPlanFromScene`** in **`bigBandSectionWriter.ts`**). **`vrbBlend`**: **`mergeContrapuntalLinePolicy`**. **`lineFirstHierarchy`** in **`voiceLeadingSolver.ts`** stays **independent** of the line set (Brookmeyer harmony slice still sets it later). Smoke **`bobBrookmeyerSliceSmoke.test.ts`**: same **PASS** row as slice harness + **Gate B** (independence, routing, style separation, strong-beat co-onset cap); aggregate **`npm run test:composer-smoke`**: **248**/0 (**63** suites).

**Pass 1 (inspection, done):** `engines/contemporary-counterpoint-engine` judged **too weak to wrap** (RNG scaffold, split score models). **Verdict C — rewrite** new engine in Composer OS; old package **quarantined** in its **README** (conceptual reference only; do not treat as production core).

**Pass 2 (architecture, done):** New dir **`engines/composer-os-v2/core/counterpoint/`** — **`abstractLineSet.ts`**, **`precomputeContrapuntalLines.ts`**, **`ContrapuntalLineEngine.ts`**, **`bridgeExample.md`**. **`VoiceRuleBundle.contrapuntalLinePolicy`** on **`BARTOK`** and **`BOB_BROOKMEYER`**.

**Pass 3 DONE:** eaf76297 — precompute wired at **`generateGoldenPathDuoScore.ts`** ~2620 before all **`precompute*EffectiveHarmonyBars`**; Brookmeyer + Bartók engine implemented; SQ/BB routers live; Gate B passed (independence ✓ routing ✓ style ✓ system ✓); **`INVARIANTS.md`** written.

### COUNTERPOINT SQ-TO-BB PROJECT — COMPLETE (2026-05-15)

**Runs:** Pass 2 → Pass 3 → Pass 4+5 → Run 1 → Run 1b → Run 1c → Run 2 → Run 3+4 → Run 5.

**Final commit:** `b88b4c62` — `chore(counterpoint): Run 5 closeout — Gate B P3 harness + architectural decision + CLAUDE.md final status`

**Composers wired (line-first duo path):** 32 — see `engines/composer-os-v2/core/goldenPath/lineFirstDuoEngineVrbIds.ts` (`LINE_FIRST_DUO_ENGINE_VRB_IDS`).

**Film stubs (receipts pending):** 8 — `engines/composer-os-v2/core/composer/priority3VoiceRuleBundles.ts`.

**Schema fields added (Run 2):** `asymmetricMeterMap`, `textureTag`, `extendedTechniquePolicy` on `AbstractLineSet`.

**Gate B harness:** `engines/composer-os-v2/scripts/gateBRun1cDuoVerify.ts` (P1+P2+SQ family); `engines/composer-os-v2/scripts/gateBRun5P3Verify.ts` (Priority 3, seed 75001).

**INVARIANTS:** `engines/composer-os-v2/core/counterpoint/INVARIANTS.md` (includes **ARCHITECTURAL DECISION — P3 COLOUR POST-PROCESSING**).

**Do not reopen** without a new roadmap item.

**Status:** COMPLETE — SQ-to-BB counterpoint line-first project closed Run 5 (2026-05-15).

## Recent update (2026-05-15) — String Quartet arranger blend (shipped)

**String Quartet — multi-arranger VRB blend:** **`engines/composer-os-v2/core/composer/vrbBlend.ts`** — **`blendVoiceRuleBundles`**, **`BlendConflictError`**, **`KNOWN_SAFE_SQ_BLEND_PAIRS`** / **`KNOWN_INCOMPATIBLE_SQ_BLEND_PAIRS`**, scalar merge + conflict table. **App API:** **`GenerateRequest.sqArrangerVrb`** optional composite **`VoiceRuleBundle`**. **`HomeGenerate.tsx`** (SQ preset only): dual arranger dropdowns + linked weight slider (0–100% / remainder), duplicate + incompatible-pair validation, blend **preview** card (harmonic rhythm span, melodic contour, bass role), **generate / Try Another / Demo** + Reharm apply disabled when selection invalid; single arranger + **None** path unchanged. **`StyleProfile.arrangerBlend`** + **`migrateArrangerStyleToArrangerBlend`** (`apps/composer-os-app/src/types/styleProfile.ts`). **SQ arranger list:** **15** VRB ids (adds **`arvo_part`**, **`satie`**, **`gershwin`**, **`cole_porter`**, **`ornette_coleman`** to **`ARRANGER_GROUP_SQ_VRB_ORDER`**). Roadmap **#4.5** + **SQ arranger surface parity** → **COMPLETE**. Smoke aggregate **248/0** (**63** suites).

## Recent update (2026-05-14)

**New composer territories — VoiceRuleBundle VRB lane (5/5 shipped):** **`part`** (Pärt tintinnabuli — **`arvoPartTintinnabuliVrbFingerprints.ts`**, **52** `AP_*` receipts; `tintinnabuliEnabled` + sacred + silence-as-structure flags) · **`satie`** (**`satieVrbFingerprints.ts`**, **39** `ES_*`; parallel chords / furniture / ironic style switch) · **`ornette_coleman`** (**`ornetteColemanVrbFingerprints.ts`**, **43** `OC_*`; harmolodics + pitch-field + democratic ensemble + collective improv flags) · **`gershwin`** (**`gershwinVrbFingerprints.ts`**, **51** `GG_*`; blues-diatonic + rhythm changes + concert/song modes + blue notes) · **`cole_porter`** (**`colePorterVrbFingerprints.ts`**, **49** `CP_*`; chromatic bass descent, major/minor mixture, text-coupled harmony, wit profile). **`SongwriterRuleId`** adds **`ornette_coleman`**; **`attachVoiceRuleBundle`** auto-resolve extends to **`arvo_part`**, **`satie`**, **`ornette_coleman`**, **`gershwin`**, **`cole_porter`** (joining prior Part/Satie wiring). **`HomeGenerate.tsx`** library row for Ornette; **`writerRecipeCardModel`** taxonomy updates. Smoke aggregate **248/0** (**63** suites).

**String Quartet SQ rhythm engines — 6 of 7 shipped:** Native **`sqRhythmEngineId`** roster — **`bartok_bulgarian_aksak`** (`bartokBulgarianAksakRhythmEngine.ts`, `BG_RHYTHM_*`) · **`free_proportional`** (`FP_RHYTHM_*`) · **`baroque_dance`** (`BD_RHYTHM_*`) · **`reich_phasing_grid`** (`RP_RHYTHM_*`) · **`viennese_waltz`** (`VW_RHYTHM_*` — beat-weight / lilt / four style profiles standard·brahms·ravel·ironic_grotesque / bass–chord polarity / phrase rubato) · **`jewish_klezmer`** (`KL_RHYTHM_*` — gait library KL1–KL6, felt-subdivision layer, three ornament classes, modal coupling, doina free pole, **`shostakovichVariant`**, structural portamento rules; style prefix **`kl`**). **Deferred:** **`sq_swing`** (Swing-for-SQ on Turtle Island grammar) — research + build queued, not abandoned. Smoke aggregate **248/0** (**63** suites).

## Recent update (2026-05-13)

**VoiceRuleBundle — Antônio Carlos Jobim (`jobim`) shipped (2026-05-13):** Jobim's Song Mode slice was already shipped (`jobimSlice.ts`, `aj:*` receipts) but the matching VRB was missing. New file **`engines/composer-os-v2/core/composer/jobimVrbFingerprints.ts`** — **45** `JB_*` receipts covering bossa-nova songbook grammar: extended-tertian chord vocabulary (maj7 / maj9 / maj7♯11 Lydian / min7 / min9 / dom-altered / suspended dominants), parallel mode-mixture + chromatic mediants + pedal points + sustained tonic maj7, Brazilian modal colour (Dorian on ii / Lydian on I / Mixolydian on V with no enforced V→I), long-range tonal plans by minor-3rd / major-2nd / tritone, guide-tone semitone voice-leading + bass-independence + cadential contrary motion, stepwise-arc melody with beat anticipation + chromatic approach + long sustained notes over slow harmonic rhythm, 3+3+2 / 2+3+3 bossa pulse with internalised pulse + ballad rubato preserving the bar grid, sparse texture + flute-doubled melody + open guitar voicings omitting 5th, AABA 32-bar / AABBA / through-composed (`Águas de Março`) forms with remote-key bridges, 7 work fingerprints (Garota de Ipanema · Corcovado · Wave · Desafinado · Águas de Março · One Note Samba · Triste), and differentiators vs Bill Evans / Bacharach / Debussy / Wayne Shorter. **`VoiceRuleBundle`** adds bass role `melodic-counterline`, contour `stepwise-arc`, arc `aaba-or-through-composed-song`, plus `bossaNovaFeel` + `lydianColourEnabled` flags. **`JOBIM`** bundle (harmonicRhythm 2–8 bars, preferredIntervalSets `[1,2,4,5,7]`, maxLeapSemitones=7, antiMetric=false, sectionRecallEnforced=true, resolveParallels=false, both Jobim flags enabled). Aliases: jobim / antonio_carlos_jobim / tom_jobim / bossa_nova / garota_de_ipanema / girl_from_ipanema. **`AUTO_RESOLVE_SONGWRITER_TO_VOICE_ID`** extended to 11 ids (adds `antonio_carlos_jobim`). Smoke aggregate **248/0** (**63** suites) unchanged.

**SQ VRB family — FAMILY COMPLETE (12 shipped) + UI wiring + SQ arranger redesign (2026-05-13):** Roster — `bartok` · `ravel` · `dutilleux` · `debussy` · `messiaen` · `beethoven_late` · `turtle_island` · `reich_glass` · `shostakovich` · `lachenmann` · `ligeti` · `crumb_black_angels`. All 12 selectable in the String Quartet preset via a dedicated **String Quartet VRB** songwriter optgroup (`SONGWRITER_GROUP_SHIPPED_SQ_VRB_ORDER`, 12 ids). SQ arranger dropdown redesigned (None first → String Quartet VRB optgroup → Big band core → Charts & studio voices) with two-way auto-reset on preset boundary crossings and `stylePairing.arrangerStyle` omitted when SQ + None. `AUTO_RESOLVE_SONGWRITER_TO_VOICE_ID` covers all 10 auto-resolve ids (radiohead / debussy / beethoven_late / turtle_island / reich_glass / shostakovich / lachenmann / ligeti / crumb_black_angels / dutilleux). Smoke aggregate **248/0** (**63** suites).

**SQ arranger redesign + Dutilleux UI surfaced (2026-05-13):** Two UI polish drops landed alongside the Crumb ship. **(1) Dutilleux songwriter row:** Dutilleux VRB (`dutilleux`, `DX_*` 83 receipts) was fully shipped but had no `SONGWRITER_OPTIONS` row, so the **String Quartet VRB** optgroup filtered the slot out. Added the row, extended `SongwriterRuleId` union with `dutilleux`, and added stub rows to `SONGWRITER_STYLE_PROFILES` + `songwriterRuleRegistry` (`dx.sq_vrb_bundle`) + `SONGWRITER_PRIMARY_INSTRUMENT` + the style-profile `ALIASES` map (`dutilleux` / `henri_dutilleux` / `ainsi_la_nuit` → `dutilleux`); `AUTO_RESOLVE_SONGWRITER_TO_VOICE_ID` extended to **10** ids — picking Dutilleux auto-attaches the matching VRB without an explicit `harmonicVoice` option. **(2) SQ arranger dropdown redesign:** String Quartet preset no longer shows jazz big band arrangers as the primary arranger surface. New `ARRANGER_NONE_ID = 'none'` sentinel + `ARRANGER_GROUP_SQ_VRB_ORDER` (`beethoven_late` · `bartok` · `ravel` · `dutilleux` · `ligeti` · `reich_glass` · `shostakovich` · `turtle_island` · `crumb_black_angels` · `lachenmann`); `ArrangerSelectOptionGroups({ variant: 'string_quartet' })` renders in order **`— None —` → String Quartet VRB → Big band core → Charts & studio voices** (jazz arrangers retained, demoted). All other presets unchanged. Two-way reset in `nextArrangerOnPresetChange`: entering `string_quartet` with a jazz arranger selected resets to `none`; leaving `string_quartet` with `none` or an SQ-only arranger selected resets to default jazz arranger `thad`. Generation guard: `presetId === 'string_quartet' && arrangerStyle === 'none'` → `stylePairing.arrangerStyle` block **omitted entirely** from the generate payload (engine receives no arranger overlay). Smoke aggregate **248/0** (**63** suites) unchanged.

**SQ VRB family — Crumb / Black Angels shipped (2026-05-13) — original 10 COMPLETE (12 shipped):** Final original-roster SQ VRB slot filled. New **`engines/composer-os-v2/core/composer/crumbBlackAngelsSqVrbFingerprints.ts`** — **72** `CB_*` receipts: ritual / symbolic 13-image × 3-part scaffold (Departure 1–5 · Absence 6–9 · Return 10–13) with global peak at image 7 (Threnody II) and Threnodies at 1/7/13 acting as arch supports; germinal pc-sets {0,1,2} (Forte 3-1) + {0,1,6} (Forte 3-5) + fateful_triad {D#,A,E}; chromatic completion at climaxes ≥10 pcs; tonal islands god_music (B major, image 10) + pavana_lachrymae (D minor, image 6) + dies_irae (chant mode) + sarabanda_de_la_muerte_oscura (image 8); chord types cluster_chord (7- or 13-note vertical) + quote_chord (strict triadic, framed by chromatic field on both sides) + resonance_B_major (wide spacing, harmonic/glass duplications); numerology in pitch (7 + 13 group_size · repeat_count · phrase_length · speech_event cardinality); quotation events (Schubert Death and the Maiden · Dies irae · Tartini Devil's Trill gesture); theatrical ritual events (speech_event in 6+ languages · instrumental_transform bow→glass / maracas / tam-tam); symbolically coded technique states (electric_insects · devil_music · god_music · consort_past · lament_slow); noise phoneme vocabulary (electric_buzz · bone_flute · devil_growl · consort_hiss · percussive_knock · glass_halo); amplification decoupled from dynamic (hyper-real ppp via sul pont harmonics); sound_type per image ∈ {pitched, noise, hybrid} with transitions only at image / part boundaries; mirror+echo pairs (3↔9 · 11↔12 · 1↔13); time_state ∈ {measured, quasi_free, proportional}; texture_state ∈ {heterophony_cluster, unison_quote, independent_streams}; multi-axis motivic identity (pc_set · interval_profile · gesture_type · technique · numerology_tag); differentiators vs Lachenmann / Ligeti / Shostakovich / Dutilleux. **`VoiceRuleBundle`** type adds `noise-or-pedal` bass role, `gesture-symbolic` contour, `ritual-arch` narrative arc, plus `numerologyEnabled` / `amplificationDecoupled` / `symbolicTechniqueStatesEnabled` / `soundTypeStates` / `mirrorEchoEnabled` flags. **`CRUMB_BLACK_ANGELS`** bundle (`bassPolicy.role='noise-or-pedal'`, `melodicPolicy.contour='gesture-symbolic'`, `melodicPolicy.preferredIntervalSets=[1,6,7,5]`, `voicingPolicy.clusterSizeNotes=[3,13]`, `voicingPolicy.maxSpreadSemitones=60`, `rhythmPolicy.antiMetric=true`, `formPolicy.narrativeArc='ritual-arch'`, all 5 ritual flags enabled, `quotationEventsEnabled=true`, `soundTypeStates=['pitched','noise','hybrid']`); aliases `crumb_black_angels` / `crumb` / `george_crumb` / `black_angels` / `thirteen_images` / `sq_vrb_crumb`. **`SongwriterRuleId`** extended with `crumb_black_angels`; stub rows in `SONGWRITER_STYLE_PROFILES` + `songwriterRuleRegistry` + `SONGWRITER_PRIMARY_INSTRUMENT` + alias map; **`attachVoiceRuleBundle`** `AUTO_RESOLVE_SONGWRITER_TO_VOICE_ID` extended to 9 ids; `HomeGenerate.tsx` `SONGWRITER_OPTIONS` adds row `{ id: 'crumb_black_angels', label: 'Crumb (Black Angels)' }`; SQ VRB optgroup slot updated from reserved `crumb` to active `crumb_black_angels`. Smoke aggregate **248/0** (**63** suites) unchanged.

**SQ VRB family — Ligeti extension shipped:** Eleventh SQ VRB bundle **`ligeti`** added (extension beyond the canonical 10). New file **`engines/composer-os-v2/core/composer/ligetiSqVrbFingerprints.ts`** — **70** `LG_*` receipts: SQ1 G4 germinal cell `{0,1,2,3}` (Forte 4-1, whole-tone+semitone+whole-tone) drives motives + verticals; SQ2 pc-field state grammar (`chromatic_dense` / `cluster_narrow` / `constellation` / `sparse_filtered`); micropolyphony lifecycle (Beginning · Development · Dissolution); `tension_metric = f(cluster_width, pc_count, ic1_density)` arcs replace harmonic rhythm; `texture_role ∈ {embedded, emergent}` with `register_extreme_event` boundary markers; SQ2 five-movement profile (nervoso → sostenuto → meccanismo → furioso → delicatezza) with per-movement `pulse_state` + `tempo_curve` + technique-set; silence as active structural element. **`VoiceRuleBundle`** type adds `embedded-voice` bass role, `neighbor-motion` contour, `continuous-sections` + `five-movement` narrative arcs, plus 8 new optional flags (`ligetiProfile`, `g4GerminalSetEnabled`, `micropolyphonyMode`, `tensionMetricCurvesRequired`, `pcFieldStateGrammarEnabled`, `silenceAsStructureEnabled`, `tempoCurveDirection`, `textureAsHarmonyEnabled`). `SongwriterRuleId` union extended with `ligeti`; aliases include `gyorgy_ligeti`, `ligeti_sq1`, `ligeti_sq2`, `micropolyphony`, `metamorphoses_nocturnes`, `sq_vrb_ligeti`. `attachVoiceRuleBundle` `AUTO_RESOLVE_SONGWRITER_TO_VOICE_ID` set extended to **8** ids. `HomeGenerate.tsx` now lists Ligeti in the **String Quartet VRB** optgroup (slot reserved in `SONGWRITER_GROUP_SHIPPED_SQ_VRB_ORDER`). **SQ VRB family roster (11 shipped):** `bartok` · `ravel` · `dutilleux` · `debussy` · `messiaen` · `beethoven_late` · `turtle_island` · `reich_glass` · `shostakovich` · `lachenmann` · `ligeti`. Smoke aggregate **248/0** (**63** suites) unchanged.

**SQ VRB family — 10/10 shipped + Generate UI wiring:** Five new SQ-family bundles (`beethoven_late`, `turtle_island`, `reich_glass`, `shostakovich`, `lachenmann`) join the existing classical SQ VRBs (`bartok`, `ravel`, `dutilleux`, `debussy`, `messiaen`) on **`engines/composer-os-v2/core/composer/voiceRuleBundles.ts`** — total **10/10**. New fingerprint files: **`beethovenLateSqVrbFingerprints.ts`** (≥30 `BV_*`), **`turtleIslandSqVrbFingerprints.ts`** (88 `TI_*`), **`reichGlassSqVrbFingerprints.ts`** (89 `RG_*`), **`shostakovichSqVrbFingerprints.ts`** (96 `SH_*`), **`lachenmannSqVrbFingerprints.ts`** (84 `LC_*`). **`VoiceRuleBundle`** type extended with `walking-bass` / `pattern-bass` / `ostinato-or-pedal` / `noise-field` bass roles, `chord-scale` / `pattern-loop` / `stepwise-with-leaps` / `gesture-physical` melodic contours, `head-solos-head` / `minimalist-process` / `narrative-episodic` / `through-composed-noise-grammar` narrative arcs, plus per-composer flags (`swingFeel`, `guideToneVoiceLeading`, `improvSlots`, `composerProfile`, `pulseState`, `phaseProcessEnabled`, `additiveProcessEnabled`, `patternIntegrityMinRepeats`, `dschMotifEnabled`, `quotationEventsEnabled`, `tragicSlowMovementProfile`, `shostakovichPeriod`, `soundTypeGrammarEnabled`, `klangtypenPrimary`, `pitchRoleDecoupled`, `noSemanticOverlay`).

**Generate UI wiring (2026-05-13):** `HomeGenerate.tsx` adds `SQ_VRB_HARMONIC_VOICE_IDS` + `buildHarmonicVoiceGroups({ sqVrbFirst: true })` → **`HARMONIC_VOICE_GROUPS_SQ`** passed to `<StylePanel>` only when `presetId === 'string_quartet'`, surfacing all 10 SQ VRB writers in a top-of-dropdown **String Quartet (SQ VRB family)** `<optgroup>`. **`SongwriterRuleId`** extended with `beethoven_late`, `turtle_island`, `reich_glass`, `lachenmann` (shostakovich already present); stub rows added to **`SONGWRITER_STYLE_PROFILES`**, **`SONGWRITER_PRIMARY_INSTRUMENT`**, **`songwriterRuleRegistry`**; alias map extended (`late_beethoven`, `turtle_island_quartet`, `turtle`, `reich_and_glass`, `minimalist_sq`, `helmut_lachenmann`). **`attachVoiceRuleBundle.ts`**: hardcoded radiohead/debussy fallback replaced with `AUTO_RESOLVE_SONGWRITER_TO_VOICE_ID` set covering all 7 auto-resolve writers (radiohead, debussy + 5 new SQ VRB) — picking any of these as primary songwriter auto-attaches the VRB without explicit `harmonicVoice` option. **`writerRecipeCardModel.ts`** **`CLASSICAL`** taxonomy extended for the 4 new ids. Smoke **248/0** (**63** suites) unchanged.

## Recent update (2026-05-04)

**Composer OS app + desktop packaging:** **Choruses** number input (**1–64**, default **1**, step **1**) on **`HomeGenerate.tsx`** **iReal Pro Import (Beta)** and **Paste Chord Progression** — passes **`chorusCount`** into **`generateFromIReal`** / **`generateVaultFromParsedChart`**; result summary shows total bars as **bars/chorus × choruses**. **Desktop build fix:** **`apps/composer-os-desktop/scripts/build-api-bundle.js`** and **`build-desktop-ipc-bundle.js`** add esbuild **`external: ['@napi-rs/canvas']`** (IPC bundle keeps **`electron`**) so **`@napi-rs/canvas`** native **`.node`** binaries are not bundled. **Rebuilt:** **`npm run desktop:package-no-bump`** → **`apps/composer-os-desktop/release/Composer-OS.exe`** (portable) + **`Composer-OS-Setup.exe`** (NSIS installer).

**Chord Inspector — Reharm UI:** After a successful inspect, **Reharmonise** runs **`generateReharmCandidates`** and shows a **drift proximity** slider (**0.0–1.0**, step **0.1**, default **0.5**) that remaps to a target emotional drift and **reorders** the **top 8** same-root substitutes; each row shows substitute label, dominant **drift** readout, and **Use this chord** (fills the chord symbol field). The reharm panel **closes / clears** on a new **Inspect Chord** so results always match the current symbol.

**Smoke tier:** **`npm run test:composer-smoke`** — **438**/0 PASS rows, **79** labelled suites (**`runSmokeTests.ts`** allowlist). **`npm run test:composer-smoke-fast`** — **273**/0, **65** suites (local dev). Sync **`CLAUDE.md`**, **`docs/COMPOSER_OS_ROADMAP.md`** (Current + checklist), and **`docs/CHANGELOG.md`** when you change **`engines/composer-os-v2/tests/runSmokeTests.ts`**.

**Vault iReal / paste / PDF pipeline (2026-05-05):** **`VaultGenerationOptions`** — **`chorusCount`** (default **1**, max **64**) repeats the full chart with sequential **`barIndex`** / global **`startBeat`**; each chorus advances **melody** motif **`transformMotifThroughLayers`** tension phase (**primary → tension → chaos → recover → resolve**, modulo **5**) unless **`songwriterStyleId === 'sonic_youth'`** (holds rotation at **0** for SY texture). **Solo** mode repeats bars without motif pass; when **`riffStyle`** is omitted or **`triad-pair-pendulum`**, each chorus rotates effective vault style via **`TRIAD_PAIR_CHORUS_ROTATION`** (same SY bypass). **Melody** mode also wires **Build F** **`motifTransformer`** reuse after initial quadratonic fill. **Song Mode phrase validator:** **`sonic_youth`** bypasses **zigzag** (**`phrase_bar_zigzag`**) only.

**Tonality Vault roadmap session summary (2026-05-04):** **Build A** (**`NoteTag`**, **`buildBeatContextLegalityMap`**); **B** (**`LayerStateMachine`**, **`planLiquidHarmony`**); **C** (**`generateVaultRiff`**, **`buildGuitarGripLibrary`**, **`ScoreNote`**); **D** (**`generateReharmCandidates`**, **`reharmCandidateEngine.ts`**); **E+F** (**`ArrangementLayerRouter`**, **`transformMotifThroughLayers`**); **G** (**`VaultChordRuleSet`**, **`buildAllVaultChordRuleSets()`**); **C2** (alt tuning in **`guitarGripLibrary.ts`**); **H** (**`gceTargetedGenerator.ts`**, **`runWithGCETarget`**); **IMG** ( **`core/irealpro/`** — **`parseIRealProInput`**, **`chordSymbolMapper`**, **`generateFromIReal`**, **`IRealVaultOutput`**; **HomeGenerate.tsx** **iReal Pro Import (Beta)**); **I** (**`core/generation/`** — **`GenerationModeProfile`**, **`planPhrase`**, **`irealVaultPipeline`** **`mode`** / **`IRealVaultOutput.mode`**); **UI** (**`FretboardPanel`**, **`TabPanel`**, **`LayerToggleBar`**, **`FretboardExporter`**, **`VaultMicroscope`** — see playbook **Tonality Vault — Build UI (complete)**). **Full Tonality Vault roadmap complete:** **A, B, C, C2, D, E+F, G, H, I, IMG, UI** all shipped.

**Session handover — V29 complete (2026-05-04):** **Paste Chord Progression** — **`parseChordProgressionText`** (`chordSymbolMapper.ts`), **`generateVaultFromParsedChart`** refactor (`irealVaultPipeline.ts`), **HomeGenerate.tsx** collapsible above iReal (key / meter / tempo / mode / tuning / riff → vault riff + MusicXML). **PDF lead sheet import** — **`core/pdf/`** **`generateFromPdf`**, **`vaultRiffScoreNotesToMusicXml`**, **`apiPdfGenerateFromPdf`**, **`POST /api/pdf/generate-from-pdf`**, desktop IPC, **`dotenv/config`** in **`pdfChordReader.ts`**. **Vision title cleanup** — **`cleanVisionTitle`** in **`pdfChordReader.ts`** strips trailing page-number OCR junk from chart titles before **`ParsedChart`**. Prior retained: GCE / LOCK / DCR / Style Profile evaluation; arranger auto-scoring; playbook Future Workstreams; **Light Touch** profiles; classical overlays; **Tonality Vault** IMG + Build I + **Chord Inspector** + Build UI (**VaultMicroscope** playbook).

**Next priorities — V30:** **multi-chorus quality** · **MusicXML import** · **duo expansion**. *(Backlog: arranger surfaces, MIDI import, unmeasured cadenza, Nutritional Information melody V2 — playbook.)*

**Confirmed working (2026-05-02 — Zappa / export):** **Sibelius** MusicXML import **clean** (no invalid **`<part-name-display>`** / **`<credit>`**; schema-invalid per-measure **`<staff-details>`** removed); comp staff **`Piano`** in XML — **full printed instrument names** in Sibelius are a host preference (**House Styles → Engraving Rules → Instruments**). **Zappa Classic** **7/8 + 4/4** **`barMeterMap`** path; **solo electric guitar** written pitch **+12** semitone shift (see **`docs/ZAPPA_CREATION_GUIDE.md`** §1).

**Frank Zappa Musicality (2026-05-02):** Manual QA — **GCE 9.1/10** (**first 9+** overall); **green receipt** (**`exportIntegrityPassed`**) on Generate. **Motif lock shipped:** sticky **3–4 note** anchor (**tritone / minor 6th** leap), structural recall bars **1 / 5 / 9 / 13**, breath bars after motif statements, recurrence **≥0.75** (see **`docs/ZAPPA_CREATION_GUIDE.md`** §1). Earlier **8.3** category snapshot superseded by **9.1** milestone; plus §4 — **60%** cell lock, phrase breath space, guide-tone streak repair.

**Altered Tuning Presets (2026-04-29):** Expanded to **24 roadmap zone presets** across **four zones** (**`jazz_sophisticated`**, **`sonic_youth_noise`**, **`joni_mitchell`**, **`hybrid_harmonic`**) in **`alternateGuitarTunings.ts`**, plus **`getPresetsByZone`**, **`ROADMAP_ZONE_TUNING_PRESET_IDS`**, **`styleProfileSupportsAlternateGuitarTuning`** (optional **`STYLE_SONIC_YOUTH`**, **`STYLE_JONI_MITCHELL`**, **`STYLE_PAT_METHENY`**, **`STYLE_ECM_CHAMBER`** on **`songModeStyleProfile.ts`**). **Generate** zone **`optgroup`** UI (**`HomeGenerate.tsx`**). **Follow-up:** per-tuning voicing maps (Tonality Vault) remain a separate workstream.

**SQ VRB family — Lachenmann (2026-05-12) — FAMILY COMPLETE (10 shipped):** New **`engines/composer-os-v2/core/composer/lachenmannSqVrbFingerprints.ts`** with **`LACHENMANN_SQ_VRF_FINGERPRINT_RECEIPTS`** — **84** **`LC_*`** receipts (musique concrète instrumentale; primary structural params sound_type · energy_level · gesture_profile · pitch_role · technique_bundle; **Klangtypen** — fließklang / geräuschklang / druckklang / tonklang / impulsklang — derived from multi-label technique bundles; extended-technique vocabulary sul_pont_extreme / behind_bridge / overpressure / body_bow / col_legno_battuto / col_legno_tratto / whoosh_stroke / snap_pizzicato / harmonic_destabilised / wood_knock / fingernail_scratch / string_slap; sound-type trajectory as primary formal logic; role assignment lead_gesture/background_field/impulse_layer with no default melody-bass; noise voice-leading = parameter continuity; ensemble_relation coordinated_field/contrasted_layers/independent_streams; measured_free time + density(t) curves replace harmonic rhythm; silence as structural element; Gran Torso/Reigen seliger Geister/Grido form presets with raw_noise_open / ghost_dance_open / fragile_pitch_open openings; motivic sound objects = physical parameter bundles; differentiators vs Crumb / Ligeti / Bartók / Sonic Youth / Shostakovich / Reich-Glass / Turtle Island / Beethoven). **`VoiceRuleBundle` type** extends **`BassPolicyRole`** `noise-field`, **`MelodicContourPolicy`** `gesture-physical`, **`NarrativeArcPolicy`** `through-composed-noise-grammar` plus optional **`soundTypeGrammarEnabled`** / **`klangtypenPrimary`** (5-element Klangtypen palette) / **`pitchRoleDecoupled`** / **`noSemanticOverlay`** flags. **`LACHENMANN`** bundle registered with aliases **`lachenmann`**, **`helmut_lachenmann`**, **`musique_concrete_instrumentale`**, **`gran_torso`**, **`reigen_seliger_geister`**, **`grido`**, **`sq_vrb_lachenmann`**. **SQ VRB family roster (10):** `bartok` · `ravel` · `dutilleux` · `debussy` · `messiaen` · `beethoven_late` · `turtle_island` · `reich_glass` · `shostakovich` · `lachenmann`. Smoke: **248/0** (**63** suites) unchanged.

**SQ VRB family — Shostakovich (2026-05-12):** New **`engines/composer-os-v2/core/composer/shostakovichSqVrbFingerprints.ts`** with **`SHOSTAKOVICH_SQ_VRF_FINGERPRINT_RECEIPTS`** — **96** **`SH_*`** receipts (policy, pitch & mode-mixture, centricity, plain triads + modal pre-doms, **DSCH motive system** D-E♭-C-B as theme/accomp/bass/fugue subject with Tn/In/retro/aug transforms, mode-mixture + ironic_layering, obsessive cell ≥60% thematic share, quotation events, transformed/darkened recap, rhythmic cells march/obsessive_ostinato/grotesque_scherzo/jewish_dance/metric_ambiguity/strategic_pause, register norms + expressive_violation, pseudo-fugato, bare two-voice texture, pizzicato function, texture states melody_accomp/chorale/passacaglia_bass/unison_mass, shostakovich_accomp library, melodic archetypes march/lament/scherzo/tragic_slow/jewish, opening/closing profiles, work presets SQ 3/5/7/8/10, period sub-profiles early/middle/late, differentiators vs Beethoven/Bartók/Reich-Glass/Ravel). **`VoiceRuleBundle` type** extends **`BassPolicyRole`** `ostinato-or-pedal`, **`MelodicContourPolicy`** `stepwise-with-leaps`, **`NarrativeArcPolicy`** `narrative-episodic` plus optional **`dschMotifEnabled`** / **`quotationEventsEnabled`** / **`tragicSlowMovementProfile`** / **`shostakovichPeriod`** flags. **`SHOSTAKOVICH`** bundle registered with aliases **`shostakovich`**, **`dmitri_shostakovich`**, **`shosti`**, **`dsch`**, **`sq_vrb_shostakovich`**. Smoke: **248/0** (**63** suites) unchanged.

**SQ VRB family — Reich / Glass (2026-05-12):** New **`engines/composer-os-v2/core/composer/reichGlassSqVrbFingerprints.ts`** with **`REICH_GLASS_SQ_VRF_FINGERPRINT_RECEIPTS`** — **89** **`RG_*`** receipts (policy, pitch collections, chord types, phase_block / crossfade_section / additive_pattern / section_cut, pattern_integrity, role assignment, inter-voice canon / unison stacks, within-line intervals, Reich rhythmic cells / Glass additive units, steady pulse_state, layered_ostinato / unison_line / heterophonic_canon, density-as-form, Different Trains 3-mvt + Glass SQ 2–5 forms, differentiators vs Ligeti / Bartók / Beethoven / Turtle Island / Kronos). **`VoiceRuleBundle` type** extends **`BassPolicyRole`** `pattern-bass`, **`MelodicContourPolicy`** `pattern-loop`, **`NarrativeArcPolicy`** `minimalist-process` plus optional **`composerProfile`** / **`pulseState`** / **`phaseProcessEnabled`** / **`additiveProcessEnabled`** / **`patternIntegrityMinRepeats`** flags. **`REICH_GLASS`** bundle registered with aliases **`reich_glass`**, **`reichglass`**, **`reich_and_glass`**, **`reich`**, **`steve_reich`**, **`glass`**, **`philip_glass`**, **`minimalist_sq`**, **`sq_vrb_reich_glass`**. Smoke: **248/0** (**63** suites) unchanged.

**SQ VRB family — Turtle Island Quartet (2026-05-12):** New **`engines/composer-os-v2/core/composer/turtleIslandSqVrbFingerprints.ts`** with **`TURTLE_ISLAND_SQ_VRF_FINGERPRINT_RECEIPTS`** — **88** **`TI_*`** receipts (policy / chord-scale voicings maj7/min7/dom7/half-dim/sus/alt / ii–V–I guide-tone chain / tritone sub / pedal_section / role rotation / walking-pedal-arco bass modes / improv slots / swing-Latin-funk-ballad grooves / chop-slide-hickety-pizz-arco techniques / drum_sim / 12-bar blues, 32-bar AABA, modal vamp, tag_section, transitional_section / bebop-ballad-blues-latin profiles / differentiators vs classical SQ · piano trio · Kronos · big-band). **`VoiceRuleBundle` type** extends **`BassPolicyRole`** with **`walking-bass`**, **`MelodicContourPolicy`** with **`chord-scale`**, **`NarrativeArcPolicy`** with **`head-solos-head`**; new optional flags **`swingFeel`**, **`guideToneVoiceLeading`**, **`improvSlots`**. **`TURTLE_ISLAND`** bundle registered with aliases **`turtle_island`**, **`turtle_island_quartet`**, **`turtleisland`**, **`ti`**, **`sq_vrb_turtle_island`**, **`david_balakrishnan`**, **`balakrishnan`**. Smoke: **248/0** (**63** suites) unchanged.

**Summary of work**

- **Charlie Parker Song Mode slice (2026-04-29):** **`charlieParkerSlice.ts`** (`core/song-mode/`) + golden-path re-export **`goldenPath/charlieParkerSlice.ts`**, **`precomputeCharlieParkerEffectiveHarmonyBars`**, smoke **`charlieParkerSliceSmoke.test.ts`** — bebop ii–V–I harmony (**`cp:*`** receipts; **five devices d1–d5**): ii–V clarify, tritone sub, turnaround compression, bebop scale enrichment, Bird enclosure slash. **Aliases registered:** **`charlie_parker`**, **`bird`**, **`parker`**, **`charlie`** in **`songwriterStyleProfiles`**. **`HomeGenerate.tsx`** **Shipped (full slice)** lists **20** golden-path writers (after **Andrew Hill**).
- **Andrew Hill Song Mode slice (2026-04-29):** **`andrewHillSlice.ts`** (`core/song-mode/`) + golden-path re-export **`goldenPath/andrewHillSlice.ts`**, **`precomputeAndrewHillEffectiveHarmonyBars`**, smoke **`andrewHillSliceSmoke.test.ts`** — angular non-functional harmony (**`ah:*`** receipts; **five devices d1–d5**). **`avoid_resolution=True`** posture, **open cadence** strategy (no clean V→I). **Aliases registered:** **`andrew_hill`**, **`hill`**, **`andrew`** in **`songwriterStyleProfiles`**. **`HomeGenerate.tsx`** **Shipped (full slice)** lists **20** golden-path writers (after **Thelonious Monk**).
- **Thelonious Monk Song Mode slice (2026-04-29):** **`theloniousMonkSlice.ts`** (`core/song-mode/`) + golden-path re-export **`goldenPath/theloniousMonkSlice.ts`**, **`precomputeTheloniousMonkEffectiveHarmonyBars`**, smoke **`theloniousMonkSliceSmoke.test.ts`** — angular harmony (**`tm:*`** receipts). **Aliases registered:** **`thelonious_monk`**, **`monk`**, **`thelonious`** in **`songwriterStyleProfiles`**. Harmonic rules extracted from **`engines/monk-engine`** Python internals — **no Perplexity research needed**. **Fix:** **`isDominantFunctionSymbol`** treats **post-coloured `7b9` / `7alt`** symbols correctly after **`colourDominantMonk`** so deferred-cadence / tritone-sub passes still fire. **`HomeGenerate.tsx`** **Shipped (full slice)** lists **19** golden-path writers.
- **Kate Bush Song Mode slice (2026-04-29):** **`kateBushSlice.ts`** (`core/song-mode/`) + golden-path re-export, **`precomputeKateBushEffectiveHarmonyBars`**, smoke **`kateBushSliceSmoke.test.ts`** — tonal-modal / drone-aware texture harmony (**`kb:*`** receipts). **Aliases registered:** **`kate_bush`**, **`kate`**, **`bush`** in **`songwriterStyleProfiles`**. **`HomeGenerate.tsx`** **Shipped (full slice)** lists **19** golden-path writers (dropdown audit **2026-04-29**).
- **Stephen Sondheim Song Mode slice (2026-04-29):** **`sondheimSlice.ts`** (`core/song-mode/`) + golden-path re-export, **`precomputeSondheimEffectiveHarmonyBars`**, smoke **`sondheimSliceSmoke.test.ts`** — dramatic theatre harmony (**`sh:*`** receipts). **Aliases:** **`sondheim`** and **`stephen_sondheim`** both resolve via **`songwriterStyleProfiles`**. Shipped **19** writer slices including **`stephen_sondheim`**.
- **Herbie Hancock Song Mode slice (2026-04-29):** **`herbieHancockSlice.ts`** (`core/song-mode/`) + golden-path re-export, **`precomputeHerbieHancockEffectiveHarmonyBars`**, smoke **`herbieHancockSliceSmoke.test.ts`** — Blue Note post-bop harmony (**`hh:*`** receipts; **`bh:*`** Barry Harris). Among **19** shipped slices with **`herbie_hancock`**.
- **Jobim Song Mode slice (2026-04-29):** **`jobimSlice.ts`** (`core/song-mode/`) + golden-path re-export, **`precomputeJobimEffectiveHarmonyBars`**, smoke **`jobimSliceSmoke.test.ts`** — bossa / Brazilian jazz harmony (**`aj:*`** receipts; **`jb:*`** already owned by **James Brown**). Shipped with **`antonio_carlos_jobim`** among the **19** slices.
- **ECM Chamber Song Mode slice (2026-04-29):** **`ecmChamberSlice.ts`** (`core/song-mode/`) + golden-path re-export, **`precomputeEcmChamberEffectiveHarmonyBars`**, smoke **`ecmChamberSliceSmoke.test.ts`** — sparse Nordic/modal harmony (`ec:*` receipts). **Pools ready to slice:** none (all previously queued pools shipped).
- **Donald Fagen Song Mode slice (2026-04-29):** **`donaldFagenSlice.ts`** (`core/song-mode/`) + golden-path re-export, **`precomputeDonaldFagenEffectiveHarmonyBars`**, smoke **`donaldFagenSliceSmoke.test.ts`** — jazz-rock precision harmony (`df:*` receipts).
- **Frank Zappa Song Mode slice (2026-05-01):** **`frankZappaSlice.ts`** (`core/song-mode/`) + golden-path re-export **`goldenPath/frankZappaSlice.ts`**, **`precomputeFrankZappaEffectiveHarmonyBars`**, smoke **`frankZappaSliceSmoke.test.ts`** — **`fz:*`** receipts; **`breakFrankZappaIiViProgressions`** (no rolling ii–V–I chains). **Aliases:** **`frank_zappa`**, **`fz`**. **`HarmonyContext`** + **`attachFrankZappaHarmonyContext`** — single effective-harmony timeline for score, XML truth, and lock validation; **`runGoldenPath`** export truth prefers **`harmonyContext.bars`** for **`frank_zappa`**. **GCE 9.1 milestone (2026-05-02):** first **9+** overall; **motif lock complete** — sticky **3–4 note** anchor (**tritone / m6**), structural recall **1 / 5 / 9 / 13**, breath bars after motif bars, recurrence **≥0.75**. **Phase B solo (`zappasoloEngine.ts`):** **Phase 1** — 7/8 rhythmic cell lock (section **A** = 3+3+2 label / `[3,2,2]` eighths, section **B** = 3+2+2+2 / `[2,2,2,1]`, ≥**60%** phrase windows locked, **`rhythmicCellLock`** + phrase **`zappaRhythmicCell`** metadata); **Phase 2** — motif ownership (**4-bar** slice → sticky anchor, full-phrase reinjection when similarity **&lt;0.5**, development-window repair below **0.75**, **`zappaMotifReceipt`**); **Phase 3** — voice-leading + bass authority (**`zappaVoiceLeading.ts`**): guide-tone line (**3rd/7th**, step-cost + **streak repair** when **&gt;2** consecutive non-stepwise bars), bass beat **1** root/3rd/7th + beat **2** chord tone or leading tone (**`frankZappaBassBeatCommitmentViolated`** receipt), phrase goals **N+2**/**N+4**, implied inner voice + contrary motion per section, **`zappaVoiceLeadingScore`** (0–10) via **`moduleValidation.ts`**); phrase **breath space** (≥1 bar per 4-bar phrase with **≤2** notes); **Phase 4** — guitar↔bass imitation + register swap (**`applyFrankZappaPhase4GuitarBassAndRegister`**), cross-bar solo callbacks (bar **1**→**5/9/13…**, **`crossBarCallbacks`** on **`zappaMotifReceipt`**), one **cell-disruption** bar per section (**`sectionDisruptionBars`**); **Phase 5 (2026-05-02)** — UI fixes: **`HomeGenerate.tsx`** green receipt when **`exportIntegrityPassed`** (amber **Generated (not shareable)** when shareable false); **export pitch clamp:** **`soloLineToPartModel`** **+12** then hard ceiling **MIDI 84** (no **`<octave>7</octave>`** on **`zappa_solo`**); default gen range **52–84**; **MusicXML trio:** **Piano** (**`<part-name>Piano</part-name>`** + **`<instrument-name>Piano</instrument-name>`**, GM **1**) / **Upright Bass** / **Elec. Gtr** (**`scoreInstrumentName` Electric Guitar**, GM **27**); lead-sheet **`<harmony>`** on comp staff only (no symbols on bass); **d1**/**d4** device rates **55%**/**50%** + **`enforceZappaHarmonyLanguageFloors`** (altered/colour density); solo **≥2** notes per bar + default density **medium** (**0.72**); odd-meter **`barMeterMap`** smoke seed **77777** + XML asserts. Smoke **`zappasoloSmoke.test.ts`** (**114**/0 aggregate tier).
- **Locked harmony routing fix:** **`composerOsAppGeneration.ts`** (`harmonyBarsForLockedAssertions`) + **`customLockedHarmonyRouting.ts`** (`assertScoreMatchesLockedHarmonyWire`) — effective bars for **Wayne Shorter**, **Barry Harris**, **Bill Evans**, **Bacharach**, **Donald Fagen**, **ECM Chamber**, **Antônio Carlos Jobim**, **Herbie Hancock**, **Stephen Sondheim**, **Andrew Hill**, **Charlie Parker**, and related shipped slices so Song Mode / custom harmony assertions match **`getChordForBar`** after slice precompute.
- **Bill Evans Song Mode slice:** **`billEvansSlice.ts`** (`core/song-mode/`) + golden-path re-export, **`precomputeBillEvansEffectiveHarmonyBars`**, smoke **`billEvansSliceSmoke.test.ts`** — listed under **Shipped slices** in **`docs/COMPOSER_OS_ROADMAP.md`**.
- **Bacharach Song Mode slice:** **`bacharachSlice.ts`** (`core/song-mode/`) + golden-path re-export, **`precomputeBacharachEffectiveHarmonyBars`**, smoke **`bacharachSliceSmoke.test.ts`**. Theatre-pop harmony symbols (`ba:*` receipts); guitar chromatic nudges remain in **`applyBacharachGuitarBarPasses`**.
- **Barry Harris:** **`barryHarrisSlice.ts`** + smoke; **fix:** **`barry_harris`** wired into **`barsForLockedExportTruth`** in **`runGoldenPath.ts`** (export-truth parity with other locked-harmony slices).
- **Registry / engine:** `bill_evans` remains a first-class `SongwriterRuleId`; duo golden-path generation uses **`billEvansSlice`** when primary is **`bill_evans`**.
- **Generate UI:** Songwriter and Arranger dropdowns use `<optgroup>` groupings; Song Mode has helper copy for arranger/era pairing. **Accessibility:** `label` `htmlFor` ↔ control `id`, `aria-describedby` to visually hidden optgroup context (and Song Mode Era → existing pairing paragraph `id`). Implemented in **`apps/composer-os-app/src/pages/HomeGenerate.tsx`** for Song Mode, Big Band, and String Quartet rows.
- **Classical song overlays (2026-05-04):** **`applyClassicalSongOverlay`** in **`songwriterStyleResolver.ts`** — per-composer blended scalar nudges; **`classicalOverlay`** on generate payload; **Classical song influence** UI beside lyric author; playbook section **Classical song overlay (Song Mode)**.
- **Docs:** Roadmap (ECM sweep note, Bacharach/Fagen product note, smoke checklist); **`docs/USER_GUIDE.md`** + **`UserGuide.tsx`** describe grouped dropdowns; **`docs/CHANGELOG.md`** — Composer OS entry dated **2026-04-29** (empty **`[Unreleased]`** until the next drop).

**Suggestions for developers today**

1. After UI changes under **`apps/composer-os-app/`**, run **`npm run build`** in that package (or **`npm run dev`** for manual QA).
2. Before merging engine/harness changes, run **`npm run test:composer-smoke`** and confirm the aggregate PASS count matches **`CLAUDE.md`** and **`docs/COMPOSER_OS_ROADMAP.md`** “Current” when you change **`engines/composer-os-v2/tests/runSmokeTests.ts`**.
3. New or moved songwriter rows in grouped dropdowns: keep **`SONGWRITER_GROUP_*` / `SONGWRITER_OPTIONS`** in sync and extend **a11y** copy in **`HomeGenerate.tsx`** if group labels or semantics change.
4. For a new full slice, follow **`brianWilsonPetSoundsSlice.ts`**, add smoke + eval script pattern, and log in **`CHANGELOG.md`**.

## Commands

### Testing

```bash
# Smoke tier (~5 min) — 307/0 PASS rows, 73 labelled suites; full 472/87 (runSmokeTests.ts allowlist; sync CLAUDE + roadmap when edited)
npm run test:composer-smoke

# Fast tier (~15–20 min)
npm run test:composer-fast

# Full tier (~30–45 min, 4 sequential Node processes to manage heap)
npm run test:composer-full

# Run a single test file directly
npx ts-node --project tsconfig.json engines/composer-os-v2/tests/brianWilsonPetSoundsSliceSmoke.test.ts
```

### Evaluation (songwriter slice diagnostics)

```bash
npm run eval:brian_wilson   # outputs to /output/brian_wilson-eval/
npm run eval:stevie_wonder
npm run eval:radiohead
npm run eval:james_brown
npm run eval:joni_mitchell
npm run eval:sonic_youth
npm run eval:pat_metheny
```

### Dev servers

```bash
npm run dev              # React/Vite web app + Express API
npm run desktop:dev      # Electron desktop app (Windows)
npm run desktop:build    # Build desktop executable
npm run desktop:package  # Package NSIS + portable installers
```

## Architecture

### Primary engine: `engines/composer-os-v2/` (TypeScript)

The core of the project is a deterministic generative composition pipeline. A seeded request flows through:

```
app-api/generateComposition
  → runGoldenPath              # preset-specific path selection
  → buildScore                 # songwriter slice, duo, ECM, Big Band, String Quartet
  → C1–C7 Rhythm Overlays      # Song Mode only (soft rhythm → funk → ostinato → expression → space)
  → Phrase Engine V2 (buildMotifPool → seedPoolFromHookIdentity → applyPhraseEngineV2 → applyBassMotifEcho)
  → finalizeAndSeal            # bar math validation
  → exportMusicXML             # Sibelius-safe polyphonic MusicXML
  → readiness gates            # integrity checks
  → OutputManifest
```

Key files:
- `core/conductor/conductor.ts` — main pipeline orchestrator
- `core/goldenPath/generateGoldenPathDuoScore.ts` — duo guitar/bass entry point
- `core/song-mode/songModeBuilder.ts` — Song Mode request → score compilation
- `core/phrase/phraseBuilder.ts` — 4-stage phrase engine
- `core/export/scoreToMusicXml.ts` — MusicXML exporter
- `app-api/appApiServer.ts` — HTTP/IPC gateway (web + desktop share this)
- `core/compositionContext.ts` — central metadata + request typing

### Songwriter slices (`core/song-mode/`)

Each of the **21** shipped writer slices (Brian Wilson, Stevie Wonder, Radiohead, James Brown, Joni Mitchell, Sonic Youth, Pat Metheny, Wayne Shorter, Frank Zappa, Barry Harris, Bill Evans, Bacharach, Donald Fagen, ECM Chamber, Antônio Carlos Jobim, Herbie Hancock, Stephen Sondheim, Kate Bush, Thelonious Monk, Andrew Hill, Charlie Parker) follows the same pattern:
- 5 harmonic devices (`d1–d5`), each with eligibility gates + anti-elaboration guards
- `buildEffectiveHarmonyBars()` precomputes altered progressions
- Results routed through `customLockedHarmonyRouting` into MusicXML
- Evaluation harness: `eval:<name>` script, smoke: `*Slice.test.ts`

Use `core/song-mode/brianWilsonPetSoundsSlice.ts` as the canonical pattern when adding new writer slices.

### Apps

- `apps/composer-os-app/` — React 18 + Vite 5 web UI, Express 4 backend
- `apps/composer-os-desktop/` — Electron 28 desktop wrapper (Windows)

The Electron app and web app share the same `app-api/` backend; `app-api/appApiTypes.ts` defines the `GenerateRequest` / `OutputManifest` contract.

### Secondary engines

- `engines/wayne-shorter-engine/` — Python 3.11, composer IR for instrumental (non-songwriter) composition
- `engines/jimmy-wyble-engine/` — Guitar voice-2 polyphonic dynamics (Wyble layer)
- `engines/big-band-architecture-engine/`, `engines/ellington-orchestration-engine/` — ensemble scoring
- `engines/contemporary-counterpoint-engine/` — counterpoint rules

### Key design patterns

**Deterministic generation:** All generation is seeded (same `seed` → identical output). Never use `Math.random()` directly.

**Receipts/Diagnostics:** Every generation emits `GenerationMetadata` with `{*Receipt, *Diagnostics, *Devices}` — this is the primary debugging interface. Preserve this pattern when adding new pipeline stages.

**Preset-driven:** 40+ presets control ensemble type, scoring rules, rhythm style. New composition modes go through presets, not new code paths.

**Guard pattern:** Multi-pass validation; "guards" at each pipeline stage prevent invalid harmony transitions. Don't skip guards to get output — fix the guard or the input.

**Test harness heap management:** The full test suite runs as 4 sequential Node processes (`runAllTestsChunk1–4`) each with `--max-old-space-size=4096`. Don't add expensive suites to chunks that are already near the memory limit.

## Documentation

- `docs/COMPOSER_OS_ARCHITECTURE.md` — system design + phase labels (A/B/C/D)
- `docs/COMPOSER_OS_ROADMAP.md` — strategic vision + past/current/future roadmap (canonical roadmap source)
- `docs/CHANGELOG.md` — detailed feature history, searchable by date/feature
- `docs/TEST_DEBT_COMPOSER_OS_V2.md` — test tier structure + known gaps
- `.cursor/rules/composer-os-roadmap-request.mdc` — when generating roadmap content, use canonical title format from `docs/COMPOSER_OS_ROADMAP.md`

## CI

`.github/workflows/test.yml` runs on push/PR to `main`: Python 3.11 + pytest for the Wayne Shorter engine. TypeScript tests are not in CI — run `npm run test:composer-smoke` locally before merging.

## Tool Preferences

When working on this project, use the right tool for each task:

- **Cursor** — all repo-specific tasks: audits, file reads, implementation, searches. Faster and more detailed with line numbers and code snippets.
- **Claude Code** — terminal execution outside the repo only: npm package research, global config, running standalone scripts.
- **Perplexity** — external research, library comparisons, current web knowledge, best practices.

Do not use Claude Code for file reading or repo audits — Cursor is significantly faster and more accurate for those tasks.
