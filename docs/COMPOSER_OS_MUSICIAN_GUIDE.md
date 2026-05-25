# Composer OS — Musician Guide

*A plain-English guide to getting musical results from Composer OS.*
*For engine and architecture detail see COMPOSER_HANDBOOK.md.*

---

## How to use this guide

Each part is self-contained. If you know what mode you want, jump to Part 4. If you're not sure which voice to pick, start with Part 2. If you just want to paste chords and go, read the two-minute summary below.

---

## Two-minute summary

1. Open Composer OS
2. Paste your chord progression into the chord input field (e.g. `Cmaj7 | Am7 | Fmaj7 | G7`)
3. Pick a Mode (Song Mode, Big Band, String Quartet, Guitar-Bass Duo, etc.)
4. Pick a Compositional Voice (who is composing — Metheny, Shorter, Ellington, etc.)
5. Pick a Slonimsky Flavor if you want outside melodic color (Lyrical, Angular, Patterned, Chromatic, Riff)
6. Hit Generate
7. Open the MusicXML in Sibelius, Guitar Pro, or Cubase

That's it. Everything else in this guide is about going deeper.

---

## Part 1 — Modes

*What each mode sounds like and when to use it.*

---

### 1.1 Song Mode

**What it produces:** A full composition with melody, harmony, and inner voices written for a lead instrument + rhythm section. Think: a finished lead sheet brought to life.

**When to use it:** When you want a singable or playable melody over your chord changes, in the style of a specific composer or songwriter.

**What drives the output:** The songwriter you select shapes melody, harmony, and rhythm profile. Slonimsky flavor shapes the outside melodic color on top.

**Best for:** Jazz heads, pop writing, singer-songwriter ideas, ECM-style ballads, film themes.

---

### 1.2 Big Band

**What it produces:** Full ensemble writing across brass, saxes, and rhythm section. Arranged in sections — not just melody + comp.

**When to use it:** When you want a fully-voiced big band chart with section writing, shout choruses, and orchestrated harmony.

**What drives the output:** The arranger voice you select (Thad Jones, Sammy Nestico, Maria Schneider, etc.) shapes voicing density, section balance, and harmonic approach. Slonimsky ensemble controls shape how cells move through the ensemble.

**Best for:** Big band charts, orchestral jazz, large ensemble writing.

---

### 1.3 String Quartet

**What it produces:** Four-voice writing for two violins, viola, and cello.

**When to use it:** When you want chamber music writing with independent voices, not just melody + accompaniment.

**What drives the output:** The harmonic voice shapes voice-leading style and register approach. Slonimsky texture controls shape how independent the four voices are.

**Best for:** Classical/contemporary chamber writing, film underscore, modern quartet music.

---

### 1.4 Guitar-Bass Duo

**What it produces:** Two-voice writing for guitar and bass — melodic, groove-based, or textural depending on the voice and outside level.

**When to use it:** When you want a two-instrument output that works as a standalone piece or as a section of a larger arrangement.

**What drives the output:** The VRB voice shapes the melodic character. The Slonimsky Outside Level (Off / Subtle / Prominent) controls how far outside the harmony the lines reach.

**Best for:** Guitar/bass duo pieces, sketch ideas, groove-based riff writing.

---

### 1.5 Guitar-Bass Duo Single Line

**What it produces:** One melodic line, guitar-led, with bass following closely.

**When to use it:** When you want a single unison or octave-doubled line rather than independent voices.

**Best for:** Unison melody writing, guitar feature lines.

---

### 1.6 ECM Chamber

**What it produces:** Sparse, impressionist chamber writing. Space-first — long note values, open harmony, minimal density.

**When to use it:** When you want something that breathes — ECM Records aesthetic, Nordic jazz, open-air chamber.

**Best for:** Film scoring, ambient-adjacent jazz, palette-cleansing sections.

---

### 1.7 Riff Generator

**What it produces:** Short loops (1–32 bars) of groove-based writing. Designed to be looped or repeated as a section.

**When to use it:** When you want a repeating hook, vamp, or groove section — not a through-composed piece.

**Controls:**
- Loop length: 1, 2, 4, 8, 16, or 32 bars
- Family: Funk / Rock / Fusion / Art Rock
- VRB: Nile Rodgers, Led Zeppelin, Weather Report, Fripp, and others
- Density: Sparse / Medium / Dense
- Grid: Eighth / Sixteenth
- Line mode: Single line / Guitar-bass / Octave double
- Odd meter: Meter 5 / Meter 7 / Mahavishnu (Fusion and Art Rock only)

**Best for:** Groove writing, section vamps, intro/outro riffs, odd-meter phrases.

---

### 1.8 Slonimsky Etude

**What it produces:** A pattern-driven melodic etude built directly from Slonimsky cell sequences. No songwriter or harmonic voice — pure pattern.

**When to use it:** When you want to explore a Slonimsky pattern directly rather than as a flavoring on top of a compositional voice.

**Best for:** Practice material, study, melodic pattern exploration.

---

### 1.9 SQ→BB Hybrid

**What it produces:** A composition that moves between String Quartet and Big Band, or holds both ensembles simultaneously in a directed relationship.

**When to use it:** When you want the two ensembles to interact — one leading, one responding, or both locked together.

**What drives the output:** The SQ composer voice + the BB arranger voice + the Ensemble Relationship settings (conversation / contrast / unison / call and response).

**Best for:** Large ensemble writing, hybrid orchestration, through-composed multi-section works.

---

### 1.10 Choosing the right mode — decision table

| I want... | Use this mode |
|---|---|
| A melody over my chord changes | Song Mode |
| Full big band chart | Big Band |
| Four-voice chamber writing | String Quartet |
| Two-voice guitar and bass | Guitar-Bass Duo |
| A repeating groove or riff | Riff Generator |
| Sparse, open, ECM-style | ECM Chamber |
| Both SQ and BB together | SQ→BB Hybrid |
| Pure Slonimsky pattern study | Slonimsky Etude |

---

## Part 2 — Compositional Voices

*Who they are musically and what they change in your output.*

---

### 2.1 What a compositional voice does

A compositional voice (also called a VRB — Voice Rule Bundle) is a set of musical rules derived from studying how a specific composer or artist writes. It shapes:

- **Melody:** How lines move, interval sizes, phrase lengths
- **Harmony:** Which voicings get used, how chords are approached and left
- **Voice leading:** How inner voices move between chords
- **Rhythm:** Swing feel, rhythmic density, groove character
- **Register:** High/low tendencies, spread, register contrast

Selecting a voice doesn't mean the engine copies that artist's music. It means the engine composes using the same tendencies and priorities that artist uses.

---

### 2.2 Voice depth — what it means for your output

Some voices have deep research behind them (10+ fingerprint receipts) and produce highly differentiated output. Others are thinner and may sound more generic.

**Deep voices (most differentiated output):**
John Coltrane · Pat Metheny · Clare Fischer · Quincy Jones · Sammy Nestico · Count Basie · Duke Ellington · Gil Evans · Wayne Shorter · Maria Schneider · Thad Jones · Charles Mingus · Bob Brookmeyer · Olivier Messiaen · Oliver Nelson

**Good voices (solid differentiation):**
Bill Evans · Herbie Hancock · McCoy Tyner · Thelonious Monk · Debussy · Ravel · Bartok · Shostakovich · Jobim · Arvo Pärt · Ornette Coleman · Coltrane · Gershwin · Cole Porter

**Note on Sonic Youth:** Full Song Mode harmony slice plus dedicated VRB (`sonic_youth`) — angular/chromatic Slonimsky cell bias, dual-guitar noise-rock texture. No generic-voice warning.

---

### 2.3 Song Mode voices

These voices work in Song Mode and shape melody + harmony + rhythm as a complete musical personality. **Slonimsky Song Mode panel** writers are listed with engine tier (deep = full harmony slice; good = VRB / partial; stub = planning only).

| Voice | Tier | Musical character | Best chord context |
|---|---|---|---|
| **Pat Metheny** | deep | Open, singing lines with lift and space. Warm, clean-edged, lyrical. | Major 7ths, sus chords, open voicings |
| **Wayne Shorter** | deep | Oblique, elliptical, post-bop. Lines that imply without stating. | Altered chords, modal ambiguity |
| **Bill Evans** | deep | Flowing, inward, color-rich. Dense inner voices, modal clarity at the surface. | Minor 7ths, major 7ths, sus |
| **Herbie Hancock** | deep | Sharply shaped, mobile, post-bop into fusion. Rhythmically alert. | Dominant chords, altered harmony |
| **Miles Davis** | deep | Cool modal space, sparse phrasing, lyrical then chromatic Slonimsky color. | Modal centers, sus, minor 7 |
| **Larry Carlton** | good | Smooth fusion guitar; lyrical then chromatic (riff VRB surface). | Funk changes, dom7, sus |
| **David Gilmour** | good | Singing rock lead, riff hooks and sustain (riff VRB surface). | Rock harmony, pedal tones |
| **McCoy Tyner** | deep | Quartal m11/sus stacks, pentatonic clusters, modal minor pedals, IV-rooted quartal over minor tonality. | Modal minor, sus, quartal |
| **Thelonious Monk** | deep | Angular, surprising, rhythmically displaced. Never where you expect. | Blues changes, ii-V-I, tritone subs |
| **John Coltrane** | deep | Interval-cell driven, cyclical, high density. Sheets of sound. | Coltrane changes, modal, Giant Steps |
| **Joni Mitchell** | deep | Open-tuning quartal harmony. Clear, floating, graceful with surprising turns. | Open voicings, sus2/sus4, modal |
| **Frank Zappa** | deep | Twisted, jagged, colorful, a little dangerous. High ferocity when pushed. | Any — Zappa ignores convention |
| **Radiohead** | deep | Uneasy, fragile, tense with art-rock bite. Metric unease. | Minor, altered, chromatic mediant |
| **Sonic Youth** | deep | Raw, slashing, noisy — texture over polish. Full slice + dedicated VRB (angular/chromatic Slonimsky cells). | Alt tuning, clusters, noise |
| **Duke Ellington** | deep | Warm orchestral jazz. Sophisticated melody, rich inner voices. | Standards, ii-V-I, blues |
| **Debussy** | deep | Parallel planing, whole-tone color, impressionist space. | Major 7#11, sus, open |
| **Jobim** | deep | Bossa nova melody character, Brazilian harmonic color, lightness. | Major 7ths, minor 7ths, bossa changes |

---

### 2.7 Frank Zappa — FZ_* receipt fingerprints (V64 P3)

When **Frank Zappa** is the Song Mode writer or harmonic voice, the engine loads **fifteen `FZ_*` fingerprint receipts** on the Frank Zappa VRB. These are planning rules that compile into the **riff profile** (density, meter feel, register, variation operators) — not the separate **GCE structural** layer (odd-meter maps, absurdist section kinds, register-swap bars) that P2 added. Think of **P2** as *form and meter architecture*; **FZ_*** as *how the guitar/solo lane behaves* inside that architecture.

**When they fire:** On every generate where `frank_zappa` resolves to the Frank Zappa VRB — Song Mode duo, riff generator, and blues-rock ferocity solo path. Receipts merge into `riffProfile` before notes are written. Twelve receipts apply broad prefix rules (harmony, melody, rhythm, etc.); **three are fully promoted (P3)** with dedicated patches and golden fixtures (seeds **77001–77003**, off smoke until P8).

#### All 15 FZ_* stubs (one line each)

| Receipt | Description |
|---|---|
| **FZ_HARM_01** | Polytonal overlays; slash-chords and sudden unrelated tonal islands. |
| **FZ_HARM_02** | Jazz, rock, and neo-classical harmonic fragments in one phrase window. |
| **FZ_MELO_01** | Angular wide leaps, register jumps, motivic cells in the “wrong” metre. |
| **FZ_MELO_02** | Sprechstimme-adjacent contour allowed as guitar colour. |
| **FZ_RHY_01** | Complex metres, sudden metric resets, anti-metric precise notation feel. |
| **FZ_ORCH_01** | Dense eclectic texture, then sudden drop to a single voice. |
| **FZ_DIS_01** | High dissonance tolerance; clusters may sustain across barlines. |
| **FZ_FORM_01** | Through-composed; anti-repetition; hard episode cuts. |
| **FZ_BASS_01** | Angular chromatic bass; no conventional walking lines. |
| **FZ_GTR_01** | Clean-tone islands inside distorted phrases; stereo ping-pong optional. |
| **FZ_BURST** | **Promoted (P3)** — density spike then hard silence tail (see below). |
| **FZ_METRIC_SHIFT** | **Promoted (P3)** — metric displacement + superimposed 7/8 feel (see below). |
| **FZ_REGISTER_COLLISION** | **Promoted (P3)** — wide register + forced register swap (see below). |
| **FZ_DIFF_01** | Not fusion smooth jazz: no continuous diatonic 8th-note spine. |
| **FZ_DIFF_02** | Not minimalism: no steady pulse without pitch chaos on top. |

`FZ_DIFF_*` are metadata-only guardrails (they steer planning text, not a numeric patch). The other prefix families (`FZ_HARM_*`, `FZ_MELO_*`, etc.) already compile to riff-profile fields.

#### FZ_BURST — density spike and silence tail

**What it does:** Raises solo **note-density ceiling**, declares **thick→thin** section-density transitions, and sets cadence weights toward **hard_stop_rest** (phrase ends that cut off rather than fade).

**When it fires:** Whenever the Frank Zappa VRB profile is built for the request — including Song Mode with `frank_zappa` and ferocity solo paths that read the merged `riffProfile`.

**What you hear:** A bar or short run suddenly **fills up** (more attacks, busier sixteenth activity), then the next bar or phrase tail **drops out** — explicit breath/rest (`zappa_phrase_breath_rest` on the solo staff in Song Mode), not a long decay. Feels like Zappa **yelling then walking off** mid-groove.

**Try it:** Static harmony (e.g. eight bars of `Am7`), writer **frank_zappa**, high Motion/Tension in the drawer — scan the **zappa_solo** staff for one dense bar followed by a nearly empty bar.

#### FZ_METRIC_SHIFT — metric displacement

**What it does:** Adds **`metricDisplacement`** (+0.25 over the Zappa stub baseline, typically ~0.8 on the profile) plus **grouping patterns** such as 3+3+2 and superimposed **7/8** against a straight grid.

**When it fires:** Same VRB merge as above; works together with P2’s bar-meter map but does not replace it — P2 still owns written `<time>` changes; this receipt biases **rhythmic placement** inside each bar.

**What you hear:** The pulse **looks straight on paper** but riffs and solo **lean across the bar** — accents land on unexpected eighth positions, hemiola-like **3+3+2** cells, “wrong” downbeats. Listener feels **metric sabotage**, not a new time signature on every bar.

**Try it:** Zappa writer on a 4/4 chart; compare feel to **bill_evans** on the same chords — Zappa profile should show higher `metricDisplacement` in diagnostics.

#### FZ_REGISTER_COLLISION — wide register and swap

**What it does:** Widens allowed **MIDI register** (roughly 40–84 on the profile), forces **`registerShift`** in variation operators, and sets **`zappaRegisterSwapForced`** in tuning options so guitar and bass lanes can **exchange register roles** more aggressively.

**When it fires:** On Frank Zappa VRB profile merge; Song Mode **Phase 4** register swap (P2) can still add bar-level swaps — this receipt **raises the floor/ceiling** and the swap appetite on the riff profile.

**What you hear:** Guitar suddenly **screams in a high cluster**, bass or inner line **drops into a muddy low register**, or the roles **flip** for a bar — “wrong instrument in wrong octave” on purpose. Wider **vertical spread** than a polite jazz duo.

**Try it:** Seed **77003** golden path — same `Bb7` loop as generic Song Mode; Zappa solo/register span should exceed a **bill_evans** run on the same seed/chords.

**Engineering note:** Receipt compiler path is `patchForFzReceipt` in `riffReceiptCompiler.ts`; merged profile via `buildFrankZappaVrbRiffProfile()`. GCE structural fingerprint (`fz:*` pillars) remains a separate layer — do not confuse the two when reading export receipts.

---

### 2.4 Guitar-Bass Duo voices

These voices work in Guitar-Bass Duo mode and shape the two-voice interaction. **Slonimsky GBD panel** voices include tier (deep / good / stub); stub rows show ⚠ in the UI.

| Voice | Tier | Musical character |
|---|---|---|
| **Nile Rodgers** | good | Groove-first, hook-driven, rhythmically tight. Riff is the default. |
| **Eddie Van Halen** | good | Virtuosic rock energy, riff-based with angular motion. |
| **Larry Carlton** | good | Smooth, singing melodic lines, polished jazz-pop harmonic color. |
| **David Gilmour** | good | Strong melodic shape, sustained phrasing, memorable hooks. |
| **Hendrix** | good | Blues-rock vocabulary, wide dynamic range, expressive bends implied. |
| **Fripp** | good | Oblique, layered, textural. Outside the groove, into sound. |
| **Wes Montgomery** | deep | Warm octave jazz lines, bebop-blues riff cells, lyrical then riff (full riff VRB). |
| **Joe Pass** | deep | Fingerstyle chord-melody, chromatic approach tones, clean bebop phrasing (full riff VRB). |
| **Allan Holdsworth** | deep | Dense chromatic legato outside lines, wide leaps, floating rhythm (full riff VRB). |
| **Scott Henderson** | deep | Angular fusion riff hooks, blues chromaticism, grounded 16th groove (full riff VRB). |

---

### 2.5 Big Band arrangers

These voices work in Big Band mode and shape section writing, voicing density, and orchestral character.

| Voice | Musical character |
|---|---|
| **Thad Jones** | Warm, swinging, orchestral. The gold standard of modern big band. |
| **Sammy Nestico** | Clean, direct, driving. Count Basie's most trusted arranger. |
| **Bob Brookmeyer** | Chamber-influenced, voice-led, harmonically sophisticated. |
| **Maria Schneider** | Impressionist, spacious, orchestral color. ECM-adjacent big band. |
| **Gil Evans** | Modal, textural, wide-register. Miles Davis Nonet aesthetic. |
| **Oliver Nelson** | Blues-modal hybrid, pedal-based form, two-layer architecture. |
| **Quincy Jones** | Pop-jazz crossover, clean voicings, commercial but sophisticated. |
| **Clare Fischer** | Dense inner voices, complex harmony, Latin-influenced. |
| **Count Basie** | Riff-head writing, shout choruses, Basie Button, groove-first. |

---

### 2.6 String Quartet / SQ→BB voices

These voices work in String Quartet and SQ→BB Hybrid mode.

| Voice | Musical character |
|---|---|
| **Bartok** | Chromatic clusters, displaced downbeats, Eastern European modal color. |
| **Ravel** | Refined voice-leading, impressionist color, surface elegance. |
| **Shostakovich** | Dark, sardonic, rhythmically displaced. Soviet-era dramatic character. |
| **Messiaen** | Limited transposition modes, birdsong ornament, color-as-harmony. |
| **Joni Mitchell** | SQ stub — open-tuning quartal color in a chamber context. |
| **Herrmann** | Hitchcock chromatic tension, stabbing brass gestures (adapted for SQ). |
| **Williams** | Orchestral sweep, strong melodic statement, Hollywood narrative. |
| **Morricone** | Epic modal drama, space and silence as structural elements. |
| **Glass** | Additive diatonic cells, cycling patterns, minimal harmonic motion. |
| **Badalamenti** | Twin Peaks noir space, chromatic ambiguity, dark atmosphere. |

---

### 2.7 Harmonic voice vs songwriter — what's the difference

**Songwriter** shapes the full compositional character — melody, rhythm, harmony, form all at once.

**Harmonic voice** shapes specifically the harmonic and voice-leading layer — which voicings get used, how chords are approached, what inner voices do. It's a more targeted influence.

In practice: you can set a songwriter AND a harmonic voice. The songwriter drives the surface; the harmonic voice colors the harmony underneath. For example: Metheny as songwriter + Coltrane as harmonic voice produces Metheny-style melody over Coltrane-influenced harmony.

---

### 2.8 Blending two voices

You can blend two VRBs with a weight split (e.g. `Debussy 0.5 + Ravel 0.5`). The blend interpolates between the two voice profiles — the closer in character they are, the smoother the result. Cross-family blends (e.g. Messiaen + Nile Rodgers) are possible but produce less predictable output.

**Good blends:**
- Debussy + Ravel — impressionist watercolour, smooth
- Morricone + Herrmann + Badalamenti — cinematic layering
- Zimmer + Morricone — modern epic with modal drama
- Cole Porter + Gershwin — Broadway gradient

**Unusual blends (intentionally strange):**
- Coltrane + Bartok — interval-cell density meets chromatic clusters
- Ornette Coleman + Arvo Pärt — harmolodic freedom frames tintinnabuli stillness

---

### 2.9 Section architecture — Song, sections, and per-section meter (V64 P6)

Composer OS uses a **Song document**: defaults at the top, **sections** with bar ranges, optional inheritance, and small **local overrides** on specific bars. P6 merges those fields per bar and applies **per-section meter** at generate time (Song Mode, Guitar–Bass Duo, ECM, Big Band, String Quartet).

**Plain-English model**

| Piece | What it is |
|---|---|
| **Song** | Title, `schemaVersion`, global defaults, named profile library, list of sections, local overrides |
| **SongDefaults** | Tempo, meter, default pitch/rhythm/voicing/density, tuning per instrument, humanize |
| **Section** | Bar range (e.g. 1–4), type (verse/chorus/solo…), optional parent via `inheritsFrom`, section profiles, **`meterMap`**, transitions, per-instrument overrides |
| **LocalOverride** | “On bars 6–6 only, set metric displacement to 0.83” |
| **Effective context** | What the generator actually uses **on that bar** after all layers are merged |

**Precedence (lowest wins first, last wins on conflicts)**

1. Song-wide defaults (`SongDefaults.meter`, profiles, tempo…)  
2. Parent section if `inheritsFrom` is set  
3. This section’s pitch / rhythm / voicing / energy / **`meterMap`**  
4. Instrument-specific overrides in that section  
5. Local overrides on matching bars  
6. **Manual API `barMeterMap`** — always wins per bar when you set it explicitly  

**Meter stack (when Zappa GCE structural mode is active)**

| Priority | Source |
|---|---|
| Highest | Request `barMeterMap` (manual API) |
| ↑ | Section `meterMap` (Song schema) |
| ↑ | Zappa GCE auto meter (mode-dependent — see below) |
| Lowest | `SongDefaults.meter` (global fallback; compositions without a Song document unchanged) |

**Per-section meter — plain English**

Set a different time signature per section without re-pasting chords. Example **String Quartet**: **4/4** verse (bars 1–4) → **7/8** bridge (bars 5–8) → **3/4** outro (bars 9–12). Example **Big Band**: **4/4** head → **5/4** solo section. Each section’s `meterMap` carries forward inside that section until the next span.

**Frank Zappa GCE — `zappaGceMeterMode`**

When Zappa GCE auto meter is enabled (`zappaGceAutoBarMeterMapEnabled`), choose how it interacts with section meter:

| Mode | What it does | When to use |
|---|---|---|
| **`disrupt`** (default) | Zappa 7/8 + 5/4 + 4/4 splice **overlays** section meter | Classic Zappa chaos on top of your form |
| **`respect`** | Zappa structural behaviours fire; **section meter untouched** | **String Quartet + Zappa** — harmony/texture without wrecking your 7/8 bridge |
| **`own`** | Zappa owns meter; section meter ignored (`req.barMeterMap` still wins) | Full Zappa metric takeover |

**Sonic Youth example (partly live via per-section VRB markers)**

- **Bars 1–4 (Section A):** base Sonic Youth feel — grid, moderate outside level.  
- **Bars 5–8 (Section B):** same chords/seed, but higher chromatic budget, stronger metric displacement, Slonimsky receipt **SY_SLON_01** on the harmonic voice layer.  

You hear A as “normal noisy SY”; B as “same band, sabotaged metre and more chromatic grit” without re-importing a chart.

**What triggers regeneration when you edit architecture**

| You change… | What re-generates |
|---|---|
| A **named profile** used in several sections | Every section that references it |
| A section’s **bar range** | That section + transition bars at both seams |
| **`meterMap`** on a section | That section’s bars |
| **Instrument overrides** in one section | That section only |
| A **local override** | Only the bars in its range |
| **`inheritsFrom`** | That section and all sections that inherit from it (directly or indirectly) |
| **Global Song defaults** | Whole piece |

Edits that do **not** force new notes: title/labels only, or documentation-only schema bumps with identical resolved values.

**Hard vs soft rules**

- **Hard (block save/load):** overlapping sections, gaps in bar coverage, circular inheritance, tuning profile on wrong instrument, missing profile id after delete.  
- **Soft (warn, still generate):** empty cell sets with sequence ops present, local override path the engine does not recognise yet.

Full spec: **`docs/COMPOSER_OS_SECTION_ARCHITECTURE.md`**. Types + resolution: **`engines/composer-os-v2/core/section-architecture/`**.

---

## Part 3 — Slonimsky Controls

*What they do musically. No theory required.*

---

### 3.1 What Slonimsky is — plain English

Nicolas Slonimsky catalogued 78 melodic patterns in his Thesaurus of Scales and Melodic Patterns (1947). These patterns — called cells — divide the octave in unusual ways, creating melodic shapes that don't follow normal scale logic. Coltrane used them. Zappa used them. They're the source of that "outside but organized" quality in advanced jazz and contemporary classical writing.

In Composer OS, the Slonimsky engine picks cells that fit your chord changes and applies them as melodic color. You don't choose individual cells — you set the flavor and direction, and the engine does the choosing.

---

### 3.2 The five flavors

| Flavor | What it sounds like | Genre / mood |
|---|---|---|
| **Lyrical** | Smooth, singable, flowing. A line you could breathe. | Jazz ballads · Film scoring · ECM-style improv |
| **Angular** | Jumping, sharp-edged, restless. Wide intervals, direction changes. | Art rock · Post-bop · Tense modern chamber |
| **Patterned** | Balanced, slightly uncanny. A phrase that turns around itself. | Modern classical · Prog · Hypnotic soundtrack |
| **Chromatic** | Slippery, dark, searching. Slides and squeezes between notes. | Noir film cues · Avant-jazz · Uneasy slow burns |
| **Riff** | Hooky, driving, repeatable. Locks into a shape with physical pull. | Guitar-driven rock · Fusion vamps · Groove-based |

*(Note: Patterned = Symmetric internally. Display name changed for clarity.)*

---

### 3.3 The three knobs

| Knob | Left (-1) | Right (+1) |
|---|---|---|
| **Motion** | Grounded, stepwise, stays close | Wide-leaping, rangy, interval-driven |
| **Tension** | Calm, consonant, settled | Charged, dark, unresolved |
| **Variation** | Consistent — keeps its shape bar to bar | Unpredictable — morphs further each bar |

**Practical combinations:**

| Sound you want | Motion | Tension | Variation |
|---|---|---|---|
| Settled, lyrical, consistent | -0.3 | -0.5 | -0.3 |
| Building energy | 0 | +0.4 | +0.3 |
| Maximum ferocity (Zappa) | +0.9 | +0.8 | +0.8 |
| Floating, open, ECM | -0.4 | -0.6 | -0.2 |
| Post-bop tension | +0.5 | +0.7 | +0.4 |
| Minimal, patterned | -0.2 | 0 | -0.5 |

---

### 3.4 The harmonic voice selector

Separate from the Slonimsky flavor. The harmonic voice selector lets you assign a specific VRB to the harmonic layer independently of which songwriter is active. This gives you:

- A songwriter driving the melody and rhythm
- A different voice coloring the harmony underneath

Example: Frank Zappa as songwriter + Wayne Shorter as harmonic voice = Zappa's melodic wildness over Shorter's harmonic ellipsis.

Available per mode — the selector shows only voices confirmed to work in the active mode.

**Sonic Youth** ships a dedicated `sonic_youth` VRB — select it as harmonic voice or pick Sonic Youth as Song Mode writer (auto-resolves to the same bundle).

---

### 3.5 The bar-cell strip

After generating, the bar-cell strip shows which Slonimsky cells fired in each bar. Hover over a bar to see the cell ID and pattern name. This lets you see exactly what the engine chose and — in the Advanced drawer — pin or forbid those specific cells on the next pass.

---

### 3.6 The Advanced drawer

The Advanced drawer is the deepest level of Slonimsky control. Open it by clicking the drawer toggle (above the Generate button).

**Cell family browser:** Shows all five flavor families. Expand any family to see the individual cells within it.

**Pin a cell:** Mark a cell to always appear in the next generation. Use this when you like what a specific cell did and want to keep it.

**Forbid a cell:** Mark a cell to never appear. Use this when a cell produced something you don't want repeated.

**Dual-use hint:** Cells that appear in more than one flavor family show a tooltip indicating the overlap. This is useful when you want to bridge between flavors.

**Zappa section:** When Frank Zappa is selected as songwriter or harmonic voice, the drawer gains a Zappa-specific section with ferocity controls, era preset, phrase character, symmetry bias, and chain depth.

---

## Part 4 — Slonimsky by Mode

*Recipes: settings that produce specific musical results.*

---

### 4.1 Song Mode recipes

**Recipe 1 — ECM ballad (Metheny / Lyrical)**
```
Chords:    Cmaj9 | Bm7 | Am9 | Gmaj7
Writer:    pat_metheny
Flavor:    Lyrical
Motion:    -0.3
Tension:   -0.5
Variation: -0.2
```
*Expect:* Floating, spacious, singable. Long phrase arcs. Open inner voices. The kind of melody that sits comfortably over ECM-style chord movement.

---

**Recipe 2 — Post-bop tension (Shorter / Angular)**
```
Chords:    Dm7b5 | G7alt | Cbmaj7 | Ebm9
Writer:    wayne_shorter
Flavor:    Angular
Motion:    +0.6
Tension:   +0.7
Variation: +0.4
```
*Expect:* Oblique, restless, searching. Lines that imply rather than state. Harmonic ambiguity at every turn. Classic Shorter ellipsis.

---

**Recipe 3 — Zappa ferocity burst**
```
Chords:    Am7 | Am7 | Am7 | Am7 | Am7 | Am7 | Am7 | Am7
Writer:    frank_zappa
Flavor:    Chromatic
Motion:    +0.9
Tension:   +0.8
Variation: +0.8
```
*Expect:* Dense, jagged, unpredictable. Maximum ferocity. Burst bars with 12+ events. The engine pushes hard against the static harmony. Open in Sibelius and check the note density per bar.

---

**Recipe 4 — Folk openness (Mitchell / Lyrical)**
```
Chords:    G/B | Cadd9 | D/F# | Em
Writer:    joni_mitchell
Flavor:    Lyrical
Motion:    -0.2
Tension:   -0.6
Variation: -0.4
```
*Expect:* Clear, open, natural arc. Quartal inner voices. Melody that floats above the changes rather than navigating them. Mitchell's open-tuning aesthetic in a standard notation context.

---

**Recipe 5 — Art rock unease (Radiohead / Angular)**
```
Chords:    Em9 | Cmaj7#11 | Bm7 | F#m
Writer:    radiohead
Flavor:    Angular
Motion:    +0.4
Tension:   +0.6
Variation: +0.5
```
*Expect:* Fragile, tense, art-rock bite. Metric unease in the inner voices. Melody that feels slightly off-kilter but always intentional.

---

**Recipe 6 — Coltrane cycles (Coltrane / Patterned)**
```
Chords:    Emaj7 | Cmaj7 | Abmaj7 | Emaj7
Writer:    john_coltrane  (harmonic voice)
Flavor:    Patterned
Motion:    +0.5
Tension:   +0.6
Variation: +0.3
```
*Expect:* Cyclic, driven, interval-cell saturation. The patterned flavor suits Coltrane's tendency to repeat and develop interval cells across the Giant Steps cycle. Feels organized but relentless.

---

### 4.1b V63 promoted voices — musical examples (2026-05-24)

Six voices promoted from stub/generic to full engine surfaces in V63 (S1–S5). Each has a distinctness golden in smoke; no ⚠ badge in the Slonimsky UI.

#### McCoy Tyner (Song Mode writer)

**Example 1 — Simple diatonic**
```
Chords:    Fm7 | Bb7 | Ebmaj7 | Abmaj7
Writer:    mccoy_tyner
Flavor:    Patterned
Motion:    0
Tension:   +0.1
Variation: +0.1
```
*Generate:* Quartal m11/sus stacks, pentatonic melody colour, IV-rooted quartal over minor pedals. *Use when:* Modal jazz ballad or McCoy-era quartet comp under a static progression.

**Example 2 — Modal / ambiguous**
```
Chords:    Dm7 | G7alt | Cmaj7#11 | F#m7b5
Writer:    mccoy_tyner
Flavor:    Angular
Motion:    +0.3
Tension:   +0.35
Variation: -0.05
```
*Generate:* More `mt:iv_quartal` device receipts, sharper stack movement, less Metheny-like float. *Use when:* You want Tyner tension without a functional ii–V–I story.

**Example 3 — Contrast (vs Pat Metheny)**
```
Chords:    (same as Example 1)
Writer A:  pat_metheny
Writer B:  mccoy_tyner
```
*Differs:* Metheny = Lydian float and ECM spacing; Tyner = locked quartal harmony bars (`mccoyTynerEffectiveHarmonyBars`), higher quartal/pentatonic diagnostic counts. Same chords, different effective harmony timeline.

---

#### Sonic Youth (Song Mode — writer + harmonic voice `sonic_youth`)

**Example 1 — Simple diatonic**
```
Chords:    Emadd9 | Emadd9/D | Gsus2 | Asus4
Writer:    sonic_youth
Harmonic:  sonic_youth
Flavor:    Angular
Motion:    +0.5
Tension:   +0.4
```
*Generate:* Sus/add9 field, low loop persistence, anti-metric riff profile, texture receipts on comp chords. *Use when:* Noise-rock sketch with alternate-tuning colour, not polished pop.

**Example 2 — Modal / ambiguous**
```
Chords:    Cmaj7#11 | F#7sus4 | B7alt | Emadd9
Writer:    sonic_youth
Harmonic:  sonic_youth
Flavor:    Chromatic
Motion:    +0.35
Tension:   +0.5
```
*Generate:* More chromatic Slonimsky cell bias (`SY_SLON_01`), higher friction / `noise_wall` texture phases. *Use when:* Deliberately ugly harmony under a “pretty” lead sheet.

**Example 3 — Contrast (vs generic VRB fallback)**
```
Chords:    (same as Example 1)
Writer:    wayne_shorter
Harmonic:  (none)  vs  sonic_youth
```
*Differs:* Without `harmonicVoice: sonic_youth` the engine uses neutral planning; with it you get dedicated VRB (`voiceBundleRhythmAntiMetric: true`, angular/chromatic riff profile). Golden fixture proves measurable pitch/policy delta at same seed.

**Example 4 — Slonimsky cell variation within a song (current vs future)**

**Cell bias (`SY_SLON_01`):** Sonic Youth’s Slonimsky profile weights **angular** and **chromatic** cell families (shock-weighted intent). Under the hood the catalogue pulls from **intervallic**, **semitone_scales**, and **ditone_progression** sections — ditone and semitone motion, not lyrical or symmetric loops.

**What you can do today (whole-chart profile):**
- **Try Another / change seed** — rotates which angular/chromatic cells fire while keeping the same SY bias.
- **Flavor knob** — shift **Angular** ↔ **Chromatic** between passes for more or less half-step shock.
- **Variation knob** — nudges cell rotation within the same family bias without leaving SY territory.
- **Advanced drawer** — after Generate, read the bar-cell strip; **pin** a cell you want back or **forbid** one you never want again on the next pass.
- **No per-section auto-switch yet** — one `sonic_youth` harmonic voice + one Slonimsky profile applies across the full chart until you re-run or override manually.

**Three-section progression (4 bars each):**
```
Section A: Dm7   | Dm7   | Dm7   | Dm7
Section B: AbMaj7 | AbMaj7 | AbMaj7 | AbMaj7
Section C: Em7(b5) | Em7(b5) | Em7(b5) | Em7(b5)

Writer:    sonic_youth
Harmonic:  sonic_youth
Seed:      75001 (change per section for variation today)
```

| Section | Chord | Typical output character (today) |
|---|---|---|
| **A** | Dm7 | Angular **semitone** cells over sus/add9 harmony field; moderate dual-guitar friction; anti-metric riff displacement; texture phase often **riff** or **shimmer**. |
| **B** | AbMaj7 | **Chromatic** family dominates — tritone lift from D minor → limit-tone clash; ditone catalogue cells; friction rises toward **noise_wall** if Tension ≥ +0.5. |
| **C** | Em7(b5) | **Intervallic/angular** return on half-dim colour; tritone/min2 riff cells; register spread widens; clearing or sustained crunch depending on Variation. |

*Use when:* One song form needs section contrast under noise-rock grammar — but you accept manual re-seed or pin/forbid workflow per section for now.

**V64 backlog — per-section VRB (not shipped):** Roadmap item **Per-section VRB** will assign different harmonic/Slonimsky emphasis **per section boundary** in a single Generate pass — no re-paste, no manual seed swap.

*What V64 would change for `sonic_youth` specifically:* Section A could lock **angular / semitone_scales** cells + low **noise_level**; Section B could auto-escalate to **chromatic / ditone_progression** shock-weighting + **noise_wall** texture; Section C could hand off to **intervallic** angular release cells while the SY slice still owns dual-guitar tuning and friction receipts — cell-family switching follows form, not your re-run loop.

---

#### Wes Montgomery (GBD harmonic voice)

**Example 1 — Simple diatonic**
```
Chords:    Am7 | D7 | Gmaj7 | Cmaj7
Harmonic:  wes_montgomery
Flavor:    Lyrical
Chromatic: Subtle
```
*Generate:* Warm octave-leaning line, bebop-blues riff cells, higher `octaveDisplacementTolerance` than funk grid voices. *Use when:* Lyrical GBD duo, not Nile pocket.

**Example 2 — Modal / ambiguous**
```
Chords:    E7alt | A7#11 | Dm9 | G7sus
Harmonic:  wes_montgomery
Flavor:    Riff
Motion:    +0.35
```
*Generate:* Riff-forward 8th grid, more bar-identity persistence than Holdsworth. *Use when:* Blues-modal changes with Wes-style hook repetition.

**Example 3 — Contrast (vs Nile Rodgers)**
```
Chords:    (same as Example 1)
Harmonic A: nile_rodgers
Harmonic B: wes_montgomery
```
*Differs:* Nile = 16th funk top-note grid; Wes = lyrical register mean shift + octave policy (`WM_MELO_01` receipt). Same seed produces different guitar MIDI stream.

---

#### Joe Pass (GBD harmonic voice)

**Example 1 — Simple diatonic**
```
Chords:    Cmaj7 | Am7 | Dm7 | G7
Harmonic:  joe_pass
Flavor:    Lyrical
Chromatic: Subtle
```
*Generate:* Fingerstyle chord-melody approach tones, high `chromaticBudget` on VRB, stepwise targets on strong beats. *Use when:* Solo guitar+bass lead sheet reading.

**Example 2 — Modal / ambiguous**
```
Chords:    F#m7b5 | B7alt | Em9 | A13
Harmonic:  joe_pass
Flavor:    Chromatic
Motion:    +0.18
```
*Generate:* Chromatic enclosures between chord tones; more outside colour than Larry Carlton default. *Use when:* Bebop turnaround over altered dominants.

**Example 3 — Contrast (vs Larry Carlton)**
```
Chords:    (same as Example 1)
Harmonic A: larry_carlton
Harmonic B: joe_pass
```
*Differs:* Larry = fusion lyrical grid; Joe = higher chromatic budget (`JP_MELO_01`), chord-melody fingerprint receipts. Distinct golden vs Larry at same seed.

---

#### Allan Holdsworth (GBD harmonic voice)

**Example 1 — Simple diatonic**
```
Chords:    Cmaj7 | Bm7 | Am7 | Gmaj7
Harmonic:  allan_holdsworth
Flavor:    Chromatic
Chromatic: Prominent
```
*Generate:* Floating legato outside lines, wide leaps (`maxLeapSemitones` 14), low bar-identity persistence. *Use when:* Fusion pad under static maj7 vamp.

**Example 2 — Modal / ambiguous**
```
Chords:    Dm7b5 | G7alt | Cbmaj7 | F#7
Harmonic:  allan_holdsworth
Flavor:    Angular
Motion:    +0.4
```
*Generate:* Dense chromatic cells, behind-grid rhythmic placement. *Use when:* Deliberately non-groove outside solo texture.

**Example 3 — Contrast (vs Scott Henderson)**
```
Chords:    (same as Example 1)
Harmonic A: scott_henderson
Harmonic B: allan_holdsworth
```
*Differs:* Henderson = 16th riff grid + blues chromaticism; Holdsworth = floating legato, higher chromatic budget, lower loop persistence. Cross-golden fixture locks separation.

---

#### Scott Henderson (GBD harmonic voice)

**Example 1 — Simple diatonic**
```
Chords:    G7 | C7 | F7 | Bb7
Harmonic:  scott_henderson
Flavor:    Angular
```
*Generate:* Angular fusion riff hooks, grounded 16th feel, staccato attack pockets. *Use when:* Blues-fusion duo comp.

**Example 2 — Modal / ambiguous**
```
Chords:    Em7 | A7alt | Dmaj7#11 | G7alt
Harmonic:  scott_henderson
Flavor:    Riff
Motion:    +0.55
```
*Generate:* Higher bar-identity persistence, riff-cell repetition (`SH_RIF_01`). *Use when:* Loop-based fusion head over ambiguous dominants.

**Example 3 — Contrast (vs Allan Holdsworth)**
```
Chords:    (same as Example 1)
Harmonic A: allan_holdsworth
Harmonic B: scott_henderson
```
*Differs:* Holdsworth floats outside time; Henderson anchors 16th subdivision grid and riff loops. Same chords — Henderson reads as “fusion blues,” Holdsworth as “outside legato.”

---

### 4.2 Song Mode — section shaping

Use pin/avoid to build an arc across a full song form.

**Tension build through sections:**
```
Intro:      Pin Lyrical · Avoid Chromatic
Verse:      Pin Lyrical
Pre-chorus: Unpin · Allow Angular
Chorus:     Pin Angular · Avoid Lyrical
Bridge:     Pin Chromatic
Outro:      Pin Lyrical
```
*Result:* Composition starts settled and open, builds through restlessness into maximum tension at the bridge, then resolves back to the opening character.

**Contrast arc (AABA form):**
```
A sections: Pin Lyrical
B section:  Pin Angular · Avoid Lyrical
```
*Result:* Classic AABA contrast — the bridge feels genuinely different, not just a different key.

---

### 4.3 Big Band recipes

**Recipe 1 — Thad Jones swing**
```
Chords:       Bbmaj7 | Gm7 | Cm7 | F7
Voice:        thad_jones
Flavor:       Lyrical
Section Role: Lead
Cohesion:     +0.6
Harmonic Grip: +0.5
Preset:       Orchestral
```
*Expect:* Warm, swinging, full ensemble. Lead section carries the melody, inner sections fill with characteristic Thad Jones voicings.

---

**Recipe 2 — Maria Schneider impressionist**
```
Chords:       Emaj7#11 | F#m9 | Dmaj7 | Amaj7
Voice:        maria_schneider
Flavor:       Patterned
Section Role: Support
Cohesion:     +0.3
Harmonic Grip: +0.7
Preset:       Orchestral
```
*Expect:* Spacious, layered, floating. Wide register spread. Sections that color rather than state. ECM-adjacent big band writing.

---

**Recipe 3 — Ferocious fusion BB**
```
Chords:       E7#9 | Bb7#11 | A7alt | D7#9
Flavor:       Angular
Section Role: Counter
Cohesion:     -0.2
Harmonic Grip: +0.8
Preset:       Fusion
```
*Expect:* Jagged, aggressive, dense. Counter-melodic lines fighting each other. High harmonic grip means the engine stays close to the altered chord tones even while pushing outside.

---

**Recipe 4 — Bebop head**
```
Chords:       Dm7 | G7alt | Cmaj7 | A7b9 | Dm7 | G7 | Cmaj7 | Cmaj7
Voice:        count_basie  (or oliver_nelson)
Flavor:       Chromatic
Section Role: Lead
Cohesion:     +0.8
Harmonic Grip: +0.6
Preset:       Bebop
```
*Expect:* Fast, chromatic, bebop-flavored melody in the lead section with characteristic bebop inner voice movement underneath.

---

### 4.4 String Quartet recipes

**Recipe 1 — Bartok tension**
```
Chords:    Cm | F#m | Ebm | Am
Voice:     bartok
Flavor:    Angular
Texture Role: Counterpoint
Voice Independence: +0.8
Register Spread: +0.6
Preset:    Modern
```
*Expect:* Four independent voices, each moving against the others. Chromatic cluster harmony. Eastern European modal color. High rhythmic and melodic independence.

---

**Recipe 2 — Arvo Pärt stillness**
```
Chords:    Amaj | E | F#m | Amaj
Voice:     part
Flavor:    Lyrical
Texture Role: Melody
Voice Independence: -0.6
Register Spread: -0.3
Preset:    Minimal
```
*Expect:* Sparse, pure, tintinnabuli-adjacent. The melody voice sings a simple line while the other voices move in slow, consonant support. Silence is structural.

---

**Recipe 3 — Reich phasing feel**
```
Chords:    Dm | Am | Dm | C | Dm | Am | Bb | C
Voice:     reich_glass
Flavor:    Patterned
Texture Role: Accompaniment
Voice Independence: +0.4
Register Spread: -0.2
Preset:    Minimal
```
*Expect:* Cycling, hypnotic, pattern-driven. The patterned flavor suits Reich's additive process — phrases that shift by small increments. Low register spread keeps the voices close together.

---

**Recipe 4 — Romantic lush**
```
Chords:    Dbmaj7 | Bbm7 | Ebm7 | Ab7 | Dbmaj7
Voice:     ravel  (or dutilleux)
Flavor:    Lyrical
Texture Role: Melody
Voice Independence: -0.4
Register Spread: -0.5
Preset:    Romantic
```
*Expect:* Rich, singing, expressive. Upper violin carries a long melodic line. Inner voices move in smooth, Ravel-style voice leading. Full register with close spacing.

---

### 4.5 Guitar-Bass Duo recipes

**Recipe 1 — Metheny open**
```
Chords:        Gmaj9 | Em9 | Cmaj7 | D11
Voice:         pat_metheny
Outside Level: Subtle
```
*Expect:* Warm, open, lyrical. Guitar carries a clean singing line. Bass provides mobile harmonic support. Outside cells appear occasionally — not intrusive, just colorful.

---

**Recipe 2 — Nile Rodgers groove**
```
Chords:        E9 | A9 | B9 | E9
Voice:         nile_rodgers
Outside Level: Off
```
*Expect:* Hooky, groove-first, tight. Guitar stays close to the chord tones with strong rhythmic character. Bass locks in. No outside cells — this is about the groove, not the color.

---

**Recipe 3 — Van Halen riff energy**
```
Chords:        E5 | D5 | A5 | B5 | E5 | D5 | A5 | A5
Voice:         eddie_van_halen
Outside Level: Subtle
```
*Expect:* Driving, riff-based, angular. Power chord context pushes the engine toward strong rhythmic riff shapes. Subtle outside level adds occasional color without losing the energy.

---

**Recipe 4 — Fripp texture**
```
Chords:        Fmaj7#11 | Cmaj7 | Gmaj7 | Dmaj7
Voice:         fripp
Outside Level: Prominent
```
*Expect:* Oblique, layered, textural. Prominent outside level means cells frequently step away from the chord tones. Fripp's voice profile pushes toward sound-as-texture rather than melody-as-hook.

---

**Recipe 5 — Larry Carlton jazz-pop**
```
Chords:        Cmaj7 | Am7 | Dm7 | G7 | Cmaj7 | Am7 | Fmaj7 | G7
Voice:         larry_carlton
Outside Level: Subtle
```
*Expect:* Smooth, singing, polished. Carlton's voice profile produces clean jazz-pop lines — melodic, accessible, harmonically sophisticated without being aggressive.

---

### 4.6 SQ+BB Hybrid recipes

**Recipe 1 — Conversation**
```
Chords:               Cmaj7 | Am7 | Fmaj7 | G7
Ensemble Relationship: Conversation
Foreground Owner:      Alternating
Density Split:         0
Register Carve:        0
```
*Expect:* SQ and BB trade phrases — one speaks, the other listens. Equal density, equal register. The most natural hybrid texture.

---

**Recipe 2 — Contrast**
```
Chords:               Dbmaj7 | Bbm7 | Ebm9 | Ab7
Ensemble Relationship: Contrast
Foreground Owner:      BB
Density Split:         +0.6
Register Carve:        -0.5
```
*Expect:* BB dense and low, SQ sparse and high. Maximum contrast between the two ensembles. BB carries the weight, SQ provides high filigree.

---

**Recipe 3 — Unison power**
```
Chords:               E7#9 | A7#9 | D7#9 | G7#9
Ensemble Relationship: Unison
Foreground Owner:      BB
Density Split:         +0.8
Register Carve:        +0.3
```
*Expect:* Both ensembles locked together — one massive sound. High density split means BB dominates the texture, SQ reinforces rather than leads.

---

**Recipe 4 — Call and response**
```
Chords:               Bm9 | E13 | Amaj7 | F#m9
Ensemble Relationship: Call and response
Foreground Owner:      SQ
Density Split:         -0.3
Register Carve:        +0.6
```
*Expect:* SQ calls high, BB responds low. The register carve separates them in space. SQ leads — delicate, high, melodic. BB answers — warm, low, full.

---

### 4.7 Advanced drawer recipes

**Pin + flavor combination:**
Pin a lyrical cell, then switch to angular flavor. The engine uses angular motion but returns to the pinned lyrical cell as an anchor. Result: angular movement with a melodic home base.

**Forbid edge case:**
Forbid all cells in the chromatic family, then set chromatic flavor. The engine is forced toward neighboring families — the result sounds like chromatic intent with slightly diatonic resolution. Useful for "almost outside" writing.

**Zappa ferocity via drawer:**
Open the Zappa section inside the drawer. Set:
- Era preset: Blues-Rock Ferocious
- Phrase character: Burst
- Symmetry bias: High
- Chain depth: Maximum

Combined with Chromatic flavor + Motion +0.9 + Tension +0.8 — this is full Zappa ferocity mode. Expect dense burst bars, feedback proxy silence events at phrase ends, maximum outside color.

---

## Part 5 — Section Shaping

*Building an arc across a full arrangement.*

---

### 5.1 What sections are

Composer OS understands standard section labels: **intro · verse · pre-chorus · chorus · bridge · outro** (song mode) and **opening · statement · development · contrast · climax · coda** (instrumental mode).

Each section can have its own Slonimsky flavor pinned or avoided. This means the engine doesn't use one uniform flavor across the whole piece — it follows the arc you set.

---

### 5.2 Pin and Avoid — plain English

**Pin:** "Keep this flavor active here. Make sure cells from this family appear in this section."

**Avoid:** "Steer away from this flavor here. Don't use cells from this family in this section."

You can pin and avoid different flavors in the same section — e.g. pin lyrical and avoid chromatic on the verse, then reverse it on the bridge.

---

### 5.3 Building tension through sections

This is the most common use of section shaping — a composition that starts open and settled, builds through restlessness, peaks at maximum tension, and resolves.

```
Intro:       Pin Lyrical, Avoid Chromatic
Verse:       Pin Lyrical
Pre-chorus:  No pin (allow any flavor)
Chorus:      Pin Angular, Avoid Lyrical
Bridge:      Pin Chromatic, Avoid Lyrical
Outro:       Pin Lyrical, Avoid Chromatic
```

The result tracks a clear emotional arc: settled → open → restless → tense → searching → resolved.

---

### 5.4 Contrast arc

For AABA or verse-chorus structures where the bridge or B section needs to feel genuinely different:

```
A / Verse sections:  Pin Lyrical
B / Bridge section:  Pin Angular, Avoid Lyrical
Return:              Pin Lyrical
```

Simple but effective. The contrast is structural, not just a key change.

---

### 5.5 Cinematic arc

For longer through-composed works (32+ bars):

```
Opening:     Pin Lyrical (establish the world)
Statement:   Pin Patterned (introduce the pattern)
Development: Pin Angular (tension builds)
Climax:      Pin Chromatic (maximum darkness)
Coda:        Pin Lyrical (resolution, but changed)
```

The coda returning to lyrical after chromatic feels like resolution — but the listener has been through something. The same flavor reads differently at the end than at the beginning.

---

### 5.6 Zappa through a song form

```
Intro:   Flavor Chromatic, Motion +0.4, Tension +0.3
Verse:   Flavor Riff, Motion +0.3, Tension +0.2 (hook-based)
Chorus:  Flavor Angular, Motion +0.7, Tension +0.6 (push harder)
Bridge:  Pin Chromatic, Motion +0.9, Tension +0.8 (ferocity peak)
Outro:   Flavor Riff (return to the hook, but you've been through the bridge)
```

The Riff sections provide a recurring anchor. The bridge detonates and returns.

---

## Part 6 — Chord Progressions

*What the engine accepts, what stresses it, and what produces interesting results.*

---

### 6.1 Basic format

Paste chords separated by pipes. One chord per bar.

```
Cmaj7 | Am7 | Fmaj7 | G7
```

The engine matches bar count to the chord count you paste. For a 32-bar piece, paste 32 chords.

**Supported chord types:**
Major 7, minor 7, dominant 7, half-diminished (m7b5), diminished, suspended (sus2, sus4, 9sus4), add9, major 9, minor 9, 13, major 7#11, 7#9, 7b9, 7alt, 6, minor 6.

---

### 6.2 Diatonic progressions — safe baselines

These progressions work cleanly in every mode. Good starting points before you stress-test with harder harmony.

```
Jazz ballad:    Cmaj7 | Am7 | Dm7 | G7
Minor blues:    Am7 | Am7 | Dm7 | Dm7 | Am7 | Am7 | E7 | Am7
Modal (Dorian): Dm7 | Dm7 | G7 | G7 | Dm7 | Dm7 | Em7b5 | A7
Bossa nova:     Amaj7 | F#m7 | Bm7 | E7 | Amaj7 | F#m7 | D#m7b5 | G#7
```

---

### 6.3 Slash chords

Slash chords work — they specify a melody note or bass note over a different chord root. The engine reads both the chord quality and the bass note.

**Pedal point slash chords:**
```
Cmaj7/E | Am7/G | Fmaj7/A | Gsus/D
```
The descending bass line (E → G → A → D) is preserved in the output.

**Implied polychords via slash:**
```
Bb/C | Eb/F | Ab/Bb
```
These read as suspended dominant chords (C11, F11, Bb11) — the engine interprets the upper chord as an extension of the bass root.

**Tritone bass:**
```
F#/G | B/C | E/F
```
Highly dissonant — the bass note is a tritone below the chord root. Expect the engine to choose cells that lean into the tension rather than resolve it.

---

### 6.4 Polychords

Stack two chords using a slash with both chord names:

**Bitonal (Petrushka-style):**
```
[Cmaj/F#maj] | [Gmaj/Dbmaj] | [Dmaj/Abmaj]
```
The engine works with the combined pitch field — expect dense chromatic output.

**Wayne Shorter upper structure triads:**
```
F#maj7/G13 | Bmaj7/C7alt | Emaj7/F7
```
Upper structure above a dominant chord — produces the characteristic Shorter "wrong note that's right" quality.

---

### 6.5 Coltrane changes

The Giant Steps cycle divides the octave into three equal parts (major thirds). The engine handles these correctly — expect high cell density and angular motion as the engine tracks the rapid key centers.

**Short cycle (2 bars each):**
```
Emaj7 | Cmaj7 | Abmaj7 | Emaj7
```

**Full Giant Steps:**
```
Bmaj7 | D7 | Gmaj7 | Bb7 | Ebmaj7 | F#7 | Bmaj7 | Bmaj7
```

**With Coltrane harmonic voice + Patterned flavor:** The engine leans into the cyclic symmetry. The patterned flavor suits this — it produces phrases that mirror the harmonic symmetry of the changes.

---

### 6.6 Modal / static harmony

One chord, many bars. The engine handles this well — uses the Slonimsky cells to create melodic interest without functional harmonic movement.

```
Pure Dorian (8 bars):    Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7 | Dm7
Pure Lydian (8 bars):    Cmaj7#11 | Cmaj7#11 | Cmaj7#11 | Cmaj7#11 | ...
```

**Tip:** With static harmony, use higher Variation (+0.5 to +0.8) to prevent the engine from repeating cells. The more bars of the same chord, the more variation you want.

---

### 6.7 Weird and edge case progressions

**Chromatic mediant moves:**
```
Cmaj7 | Ebmaj7 | Gmaj7 | Bbmaj7
```
Major chords moving by minor thirds. The engine tracks the voice leading — expect smooth chromatic movement despite the large key changes.

**Tritone substitutions:**
```
Cmaj7 | Db7 | Cmaj7 | Db7
```
Db7 substituting for G7. Classic bebop movement — the engine handles this as a conventional dominant substitution.

**All rests (one bar):**
If you include a bar with no chord, the engine holds the previous harmony. Useful for creating a fermata or held moment.

**Single chord, single bar:**
The engine generates a full output even for a one-bar input. Useful for short loops in Riff Generator mode.

---

### 6.8 Chord format reference

| Symbol | Meaning | Example |
|---|---|---|
| `maj7` | Major seventh | Cmaj7 |
| `m7` | Minor seventh | Am7 |
| `7` | Dominant seventh | G7 |
| `m7b5` | Half-diminished | Bm7b5 |
| `dim7` | Diminished seventh | Bdim7 |
| `sus4` | Suspended fourth | Gsus4 |
| `sus2` | Suspended second | Dsus2 |
| `9sus4` | Dominant 9 suspended | F9sus4 |
| `add9` | Add ninth | Cadd9 |
| `maj9` | Major ninth | Cmaj9 |
| `m9` | Minor ninth | Am9 |
| `13` | Dominant thirteenth | G13 |
| `maj7#11` | Lydian chord | Cmaj7#11 |
| `7#9` | Dominant sharp nine | G7#9 |
| `7b9` | Dominant flat nine | G7b9 |
| `7alt` | Altered dominant | G7alt |
| `/` | Slash chord (bass note) | G/B |

---

## Part 7 — Scenario Cookbook

*Ready-to-use starting points. All multi-section scenarios need more than 16 bars total.*

---

### Stylistic contrast

**Sacred to chaotic:**
```
Opening:     arvo_part    (crystalline stillness)
Development: ornette_coleman (harmolodic freedom)
Reprise:     arvo_part    (return to stillness)
```
Hard cut at the development boundary — no transition. The contrast is structural.

**French refinement vs Soviet brutalism:**
```
Opening:     ravel        (smooth impressionist)
Development: shostakovich (displaced downbeats, dark modal)
Coda:        ravel        (refined resolution)
```

**Hollywood sweep to serial fragmentation:**
```
Opening:     williams     (strong orchestral narrative)
Contrast:    webern       (pointillist extremes)
Reprise:     williams     (recovery)
```

---

### Same-family blending

**Impressionist watercolour:**
```
Blend: debussy 0.5 + ravel 0.5
```
Parallel planing softened by Ravel's voice-leading clarity. Smooth throughout.

**Broadway gradient:**
```
Intro/Verse: cole_porter  (controlled cabaret, swing 0.52)
Chorus:      gershwin     (broader jazz exuberance, swing 0.65)
Outro:       cole_porter  (return to precision)
```

**Cinematic three-way:**
```
Blend: morricone 0.4 + herrmann 0.35 + badalamenti 0.25
```
Epic modal drama shadowed by chromatic unease with noir space.

---

### Jazz lineage

**A century of jazz:**
```
Opening:     cole_porter     (Broadway cabaret)
Verse:       gershwin        (jazz-classical)
Chorus:      coltrane        (modal interval cells)
Coda:        ornette_coleman (harmolodic freedom)
```

**Swing gradient:**
```
Intro:       cole_porter  (swing 0.52)
Verse:       gershwin     (swing 0.65)
Chorus:      turtle_island (swing 0.80)
```
Progressive swing intensification.

**Joni Mitchell bridge:**
```
Verse:  cole_porter   (Broadway sophistication)
Bridge: joni_mitchell (open-tuning quartal)
Chorus: gershwin      (jazz exuberance)
```

---

### Cinematic arc

**The Hero's Journey:**
```
Opening:     badalamenti  (noir ambience)
Statement:   morricone    (epic modal drama)
Development: goldsmith    (Hollywood tension)
Climax:      williams     (orchestral sweep)
Coda:        badalamenti  (noir return)
```
64+ bars. Boundary ramp active.

**Suspense to resolution:**
```
Opening:     herrmann     (Hitchcock unease)
Development: goldsmith    (Hollywood tension)
Coda:        williams     (orchestral resolution)
```

---

### Modernist cluster

**The Modernist Arc:**
```
Opening:     shostakovich (displaced downbeats)
Development: bartok       (chromatic clusters)
Contrast:    ligeti       (micropolyphony)
Coda:        webern       (serial pointillism)
```
64+ bars.

**Soviet Sandwich:**
```
Opening:   shostakovich
Contrast:  ligeti
Reprise:   shostakovich
```
Same family — transitions smooth naturally.

---

### Messiaen mode explorations

| Mode | Character |
|---|---|
| M1 — Floating | Whole tone, airborne, unresolved |
| M2 — Shadowed | Octatonic, dark, symmetric tension |
| M3 — Luminous | 9-note field, rich, devotional |
| M4 — Austere | Compact, restrained, precise |
| M5 — Sparse | Wide open, very few pitches |
| M6 — Veiled | Ambiguous, colour-shifting |
| M7 — Dense | 10-note field, maximum saturation |

**Colour sequence (light to dark):**
M1 Floating → M2 Shadowed → M6 Veiled → M7 Dense

**Sparse to dense:**
M5 Sparse → M3 Luminous → M7 Dense

---

### Minimal vs maximal

**The Sigma Journey (register arc):**
```
Opening:     arvo_part  (σ=16, narrowest)
Development: ligeti     (σ=32, doubles)
Climax:      webern     (σ=40, maximum)
Coda:        arvo_part  (σ=16, collapses back)
```
Pure register drama. 64+ bars.

**Glass vs Herrmann:**
```
Opening:  glass    (σ=18, additive diatonic)
Contrast: herrmann (σ=36, Hitchcock clusters)
Coda:     glass    (σ=18, return)
```

---

### Solo instrument simulation

**Coltrane Quartet:**
```
Mode:     String Quartet
Voice:    coltrane
Character: Melody cycles interval-cell patterns, inner voices share cell, bass holds modal pedal.
```

**Sax and Bass Duo (Ornette style):**
```
Mode:     Guitar/Bass Duo
Voice:    ornette_coleman
Character: Guitar takes melody overlay, bass takes floating overlay. No chord roots.
```

---

## Part 8 — Working with your DAW / Notation Software

---

### 8.1 Sibelius

**Import:** File → Open → select the MusicXML file. Sibelius imports all parts, dynamics, and articulations from the export.

**Playback check:** Before listening, check:
- Tempo is set correctly (Composer OS exports at the tempo you set)
- Instrument sounds are assigned (default Sibelius sounds work well for initial review)
- Mixer levels are balanced — the engine doesn't mix, it writes

**What to listen for:**
- Is the melodic line sitting at the right register for your instrument?
- Are the inner voices creating harmony or clutter?
- Is the rhythmic density right for your tempo?
- Does the Slonimsky color appear where you expected it?

**What Sibelius can't tell you:** Whether the engine made musically interesting choices. That requires a musician's ear. Listen to at least 4 bars before deciding to regenerate.

---

### 8.2 Guitar Pro

Import → MusicXML → open the exported file. Guitar Pro renders all parts. Check the tab view for guitar-specific parts — the engine writes standard notation, not guitar-idiomatic notation, so some passages may need editing for playability.

---

### 8.3 Cubase

File → Import → MusicXML. Cubase imports all tracks. Assign VST instruments to each track for playback. The engine exports with standard MIDI instrument names — match these to your VST library.

---

### 8.4 What the engine can't decide for you

- **Dynamics:** The engine suggests dynamic markings but doesn't mix. You set the balance.
- **Articulation detail:** Broad articulation is written (staccato, slur, accent) but detailed bowing, fingering, or guitar technique is yours to add.
- **Tempo changes:** The engine generates at a fixed tempo. Rallentando, rubato, and tempo variation are your edit.
- **Orchestration decisions:** In Big Band and SQ modes, the engine writes all parts — but doubling decisions, divisi, and section balance are yours to refine.

---

## Part 9 — Quick Reference

---

### 9.1 Mode selector

| Mode | Voices | Output |
|---|---|---|
| Song Mode | Songwriter + harmonic voice | Lead melody + harmony |
| Big Band | Arranger voice | Full ensemble chart |
| String Quartet | Harmonic voice | 4-voice chamber |
| Guitar-Bass Duo | VRB voice | 2-voice, melodic/groove |
| ECM Chamber | Songwriter | Sparse, impressionist |
| Riff Generator | Riff VRB | 1–32 bar loops |
| Slonimsky Etude | None | Pattern-driven etude |
| SQ→BB Hybrid | SQ voice + BB voice | Dual ensemble |

---

### 9.2 Voice depth reference

| Voice | Depth | Best mode |
|---|---|---|
| Clare Fischer | Deep (44) | Big Band |
| Quincy Jones | Deep (46) | Big Band / Song |
| Sammy Nestico | Deep (41) | Big Band |
| Count Basie | Deep (38) | Big Band |
| Pat Metheny | Deep (12) | Song / GBD |
| Thad Jones | Deep (12) | Big Band |
| Bob Brookmeyer | Deep (12) | Big Band |
| Oliver Nelson | Deep (12) | Big Band |
| Messiaen | Deep (12) | SQ / SQ→BB |
| Wayne Shorter | Deep (11) | Song |
| Maria Schneider | Deep (11) | Big Band |
| Gil Evans | Deep (11) | Big Band |
| Charles Mingus | Deep (11) | Big Band |
| Duke Ellington | Deep (11) | Big Band / Song |
| John Coltrane | Deep (10) | Song / SQ |

---

### 9.3 Flavor × genre

| Flavor | Jazz | Classical | Rock | Film |
|---|---|---|---|---|
| Lyrical | ECM ballad, bossa | Romantic, impressionist | Singer-songwriter | Warm themes |
| Angular | Post-bop, free | Modern, Bartok | Art rock, prog | Tension cues |
| Patterned | Modal, Coltrane | Reich, Glass, minimalist | Prog, krautrock | Hypnotic underscore |
| Chromatic | Avant-jazz, Shorter | Contemporary, Berg | Experimental | Noir, unease |
| Riff | Funk, groove jazz | — | Rock, fusion | Action, drive |

---

### 9.4 Knob settings cheat sheet

| Sound goal | Motion | Tension | Variation |
|---|---|---|---|
| Settled, lyrical | -0.3 | -0.5 | -0.3 |
| ECM floating | -0.4 | -0.6 | -0.2 |
| Post-bop tension | +0.5 | +0.7 | +0.4 |
| Building energy | 0 | +0.4 | +0.3 |
| Ferocity (Zappa) | +0.9 | +0.8 | +0.8 |
| Minimal/patterned | -0.2 | 0 | -0.5 |
| Art rock unease | +0.4 | +0.6 | +0.5 |
| Modal static | 0 | +0.2 | +0.6 |

---

### 9.5 Slonimsky cell families

| Family | Display name | Character |
|---|---|---|
| lyrical | Lyrical | Smooth, singable, stepwise |
| angular | Angular | Wide intervals, direction changes |
| symmetric | Patterned | Cyclic, balanced, slightly uncanny |
| chromatic | Chromatic | Half-step motion, dark, searching |
| riff | Riff | Repeating shape, rhythmic, hooky |

Each family contains multiple cells (the 78 Slonimsky patterns are distributed across the five families). The Advanced drawer lets you browse and pin/forbid individual cells within each family.

---

## Part 10 — Section architecture (Song object)

*What changes when you attach a multi-section **Song** document to Generate.*

### 10.1 What it means in practice

Composer OS can accept a **Song** object alongside your chord progression. Each **section** (Intro, Verse, Chorus, Bridge, Outro, etc.) carries its own:

- **Pitch profile** — register floor/ceiling, chromatic budget
- **Rhythm profile** — anti-metric feel, metric displacement
- **Voicing profile** — spread and harmonic-rhythm hold windows
- **Energy** — maps to an overall density arc for that section
- **Instrument overrides** — per-part **density** and **riffMode** (guitar and bass independently)

At generate time the engine:

1. Validates the Song (`validateSong`) — overlapping sections or bad bar ranges halt with a clear error
2. Bridges section labels into the form map (Intro / Verse / Chorus appear as rehearsal marks)
3. Resolves **`resolveEffectiveContext(bar, song)`** per bar — cached for the run
4. Fans resolved profiles into harmony rhythm, voicing spread, pitch fields, and duo density

**No Song object?** Nothing changes — global defaults only, same as before V65.

### 10.2 Sonic Youth five-section example (seed 80001)

A 16-bar Song Mode piece with five sections:

| Section | Bars | Character | density | riffMode |
|---|---|---|---|---|
| Intro | 1–3 | Noise drone | sparse | `noise_drone` |
| Verse | 4–6 | Motorik grid | moderate | `motorik` |
| Chorus | 7–10 | Wall of sound | dense | `wall_of_sound` |
| Bridge | 11–13 | Slonimsky cells | (energy-driven) | `slonimsky_cells` |
| Outro | 14–16 | Sparse drone | sparse | `sparse_drone` |

**What you hear:** Intro sits low and thin; chorus pushes register ceiling and energy; bridge climbs higher than intro; outro thins again. Same pasted `Dm7` progression — different section behaviour from architecture, not from re-seeding.

Bridge and outro use **`interpolateDensity`** at section seams so density ramps rather than hard-jumps.

### 10.3 Density and riffMode per section (GBD example, seed 80002)

A 16-bar Guitar–Bass Duo with three sections:

| Section | Bars | Guitar / bass density | riffMode |
|---|---|---|---|
| A | 1–5 | sparse | `groove_sparse` |
| B | 6–10 | dense | `groove_dense` |
| C | 11–16 | moderate | `motorik` |

Instrument overrides are scoped by part (`guitar` vs `bass`). Resolved density scalars differ measurably between A and B even on identical harmony.

**Golden verification (off smoke until V65 closeout):** `engines/composer-os-v2/scripts/runSectionArchitectureP1Golden.ts`

### 10.4 Per-instrument tuning per section

Sections can now change guitar tuning as part of the form. That means the same song can keep one tuning for the intro and verse, then switch tuning at a bridge without changing the global preset.

Plain English:

- `guitarA` targets the main guitar part (`guitar`)
- `guitarB` targets the second guitar part (`guitar_2`)
- Each section can name a tuning preset such as `sy_aaddgg` or `sy_eebddg`
- No Song object means no tuning change; legacy behaviour is unchanged

Sonic Youth example:

| Section | Bars | Main guitar tuning | Musical effect |
|---|---:|---|---|
| Intro | 1–4 | `sy_aaddgg` | Paired A/D/G drone bed |
| Verse | 5–10 | `sy_aaddgg` | Keeps motorik continuity |
| Bridge | 11–16 | `sy_eebddg` | Darker E/B grind with doubled D/G pressure |

Composer OS resolves the active tuning per bar. The score also carries per-section tuning diagnostics so exported XML can show section tuning changes.

### 10.5 Per-section Slonimsky cell families

Sections can choose their Slonimsky catalogue family through `pitchProfile.cellSets`. This changes the chromatic cell vocabulary by section instead of using one global chromatic language.

Example:

| Section | `pitchProfile.cellSets` | What changes |
|---|---|---|
| Verse | `ditone_progression` | Wider equal-division cells, more angular |
| Bridge | `semitone_progression` | Tighter chromatic pressure and half-step motion |

The Song Mode Slonimsky layer now reads the active section at generation time. Goldens check that the verse and bridge resolve different cell families and produce different melodic interval signatures.

### 10.6 Big Band section profiles

Big Band and String Quartet ensemble paths now receive the same section architecture context as Song Mode. For Big Band, section energy and voicing profile can shape density and spread per section.

Example:

| Section | Bars | Energy / density | Voicing profile |
|---|---:|---|---|
| A | 1–5 | sparse | max spread 18 semitones |
| B | 6–10 | dense | min spread 36 semitones |
| C | 11–16 | moderate | max spread 24 semitones |

This lets an arranger sketch read like a chart: lean opening, wide shout section, controlled ending. Drum-module behaviour is unchanged and deferred to P4.

**Golden verification (off smoke until V65 closeout):** `engines/composer-os-v2/scripts/runSectionArchitectureP2Golden.ts`

---

## Part 11 — MusicXML Import and Sibelius QA

*How imported MusicXML can seed Composer OS generation, and what export QA means today.*

### 11.1 Importing a MusicXML score

Use the MusicXML import field in the Generate screen, or send a `musicXmlSource`, `songModeLeadSheetMusicXml`, or `ensembleLeadSheetMusicXml` payload through the API. Composer OS now has an additive **deep import** path: it reads the score, builds an imported **Song** object, and uses that Song alongside locked harmony when you generate.

Plain English:

- Chord symbols become the locked harmony rail
- Rehearsal marks become Song sections
- Meter changes become per-section meter maps
- Tempo markings become the Song default tempo
- Part names become instrument-role hints such as guitar, bass, strings, brass, woodwinds, drums, or keys

This works without replacing the older `parseMusicXml` and LeadSheet import paths. Existing imports keep their behaviour; the new path adds section-aware Song data on top.

### 11.2 What gets extracted

| MusicXML content | Composer OS use |
|---|---|
| `<harmony>` chord roots, quality, alterations, slash bass | `lockedHarmonyBars` |
| Rehearsal marks | `Song.sections` |
| Per-bar time signatures | `SectionPreset.meterMap` |
| Tempo directions / `<sound tempo>` | `Song.globalDefaults.tempo` |
| Part names | Instrument role hints |
| Existing lead-sheet content | Optional LeadSheet handoff for Song Mode / BB / SQ |

### 11.3 What does not get extracted yet

- Lyrics
- Non-voice-1 melody as full musical material
- Stacked notes as full arranged voicings
- Detailed articulations as generation constraints
- Full round-trip part writing from imported scores
- Drum-specific interpretation

Multiple parts are detected, but today they mostly provide role hints rather than literal "use this exact part" instructions.

### 11.4 Sibelius QA status

V65 P3 automated QA generated short MusicXML files for all target modes and ran the repository validator.

| Mode | Automated | Manual Sibelius |
|---|---|---|
| Song Mode (`guitar_bass_duo` export path) | PASS | Confirmed 2026-04-17 |
| Guitar-Bass Duo | PASS | Confirmed 2026-05-02 |
| ECM chamber | PASS | TBD |
| String Quartet | PASS | TBD |
| Big Band | PASS | TBD |
| Riff generator | PASS | TBD |
| Wyble etude | PASS | TBD |
| Slonimsky etude | PASS | TBD |

Detailed report: `docs/SIBELIUS_QA_REPORT.md`.

**Golden verification (off smoke until V65 closeout):** `engines/composer-os-v2/scripts/runMusicXmlDeepImportGolden.ts`

---

*End of Composer OS Musician Guide*
*Version: V65 — 2026-05-25*
*For engine detail: COMPOSER_HANDBOOK.md*
*For roadmap: COMPOSER_OS_ROADMAP.md*
