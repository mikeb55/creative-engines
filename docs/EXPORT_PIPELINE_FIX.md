# Export pipeline fix — MusicXML / Sibelius

## Problem

- Sibelius reported schema errors when importing Composer OS exports, including:
  - **Element staff is not defined in this scope**
  - **Element voice is not defined in this scope**
- Causes included misplaced `<staff>` / `<voice>` and **element ordering** that did not match the MusicXML 3.1 partwise DTD (e.g. `<voice>` after `<type>` inside `<note>`).

## Root cause

- Multiple export paths and non-canonical XML string assembly for some modes.
- Structural mismatch with the **MusicXML partwise DTD**: valid tag names in **invalid parent or sibling order** trigger “not defined in this scope” from strict validators (e.g. Sibelius).
- Harmony on single-staff parts previously emitted `<staff>` inside `<harmony>` where inappropriate.

## Solution

- **Unified** Guitar–Bass Duo (ScoreModel) export through a **canonical note serializer** (`musicXmlNoteFragment.ts`) with DTD-aligned child order inside `<note>`.
- **Correct element ordering and parenting** for rest and pitched notes (voice before type; tie between duration and voice as required).
- **Removed** inappropriate `<staff>` from harmony on single-staff guitar parts; avoided mode-specific XML hacks in favour of one structural pattern.

## Result

- Sibelius imports with **no** schema errors from this export path.
- **Schema-valid** MusicXML output for the fixed pipeline.
- Export layer for this checkpoint is **stable** from a structure/validation perspective.

## Next phase

- **Behaviour** improvements: phrasing, motif strength, interaction.
- **Not** export-related — musical generation quality only.
