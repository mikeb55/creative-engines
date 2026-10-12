# WPS V1.3 — Tonality Vault integration

V1.3 gives the compositional agent note-level guitar candidates from the 16-volume Tonality Vault study. The WPS command still checks a finished score. It does not call these functions and it does not write a song.

Study: `docs/WPS_TONALITY_VAULT_16_VOLUME_STUDY.md`.  
Record: `engines/composer-os-v2/core/wwh/wps/wpsTonalityVaultRecord.ts`.  
Candidates: `engines/composer-os-v2/core/wwh/wps/wpsVaultHarmony.ts`.  
Checker: `engines/composer-os-v2/core/wwh/wps/wpsAssess.ts`.

`TONALITY_VAULT_DATABASE` is a different table and is not edited. The frozen V1.1 snapshot is not edited. The copyrighted manual stays in `reference-materials/tonality-vault/` and is gitignored.

## Callable functions

| Function | Input | Output |
|---|---|---|
| `wpsVaultTonality(id)` | one of 16 ids | C-root record: shell, melodic triad, primary and secondary tension, resolution triad, tension triad, primary and tension quadratonics, exceptions, PDF page refs |
| `transposeVaultTonality(row, root)` | spelled root | same relationships, letter-path transpose |
| `shellAndTriadCandidates(request)` | tonality, root, bar, optional bass pitch classes, string group, octave change | simultaneous upper triad, optional four-note under-note grip, optional shell grip |
| `resolutionTensionCandidates(request)` | same, plus optional seed | two simultaneous triads; `realizeTriadPair` when the fret window accepts the spelling, otherwise a 3–2–1 reduction |
| `liquidHarmonyCandidates(request)` | same, plus `direction: 'resolve' \| 'depart'` | two events in one bar: three-note stacks, two pitch classes held, one pitch moves |
| `reduceShellVersusTriad(request)` | same | dyad or triad on 6–5–4, 5–4–3, 4–3–2, or 3–2–1; bass pitch classes omitted when two tones remain |
| `proposeWpsVaultPassage(request)` | technique `shell-triad`, `triad-pair`, `liquid`, `reduction` | the matching set; `line` and `rest` return no events |
| `proposeMirrorBars30to33(bassPitchClass)` | bass pitch class 11 (B) | bars 30–33 only |
| `mirrorBars30to33MusicXml(candidate)` | that set | four-bar fixture XML |

A request is `{ tonalityId, root, technique, fromBar, bassPitchClasses?, stringGroup?, octaveChange?, direction?, seed? }`.

Each event has bar, onset in quarters, duration in quarters, and pitches with step, alter, written octave, sounding MIDI, string, and fret. `humanPlayability` is always `NOT VERIFIED`. `technicalFeasible` means the existing guitar feasibility check passed, the fret span is at most 4, and the attack has at least two pitches.

## Techniques

- **Shell + upper triad.** The shell is the lower harmonic set. The upper structure is the melodic triad and its inversions, including shared and omitted tones. A rootless upper structure is used when the bass pitch class is one of the triad tones and two triad tones remain.
- **Resolution / tension pairs.** The pair is the melodic triad and the manual tension triad. Attacks are simultaneous. A monophonic arpeggio is not returned as comping.
- **Liquid Harmony.** Start from a three-note fragment of the primary quadratonic. Hold two notes. Move the third between the primary tension and the triad tone it replaced. Reverse motion is `direction: 'depart'`.
- **Reduction.** Practical string groups only: 6–5–4, 5–4–3, 4–3–2, 3–2–1. Two-note fragments are allowed. The solver reports a fret path. That report is not a player’s approval.

## Blueprint

`WpsSongSpec.wpsVersion` may be `1.2` or `1.3`. Optional `guitarRoles` use `melody`, `comping`, `chord-melody`, `counterpoint`, `bass-led`, or `silence`. Optional `vaultCandidates` name a tonality, a technique, a bar span, and a provenance string. An empty list is valid. Silence cannot carry a chordal technique. The checker prints the spans and does not turn them into notes.

## Limitations

- These functions propose a passage. They do not compose a While We're Here song.
- `maj7-sharp11` has no named top-down under-note in the study, so that grip is omitted.
- Chaos collections exist only on `13b9` and `min11`. The candidate functions do not generate a chaos passage.
- Volumes 3 and 12 keep the pair-page triad when the later boilerplate disagrees. That disagreement is stored as `layerTwoAgreesWithPairPage: false`.
- `realizeTriadPair` searches a low fret window. A refusal falls back to a fretted triad on strings 3–2–1 and sets `pairEngine` to `reduction`.
- Guitar octave-change is applied as a written-octave shift. The Mirror fixture uses `-1`.
- Official GCE is not run and no numeric GCE is claimed.

## First musical fixture

`engines/composer-os-v2/core/wwh/wps/fixtures/03-the-mirror-bars-30-33-v13-candidate.musicxml`

Volume 7 maj7 on B. Shell B D# A#. Melodic triad D# minor. Primary tension G#. Bass B is not doubled. Bar 34 is absent. The Mirror Performance Edition V1.1 is not this file.
