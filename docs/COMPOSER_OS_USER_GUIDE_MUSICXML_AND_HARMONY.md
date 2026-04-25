# MusicXML lead sheets and harmony — plain guide

This page is for **anyone using Composer OS with a MusicXML lead sheet** — not for programmers. It explains what the app does with your file, in everyday language.

If you want the big picture of the whole app, start with **[USER_GUIDE.md](USER_GUIDE.md)**.

---

## Importing MusicXML

You can give Composer OS a **MusicXML** file (sometimes shown as `.musicxml` or `.xml`) or a **packed** `.mxl` file from your notation program.

- The app expects a normal **part-by-part** MusicXML export (the usual “score” layout), not a rare alternate layout.
- **Melody** is read from the **first part** of the score, in the usual single-line lead sense your export already uses.
- **How long the tune is** in bars also follows that **first part**, so your song length matches what you see on the lead line.

---

## Files that work best

You will get the smoothest results when:

- The **melody** is clearly on **part 1** (often named Lead, Melody, or Voice).
- **Chord symbols** can be on part 1 **or** on another part (for example a piano or comp part) — see the next section.
- The file is not missing basic layout information your program can fill in (time signature, key, and so on) when you export.

If something in the file is too complex for the current import rules, Composer OS will **skip only that piece** and tell you in a **warning**, instead of inventing music you did not write.

---

## What happens when melody and chords are in different parts

Many people write like this:

- **Part 1** — the **sung or played melody** (single line).
- **Part 2** (or another part) — **chord symbols** only, or chords plus a rhythm staff.

**Composer OS now lines those up by measure.**  
Chord symbols from the other parts are **folded into the same song** as the melody on part 1, matched **bar by bar**. Extra empty measures on a backing part do not change how long your song is — the **first part** still sets the length.

**Simple picture**

- Part 1 has melody, Part 2 has chord symbols → **you get both** in one combined lead sheet the engine can use.

---

## Raw vs enriched harmony

**Raw harmony** means: *exactly what your MusicXML says the chords are*, in order, the way you wrote them. That is what **always drives** the real harmony for generation. Think of it as “the ink on your chart.”

**Enriched harmony** means: *an optional extra layer* that can add **interpretive hints** — for example, a simple read on how “inside” or “outside” the key a chord might look. It is **never allowed to replace** your raw chords for the actual song.

- If enrichment is **not available** in your setup, Composer OS **stays on raw** and tells you plainly.
- If enrichment **runs but cannot finish cleanly**, you still keep **raw**, with a short note so you are not left guessing.

---

## Compare mode

**Compare** is for when you want **both** in one place:

- The **chord list from your file** (raw), and  
- The **optional interpretation** (when your setup has enrichment turned on).

In Song Mode results, Compare now shows a compact **Raw → Enriched → Why** breakdown (first few imported chords) with plain labels (for example, "diatonic to local major" instead of internal code terms), so you can quickly see what the interpretation layer is saying without changing your real harmony source.
You do not have to use Compare to get a good result — **Raw** is enough for normal generating.

---

## What to expect if enrichment is unavailable

Nothing bad happens to your project.

- Your **melody and chords from the file** are still imported.
- The song still **generates** using **your chords**.
- Any screen or receipt that asked for “enriched” or “compare” will simply **fall back to raw** and say so in plain language, instead of failing the whole run.

---

## Harmony display modes (Raw, Enriched, Compare)

In **Song Mode**, look for the **Harmony interpretation** selector near the LeadSheet MusicXML area. That selector chooses the mode below:

| Mode | In simple terms |
|------|------------------|
| **Raw** | Use and show **only** the chords from your MusicXML. **Default.** |
| **Enriched** | Prefer the optional interpretation **when your setup offers it**; otherwise stay on raw with a note. |
| **Compare** | Offer **both** raw chords and optional interpretation together for review or tooling. |

If your environment does **not** offer the optional enrichment layer, **Enriched** and **Compare** still behave safely — they simply **act like Raw** for the “extra” part, with a short explanation.

---

## Quick recap

1. **Import** your MusicXML (or `.mxl`).
2. **Melody and bar count** follow **part 1**.
3. **Chords** can live on **other parts** too — they are merged **by measure**.
4. **Raw chords always win** for real harmony.
5. **Optional enrichment** and **Raw / Enriched / Compare** are **extras** for when your setup and workflow support them — never a requirement to make music.

Questions about the rest of the app (folders, modes, desktop): see **[USER_GUIDE.md](USER_GUIDE.md)**.
