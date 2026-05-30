# Composer OS v1.6 — New Features

Practical guide to four MusicContext producers shipped in v1.6: **Population Composer**, **Zappa Solo**, **Sonic Youth Tuning**, and **Dual-Guitar Lower Voice**. Each chapter includes intro material, reference tables where needed, and nine worked scenarios.

---

## 1. Population Composer

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

---

### **Monk Walks into a String Quartet**

**Style/context:** You want SQ export truth but harmony that **refuses** to behave — Monk proposals winning during fracture bars while vault holds the cadence.

**Settings:** Producers: all five · `dramaticArc`: bars 1–8 **build**, 9–12 **fracture**, 13–16 **cadence** · `inheritancePressure` 0.35 · `contrastWeight` 0.6 · seed **10601** · key **C**.

**What you hear:** Bars 1–8 accumulate quartal and BB weight; 9–12 snap to chromatic neighbour cells and tritone nudges; 13–16 vault stabilises before a Monk-flavoured tag.

**Why it works:** Monk’s bias signature peaks on **fracture** (0.94 fitness); vault peaks on **cadence** (0.96). The arc tells the ecology when to be rude vs when to land.

---

### **Wayne Floats Over a Locked Vault Chart**

**Style/context:** Paste or import a static chart; let **wayne_shorter** and **tritonic** float above vault anchors without rewriting roots.

**Settings:** Producers: **vault**, **wayne_shorter**, **tritonic** only · `dramaticArc`: 1–16 **suspend** · `mutationRate` 0.15 · seed **22001**.

**What you hear:** Symbol stream stays vault-anchored; per-bar winners alternate Wayne drift and tritonic colour — Nefertiti-style perpetual float.

**Why it works:** Wayne’s **suspend** fitness (0.86) and vault’s anchoring (0.92) co-dominate; tritonic adds fracture colour without cadence discharge.

---

### **Big Band Takes the Bridge**

**Style/context:** Verse-like **suspend** gives way to a shout **build** on the bridge — population simulates section handoff without manual engine swapping.

**Settings:** Producers: **big_band**, **tritonic**, **vault** · Arc: 1–8 **suspend**, 9–16 **build**, 17–20 **cadence** · `contrastWeight` 0.7 · seed **33002**.

**What you hear:** Sparse suspended bars thicken; BB proposals dominate 9–16; cadence bars vault-heavy with tritonic peaks on the penultimate bar.

**Why it works:** BB **build** fitness 0.88 vs vault **suspend** 0.92 — contrast layer promotes BB once phase flips.

---

### **Fracture at Rehearsal D**

**Style/context:** Rehearsal mark **D** is a deliberate rupture — monk + tritonic contest every bar in the fracture window.

**Settings:** Producers: **monk**, **tritonic** · Arc: 1–7 **build**, 8–11 **fracture**, 12–16 **restart** · `mutationRate` 0.35 · seed **44003**.

**What you hear:** Predictable build cells; bar 8 onward angular clusters and displaced tritone proposals; restart phase reintroduces vault-like stability via inheritance pressure.

**Why it works:** Narrow pool + high mutation under **fracture** keeps monk/tritonic trading; **restart** favours monk (0.86) for fresh motif cells.

---

### **Cadence That Refuses to Confirm**

**Style/context:** Harmonic drama where **cadence** phase still avoids clean V→I — Wayne + tritonic win cadence bars.

**Settings:** Producers: **wayne_shorter**, **tritonic**, **vault** · Arc: 1–12 **suspend**, 13–16 **cadence** · `inheritancePressure` 0.5 · seed **55004**.

**What you hear:** Long hover; final four bars feel “almost landing” — vault proposals present but Wayne/tritonic often win on contrast.

**Why it works:** Wayne cadence fitness is low (0.48) but suspend carryover + contrast beats vault when `contrastWeight` is high.

---

### **Ecology of a Shout Chorus**

**Style/context:** Full five-producer pool on a 32-bar form — watch **`dominantProducer`** in the receipt shift by section.

**Settings:** All five producers · Arc: 1–8 **build**, 9–16 **suspend**, 17–24 **fracture**, 25–28 **cadence**, 29–32 **restart** · seed **66005** · 32 bars.

**What you hear:** Weight history scrolls in the receipt — BB dominant in build, Wayne in suspend, monk/tritonic in fracture.

**Why it works:** Long-form arc exercises every bias signature; **`dramaticArcCompliance`** scores how often winners matched phase fitness.

---

### **Vault Pedal, Tritonic Storm**

**Style/context:** One-chord pedal section — vault should anchor while tritonic fractures upper structure.

**Settings:** Producers: **vault**, **tritonic** · Arc: 1–4 **build**, 5–12 **fracture**, 13–16 **cadence** · `contrastWeight` 0.55 · seed **77006**.

**What you hear:** Harmonic symbols stay pedal-class consistent; tritonic wins most fracture bars; cadence vault-heavy.

**Why it works:** Vault fracture fitness is low (0.22) — tritonic (0.88) owns the middle; vault reclaims cadence.

---

### **Restart Tag After the Ballad**

**Style/context:** Ballad **cadence** dissolves into a **restart** tag — monk and wayne_shorter trade for a fresh head motive.

**Settings:** Producers: **monk**, **wayne_shorter**, **vault** · Arc: 1–12 **suspend**, 13–15 **cadence**, 16–20 **restart** · seed **88007**.

**What you hear:** Floating middle; soft cadence cells; tag bars angular with Wayne drift returning.

**Why it works:** Monk **restart** fitness 0.86; Wayne 0.82 — both favour fresh material over vault closure.

---

### **Folk Music from Nowhere**

**Style/context:** Apparent “folk” simplicity — vault + big_band build diatonic weight, then monk **fracture** bars inject foreign neighbour tones so the tune feels collected from field recordings.

**Settings:** All five · Arc: 1–16 **build**, 17–20 **fracture**, 21–24 **cadence** · `inheritancePressure` 0.4 · `mutationRate` 0.25 · seed **99008** · key **G**.

**What you hear:** Singable harmonic rhythm early; sudden wrong-note bar 17; cadence feels like a song you almost remember.

**Why it works:** Population ecology lets **simple** and **wrong** coexist in one checksum-locked timeline — folk surface, modernist fracture underneath.

---

## 2. Zappa Solo Producer

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

---

### **Claim over a Shimmering Vamp**

**Style/context:** One-chord or two-chord vamp; solo **claims** the space in **primary** participation with mixolydian field.

**Settings:** Harmony: `Eb7sus4 | Eb7sus4 | Eb7sus4 | Eb7sus4` (×4) · `modalField`: **mixolydian** · `participationLevel`: **primary** · `soloArc`: 1–4 **claim** · seed **90441** · density **0.65**.

**What you hear:** Single motif family over static harmony; high `modalAnchorRatio`; few leaps outside the field.

**Why it works:** Claim phase + static harmony maximises modal anchor; harmony checksum unchanged — LOCK intact.

---

### **Dorian Glue on a Two-Chord Loop**

**Style/context:** Am7–D7 funk vamp; dorian primary field with conversational asymmetry.

**Settings:** Harmony: `Am7 | D7 | Am7 | D7` (×4) · `modalField`: **dorian** · `participationLevel`: **primary** · seed **90442** · `dissonanceLevel` 0.4.

**What you hear:** Motif recurs with mutation; targeted dissonance on D7 bars only.

**Why it works:** Near-neighbour foreign tones (10–20%) land on dominant bars without rewriting **`harmonyBars`**.

---

### **Agitation Through the Turnaround**

**Style/context:** Blues turnaround — arc moves from **claim** to **agitation** mid-form.

**Settings:** Harmony: 12-bar Bb blues symbols · `soloArc`: 1–4 **claim**, 5–8 **agitation**, 9–12 **crooked_landing** · `modalField`: **mixolydian** · seed **90443**.

**What you hear:** Bars 5–8 denser note count; `rhythmicElasticityScore` rises; landing sidesteps clean resolution.

**Why it works:** Arc state steers density and closure refusal independently of chord count.

---

### **Fracture in 7/8**

**Style/context:** Zappa odd-meter solo over supplied **`barMeterMap`** — fracture phase aligns with rhythmic cell lock.

**Settings:** Harmony: 8 bars dominant alt chain · `barMeterMap`: 3+3+2 eighths per bar · `soloArc`: 1–3 **claim**, 4–6 **fracture**, 7–8 **crooked_landing** · seed **77777**.

**What you hear:** 7/8 packets in fracture window; breath space after motif statements; export pitch clamp 52–84.

**Why it works:** Elastic rhythm model respects meter map; fracture boosts `targetedDissonanceIndex` without altering harmony.

---

### **Secondary Contamination on a Head**

**Style/context:** Population run where Zappa participates **secondary** — motifs bleed into tritonic/monks cells, not a separate solo staff.

**Settings:** Harmony: 16 bars locked chart · `participationLevel`: **secondary** · `modalField`: **phrygian** · seed **90445**.

**What you hear:** No full solo line; motif intervals appear in **`motif`** metadata; `motifMutationRecurrence` tracks contamination.

**Why it works:** Secondary level attaches melodic pressure without primary **`generateZappaSolo`** export line.

---

### **Tertiary Colour Over ECM Pedal**

**Style/context:** ECM sparse pedal — Zappa as **tertiary** pitch-colour only.

**Settings:** Harmony: `Dbmaj7 | Dbmaj7 | Dbmaj7 | Dbmaj7` (×4) · `participationLevel`: **tertiary** · `modalField`: **lydian** · seed **90446**.

**What you hear:** Harmony symbols identical to input; receipt shows tertiary + low `noteCount`; colour metrics nudged only.

**Why it works:** Tertiary path skips full solo generation; LOCK checksum matches supplied bars exactly.

---

### **Harmonic Minor Crooked Landing**

**Style/context:** Minor-key theatre — **crooked_landing** refuses picardy third.

**Settings:** Harmony: `Am | B7 | Em | Am` (×3) · `modalField`: **harmonic_minor** · `soloArc`: 1–8 **agitation**, 9–12 **crooked_landing** · `closureRefusalScore` target high · seed **90447**.

**What you hear:** Final bars avoid raised leading tone resolution; `closureRefusalScore` elevated in receipt.

**Why it works:** Crooked landing arc + harmonic minor field keeps minor colour at cadence.

---

### **Lydian Claim on Maj7#11**

**Style/context:** Lydian field over maj7#11 harmony — claim phase matches shimmer.

**Settings:** Harmony: `Fmaj7#11 | Gmaj7#11 | Am7 | D7alt` (×2) · `modalField`: **lydian** · `participationLevel`: **primary** · seed **90448** · density **0.72**.

**What you hear:** #11 harmony and lydian solo align; wide leaps on maj7 bars only.

**Why it works:** Modal field matches chord colour; primary participation fills **`motif.intervalPattern`**.

---

### **Comic Brass Contamination**

**Style/context:** Big-band chart with Zappa **secondary** over shout chorus — “wrong” melodic figures infect brass-motif metadata.

**Settings:** Harmony: 16-bar BB-style progression (pipe-delimited) · `participationLevel`: **secondary** · `modalField`: **mixolydian** · `dissonanceLevel` 0.7 · `soloArc`: 9–12 **fracture** · seed **90449**.

**What you hear:** Harmonic rhythm straight; fracture-window contamination spikes `conversationalAsymmetry` — comic wrong-note energy without reharm.

**Why it works:** Secondary + fracture arc targets motif mutation during densest harmonic bars only.

---

## 3. Sonic Youth Tuning Producer

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

---

### **Steel Mill Lullaby**

**Style/context:** Slow noise-rock lullaby — **f_sharp_unison** + **mass_mass** for industrial drone.

**Settings:** `tuningId`: **f_sharp_unison** · `archetype`: **mass_mass** · 16 bars · seed **10603** · bpm **56**.

**What you hear:** Unison grid rings through; harmony symbols cluster/sus-like; high `openStringResonanceRatio`.

**Why it works:** mass_mass doubles the brutal grid — shape redundancy scores high; lower guitar often **pedal** role.

---

### **Unison Grid at Rehearsal Volume**

**Style/context:** Maximum volume scenario — same preset, faster harmonic rhythm.

**Settings:** `tuningId`: **f_sharp_unison** · `archetype`: **mass_mass** · 8 bars · seed **10604** · bpm **120**.

**What you hear:** Dense shape plans per bar; `parallelShapeUsage` elevated.

**Why it works:** Shorter form keeps checksum stable while seed drives fret-offset variation.

---

### **Doubled Fifths, Blurred Identity**

**Style/context:** Classic SY “what chord is this?” — **doubled_fifths** blurs functional identity.

**Settings:** `tuningId`: **doubled_fifths** · `archetype`: **mass_mass** · 12 bars · seed **10605**.

**What you hear:** Fifth stacks beat tertian names; moderate `tertianNormalizationPenalty`.

**Why it works:** Doubled 5ths tuning resists clean maj/min spelling in export symbols.

---

### **Mass Meets Knife**

**Style/context:** **mass_knife** archetype — block vs cutting cluster dialogue.

**Settings:** `tuningId`: **narrow_consonant** · `archetype`: **mass_knife** · 16 bars · seed **10606**.

**What you hear:** Guitar 1 block slides; guitar 2 G/G# friction; `clusterIdentityScore` peaks mid-form.

**Why it works:** Catalog pairs narrow_consonant + cluster_friction automatically for mass_knife.

---

### **Drone and Shard**

**Style/context:** **drone_shard** — ringing low drone vs upper splinter.

**Settings:** `tuningId`: **drone_melody** · `archetype`: **drone_shard** · 12 bars · seed **10607**.

**What you hear:** Low strings sustain; upper cluster attacks; `guide_tone_lane` elevated on drone_melody preset vs pure cluster runs.

**Why it works:** drone_shard pairs drone_melody + cluster_friction; SY lower-guitar resolver favours guide-tone on drone tuning.

---

### **Cluster Friction Between Songs**

**Style/context:** Transition texture — only **cluster_friction** in mass_knife pairing for maximum friction.

**Settings:** `tuningId`: **cluster_friction** · `archetype`: **mass_knife** · 4 bars · seed **10608**.

**What you hear:** Minor-second rub constant; `clusterIdentityScore` high throughout.

**Why it works:** cluster_friction preset embeds G/G# rub in open-string layout.

---

### **Wyble Anchors Without Tertian Names**

**Style/context:** Supply **`wybleAnchorBars`** — sus shapes only, no maj7/min7 cadences.

**Settings:** `wybleAnchorBars`: `Fsus2 | Gsus4 | Asus2 | Bsus4` · `tuningId`: **narrow_consonant** · `archetype`: **mass_mass** · seed **88001**.

**What you hear:** Export harmony bars avoid tertian suffixes; shape engine translated anchors.

**Why it works:** Wyble anchors steer shape harmony without copying tertian cadences — test asserts no maj7/m7/7 endings.

---

### **Open-String Resonance Study**

**Style/context:** Analyse receipt metrics — maximise ringing open strings.

**Settings:** `tuningId`: **drone_melody** · `archetype`: **drone_shard** · 24 bars · seed **10609** · slow bpm **48**.

**What you hear:** Long ringing tails; `resonanceContinuityMetric` high bar-to-bar.

**Why it works:** drone_melody + slow tempo + shard upper voice = sustained resonance metric profile.

---

### **Minimalism in a Narrow Cage**

**Style/context:** Reich/Glass adjacent — **narrow_consonant** block slides in tight range.

**Settings:** `tuningId`: **narrow_consonant** · `archetype`: **mass_mass** · 32 bars · seed **10610** · bpm **96**.

**What you hear:** Small fret-motion cells repeat; `shapeRedundancyScore` high; minimal harmonic symbol change.

**Why it works:** Narrow consonant tuning limits pitch world — block slides read as process music within SY producer.

---

## 4. Dual-Guitar Lower Voice

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

---

### **Bass Sage Guitar Trickster**

**Style/context:** **dual_guitar_bass** — bass holds root sage; lower guitar **trickster** conversational roles.

**Settings:** Topology: **dual_guitar_bass** · `duoIntent`: **conversational** · Upper: 8-bar jazz changes · Bass: roots · seed **12345**.

**What you hear:** Bass steady; lower guitar sparse answers and counterlines; some **rest** bars.

**Why it works:** Conversational intent weights counterline + sparse_comp_answer; bass symbols anchor inferBassSymbol path.

---

### **Supportive Glue on a Ballad**

**Style/context:** Slow ballad — lower guitar glues guide-tones under sustained upper voicings.

**Settings:** Topology: **dual_guitar_bass** · `duoIntent`: **supportive** · Upper: `Fmaj7 | Em7 | Am7 | Dm7 | G7 | Cmaj7` (×2) · Bass: letter roots · seed **12346**.

**What you hear:** High guide_tone_lane + pedal tally in receipt; fewer registral collisions than conversational.

**Why it works:** Supportive intent test expectation — more glue roles than conversational on same harmony.

---

### **Conversational Trade on a Blues**

**Style/context:** 12-bar blues — two guitars talk; bass walks.

**Settings:** Topology: **dual_guitar_bass** · `duoIntent`: **conversational** · 12 bars Bb blues · seed **9001**.

**What you hear:** Call-and-response between upper and lower guitar roles bar-to-bar.

**Why it works:** Resolver alternates sparse_comp_answer and counterline when intent is conversational.

---

### **Dual Guitar Without Bass**

**Style/context:** **dual_guitar** topology — no bass part; lower guitar implies bass register alone.

**Settings:** Topology: **dual_guitar** · Upper: `Em7 | Am7 | B7 | Em7` · Lower export truth mirrors upper (no separate bass) · seed **55**.

**What you hear:** Lower guitar plans from upper symbols only; `lowerGuitarEnabled` true in receipt.

**Why it works:** dual_guitar path resolves without bass bars — inferBassSymbol falls back to upper.

---

### **Guide-Tone Lane Under a Shout**

**Style/context:** Dense upper voicings — force supportive guide-tone majority.

**Settings:** Topology: **dual_guitar_bass** · `duoIntent`: **supportive** · Upper: dense dom7alt chain · Bass: roots · seed **4242**.

**What you hear:** Lower guitar sits on 3rds/7ths; low parallel_motion_count if voices separate registers.

**Why it works:** Supportive + dominant harmony favours guide_tone_lane weights in resolver.

---

### **Pedal Points in ECM Rubato**

**Style/context:** ECM slow pedal — lower guitar **pedal** role dominates.

**Settings:** Topology: **dual_guitar_bass** · `duoIntent`: **supportive** · Upper: `Dbmaj7` pedal (×8) · Bass: Db · seed **77701**.

**What you hear:** Sustained lower-guitar midis; pedal count high in role distribution.

**Why it works:** Static harmony + supportive intent boosts pedal weighting.

---

### **Sparse Comp Answers Between Phrases**

**Style/context:** Upper guitar phrases with breath — lower guitar answers in gaps.

**Settings:** Topology: **dual_guitar_bass** · `duoIntent`: **conversational** · Upper: sparse 8-bar folk changes · seed **88802**.

**What you hear:** **rest** bars aligned with upper rest; sparse_comp_answer on phrase endings.

**Why it works:** Resolver penalises consecutive sparse_comp_answer — natural phrase boundaries.

---

### **Counterline on the Inner Voice**

**Style/context:** Lower guitar contrary motion to upper melody register.

**Settings:** Topology: **dual_guitar_bass** · `duoIntent`: **conversational** · Upper: stepwise maj key · seed **99903**.

**What you hear:** counterline role midis move opposite to upper contour hints.

**Why it works:** Conversational weights + stepwise upper harmony favour scalar counterline MIDI band 48–64.

---

### **Counterpoint on the Street Corner**

**Style/context:** Indie duo busking — dual_guitar_bass, mixed roles, intentional collisions for grit.

**Settings:** Topology: **dual_guitar_bass** · `duoIntent`: **conversational** · Upper: 16-bar I–V–vi–IV loop · Bass: roots · seed **100004**.

**What you hear:** Full role distribution in receipt — all five roles represented; occasional registral_collision_count > 0.

**Why it works:** Long conversational run exercises full role vocabulary — street-corner independence, not studio polish.

---

## 5. Try These First

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

*Composer OS v1.6 · Population Composer · Zappa Solo · Sonic Youth Tuning · Dual-Guitar Lower Voice*
