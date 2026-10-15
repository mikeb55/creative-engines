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

Format `hexatonic-project`, version 1. Files end in `.hexatonic.json` under `Hexatonic Projects` in the Composer OS files root. A project stores the selection, the original registry identity, the seed, the transformation, the six-bar inside/outside/return structure, the guitar and bass events, the MusicXML, and the technical diagnostics. Open returns that phrase. It does not build a new one. An existing file is left in place unless replace is requested. A path outside Hexatonic Projects is refused. Pentatonic and BHL project validators still refuse this format.

## H4C — desktop IPC

Channels `composer-os-api:hexatonic-write-musicxml`, `composer-os-api:hexatonic-open-musescore`, `composer-os-api:hexatonic-reveal`, `composer-os-api:hexatonic-project-save`, and `composer-os-api:hexatonic-project-open`. MusicXML is written under `Documents/Composer OS Exports/Hexatonic Engine` with `wx`, so an existing file is not replaced. The saved path is the path returned to the page.

Collection identification is stacked above bar 1. Bars 1, 3, and 5 still carry INSIDE, OUTSIDE, and RETURN. Bar 6 no longer carries the long attribution line. Pitches and rhythms stay the H3 phrase.
