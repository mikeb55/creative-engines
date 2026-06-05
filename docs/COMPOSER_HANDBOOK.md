# Composer OS handbook

Practical notes for **using** Composer OS—generation, evaluation, and quality workflows. For architecture detail see **`COMPOSER_OS_ARCHITECTURE.md`**; for roadmap see **`COMPOSER_OS_ROADMAP.md`**.

---

## ECM VRB — room character (header chip)

**VRB** in the app header (**`VRB: Nordic Studio`**) is **not** a reverb plugin and **not** the harmonic **VoiceRuleBundle** roster below. It is an **ECM Records–style room profile**: how dry or spacious the generated material should feel — room size, decay tail, early reflections, damping. Composer OS passes this as metadata on every generate call so exports and downstream scoring share one acoustic “stage.”

**Default — Nordic Studio** — Manfred Eicher signature sound: dry focus, long tail, restrained early reflections. **roomSize 0.42** · **decay 1.8 s** · **predelay 12 ms** · damping 0.55 · diffusion 0.62.

**Other rooms:** Stone Church Oslo · Infinite Hall · Close Dry · Distant Bloom · Cathedral Fade · **— Off —** (no VRB on generate).

**Where to change it:** **Structure** tab → **ECM VRB** panel (**`VrbPanel`**). Header chip click jumps there. Sliders unlock when **Lock to Preset** is off.

**Generation:** Active profile is sent as **`vrbProfile`** on every **`GenerateRequest`** (preset id, name, room params, character string). Off = field omitted.

Presets live in **`src/engine/ecmVrb.js`**; app state in **`VrbProfileContext`** (default **`nordic_studio`**).

---

## Group Mode — production worlds

**Group Mode** clusters composers by **production logic** — how groove, space, strings, cadence, and sectional architecture behave on record — not by harmonic vocabulary alone. Three active production groups ship shared defaults; composers **inherit group defaults** and override only where distinct.

### Why groups exist

Individual slice params (Sebesky `groovePersistence`, Wheeler `cadentialOpacity`, etc.) capture **composer-specific** behaviour. Production groups capture **shared studio worldview**: ECM chamber space · CTI/studio-orchestral immediacy · Blue Note / Impulse post-bop acoustic core. Composers **inherit group defaults** via `resolveComposerParams(composerId, overrides)`; **composer overrides win** on any key conflict.

Engine: **`engines/composer-os-v2/core/groups/composerGroupEngine.ts`** · definitions: **`composerGroupDefinitions.ts`**.

### ECM Chamber Jazz

**Identity:** Spacious, suspended, porous, unresolved. Silence is structural. Groove can dissolve. Chamber-space production — Manfred Eicher / Schneider / Wheeler / Metheny lineage.

**Defaults (10 parameters):**

| Parameter | Default | Musical meaning |
|-----------|---------|-----------------|
| `groovePersistence` | 0.25 | Grid may float or drop out |
| `registralPorosity` | 0.80 | Wide gaps between layers |
| `stringProminence` | 0.15 | Strings as halo, not body |
| `cadentialResolution` | `suspended` | Endings hover, rarely land |
| `ensembleDensityCurve` | `slow_bloom` | Texture blooms over time |
| `silenceWeighting` | `structural` | Rests are form-bearing |
| `productionGloss` | 0.20 | Dry, intimate mix surface |
| `melodyFraming` | `integrated` | Melody woven into texture |
| `soloistSpotlight` | 0.45 | Solo as colour, not feature |
| `sectionalContrastMode` | `gradual` | Sections melt into each other |

**Members (fully implemented):** Maria Schneider, Kenny Wheeler, Bill Evans (dual — default ECM), Henry Threadgill, Bob Brookmeyer, Jan Garbarek, Carla Bley, Eberhard Weber — plus Gil Evans, Pat Metheny, `ecm_chamber` preset.

**Partial / future:** Surman, Towner.

### Studio Orchestral Jazz

**Identity:** Groove-driven, melody-legible, lush, immediate. Production-shaped sectional architecture — record-producer mindset (CTI, Quincy, Sebesky, Nelson, Nestico, Basie shout charts).

**Defaults:**

| Parameter | Default | Musical meaning |
|-----------|---------|-----------------|
| `groovePersistence` | 0.78 | Grid stays locked |
| `registralPorosity` | 0.20 | Layers stack tightly |
| `stringProminence` | 0.65 | Strings carry body and lift |
| `cadentialResolution` | `arrived` | Sections resolve and land |
| `ensembleDensityCurve` | `tiered_lift` | Intro → groove → lift → reprise |
| `silenceWeighting` | `minimal` | Rests are breath, not form |
| `productionGloss` | 0.82 | Lush studio sheen |
| `melodyFraming` | `spotlighted` | Tune on top, legible |
| `soloistSpotlight` | 0.75 | Solo as featured event |
| `sectionalContrastMode` | `discrete` | Clear A / B / lift blocks |

**Members (fully implemented):** Don Sebesky, Quincy Jones, Oliver Nelson, Sammy Nestico, Clare Fischer, Count Basie, Thad Jones, Bill Holman, Duke Ellington, Billy Strayhorn, Charles Mingus, Claus Ogerman.

**Partial / future:** Bob James, Mandel, Deodato, McFarland.

### Film Soundtrack

**Identity:** Groove-native motor energy — percussion grid, brass attack strata, odd-meter riff accents, modal vamps locked to grid. Not pastoral mood painting or classical cadential closure.

**Defaults:**

| Parameter | Default | Musical meaning |
|-----------|---------|-----------------|
| `groovePersistence` | 0.85 | Forward thrust even in slow cues |
| `registralPorosity` | 0.32 | Layers stack for momentum |
| `stringProminence` | 0.42 | Strings as color/support — not lead voice |
| `cadentialResolution` | `suspended` | Vamps and riff-snap — not V–I closure |
| `ensembleDensityCurve` | `tiered_lift` | Additive layering to climax |
| `silenceWeighting` | `rhythmic` | Grid stays continuous |
| `productionGloss` | 0.58 | Urban studio film sheen |
| `melodyFraming` | `spotlighted` | Compact 1–2 bar cells |
| `soloistSpotlight` | 0.52 | Groove ensemble over solo feature |
| `sectionalContrastMode` | `discrete` | Strata entry blocks |

**Members (fully implemented):** Bernard Herrmann, Ennio Morricone, Jerry Goldsmith, **Lalo Schifrin** (`ls:*` slice).

### Post-Bop Core

**Identity:** Blue Note / Impulse / Prestige acoustic world — **head, solos, head out**. Groove anchored; blues and modal harmony; direct, warm, present sound. Van Gelder recording aesthetic — not ECM spatial air, not CTI orchestral luxury. Small-to-medium ensemble; strings virtually absent.

**Defaults:**

| Parameter | Default | Musical meaning |
|-----------|---------|-----------------|
| `groovePersistence` | 0.72 | Strong pulse; tempo can breathe but groove never dissolves |
| `registralPorosity` | 0.45 | Natural acoustic spacing — not ECM open, not CTI lush |
| `stringProminence` | 0.05 | Acoustic combo world, not orchestral |
| `cadentialResolution` | `functional_modal` | ii–V–I and modal vamps — extended, delayed, or substituted |
| `ensembleDensityCurve` | `blowing_arc` | Head → solo intensity build → shout/soli → head out |
| `silenceWeighting` | `rhythmic` | Breath and punctuation, not structural ECM space |
| `productionGloss` | 0.30 | Dry-warm Van Gelder presence |
| `melodyFraming` | `head_based` | Head stated, dissolved in solos, restated |
| `soloistSpotlight` | 0.60 | Solo primary during blows; rhythm section equal partner |
| `sectionalContrastMode` | `blowing_sections` | Contrast via solo rotation and intensity, not orchestration |

**Members (fully implemented):** Thelonious Monk, John Coltrane, Charlie Parker, Miles Davis, Herbie Hancock, McCoy Tyner, Barry Harris, Andrew Hill, Jim Hall, Pat Martino, Wayne Shorter (dual — default Post-Bop).

**Partial / future:** Joe Henderson, Bobby Hutcherson, Lee Morgan, Hank Mobley, Horace Silver.

### Dual-group composers

Some writers span two production worlds. **`getComposerGroups(composerId)`** returns `primary`, optional `secondary`, and `defaultTo`. UI lists each composer **once** under their `defaultTo` group.

| Composer | Primary | Secondary | Default UI group |
|----------|---------|-----------|------------------|
| **Wayne Shorter** | Post-Bop Core | ECM Chamber Jazz | Post-Bop Core |
| **Bill Evans** | ECM Chamber Jazz | Post-Bop Core | ECM Chamber Jazz |

**Invoke secondary group on demand:** pass the third argument to **`resolveComposerParams`**:

```typescript
resolveComposerParams('wayne_shorter', {}, 'ECM_CHAMBER_JAZZ');
resolveComposerParams('bill_evans', {}, 'POST_BOP_CORE');
```

### Overrides — which wins

1. **`getComposerGroup(composerId)`** → default group (`defaultTo` for dual composers).
2. **`getComposerGroups(composerId)`** → full assignment including secondary world.
3. **`getGroupDefaults(group)`** → full 10-parameter object.
4. **`resolveComposerParams(composerId, partialOverrides, groupOverride?)`** → `{ ...groupDefaults, ...overrides }`; `groupOverride` selects secondary world for dual composers.

Slice-specific params (e.g. Sebesky `liftToBlareArc`) remain on their slice types; group params are the **production-world baseline** for wiring and future shared passes.

### Shared type values

- **`cadentialResolution`:** `suspended` (ECM) · `arrived` (CTI) · `functional_modal` (Post-Bop)
- **`ensembleDensityCurve`:** `slow_bloom` · `tiered_lift` · `blowing_arc`
- **`silenceWeighting`:** `structural` · `minimal` · `rhythmic`
- **`melodyFraming`:** `integrated` · `spotlighted` · `floating` · `head_based`
- **`sectionalContrastMode`:** `gradual` · `discrete` · `blowing_sections`

### `productionGloss` and `melodyFraming`

- **`productionGloss` (0–1):** Mix / orchestration sheen — ECM dry chamber · Post-Bop Van Gelder warmth · CTI luxury polish.
- **`melodyFraming`:** How the tune sits in the mix — integrated texture · spotlighted lead · head-based blowing form · `floating` (reserved).

**UI:** Generate → songwriter and arranger dropdowns include **ECM Chamber Jazz**, **Studio Orchestral Jazz**, and **Post-Bop Core** optgroups (existing composer ids unchanged; no duplicate dual-group entries).

---

## VoiceRuleBundle (VRB) fingerprint status

Compiled harmonic voice bundles live in **`engines/composer-os-v2/core/composer/voiceRuleBundles.ts`**. Optional **`orchestrationPolicy.fingerprintReceipts`** are **research-derived orchestration planning lines** (not the same thing as **GCE structural memory** JSON fingerprints in **`gce-memory/fingerprints/`**). **`getVoiceRuleBundle(id)`** returns the bundle for harmonic-voice / BB pairing; unknown ids fall back to **`neutral`** (no receipts).

**Deep (≥10 `fingerprintReceipts`):** **John Coltrane** (`john_coltrane`) **10** · **Pat Metheny** (`pat_metheny`) **12** · **Clare Fischer** (`clare_fischer`) **44** · **Quincy Jones** (`quincy_jones`) **46** · **Sammy Nestico** (`sammy_nestico`) **41** · **Count Basie** (`count_basie`) **38** · **Duke Ellington** (`duke_ellington` / `ellington`) **11** · **Billy Strayhorn** (`billy_strayhorn` / `strayhorn`) **12** · **Don Sebesky** (`don_sebesky` / `sebesky`) **12** · **Gil Evans** (`gil_evans`) **11** · **Wayne Shorter** (`wayne_shorter`) **11** · **Maria Schneider** (`maria_schneider`) **11** · **Kenny Wheeler** (`kenny_wheeler`) **12** · **Jan Garbarek** (`jan_garbarek`) **12** · **Thad Jones** (`thad_jones`) **12** · **Charles Mingus** (`charles_mingus`) **11** · **Henry Threadgill** (`henry_threadgill`) **26** · **Bob Brookmeyer** (`bob_brookmeyer`) **12** · **Olivier Messiaen** (`messiaen` / `olivier_messiaen`) **12** · **Oliver Nelson** (`oliver_nelson`) **12**.

**Extended:** none — **`count_basie`** (**`CB_HARM_*`**, **`CB_VL_*`**, **`CB_RHYTHM_*`**, **`CB_FORM_*`**, **`CB_FP_*`**) raised the bundle to **deep**; slice layer still carries shout-chorus / riff-head / **Basie Button** behaviour.

**Thin:** none (see table). **Alban Berg** — low-count **Also bundled** row, not **deep**.

| Composer (harmonic voice id) | Fingerprint count | Status |
|------------------------------|-------------------|--------|
| **John Coltrane** (`john_coltrane`) | 10 | **deep** |
| **Pat Metheny** (`pat_metheny`) | 12 | **deep** |
| **Clare Fischer** (`clare_fischer`) | 44 | **deep** |
| **Quincy Jones** (`quincy_jones`) | 46 | **deep** |
| **Duke Ellington** (`duke_ellington`, alias `ellington`) | 11 | **deep** |
| **Billy Strayhorn** (`billy_strayhorn`, alias `strayhorn`) | 12 | **deep** |
| **Gil Evans** (`gil_evans`) | 11 | **deep** |
| **Wayne Shorter** (`wayne_shorter`) | 11 | **deep** |
| **Maria Schneider** (`maria_schneider`) | 11 | **deep** |
| **Kenny Wheeler** (`kenny_wheeler`) | 12 | **deep** |
| **Jan Garbarek** (`jan_garbarek`, alias `garbarek`) | 12 | **deep** |
| **Carla Bley** (`carla_bley`, alias `bley`) | 12 | **deep** |
| **Thad Jones** (`thad_jones`) | 12 | **deep** |
| **Charles Mingus** (`charles_mingus`) | 11 | **deep** |
| **Henry Threadgill** (`henry_threadgill`) | 26 | **deep** |
| **Bob Brookmeyer** (`bob_brookmeyer`) | 12 | **deep** |
| **Bill Holman** (`bill_holman`, alias `holman`) | 12 | **deep** |
| **Olivier Messiaen** (`messiaen`, alias `olivier_messiaen`) | 12 | **deep** |
| **Oliver Nelson** (`oliver_nelson`) | 12 | **deep** |
| **Sammy Nestico** (`sammy_nestico`) | 41 | **deep** |
| **Count Basie** (`count_basie`) | 38 | **deep** |

**Also bundled:** **Alban Berg** (`berg` / `alban_berg`) **4** — see **`voiceRuleBundles.ts`** for authoritative counts.

**Ship hashes:** VRB deepen Ellington / Gil / Shorter / Schneider **`4aa848a5`** · Messiaen slice **`a4ae08de`** · Basie Song Mode **`ac875ae8`** · Quincy Song Mode + BB **`8b8775e4`** · BB composer stubs rail **`6344cdcb`** · Brookmeyer stack **`48e5407d`** · Oliver Nelson stack **`e4814fb3`**.

---

## Master composer reference (v1.9.0)

Canonical Song Mode / Big Band composers in **`engines/composer-os-v2`**. **Slice id** = harmony receipt prefix on golden-path precompute. **Status:** **fully implemented** = slice + golden-path wiring + (where applicable) VRB/BB/eval; **partial** = UI or VRB only; **legacy** = superseded external engine.

### Fully implemented in v2

| Composer | Id | Slice | Status | Identity (one line) | Key parameters |
|----------|-----|-------|--------|---------------------|----------------|
| Maria Schneider | `maria_schneider` | `ms:*` | fully implemented | Pastoral modal orchestral morph, density-as-texture, long pedal fields | `schneiderPhase`, device passes **d1–d5** |
| Gil Evans | `gil_evans` | `ge:*` | fully implemented | Cool modal colour fields, side-slip orchestration, sparse rhythm hooks | `gilEvansPhase`, side-slip / modal passes |
| Bob Brookmeyer | `bob_brookmeyer` | `brk:*` | fully implemented | Line-first quartal counterpoint, pitch-module episodes | `brookmeyerPeriod`, `contrapuntalLinePolicy` |
| Wayne Shorter | `wayne_shorter` | `ws:*` | fully implemented | Lateral modal plateaus, dramatic harmonic colour turns | `waynePhase`, device passes **d1–d5** |
| Pat Martino | `martino_linear` preset | — | fully implemented | Linear bebop guitar over supplied changes (MusicContext producer, not Song Mode slice) | `martino_linear` preset, solo density / breath rules |
| Frank Zappa | `frank_zappa` | `fz:*` | fully implemented | Odd-meter cells, motif lock, guide-tone bass authority, no rolling ii–V | `zappaPhase`, `rhythmicCellLock`, motif receipts |
| Charles Mingus | `charles_mingus` | `cm:*` | fully implemented | Blues-episodic form, bass authority, abrupt texture shocks | `mingusEpisodePlan`, episode contrast params |
| Duke Ellington | `duke_ellington` | `de:*` | fully implemented | Jungle timbre, call/response, shout derivation, player character | phrase roles, jungle/shout passes |
| Count Basie | `count_basie` | `cb:*` | fully implemented | KC riff-head swing, sparse comp, Basie Button cadences | `basieTestamentMode`, riff / shout passes |
| Thad Jones | `thad_jones` | `tj:*` | fully implemented | Extended common-practice nonachord stacks, soli vs shout | `thadPhase`, `nonachordBias`, `sideSlipRate`, `shoutAlterationMultiplier` |
| Oliver Nelson | `oliver_nelson` | `on:*` | fully implemented | Pedal modal head + minor-blues solo layer, blues scale density | modal / blues enrichment passes |
| Sammy Nestico | `sammy_nestico` | `sn:*` | fully implemented | Basie-school chart clarity, kicks, riff punches | shout / kick passes |
| Clare Fischer | `clare_fischer` | `cf:*` | fully implemented | Dense Latin voicing grammar, rootless upper structures | voicing density passes |
| Quincy Jones | `quincy_jones` | `qj:*` | fully implemented | Tight brass / pop–jazz crossover, rhythm-section lock | crossover harmony / punch passes |
| Bill Evans | `bill_evans` | `be:*` | fully implemented | Extension-rich voicings, sus/quartal dominants, delayed tonic | extension / sus passes |
| John Coltrane | `john_coltrane` | `jc:*` | fully implemented | Three-tonic (augmented-triad) motion + optional modal pedals | `coltranePhase` (**changes** / **modal**) |
| Thelonious Monk | `thelonious_monk` | `tm:*` | fully implemented | Angular harmony, whole-tone clusters, deferred cadences | device passes **d1–d5** |
| Barry Harris | `barry_harris` | `bh:*` | fully implemented | Bebop sixth-dim grammar, tritone subs, cluster-safe labels | bebop dominant / cadence passes |
| Andrew Hill | `andrew_hill` | `ah:*` | fully implemented | Angular non-functional harmony, open cadences, sus stripping | `avoid_resolution`, device passes **d1–d5** |
| Charlie Parker | `charlie_parker` | `cp:*` | fully implemented | Bebop ii–V–I clarify, enclosure, turnaround compression | device passes **d1–d5** |
| Jim Hall | `jim_hall` | `jh:*` | fully implemented | Interval-first guitar comping, warm extensions, duo counter-melody | `warmExtensionBias`, interval-first passes |
| Herbie Hancock | `herbie_hancock` | `hh:*` | fully implemented | Quartal / sus9 pedals, side-slip chromaticism, fusion upper-structure | `herbiePhase` (**modal** / **funk** / **vsop**) |
| Pat Metheny | `pat_metheny` | `pm:*` | fully implemented | Lydian maj colour, pedal shimmer, ECM diatonic planing | Lydian / pedal / planing passes |
| McCoy Tyner | `mccoy_tyner` | `mt:*` | fully implemented | Quartal stacks, pentatonic clusters, IV-rooted quartal over minor | quartal / pentatonic enrichment |
| Miles Davis | `miles_davis` | `md:*` | fully implemented | Modal vamps, space, electric-fusion colour, sparse dominants | `milesPhase`, modal colour passes |
| Antônio Carlos Jobim | `antonio_carlos_jobim` | `aj:*` | fully implemented | Bossa extended tertian harmony, Brazilian modal colour | bossa / Lydian colour passes |
| Henry Threadgill | `henry_threadgill` | `ht:*` | fully implemented | Episodic interval-cell harmony, polymodal bass, anti-metric phrases | `intervalCellDensity`, `antiMetricStrength`, `polymodalSeparation`, `episodeContrast` |
| Kenny Wheeler | `kenny_wheeler` | `kw:*` | fully implemented | Polyaxial upper sonority + independent bass, lyrical ECM brittleness | `polyaxialHarmony`, `tensionCarryForward`, `bassTrajectoryLogic`, `melodicDisjunctionRate`, `cadentialOpacity`, `voicingSpecificity` |
| Jan Garbarek | `jan_garbarek` | `jg:*` | fully implemented | Ritual modal melody over sparse harmonic field, drone gravity, phrase-breath silence | `modalCentricity`, `dronePresence`, `harmonicSlowness`, `melodicSustain`, `phraseBreathWeight`, `innerVoiceRestraint`, `folkArchetypeStrength` |
| Eberhard Weber | `eberhard_weber` | `ew:*` | fully implemented | Bass-led harmonic field: pedal persistence, slow upper refresh, revoicing over resolution | `pedalPersistence`, `upperChordRefreshRate`, `functionalCadenceRate`, `revoicingInsteadOfResolution`, `bassAsHarmonySource` |
| Billy Strayhorn | `billy_strayhorn` | `bs:*` | fully implemented | Chromatic song architecture + extended-tone melody/harmony fusion | `chromaticContinuity`, `extendedToneMelody`, `parallelColorMotion`, `phraseArcLength`, `innerVoiceActivity`, `closedBlockSustain` |
| Don Sebesky | `don_sebesky` | `ds:*` | fully implemented | CTI production-orchestra: groove bed, string halo, melody-legible reharm, tiered lifts | `groovePersistence`, `stringProminence`, `melodyLegibility`, `functionalLegibility`, `liftToBlareArc`, `soloistSpotlight`, `centerFillDensity` |
| Claus Ogerman | `claus_ogerman` | `co:*` | fully implemented | Composed orchestral continuum: harmonic suspension, inner-voice counterpoint, texture resolution, cyclic cells | `harmonicSuspension`, `innerVoiceActivity`, `resolutionByTexture`, `stringContinuum`, `orchestralRelation` |
| Carla Bley | `carla_bley` | `cbl:*` | fully implemented | Formal irony ECM: legible topics reframed by deadpan presentation and strategic displacement | `formalIronyIndex`, `deadpanPresentation`, `tonicLegibility`, `cadenceDeflection`, `motifContamination`, `climaxDeflation`, `repriseDefamiliarization` |
| Bill Holman | `bill_holman` | `bh:*` | fully implemented | Chart-first linear counterpoint: lines generate harmony, sax soli, spread shout choruses | `lineIndependence`, `voiceLeadingSmoothness`, `saxSoliDensity`, `shoutChorusSpread`, `approachNoteWeight`, `countermelodyActivity` |

### Partial / referenced only

| Composer | Id | Status | Notes |
|----------|-----|--------|-------|
| Manny Albam | `manny_albam` | UI only | Arranger dropdown row; no v2 slice |
| Gerald Wilson | `gerald_wilson` | UI only | Arranger dropdown row; no v2 slice |
| Neal Hefti | `neal_hefti` | UI only | Arranger dropdown row; no v2 slice |

### Legacy (superseded)

| Composer | Status | Notes |
|----------|--------|-------|
| Kenny Wheeler (Python `wheeler_lyric` engine) | legacy | Superseded by v103e **`kenny_wheeler`** / **`wheelerLyricSlice.ts`** (`kw:*`) |

---

### Don Sebesky (`don_sebesky`)

Sebesky is the **first CTI-world composer** in Composer OS. Every other orchestral voice in the ECM-adjacent lane — Schneider, Wheeler, Evans — is porous, suspended, chamber-like, and often unresolved. Sebesky is the **opposite**: center-filled, groove-driven, lush, immediate, melody-legible, and **production-shaped**. He arranges like a master record producer using orchestra to make jazz feel expensive, inevitable, and immediately graspable.

**CTI vs ECM (plain language)**

| | **ECM-adjacent (Schneider / Evans / Wheeler)** | **CTI Sebesky** |
|---|-----------------------------------------------|-----------------|
| Spacing | Porous, registral gaps, chamber transparency | Center-filled tutti, 4–5 octave spread with filled mid |
| Time | Floating, elastic, delayed climaxes | Stable groove bed; rhythm section stays legible |
| Harmony | Suspended fields, modal ambiguity | Functionally trackable plus rich extensions (maj9, 6/9, 13, #11) |
| Melody | May dissolve into orchestral process | Tune stays recognisable under reharm |
| Form | Organic narrative / atmosphere-led | Discrete production sections with role changes |
| Surface | Low-gloss blends, silence structural | Strings/harp sheen, brass crowns, produced swells |

**Formal architecture (track-format):** intro string/harp halo → groove statement → solo frame (thinned texture) → orchestral lift (tiered strings → brass/reeds → tutti) → reprise/arrival. **Not** Schneider’s organic narrative; **not** Evans’s atmosphere-led transformation.

**Song Mode slice** — **`donSebeskySlice.ts`** (`ds:*` receipts): functional-plus-colour grid; melody-legible reharm; sectional production markers; minimum **2** lift-to-blare events.

**Seven parameters** (0–1, defaults in parentheses):

| Parameter | Default | Musical role | Sweet spot |
|-----------|---------|--------------|------------|
| `groovePersistence` | 0.78 | Rhythm section keeps stable pulse after intro | 0.70–0.85 |
| `stringProminence` | 0.68 | Strings/harp active across arrangement | 0.55–0.75 |
| `melodyLegibility` | 0.74 | Reharm under fixed tune contour | 0.68–0.80 |
| `functionalLegibility` | 0.72 | Chords trackable in functional/tonicised frame | 0.65–0.78 |
| `liftToBlareArc` | 0.66 | Tiered crescendo to tutti accent | 0.58–0.72 |
| `soloistSpotlight` | 0.70 | Texture 30–50% thinner under solo | 0.62–0.78 |
| `centerFillDensity` | 0.65 | Mid-register filled at tutti | 0.60–0.72 |

**Sebesky vs Schneider / Evans / Wheeler**

| | **Sebesky** | **Schneider** | **Gil Evans** | **Wheeler** |
|---|-------------|---------------|---------------|-------------|
| Engine | Production-orchestra over groove | Pastoral modal morph | Colour-field atmosphere | Polyaxial upper + bass |
| Climax | Discrete lift hits (4–12 bars) | Slow atmospheric accretion | Diffuse arrival | Bloom, not shout |
| Brass | Arrival amplifier at crowns | Colour counterlines | Mid-register blend mist | Flugel blend, no slam |
| Choose Sebesky when | CTI record aesthetic, melody-forward chart, lush studio orchestration | Long-form narrative swell | Cool modal wash | ECM lyrical brittleness |

**Big Band arranger id:** **`sebesky`** (maps from UI **`don_sebesky`**) — eight rules: GrooveFirst, StringUsage, HarpGloss, BrassArrival, SectionalArchitecture, ClimaxBuilder, OrchestraAnswer, CenterFill.

**Reference works:** Wes Montgomery *Bumpin* · *A Day in the Life* (Beatles recast) · Freddie Hubbard *First Light* · Milt Jackson *Sunflower* · Jim Hall *Concierto* · *Giant Box* (Firebird / *Birds of Fire* synthesis).

**Evaluation:** **`sebeskyStyleProfile.ts`** — pass when groove ≥ 0.70, strings ≥ 0.45, functional ≥ 0.60, lifts ≥ 2, center fill ≥ 0.65; hard fail on floating time, ECM porosity, Schneider slow-swell-only arcs, melody abstraction.

---

### Claus Ogerman (`claus_ogerman`)

Ogerman is **not** a jazz arranger who adds strings. He is a **composer** who fuses jazz harmony, post-Romantic string writing, and post-serial color into **one syntax** — harmony, inner-voice counterpoint, and orchestral color generated as a single continuum.

| | **Sebesky (CTI groove-orchestra)** | **Ogerman (orchestral continuum)** |
|---|-------------------------------------|-------------------------------------|
| Harmonic engine | Functional-plus-colour under tune | Upper extensions persist through root change as structural tones |
| Inner voices | Center-filled pad / double | 2+ independent m2/M2/m3 lines; common-tone retention |
| Resolution | Tiered lift-to-blare | Registral descent, density thinning, cyclic cell return — not V–I |
| Strings | Halo / pad / swell support | 4–6 layered sustain + moving middles — harmonic argument |
| Orchestra role | Answers and crowns soloist | Rotates veil / echo / commentary every 8–16 bars |

**Song Mode slice** — **`clausOgermanSlice.ts`** (`co:*` receipts): 3-chord cyclic cells span large forms; harmonic suspension; inner-voice motion; texture resolution; string continuum layers; orchestral mode rotation.

**Five parameters** (0–1, defaults in parentheses):

| Parameter | Default | Musical role |
|-----------|---------|--------------|
| `harmonicSuspension` | 0.75 | 9ths/11ths/13ths persist through root changes |
| `innerVoiceActivity` | 0.70 | Independent inner lines; 60–75% common-tone retention |
| `resolutionByTexture` | 0.72 | Release by registral settling / thinning / cell return |
| `stringContinuum` | 0.78 | 4–6 string layers; sustained upper + moving middles |
| `orchestralRelation` | 0.65 | Veil / echo / commentary rotation — never static wallpaper |

**Big Band arranger id:** **`ogerman`** (maps from UI **`claus_ogerman`**) — six rules: StringContinuum, InnerVoiceMotion, BrassEpisodic, ClimaxAccumulation, OrchestraRelation, CyclicCell.

**VRB bundle id:** **`ogerman_continuum`** — 8 fingerprints + Quincy / Sebesky / Jenkins-Riddle / riff-logic negative discriminators.

**Evaluation:** **`ogermanStyleProfile.ts`** — pass when harmonicSuspension ≥ 0.68, innerVoiceActivity ≥ 0.62, resolutionByTexture ≥ 0.65, stringContinuum ≥ 0.70, orchestral rotation present; hard fail on brass-punch dominance, sax-soli rhetoric, sentimental homophony, 2-bar riff form logic.

---

### Kenny Wheeler (`kenny_wheeler`)

Wheeler harmony runs **two coordinated but independent processes** at once:

1. **Upper sonority path** — major triads, sus collections, 6/9, maj7/#11 colour clusters (the “chord” as colour object).
2. **Bass path** — independent motion biased to **semitone** and **major-third** relations.

These are **not** “bass note under a chord symbol.” Upper and bass follow **different interval logics** (polyaxial separation). Melody floats above both, leaping to **9 / #11 / 6** rather than tracing roots — singing through the **register gap**.

**Song Mode slice** — **`wheelerLyricSlice.ts`** (`kw:*` receipts): Step 1 upper sonority → Step 2 independent bass → Step 3 slash / spacing combine → Step 4 melody-over-gap behaviour (MAL + phrase receipts).

**Six parameters** (0–1, defaults in parentheses):

| Parameter | Default | Musical role | Sweet spot |
|-----------|---------|--------------|------------|
| `polyaxialHarmony` | 0.78 | Upper structure + independent bass vs tertian root-stack | 0.70–0.85 |
| `tensionCarryForward` | 0.70 | 9, #11, maj7, 13, sus carry to next tension sonority | 0.65–0.80 |
| `bassTrajectoryLogic` | 0.68 | Semitone / M3 bass relations across phrase units | 0.60–0.75 |
| `melodicDisjunctionRate` | 0.64 | P4/P5/m6/M6/8ve leaps + stepwise repair in 1–3 notes | 0.58–0.72 |
| `cadentialOpacity` | 0.76 | End on 6/9, maj7(add9), sus, slash — not plain I or V→I | 0.72–0.85 |
| `voicingSpecificity` | 0.72 | Keep `Bb6/9#11` spelling; do not normalize to generic maj9 | 0.68–0.80 |

**Wheeler vs Maria Schneider**

| | **Wheeler** | **Schneider** |
|---|-------------|---------------|
| Harmonic engine | Polyaxial upper + bass | Pastoral modal / orchestral morph |
| Texture | Brittle, intervallic, fragile stability | Cinematic bloom, continuous voice-leading |
| Ensemble | Chamber sparse → medium bloom | Luxuriant sectional swells |
| Cadence | Open 6/9 / sus / slash | Rich non-triadic but more “settled” |
| Choose Wheeler when | Lyrical trumpet/flugel chamber jazz, ECM brittleness | Large-ensemble narrative arc, Data Lords vs Garden contrast |

**ECM preset:** **`ECM_WHEELER_CHAMBER`** — intervallic density waves, more breath/thinning than Schneider; **`ECM_SCHNEIDER_CHAMBER`** remains orchestral cloud/swell.

**Big Band arranger id:** **`wheeler`** — seven rules (flugel blend, woodwind halo on extensions, register separation, cross-section voicing, bloom-not-slam, silence architecture, no terminal triad).

**Reference works:** *Ma Belle Hélène* · *Smatter* · *Angel Song* · *Music for Large & Small Ensembles* (Sweet Time Suite).

**Evaluation:** **`wheelerStyleProfile.ts`** — hard fail on terminal root triad, voicing substitution, bebop chain > 0.20, Schneider-profile false positives.

---

### Jan Garbarek (`jan_garbarek`)

Garbarek is the most **melodically archetypal** voice in the **ECM Chamber Jazz** group. Music behaves like **ritual invocation** — melody as chant or folk call unfolding above a **sparse modal field**. The ensemble exists to **protect the line's ritual clarity**, not to generate contrapuntal argument or orchestral narrative.

**Three pillars**

1. **Melody as modal ritual** — chant/call/joik archetype, not bebop line or motivic development.
2. **Harmonic field not progression** — drone, pedal, slow modal environment; not chord-to-chord functional movement.
3. **Silence and space as phrase syntax** — inter-phrase breath is structural, not decorative.

**Garbarek vs other ECM voices**

| | **Garbarek** | **Wheeler** | **Schneider** | **Threadgill** |
|---|--------------|-------------|---------------|----------------|
| Harmonic engine | Single modal center / field | Polyaxial upper + independent bass | Pastoral orchestral morph + swell | Interval-cell episodic system |
| Texture | Sparse framing around exposed line | Brittle intervallic chamber bloom | Cinematic density arcs | Anti-metric cell blooms |
| Pulse | Under-metric — thins until implied | Lyrical but harmonically active | Groove can dissolve into cloud | Attacked from inside by cells |
| Cadence | Open modal center / drone | Open 6/9 / sus / slash | Rich non-triadic settlement | Pitch-set module seams |
| Choose Garbarek when | Nordic/folk ritual melody, ECM austerity, chant-like sax | Lyrical trumpet/flugel polyaxial chamber | Large-ensemble narrative swell | Episodic harmolodic cells |

**Song Mode slice** — **`janGarbarekSlice.ts`** (`jg:*` receipts): Layer 1 modal field → Layer 2 melodic invocation → Layer 3 ensemble framing (line protection, ritual percussion colour).

**Seven parameters** (0–1, defaults in parentheses):

| Parameter | Default | Musical role | Sweet spot |
|-----------|---------|--------------|------------|
| `modalCentricity` | 0.85 | Harmonic content stays within one governing modal collection per section | 0.78–0.92 |
| `dronePresence` | 0.76 | Bass/lower voices sustain pedal 2+ bars — walking bass is a fail | 0.68–0.84 |
| `harmonicSlowness` | 0.78 | Chord rhythm slower than 1 change per 2 bars in lyric sections | 0.72–0.86 |
| `melodicSustain` | 0.74 | Melody notes sustain 1.5–4 beats (longer in rubato) | 0.66–0.82 |
| `phraseBreathWeight` | 0.69 | Inter-phrase rests/decay ≥12% of phrase timeline | 0.60–0.78 |
| `innerVoiceRestraint` | 0.81 | Accompaniment avoids busy counterlines during exposed melody (max 2 inner lines) | 0.74–0.88 |
| `folkArchetypeStrength` | 0.63 | Circular 2–5 note folk nucleus reused with slight variation | 0.52–0.72 |

**Nordic / folk influence in code**

- **Norwegian folk / Sami joik** → `folkArchetypeStrength` controls short nuclei recycled with micro-variation; arch-and-descent contour preferred over through-composed bebop lines.
- **Indian raga colour** → `melodicSustain` + microtonal-bend simulation fingerprint: approach/departure tones on long tones emulate pitch-bend without literal microtonal export.
- **ECM ritual pacing** → `phraseBreathWeight` + `SilenceEnforcementRule`: mandatory inter-phrase gaps; continuous melody without breath fails evaluation.
- **Eberhard Weber drone lineage** → `dronePresence` + `DroneArchitectureRule`: lyrical sustaining bass, slash pedals, open-fifth sonorities.

**Big Band arranger id:** **`garbarek`** — six rules (ModalField, DroneArchitecture, LineProtection, RitualPercussion, SilenceEnforcement, FolkMotive).

**Reference works:** *I Took Up the Runes* · *Visible World* · *Rites* · *All Those Born With Wings* · *Dis* · *Officium*

**Evaluation:** **`garbarekStyleProfile.ts`** — pass on melodic sustain, pedal stability, slow harmonic rate, inner-voice restraint, modal identity, silence weighting, cadential openness; hard fail on Wheeler polyaxial independence, Schneider swell arcs, Threadgill anti-metric density, walking bass, fast harmony, ii–V–I closures.

---

### Eberhard Weber (`eberhard_weber`)

Weber is the most **bass-centred harmonic architect** in ECM Chamber Jazz. Harmony is a **field sustained by the bass axis** — upper color clusters refresh slowly while the pedal holds. Tension releases through **revoicing, register, and spacing**, not functional cadence.

**Three pillars**

1. **Pedal as form** — one bass pitch or two-pitch axis active 4–12 bars; upper structures change above.
2. **Bass-led chord identity** — slash sonorities and color clusters; not root-position tertian stacks.
3. **Revoicing over resolution** — phrase endings shift register/timbre instead of ii–V–I closure.

**Weber vs other ECM voices**

| | **Weber** | **Garbarek** | **Wheeler** | **Schneider** |
|---|-----------|--------------|-------------|---------------|
| Bass role | Foreground harmonic source | Drone support for ritual melody | Independent polyaxial trajectory | Pedal under orchestral swell |
| Upper harmony | Slow color refresh every 2–4 bars | Modal field, sparse | Polyaxial slash brittleness | Dense orchestral morph |
| Melody | Long arching spans, wide calm intervals | Chant/folk ritual line | Brittle leap chains | Narrative orchestral lead |
| Cadence | Revoicing / spacing release | Open modal center | Open sus / slash opacity | Rich non-triadic settlement |
| Choose Weber when | Bass-led ECM field, Yellow Fields / Colours of Chloë palette | Nordic ritual sax melody | Lyrical polyaxial chamber | Large-ensemble narrative swell |

**Song Mode slice** — **`weberFieldSlice.ts`** (`ew:*` receipts): pedal phrase units → upper-field palette over D/A/E pedals → defunctionalize ii–V–I → revoicing release at unit seams.

**Five parameters** (0–1, defaults in parentheses):

| Parameter | Default | Musical role |
|-----------|---------|--------------|
| `pedalPersistence` | 0.78 | Bass axis sustained 4–12 bars per phrase unit |
| `upperChordRefreshRate` | 0.30 | Upper structure changes every 2–4 bars, not every bar |
| `functionalCadenceRate` | 0.20 | Max functional ii–V–I pressure — keep low |
| `revoicingInsteadOfResolution` | 0.65 | Release via register/spacing/timbre, not dominant-tonic |
| `bassAsHarmonySource` | 0.85 | Chord identity from bass + upper cluster |

**Characteristic upper-field palettes:** D pedal — Gmaj7(add9), Cmaj7/D, Em9, G/D · A pedal — Fmaj7(#11)/A, Dadd9/A, Cmaj7/A · E pedal — F/E, Am9/E, Cmaj7/E, Esus(add9)/E.

**VRB bundle id:** **`weber_field`** — 8 fingerprints + Garbarek / Wheeler / Schneider negative discriminators.

**Big Band arranger id:** **`weber`** — six rules (BassForeground, KeyboardPlane, WindLineLength, DrumColor, ResonantSilence, PedalField).

**Reference works:** *Yellow Fields* · *Silent Feet* · *The Colours of Chloë* · *Pendulum* · *Endless Days*

**Evaluation:** **`weberStyleProfile.ts`** — pass on pedal persistence ≥0.70, functional cadence ≤0.22, bass-as-harmony ≥0.78, phrase arc ≥0.68, revoicing ≥0.58; hard fail on Garbarek modal-sax bleed, Wheeler polyaxial slash bleed, Schneider orchestral swell bleed.

---

### Carla Bley (`carla_bley`)

Bley is the most **formally intelligent and ironically structured** voice in ECM Chamber Jazz. Music makes clarity itself ironic — surfaces may sound plain, hymn-like, or march-like, but composition lives in how that material is **repositioned, interrupted, hollowed out, or dryly re-voiced**.

**Three pillars**

1. **Formal irony** — sections behave like characters; material returns with altered meaning.
2. **Deadpan presentation** — dynamic rhetoric and climax inflation stay lower than the material promises.
3. **Tonal legibility with displacement** — center stays detectable; cadences sidestepped or drained of rhetorical payoff.

**ECM separators**

| | **Bley** | **Wheeler** | **Garbarek** | **Schneider** | **Threadgill** |
|---|----------|-------------|--------------|---------------|----------------|
| Move | Reframes legible topic | Suspends polyaxial field | Ritualizes modal center | Blooms orchestrally | Systematizes cells |
| Cadence | Deadpan deflection | Open 6/9 / slash | Open modal / drone | Rich non-triadic swell | Pitch-set seams |
| Texture | Low-gloss collage | Brittle chamber | Sparse ritual | Tiered narrative | Anti-metric bloom |

**Irony mechanisms (musical rules)**

| Mechanism | Rule |
|-----------|------|
| `climaxUnderCut` | Major build → within 4 bars: density drop, pause, or plain landing |
| `topicMismatch` | Legible hymn/march/cabaret topic staged, then reframed by understatement |
| `quotationWindow` | 5–15% stylized reference (march/hymn/cabaret) as comment, not development |
| `repriseDefamiliarization` | Return with altered orchestration, register, harmony, or bar length |

**Song Mode slice** — **`carlaBleySlice.ts`** (`cbl:*` receipts): topic staging → motif contamination → climax deflation → reprise with altered meaning.

**Seven parameters** (0–1, defaults in parentheses):

| Parameter | Default | Musical role | Sweet spot |
|-----------|---------|--------------|------------|
| `formalIronyIndex` | 0.70 | Probability section introduces legible topic then reframes it | 0.62–0.78 |
| `deadpanPresentation` | 0.75 | Keeps swell/gloss below what material promises | 0.68–0.82 |
| `tonicLegibility` | 0.65 | Tonal center detectable in 65%+ of sections | 0.58–0.72 |
| `cadenceDeflection` | 0.60 | Dominant prep resolves away from root-position tonic | 0.52–0.68 |
| `motifContamination` | 0.55 | Repeated phrases alter exactly one feature | 0.48–0.62 |
| `climaxDeflation` | 0.55 | Major builds undercut within 1–4 bars | 0.48–0.62 |
| `repriseDefamiliarization` | 0.65 | Returns with strongly altered domain | 0.58–0.72 |

**Big Band arranger id:** **`bley`** — six rules (TopicStaging, RepriseReframing, ClimaxDeflation, DeadpanCadence, QuotationWindow, LowGlossOrchestration).

**Reference works:** *Fancy Chamber Music* · *Trios* · *Andando el Tiempo* · *Life Goes On* · *Appearing Nightly* · *Big Band Theory*

**Evaluation:** **`bleyStyleProfile.ts`** — pass on sectional irony ≥0.60, cadential dryness, tonal legibility with derailment, formal deflation, motivic contamination; hard fail on Wheeler slash independence, Schneider swell, Garbarek drone ritual, Threadgill cell fragmentation without topic play.

---

### Billy Strayhorn (`billy_strayhorn`)

Strayhorn composes from **inside the chord colour and phrase line simultaneously** — melody and harmony are one integrated extended-tone system. This is **not** Ellington with more lush harmony.

| | **Strayhorn** | **Ellington** |
|---|---------------|---------------|
| Primary engine | Chromatic song architecture + long legato line | Sonority, timbral contrast, riff logic |
| Harmony motion | Color continuity, tritone sub, minor-third drift, enharmonic pivots | Functional blues frames, jungle growl, shout derivation |
| Melody | Defines chord from above (maj7/9/11/13 on strong beats) | Character writing for players, call/response |
| Texture | Sustained closed blocks + inner voice motion | Sectional contrast, spot-effect blocks, dramatic stops |
| Choose Strayhorn when | Balanced song form, chromatic ballad, Lush Life lineage | Mood suites, jungle colour, shout choruses, player portraits |

**Song Mode slice** — **`billyStrayhornSlice.ts`** (`bs:*` receipts): chromatic reinterpretation passes + extended-tone enrichment + parallel color planing + tonal obscuring cadences.

**Six parameters** (0–1, defaults in parentheses):

| Parameter | Default | Musical role | Sweet spot |
|-----------|---------|--------------|------------|
| `chromaticContinuity` | 0.72 | Tritone sub, minor-third drift, enharmonic pivot, descending dom chains vs diatonic function | 0.65–0.80 |
| `extendedToneMelody` | 0.68 | Accented melody on maj7/9/11/13 not root/5th | 0.60–0.75 |
| `parallelColorMotion` | 0.55 | Non-functional m6/maj7 planing at phrase openings | 0.45–0.65 |
| `phraseArcLength` | 0.65 | Ballad 6–10 beats before breath; rubato 10–14 | 0.58–0.72 |
| `innerVoiceActivity` | 0.60 | Semitone/whole-step inner motion ≥45% of chords | 0.52–0.68 |
| `closedBlockSustain` | 0.55 | Block voicing persists ≥2 bars as structural texture | 0.48–0.62 |

**Big Band arranger id:** **`strayhorn`** — six rules (CompactBlock, SaxCountermelody, InnerVoiceMotion, ChromaticHarmonyRhythm, CrossSectionBlend, NoEllingtonRiff).

**Reference works:** *Lush Life* · *Chelsea Bridge* · *Blood Count* · *Lotus Blossom* · *Isfahan* · *A Flower Is a Lovesome Thing*

**Evaluation:** **`strayhornStyleProfile.ts`** — extension occupancy, phrase continuity, chromatic architecture score, parallel color motion, inner-voice density, closed-block duration; hard fail on Ellington riff/shout/sectional triggers.

---

---

### Bill Holman (`bill_holman`)

Holman is a **chart-first linear contrapuntist**. Harmony is what happens when independent melodic lines sound together — not the starting point. In a Holman soli or shout chorus, every voice carries a melodically satisfying line; the vertical sonority is the byproduct of cooperative line-weaving.

**Three separators**

| | **Holman** | **Brookmeyer** | **Thad Jones** | **Nelson** |
|---|------------|----------------|----------------|------------|
| Starting point | Chart / lead line | 3-note pitch module | Dense chromatic stacks | Pedal modal + blues sections |
| Inner voices | Independent contours | Module-derived strands | Chromatic color fill | Quartal planing / sectional |
| Shout texture | Spread outer + reed cushion | Climax cluster / quartal | Close nonachord blocks | Orchestral swell + blues solo |
| Choose Holman when | Sax soli + shout with classical voice-leading | Pitch-module through-composition | Extended common-practice colour | Two-layer pedal/blues form |

**Song Mode slice** — **`billHolmanSlice.ts`** (`bh:*` receipts): Step 1 lead line → Step 2 independent inner voices → Step 3 vertical harmony from lines → Step 4 voice-leading gate (parallel 5ths/8ths suppressed).

**Six parameters** (0–1, defaults in parentheses):

| Parameter | Default | Musical role | Sweet spot |
|-----------|---------|--------------|------------|
| `lineIndependence` | 0.78 | Inner voices have own contour vs chord-tone filling | 0.72–0.85 |
| `voiceLeadingSmoothness` | 0.72 | Stepwise inner motion; contrary outer motion rewarded | 0.65–0.80 |
| `saxSoliDensity` | 0.68 | Probability of 5-voice sax soli as primary texture | 0.60–0.75 |
| `shoutChorusSpread` | 0.65 | Spread outer brass + close inner cluster in shouts | 0.55–0.72 |
| `approachNoteWeight` | 0.70 | Half-step approach to inner-voice targets | 0.62–0.78 |
| `countermelodyActivity` | 0.62 | Second singable counter-line against lead | 0.55–0.70 |

**Sax soli architecture:** Lead alto upper register; voices descend stepwise in register; baritone bass support near tenor range; each voice must pass independent singability check.

**Shout chorus architecture:** Spread outer voices (high lead trumpet, low bass trombone); inner mid-register cluster; reeds cushion below brass — not Thad close-position block, not Nestico riff repetition.

**Big Band arranger id:** **`holman`** — six rules (ChartFirst, SaxSoli, ShoutChorus, Countermelody, VoiceLeadingGate, LinearHarmony).

**Reference works:** Holman charts for Stan Kenton · Mel Lewis Orchestra · Bill Holman Band recordings (*The Sound of Jazz* lineage · Kenton *Adventures in Jazz* era · Mel Lewis Monday Night Band soli writing).

**Evaluation:** **`holmanStyleProfile.ts`** — pass on line independence ≥0.70, voice-leading score, approach notes, countermelody presence, sax soli quality; hard fail on parallel 5ths/8ths, chord-tone arpeggio inner voices, Brookmeyer pitch-module dominance, Thad chromatic fill without contour, Nelson sectional blues dominance, close-block shouts without spread.

---

### Bob Brookmeyer (`bob_brookmeyer`)

- **Pitch-module spine:** Generative **3-note cell** (Brookmeyer pitch module); harmony and rhythm are derivatives (**inversion / retrograde / augmentation / diminution**) — not chord-chart-first planning.
- **`lineFirstHierarchy`:** **`VoiceRuleBundle`** flag drives **`voiceLeadingSolver`** — **melody wins** when symbols disagree with the active module (**`voiceRuleBundles.ts`**, **`voiceLeadingSolver.ts`**).
- **Solo gate:** Slice defers **solo-permitted** episodes until composed architecture completes (episode receipts **`brk:*`**).
- **`brookmeyerPeriodMode`:** **`early_brookmeyer`** vs **`late_brookmeyer`** — early = tighter swing grid + brass clarity; late = looser grid, chamber dialogue across sections (**`GenerateRequest`** / manifests).

### Oliver Nelson (`oliver_nelson`)

- **Two-layer form:** Planner tags **`pedalBased`**, **`bluesModalHybrid`**, **`twoLayerForm`** — **modal / pedal head** episodes vs **functional 12-bar C minor blues** solo layer (**`nelsonEpisodeTypes.ts`**, **`oliverNelsonSlice.ts`**).
- **Pedal field:** Bass **i** pedal (**`activePedal`** pitch class); upper structures alternate **♭IIImaj7** and **IVmaj7** (e.g. **E♭maj7** / **Fmaj7** over **C**) — **`upperModalChords`** metadata.
- **Turnaround:** **♭VI7(9,13) → V7(9,13) → im7** default; optional **Dø7–G7** bar-12 variant; **ivm7** minor IV (**Fm7**), not gospel **IV7**, unless optional colour.
- **`NelsonPeriodMode` / `NelsonBluesFormVariant`:** **`early_nelson` / `middle_nelson` / `late_nelson`** × **`twelve_bar` / `sixteen_bar`** — API **`nelsonPeriodMode`**, **`nelsonBluesFormVariant`** on **`GenerateRequest`** + manifests.

### Olivier Messiaen (`messiaen`) — modes, colour, rhythm

- **Limited transposition modes 2 / 3 / 4** — Pool tiers **`messiaen_mode2`**, **`messiaen_mode3`**, **`messiaen_birdsong`** (**`seed % 3`**); harmony spine favours **colour translation**, not functional **V→I** discharge.
- **`messiaenPeriodMode`:** **`early_messiaen`** (modes + theological programme) · **`middle_messiaen`** (birdsong-as-structure + CTI-style stacks) · **`late_messiaen`** (birdsong-heavy colour cosmology).
- **`colourTag` stub** (`generationMetadata`) — maps active mode tag → Messiaen colour label until a dedicated colour engine exists.
- **Birdsong layer:** Receipts / metadata allow **extreme-treble ornamental** strata decoupled from bar-grid melody (**`om:*`** family).
- **Non-retrogradable rhythm:** Palindrome / additive rhythm receipts — phrase windows may carry **prime-length** sixteenth totals and **non-retrogradable** cells.

**Messiaen colour stub** (`generationMetadata.colourTag`) — until **`engines/messiaen-colour-engine`** supplies live tags, the slice maps active limited-transposition mode tag → catalogue colour:

| Mode tag | Colour label |
|----------|--------------|
| Mode 2¹ | violet-blue |
| Mode 2² | gold-brown |
| Mode 2³ | green |
| Mode 3¹ | orange-gold |
| Mode 3² | grey-mauve-gold |
| Mode 3³ | blue-green |
| Mode 3⁴ | orange-red |
| Mode 4¹ | grey-gold-blue |
| Mode 6¹ | grey-gold-orange |

---

## GCE Structural Memory

### What it is

**GCE Structural Memory** is a small **JSON fingerprint library**: each entry captures measurable **structure** of a chart you already trust (density per bar, drum activity shape, where rehearsal marks land and how much the texture shifts, how long melodic instruments sit out, and guards against robotic melodic repetition). Fingerprints live under **`engines/composer-os-v2/gce-memory/fingerprints/`** as named JSON files (for example **`orbit_v6_64.json`**).

### Why it exists

Iterative generation often revisits the **same failure modes**—too many identical melodic cells, a horn section that disappears for half the form, drums that never breathe, or section letters that print on the page but do not change the band’s weight. Structural memory gives the pipeline a **concrete reference**: reject candidates that repeat known bad shapes before you burn time on subjective listening rounds.

### How it works (extract → store → validate → retry)

1. **Extract** — From a finished score (usually exported MusicXML that already hits your quality bar), the engine computes a fingerprint: bar-by-bar **density**, **drum narrative** counts, **section transitions**, **rest-span profiles** on melodic parts, and melodic **pitch-sequence** behaviour.
2. **Store** — You save that fingerprint under a stable id so it can be loaded later (same id used by scripts and registry lookups).
3. **Validate** — Each new candidate score is checked against the chosen fingerprint (and/or extra gates such as the Steely Orbit V2 pack below). Failures return a **plain-text list** of what diverged.
4. **Retry** — Orchestration scripts can loop on new seeds until validation passes or you hit a max-attempt budget.

Think of it as **lint for orchestration**, grounded in a chart you already like.

### The five Steely Orbit V2 gate rules (what each catches)

Batch scripts such as **`npm run orbit:steely-v2`** ( **`engines/composer-os-v2`** ) can require **five** independent checks against a reference fingerprint before combined GCE runs. **Steely Orbit V2** uses **`steely_orbit_target`**—same lineage as **`orbit_v6_64`** through bar **56**, but bars **57–64** encode **thinning** (hand off toward Orbit darkness, not Bill Evans’ dense V6 tail). Any **8-bar window** that overlaps **57–64** can use a **looser** mean-abs cap (**`STEELY_V2_DENSITY_ZONE_MAX`**, default **0.65**); every other window still uses the strict **0.4**-scale rule (**`STEELY_V2_DENSITY_EIGHT_MAX`**).

| Rule | What it catches |
|------|-----------------|
| **Melodic pitch sequence streak** | More than **two consecutive bars** with the **same pitch sequence** on a melodic part **outside** the opening phrase (bars **1–4** are exempt). Stops “copy-paste” melodic loops that read as lazy sequencing. |
| **Alto rest span** | **Alto sax** (and similar constraints in tooling) sitting silent for **too many bars in a row** outside exempt regions—prevents the lead voice vanishing when it should stay present. |
| **Density vs reference (8-bar windows)** | **Mean absolute deviation** between your candidate’s bar-density curve and the reference, scanned across **every 8-bar window**. Flags ensemble **weight** drift; **Steely** adds the **transition-zone** exception above so intentional drain at the end is not scored against the wrong artistic target. |
| **Drum narrative variance (16-bar windows)** | **Population variance** of drum voice-1 activity inside **every 16-bar span**. Catches **flat** drum parts that never change contour—machine-like timekeeping with no narrative arc. |
| **Section transition density delta** | At each **rehearsal mark** after the intro, the **absolute change** in density across the transition must clear a floor (default **0.1**). Catches **labels without theatre**: “Fill” or “Shout Chorus” printed where the band’s thickness never actually shifts. |

Scripts may expose environment variables to relax individual gates while you fix orchestration—defaults aim at the **full set** above.

### Format gate overrides (ensemble floors)

When reasoning about “good enough” combined scores **by ensemble**, the repo carries **hint floors** (not a substitute for the main GCE evaluator threshold, but useful for comparing apples to oranges):

- **Big band:** **7.3** (empirical floor post BB scorer calibration; see **`steely_orbit_target`** V2.1 baseline)
- **String quartet:** **8.0**
- **Duo:** **8.8**
- **ECM chamber:** **8.8**

Defined in **`gceMemoryRegistry.ts`** as **`formatGateOverrides`**.

### Adding a new fingerprint

1. Start from a **high-scoring export** you trust (same length and form as the project you will gate).
2. Run extraction in code or via the repo’s seed pipeline: **`npm run gce:seed-structural-fingerprints`** from **`engines/composer-os-v2`** refreshes canonical fingerprints from the Orbit MusicXML sources when those files change.
3. **Save** the fingerprint JSON into **`engines/composer-os-v2/gce-memory/fingerprints/`** with a clear id (for example **`my_reference_64`**).
4. Optionally register **`format:songwriterId` → fingerprint id** in **`gceMemoryRegistry.ts`** so **`getBestFingerprint`** resolves automatically for that pairing.

Each time you promote a **better** export to “canonical,” regenerate or overwrite the JSON—the registry **gets smarter** because validation targets move toward **proven** layouts.

### Using structural memory to improve an existing score

Load the reference fingerprint, run **`validateAgainstFingerprint`** on your candidate score with a chosen numeric **tolerance**. You get back a **failure list**: per-bar density mismatches, drum shape mismatches, mismatched rehearsal transitions, rest-span drift, and melodic streak violations—**edit those bars first** instead of guessing.

For Big Band iteration specifically, **`validateSteelyOrbitV2FingerprintGate`** narrows the five-rule pack before combined evaluation so you do not chase a high style score on a structurally broken chart.

### Intent tags (reference fingerprints)

Optional **`intentTags`** on a fingerprint JSON declare **macro dramaturgy** so validators do not punish charts for the wrong aesthetic:

| Tag | Effect on Steely V2 gate (when present on the **reference** fingerprint) |
|-----|---------------------------------------------------------------------------|
| **`sparse_ending`** | Loosens the **57–64 density** transition tolerance slightly (adds **+0.15** to the zone mean-abs cap — stacks with env overrides). |
| **`constant_density`** | Sets **section rehearsal |densityΔ|** floor to **0** — allows flat orchestration between formally labelled sections when the reference chart is **texture-static by design**. |
| **`bright_opening`** | Documentary tag today — reserved for future gates (brightness vs darkness scoring). |
| **`gradual_darkening`** | Documentary — pairs with sparse-ending drains or long arcs. |
| **`climax_driven`** | Future use: expect a mid-form ensemble spike (validators may tighten mid-thirds rather than relax globally). |
| **`through_composed`** | Documentary — minimal sectional rehearsal contrast expected. |

Shipped examples: **`steely_orbit_target`** uses **`bright_opening`**, **`gradual_darkening`**, **`sparse_ending`**; **`orbit_v6_64`** uses **`gradual_darkening`**, **`constant_density`**.

### Works across formats

Fingerprints carry a **format** tag (**big band**, **string quartet**, **duo**, **ECM**). Extraction targets that format’s scoring layout; the **workflow** is the same everywhere—extract trusted output, validate new runs against it, retry.

---

*Structural memory is additive: every high-quality artifact you codify becomes a reusable **anchor** for the next generation pass.*

---

## Riff Generator

Preset **`riff_generator`** — short-loop MusicXML (1–32 bars) to the **Riffs** library. Internal quality gate uses **`scoreRiffGce`** (not duo / Song Mode GCE). VRB family tags, odd-meter overlay, and per-bar locks are documented in **`engines/composer-os-v2/core/counterpoint/INVARIANTS.md`** (Riff Generator block).

### Controls

| Control | API field | Notes |
|---------|-----------|--------|
| Loop length | `totalBars` | Stepper: **1, 2, 4, 8, 16, 32** |
| Family | UI → `riffVrbId` | **funk** · **rock** · **fusion** · **art_rock** |
| VRB | `riffVrbId` | Stub profiles: e.g. `nile_rodgers`, `led_zeppelin`, `weather_report`, `fripp` |
| Density | `riffDensity` | `sparse` · `medium` · `dense` |
| Grid | `riffGrid` | `eighth` · `sixteenth` |
| Line mode | `riffLineMode` | `single_line` · `guitar_bass` · `octave_double` |
| Bass part | `riffBass` | With `guitar_bass` line mode |
| Odd meter | `riffOddMeterPreset` | Fusion / art_rock only (`meter5`, `meter7`, `mahavishnu`, …) |
| Regenerate / mutate | `riffOp` | `regenerate` · `mutate` (needs prior `riffCarryForward`) |
| Per-bar lock | `riffBarLocks` | Preserves locked bars on regen/mutate |
| Chords | `chordProgressionText` | Pipe-delimited — see **Chord progression input** below |

### Chord progression input

Pass a pipe-delimited chord string to the riff engine via `chordProgressionText`
on `RiffGeneratorParams`. The parser resolves per-bar pitch fields when
`USE_PITCH_FIELD_NOTE_SELECTION = true`.

Format: `Dm9 | BbMaj7#11 | Eb9sus4 | AbMaj7 | F#m9 | BMaj7 | Gsus2 | Dm9`

Rules:
- One chord per bar — chord count should match `totalBars`
- Supported extensions: m9, Maj7#11, 9sus4, sus2, dom9, 13, add9
- Bad symbols log [riff-chord] warning and fall back to bar root — no silent maj7 swap
- Empty or missing input falls back to Am7 for every bar
- Loop truncation removed — up to 32 chords supported (matches bar stepper max)

Known parser behaviour: extended symbol parsing is in place; if a symbol
produces unexpected output check the [riff-chord] log before assuming
a VRB profile issue.

### Zappa Solo Generator

**Full chapter:** [COMPOSER_HANDBOOK_ZAPPA.md](COMPOSER_HANDBOOK_ZAPPA.md) · [COMPOSER_HANDBOOK_ZAPPA.docx](COMPOSER_HANDBOOK_ZAPPA.docx) — compositional vs blues-rock ferocity modes, Z-PROG-01–20 progressions, 20 scenarios, export notes.

Frank Zappa VRB auto-enables a solo overlay on generation.
No toggle needed — solo is always on when `frank_zappa` is selected.

Solo engine: `riffSoloFromZappaEngine` — uses Slonimsky `FRANK_ZAPPA`
pattern map, 7/8 rhythmic cell snapping, guide-tone nudges from
`zappaVoiceLeading`. Separate from duo `zappasoloEngine` lane.

MusicXML export:
- Guitar part: "Clean Electric Guitar", GM 28
- Solo part: "Electric Guitar Solo", GM 31
- Both export as instrument-name "Electric Guitar" for Sibelius compatibility

Chord input: pipe-delimited, up to 32 bars
Example: `Dm9 | BbMaj7#11 | Eb9sus4 | AbMaj7 | F#m9 | BMaj7 | Gsus2 | Dm9`

Known gaps post-Z5:
- 15x FZ_* songwriter receipts not yet compiled by riffReceiptCompiler
- 4x FZ_RIFF_* stub receipts not yet wired
- Zappa GCE structural fingerprint not yet created

---

## Tritonic

### What is Tritonic?

Tritonic is Composer OS’s **three-note colour engine** — small pitch-class cells (always three notes) that move by smooth voice-leading, in the harmonic world of **Wayne Shorter**: chords that **suggest** colour and tension rather than spell every function in block voicings. Your chart (or a generated progression) stays the **anchor**; tritonic cells **float above** it or spin out a **singable line** from the same material. No jazz-engine jargon required: think “upper-structure drift” or “melodic implication,” not “replace my changes.”

**Cell families:** `quartal` · `cluster` · `suspended` · `shorter_floating` · `bergonzi`

**Realisation modes:** `bb` (dense, energetic) · `sq` (smooth quartet) · `ecm` (sustained, delayed release)

---

### Two modes

| Mode | What you hear | Best when |
|------|---------------|-----------|
| **Harmonic Float** | Three-note cells colour your chord sequence from above; harmony bars stay your anchors (Vault / iReal / paste). | Big band shout, ECM wash, comping over a locked chart |
| **Melodic Trace** | Same cell chain, but the export emphasises a **singer-safe motif** — a line you can hum or put on a lead sheet. | Ballads, vocal demos, Wayne-style floating heads |

Both modes share the same cell dictionary and the **nine behaviour dials** below (0–1 sliders; **0.5 = neutral**).

---

### Orbit 28-bar solo export (v1.7p4–p11)

**Script:** `scripts/orbitSoloBatchExport28.ts` — four lead-sheet MusicXML solos for the Orbit 28-bar chart (90 BPM, 4/4). Default output: **Orbit-Solos** folder beside your Orbit BB charts.

| File | Engine |
|------|--------|
| `solo_01_tritonic.musicxml` | Tritonic vault-anchored float (`buildMusicContextFromTritonic`) |
| `solo_02_vault_triad_pairs.musicxml` | Vault triad pairs (`buildMusicContextFromVault`) |
| `solo_03_martino_linear.musicxml` | Martino linear (`realiseMartinoSolo`) |
| `solo_04_zappa.musicxml` | Zappa solo (`realiseZappaSoloFromBehaviour`) |

Each export carries an **integrity receipt** (`exportIntegrityPassed`).

#### ORBIT SOLO BATCH EXPORT — WHAT WAS FIXED (v1.7p11)

**The Problem**

All four solo files were opening in Sibelius with incorrect bar lengths — notes and rests were not grouping correctly into 4/4 bars. The music looked wrong on the page even though the files were passing internal tests.

**Why It Happened**

MusicXML files contain two separate pieces of information for every note: the duration (how many time units long the note is) and the type (whether it is a quarter, eighth, dotted quarter, etc.). Sibelius uses the TYPE to draw the note on the page, not the duration number. Our export pipeline was writing the duration correctly but not always including the type — so Sibelius was guessing, and guessing wrong.

A second problem was that dotted notes were missing their dot instruction in the file. A dotted quarter at 720 units needs an explicit dot marker — without it, Sibelius reads it as a plain quarter and the bar comes up short.

A third problem was the Martino engine using a different internal time grid (divisions=2) from the other three engines (divisions=480). This caused Sibelius to misread all Martino bar lengths from bar 2 onwards.

**What Was Fixed**

1. All four engines now use divisions=480 — one universal time grid throughout all files
2. Every note and rest now carries an explicit type (quarter, eighth, half, whole)
3. Every dotted note now carries an explicit dot marker so Sibelius draws it correctly
4. A new validation gate checks type/dot/duration consistency on every note before any file is written — the export will throw an error rather than produce a file Sibelius cannot read

**Result**

All four solo files now open in Sibelius with clean 4/4 bar groupings, correct note values, and no import warnings. The files are ready for use in the Orbit big band arrangement.

**The Four Solos — Current State**

- `solo_01_tritonic.musicxml` — Floating chromatic cells, syncopated, spacious
- `solo_02_vault_triad_pairs.musicxml` — Arpeggiated upper structure triads, lyrical
- `solo_03_martino_linear.musicxml` — Linear eighth-note lines with phrase gaps
- `solo_04_zappa.musicxml` — Dramatic, sparse, unexpected phrase lengths

All solos: 28 bars, 4/4, 90 BPM, concert pitch C

Output: `Mike Composer Files\Orbit Big Band\Orbit-Solos\`

**v1.7p6 — Tritonic density fix:** `tritonicBarDensity.ts` sets **`noteDensityPerBar`** (minimum **3** notes per bar; tension-scaled target **4–8**). `realiseTritonicSolo` expands the singer-safe strand before MusicXML export (replacing the old 1:1 timeline mapping). **`solo_01_tritonic.musicxml`:** **28 → 164** notes · average **~5.9** notes/bar · per-bar range **3–8**. **`orbitSoloBatchExport.test.ts`:** **8/8** PASS.

**v1.7p8 — Musicality pass (GCE):** `soloMusicality.ts` + `soloMusicalityXml.ts` — monophonic **D4–D6** · min **eighth** · phrase breath · **`orbitSoloMusicality.test.ts`** **28/28** (7 GCE criteria × 4 solos). Vault: monophonic triad-pair upward arpeggio (`vaultSoloMonophonic.ts`). Tritonic: **3–5** notes/bar floating cells (no 16ths). Martino: breath rests + rhythm variety + harmony snap. Zappa: note-timeline export with musicality clamp.

| File | Notes (v1.7p8) | GCE |
|------|----------------|-----|
| `solo_01_tritonic` | **65** | 7/7 PASS |
| `solo_02_vault_triad_pairs` | **58** | 7/7 PASS |
| `solo_03_martino_linear` | **77** | 7/7 PASS |
| `solo_04_zappa` | **49** | 7/7 PASS |

**v1.7p7 — Pre-Sibelius hardening:** `soloTreblePitchRange.ts` — treble concert range **C4–G6** (MIDI 60–91). `soloSibeliusHardening.ts` — harmony root sanitize · pitch clamp (inline + multiline `<pitch>`) · voice overflow trim · optional silence fill. Validator: `scripts/orbitSoloSibeliusValidate.ts`. Batch export runs hardening on all four solos automatically.

Optional preset override: `noteDensityPerBar: { min, targetLow, targetHigh }` on `TritonicMusicContextPreset`.

---

### The nine dials (0–1, default 0.5)

Each dial is a **float**, not an on/off switch. At **0.5** the engine behaves as shipped; nudge up or down to steer without replacing generative logic.

#### tension

**Musically:** Favours **darker, sharper cells** (cluster, bergonzi) vs smoother quartal/suspended choices.

**Cookbook example:** [Scenario 3 — Big Band Blues Shout in F](TRITONIC_BB_COOKBOOK.md#scenario-3--big-band-blues-shout-in-f) — high oddity and cluster peaks on the V bar.

**Sweet spots:** **BB** 0.55–0.75 · **ECM** 0.45–0.60 · **Quartet** 0.50–0.70 · **Vocal** 0.30–0.50 (keep lyric line uncluttered)

#### resolutionDelay

**Musically:** **Postpones settling** on low-tension / cadential cells — the harmony keeps “asking” instead of answering.

**Cookbook example:** [Scenario 2 — Minor Blues in C (ECM Sparse)](TRITONIC_BB_COOKBOOK.md#scenario-2--minor-blues-in-c-ecm-sparse) — ECM mode forces delayed resolution; the minor blues never fully cadences.

**Sweet spots:** **ECM** 0.65–0.85 · **BB** 0.35–0.55 · **Quartet** 0.60–0.80 · **Vocal** 0.50–0.70 (ballad float)

#### density

**Musically:** **More events per bar** vs longer spans — how busy the timeline feels under the cells.

**Cookbook example:** [Scenario 3 — Big Band Blues Shout in F](TRITONIC_BB_COOKBOOK.md#scenario-3--big-band-blues-shout-in-f) — dense all-beats comping vs sparse ECM scenarios.

**Sweet spots:** **BB** 0.65–0.85 · **ECM** 0.25–0.45 · **Quartet** 0.35–0.55 · **Vocal** 0.30–0.50

#### registralSpread

**Musically:** **Wide vertical spacing** vs tight inner-voice motion — orchestral openness vs close jazz voicings.

**Cookbook example:** [Scenario 22 — Maria Schneider (Orchestral Swell)](TRITONIC_BB_COOKBOOK.md#scenario-22--maria-schneider-orchestral-swell) — open voicing and slow swell across bar lines.

**Sweet spots:** **ECM** 0.60–0.80 · **BB** 0.55–0.75 · **Quartet** 0.40–0.60 · **Vocal** 0.45–0.65

#### contourBias

**Musically:** Steers **stepwise, singable motion** vs **leaps and registral jumps** in the projected line.

**Cookbook example:** [Scenario 40 — Cinema Noir (Descending Chromatic)](TRITONIC_BB_COOKBOOK.md#scenario-40--cinema-noir-descending-chromatic) — chromatic descent drives contour; dial down for stepwise ECM lines.

**Sweet spots:** **ECM** 0.55–0.70 (lyrical step) · **BB** 0.40–0.55 · **Quartet** 0.50–0.65 · **Vocal** 0.65–0.85

#### cadenceAvoidance

**Musically:** **Resists obvious V→I / ii→V release** — modal hover and Shorter-style perpetual float.

**Cookbook example:** [Scenario 8 — Nefertiti-Style (No Resolution)](TRITONIC_BB_COOKBOOK.md#scenario-8--nefertiti-style-no-resolution) — suspended cells, no cadential release.

**Sweet spots:** **ECM** 0.75–0.95 · **Quartet (Wayne)** 0.80–0.95 · **BB** 0.40–0.60 · **Vocal / tonal** 0.15–0.35

#### rhythmicDisplacement

**Musically:** Nudges cell onsets **off the downbeat** — syncopated float vs locked punch.

**Cookbook example:** [Scenario 37 — Samba Jazz (Bossa Offbeats)](TRITONIC_BB_COOKBOOK.md#scenario-37--samba-jazz-bossa-offbeats) — offbeat comping against straight harmonic rhythm.

**Sweet spots:** **BB / funk** 0.55–0.75 · **ECM** 0.45–0.55 · **Quartet** 0.50–0.65 · **Vocal** 0.40–0.55

#### anchorAdhesion

**Musically:** How tightly cells **honour your chart’s chord tones** vs drifting into outside colour.

**Cookbook example:** [Scenario 4 — Simple ii–V–I in C Major](TRITONIC_BB_COOKBOOK.md) — smooth SQ voice-leading through canonical changes (high adhesion). Contrast [Scenario 10 — ECM Floating (No Tonal Centre)](TRITONIC_BB_COOKBOOK.md) for low adhesion.

**Sweet spots:** **Tonal / vocal** 0.65–0.85 · **Quartet** 0.45–0.65 · **ECM** 0.30–0.50 · **BB** 0.40–0.60

#### motifSingability

**Musically:** Prioritises **smooth, narrow-range, hummable** melodic trace vs angular upper-structure lines.

**Cookbook example:** [Scenario 9 — Infant Eyes Ballad](TRITONIC_BB_COOKBOOK.md#scenario-9--infant-eyes-ballad) — slow ballad, shorter_floating cells, lead-sheet-first intent.

**Sweet spots:** **Vocal** 0.70–0.90 · **ECM ballad** 0.60–0.80 · **Quartet** 0.50–0.70 · **BB** 0.35–0.55

---

### Quick-start presets

Unlisted dials default to **0.5**. Paste into `behaviourBiases` on `TritonicRealisationContext` (API) or match in UI when sliders ship.

| Preset | tension | resolutionDelay | density | registralSpread | contourBias | cadenceAvoidance | rhythmicDisplacement | anchorAdhesion | motifSingability |
|--------|---------|-----------------|---------|-----------------|-------------|------------------|----------------------|----------------|------------------|
| **ECM / chamber** | 0.5 | 0.7 | 0.3 | 0.5 | 0.5 | 0.8 | 0.5 | 0.5 | 0.5 |
| **Big Band** | 0.6 | 0.4 | 0.7 | 0.7 | 0.5 | 0.5 | 0.6 | 0.5 | 0.5 |
| **Wayne Shorter quartet** | 0.8 | 0.8 | 0.4 | 0.5 | 0.5 | 0.9 | 0.5 | 0.4 | 0.5 |
| **Safe / tonal** | 0.3 | 0.2 | 0.5 | 0.5 | 0.5 | 0.2 | 0.5 | 0.5 | 0.8 |

**Mode pairing:** ECM preset → `ecm` · Big Band → `bb` · Wayne quartet → `sq` or `ecm` · Safe/tonal → `sq` with Harmonic Float over a diatonic chart.

---

### Where to go deeper

**[TRITONIC_BB_COOKBOOK.md](TRITONIC_BB_COOKBOOK.md)** — **60 worked scenarios** (bar-by-bar progressions + engine/behaviour notes): blues, ii–V–I, Shorter, Messiaen, cinematic, minimalist, and more. Do not duplicate those recipes here; use them as musical targets and map dials + mode to match.

---

## Song Mode — per-section engines

Long-form Song Mode can **change engine family at section boundaries** while keeping one chart. Think of each section as answering three questions before you generate.

### 1. What should this section feel like?

Pick the emotional posture first — not the dropdown label.

| Feel | What you hear | Typical section |
|------|---------------|-----------------|
| **Stable** | Locked harmony, songwriter slice owns the bars | Intro, outro, tag |
| **Suspended** | Modal hover, delayed cadence, space between chords | Verse (ballad), bridge (ECM) |
| **Eruptive** | Brass punch, dense comping, forward motion | Chorus, shout |
| **Floating** | Upper-structure colour over unchanged anchors | Bridge, Wayne-style interlude |
| **Singable** | Narrow-range motif you can hum; harmony stays underneath | Melodic trace, vocal demo |

### 2. What carries continuity across sections?

Not everything resets at a rehearsal mark. Decide what **must** persist:

- **Rhythm** — pulse, swing feel, bossa subdivision, odd-meter map
- **Interval family** — quartal vs stepwise vs cluster vocabulary (Tritonic cell family)
- **Motif contour** — phrase memory and singer-safe line shape
- **Harmony colour** — same chord roots with different upper-structure treatment

If you change engine at a boundary but keep **rhythm + harmony roots**, the form still reads as one song. If you change **interval family + motif contour** without a transition, listeners hear a hard cut — sometimes intentional (Scenario Cookbook §1.1), sometimes jarring.

### 3. What is allowed to change at the section boundary?

These may switch per section without breaking LOCK:

- **Engine family** — `song_mode` · `ecm_chamber` · `big_band` · `tritonic_vault` · `wayne_shorter`
- **Behaviour dial profile** — nine Tritonic biases (0–1); e.g. high `cadenceAvoidance` on bridge, low on chorus
- **Strand priority** — harmonic float (`voicingTop`) vs melodic trace (`singerSafeMotif`) vs voice-led line (`projectedStrand`)

Harmony **checksum** still locks after normalisation — section engines colour or realise bars; they do not silently rewrite pasted symbols.

### Section type → recommended engine → feel

Illustrative defaults when you do not set `sectionEngine` explicitly. Override any row when the dramaturgy demands it.

| Section type | Recommended engine | Feel |
|--------------|-------------------|------|
| **Intro / tag** | `song_mode` | Stable — songwriter slice harmony, familiar entry |
| **Verse** | `ecm_chamber` | Suspended — sparse or resonant ECM texture over verse changes |
| **Pre-chorus** | `song_mode` or `ecm_chamber` | Stable → suspended lift; keep roots, thin the texture |
| **Chorus** | `big_band` | Eruptive — brass punch or Freddie Green shell, forward energy |
| **Bridge** | `tritonic_vault` | Floating — Vault anchors + Tritonic cells above (ECM or SQ mode) |
| **Wayne interlude** | `wayne_shorter` | Floating — Python bridge compile; modal colour, delayed resolution |
| **Outro / coda** | `ecm_chamber` or `song_mode` | Suspended or stable — release tension, do not re-shout |

**Practical pairing:** verse ECM + chorus Big Band + bridge Tritonic vault is the shipped illustration (feel: intimate → anthem → float). For a vocal demo, set bridge to Tritonic **Melodic Trace** and raise `motifSingability` on the dials.

---

## Henry Threadgill — interval-cell Song Mode slice

**What it does:** Harmony comes from **interval cells**, not functional ii–V grammar. The slice builds **episodic modules** — each feels like a distinct chamber episode (sparse cells → hocket streams → polymodal fields → episodic blooms). Bass and upper voices can sit in **different modal areas** at once. Phrase lengths skew **anti-metric** (5, 7, 6, 9 bars) instead of default 4/8 blocks. Receipts use the **`ht:*`** prefix.

**Slice parameters (0–1, defaults in parentheses):**

| Parameter | Default | Sweet spot | Effect |
|-----------|---------|------------|--------|
| **`intervalCellDensity`** | 0.7 | 0.6–0.85 | How often bars get interval-cell enrichment (`(b9,#9,no3)`, sus clusters, quartal stacks) |
| **`antiMetricStrength`** | 0.6 | 0.5–0.75 | Irregular episode phrase lengths; more `ht:offset_*` receipts at seams |
| **`polymodalSeparation`** | 0.5 | 0.4–0.65 | Bass slash layers in a different modal area from the upper stem |
| **`episodeContrast`** | 0.6 | 0.55–0.8 | Adjacent episodes must differ in ≥2 texture/metric/modal/density axes |

**Example use case — episodic chamber form:** 24-bar piece, three 8-bar modules. Set **`intervalCellDensity`** ~0.75, **`episodeContrast`** ~0.7. Pick **`henry_threadgill`** as primary songwriter. Generate Song Mode duo — expect rotating interval families per section (`buildHarmonicScenesForVoiceBundle`) and sparse brass punctuations if you route Big Band with **`henry_threadgill`** arranger style.

**VRB cross-reference:** **`VoiceRuleBundle`** **`henry_threadgill`** ships **26** **`fingerprintReceipts`** (`HT_CELL_*`, `HT_HARM_*`, `HT_FORM_*`, `HT_RHY_*`, `HT_ORCH_*`, `HT_VVC_*`) in **`voiceRuleBundles.ts`**. The slice emits **`ht:vrb_reachable`** when the bundle is attached (≥20 fingerprints). Harmonic scene rotation uses the same three closed interval families as **`threadgillMotifIdsMatchingFamily`** in **`harmonicScene.ts`**.

---

## String Quartet — Generate panel

When you choose the **String Quartet** preset, the primary panel shapes **how the four voices behave** before you hit Generate. Pick a **texture** first — that is the musical goal. Key, tempo, and Tritonic colour refine the same plan; they do not replace it.

**Defaults:** texture **Arco melody + accompaniment** · Tritonic colour **Subtle** · key and tempo follow your project settings (empty key → **C**).

### Texture cards (pick one)

Each card is a whole ensemble posture for the run. One line under the row updates when you change selection.

| Card | What you hear |
|------|----------------|
| **Chorale** | Four voices breathe as one sustained blend — hymn-like vertical warmth. |
| **Arco melody + accompaniment** | A singing top line over supportive inner parts (default). |
| **Pad suspension** | Long tones and suspended colour; air between chord changes. |
| **Pizzicato pulse** | Short, articulated rhythm in the lower three; lift in the top if needed. |
| **Tremolo wash** | Shimmer and energy matter more than spelling every chord change. |
| **Contrapuntal weave** | Independent lines that imply harmony through motion. |
| **Duet support** | Two voices in front; viola and cello anchor register and pulse. |

### Tritonic colour

Three settings — how much **floating upper colour** sits above the locked harmony:

- **None** — grounded quartet only; no Tritonic float (even on suspended or contrapuntal textures).
- **Subtle** — light harmonic colour on the top line and one inner voice (default).
- **Active** — stronger float; use when you want Wayne-style upper-structure motion without rewriting the chart.

With **Subtle** or **Active**, open **Edit behaviour ▼** to nudge nine musical dials (tension, spacing, cadence delay, and similar). These steer feel; they do not replace the texture card.

### Seed and Variation

The seed stays fixed until you press **Variation** — same seed, same plan. Use Variation when you want a fresh layout without changing texture or colour.

### After Generate — status chips

When export succeeds, three chips summarise the realisation:

| Chip | Good sign | Watch for |
|------|-----------|-----------|
| **Smooth lines** | Stepwise, singable motion in the parts | **Rough** — many leaps; try a calmer texture or lower tension |
| **Spacing** | Registers stay open; bass not crowded | **Crowded** — inner voices too tight in the low register |
| **Crossings & parallels** | Clean voice order and outer-voice motion | **Needs attention** — crossings or exposed parallel fifths/octaves |

### Advanced panel

Collapsed by default. After a run it lists the full diagnostic readout (crossings, crowding, leap averages, harmonic completeness, texture stability). If Tritonic colour is on, the same panel repeats the **behaviour sliders** for fine tuning between takes.

---

## Tritonic UI — Generate monitor

After Generate, a **Tritonic monitor** stacks on the right when the run used Tritonic float (`tritonic`, `vault_tritonic`, or `wyble_tritonic`) or when **String Quartet** has Tritonic colour set to **Subtle** or **Active**. Same layout every time: **Harmonic Float** (scrolling anchor columns) · **active cell** card (family, tension, resolution badge, sparkline) · **Melodic Trace** (contour, hover-only detail) · **bias side rail** (full sliders before generate, compact strip after) · **Diagnostics** (collapsed strip).

### Scenario 1 — Locked chart, harmonic float

You imported a chart from iReal Pro or Tonality Vault. After Generate, **Harmonic Float** shows one column per anchor bar: chord symbol at the base, cell glyph above, colour for stable · colouristic · unresolved · cadence-ready, vertical position for register. Scroll the strip before export — a glowing edge on a quiet bar is a natural breath or a Bartók-style delayed landing.

### Scenario 2 — Melodic trace for a vocal line

In the same run, **Melodic Trace** draws the singer-safe line bold, the voice-led strand ghosted behind it, faint markers where the voicing top arrives. Hover a column for note name, interval from the previous note, and beat placement — shape first, labels only on demand. If the bold line stair-steps, nudge **Motif singability** or **Contour bias** on the side rail, then **Variation**.

### Scenario 3 — Active cell, dials, and diagnostics

Before a second take, read the **active cell** card: cell family, tension, resolution badge (**locked** · **near** · **eligible** · **resolving**), and a tension sparkline over the last two phrases. Open **Diagnostics** for unresolved tones, contour variety, cadence strength, and rhythmic offset mix. The rail highlights the most influential bias and the one you changed last.

### The same screen, different ensembles

The Tritonic monitor speaks differently depending on what you are writing for. Same panels, different questions.

#### String quartet — blend and line

Close-knit, voice-sensitive. The question is not just “how tense is this chord?” but “which voice is creating the colour, and is the blend still singing as one body?”

**Scenario:** You are writing a warm floating intro for the four players. You check Harmonic Float to see where the colour is being created — is it the viola carrying the tension or the second violin? Then you look at Melodic Trace to make sure the first violin line still has a graceful arc rather than turning into a scale exercise. A glowing edge on a quiet chord tells you the phrase could resolve here — you might hold it one bar longer for the Bartók-style delayed arrival.

#### Big band — section weight and arrival

Sectional, weight-sensitive. A warm bright cluster over one anchor may mean “the brass are pressing.” A cooler wider colour suggests the reeds are carrying a smoother body of sound.

**Scenario:** You are writing a shout chorus and need to decide when to let the band land. The central card tells you whether the phrase is still building or ready to arrive. The floating colours show accumulated heat — three bars of warm saturation means the band has been suspended long enough. One bar with a glowing edge: that is your hit point.

**Scenario:** You are writing a Thad Jones-style soli for the saxes over a slow groove. Melodic Trace shows whether the soli line has a memorable shape or has wandered into a series of unconnected figures. If the contour keeps climbing without a release, the line will feel exhausting rather than inevitable.

#### Guitar / bass duo — space and implication

Exposed, conversational. Two players implying a whole harmonic world with very little material. Space between attacks matters as much as the notes themselves.

**Scenario:** You are writing a rubato opening. The guitar suggests harmony, the bass answers in fragments. Melodic Trace shows whether the phrase feels singable and human. Harmonic Float shows whether the implied harmony glows with intention or simply looks incomplete. Cool settled colour over an ambiguous chord means the music is comfortable in its own mystery — that is often exactly right for this setting.

**Scenario:** Orbit Suite — New Orleans sketch. The bass owns the second-line groove. The guitar floats Tritonic cells on the upper strings. Harmonic Float shows the cells arriving late behind the beat — warm colour blooming after the anchor, not on it. That delay is the whole point. If the colour appears on the downbeat, tighten the **Rhythmic displacement** slider.

#### Wayne Shorter quartet — tension and narrative

Suspended, story-driven. The question is always: are we moving toward something or deliberately away from it?

**Scenario:** You are writing an Infant Eyes-style ballad. The harmony sits on a maj7 for two bars. Harmonic Float shows sustained warm colour — the cell is hanging above the chord, neither confirming nor contradicting it. The central card shows **near** — the phrase could resolve but has not been told to yet. You leave it. Two bars later the card shifts to **resolving** on its own. That moment is the composition.

#### ECM / chamber — sparsity and atmosphere

Textural, atmospheric. Less is more. Long silences between events are as important as the events themselves.

**Scenario:** You are writing an ECM-style duo for guitar and cello. Most bars have one Tritonic cell, maybe two. Harmonic Float shows long gaps of cool settled colour with occasional warm blooms. The diagnostics strip shows low contour variety — the melody is staying close, almost static. That is not a problem. That is the sound.

#### Diagnostics by ensemble

The strip below the panels renames its priorities by context:

| Context | Read first |
|---------|------------|
| **String quartet** | Unresolved tones · line independence |
| **Big band** | Cadence strength · section balance |
| **Guitar / bass duo** | Contour variety · rhythmic offset |
| **Wayne Shorter** | Resolution delay · anchor adhesion |
| **ECM** | Sparsity (low event density) · registral spread |

---

## Population Composer

### Introduction

**Population Composer** is a hybrid harmony producer that treats competing engines as an **ecology**, not a playlist. Five producers — **tritonic**, **monk**, **wayne_shorter**, **vault**, and **big_band** — each propose harmonic cells every bar. A selection pass picks the survivor based on dramatic fitness, contrast with recent winners, and inheritance pressure (so underused voices get another chance).

Harmony is normalised through **`normalizeChordSymbol`** and locked with a checksum receipt: **`population_composer_realisation_complete`** (`generationCount`, `dominantProducer`, `producerWeightHistory`, `dramaticArcCompliance`).

Always-on. No feature flag. API entry: **`buildMusicContextFromPopulation()`** with **`sourceEngineId: 'population_composer'`**.

### How to think about it

| Mental model | Wrong model |
|--------------|-------------|
| **Who wins this bar given the story phase?** | Pick one engine for the whole chart |
| **Dramatic arc drives fitness** — build · suspend · fracture · cadence · restart | Random rotation between producers |
| **Contrast keeps the ecology alive** | Same producer every bar sounds “consistent” but flat |
| **Vault anchors; others colour** | Population replaces your pasted chart |

Plan **`dramaticArc`** segments first (1-indexed bar ranges). Then choose which producers sit in the pool. Monk and tritonic spike on **fracture**; vault and big_band on **cadence**; Wayne on **suspend**; tritonic on **build** tension.

| Producer | Natural bias |
|----------|--------------|
| **tritonic** | Tension-shaping, upper-structure fracture |
| **monk** | Angular compression, sudden shifts |
| **wayne_shorter** | Oblique drift, delayed resolution |
| **vault** | Harmonic anchoring, pedal stability |
| **big_band** | Sectional weight, forward motion |

| Dramatic phase | What the listener feels |
|----------------|-------------------------|
| **build** | Material accumulating |
| **suspend** | Hover — question without answer |
| **fracture** | Rupture, angle, surprise |
| **cadence** | Arrival (or engineered near-arrival) |
| **restart** | Reset energy for next section |

### **Monk Walks into a String Quartet**

**Style/context:** You want SQ export truth but harmony that **refuses** to behave — Monk proposals winning during fracture bars while vault holds the cadence.

**Settings:** Producers: all five · `dramaticArc`: bars 1–8 **build**, 9–12 **fracture**, 13–16 **cadence** · `inheritancePressure` 0.35 · `contrastWeight` 0.6 · seed **10601** · key **C**.

**What you hear:** Bars 1–8 accumulate quartal and BB weight; 9–12 snap to chromatic neighbour cells and tritone nudges; 13–16 vault stabilises before a Monk-flavoured tag.

**Why it works:** Monk’s bias signature peaks on **fracture** (0.94 fitness); vault peaks on **cadence** (0.96). The arc tells the ecology when to be rude vs when to land.

### **Wayne Floats Over a Locked Vault Chart**

**Style/context:** Paste or import a static chart; let **wayne_shorter** and **tritonic** float above vault anchors without rewriting roots.

**Settings:** Producers: **vault**, **wayne_shorter**, **tritonic** only · `dramaticArc`: 1–16 **suspend** · `mutationRate` 0.15 · seed **22001**.

**What you hear:** Symbol stream stays vault-anchored; per-bar winners alternate Wayne drift and tritonic colour — Nefertiti-style perpetual float.

**Why it works:** Wayne’s **suspend** fitness (0.86) and vault’s anchoring (0.92) co-dominate; tritonic adds fracture colour without cadence discharge.

### **Big Band Takes the Bridge**

**Style/context:** Verse-like **suspend** gives way to a shout **build** on the bridge — population simulates section handoff without manual engine swapping.

**Settings:** Producers: **big_band**, **tritonic**, **vault** · Arc: 1–8 **suspend**, 9–16 **build**, 17–20 **cadence** · `contrastWeight` 0.7 · seed **33002**.

**What you hear:** Sparse suspended bars thicken; BB proposals dominate 9–16; cadence bars vault-heavy with tritonic peaks on the penultimate bar.

**Why it works:** BB **build** fitness 0.88 vs vault **suspend** 0.92 — contrast layer promotes BB once phase flips.

### **Fracture at Rehearsal D**

**Style/context:** Rehearsal mark **D** is a deliberate rupture — monk + tritonic contest every bar in the fracture window.

**Settings:** Producers: **monk**, **tritonic** · Arc: 1–7 **build**, 8–11 **fracture**, 12–16 **restart** · `mutationRate` 0.35 · seed **44003**.

**What you hear:** Predictable build cells; bar 8 onward angular clusters and displaced tritone proposals; restart phase reintroduces vault-like stability via inheritance pressure.

**Why it works:** Narrow pool + high mutation under **fracture** keeps monk/tritonic trading; **restart** favours monk (0.86) for fresh motif cells.

### **Cadence That Refuses to Confirm**

**Style/context:** Harmonic drama where **cadence** phase still avoids clean V→I — Wayne + tritonic win cadence bars.

**Settings:** Producers: **wayne_shorter**, **tritonic**, **vault** · Arc: 1–12 **suspend**, 13–16 **cadence** · `inheritancePressure` 0.5 · seed **55004**.

**What you hear:** Long hover; final four bars feel “almost landing” — vault proposals present but Wayne/tritonic often win on contrast.

**Why it works:** Wayne cadence fitness is low (0.48) but suspend carryover + contrast beats vault when `contrastWeight` is high.

### **Ecology of a Shout Chorus**

**Style/context:** Full five-producer pool on a 32-bar form — watch **`dominantProducer`** in the receipt shift by section.

**Settings:** All five producers · Arc: 1–8 **build**, 9–16 **suspend**, 17–24 **fracture**, 25–28 **cadence**, 29–32 **restart** · seed **66005** · 32 bars.

**What you hear:** Weight history scrolls in the receipt — BB dominant in build, Wayne in suspend, monk/tritonic in fracture.

**Why it works:** Long-form arc exercises every bias signature; **`dramaticArcCompliance`** scores how often winners matched phase fitness.

### **Vault Pedal, Tritonic Storm**

**Style/context:** One-chord pedal section — vault should anchor while tritonic fractures upper structure.

**Settings:** Producers: **vault**, **tritonic** · Arc: 1–4 **build**, 5–12 **fracture**, 13–16 **cadence** · `contrastWeight` 0.55 · seed **77006**.

**What you hear:** Harmonic symbols stay pedal-class consistent; tritonic wins most fracture bars; cadence vault-heavy.

**Why it works:** Vault fracture fitness is low (0.22) — tritonic (0.88) owns the middle; vault reclaims cadence.

### **Restart Tag After the Ballad**

**Style/context:** Ballad **cadence** dissolves into a **restart** tag — monk and wayne_shorter trade for a fresh head motive.

**Settings:** Producers: **monk**, **wayne_shorter**, **vault** · Arc: 1–12 **suspend**, 13–15 **cadence**, 16–20 **restart** · seed **88007**.

**What you hear:** Floating middle; soft cadence cells; tag bars angular with Wayne drift returning.

**Why it works:** Monk **restart** fitness 0.86; Wayne 0.82 — both favour fresh material over vault closure.

### **Folk Music from Nowhere**

**Style/context:** Apparent “folk” simplicity — vault + big_band build diatonic weight, then monk **fracture** bars inject foreign neighbour tones so the tune feels collected from field recordings.

**Settings:** All five · Arc: 1–16 **build**, 17–20 **fracture**, 21–24 **cadence** · `inheritancePressure` 0.4 · `mutationRate` 0.25 · seed **99008** · key **G**.

**What you hear:** Singable harmonic rhythm early; sudden wrong-note bar 17; cadence feels like a song you almost remember.

**Why it works:** Population ecology lets **simple** and **wrong** coexist in one checksum-locked timeline — folk surface, modernist fracture underneath.

---

## Zappa Solo Producer

### Introduction

**Zappa Solo** is a **melodic dramatist**, not a harmony engine. You supply **`harmonyBars`**; the producer never authors chord symbols. It wraps **`generateZappaSolo`** into MusicContext with pitch-language metrics and optional solo arc segments.

Participation inside Population Composer ecology:

| Level | Role |
|-------|------|
| **primary** | Full solo line over supplied harmony |
| **secondary** | Melodic contamination of other agents’ motifs |
| **tertiary** | Pitch-colour pressure only — no chord authorship |

Solo arc states (not bar-locked punctuation): **claim** · **agitation** · **fracture** · **crooked_landing**.

Receipt: **`zappa_solo_realisation_complete`** — `modalAnchorRatio`, `motifMutationRecurrence`, `rhythmicElasticityScore`, `targetedDissonanceIndex`, `closureRefusalScore`, `conversationalAsymmetry`.

API: **`buildMusicContextFromZappaSolo()`** · **`sourceEngineId: 'zappa_solo'`** · harmony **`source: locked`**.

### How to think about it

Pitch language is three layers: **60–75%** primary modal field (dorian · mixolydian · lydian · natural_minor · harmonic_minor · phrygian) · **15–25%** pentatonic/blues reduction · **10–20%** near-neighbour foreign tones — not random chromatic spray.

Rhythm uses **elastic packets** — uneven subdivisions, breath bars, 7/8 cell snapping when **`barMeterMap`** is set.

| Arc state | Solo behaviour |
|-----------|----------------|
| **claim** | Motif stated; modal anchor established |
| **agitation** | Density and dissonance rise; rhythmic elasticity |
| **fracture** | Cell disruption; register collision |
| **crooked_landing** | Closure refused or sidestepped |

### **Claim over a Shimmering Vamp**

**Style/context:** One-chord or two-chord vamp; solo **claims** the space in **primary** participation with mixolydian field.

**Settings:** Harmony: `Eb7sus4 | Eb7sus4 | Eb7sus4 | Eb7sus4` (×4) · `modalField`: **mixolydian** · `participationLevel`: **primary** · `soloArc`: 1–4 **claim** · seed **90441** · density **0.65**.

**What you hear:** Single motif family over static harmony; high `modalAnchorRatio`; few leaps outside the field.

**Why it works:** Claim phase + static harmony maximises modal anchor; harmony checksum unchanged — LOCK intact.

### **Dorian Glue on a Two-Chord Loop**

**Style/context:** Am7–D7 funk vamp; dorian primary field with conversational asymmetry.

**Settings:** Harmony: `Am7 | D7 | Am7 | D7` (×4) · `modalField`: **dorian** · `participationLevel`: **primary** · seed **90442** · `dissonanceLevel` 0.4.

**What you hear:** Motif recurs with mutation; targeted dissonance on D7 bars only.

**Why it works:** Near-neighbour foreign tones (10–20%) land on dominant bars without rewriting **`harmonyBars`**.

### **Agitation Through the Turnaround**

**Style/context:** Blues turnaround — arc moves from **claim** to **agitation** mid-form.

**Settings:** Harmony: 12-bar Bb blues symbols · `soloArc`: 1–4 **claim**, 5–8 **agitation**, 9–12 **crooked_landing** · `modalField`: **mixolydian** · seed **90443**.

**What you hear:** Bars 5–8 denser note count; `rhythmicElasticityScore` rises; landing sidesteps clean resolution.

**Why it works:** Arc state steers density and closure refusal independently of chord count.

### **Fracture in 7/8**

**Style/context:** Zappa odd-meter solo over supplied **`barMeterMap`** — fracture phase aligns with rhythmic cell lock.

**Settings:** Harmony: 8 bars dominant alt chain · `barMeterMap`: 3+3+2 eighths per bar · `soloArc`: 1–3 **claim**, 4–6 **fracture**, 7–8 **crooked_landing** · seed **77777**.

**What you hear:** 7/8 packets in fracture window; breath space after motif statements; export pitch clamp 52–84.

**Why it works:** Elastic rhythm model respects meter map; fracture boosts `targetedDissonanceIndex` without altering harmony.

### **Secondary Contamination on a Head**

**Style/context:** Population run where Zappa participates **secondary** — motifs bleed into tritonic/monks cells, not a separate solo staff.

**Settings:** Harmony: 16 bars locked chart · `participationLevel`: **secondary** · `modalField`: **phrygian** · seed **90445**.

**What you hear:** No full solo line; motif intervals appear in **`motif`** metadata; `motifMutationRecurrence` tracks contamination.

**Why it works:** Secondary level attaches melodic pressure without primary **`generateZappaSolo`** export line.

### **Tertiary Colour Over ECM Pedal**

**Style/context:** ECM sparse pedal — Zappa as **tertiary** pitch-colour only.

**Settings:** Harmony: `Dbmaj7 | Dbmaj7 | Dbmaj7 | Dbmaj7` (×4) · `participationLevel`: **tertiary** · `modalField`: **lydian** · seed **90446**.

**What you hear:** Harmony symbols identical to input; receipt shows tertiary + low `noteCount`; colour metrics nudged only.

**Why it works:** Tertiary path skips full solo generation; LOCK checksum matches supplied bars exactly.

### **Harmonic Minor Crooked Landing**

**Style/context:** Minor-key theatre — **crooked_landing** refuses picardy third.

**Settings:** Harmony: `Am | B7 | Em | Am` (×3) · `modalField`: **harmonic_minor** · `soloArc`: 1–8 **agitation**, 9–12 **crooked_landing** · seed **90447**.

**What you hear:** Final bars avoid raised leading tone resolution; `closureRefusalScore` elevated in receipt.

**Why it works:** Crooked landing arc + harmonic minor field keeps minor colour at cadence.

### **Lydian Claim on Maj7#11**

**Style/context:** Lydian field over maj7#11 harmony — claim phase matches shimmer.

**Settings:** Harmony: `Fmaj7#11 | Gmaj7#11 | Am7 | D7alt` (×2) · `modalField`: **lydian** · `participationLevel`: **primary** · seed **90448** · density **0.72**.

**What you hear:** #11 harmony and lydian solo align; wide leaps on maj7 bars only.

**Why it works:** Modal field matches chord colour; primary participation fills **`motif.intervalPattern`**.

### **Comic Brass Contamination**

**Style/context:** Big-band chart with Zappa **secondary** over shout chorus — “wrong” melodic figures infect brass-motif metadata.

**Settings:** Harmony: 16-bar BB-style progression (pipe-delimited) · `participationLevel`: **secondary** · `modalField`: **mixolydian** · `dissonanceLevel` 0.7 · `soloArc`: 9–12 **fracture** · seed **90449**.

**What you hear:** Harmonic rhythm straight; fracture-window contamination spikes `conversationalAsymmetry` — comic wrong-note energy without reharm.

**Why it works:** Secondary + fracture arc targets motif mutation during densest harmonic bars only.

---

## Sonic Youth Tuning Producer

### Introduction

**Sonic Youth Tuning** is a dedicated **`sy_tuning`** MusicContext producer — separate from the general **`alternateGuitarTunings.ts`** catalog. It builds **shape-resonance harmony**: Wyble abstract anchors translate into tuning-native fret shapes on two guitars, then feed the existing Duo lower-guitar role resolver (SY-specific weights).

Receipt: **`sy_tuning_realisation_complete`** — `openStringResonanceRatio`, `shapeRedundancyScore`, `clusterIdentityScore`, `retuneDependenceIndex`, `resonanceContinuityMetric`, `parallelShapeUsage`, `tertianNormalizationPenalty`.

API: **`buildMusicContextFromSYTuning()`** · always-on.

### How to think about it

Think **guitar physics first**, chord names second. Open strings define what can ring; archetype defines how the two guitars relate. Export symbols may be sus/clusters — high **`tertianNormalizationPenalty`** means you escaped vanilla maj7/min7 spelling on purpose.

### Five tuning presets

| Preset ID | Plain language | Open strings (low → high) |
|-----------|----------------|---------------------------|
| **f_sharp_unison** | Brutal unison grid — massive F# drone plus dissonant colour | F#2 F#2 F#3 F#3 E4 B4 |
| **doubled_fifths** | Classic doubled 5ths — blurred chord identity | G2 G2 D3 D3 A3 A3 |
| **narrow_consonant** | Narrow range — block slides, drone-chord morphing | A2 A2 C3 C3 G3 G3 |
| **cluster_friction** | G/G# minor-second friction built into the grid | A2 C3 C3 G3 G#3 C4 |
| **drone_melody** | Open drone symmetry — complementary dual-guitar writing | E2 G2 D3 G3 C4 D4 |

### Three pairing archetypes

| Archetype | Plain language | Guitar A / Guitar B |
|-----------|----------------|---------------------|
| **mass_mass** | Both guitars same tuning — maximum drone and shape redundancy | Primary preset on both |
| **mass_knife** | Wide block meets cutting cluster — narrow_consonant + cluster_friction | Block mass vs friction knife |
| **drone_shard** | Pedal drone meets splinter cluster — drone_melody + cluster_friction | Ringing low strings vs upper friction |

### **Steel Mill Lullaby**

**Style/context:** Slow noise-rock lullaby — **f_sharp_unison** + **mass_mass** for industrial drone.

**Settings:** `tuningId`: **f_sharp_unison** · `archetype`: **mass_mass** · 16 bars · seed **10603** · bpm **56**.

**What you hear:** Unison grid rings through; harmony symbols cluster/sus-like; high `openStringResonanceRatio`.

**Why it works:** mass_mass doubles the brutal grid — shape redundancy scores high; lower guitar often **pedal** role.

### **Unison Grid at Rehearsal Volume**

**Style/context:** Maximum volume scenario — same preset, faster harmonic rhythm.

**Settings:** `tuningId`: **f_sharp_unison** · `archetype`: **mass_mass** · 8 bars · seed **10604** · bpm **120**.

**What you hear:** Dense shape plans per bar; `parallelShapeUsage` elevated.

**Why it works:** Shorter form keeps checksum stable while seed drives fret-offset variation.

### **Doubled Fifths, Blurred Identity**

**Style/context:** Classic SY “what chord is this?” — **doubled_fifths** blurs functional identity.

**Settings:** `tuningId`: **doubled_fifths** · `archetype`: **mass_mass** · 12 bars · seed **10605**.

**What you hear:** Fifth stacks beat tertian names; moderate `tertianNormalizationPenalty`.

**Why it works:** Doubled 5ths tuning resists clean maj/min spelling in export symbols.

### **Mass Meets Knife**

**Style/context:** **mass_knife** archetype — block vs cutting cluster dialogue.

**Settings:** `tuningId`: **narrow_consonant** · `archetype`: **mass_knife** · 16 bars · seed **10606**.

**What you hear:** Guitar 1 block slides; guitar 2 G/G# friction; `clusterIdentityScore` peaks mid-form.

**Why it works:** Catalog pairs narrow_consonant + cluster_friction automatically for mass_knife.

### **Drone and Shard**

**Style/context:** **drone_shard** — ringing low drone vs upper splinter.

**Settings:** `tuningId`: **drone_melody** · `archetype`: **drone_shard** · 12 bars · seed **10607**.

**What you hear:** Low strings sustain; upper cluster attacks; `guide_tone_lane` elevated on drone_melody preset vs pure cluster runs.

**Why it works:** drone_shard pairs drone_melody + cluster_friction; SY lower-guitar resolver favours guide-tone on drone tuning.

### **Cluster Friction Between Songs**

**Style/context:** Transition texture — only **cluster_friction** in mass_knife pairing for maximum friction.

**Settings:** `tuningId`: **cluster_friction** · `archetype`: **mass_knife** · 4 bars · seed **10608**.

**What you hear:** Minor-second rub constant; `clusterIdentityScore` high throughout.

**Why it works:** cluster_friction preset embeds G/G# rub in open-string layout.

### **Wyble Anchors Without Tertian Names**

**Style/context:** Supply **`wybleAnchorBars`** — sus shapes only, no maj7/min7 cadences.

**Settings:** `wybleAnchorBars`: `Fsus2 | Gsus4 | Asus2 | Bsus4` · `tuningId`: **narrow_consonant** · `archetype`: **mass_mass** · seed **88001**.

**What you hear:** Export harmony bars avoid tertian suffixes; shape engine translated anchors.

**Why it works:** Wyble anchors steer shape harmony without copying tertian cadences — test asserts no maj7/m7/7 endings.

### **Open-String Resonance Study**

**Style/context:** Analyse receipt metrics — maximise ringing open strings.

**Settings:** `tuningId`: **drone_melody** · `archetype`: **drone_shard** · 24 bars · seed **10609** · slow bpm **48**.

**What you hear:** Long ringing tails; `resonanceContinuityMetric` high bar-to-bar.

**Why it works:** drone_melody + slow tempo + shard upper voice = sustained resonance metric profile.

### **Minimalism in a Narrow Cage**

**Style/context:** Reich/Glass adjacent — **narrow_consonant** block slides in tight range.

**Settings:** `tuningId`: **narrow_consonant** · `archetype`: **mass_mass** · 32 bars · seed **10610** · bpm **96**.

**What you hear:** Small fret-motion cells repeat; `shapeRedundancyScore` high; minimal harmonic symbol change.

**Why it works:** Narrow consonant tuning limits pitch world — block slides read as process music within SY producer.

---

## Dual-Guitar Lower Voice

### Introduction

The **Dual-Guitar Lower Voice** layer extends **`buildMusicContextFromDuo()`** (V105p4, refined in v1.6 docs). Upper harmony stays export truth; a **per-bar role resolver** plans the lower guitar (or second guitar) part — not a second melody by default.

Receipt: **`duo_realisation_complete`** — `lowerGuitarRoleDistribution`, `registralCollisionCount`, `parallelMotionCount`, `instrumentTopology`, `duoIntent`.

### How to think about it

Pick **topology** first (who is in the band), then **intent** (supportive glue vs conversational trade). The resolver assigns one of five **roles** per bar from upper + bass harmony context.

### Three topologies

| Topology | Plain language |
|----------|----------------|
| **guitar_bass** | Classic duo — lower voice is bass; no lower-guitar role plan |
| **dual_guitar** | Two guitars only — lower guitar comp/counter from upper symbols |
| **dual_guitar_bass** | Guitar 1 + guitar 2 + bass — lower guitar sits between melody and bass |

### Five lower-guitar roles

| Role | Plain language |
|------|----------------|
| **guide_tone_lane** | 3rd/7th glue under the upper part — default strong-beat support |
| **counterline** | Scalar answer or contrary motion — conversational |
| **pedal** | Sustained or repeated anchor — space and drone |
| **sparse_comp_answer** | Short rhythmic answer — not continuous comping |
| **rest** | Intentional silence — room for bass or upper register |

**Intent modes:** **supportive** favours guide-tone + pedal; **conversational** favours counterline + sparse_comp_answer.

### **Bass Sage Guitar Trickster**

**Style/context:** **dual_guitar_bass** — bass holds root sage; lower guitar **trickster** conversational roles.

**Settings:** Topology: **dual_guitar_bass** · `duoIntent`: **conversational** · Upper: 8-bar jazz changes · Bass: roots · seed **12345**.

**What you hear:** Bass steady; lower guitar sparse answers and counterlines; some **rest** bars.

**Why it works:** Conversational intent weights counterline + sparse_comp_answer; bass symbols anchor inferBassSymbol path.

### **Supportive Glue on a Ballad**

**Style/context:** Slow ballad — lower guitar glues guide-tones under sustained upper voicings.

**Settings:** Topology: **dual_guitar_bass** · `duoIntent`: **supportive** · Upper: `Fmaj7 | Em7 | Am7 | Dm7 | G7 | Cmaj7` (×2) · Bass: letter roots · seed **12346**.

**What you hear:** High guide_tone_lane + pedal tally in receipt; fewer registral collisions than conversational.

**Why it works:** Supportive intent test expectation — more glue roles than conversational on same harmony.

### **Conversational Trade on a Blues**

**Style/context:** 12-bar blues — two guitars talk; bass walks.

**Settings:** Topology: **dual_guitar_bass** · `duoIntent`: **conversational** · 12 bars Bb blues · seed **9001**.

**What you hear:** Call-and-response between upper and lower guitar roles bar-to-bar.

**Why it works:** Resolver alternates sparse_comp_answer and counterline when intent is conversational.

### **Dual Guitar Without Bass**

**Style/context:** **dual_guitar** topology — no bass part; lower guitar implies bass register alone.

**Settings:** Topology: **dual_guitar** · Upper: `Em7 | Am7 | B7 | Em7` · Lower export truth mirrors upper (no separate bass) · seed **55**.

**What you hear:** Lower guitar plans from upper symbols only; `lowerGuitarEnabled` true in receipt.

**Why it works:** dual_guitar path resolves without bass bars — inferBassSymbol falls back to upper.

### **Guide-Tone Lane Under a Shout**

**Style/context:** Dense upper voicings — force supportive guide-tone majority.

**Settings:** Topology: **dual_guitar_bass** · `duoIntent`: **supportive** · Upper: dense dom7alt chain · Bass: roots · seed **4242**.

**What you hear:** Lower guitar sits on 3rds/7ths; low parallel_motion_count if voices separate registers.

**Why it works:** Supportive + dominant harmony favours guide_tone_lane weights in resolver.

### **Pedal Points in ECM Rubato**

**Style/context:** ECM slow pedal — lower guitar **pedal** role dominates.

**Settings:** Topology: **dual_guitar_bass** · `duoIntent`: **supportive** · Upper: `Dbmaj7` pedal (×8) · Bass: Db · seed **77701**.

**What you hear:** Sustained lower-guitar midis; pedal count high in role distribution.

**Why it works:** Static harmony + supportive intent boosts pedal weighting.

### **Sparse Comp Answers Between Phrases**

**Style/context:** Upper guitar phrases with breath — lower guitar answers in gaps.

**Settings:** Topology: **dual_guitar_bass** · `duoIntent`: **conversational** · Upper: sparse 8-bar folk changes · seed **88802**.

**What you hear:** **rest** bars aligned with upper rest; sparse_comp_answer on phrase endings.

**Why it works:** Resolver penalises consecutive sparse_comp_answer — natural phrase boundaries.

### **Counterline on the Inner Voice**

**Style/context:** Lower guitar contrary motion to upper melody register.

**Settings:** Topology: **dual_guitar_bass** · `duoIntent`: **conversational** · Upper: stepwise maj key · seed **99903**.

**What you hear:** counterline role midis move opposite to upper contour hints.

**Why it works:** Conversational weights + stepwise upper harmony favour scalar counterline MIDI band 48–64.

### **Counterpoint on the Street Corner**

**Style/context:** Indie duo busking — dual_guitar_bass, mixed roles, intentional collisions for grit.

**Settings:** Topology: **dual_guitar_bass** · `duoIntent`: **conversational** · Upper: 16-bar I–V–vi–IV loop · Bass: roots · seed **100004**.

**What you hear:** Full role distribution in receipt — all five roles represented; occasional registral_collision_count > 0.

**Why it works:** Long conversational run exercises full role vocabulary — street-corner independence, not studio polish.

---

## Try These First — v1.6 producers

Quick paths if you are new to v1.6 producers:

| If you want… | Start here | Seed |
|--------------|------------|------|
| Hybrid harmony that **changes personality by bar** | Population — **Monk Walks into a String Quartet** | 10601 |
| Solo that **never touches your chord chart** | Zappa — **Claim over a Shimmering Vamp** | 90441 |
| **Noise-rock tuning** without dropdown catalog confusion | SY Tuning — **Steel Mill Lullaby** | 10603 |
| **Two-guitar comp** that is not a second solo | Dual-Guitar — **Supportive Glue on a Ballad** | 12346 |

**Workflow tips:**

1. Plan dramatic arc (Population) or supply locked harmony (Zappa) **before** seed sweeps.
2. Read receipts after every generate — **`dominantProducer`**, **`modalAnchorRatio`**, **`openStringResonanceRatio`**, **`lowerGuitarRoleDistribution`** tell you what actually happened.
3. Same seed → same checksum — use **Variation** only when you mean to change the plan.
4. SY Tuning is **not** the general alternate-tuning dropdown — use **`buildMusicContextFromSYTuning()`** preset surface.
5. For ensemble handoff, chain producers via MusicContext hops (limit 3) — Population harmony → Zappa primary solo → Duo dual_guitar_bass export.

---

## Scenario Cookbook

Practical scenario starting points across composers,
harmonic voices, modes and sections. All multi-section
scenarios require `totalBars > 16`. Song mode examples
use `sectionLabelMode: song`; instrumental examples
use `sectionLabelMode: instrumental` (default).

---

### 1. Stylistic Contrast (Jekyll & Hyde Sections)

**1.1 — Sacred to Chaotic**
Sections: `opening: arvo_part` · `development: ornette_coleman` · `reprise: arvo_part`
Crystalline stillness gives way to semi-independent pitch fields, then returns to silence. Hard cut at the development boundary — no ramp between tintinnabuli and free jazz families.
Key: totalBars 32+, instrumental mode.

**1.2 — French Refinement vs Soviet Brutalism**
Sections: `opening: ravel` · `development: shostakovich` · `coda: ravel`
Smooth impressionist opening, displaced downbeats and dark modal harmony in the middle, refined resolution at close. Cross-family hard cut at opening→development.
Key: instrumental mode, transitionBars 2 at ravel boundaries.

**1.3 — Hollywood Sweep to Serial Fragmentation**
Sections: `opening: williams` · `contrast: webern` · `reprise: williams`
Strong orchestral narrative collapses into pointillist extremes (σ=40), then recovers. Maximum register contrast.
Key: webern σ=40 ceiling active, instrumental mode.

---

### 2. Same-Family Blending

**2.1 — Impressionist Watercolour**
Blend: `debussy 0.5 + ravel 0.5` across full composition.
Parallel planing softened by Ravel's voice-leading clarity. σ interpolated 20–21.
Key: `blendVrbIds: ['debussy','ravel']`, `blendWeights: [0.5, 0.5]`.

**2.2 — Broadway Gradient**
Sections: `intro: cole_porter` · `verse: cole_porter` · `chorus: gershwin` · `outro: cole_porter`
Controlled cabaret feel (swing 0.52) in verses, broader jazz exuberance (swing 0.65) in chorus. Tempo-adaptive curve widens the gap at slower tempos.
Key: song mode, bpm 90.

**2.3 — Cinematic Three-Way**
Blend: `morricone 0.4 + herrmann 0.35 + badalamenti 0.25`
Epic modal drama shadowed by chromatic unease with noir space. σ clamped to morricone ceiling (22).
Key: `blendVrbIds: ['morricone','herrmann','badalamenti']`.

---

### 3. Pitch-Field Journeys

All pitch-field scenarios require instrumental mode. Song-mode guard suppresses pitch-field spine in song mode.

**3.1 — Free to Structured**
Sections: `opening: ornette_coleman` · `development: coltrane` · `coda: messiaen`
Loose harmolodic field tightens into interval-cell patterns, then settles into static modal colour. Freedom to stasis.
Key: totalBars 48+.

**3.2 — Modal Rainbow**
Sections: `opening: messiaen` (M1 Floating) · `statement: coltrane` · `development: messiaen` (M7 Dense) · `coda: ornette_coleman`
Whole-tone openness → interval-cell density → dense 10-note field → harmolodic dissolution.
Key: `messiaenModeId: 1` opening, `messiaenModeId: 7` development.

**3.3 — Texture as Narrative**
Sections: `opening: messiaen` (M2 Shadowed) · `development: ligeti` · `coda: ornette_coleman`
Octatonic colour absorbed into chromatic micropolyphony, then freed into pitch fields.
Key: totalBars 64+.

**3.4 — Ascending Complexity Arc**
Sections: `opening: ornette_coleman` · `statement: coltrane` · `development: ligeti` · `coda: messiaen`
Interaction-driven looseness → pattern saturation → micropolyphony → static modal resolution.
Key: totalBars 64+.

**3.5 — Reverse Arc**
Sections: `opening: messiaen` (M2) · `development: coltrane` · `climax: ornette_coleman`
Ordered modal colour dissolves through pattern saturation into harmolodic freedom.
Key: instrumental only.

---

### 4. Messiaen Mode Explorations

| Mode | Label | Pitch Classes | PCs |
|------|-------|---------------|-----|
| M1 | Floating (Whole Tone) | 0,2,4,6,8,10 | 6 |
| M2 | Shadowed (Octatonic) | 0,1,3,4,6,7,9,10 | 8 |
| M3 | Luminous | 0,2,3,4,6,7,8,10,11 | 9 |
| M4 | Austere | 0,1,2,5,6,7,8,11 | 8 |
| M5 | Sparse | 0,1,5,6,7,11 | 6 |
| M6 | Veiled | 0,2,4,5,6,8,10,11 | 8 |
| M7 | Dense | 0,1,2,3,5,6,7,8,9,11 | 10 |

**4.1 — Colour Sequence (Light to Dark)**
Sections: M1 Floating → M2 Shadowed → M6 Veiled → M7 Dense
All sections use messiaen; different modeId per section. Journey of increasing harmonic saturation.

**4.2 — Symmetric Pair (ABA)**
Sections: M1 · M2 · M1
Whole-tone bookends the octatonic middle. pedalPolicy: bass-drone where available.

**4.3 — Sparse to Dense**
Sections: M5 Sparse → M3 Luminous → M7 Dense
Progressive densification. Feels like a slow harmonic awakening.
Key: totalBars 48+.

---

### 5. Temporal Extremes

**5.1 — Still vs Shattered**
Sections: `opening: arvo_part` (HR min 4 bars) · `development: bartok` (HR min 0)
Maximum harmonic rhythm contrast — sustained tintinnabuli chords collapse into rapid chromatic cluster changes.

**5.2 — Zimmer Drone vs Shostakovich Fracture**
Sections: `opening: zimmer` · `contrast: shostakovich`
Layered pad stasis gives way to metric instability.
Key: transitionBars 2.

**5.3 — Pärt Bookends with Ligeti Core**
Sections: `opening: arvo_part` · `development: ligeti` · `coda: arvo_part`
Tintinnabuli silence frames micropolyphonic texture. Cross-family hard cuts at both boundaries.
Key: totalBars 64+, Ligeti pitch-field active.

---

### 6. Jazz Lineage

**6.1 — Decades in Four Sections**
Sections: `opening: cole_porter` · `verse: gershwin` · `chorus: coltrane` · `coda: ornette_coleman`
Broadway cabaret → jazz-classical → modal interval cells (pitch-field) → harmolodic freedom. A century of jazz.
Key: song mode for porter/gershwin, instrumental for coltrane/ornette; bpm 120.

**6.2 — Swing Gradient**
Sections: `intro: cole_porter` (0.52) · `verse: gershwin` (0.65) · `chorus: turtle_island` (0.80)
Progressive swing intensification. Gap widens at slow tempos via tempo-adaptive curve.
Key: song mode, bpm 80.

**6.3 — Joni Mitchell Bridge**
Sections: `verse: cole_porter` · `bridge: joni_mitchell` · `chorus: gershwin`
Broadway sophistication flanks an open-tuning quartal bridge. σ: Porter 25, Joni 23, Gershwin 27.
Key: song mode.

---

### 7. Cinematic Arc

**7.1 — The Hero's Journey**
Sections: `opening: badalamenti` · `statement: morricone` · `development: goldsmith` · `climax: williams` · `coda: badalamenti`
Noir ambience → epic modal drama → Hollywood tension → orchestral sweep → noir return. σ: 21→22→24→26→21.
Key: totalBars 64+, boundary ramp active (cinematic family).

**7.2 — Suspense to Resolution**
Sections: `opening: herrmann` · `development: goldsmith` · `coda: williams`
Hitchcock unease → Hollywood tension → orchestral resolution. σ narrows as tension resolves: 36→24→26.

**7.3 — Zimmer Ostinato Arc**
Blend: `zimmer 0.6 + morricone 0.4`
Modern epic ostinato pads with modal drama undertow.
Key: `blendVrbIds: ['zimmer','morricone']`.

---

### 8. Modernist Cluster

**8.1 — The Modernist Arc**
Sections: `opening: shostakovich` · `development: bartok` · `contrast: ligeti` · `coda: webern`
Displaced downbeats → chromatic clusters → micropolyphony (pitch-field) → serial pointillism (σ=40).
Key: totalBars 64+, Ligeti pitch-field active.

**8.2 — Folk to Abstract**
Sections: `opening: bartok` · `development: ligeti` · `coda: webern`
Three stages of abstraction. Key: totalBars 48+.

**8.3 — Soviet Sandwich**
Sections: `opening: shostakovich` · `contrast: ligeti` · `reprise: shostakovich`
Same modernist family — boundary ramp smooths the transitions.

---

### 9. East-West Fusion

**9.1 — Three Shades of Modal**
Blend: `messiaen 0.4 + debussy 0.4 + ravel 0.2`
Symmetric modal colour + parallel planing + refined voice-leading. σ ~21. suppressFunctionalResolution hard-switches on.
Key: `blendVrbIds: ['messiaen','debussy','ravel']`, `messiaenModeId: 2`.

**9.2 — Sacred and Impressionist**
Sections: `opening: arvo_part` · `development: messiaen` (M3 Luminous) · `coda: arvo_part`
Tintinnabuli stillness frames Messiaen's luminous 9-note modal field.
Key: totalBars 48+.

**9.3 — Satie's Irony vs Messiaen's Devotion**
Sections: `opening: satie` · `development: messiaen` (M2 Shadowed) · `coda: satie`
Ironic parallel triads bookend octatonic modal devotion. σ: Satie 19, Messiaen 22.

---

### 10. Minimal vs Maximal

**10.1 — The Sigma Journey**
Sections: `opening: arvo_part` (σ=16) · `development: ligeti` (σ=32) · `climax: webern` (σ=40) · `coda: arvo_part` (σ=16)
Register begins at narrowest, doubles, reaches maximum, collapses back. Pure register drama.
Key: totalBars 64+, all cross-family hard cuts.

**10.2 — Glass vs Herrmann**
Sections: `opening: glass` (σ=18) · `contrast: herrmann` (σ=36) · `coda: glass` (σ=18)
Additive diatonic cells give way to Hitchcock chromatic clusters, then return.

**10.3 — Minimal Blend Pushed Wide**
Blend: `arvo_part 0.3 + webern 0.7`
Blend-capped σ ≈ 29. tintinnabuli hard-switches OFF (weight < 0.65). Wide-register serial feel with slight modal anchoring.

---

### 11. Solo Instrument Simulation

**11.1 — Sax and Bass Duo (Ornette Style)**
Format: Guitar/Bass duo · Composer: `ornette_coleman`
Guitar takes melody overlay (overlap 0.75), bass takes floating overlay (overlap 0.55). No chord roots.
Key: duo mode, Ornette pitch-field, democraticEnsemble true.

**11.2 — Coltrane Quartet Simulation**
Format: SQ mode · Composer: `coltrane`
Melody cycles interval-cell patterns (sheets of sound), inner voices share cell at 0.80 overlap, bass holds modal pedal.
Key: SQ mode, Coltrane pitch-field, densityDrive 0.8.

**11.3 — String Quartet Micropolyphony**
Format: String Quartet · Composer: `ligeti`
Four voices enter staggered, each moving stepwise within the chromatic cluster field.
Key: string quartet mode, Ligeti pitch-field, clusterWidth 8, motionBlur 0.70.

---

### 12. Swing Gradient

**12.1 — From Grid to Groove**
Sections: `opening: arvo_part` (grid) · `verse: cole_porter` (0.52) · `chorus: gershwin` (0.65) · `outro: turtle_island` (0.80)
Metronomic stillness to cabaret precision to jazz exuberance to loose group swing.
Key: song mode, bpm 80.

**12.2 — Late Night Slow Burn**
Sections: `intro: satie` · `verse: badalamenti` · `chorus: gershwin`
Dry ironic opening, Twin Peaks chromatic space, full Broadway swing.
Key: song mode, bpm 70.

**12.3 — Fast and Straight**
Sections: `opening: cole_porter` · `development: gershwin` · `coda: cole_porter`
At bpm 200 tempo-adaptive curve straightens swing — Porter drops toward 0.43, Gershwin toward 0.54. Gap ≥ 0.10 maintained.
Key: instrumental, bpm 200.

---

# Martino Linear Expressions — Creative Scenarios Guide
## 20 Wildly Different Uses for Composer OS v1.1.0

---

## Introduction

Martino Linear Expressions is not a bebop line generator. It is a rule-based melodic architecture engine that reduces every chord to its minor centre, applies canonical templates (A1–A8), scores the result across 8 dimensions, and rejects anything that doesn't pass the GCE gate. The result is a highly disciplined, deeply idiomatic guitar voice that sounds like Pat Martino thought about it.

The 20 scenarios below push the engine into radically different creative territories — from teaching tools to film scoring to avant-garde composition. Each includes exact settings.

---

## Scenario 1 — The Bebop Vocabulary Builder (Teaching)

**Concept:** Use the engine as a daily practice tool. Generate a new linear phrase over a ii–V–I each day, print it, and play it in 12 keys.

**Settings:**
- Tune name: `Daily Line [date]`
- Chords: `Dm7 G7 Cmaj7 Cmaj7`
- Choruses: 1
- Primary activity: A1 — Opening Line
- Secondary: A2 — Diagonal Bridge
- Dominant tension: Low
- Mode: Teaching
- Explain mode: ON

**Why it works:** Teaching mode surfaces the reduction logic bar by bar. The student sees why each note was chosen — minor centre, template, role — rather than just copying a lick.

---

## Scenario 2 — The Ballad Study (Lyrical Phrasing)

**Concept:** Generate a long-form melodic study over a slow ballad form. Focus on wide interval spans and lyrical contour.

**Settings:**
- Preset: Beatrice (16 bars)
- Choruses: 2
- Primary activity: A7 — Long Span
- Secondary: A2 — Diagonal Bridge
- Dominant tension: Low
- LFV: min 5, max 9
- Mode: Teaching

**Why it works:** A7 (Long Span) produces wide ascending gestures over 2 bars. Over Beatrice's modal ii–V changes this creates an Evans-like lyrical quality rather than eighth-note bebop density.

---

## Scenario 3 — The Modal Drone Study (ECM Aesthetic)

**Concept:** Generate linear phrases over static modal changes. Wire ECM Chamber mode to push toward open, spacious contour.

**Settings:**
- Chords: `Fmaj7 Fmaj7 Fmaj7 Fmaj7 Ebmaj7 Ebmaj7 Ebmaj7 Ebmaj7`
- Choruses: 1
- Primary activity: A1 — Opening Line
- Secondary: A2 — Diagonal Bridge
- Dominant tension: Low
- ECM mode: ECM_METHENY_QUARTET
- Mode: Performance

**Why it works:** ECM_METHENY_QUARTET hints push the tension map toward low, producing floating lines that sit above the harmony rather than cutting through it.

---

## Scenario 4 — The Rhythm Changes Burner (High Energy)

**Concept:** Full-speed rhythm changes, maximum chromatic tension on dominants, A4 Anchor Arp for propulsive drive.

**Settings:**
- Chords: `Bbmaj7 G7 Cm7 F7 Dm7 G7 Cm7 F7 Bb7 Eb7 Bb7 F7 Fm7 Bb7 Ebmaj7 Edim7 Bb7 G7 Cm7 F7 Bbmaj7 G7 Cm7 F7 Dm7 G7 Cm7 F7 Bb7 Eb7 Bb7 Bbmaj7`
- Choruses: 2
- Primary activity: A4 — Anchor Arp
- Secondary: A1, A3
- Dominant tension: High
- LFV: min 3, max 9
- Mode: Performance

**Why it works:** High dominant tension on G7, F7, Bb7 pushes chromatic enclosures. A4 Anchor Arp on the tonic bars creates contrast. Two choruses with DCR variation seed ensures chorus 2 differs from chorus 1.

---

## Scenario 5 — The Blues Archetype (12-Bar Deep Funk)

**Concept:** Use the Blues genre profile over a slow blues with maximum tension and Anchor Arp as primary.

**Settings:**
- Preset: Blues genre profile
- Chords: `F7 F7 F7 F7 Bb7 Bb7 F7 F7 C7 Bb7 F7 C7`
- Choruses: 3
- Primary activity: A4 — Anchor Arp
- Secondary: A3 — Pivot Cell
- Dominant tension: High
- LFV: min 3, max 10

**Why it works:** Anchor Arp on dominant 7ths creates the call-and-response feel of blues guitar. Three choruses with per-chorus DCR variation builds a narrative arc — each chorus escalates.

---

## Scenario 6 — The Enclosure Study (Barry Harris Crossover)

**Concept:** Activate Barry Harris crossover mode with enclosure_heavy profile over a bebop head.

**Settings:**
- Chords: `Cmaj7 A7 Dm7 G7 Em7 A7 Dm7 G7 Cmaj7 Fm7 Bb7 Ebmaj7 Am7 D7 Dm7 G7`
- Choruses: 2
- Primary activity: A6 — Enclosure Cell
- Secondary: A1, A5
- Barry Harris mode: ON (profile: enclosure_heavy)
- Dominant tension: Medium
- Mode: Teaching
- Explain mode: ON

**Why it works:** A6 Enclosure Cell + Barry Harris enclosure_heavy profile doubles down on chromatic approach tones from above and below the minor centre. The explain panel shows every enclosure move bar by bar.

---

## Scenario 7 — The Orbit Chromatic Journey (Post-Bop)

**Concept:** Orbit's symmetrical chord sequence — descending major 7ths in tritone pairs — tests the reduction engine at its limits.

**Settings:**
- Preset: Orbit
- Choruses: 1
- Primary activity: A1 — Opening Line
- Secondary: A2 — Diagonal Bridge
- Slonimsky macro: tritone_progression
- Dominant tension: Low
- LFV: min 5, max 9

**Why it works:** The Slonimsky tritone_progression hint aligns the interval vocabulary with Orbit's tritone-substitution harmonic logic. The engine's minor centre reductions track through Fmaj7#11 → Ebmaj7#5 → Dbmaj7 → Bmaj7 as a single continuous linear descent.

---

## Scenario 8 — The Scalar Embellishment Study (Barry Harris Scalar)

**Concept:** Use Barry Harris scalar_embellish profile over a standard 32-bar AABA to generate stepwise embellishments.

**Settings:**
- Chords: `Fmaj7 Em7b5 A7 Dm7 Dm7 Cm7 F7 Bbmaj7 Bbm7 Eb7 Fmaj7 D7 Gm7 C7 Fmaj7 C7` (A section × 2 + bridge + A)
- Choruses: 2
- Primary activity: A7 — Long Span
- Secondary: A3 — Pivot Cell
- Barry Harris mode: ON (profile: scalar_embellish)
- Dominant tension: Low

**Why it works:** Scalar embellishment + Long Span creates smooth stepwise lines that connect chord tones without arpeggiation — the hallmark of Barry Harris's flowing scalar approach.

---

## Scenario 9 — The Intervallic Mirror (Slonimsky Avant-Garde)

**Concept:** Push the engine into intervallic mirror territory using Slonimsky macro and high chromatic tension.

**Settings:**
- Chords: `Dm7 Ab7 Dbmaj7 G7 Cmaj7 F#7 Bmaj7 E7`
- Choruses: 2
- Primary activity: A8 — Rhythmic Displacement
- Secondary: A6 — Enclosure Cell
- Slonimsky macro: intervallic_mirror_permutations
- Dominant tension: High
- LFV: min 4, max 10

**Why it works:** Intervallic mirror Slonimsky hints combined with A8 Rhythmic Displacement and high tension produces angular, syncopated lines that would be at home in a Zappa or Holdsworth context.

---

## Scenario 10 — The ECM Schneider Chamber Texture

**Concept:** Generate a chamber-like guitar line using ECM Schneider mode, long spans, low activity.

**Settings:**
- Chords: `Dbmaj7 Dbmaj7 Gbmaj7 Gbmaj7 Abmaj7 Abmaj7 Dbmaj7 Dbmaj7`
- Choruses: 1
- Primary activity: A7 — Long Span
- Secondary: A2 — Diagonal Bridge
- ECM mode: ECM_SCHNEIDER_CHAMBER
- Dominant tension: Low
- Mode: Performance

**Why it works:** ECM_SCHNEIDER_CHAMBER pushes tension high but A7 Long Span keeps the line lyrical. The result sounds like Maria Schneider's chamber writing — dense harmonically but never cluttered melodically.

---

## Scenario 11 — The Performance Mode Showcase (No Training Wheels)

**Concept:** Performance mode removes teaching annotations and generates the cleanest possible output for direct use in a session or recording.

**Settings:**
- Tune name: `Session Line A`
- Chords: `Am7 D7 Gmaj7 Gmaj7 Cm7 F7 Bbmaj7 Bbmaj7`
- Choruses: 1
- Primary activity: A1 — Opening Line
- Secondary: A2, A5
- Dominant tension: Medium
- Mode: Performance
- Explain mode: OFF

**Why it works:** Performance mode produces a clean MusicXML file ready for Sibelius. No provenance annotations, no teaching metadata — just the line.

---

## Scenario 12 — The Multi-Chorus Narrative Arc (3-Chorus Study)

**Concept:** Use 3 choruses with DCR per-chorus variation to build a complete melodic narrative — introduction, development, climax.

**Settings:**
- Chords: `Dm7 G7 Cmaj7 A7 Dm7 G7 Cmaj7 Cmaj7`
- Choruses: 3
- Primary activity: A1 — Opening Line
- Secondary: A2, A3, A4
- Dominant tension: Medium (chorus 1), escalating via DCR seed
- LFV: min 5, max 9
- Mode: Teaching
- Explain mode: ON

**Why it works:** Chorus 1 starts with carry_key=None (default opening). Chorus 2 seeds from pivot, chorus 3 from anchor — creating a natural arc from lyrical to rhythmic to grounded.

---

## Scenario 13 — The Pentatonic Slonimsky Overlay

**Concept:** Use pentatonic Slonimsky macro over a blues-adjacent progression to blend Martino's linear approach with pentatonic vocabulary.

**Settings:**
- Chords: `Am7 Am7 D7 D7 Am7 Am7 E7 D7`
- Choruses: 2
- Primary activity: A3 — Pivot Cell
- Secondary: A4 — Anchor Arp
- Slonimsky macro: pentatonic_scales
- Dominant tension: Medium

**Why it works:** Pentatonic Slonimsky hints steer the interval vocabulary toward minor pentatonic patterns while the Martino reduction engine keeps everything grounded in the minor centre. The result blends Wes Montgomery pentatonics with Martino's discipline.

---

## Scenario 14 — The Heptatonic Modal Study

**Concept:** Modal jazz changes with heptatonic Slonimsky macro for a Shorter/Metheny flavour.

**Settings:**
- Chords: `Dm7 Dm7 Ebmaj7 Ebmaj7 Dm7 Dm7 Ebmaj7 Fmaj7`
- Choruses: 2
- Primary activity: A2 — Diagonal Bridge
- Secondary: A7 — Long Span
- Slonimsky macro: heptatonic_scales
- Dominant tension: Low
- ECM mode: ECM_METHENY_QUARTET

**Why it works:** Heptatonic scales + Metheny ECM + Diagonal Bridge = a modal sound that floats across the changes without resolving. Pure ECM atmosphere.

---

## Scenario 15 — The Rhythm Displacement Etude (A8 Focus)

**Concept:** Make A8 Rhythmic Displacement the primary activity to generate a syncopated, off-beat study.

**Settings:**
- Chords: `Fm7 Bb7 Ebmaj7 Ebmaj7 Abm7 Db7 Gbmaj7 Gbmaj7`
- Choruses: 2
- Primary activity: A8 — Rhythmic Displacement
- Secondary: A3 — Pivot Cell
- Dominant tension: Medium
- LFV: min 5, max 9
- Mode: Teaching
- Explain mode: ON

**Why it works:** A8's beat_position offsets (+0.125) create syncopation against the bar grid. The explain panel shows where each off-beat lands relative to the minor centre — a powerful rhythmic ear-training tool.

---

## Scenario 16 — The Standard Repertoire Generator (32-Bar AABA)

**Concept:** Use the Standard genre profile to generate idiomatic lines over a classic 32-bar AABA form.

**Settings:**
- Preset: Standard genre profile
- Chords: `Fmaj7 Dm7 Gm7 C7 Am7 D7 Gm7 C7 Am7 D7 Gm7 C7 Fmaj7 D7 Gm7 C7` (A section ×2 + bridge + A)
- Choruses: 2
- Primary activity: A1 — Opening Line
- Secondary: A2, A3
- Dominant tension: Medium

**Why it works:** The Standard profile sets medium tension on dominants and a balanced activity mix — exactly the vocabulary needed for playing standards with a modern jazz approach.

---

## Scenario 17 — The Cadential Resolution Study (A5 Focus)

**Concept:** Make A5 Cadential Cell the primary activity to study how Martino approaches endings and resolutions.

**Settings:**
- Chords: `Am7 D7 Gmaj7 Gmaj7`
- Choruses: 4
- Primary activity: A5 — Cadential Cell
- Secondary: A1, A2
- Dominant tension: Low
- Mode: Teaching
- Explain mode: ON

**Why it works:** Four choruses of A5 primary with explain mode reveals the pattern of cadential approaches — how the engine resolves to the tonic minor centre across multiple harmonic contexts.

---

## Scenario 18 — The Bebop Enclosure + Approach (A6 + A5)

**Concept:** Chain enclosure approaches (A6) with cadential resolution (A5) to study the full bebop approach-to-target vocabulary.

**Settings:**
- Chords: `Dm7 G7 Cmaj7 A7 Dm7 G7 Em7 A7 Dm7 G7 Cmaj7 Cmaj7`
- Choruses: 2
- Primary activity: A6 — Enclosure Cell
- Secondary: A5 — Cadential Cell, A1
- Barry Harris mode: ON (profile: bebop_step)
- Dominant tension: High
- Mode: Teaching

**Why it works:** A6 targets the minor centre from above and below; A5 closes the phrase to the tonic. Barry Harris bebop_step profile adds passing motion between chord tones. The result is a complete bebop phrase architecture.

---

## Scenario 19 — The Film Score Sketch (Atmospheric, Non-Functional)

**Concept:** Use static non-functional harmony with ECM Schneider mode to generate atmospheric guitar lines for film scoring.

**Settings:**
- Chords: `Abmaj7 Abmaj7 Dbmaj7 Dbmaj7 Gbmaj7 Gbmaj7 Abmaj7 Abmaj7`
- Choruses: 1
- Primary activity: A7 — Long Span
- Secondary: A2 — Diagonal Bridge
- ECM mode: ECM_SCHNEIDER_CHAMBER
- Dominant tension: Low
- LFV: min 7, max 12
- Mode: Performance

**Why it works:** High LFV range (7–12) pushes the line into the upper register. ECM Schneider chamber texture + Long Span creates sustained, atmospheric melodic gestures suitable for underscore or sound design.

---

## Scenario 20 — The Complete Martino System Test (All 8 Activities)

**Concept:** Push all 8 activities (A1–A8) into a single generation to test the full vocabulary of the engine.

**Settings:**
- Chords: `Fmaj7 Gbmaj7 Fmaj7 Ebmaj7 Dm7 Ebmaj7 Dm7 Bbm7 Am7 Bbmaj7 Dm7 Fmaj7 Gbmaj7 Fmaj7 Ebmaj7 Fmaj7`
- Choruses: 2
- Primary activity: A1 — Opening Line
- Secondary: A2, A3, A4, A5, A6, A7, A8 (all)
- Dominant tension: Medium
- Slonimsky macro: heptatonic_scales
- ECM mode: ECM_METHENY_QUARTET
- Barry Harris mode: ON (profile: bebop_step)
- LFV: min 5, max 9
- Mode: Teaching
- Explain mode: ON

**Why it works:** With all 8 activities in the secondary pool, the DCR scoring engine selects the strongest variant per phrase span. The explain panel becomes a complete map of the Martino vocabulary — which activities the engine chose, why, and what the GCE said about each decision.

---

## GCE Dimension Reference

| Dimension | What it scores | Target |
|---|---|---|
| reduction_integrity | Correct minor centre reduction per 5 rules | > 0.8 |
| spatial_continuity | Coherent fret zone, no wild position jumps | > 0.85 |
| directional_persistence | Consistent contour arc | > 0.8 |
| inversion_coherence | Voice leading consistency | > 0.75 |
| activity_architecture | Structural activity variety | > 0.8 |
| anti_bebop_drift | Avoiding bebop clichés | > 0.7 |
| lfv_integrity | All notes within LFV window | > 0.9 |
| interval_dna_continuity | Martino interval signature maintained | > 0.85 |

Overall gate threshold: **7.5 / 10**. Anti-bebop drift hard floor: **0.15**.

---

## Activity Quick Reference

| ID | Name | Character | Best used for |
|---|---|---|---|
| A1 | Opening Line | Stepwise ascending, primary Martino voice | All contexts |
| A2 | Diagonal Bridge | Descending melodic bridge | Connecting phrases, ballads |
| A3 | Pivot Cell | Short pivot figure | Transitions, variety |
| A4 | Anchor Arp | Arpeggiated strong tones | Blues, funk, propulsive lines |
| A5 | Cadential Cell | Closing resolution figure | Phrase endings, ii-V-I |
| A6 | Enclosure Cell | Chromatic approach above and below | Bebop, Barry Harris |
| A7 | Long Span | Wide ascending, 2-bar gesture | Ballads, film, ECM |
| A8 | Rhythmic Displacement | Syncopated A1 variant | Rhythm studies, funk |

---

*Composer OS v1.1.0 · Martino Linear Expressions · Tagged v1.1.0-martino-stable*
