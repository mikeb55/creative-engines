## Chapter: Reharmonisation Panel

The **Reharm preview** panel on **Generate** lets you audition **composer-weighted** substitution chains on a **bar range** of your pasted progression—without leaving Song Mode. It sits on the same spine as **Chord Inspector** and **Tonality Vault**: symbols resolve through the vault chord-type universe, candidates rank by emotional drift and voice-leading penalties, and **Apply** writes the merged progression back into the paste field so the next **Generate** hears your edit.

This is a **personal instrument**, not a product feature in the marketing sense: it exposes engine diagnostics (placeholder **GCE** readout per lens, strategy labels, mapping failures) so *you* decide what counts as a better harmony—not a single “best” button.

### What it does

| Capability | Detail |
|------------|--------|
| **Range audition** | Pick **start / end bar** (1-based, within your song-form bar count). |
| **Lens blend** | Choose **1–3** songwriter **lenses**; each runs an independent ranked progression. |
| **Vault truth** | Bars map to **Tonality Vault** `chordTypeId` + root PC where possible; unmappable bars **pass through**. |
| **Cross-bar cost** | Ranker penalises rough root motion beyond a tritone on the pitch-class circle. |
| **Seed** | Optional integer for deterministic tie-breaks between tied scores. |
| **Apply** | Splices substitute symbols into **`parsedCustomProgressionBars` / locked paste** for that range and triggers regeneration (see **LOCK** note below). |

### Architecture (engine ↔ UI)

| Layer | Responsibility |
|-------|----------------|
| **`harmonyRangeResolver`** | `getChordRangeForBars` → per-bar chord string via **`getChordForBar`** + vault mapping / `mappingNull`. |
| **`reharmLensConfig`** | Heuristic weights per lens: **`tritoneRate`**, **`susBias`**, **`chromaticMediantBias`**, **`poolSampling`**. |
| **`reharmCandidateEngine`** | Enumerates same-root vault substitutes; **`scoreReharmCandidate`** = internal combined rank. |
| **`reharmSequenceRanker`** | Greedy bar picks with lens-weighted score ÷ transition denominator. |
| **`reharmController`** | **`executeReharm`** (preview scores), **`applyReharmAlternative`** (full-bar array splice). |
| **`HomeGenerate` + `ReharmPanel`** | Collapsible UI; **Apply** updates **`chordProgressionText`** and calls **`generate()`**. |

**LOCK reality (must-read):** Apply updates the **pasted wire**. Slice **effective harmony** metadata may still diverge until LOCK reconciliation is wired—see code **`// TODO: LOCK reconciliation needed`** at the apply site. Treat Apply as **authoritative paste edit**, then verify notation vs ear on the next export.

### The eleven lenses (preview checklist)

Each lens is a **`buildReharmLensConfig`** preset keyed by songwriter id. The UI lists these **display names** (ids in parentheses for power users):

| # | Lens (id) | Character (what moves in ranking) |
|---|-----------|-----------------------------------|
| 1 | **Antônio Carlos Jobim** (`antonio_carlos_jobim`) | Bossa chromatic side-doors; moderate tritone colour; **poolSampling** on. |
| 2 | **Bill Evans** (`bill_evans`) | Sus / colour extensions over functional roots; **low** tritone appetite. |
| 3 | **Wayne Shorter** (`wayne_shorter`) | Post-bop lateral roots + modal plateaus; balanced tri/tension. |
| 4 | **Thelonious Monk** (`thelonious_monk`) | Angular substitutions—**high** tritone weight, **low** sus bias. |
| 5 | **Donald Fagen** (`donald_fagen`) | Jazz-rock altered dominant vocabulary; chromatic mediants weighted. |
| 6 | **Radiohead** (`radiohead`) | Alternative-rock ambiguity—**high sus**, restrained tritone. |
| 7 | **Philip Glass** (`philip_glass`) | Minimal motion bias—**low** chromatic-mediant and tritone weights. |
| 8 | **Bernard Herrmann** (`bernard_herrmann`) | Thriller string chromaticism—strong altered-colour affinity in ranking. |
| 9 | **Duke Ellington** (`duke_ellington`) | Orchestral jazz vocabulary—balanced colours + **poolSampling**. |
|10 | **Maria Schneider** (`maria_schneider`) | Large-ensemble colour washes—high chromatic-mediant bias. |
|11 | **Gil Evans** (`gil_evans`) | Cool-jazz colour fields—mid sus + **high** chromatic-mediant bias. |

Aliases: UI accepts **`jobim`** → canonical **`antonio_carlos_jobim`** in lens resolution elsewhere in the engine.

### How to use it (happy path)

1. **Song Mode** → paste **exactly** your song-form bar count (`|` barlines).  
2. Open **Reharm preview** (below **Chord Inspector**).  
3. Set **start / end bar**, optionally **seed**, tick **1–3 lenses**.  
4. **Reharm** → compare columns: **GCE (preview)** is a **mean combined-rank ×10** placeholder until full **`gceAutoScorers`** wiring—not a certified lesson grade.  
5. **Apply** on a column → progression text updates → **Generate** runs with the new harmony wire.

**Dimmed rows** in the table (`mappingNull`, `passthrough`, `identity`) did not receive a vault substitution on that bar—they keep the original symbol for that step.

---

### Twenty varied examples (quick workshop)

Use these as **range ideas** (often 4-bar cells); transpose keys freely.

| # | Style hint | Progression sketch | Lenses to try |
|---|------------|-------------------|---------------|
| 1 | Tin Pan Alley turnaround | `Cmaj7 \| A7 \| Dm7 \| G7` | Fagen · Jobim · Duke |
| 2 | Aeolian rock loop | `Am \| F \| C \| G` | Radiohead · Glass · Bill Evans |
| 3 | Modal drift | `Dm9 \| G13sus \| Cmaj9 \| —` | Schneider · Gil Evans · Jobim |
| 4 | Harmonic minor flair | `Em7b5 \| A7alt \| Dm \| —` | Monk · Herrmann · Wayne Shorter |
| 5 | Chromatic descent | `Cmaj7 \| Bm7b5 \| Bbm7 \| Am7` | Fagen · Duke · Schneider |
| 6 | Pedal sky | `Emaj7/B \| Emaj7/B \| F#m7/B \| G#m7/B` | Gil Evans · Maria · Radiohead |
| 7 | Odd-ball bridges | `Abmaj7 \| G7#11 \| Fm9 \| E7#9` | Monk · Herrmann · Fagen |
| 8 | Bossa lift | `F#m7 \| B7 \| Emaj9 \| C#m7` | Jobim · Bill Evans · Duke |
| 9 | Post-rock stasis | `Esus2 \| Asus2 \| Esus2 \| Asus2` | Glass · Radiohead · Philip Glass heavy |
|10 | Waltz fragment | `Bbm7 \| Eb7 \| Abmaj7 \| G7alt` | Duke · Schneider · Wayne Shorter |
|11 | Blues skew | `C7 \| F7 \| C7 \| G7 F7` | Duke · Monk · Ellington |
|12 | Film noir | `Dm6 \| E7b9 \| Am7 \| Am6` | Herrmann · Monk · Bill Evans |
|13 | ECM openness | `Em11 \| Asus9 \| Dmaj7#11 \| —` | Bill Evans · Schneider · Gil Evans |
|14 | Funk vamp | `E9 \| E9 \| E9 \| B/E` | Fagen · Duke · Radiohead |
|15 | Parallel slash story | `Gmaj7/B \| Gmaj7/B \| Am7/C \| D7/C#` | Fagen · Wayne · Gil Evans |
|16 | Dim passing chain | `Bdim7 \| Bb13 \| Am9 \| Adim7` | Monk · Herrmann · Wayne Shorter |
|17 | Maj cluster cadence | `Gmaj9 \| F#m11 \| Fmaj7#11 \| E7alt` | Schneider · Maria · Fagen |
|18 | Mixed-mode chorus | `Dbmaj7 \| Cm11 \| Bbm9 \| Ab13` | Duke · Jobim · Wayne Shorter |
|19 | Aggro rock IV | `A5 \| D5 \| E5 \| F5` | Radiohead · Glass · Monk *(expect pass-through rows)* |
|20 | Poly-root teaser | `Gm11 \| Dbmaj7/Eb \| Fm9 \| B13` | Gil Evans · Schneider · Herrmann |

---

### Three complete 32-bar workshop songs

Treat each block as **one chorus** you can paste wholesale (adjust meter/tempo in UI as usual). After **Reharm**, compress ranges (e.g. **bars 5–12**) before Apply if you only want a section touched.

#### Song A — Minimalist post-rock plateau (hypnotic)

**Original (32 bars, `|`-separated):**

```
| Esus2 | Esus2 | Asus2 | Asus2 | Esus2 | Esus2 | Asus2 | Asus2 |
| Dmaj7 | Dmaj7 | A/D | A/D | Esus2 | Esus2 | Asus2 | Asus2 |
| Esus2 | Esus2 | Asus2 | Asus2 | F#m11 | F#m11 | A | A |
| Esus2 | Esus2 | Asus2 | Asus2 | Dmaj7 | Dmaj7 | Asus2 | Asus2 |
```

**Lens triads:** **Philip Glass** + **Radiohead** + **Bill Evans** — expect **Glass** to privilege smooth sus/modal reads; **Radiohead** to flirt with ambiguous colours; **Evans** to lean sus colour without jazz-rock slash clutter.

#### Song B — Jazz waltz big-band flavour (functional shell)

**Original:**

```
| Bbm7 | Eb7 | Abmaj7 | G7alt | Cm7 | F7 | Bbm7 | Bdim7 |
| Bbm7 | Eb7 | Abmaj7 | Fm7 | Bbm7 | Eb7 | Abmaj7 | G7alt |
| Cm7 | F7 | Bbm7 | Eb7 | Abmaj7 | — | Fm7 | Bbm7 |
| Eb7 | Eb7 | Abmaj7 | G7alt | Cm7 | F7 | Bbm7 | Eb7 |
```

**Lens triads:** **Duke Ellington** + **Maria Schneider** + **Wayne Shorter** — Ellington for orchestral functional colour; Schneider for mosaic cadences; Shorter for lateral dominants without washing out the waltz lift.

#### Song C — Experimental rock hybrid (chromatic + pedal)

**Original:**

```
| Em9 | Cmaj7/B | Em9 | Bb13 | Am11 | D7#9 | Gmaj7 | F#m7b5 |
| B7#11 | Em9 | Cmaj7 | B7alt | Em9 | Asus9 | Gmaj7#11 | F#7b9 |
| Bm11 | E7#9 | Am11 | D13 | Gmaj7 | Gm7 | C9sus | F#7alt |
| Bm7 | E7 | Am9 | D13 | Gmaj7 | — | Em9 | B7alt |
```

**Lens triads:** **Donald Fagen** + **Monk** + **Gil Evans** — Fagen for altered-dominant literacy; Monk for angular overlaps; Gil Evans for colour-field spreads without losing rock-forward roots.

---

### Practice protocol (teachers & self-study)

1. **Start mono-lens** — learn how one composer biases sus vs tritone before stacking lenses.  
2. **Short windows first** — 4-bar phrase cycles before whole-form Apply.  
3. **Trust dim rows** — they flag vault boundary issues; fix spelling or accept pass-through.  
4. **Re-generate after Apply** — ear-check **MusicXML** in your host; LOCK parity is still evolving.  
5. **Journal seeds** — when you love an audition, note **seed + lens set** for reproducible class demos.

### Design principle

The Reharm panel is built as a **personal instrument**: it surfaces **ranking mechanics**, **strategy receipts**, and **honest mapping failures** so educators and arrangers stay in the loop—rather than hiding substitution logic behind a single opaque “Enhance” control. Use it to **teach harmonic intention**, not to outsource taste.
