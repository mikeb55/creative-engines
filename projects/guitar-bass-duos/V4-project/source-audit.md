# V4 Guitar-Bass Song Project — Source Audit

**Date:** 2025-03-15  
**Status:** AUTO-SETUP FAILED — Primary source not found

---

## 1. Rules File

**FOUND:** `.cursor-rules.md`  
**Path:** `projects/guitar-bass-duos/.cursor-rules.md`  
**Status:** Loaded and applied as global rule system

---

## 2. Primary Source Directory

**ERROR: ECM-Orbit-Album-2027 directory not found**

Searched entire workspace recursively. No directory named `ECM-Orbit-Album-2027` exists.

---

## 3. Priority Pieces — Search Results

| Piece | Status |
|-------|--------|
| Fractured Motion | NOT FOUND |
| Glass Meridian | NOT FOUND |
| NorthLight-Pivot | NOT FOUND |
| Parallel Worlds | NOT FOUND |
| Cubed Lye | NOT FOUND |

No files or directories matching these piece names exist in the workspace.

---

## 4. Available Source Material (Indexed)

The following composition-related files exist but are **not** in ECM-Orbit-Album-2027:

### V1-orbit (guitar-bass-duos)
- `Orbit_V16_LOCK.musicxml`
- `Orbit_V17_LOCK.musicxml`
- `Orbit_V18_LOCK.musicxml`
- `Orbit_V19_LOCK.musicxml`
- `Orbit_V17_LOCK.sib`
- `Orbit_V16_LOCK_report.md`
- `Orbit_V17_LOCK_report.md`
- `Orbit_V18_LOCK_report.md`
- `Orbit_V19_LOCK_report.md`
- `ORBIT 20 Jan 2026 Guitar Lead.xml`

**Piece name (from filenames):** Orbit (one piece only)

### Other .xml / .musicxml (engine outputs, fixtures)
- Various engine exports in `engines/`, `hybrid_exports/` — not album source material
- Fixture files in `engines/jimmy-wyble-engine/import/fixtures/`

---

## 5. Execution Status

**STOPPED.** Per specification:

> IF NOT FOUND [ECM-Orbit-Album-2027]: STOP execution, write error into ./V4-project/source-audit.md, exit

No music work has been performed. Cannot proceed with conversion pipeline without primary source directory.

---

## 6. Recommendations

To run the V4 pipeline:

1. Create or add the `ECM-Orbit-Album-2027` directory to the workspace
2. Place source material for the five priority pieces:
   - Fractured Motion
   - Glass Meridian
   - NorthLight-Pivot
   - Parallel Worlds
   - Cubed Lye

3. Ensure each piece has at least one of: `.musicxml`, `.sib`, lead sheet, or chord document
4. Re-run the auto-setup phase

---

**Do NOT hallucinate missing files.** This audit reports only what exists.
