# Jimmy Wyble Etude Generator — User Guide

## 1. What the Wyble Engine Does

The Jimmy Wyble Engine generates two-line contrapuntal guitar studies in the spirit of Jimmy Wyble's two-line improvisation method. It produces playable etude material with:

- Two independent melodic voices (upper and lower)
- Implied harmony through dyadic interaction (no block voicings)
- Guitar-specific constraints (playability, register partition, string set preference)
- Optional pedal-tone, voice-ratio, and altered-dominant techniques

Output is exported as MusicXML (two staves, treble clef) for use in Sibelius or other notation software.

---

## 2. Practice Templates

The desktop app includes a library of preset progressions for quick etude generation:

| Template | Description |
|----------|--------------|
| ii_V_I_major | Dm7 → G7 → Cmaj7 (8 bars) |
| minor_ii_V | Bm7b5 → E7alt → Am6 |
| jazz_blues | 12-bar jazz blues in F |
| minor_blues | 12-bar minor blues |
| rhythm_changes_A | Bb6 → G7 → Cm7 → F7 |
| autumn_leaves_fragment | Am7b5 → D7 → Gm |
| solar_cycle | Cm7 → F7 → Bbmaj7 |
| giant_steps_fragment | Bmaj7 → D7 → Gmaj7 → Bb7 |
| beatrice_A | Beatrice (Sam Rivers) A section |
| orbit_A | Orbit (Mike Bryant) A section |

**Selecting a template:** In the desktop app, choose "Use preset progression" and pick a template from the Progression dropdown. The generator produces 40 candidates and exports the top 3.

**Adding custom templates:** Edit `engines/jimmy-wyble-engine/templates/templateLibrary.ts` and add a new entry to `TEMPLATE_LIBRARY`. Add the template id to `TEMPLATE_ORDER` to include it in the desktop selector.

---

## 3. MusicXML Import Mode

Import chord progressions from MusicXML files. The parser extracts explicit chord symbols and bar counts, then feeds the progression into the Wyble engine.

**See Section: Acceptable MusicXML Input (V1)** below.

---

## 4. Practice Modes

- **etude** — Musical phrasing, balanced density
- **exercise** — More systematic patterning (2:1 voice ratio)
- **improvisation** — Freer output, mixed voice ratios

---

## 5. Output Locations

| Location | Contents |
|----------|----------|
| `outputs/wyble/desktop/` | Desktop app run folders (e.g. `2026-03-15_1930_run01/`) — each run exports top 3 etudes |
| `outputs/wyble/etudes/` | Batch generator exports (GCE ≥ 9) |
| `outputs/wyble/refined/` | Top 5 from auto-test run |
| `outputs/wyble/imported/` | Top 5 from MusicXML-imported progressions |

---

## 6. Desktop App Usage

1. Launch the Wyble Etude Generator (Electron app).
2. Choose **Input**: "Use preset progression" or "Import MusicXML".
3. If preset: select a template from the Progression dropdown (e.g. ii_V_I_major, beatrice_A, orbit_A).
4. If MusicXML: click "Select MusicXML file..." and choose a supported file.
5. Select **Practice mode** (etude, exercise, improvisation).
6. Click **Generate Etudes** — one click generates 40 candidates internally, scores them, and exports the top 3 to a timestamped run folder.
7. Click **Open Latest Output Folder** to open the run folder containing the exported etudes and `run_summary.md`.

---

## 7. Troubleshooting

| Issue | Solution |
|-------|----------|
| "No chord symbols found" | Ensure MusicXML has `<harmony>` elements with chord symbols. V1 does not infer harmony from notes. |
| "Unsupported time signature" | V1 requires 4/4 only. Convert or simplify your file. |
| "Repeats/coda/D.S./D.C. not supported" | Use a linear (unfolded) version of the score. |
| "Please select a MusicXML file first" | In Import MusicXML mode, click "Select MusicXML file..." before generating. |
| Few or no studies exported | The app exports the best available (top 3 by default). If fewer than 3 meet GCE ≥ 9, the best available are still exported and marked in `run_summary.md`. |

---

## Acceptable MusicXML Input (V1)

### SUPPORTED

- MusicXML with **explicit chord symbols** (`<harmony>` tags, `<root-step>`, `<kind>`, etc.)
- **Linear lead-sheet style** files (no repeats)
- **4/4 time** only
- **One harmony stream**
- Chord-symbol-driven progression extraction

### UNSUPPORTED / REJECTED

- **No chord symbols** — V1 does not infer harmony from note content
- **Repeat / coda / D.S. / D.C.** — dependent structure not supported
- **Odd meters** (3/4, 6/8, 5/4, etc.)
- **Full arrangement parsing** — focus is lead-sheet / chord chart style
- **Inferred harmony** from note content only
- **Multi-stream ambiguous harmony** files

---

## Appendix: Input Use Case Examples

### A. Songs / Standards

| Example | Input Type | Progression | Output Mode | Why Useful |
|---------|------------|-------------|-------------|------------|
| Autumn Leaves | Preset / MusicXML | Am7 D7 Gmaj7... | etude | Classic ii–V–I material |
| All the Things You Are | MusicXML | Complex cycle | etude | Long-form study |
| Stella by Starlight | MusicXML | Chromatic ii–V | etude | Altered dominant practice |

### B. User Song Progressions

| Example | Input Type | Progression | Output Mode | Why Useful |
|---------|------------|-------------|-------------|------------|
| Original ballad | MusicXML | User's chords | etude | Personal repertoire |
| Band chart reduction | MusicXML | Extracted from chart | exercise | Systematic practice |

### C. Etudes

| Example | Input Type | Progression | Output Mode | Why Useful |
|---------|------------|-------------|-------------|------------|
| ii–V–I etude | Preset | ii_v_i | etude | Core jazz vocabulary |
| Blues etude | Preset | blues_basic | etude | 12-bar form |

### D. Counterpoint Exercises

| Example | Input Type | Progression | Output Mode | Why Useful |
|---------|------------|-------------|-------------|------------|
| Two-voice exercise | Preset | Cmaj7 vamp | exercise | 2:1 ratio drilling |
| Pedal-tone study | Preset | Single chord | etude | Lower-voice anchoring |

### E. Pedal-Tone Studies

| Example | Input Type | Progression | Output Mode | Why Useful |
|---------|------------|-------------|-------------|------------|
| Root pedal | Preset | Cmaj7 | etude | Wyble pedal technique |
| Fifth pedal | MusicXML | Custom | etude | Variation on pedal |

### F. Voice-Ratio Studies

| Example | Input Type | Progression | Output Mode | Why Useful |
|---------|------------|-------------|-------------|------------|
| 2:1 ratio drill | Preset | ii_v_i | exercise | Upper 2 notes per lower 1 |
| 3:1 ratio | Preset | blues | exercise | Denser upper activity |

### G. Altered-Dominant Studies

| Example | Input Type | Progression | Output Mode | Why Useful |
|---------|------------|-------------|-------------|------------|
| G7alt study | Preset | Dm7 G7alt Cmaj7 | etude | Half-whole diminished |
| Tritone sub | MusicXML | Dm7 Db7 Cmaj7 | etude | Altered vocabulary |

### H. MusicXML Import Examples

| Example | Input Type | Progression | Output Mode | Why Useful |
|---------|------------|-------------|-------------|------------|
| Sibelius lead sheet | MusicXML | Exported chart | etude | Direct from notation |
| MuseScore chord chart | MusicXML | 4/4 with harmony | etude | Cross-tool workflow |
| Hand-edited XML | MusicXML | Custom | exercise | Full control |
