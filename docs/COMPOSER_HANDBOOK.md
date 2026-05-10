# Composer OS handbook

Practical notes for **using** Composer OS—generation, evaluation, and quality workflows. For architecture detail see **`COMPOSER_OS_ARCHITECTURE.md`**; for roadmap see **`COMPOSER_OS_ROADMAP.md`**.

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

- **Big band:** **7.5**
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

### Works across formats

Fingerprints carry a **format** tag (**big band**, **string quartet**, **duo**, **ECM**). Extraction targets that format’s scoring layout; the **workflow** is the same everywhere—extract trusted output, validate new runs against it, retry.

---

*Structural memory is additive: every high-quality artifact you codify becomes a reusable **anchor** for the next generation pass.*
