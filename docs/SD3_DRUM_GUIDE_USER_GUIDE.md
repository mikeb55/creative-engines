# SD3 Drum Guide — User Guide

**Composer OS · Creative Engines · May 2026**

---

## Table of Contents

1. [What is the SD3 Drum Guide?](#1-what-is-the-sd3-drum-guide)
   - [1.1 What it does](#11-what-it-does-in-plain-english)
   - [1.2 What files it creates](#12-what-files-it-creates)
   - [1.3 Why it is useful](#13-why-it-is-useful)
2. [Getting Started](#2-getting-started)
   - [2.1 How generation works](#21-how-generation-works-it-is-automatic)
   - [2.2 Where to find your files](#22-where-to-find-your-files)
   - [2.3 Loading into Superior Drummer 3](#23-loading-into-superior-drummer-3)
3. [Working with Odd Meters in SD3](#3-working-with-odd-meters-in-sd3)
   - [3.1 Common meters](#31-common-meters)
   - [3.2 Unusual meters](#32-unusual-meters)
   - [3.3 Monster MIDI Pack 2 tip](#33-monster-midi-pack-2-tip)
   - [3.4 Edit Play Style](#34-edit-play-style)
4. [Examples by Composer Style](#4-examples-by-composer-style)
   - [4.1 Frank Zappa](#41-frank-zappa)
   - [4.2 Dave Brubeck](#42-dave-brubeck)
   - [4.3 Thelonious Monk](#43-thelonious-monk)
   - [4.4 Wayne Shorter](#44-wayne-shorter)
   - [4.5 Any composer — All 4/4](#45-any-composer--all-44)
5. [Tips and Tricks](#5-tips-and-tricks)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. What is the SD3 Drum Guide?

### 1.1 What it does in plain English

When Composer OS finishes creating your score, it quietly writes a **simple drum map** that follows your piece: where the pulse lands bar by bar, including when you use **changing time signatures**. You get a **small MIDI file** with just **kick** and **snare** hits—enough to hear the skeleton of the groove and to **search for matching grooves** inside Superior Drummer 3 without programming every hit by hand.

Think of it as a **rhythm compass**: not a full drum performance, but an honest sketch tied to your generated music.

### 1.2 What files it creates

Every time a full MusicXML export is saved, two extra files appear **in the same folder** and with the **same base name** as your score:

| File | What it is |
|------|------------|
| **Your score** | Ends in `.musicxml` — your main notation file. |
| **Drum guide MIDI** | Ends in `_drum_guide.mid` — a short MIDI file with kick and snare only. |
| **Sidecar notes** | Ends in `_drum_guide.json` — a small text file listing each bar’s meter and where kicks and snares fall (in timing units). |

You do not turn this on or off in the app: if you get a MusicXML file, you get the pair of drum-guide files too.

### 1.3 Why it is useful

- **Hear the pulse quickly** — Drop the MIDI into your project and listen to backbeat and downbeats against your harmony.
- **Find grooves in SD3** — Use the MIDI as a **Tap2Find** or **Song Track** reference so Superior Drummer can suggest patterns that **fit your meter and phrasing**.
- **Odd meters without guesswork** — When your piece uses mixed bars (for example seven-eight alternating with four-four), the guide **tracks those changes** so you are not mentally converting while you search for drums.
- **Optional deeper workflows** — The JSON sidecar is there if you like to **read bar-by-bar timing** in another tool or build your own habits around it.

---

## 2. Getting Started

### 2.1 How generation works (it is automatic)

Use Composer OS as you already do: pick your mode, songwriter, meter choices, tempo, and bar length, then generate. When the app successfully writes your **MusicXML** file to your library folder, the **drum guide MIDI** and **JSON** are written **at the same time**. There is no separate checkbox.

### 2.2 Where to find your files

Open your **Composer OS library folder** (from the app’s Outputs area or “open folder” actions after a good generation). Locate your new `.musicxml` file. Right beside it you should see:

- The same long filename with **`_drum_guide.mid`** added before `.mid`
- The same long filename with **`_drum_guide.json`** added before `.json`

If you move or rename the MusicXML file, keep the drum-guide files **next to it** under matching names so you do not lose track of which guide belongs to which score.

### 2.3 Loading into Superior Drummer 3

**a. Drag into Tap2Find**

1. Open Superior Drummer 3 inside your host.
2. Go to **Tap2Find** (the groove search that listens to MIDI rhythm).
3. **Drag** your `_drum_guide.mid` file into the Tap2Find area (or load it through the browser if your host prefers that workflow).
4. Let SD3 analyse the pattern, then browse **matching or related grooves**.

This path is ideal when you want the **library to suggest** beats that resemble your skeleton.

**b. Drag into Song Track**

1. In SD3, show the **Song Track** (the linear arrangement lane).
2. **Drag** `_drum_guide.mid` onto a Song Track lane or an instrument track that feeds SD3.
3. You now have a **visible bar-by-bar** kick and snare lane aligned to your project.

Use this when you want to **line up** fills, transitions, or edits against the same bar lengths as Composer OS.

**c. Setting the DAW meter to match**

Your drum guide follows **the meters Composer OS exported**. To avoid surprises:

- Set your host’s **global or section time signature** to match your piece **before** you line up other MIDI.
- If your piece **changes meter every bar**, use your DAW’s **time-signature track** or map changes so bar boundaries line up with the MusicXML you opened or imported.

When in doubt, **import or refer to the MusicXML** in your notation program first to confirm where each meter starts; then mirror that in the DAW.

---

## 3. Working with Odd Meters in SD3

### 3.1 Common meters

| Meter family | What you will notice |
|--------------|----------------------|
| **Five-four (5/4)** | An odd length that often feels like “long” four or “three plus two.” Your guide places kicks on structural downbeats; snare backbeats may land on different beats than in rock four-four—this is expected. |
| **Seven-eight (7/8)** | Often counted in groups (for example three-plus-two-plus-two). The guide follows **Composer OS’s bar boundaries**; listen for which beats feel strong in your score. |
| **Six-eight (6/8)** | Compound feel with two or three main pulses per bar, depending on context. Match your DAW’s six-eight so triplets and straight eighths line up. |

### 3.2 Unusual meters

| Meter family | What to expect |
|--------------|----------------|
| **Eleven-eight (11/8)** | Long, asymmetrical bars. Groove libraries may return **fewer** exact matches—plan to **slice** ideas or use Edit Play Style (below). |
| **Nine-four (9/4)** | Very long bars; fewer prefab loops fit end-to-end. Treat the guide as a **road map** and build in sections. |
| **Thirteen-sixteen (13/16)** | Short denominator with many small pulses—listen closely and align your DAW’s grid to the **exported** bar lengths. |

### 3.3 Monster MIDI Pack 2 tip for odd meters

Toontrack’s **Monster MIDI Pack 2** includes material written with **prog and fusion** phrasing in mind. When Tap2Find struggles in a strange meter, browse **Monster MIDI Pack 2** categories that emphasise **odd time** or **linear** playing, then **audition** short clips against your guide. You are often looking for a **family** of rhythm (accents and space), not a bar-for-bar copy.

### 3.4 Edit Play Style

After you drop a found groove into SD3, open **Edit Play Style** (or your version’s equivalent drum-editing view). You can:

- **Shift accents** so backbeats sit where your seven-eight or five-four phrase needs them.
- **Thin out** notes that fight your grouped counts.
- **Lengthen or shorten** ghost-note lanes so the feel matches the composite meter.

This is how many users turn a **close** library groove into a **convincing** odd-meter part.

---

## 4. Examples by Composer Style

The labels below match the **meter map** choices in Composer OS when you pick a **songwriter** and a **named meter preset**. Use **Song Mode** (or the relevant preset) with the songwriter selected, choose the meter block that appears for that artist, then generate. For **String Quartet**, pick the String Quartet mode and apply **Frank Zappa** with **Zappa Classic** when the UI offers that pairing.

### 4.1 Frank Zappa

| Example | What to choose in Composer OS | What you get |
|---------|------------------------------|--------------|
| **Zappa Classic** | Frank Zappa · meter map **Zappa Classic** | Bars alternate **seven-eight** and **four-four**—a familiar mixed feel. |
| **Black Page** | Frank Zappa · meter map **Black Page** | Bars alternate **nineteen-sixteen** and **four-four**—dense and syncopated-friendly. |
| **Toads** | Frank Zappa · meter map **Toads (5/4 + 3/4 + 4/4)** | A three-bar cycle of **five-four**, **three-four**, **four-four**. |
| **Factory** | Frank Zappa · meter map **Factory (5/4)** | Every bar **five-four**. |
| **Oh No** | Frank Zappa · meter map **Oh No (4/4 + 3/4)** | Alternating **four-four** and **three-four**. |
| **String Quartet + Zappa Classic** | String Quartet mode · Frank Zappa · **Zappa Classic** meter map | Full quartet score plus the same **seven-eight / four-four** drum sketch for SD3 alignment. |

### 4.2 Dave Brubeck

| Example | What to choose | What you get |
|---------|----------------|--------------|
| **Take Five** | Dave Brubeck · **Take Five (5/4)** | Steady **five-four** throughout. |
| **Blue Rondo** | Dave Brubeck · **Blue Rondo (9/8)** | **Nine-eight** bars (often felt as twos and threes). |
| **Unsquare Dance** | Dave Brubeck · **Unsquare Dance (7/4)** | **Seven-four** rock-like length with odd symmetry. |

### 4.3 Thelonious Monk

| Example | What to choose | What you get |
|---------|----------------|--------------|
| **Monk Interrupted** | Thelonious Monk · **Monk Interrupted (4/4 + 3/4)** | Alternating four-four and three-four. |
| **Monk Five** | Thelonious Monk · **Monk Five (5/4)** | Every bar **five-four**. |

### 4.4 Wayne Shorter

| Example | What to choose | What you get |
|---------|----------------|--------------|
| **Shorter Seven** | Wayne Shorter · **Shorter Seven (7/4)** | **Seven-four** each bar. |
| **Shorter Six** | Wayne Shorter · **Shorter Six (6/4)** | **Six-four** each bar. |
| **Three-four + Four-four** | Wayne Shorter · **Shorter (3/4 + 4/4)** | Alternating **three-four** and **four-four**. |

### 4.5 Any composer — All 4/4

Pick **any primary songwriter** you like and choose **All 4/4** in the meter map (or leave mixed meters off when the UI uses straight common time). Your drum guide becomes a **classic rock-or-jazz four-four skeleton**: downbeats and backbeats where the score’s rhythm section implies them. This is the easiest path for **Tap2Find**, since most MIDI groove libraries are recorded in four-four.

---

## 5. Tips and Tricks

**Humanising odd-meter grooves**

After you place a SD3 groove, nudge **timing** slightly off the grid on snare or ghost lanes—odd meters sound more “played” when micro-shifts follow **your** phrase accents, not a generic loop.

**Velocity**

For a natural kit balance starting point, try **kick** hits roughly in the **100–115** range and **snare** in the **90–120** range (as shown in your host’s velocity lanes). Adjust up for choruses or down for verses.

**Ghost notes**

In asymmetric meters, **light ghost snares** between main backbeats help explain the count. Paint them softly (low velocity) so they support—not fight—the kick pattern.

**Building an odd-meter groove library in SD3**

Each time Composer OS gives you a `_drum_guide.mid`, save a **favourite SD3 snapshot** or MIDI clip that paired well with it. Name clips by **meter and songwriter** (for example “7/8 Zappa Classic sketch”). Over time your **user folder** becomes a faster starting point than generic four-four packs.

**Combining with `_drum_guide.json`**

Open the JSON in any text editor. Each **bar** lists **kick** and **snare** tick positions for that bar’s length. Advanced users copy numbers into **spreadsheets**, **custom scripts**, or **practice charts** to compare how Composer OS spaced attacks across a whole form—useful for teaching or for matching **click tracks** in another app.

---

## 6. Troubleshooting

| Problem | What to try |
|---------|-------------|
| **File not found after generation** | Confirm the run **completed successfully** and produced a `.musicxml` file. Open the **same library folder** the app reported; refresh the file browser. If only the XML moved, bring the `_drum_guide` files along when you reorganise files. |
| **SD3 not recognising the meter** | Check your **DAW’s time signature track** against your score. Import or view the MusicXML to see **each bar’s meter**, then match it in the host before dragging the MIDI again. |
| **Groove search returns no results** | Odd meters yield fewer factory matches. Shorten the **Tap2Find** selection to **one or two bars**, try **Monster MIDI Pack 2**, or pick a **looser** family groove and adapt it with **Edit Play Style**. |
| **Sounds stiff or square** | Lower some snare velocities, add **ghost notes**, or shift a few hits earlier/later by **ticks** until the line breathes. |

---

*This guide describes Composer OS behaviour as of May 2026. Superior Drummer 3 and Toontrack product names belong to their respective owners.*
