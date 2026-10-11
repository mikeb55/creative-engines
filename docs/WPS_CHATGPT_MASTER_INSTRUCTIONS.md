# WPS V1.2 — ChatGPT project instructions

Attach this file by hand to Vol 2 — Pentatonic Engine Design, the Composer OS development project, and WWH Duo Leadsheets. Cursor does not change ChatGPT project settings.

## What WPS is

WWH Performance Synthesis V1.2 is the performance-composition workflow for While We're Here guitar and upright bass. It standardises planning, LOCK, and one refinement. It does not standardise the music.

Repository: `https://github.com/mikehickley-debug/creative-engines`  
Local: `/Users/user/Documents/DEVS/creative-engines`  
Procedure: `docs/WPS_WORKFLOW.md`  
Checker: `engines/composer-os-v2/core/wwh/wps/wpsAssess.ts`  
Specs: `engines/composer-os-v2/core/wwh/wps/specs/`

V1.1 is frozen at `engines/composer-os-v2/core/wwh/wps/baseline/v1.1/` (Impossible Metaphysics Performance Edition V1.3, 12/12). Do not describe the live checker as V1.1.

## Who writes the notes

The compositional agent writes the MusicXML guitar part. The WPS command inventories and checks. It does not generate notes, does not run `evaluateGce`, and does not run `runDcrProtocol`. Do not call a validation report a composition.

## Sequence

1. **Discover.** Read the authoritative leadsheet and A–H. Write a song-specific blueprint before the score: fingerprints, landmarks, bass identity, strongest real passages, harmonic journey, counterpoint, climax, return, duration. Do not copy another song’s form.
2. **Compose.** One complete performance score. Use A–H pitches and rhythms where they earn their place. Write connects where they do not. Keep the original bass event stream. Keep guitar feasibility in view. Do not concatenate bars. Do not repeat an eight-bar template.
3. **Refine.** One focused pass on the weakest real dimension. Check again. Stop.

A normal delivery is one initial MusicXML, at most one refined MusicXML, one short performance map, and one short evidence summary. Another pass needs a named defect or an audition note.

If a person still needs to hear it: **CANDIDATE FOR AUDITION**. If a real flaw remains: **MUSICAL REVISE**. Do not invent a PASS.

## Guidelines

- Radical WWH listening guide: about 65% melody, 20% harmony, 40% rhythm still recognisable. Not a note count. Do not change all three at once with nothing left to recognise.
- GCE: the ten categories and hard gates in `docs/GCE_FRAMEWORK_V2.md`. Evidence habits in `docs/GCE_FRAMEWORK_V3.md`. LOCK and one DCR pass in `docs/GCE_LOCK_DCR_STANDARDS.md`. MORPH method in `docs/MORPH_FRAMEWORK_V0.3.md`.
- Do not invent a numeric GCE score. Do not say `runDcrProtocol` ran unless that function ran.
- Strict LOCK means the performance bass matches the leadsheet. CBV proposals are reversible, cover at most 10% of the bars, and stay out of the score until someone accepts them. A score with a changed bass is not strict LOCK PASS.
- E means E-V3.0, not E V2.0.
- Guitar `octave-change` -1 means the written pitch sounds an octave lower (The Mirror, Orbit). Wrong Turning is 0.
- The Mirror bar 39 stores 512 on two dotted-half chord tones. The attack is 768. Read them as 768. Do not edit the original leadsheet.
- MusicXML only. No audio, MIDI, TAB, or PDF unless the user asks.
- Do not overwrite original leadsheets, A–H files, or the V1.1 snapshot.

## What the tools cannot do

Composer OS does not yet write a WPS performance score by itself. Cursor can author MusicXML when composition is requested; the `npm run wps` command will not. Analysis of a MusicXML file is not an audition. A fret-solver pass is not proof that a player approved the part. Nobody has heard a score unless a person says they heard it.

## Songs ready to compose

1. The Mirror — reflection, melodic identity, counterpoint, long form.  
2. Wrong Turning — asymmetrical phrases, unexpected direction, interrupted expectations.  
3. Orbit V2.1 — 29 bars, harmonic transformation, thematic return.

Do not compose them until asked.
