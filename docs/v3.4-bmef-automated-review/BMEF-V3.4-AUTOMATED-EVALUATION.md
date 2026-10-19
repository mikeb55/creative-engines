# BMEF V3.4 automated evaluation

Date of run: 2026-10-18. Specification: BMEF-100 V2.0 (proposed), read from the author document. All V2.0 weights, thresholds, and confidence caps are [Proposed]. This run does not apply them and does not total a score.

Section 14 records the corrections made after this run. The findings in sections 4–12 are the readings of the files as they were at HEAD `086847991988064d25fb92fbe0de50b81fb68cab`.

This document is score analysis (evidence level E1). It is not an audition, not a performance report, and not an independent listener.

Label key:

- **VERIFIED TECHNICAL FACT** — file structure, counts, pitches, or a check the existing tools pass or fail.
- **COMPUTED MUSICAL DESCRIPTOR** — a measurement. It does not say the music is good or bad.
- **INTERPRETIVE HYPOTHESIS** — a question a person still has to hear.
- **NOT EVALUATED** — the reused tools do not answer it, or BMEF forbids an automated judgement.

No numeric U1–U6 or module rating is given. U2 and U4 stay unscored. No second model was asked to agree.

## 1. Source and input manifest

HEAD: `086847991988064d25fb92fbe0de50b81fb68cab`

Inputs are the committed files under `docs/`. Nothing was regenerated. `stress.*` in `docs/v3.4-e2-cd/` was left out. It is not one of the nine harmonic examples.

| Id | MusicXML SHA-256 | MIDI SHA-256 |
|---|---|---|
| E2 Dyad Pair Big Band | `adc5138f8615e49de28972385d46e8ef485fe7be0fa6519921b736827c171593` | `970f2b61d2b4f35cdfea3fbf3038f05da792465d5b5b253b540998ed4906057a` |
| E2 Dyad Pair String Quartet | `d3e33c68b053bc97f8a5ed9020940419654052b6c1ae847a8563a30f49c95b0a` | `2d3126d94f2ddbd49348a70cf11ab45bd4148052aea0da9bdb1b59eb9e528f08` |
| E2 Dyad Pair ECM Duo | `d94dfa36df1ff427929875373611ca7543a8a9a43e25b2f03b747ca10aa4ff87` | `d747f57bbd0d6b2c2d93fb20bfc38cce5b9cb60525c4bc4b21226f1d40e40517` |
| E2 Triad Pair Big Band | `f9f5e8d21c81368de8a48fe07e92eb4a149392c01137d46d5f65cf31d6987828` | `64290e3c8add75156fc86c1ace2273306fd35a4d84dabf0d93db62d327f7010c` |
| E2 Triad Pair String Quartet | `78bc15353eb2c360a1e05977d11ba696a62148cdc171c75e331b32923f4e12a7` | `fc9b2ff1d20777038ecdba2701d1906a36dd2b0a6a4065f7e4d95f14a8ea492b` |
| E2 Triad Pair ECM Duo | `73df370742148150e8173d5ac55d3f9a97f59387d10a2cd13a82c4aeb5e2afd9` | `31090395079bdff06d7550f7c8bbc51e6299e84b9631042e87952fc81fc5d40b` |
| E2 Polychord Big Band | `40d822d252d2461b45a582914f419cf440ebda9bdc7f6a244a3d027a1fb7af6e` | `136e2d1d54bf1b75b4b0b7122d92b6809eccc7cace8bf18b459c3b8f9a2a778d` |
| E2 Polychord String Quartet | `f70ecc51f57cad586d7c0b7d5535bcd5bae9872e226fbeac02058857919429b8` | `84cebc693cef8667149c733ca7d9ea0eed9c8dca11339452f143d6f9b308631f` |
| E2 Polychord ECM Duo | `4c04b4b310a91c2428d9c31607b06cdab8a4c96b12974c6f02bec750aba147a3` | `c7eff50f8db97e5e6ed5d51b6b2bdfe1d8d151bb5b5eb82d87f3bc89a8525aad` |
| Herrmann seed 3340 | `fd4bfa798daaef9ac9a1fd369febd13d7577dbb131898b58c5e0e1c849a6a333` | `ec3b3fb241c345d09eb265fc92aaa9c9b326c98d10c1233db170c5009c270fb9` |
| Herrmann seed 3341 | `8138ba906a02d2118d65b6122689de30aa0805dd4cebbc0669ff0b6008d0bc70` | `3c8a8f9885e759b9f752eb660b6e04c860ca31f018d1670ff8095291f1483efa` |
| Ravel seed 3340 | `bb5b6f4509e688a855899845331a9b1284a709040ab614f0356110357e452f4b` | `6f57d5089eb99ef06808b7e38e848dc024e0e5c6caa3ada2d599c088d91e9dcf` |
| Ravel seed 3341 | `6de36369b363fbdd58dc44f4ddc0833f5b01c18eedb3d1c22e3518fddff1b69e` | `a995947a79ac600f073ee958f54a22af1ae1d3cb1f926471d502b9883b8425ce` |
| Dutilleux seed 3340 | `41c9ce14168bd9727c782f4a9c3a88818de54b0a6abe338a3fddb2c8a098fbb9` | `d8c7a769254ccce639d45a8174444bc727696bae18901955f11e3f2287ab09f3` |
| Dutilleux seed 3341 | `59f794a86bc17a07575c3449e03f484a1b0f0dd3008ade4c66baeecfe5a11963` | `1286ef4b26854ca969088e35aeae889921e13f7034326cf9166e9234c50dc898` |
| Pärt Für Alina M1 | `0834d06978d7d2e2b28b3a9ece429bce5f8b574aa0e15a44500d3ed94bcb9411` | `1793a54f8e1359fb526ea32f9e2116058c996f717c8b599fe8aa6da690dd7fcd` |
| Pärt Spiegel M2 | `70ca9031dd39933f5e4a105ef3589fdb47e2183b4a4dc4f0800d7754d9cd3e86` | `73e84ed34d0b3e169916455cc138b1af0994109eefa90db74fb7404be5b0a2ad` |

Notes read, not treated as intent briefs:

- `docs/v3.4-e1-checkpoint3c/FIXTURES.txt` SHA-256 `96be8774de5e1a51037fbad185bda8deed061a6539f18188456cf759267b262f`
- `docs/v3.4-part-mt/RULE.txt` SHA-256 `bbf8f5f420f257d333cc4f5064dcd75633385c982ea0f80837649ca2342be172`

Existing MP3 and PDF files in `docs/v3.4-e2-cd/` were not opened. They are not E2 audition evidence for this run.

## 2. Reused analytical utilities

Called on each MusicXML file, with no new analysis engine:

- `ingestCanonicalScore` — parts, sounding pitches, ties, metre, directions, unsupported constructs.
- `runTechnicalChecks` — parse, measure duration, part/voice, guitar range MIDI 40–88, bass range MIDI 28–72, guitar fret-span via `assessGuitarFeasibility`, parse-twice reproducibility. Source-lock was not requested.
- `analyseHarmony` — pitch-class sets per bar, common-tone overlap, pitch-class displacement, registered intervals, contour, tessitura, opening-cell recurrence.
- `analyseRhythm` — attacks, rest share, duo overlap where a guitar part and a bass part both exist, whole-bar rests.
- `buildCoherenceReport` — `discoverMotifs`, `analyseHookEvidence`, 8-bar section contrast, `buildIndependenceReport`.
- `buildOrchestrationReport` — catalogue range, transposition match, spacing, doubling, texture labels.
- `parseMidiReference` — MIDI note-on pitches. Channel 10 was counted separately so drum hits stay out of the pitched multiset.

Not available from these tools, so **NOT EVALUATED**: Longuet-Higgins–Lee syncopation, inter-onset entropy, LBDM phrase boundaries, fret diagrams, a full articulation inventory, and any audio or player report.

The canonical reader stores tempo and expression text. It does not store `<articulations>` or note-level `dynamics` attributes. Those glyphs were spot-checked in the XML and are listed only where counted.

Four-bar windows below are an analysis grid. No rehearsal marks exist, so they are not detected phrases.

## 3. Module choice, recorded before the readings

| Group | Module | Why |
|---|---|---|
| E2 big band | O, Orchestral, adapted | Sixteen-part band writing is closer to orchestration, balance, and part-writing than to the guitar/bass duo module. "Large-scale textural architecture" and "rehearsal efficiency" do not fit a 4-bar cell. Those two dimensions stay **NOT EVALUATED**. Module O scores are not compared with module C or J. |
| E2 string quartet | C, Contemporary chamber | Through-composed quartet texture. No improvisation module. |
| E2 ECM duo | J, Chamber-jazz duo | Electric guitar and upright bass, the module J ensemble. |
| E1 Herrmann, Ravel, Dutilleux | J, Chamber-jazz duo | Same ensemble. Fixture text says the files are technical evidence. BHL and nonfunctional harmony are not judged as ii–V–I. |
| Pärt M/T | C, Contemporary chamber, adapted | Tintinnabuli is a through-composed pitch process. Module J would ask for jazz interaction and improvisational affordance, which the rule file does not claim. The sounding ensemble in `RULE.txt` is guitar and bass. The MusicXML part name is Piano plus upright bass. That contradiction is recorded in section 4. Module C is still the analytical module, because the question is the process, not a jazz duo. |

## 4. Per-example technical integrity

Shared result, **VERIFIED TECHNICAL FACT**:

- All 17 files parse as partwise MusicXML.
- Every voice duration matches the stated metre. No pickup, no additive metre, no grace notes.
- Parsing each file twice reproduces the same events. No second export was compared.
- Guitar sounding pitches that the range check saw sit inside MIDI 40–88. Bass sounding pitches sit inside MIDI 28–72. Orchestration hard-range breaches: none on parts the catalogue recognised.
- No `<direction>` dynamic was found on any file. E2 has no note-level `dynamics` attribute. E1 guitar notes carry note-level `dynamics` values. The direction reader does not summarise them.
- Articulation elements counted in E1 MusicXML: Herrmann 27 each seed, Ravel 7 each seed, Dutilleux 3 each seed. Spot checks: Herrmann bar 6 voice 2 accent; Herrmann bar 9 voice 2 staccato; Ravel bar 8 tenuto on the tie. A full articulation map was **NOT EVALUATED**.

### E2, all nine

**VERIFIED TECHNICAL FACT.** 4/4. Tempo text `quarter = 96`. MIDI tempo 96. PPQ 480.

Pitched MIDI note-ons match the MusicXML attack multiset on all nine. Big-band MIDI also has 8 channel-10 notes. The MusicXML has 8 unpitched drum events, two in each bar, which the canonical reader lists and then omits from pitch evidence. Drum pitches were not compared.

Transposing parts that actually sound use the catalogue intervals: alto sax chromatic −9, tenor sax chromatic −2 with octave-change −1, trumpet chromatic −2. Upright bass on the E2 files declares octave-change −1. The orchestration report’s “no match” rows for Guitar and Drum Set mean those names are not in the catalogue, not that a wrong interval was written.

| Example | Pitched attacks by bar | Parts with attacks | Simultaneous max | Pitch-class changes at bars |
|---|---|---|---|---|
| Dyad big band | 4, 0, 4, 0 | Tenor 1–2, Trumpet 1–2 | 4 (bar 3) | 2, 3, 4 |
| Dyad quartet | 4, 2, 0, 0 | All four strings | 4 (bar 1) | 2, 3 |
| Dyad ECM | 5, 0, 0, 0 | Guitar 4, bass 1 | 3 (bar 1) | 2 |
| Triad big band | 6, 6, 3, 0 | Alto 1 (9), Tenor 1 (6) | 1 | 3, 4 |
| Triad quartet | 6, 3, 0, 0 | Violin I 6, viola 3 | 1 | 2, 3 |
| Triad ECM | 8, 0, 1, 0 | Guitar 7, bass 2 | 2 (bar 1) | 2, 3, 4 |
| Polychord big band | 6, 3, 6, 3 | 9 parts; 7 sax/brass/piano/bass tacet the whole cell | 6 (bars 1 and 3) | 2, 3, 4 |
| Polychord quartet | 6, 0, 1, 0 | All four | 6 (bar 1) | 2, 3, 4 |
| Polychord ECM | 4, 1, 0, 0 | Guitar 4, bass 1 | 4 (bar 1) | 2, 3 |

Expression text, not a dynamic: Triad big band bar 1 `C major then D major`. Polychord big band and quartet bar 1 `D major + C major`. Polychord ECM bar 1 `C major + A minor`.

Spacing proxy, polychord big band only: bars 1 and 3, beat 0, lowest sounding interval 4 semitones, lowest pitch MIDI 48, widest inner gap 19 semitones. **COMPUTED MUSICAL DESCRIPTOR.** Not a masking verdict.

Twelve big-band chairs, and some quartet chairs, have zero pitched attacks. That is a tacet, not a range violation. Drums are not among the pitched tacets.

### E1 guitar and bass

**VERIFIED TECHNICAL FACT.** 16 bars, 4/4, `quarter = 72`, MIDI tempo 72. Parts: Clean Electric Guitar and Upright Bass. No `<transpose>` on the bass. Written pitch equals sounding pitch. The catalogue expects upright bass octave-change −1. A reader who applies the usual bass octave will sound these bass parts an octave lower than the MIDI. E2 bass files do declare that octave. This is a notation-convention warning, not a failed duration check, and not a failed MIDI identity check.

Guitar catalogue range was not attached (`Clean Electric Guitar` is not a catalogue id). The technical range gate still passed.

| Example | Guitar MIDI | Bass MIDI | Attacks | Rest share guitar / bass | Technical fails |
|---|---|---|---|---|---|
| Herrmann 3340 | 49–79 | 37–44 | 63 / 31 | 0.629 / 0.188 | Bar 6 guitar simultaneity MIDI 79 and 49 |
| Herrmann 3341 | 52–76 | 34–40 | 63 / 31 | 0.629 / 0.188 | none |
| Ravel 3340 | 54–78 | 33–50 | 43 / 40 | 0.504 / 0.125 | none |
| Ravel 3341 | 50–79 | 34–50 | 43 / 40 | 0.504 / 0.125 | none |
| Dutilleux 3340 | 57–77 | 33–50 | 43 / 35 | 0.590 / 0.156 | none |
| Dutilleux 3341 | 62–79 | 36–50 | 43 / 35 | 0.590 / 0.156 | none |

Herrmann 3340 bar 6, guitar: voice 1 G5 (dotted quarter) starts with voice 2 C♯3 (eighth, accent). The existing fret-span check fails that pair. Seed 3341 does not contain that pair and passes the same check. **VERIFIED TECHNICAL FACT.** Whether a player can split it across the phrase is E3 and was **NOT EVALUATED**.

Ravel and Dutilleux each contain one guitar tie that starts and stops inside one bar: Ravel both seeds bar 8 (3340 F♯4, 3341 D5, tenuto); Dutilleux both seeds bar 5 (3340 G4, 3341 C5). MIDI pitched note-ons are 84 and 79. MusicXML non-rest notes are 85 and 80. After dropping the tie continuation, the pitch multisets match with 0 mismatches. **VERIFIED TECHNICAL FACT.** The first automated count looked unequal only because a sounding event still flagged `tieStop` was dropped.

Attack counts by bar are the same on both seeds of a composer. Pitch-class sets are not. See section 8.

Herrmann attacks by bar: 5, 5, 6, 1, 7, 7, 5, 3, 16, 14, 11, 6, 1, 0, 5, 2. Bars 9–12 hold 47 of 94 attacks. Bar 14 has no attacks. Guitar is silent in bars 4, 13, and 14. Bass is silent only in bar 14.

Ravel attacks by bar: 6, 5, 7, 3, 7, 5, 7, 2, 5, 5, 5, 5, 6, 5, 7, 3. Guitar voice 1 is silent in bar 8 apart from the tie. Bars 9–12: bass has more attacks than guitar (role indicator `bass-more-attacks`).

Dutilleux attacks by bar: 7, 7, 5, 2, 7, 6, 4, 2, 8, 4, 4, 3, 7, 5, 5, 2. Bar 5 is the only bar tagged `bass-more-attacks` at the start of a phrase window; bars 12–13 also put more attacks in the bass.

Pitch-class entropy (attack-weighted): Herrmann 1.821 and 2.118 (6 and 8 pitch classes); Ravel 3.193 both seeds (11 pitch classes); Dutilleux 2.358 both seeds (7 pitch classes). **COMPUTED MUSICAL DESCRIPTOR.**

### Pärt

**VERIFIED TECHNICAL FACT.** 32 bars, 4/4. Für Alina tempo text and MIDI: quarter = 66. Spiegel: quarter = 72. Expression text on bar 1 of both: `Slow feel; straight 8ths` and `Key signature suppressed (user: none)`. No direction dynamics. Pitched MIDI matches MusicXML (100 and 186 notes).

Part names are `Piano` and `Upright Bass`. The piano part id is `guitar`, and the contour voice key is `guitar:1`. `RULE.txt` says guitar and upright bass. The sounding file does not. Bass has no transpose element; catalogue expects octave-change −1; MIDI matches the written sounding pitch. Same reading risk as E1.

| | Piano MIDI | Bass MIDI | Attacks | Rest share | Silent bars (zero attacks) |
|---|---|---|---|---|---|
| Für Alina M1 | 60–71, one voice | 36–52 | 48 / 52 | 0.281 / 0.406 | 3, 7, 11, 15, 19, 23, 27, 31 |
| Spiegel M2 | 60–74, voices 1 and 2 | 38–52 | 120 / 66 | 0.297 / 0.398 | same eight bars |

`RULE.txt` says every fourth bar is silence. The silent bars are the third bar of each 4-bar group, not bars 4, 8, 12…. **VERIFIED TECHNICAL FACT** against the prose. Sparsity itself is not a warning. Spiegel’s second piano voice is active on the sounding bars (57 interval steps), which matches the prose description of an upper tintinnabuli voice more closely than the part name does.

Bar 1 and bar 25 pitch-class sets: Für Alina `0,4,5` versus `1,3,4,6`; Spiegel `2,5,6` versus `2,6`. The Song Mode identity lock named in `RULE.txt` was not re-opened. Lock pass/fail is **NOT EVALUATED**.

## 5. BMEF gates

G1 — Intent brief. **Incomplete on all 17.** BMEF section 2.5 requires a paragraph, written before scoring, of purpose, affect or tension shape, and target performers. `FIXTURES.txt` and `RULE.txt` describe devices, seeds, and ensemble, and they say the files are technical evidence, not musical approval. They are not that brief. No new brief was written here to fill the gate. BMEF says no scoring when G1 fails. That rule is followed.

G2 — Feasibility. **Provisional E1. Not an E3 pass.**

- Ranges above are inside the gates that exist.
- Herrmann 3340 bar 6 fails the fret-span check. Return that simultaneity for a player. Quality scoring was not continued.
- Bass octave convention on E1 and Pärt needs a reader, not just a MIDI check.
- E2 guitar grips and quartet double stops are outside this run wherever the catalogue has no guitar id. The fret-span check saw no failing guitar chord on the E2 duo files.
- No tempo is extreme (66, 72, 96). Density at those tempi was not turned into a difficulty score.

G3 — Integrity. **Internal file consistency passes, with notation warnings.**

- Durations, parse, and pitched MIDI identity pass, including the tie-collapsed Ravel and Dutilleux multisets.
- Drum unpitched events are omitted from pitch evidence and present in MIDI. Consistent once channel 10 is separated.
- Undeclared bass octave, and the Pärt piano name versus the guitar rule, are notation ambiguities. They do not by themselves prove a wrong sounding pitch, because MIDI matches the written sounding pitch. They do block a claim that a bass player or a guitarist has been given an unambiguous part.
- No audio was checked, so Level 2 evidence was not invalidated by a render. It was never collected.

G4 — Identity preservation. **Not applicable.** Herrmann 3340 is not a revision of 3341, and the same is true for Ravel, Dutilleux, and the two Pärt postures. Same operators or the same composer language are not a source/revision pair. The complexity-inflation flag is a revision test and was not raised.

## 6. Criteria, evidence only

Confidence permitted is the E1 cap from BMEF section 6.2. Nothing was rated, so the cap is a ceiling that was not used.

### Universal core

| Criterion | What the score shows | Evidence | Confidence cap | Listening |
|---|---|---|---|---|
| U1 Identity | See the cell hits and returns below. Short E2 cells state a chord or a line and then stop. | E1 | Medium | YES before any rating. NO to re-check the listed pitch hits. |
| U2 Expressive impact | **NOT EVALUATED.** No listener descriptions, no tension curves. | — | Low, and still unscored | YES |
| U3 Coherence, form, pacing | Bar grids and silence locations are measured. Whether an ending feels earned is not. | E1 | Low | YES |
| U4 Effective originality | **NOT EVALUATED.** Technique names (dyad, triad pair, polychord, tintinnabuli, cell operators) earn nothing under section 4.7. | — | Medium, and still unscored | YES |
| U5 Economy | Counts show where material sits and where parts are empty. The subtraction test was not rendered. | E1 | Medium | YES |
| U6 Sonic realisation | Register numbers and one close-spacing proxy. No dynamics in the direction stream. Masking was not heard. | E1 | Low | YES |

### Module readings, still unscored

**J, E1 and E2 ECM.** Harmonic labels exist as MusicXML harmony on the E1 guitar staff (Herrmann Gm / dim / aug / dim7; the fixture lists the 16 symbols). Common-tone retention is a pitch-class overlap, mean about 2.0–2.3 classes on Herrmann and Ravel and about 2.1 on Dutilleux, and it is not a claim the tone is audible. Duo role flips are listed in section 4. Improvisational affordance and “under the hands” are E3. **NOT EVALUATED** as ratings. Listening YES for J3 and J4.

**C, E2 quartet and Pärt.** Pitch organisation is the bar pitch-class table. Quartet role distribution is the tacet table: triad quartet never uses violin II or cello. Pärt silence is periodic. Extended technique marks were not found in the direction stream. Notational clarity for the Pärt piano-versus-guitar name is a warning, not a rating. Listening YES for whether the tintinnabuli voices separate.

**O adapted, E2 big band.** Balance and part-writing can be described: most chairs tacet; polychord bars 1 and 3 put six pitches down at once; triad big band is two saxophones in rhythmic unison-or-near lines (alto contour `up up down up up down down down` across bars 1–3, tenor a shorter copy in bars 1–2). Large-scale architecture and rehearsal efficiency: **NOT EVALUATED**. Listening YES for the polychord stack only.

### Cell and return evidence (U1 descriptors)

Guitar voice 1, monophonic, intervals of the fixture cell. A hit is four consecutive non-chord attacks with those exact semitone steps. Chord tones are skipped, so a hit is not the whole texture.

| Piece | Cell steps | Hits | Opening sounding MIDI |
|---|---|---|---|
| Herrmann 3340 | +1 +3 +2 | bars 1, 2, 7, 15 | 67, 68, 71, 73 then the same four again in bar 2 |
| Herrmann 3341 | +1 +3 +2 | bars 1, 2, 7, 15 | 58, 59, 62, 64 |
| Ravel 3340 | +2 +2 +2 | bar 1 only | 69, 71, 73, then 75 at bar 2 |
| Ravel 3341 | +2 +2 +2 | bars 1 and 5 | 65, 67, 69 |
| Dutilleux 3340 | +2 +1 +4 | prime bar 1; inversion bars 5; retrograde bars 6 | 62, 64, 65, 69 |
| Dutilleux 3341 | +2 +1 +4 | prime bar 1; inversion bar 5; retrograde bar 6 | 67, 69, 70, 74 |

**COMPUTED MUSICAL DESCRIPTOR.** Herrmann’s fixture says the cell is stated, delayed, lifted at bars 7–8, and stated again at bar 15. The interval hits land on 1, 2, 7, and 15. Inversion and retrograde of that cell were not found on voice 1. The fixture does not claim those two operators for Herrmann.

Ravel’s fixture says bars 13–16 recall the opening rhythm at a transposed field degree. The strict four-note whole-tone cell does not return there on voice 1. Motif discovery does report transposed returns of a shorter pattern (`p1`) at bars 3, 5, 6, 9, 10, 11, and 13 on both seeds. Those returns are pattern matches, not a proof of the named operator.

Dutilleux’s fixture says bars 5–8 invert the cell and bars 9–12 reverse it. Inversion hits bar 5. The four-note retrograde hits bar 6, not bar 9. Bars 9–12 are the listening question in section 9. Fragment returns of the first two intervals show up at bars 13–15 (seed 3340 guitar) and bars 14–15 (seed 3341 guitar).

Pärt: discovery found repeated short patterns and, on Spiegel, stopped at the 64-event window. That cap is a tool limit. It is not a musical absence. Opening-cell recurrence from the harmony reader did not yield a useful Pärt motif list (two null rows on Für Alina). Beat-by-beat proof that the bass is always the nearest triad tone under the melody was **NOT EVALUATED**.

Section contrast (pitch-class Jaccard distance, then rhythmic density distance), only where the piece is longer than 8 bars:

- Herrmann 3340, bars 1–8 to 9–16: harmonic 0.33, rhythmic 0.29.
- Herrmann 3341: harmonic 0.50, rhythmic 0.29.
- Ravel both seeds: harmonic 0.18, rhythmic 0.05.
- Dutilleux both seeds: harmonic 0.43, rhythmic 0.07.
- Für Alina: 0.56 then 0.58 then 0.50 harmonic; rhythmic distance 0.08, 0, 0.08.
- Spiegel: 0.27, 0.25, 0.18 harmonic; rhythmic 0.06, 0, 0.06.

**COMPUTED MUSICAL DESCRIPTOR.** A small rhythmic distance means the attack rate barely changes. On Pärt that is consistent with a repeating phrase grid. It is not a verdict of monotony.

## 7. Style-specific observations

E2 cells are 4 bars. Eight of the nine put no pitched attack in bar 4. Big-band drums still have two unpitched events in that bar. Empty pitched time at the end of a 4-bar demonstration is not scored as a failed ending. U3 stays unscored. The polychord big-band cell is the exception: bar 4 still has piano and bass attacks (MIDI 60–74 and 48) on pitch classes 0 and 2.

Dyad big band bars 1 and 3 repeat the same four sounding pitches (MIDI 60, 65, 74, 79) after a silent pitched bar. Each line’s contour between its two notes is `repeat`. That is a two-attack echo, not a long unvaried loop. **COMPUTED MUSICAL DESCRIPTOR.** Not flagged.

Herrmann bars 9–12 are the fixture’s semitone ostinato. The attack spike is expected by that note. It is flagged for listening only as a crowding question, not as unexplained repetition. Bar 11 is where the fixture says the bass leaps a tritone. This run did not isolate that leap as its own interval row. Bass contour across the piece is mostly `repeat`, with scattered steps. **NOT EVALUATED** as a named tritone leap.

Ravel bars 9–12 match the fixture’s role switch in the attack counts: bass leads. Bar 8 is the held guitar tone (the tie). Whether the held tone stays audible is U6 and needs ears.

Dutilleux bars 5–8 match the inversion search at the start of that window. The retrograde claim does not match the bar-9 search. Nonfunctional maj7 / m(maj7) symbols are left as labels. They were not tested for ii–V–I.

Pärt silence, two-voice Spiegel texture, and low attack counts are the process described in `RULE.txt`, shifted by one bar from the sentence “every fourth bar.” Stillness is not a penalty. The piano name is a separate notation fact.

No example was scored down for missing functional cadence. Final bars: E2 mostly a pitched rest (drums aside); Herrmann bar 16 two attacks on one pitch class (7 or 10); Ravel bar 16 three attacks on three pitch classes; Dutilleux bar 16 two attacks on one pitch class (2 or 7); Pärt bar 32 is a sounding bar after the silence at bar 31. “Earned ending” is **NOT EVALUATED**.

## 8. Comparative notes

Seed pairs are not revisions. What is shared is the rhythmic skeleton.

- Herrmann 3340 and 3341: identical attacks per bar, identical rest shares, same cell-hit bars, different pitch-class sets (bar 1 `1,7,8,11` versus `2,4,10,11`) and different guitar ranges. Only 3340 fails the fret check.
- Ravel 3340 and 3341: identical attacks per bar and the same bass-lead bars 9–12. Entropy and unique pitch-class count match. Opening MIDI differs (69 versus 65).
- Dutilleux 3340 and 3341: identical attacks per bar, same inversion/retrograde hit bars, different opening MIDI (62 versus 67).

E2, same clock and length, different occupancy: dyad big band uses 4 of 16 pitched parts; triad big band uses 2; polychord big band uses 9 and is the only one with a 6-note stack. Quartets and duos are sparser still. That comparison is descriptive. Module scores are not compared across O, C, and J.

## 9. Warnings

### Hard technical failure

1. Herrmann seed 3340, bar 6, downbeat. Guitar voice 1 G5 against voice 2 C♯3. `guitar-feasibility` fail. Seed 3341 has no equivalent fail.

### Notation warnings, not duration failures

2. E1 and both Pärt scores: upright bass has no `<transpose>`, catalogue expects octave-change −1, MIDI equals written sounding pitch. Ambiguous for a conventional bass reader.
3. Both Pärt scores: printed part name Piano; rule file says guitar; part id is `guitar`.
4. Both Pärt scores: sounding silence is bars 3, 7, 11, 15, 19, 23, 27, 31. The rule sentence says every fourth bar.
5. Big-band drums: unpitched notation is unsupported as pitch evidence. Channel-10 count matches the eight unpitched events. Not a pitch mismatch.
6. No direction-level dynamics anywhere. Articulations exist on E1 and are not in the canonical event list.

### Musical-review hypotheses

7. Herrmann bars 9–12, both seeds: 16, 14, 11, then 6 attacks. The fixture calls this an accumulating semitone ostinato. Hear whether guitar voice 2 and the bass stay distinct, especially bar 11.
8. Dutilleux bars 9–12, both seeds: fixture says the cell is reversed. The four-note retrograde was found at bar 6, not here.
9. Ravel bar 8 into bars 9–12: held guitar tone, then the bass carries more attacks. Audibility of the held tone is unheard.
10. E2 polychord big band, bars 1 and 3: six simultaneous pitches, lowest interval a major third above MIDI 48. Possible low-register crowding. Unheard.
11. E2 pitched silence in bar 4 on eight of nine cells, and three silent bars after a single chord on several of them. Do not treat that as a composed rest until someone listens. One representative is enough.

Not flagged, on purpose: Pärt sparsity and periodic silence; Herrmann pedal and ostinato named in the fixture; nonfunctional and polychord labels; two identical pitches separated by a rest in the dyad big-band cell; parallel-motion percentage. The independence report produced no pair with four or more successive motion observations, so an “excessive parallel” warning would have been invented. **NOT EVALUATED.**

## 10. Listening shortlist

Five passages. The other bars are not approved. They only failed to raise a separate question.

1. **Herrmann 3340, bars 5–6.** Question: can one guitar play G5 against C♯3 at the bar 6 downbeat, and does voice 2 read as an inner accent rather than a second guitar? Answers the only hard feasibility fail.
2. **Herrmann 3340, bars 9–12.** Question: does the ostinato stay clear of the bass, or does the attack spike mask it? Seed 3341 has the same attack grid at other pitches. Hearing 3340 does not approve 3341.
3. **Dutilleux 3340, bars 9–12.** Question: is this a recognisable reverse of the bar 1 cell, as the fixture says, or a different continuation? The interval search found the retrograde at bar 6.
4. **Ravel 3340, bars 8–12.** Question: does the tied F♯4 in bar 8 remain audible once the bass takes the moving line in bars 9–12?
5. **E2 Polychord Big Band, bars 1–4, and E2 Dyad ECM, bars 1–4, as one paired glance at the same clock.** Question: does the six-note stack crowd the bass, and do the long pitched rests in the duo cell sound like designed space? One pair covers the E2 uncertainty. The other seven E2 cells are the same 4-bar frame with different occupancy, not seven further mysteries.

Optional full-piece context, still not approval: any 16-bar E1 file is about 53 seconds at quarter = 72, and either Pärt file is the whole process (Für Alina about 116 seconds at quarter = 66). A full playthrough would answer U2, which this report leaves empty. Für Alina bars 1–8 are the cheapest place to hear the piano-named upper part against the bass and the bar-3 silence, if the fifth slot is already used. That check is included as a note on excerpt 5’s method: if the E2 pair is obvious from the score, replace the ECM half with Für Alina bars 1–8 and ask whether bar 3 functions as the breath the rule placed on bar 4.

## 11. Technical acceptance versus musical uncertainty

| Claim | Status |
|---|---|
| Files are the committed HEAD bytes listed above | VERIFIED TECHNICAL FACT |
| Metres, voice durations, and pitched MIDI identity | VERIFIED TECHNICAL FACT, after tie collapse on four E1 files |
| Herrmann 3340 bar 6 playable as one guitar | NOT EVALUATED. Symbolic fret check fails. Needs a player. |
| Bass parts will be read at the sounding octave | Unresolved on E1 and Pärt. Declared on E2. |
| Pärt ensemble is guitar | Contradicted by the part name Piano. |
| Artistic quality, expressive impact, originality | NOT EVALUATED |
| Musical approval | Not granted |

## 12. Recommended release disposition

Do not accept these scores as a musical release. G1 is incomplete, so BMEF forbids a score, and U2 and U4 were left unscored on purpose. The ACCEPT / REFINE / REJECT / FORK table is for a blind comparison of a revision. It was not applied.

Keep the 17 files as technical fixtures. Do not regenerate them to “fix” the evaluation. Before any later claim that the guitar writing is playable, put Herrmann 3340 bar 6 in front of a player. Section 14 records the bass-octave check, the guitar part name, and the silence sentence.

The automated pass removes the need to re-check durations, MIDI pitch identity, big-band transposition integers, and the location of silence. It does not replace listening.

## 13. What this run did not do

No composition code was changed. No fixture byte was rewritten. No dependency was installed. No desktop build was run. No commit was made. MP3 playback was not opened, so nothing here is an audition.

## 14. Corrections after the run

Checked against the same committed notes. Pitches were not rewritten.

1. **Herrmann 3340 bar 6 is a false positive of the fret-count gate.** Voice 1 G5 (MIDI 79, dotted quarter) and voice 2 C♯3 (MIDI 49, eighth, accent) start together. On standard tuning the only frets at or under 22 are low E fret 9 or A fret 4 for C♯3, and B fret 20 or high E fret 15 for G5. The smallest fret-count span is 6, so `assessGuitarFeasibility` fails (limit 4, stretch limit 5). The physical distance from fret 9 to fret 15 on a 25.5-inch scale is about 4.4 inches, inside a normal four-fret span at the nut. The gate counts frets and ignores position. The dyad was left as written. A policy pass would raise only the inner C♯3 to C♯4. That change was not made.

2. **E1 and Pärt bass octave is not an inconsistency.** Duo upright bass is concert pitch. Herrmann bass writes G2 and the MIDI note is 43. Für Alina writes E2 and the MIDI note is 40. Neither file has `<transpose>`. MIDI program 32 (GM 33, Acoustic Bass) plays those note numbers. E2 bass is the other convention on purpose: written A3, `<octave-change>-1`, MIDI note 45 (A2), MIDI program 43 (GM 44, Contrabass). Written pitch, the transpose element, and MIDI agree inside each file. The catalogue warning aliases every “Upright Bass” name to orchestral double bass. That alias does not match the duo concert-pitch export. No transpose element was added.

3. **Pärt part name was Piano. The staff is the duo guitar part.** `arvo_part` was marked keyboard-centric, so the keys-comp pass renamed part id `guitar` to Piano and set GM program 0. The M/T writer still uses the guitar and bass parts. The rename is now skipped for `arvo_part`. The register clamp is unchanged. Both MusicXML part-lists now say Clean Electric Guitar, `strings.guitar.electric`, midi-program 28. Both MIDI files keep the same note-ons and change the track name and program from Piano/0 to Clean Electric Guitar/27. New SHA-256: Für Alina XML `9f12b65efa8ce3cc56843d8cd30db3defad6a66b91670056d636d1dae7323e1a`, MIDI `4013e353fdea2b639d4884a27f232087c7cf70ba4aad62702aa8153f45519397`; Spiegel XML `b97545b1931a998b31097a60f1da6dd4241dedef0a8f0f2fc90ff2c37a4ecdf6`, MIDI `f8a2647b1c989fab4436aa086a8d99003dc4703147ad312379bfb26d2dd5e11f`.

4. **The silence sentence was wrong. The notes were right.** `attacksForContext` returns no attacks when `bar % 4 === 3`, which is bars 3, 7, 11, 15, 19, 23, 27, and 31. `RULE.txt` now says the third bar of each four-bar phrase is silence. SHA-256 `a7f5a3e0e488c981bf0a0c73706efe1d145d36f17ec24a5fb29d0eea48db5f4b`. Spiegel’s “silent bar, then a three-note cadence” already matched bars 3 and 4.

5. **E2 bar 4 is an authored empty bar.** The nine schedules in `e2NineFixtures.ts` place the demonstration and then stop. Eight of them schedule no pitched attack in bar 4 (onset 12 or later). Polychord big band does (`piano-gap` at quarter 12, `bass-release` at quarter 14). Empty bars are whole rests so the metre is complete. This is not a dropped note. No pitches were added.
