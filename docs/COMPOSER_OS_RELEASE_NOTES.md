# Composer OS — Release notes (user-facing)

Short notes for people using Composer OS. **Newest first.**

---

## 2026-04 — MusicXML lead sheets, safer harmony, optional enrichment

**What changed**

- **Release build/version alignment:**  
  Desktop package and surfaced engine version are now aligned at **1.0.41** for this ship pass.

- **Indie Art Pop in Song Mode now feels more intentionally arranged in one run.**  
  When you pick **Indie Art Pop**, you should hear clearer separation between the **main melody guitar** and the **inner part**, a little more **quiet vs loud** breathing between sections, and more **space at phrase edges** so returns can land with more impact. If you use **optional alternate tunings**, they steer that character further—more sustain or open color on shared presets, and a stronger **bed vs riff** split when the two guitars use **different tunings**. Other Song Mode styles are unchanged.

- **Song Mode now includes optional diversity presets.**  
  You can quickly choose curated songwriter blends for stronger musical contrast between runs, while defaults and manual controls remain unchanged if you prefer your existing workflow.

- **Indie Art Pop now includes optional alternate guitar tuning controls (v1).**  
  In Song Mode, you can keep standard tuning, set one tuning for both guitars, or set separate tunings for Guitar 1 and Guitar 2 with curated presets (plus custom 6-string entries). If you leave this off, generation stays on the normal defaults.

- **Indie Art Pop separate-tuning runs now stay guitar-led end to end.**  
  Song Mode now preserves both selected guitar tunings in the Indie Art Pop separate-tuning path and exports that route as two electric guitars (not piano/upright-bass fallback labels). If either side resolves to standard tuning in that route, the run is rejected instead of silently falling back.

- **ECM in Song Mode now feels more spacious and harmonically softer.**  
  ECM now leans further into open space, modal color, and gentler dominant motion so phrases breathe more and cadences resolve less abruptly.

- **MusicXML from notation apps works better when melody and chords are split.**  
  If your tune has the **melody on one part** (usually the first instrument line) and **chord symbols on another part or staff**, Composer OS can now **bring the chord symbols in** while still treating the **first part as the melody** and **song length** source. That matches how many people export from Sibelius, MuseScore, and similar tools.

- **Harmony you import stays the boss.**  
  The chords from your file are always the **source of truth** for the actual song harmony that drives generation. Nothing silently replaces your chords with a different progression.

- **Optional “extra reading” of harmony (Tonality Vault style).**  
  When this optional layer is available in your setup, Composer OS can add a **light interpretation** on top of your imported chords (for example, whether a chord looks more “inside” or “outside” the written key). It is **off unless your environment enables it**, and it **never changes** the raw chord list you imported.

- **Harmony display modes in the system.**  
  A generating request can ask for **Raw**, **Enriched**, or **Compare**:
  - **Raw** — show and use the chords from the file only (default).
  - **Enriched** — also use the optional interpretation when it is available; if it is not, you stay on raw and see a clear note.
  - **Compare** — side-by-side style data for people who want both the imported chords and the optional interpretation in one place (for tools, receipts, or future UI).

**Why it matters**

- Fewer “I pasted my chart but the chords disappeared” moments when chords live on a comping part instead of the top line.
- You can trust that **your chart is still your chart**, with optional extras only when you want them and when your setup allows them.

**Notes / known limits**

- In **Song Mode**, the Generate screen now includes a **Harmony interpretation** selector (**Raw / Enriched / Compare**) beside the LeadSheet MusicXML input. If optional enrichment is unavailable in your runtime, it clearly falls back to **Raw**.
- Optional enrichment only runs when it is **turned on for the server or build** that answers your Generate request. If it is off, **Enriched** and **Compare** still work logically, but the “extra layer” will simply be empty or fall back to raw with a short explanation — never a hard failure.
- Very dense scores (many voices, lyrics-heavy parts, unusual layouts) may still log **warnings**; unsupported bits are skipped rather than guessed.

**Doc pointers**

- Plain-language how-to: **[COMPOSER_OS_USER_GUIDE_MUSICXML_AND_HARMONY.md](COMPOSER_OS_USER_GUIDE_MUSICXML_AND_HARMONY.md)**  
- Full app guide (all features): **[USER_GUIDE.md](USER_GUIDE.md)**

---

Older entries can be added above as you ship more releases.
