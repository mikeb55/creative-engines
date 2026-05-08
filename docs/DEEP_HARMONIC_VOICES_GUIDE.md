# Deep Harmonic Voices — Composer OS Guide

## The Two-Layer System

Composer OS has two distinct ways to apply a composer’s style. Many composers appear in **both** layers. This is intentional — they serve different purposes and produce different results.

### Layer 1 — Songwriter Presets

Located in: **Songwriter** dropdown (primary and secondary).

What it does: Applies a quick stylistic flavour at the song level.

Affects: Chord grammar, melodic tendencies, arrangement hooks.

Best for: Fast sketching, broad stylistic colour, quick combinations.

Limitation: Rules are mechanism-based, not research-grounded at the Style Panel depth. Output reads “Shorter-adjacent,” not “thinking compositionally like Shorter.”

**GCE impact:** Moderate — improves Harmony & Language and Rhythmic Identity but limited effect on Melodic Identity.

### Layer 2 — Harmonic Voices (Deep)

Located in: **Harmonic Voice** dropdown (**StylePanel**).

What it does: Applies research-grounded rules, era-specific harmonic behaviour, ThemeGenome defaults, and melody-behaviour profiles.

Affects: Context keys, ThemeGenome motif seeding, voice-specific melody behaviour, inner voice motion, form tendencies.

Best for: When you want the generation engine to actually **think like** the composer — not only sound adjacent to them.

**GCE impact:** Higher — directly improves Melodic Identity, Harmony & Language, and Thematic Recall Potential together.

### When to Use Which

| Composer | Use Songwriter Preset When | Use Harmonic Voice When |
|----------|---------------------------|------------------------|
| Wayne Shorter | You want jazz sophistication fast, sketching a tune, or combining with a rhythm engine for quick results | You want motivic harmony, non-functional neighbour chords, asymmetric phrases, silence as device — GCE-targeted output |
| Gil Evans | You want orchestral colour as a secondary flavour | You want cloud voicings, independent bass counterpoint, slow harmonic rhythm, pastel cluster textures |
| Maria Schneider | You want contemporary big band harmonic language as background flavour | You want organic chord morphing, common-tone voice leading, narrative harmonic arc, nature-imagery formal structure |
| John Coltrane | You want modal jazz or sheets-of-sound flavour quickly | You want Coltrane changes cycle, pentatonic superimposition, quartal Tyner voicings, era-specific generation |
| Pat Metheny | You want Lydian/ECM flavour or Brazilian feel quickly | You want arching melodic arcs, extended add9 language, Americana seed motifs, orchestral PMG textures |
| Henry Threadgill | Not available as Songwriter preset | Interval-set harmony, closed chord families, anti-metric polyrhythm, orchestration-as-system |
| Charles Mingus | Not available as Songwriter preset | Blues as architecture, chromatic bass counterpoint, gospel shout climax, collective improvisation suite form |
| Ennio Morricone | You want cinematic/western colour quickly | You want Dorian pastoral, plagal thirds, suspended resolution, chromatic bass motion |
| Bernard Herrmann | You want film noir darkness quickly | You want chromatic planing, tertian polytonality, motor ostinato, cadential avoidance |
| Angelo Badalamenti | You want cool jazz noir ballad flavour | You want minor–major seventh, chromatic descending lines, hypnotic loops, behind-the-beat phrasing |
| Quincy Jones | You want big band funk/soul flavour quickly | You want dominant extensions, blues gospel cadences, Mixolydian groove, shout chorus energy |

### The Golden Rule

**Songwriter preset = colour. Harmonic Voice = architecture.**

Use **both** simultaneously for maximum effect: set the **Harmonic Voice** for deep structural thinking; set the **Songwriter** preset for surface flavour reinforcement or deliberate contrast.

---

## Deep Harmonic Voices — Individual Profiles

For each voice below: what makes it distinctive, GCE categories most improved, best rhythm engine pairings, and suggested combinations.

### Wayne Shorter

**Era coverage:** Blue Note period, classic quartet, late / Emanon period.

**Harmonic signature:** Non-functional neighbour harmony, axis root motion, chromatic mediant shifts, motivic harmony derivation, unresolved sus plateaus, melody-orbit harmony (chord chosen for melodic target, not vice versa).

**Melodic signature:** 70–80% stepwise/thirds, octave leaps with contrary resolution, asymmetric phrase silence, 2–4 micro-motives driving 60–80% of material.

**Form tendency:** Deformed AABA or through-composed arch; late period uses textural plateaus, not bar-by-bar changes.

**GCE categories most improved:** Melodic Identity, Harmony & Language, Thematic Recall Potential.

**Best rhythm engines:**

- **Second Line (`sl`):** Polyrhythmic rolling groove supports non-functional modal harmony + chromatic mediant shifts (Footprints model).
- **Brazilian (`br`):** Static harmonic plateaus + lyrical melody for ballad period (Infant Eyes, Miyako).
- **Cuban Afro 6/8 (`cu`):** Vamp-based modal pieces + layered neighbour chords.

**Avoid:** Generic swing ii–V–I; heavy altered dominants resolving hard.

### Gil Evans

**Era coverage:** Birth of the Cool through Miles collaborations, *Out of the Cool*.

**Harmonic signature:** Non-functional bass motion, modal pedal suspension, mid-register cluster stacks, top-voice minor second, wide bass-to-cluster gap, slow cloud harmonic rhythm, parallel modal planing.

**Orchestration principle:** Timbre **as** harmony — instrument combination defines chord quality, not only chord symbol.

**Form tendency:** Harmonic scenes not progressions; tableaux of 2–8 bars with slow internal evolution.

**GCE categories most improved:** Arrangement & Orchestration, Harmony & Language, Economy & Focus.

**Best rhythm engines:**

- **Brazilian (`br`):** Floating modal harmony over understated groove.
- **Cuban (`cu`):** Phrygian/Aeolian pedals + clave echoes *Sketches of Spain*.
- **Afrobeat (`fk`):** Extended vamps under cloud textures.

**String quartet translation:** Viola/Vln2 carry dissonant extensions; cello holds independent bass counterlines; leave registral gap between cello and upper cluster.

**Avoid:** Block chord sax soli writing; strong V–I resolutions.

### Maria Schneider

**Era coverage:** *Concert in the Garden* through *Data Lords*.

**Harmonic signature:** Organic chord morphing, common-tone voice leading, modal pastoral scenes, Lydian/Dorian colour blend, interval-seeded harmony, narrative harmonic arc, suspended but soft cadences.

**Nature arc principle:** Harmonic density, register ceiling, dissonance index, and attack rate rise together toward recapitulation.

**Form tendency:** Schneider three-space (Exposition/Solo/Recapitulation); arch forms tied to landscape/nature imagery.

**GCE categories most improved:** Structure & Form, Tension & Release, Arrangement & Orchestration.

**Best rhythm engines:**

- **Brazilian (`br`):** Primary — direct documented influence (Hang Gliding).
- **Cuban (`cu`):** Layered rhythmic propulsion under modal scenes.
- **Afrobeat (`fk`):** *Data Lords* darker material — technological ostinato.

**Avoid:** Sudden harmonic jumps; functional dominant chains.

### John Coltrane

**Era coverage:** Changes period, modal period, late/free period.

**Harmonic signature:** Coltrane changes cycle (augmented triad tonal centres), rapid modulatory ii–V, modal Dorian pedals, quartal Tyner voicings, pentatonic superimposition, sheets-of-sound cells.

**Three eras of use:**

- **Era 1 (Changes):** Augmented triad lattice; ≥2 chord events/bar minimum.
- **Era 2 (Modal):** Static Dorian pedal, quartal voicings, pentatonic overlay.
- **Era 3 (Free):** Cluster fields, symmetric collections, brief modal islands.

**GCE categories most improved:** Melodic Identity, Rhythmic Identity, Harmony & Language.

**Best rhythm engines:**

- **Afrobeat (`fk`):** One/two chord vamps + layered ostinati for modal period.
- **Brazilian (`br`):** Continuous eighth flow + extended tertian for changes.
- **Cuban Afro 6/8 (`cu`):** Ritual tension + layered percussion.

**Avoid:** Generic bebop ii–V; scalar runs not grounded in interval cells.

### Pat Metheny

**Era coverage:** ECM early, classic PMG, orchestral period.

**Harmonic signature:** Lydian open harmony, extended major add9 language, diatonic non-functional progressions, bIImaj7(#11) as approach chord, pedal drone voicing, luminous non-cadential endings.

**Melodic signature:** Long arching multi-bar contours, 9/#11/13 as primary melodic targets, Americana/pentatonic seed motifs, singer-like breathing with rests between phrases.

**Form tendency:** Episodic suites with thematic recurrence; layered ostinati across different metres; through-composed in later period.

**GCE categories most improved:** Melodic Identity, Structure & Form, Thematic Recall Potential.

**Best rhythm engines:**

- **Brazilian (`br`):** Primary — bossa/samba/baião supports Lydian major.
- **Cuban (`cu`):** Tumbao/clave under modal harmony for intense pieces.
- **Second Line (`sl`):** Americana-inflected swampy groove.

**Avoid:** Heavy altered dominants; bebop lick vocabulary; dense atonal clusters.

### Henry Threadgill

**Era coverage:** Air trio, Sextett, Very Very Circus, Zooid.

**Harmonic signature:** Fixed interval cell harmony, closed family chord series (six chords from seed triad), interval pool melodic constraints, non-functional but organised harmony, register-stratified ensembles.

**System principle:** Harmony, melody, and counterpoint **all** derived from the same interval pool per section — not chord symbols.

**Rhythm principle:** Anti-metric drum conduct — drums do **not** align with melodic bar 1; multi-meter polyrhythm streams.

**Cadence type:** Unison/octave convergence or texture shift — not V–I.

**GCE categories most improved:** Harmony & Language, Rhythmic Identity, Arrangement & Orchestration.

**Best rhythm engines:**

- **Second Line (`sl`):** March/blues source material + anti-metric displacement.
- **Afrobeat (`fk`):** Modular cumulative form + interval-system pitch content on riffs.
- **Cuban (`cu`):** Clave as implicit metric that parts avoid aligning with.

**Avoid:** ii–V–I progressions; bebop scalar runs; conventional swing ride locking with horn accents; homogeneous block voicings.

### Charles Mingus

**Era coverage:** Early California through *Epitaph*.

**Harmonic signature:** Blues as architecture, chromatic bass counterpoint, gospel harmony shout sections, dense mid-range horn voicings, tonal/modal/free continuum, extended dominant alterations.

**Bass principle:** Bass is **primary** melodic voice — generate bass as independent chromatic line first; build harmony around it, not vice versa.

**Suite form:** `free_intro` → `extended_blues` → `collective_pedal` → `gospel_shout` → `elegy_coda`.

**GCE categories most improved:** Structure & Form, Tension & Release, Arrangement & Orchestration.

**Best rhythm engines:**

- **Second Line (`sl`):** Primary — parade collective improv, blues/gospel shout.
- **Cuban (`cu`):** Clave grid for blues harmony + Latin suite sections.
- **Afrobeat (`fk`):** Extended protest grooves with repeating riffs.

**Avoid:** Generic hard bop ii–V churn; ECM floating Lydian (too clean); Threadgill-style interval sets (wrong roots — Mingus is blues-grounded); clean voice leading with no dirt or smear.

### Film Composers

#### Ennio Morricone

**Harmonic signature:** Modal Dorian, Aeolian lament bass, plagal thirds (I–vi–IV–I), simple diatonic triadism, additive orchestration over pedal, softened plagal cadence.

**Best pairings:** Brazilian (lyrical floating harmony), Cuban bolero (romantic line), Greek rebetiko (epic procession).

#### Bernard Herrmann

**Harmonic signature:** Chromatic planing major7, tertian polytonality, ostinato strings, unresolved chromatic cadence, parallel sevenths, cluster intensity high register, hemiola rhythmic cells.

**Best pairings:** Second Line (insistent cells + menacing swells), Cuban Afro 6/8 (ritual tension), Greek rebetiko (brooding obsessive).

#### Angelo Badalamenti

**Harmonic signature:** Slow minor ballad harmony, extended chords with suspensions, chromatic inner voice motion, noir lounge jazz colour, ambient string pads, swing-inflected ballads, tonal ambiguity with pedal.

**Best pairings:** Brazilian bossa (dream-ballad floating pulse), Cuban bolero (*Audrey’s Dance* Latin jazz), Second Line slow (surreal).

#### Quincy Jones (film)

**Harmonic signature:** Functional ii–V–I jazz, extended dominants 9/13, blues gospel cadences, Mixolydian funk vamps, big band shout choruses, groove-driven harmony, syncopated backbeat rhythms.

**Best pairings:** Afrobeat (polyrhythmic brass punches), Brazilian (jazz–big-band dance), Second Line (caper/parade energy).

---

## Recommended Starting Combinations

For each creative scenario: Harmonic Voice + Songwriter + Rhythm Engine.

| Scenario | Harmonic Voice | Songwriter | Rhythm | Why |
|----------|----------------|------------|--------|-----|
| **Jazz quartet feel** | Wayne Shorter | Bill Evans | Brazilian | Motivic non-functional harmony + impressionist voicings + floating pulse |
| **Big band orchestral** | Maria Schneider | Thad Jones | Afrobeat | Narrative arc + big band DNA + polyrhythmic energy |
| **Avant-garde string quartet** | Henry Threadgill | Andrew Hill | Second Line | Interval systems + post-bop ambiguity + march/parade destabilisation |
| **Film noir** | Badalamenti | Miles Davis | Cuban bolero | Noir lounge jazz + modal space + Latin romantic darkness |
| **Blues suite** | Charles Mingus | Barry Harris | Second Line | Blues architecture + hard-bop harmonic vocabulary + New Orleans collective energy |
| **ECM chamber** | Gil Evans | ECM Chamber | Brazilian | Cloud voicings + sparse modal space + floating bossa pulse |
| **Guitar-centric fusion** | Pat Metheny | Pat Metheny | Brazilian | Full Metheny stack — Lydian open harmony + arching melody + bossa feel |
| **Cinematic epic** | Morricone | Herrmann | Greek rebetiko | Pastoral modal + chromatic tension + additive-metre dignity |

*(Songwriter **`barry_harris`** stands in for classic hard-bop gospel-side vocabulary where “Horace Silver” flavour is intended — Silver is not a shipped `SongwriterRuleId`.)*

---

## GCE Impact by Voice

Which harmonic voice most improves each GCE category (selection guide). Weights are illustrative relative emphasis in **`docs/GCE_FRAMEWORK_V2.md`** scoring.

| GCE Category | Weight (illustrative) | Best Harmonic Voices |
|--------------|----------------------|----------------------|
| Melodic Identity | 0.12 | Wayne Shorter, Pat Metheny, John Coltrane |
| Harmony & Language | 0.12 | Gil Evans, Henry Threadgill, Wayne Shorter |
| Rhythmic Identity | 0.12 | Henry Threadgill, Charles Mingus, John Coltrane |
| Structure & Form | 0.10 | Charles Mingus, Maria Schneider, Pat Metheny |
| Arrangement & Orchestration | 0.10 | Gil Evans, Maria Schneider, Charles Mingus |
| Tension & Release | 0.08 | Bernard Herrmann, Charles Mingus, Maria Schneider |
| Thematic Recall Potential | 0.08 | Pat Metheny, Wayne Shorter, John Coltrane |
| Economy & Focus | 0.08 | Gil Evans, Angelo Badalamenti, Ennio Morricone |
| Cadential Clarity | 0.10 | Quincy Jones (film), Charles Mingus, Ennio Morricone |
| Phrase Grammar | 0.10 | Pat Metheny, Maria Schneider, Wayne Shorter |

---

## Related docs

- Pairings table (rhythm presets): **`docs/HARMONIC_RHYTHM_COMBINATIONS.md`** — includes **Deep Harmonic Voice Combinations (V45+)**.
- Rhythm engine catalogue: **`docs/RHYTHM_ENGINES.md`**.
- GCE framework: **`docs/GCE_FRAMEWORK_V2.md`**, integrated standards **`docs/GCE_LOCK_DCR_STANDARDS.md`**.
