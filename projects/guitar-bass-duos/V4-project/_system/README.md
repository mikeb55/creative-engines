# V4 Guitar-Bass System README

## What this folder is

This folder holds the canonical system rules and prompt templates for the V4 Guitar-Bass Song Project. It is the local reference for LOCK-driven guitar-bass duo refinement.

---

## Canonical system file

**Guitar-Bass-Duo-Engine-LOCK-v1.md**

Defines the LOCK refinement system: pipeline, quality thresholds, non-negotiable rules, naming conventions.

---

## Prompt template

**Guitar-Bass-Duo-Prompt-Template-v1.md**

Copy-paste-ready template for song refinement runs. Fill placeholders and execute.

---

## Usage workflow

1. Choose song
2. Identify source MusicXML
3. Copy prompt template
4. Fill placeholders (song name, paths, version, problems, targets)
5. Generate only one next version
6. Evaluate honestly
7. Stop at ≥ 9.5 or at V3

---

## Current likely song order

- Glass Meridian
- Fractured Motion
- AIR

---

## Rules to remember

- Do not rewrite from scratch
- Preserve melody
- Bass must improve first
- Use song-name version filenames: `Vn - Song Name.musicxml`
- Always state Cursor workspace in first 4 lines of prompt
