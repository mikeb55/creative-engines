# Hexatonic Phase H4 — Workspace, projects, and desktop

**Date:** 2026-10-15  
**Engine:** `hexatonic-phrase-h3.0` in `engines/composer-os-v2/core/hexatonic/`  
**Definition:** `docs/HEXATONIC_PHASE_H1.md`  
**Phrases:** `docs/HEXATONIC_PHASE_H3.md`

## H4A — workspace

Route `#/hexatonic` in Composer OS. The page selects one of the 11 scalar collections or one of the 16 WPS resolution/tension pairs, a centre 0–11, an integer seed, and `M-DEG` or `M-NEAR`. Generate calls `generateHexatonicPhrase`. The page shows the collection name, pitch inventory, constituent triads, source identity, the inside/outside/return sequence, guitar and bass events, motif transformations, and technical diagnostics. Those diagnostics stay separate from the phrase preview. `artisticApproval` stays false.

The western six-note collection is labelled “Western six-note claim”. The page does not call that set Ritsu.

MusicXML export uses `composer-os-api:hexatonic-write-musicxml` when the desktop bridge is present. A browser session downloads the file. A failed desktop write does not fall back to a download. The desktop writer itself is H4C.

The pentatonic page and its 20-colour vocabulary are unchanged.

## H4B — project file

Not in the H4A commit.

## H4C — desktop IPC

Not in the H4A commit.
