/**
 * Pentatonic Engine Dev 3.3 — centre, HOME, neutral-bar continuation, field report.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev33.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { analyzePentatonicScore } from '../core/pentatonic/analyzeScore';
import { inferCentreAndHome } from '../core/pentatonic/centreIdentity';
import { pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import { importPentatonicScoreFromMusicXml, type PentatonicScoreEvent, type PentatonicScoreImport, type PentatonicSoundingAttack } from '../core/pentatonic/musicXmlScore';
import { mod12, parseNoteToken, PENTATONIC_NOTE_CHOICES } from '../core/pentatonic/pitch';

const ALBUM = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS';
const SOURCES = [
  ['07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml', '315a5f91a74145d2a3e9f5c61cc5a34a089febef82e84a6439453a15cbecf3b4'],
  ['03-The-Mirror-Duo-Leadsheet-V1.0.musicxml', '0b8f9cf0b2c0b97102878355d3b47db8a6fff60c4118dda5eb7447f6fe5d5940'],
  ['05-Orbit-Duo-Leadsheet-V2.1.musicxml', '911f07a6aa9deab3ddd5b7a97eff9bd9dc987a8f8cce5038201553a8b978b3db'],
] as const;

function event(partial: Partial<PentatonicScoreEvent> & { attacks?: PentatonicSoundingAttack[] }): PentatonicScoreEvent {
  return {
    id: partial.id ?? 'e1',
    orderIndex: partial.orderIndex ?? 0,
    sourceLabel: partial.sourceLabel ?? '1',
    chordCarried: partial.chordCarried ?? false,
    harmonyEvidence: partial.harmonyEvidence ?? [],
    soundingAttacks: partial.attacks ?? partial.soundingAttacks ?? [],
    sourceBoundary: partial.sourceBoundary ?? false,
    sourceBoundaryReasons: [],
    sectionMarks: partial.sectionMarks ?? [],
    timeBeats: 4,
    timeBeatType: 4,
    ...(partial.chordSymbol ? { chordSymbol: partial.chordSymbol } : {}),
    ...(partial.melodyNotes ? { melodyNotes: partial.melodyNotes } : {}),
    ...(partial.bassNotes ? { bassNotes: partial.bassNotes } : {}),
    ...(partial.heldNotes ? { heldNotes: partial.heldNotes } : {}),
  };
}

function score(partial: Partial<PentatonicScoreImport> & { events: PentatonicScoreEvent[] }): PentatonicScoreImport {
  return {
    title: partial.title ?? 'Untitled',
    movementTitle: partial.movementTitle ?? partial.title ?? 'Untitled',
    orderPolicy: 'written-score-order',
    parts: partial.parts ?? [],
    melodyPartId: 'g',
    bassPartId: 'b',
    events: partial.events,
    motifs: partial.motifs ?? [],
    keySignatures: partial.keySignatures ?? [],
    diagnostics: [],
    warnings: [],
    repeatDetected: false,
    endingDetected: false,
    navigationLabels: [],
    pickupLabels: [],
    pitchPolicy: 'written-equals-concert',
    timingsMs: { parse: 0, extract: 0 },
  };
}

function attack(role: 'melody' | 'bass', spelling: string, durationBeats = 1): PentatonicSoundingAttack {
  return { role, spelling, durationBeats };
}

function shiftSpelling(spelling: string, semitones: number): string {
  const parsed = parseNoteToken(spelling);
  if (!parsed) return spelling;
  return PENTATONIC_NOTE_CHOICES[mod12(parsed.pc + semitones)] ?? spelling;
}

function shiftSymbol(symbol: string, semitones: number): string {
  return symbol.replace(/^([A-Ga-g](?:bb|##|b|#|x)?)/, (root) => shiftSpelling(root, semitones));
}

function homeFixture(semitones = 0): PentatonicScoreImport {
  const notes = ['C', 'D', 'E', 'G', 'A'].map((note) => shiftSpelling(note, semitones));
  const root = shiftSymbol('Cmaj7', semitones);
  const events = Array.from({ length: 8 }, (_, index) => {
    const label = String(index + 1);
    const boundary = index === 0 || index === 4;
    return event({
      id: `b${label}`,
      orderIndex: index,
      sourceLabel: label,
      chordSymbol: root,
      harmonyEvidence: [{ symbol: root, offsetDivisions: 0, displayText: null, richerThanEncoded: false }],
      melodyNotes: notes,
      bassNotes: [shiftSpelling('C', semitones)],
      attacks: [...notes.map((note) => attack('melody', note)), attack('bass', shiftSpelling('C', semitones), 4)],
      sourceBoundary: boundary,
      sectionMarks: boundary ? [index === 0 ? 'A' : 'A′'] : [],
    });
  });
  return score({
    title: 'Fixture',
    events,
    motifs: [
      { type: 'motif', label: 'M1', sourceLabel: '1', offsetDivisions: 0 },
      { type: 'motif', label: 'M1', sourceLabel: '5', offsetDivisions: 0 },
    ],
  });
}

function symDiff(left: readonly number[] | null, right: readonly number[] | null): number[] {
  if (!left || !right) return [];
  const rightSet = new Set(right);
  const leftSet = new Set(left);
  return [...left.filter((pc) => !rightSet.has(pc)), ...right.filter((pc) => !leftSet.has(pc))];
}

export function runPentatonicDev33Tests(): { ok: boolean; name: string }[] {
  const rows: { ok: boolean; name: string }[] = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      rows.push({ ok: true, name });
      console.log(`PASS ${name}`);
    } catch (error) {
      rows.push({ ok: false, name });
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  };

  check('frozen fingerprint and source hashes stay put', () => {
    assert.equal(pentatonicFrozenConfigFingerprint(), '27bf91d1cb5995f4246d06609dbe1d54dc1f5b27cc99676f5512cf5b423c398c');
    for (const [file, sha] of SOURCES) {
      const full = `${ALBUM}/${file}`;
      const before = createHash('sha256').update(fs.readFileSync(full)).digest('hex');
      assert.equal(before, sha);
    }
  });

  check('transposition moves the centre and HOME', () => {
    const home = inferCentreAndHome(homeFixture(0));
    const shifted = inferCentreAndHome(homeFixture(2));
    assert.equal(home.centreStatus, 'CENTRE');
    assert.equal(home.homeStatus, 'HOME');
    assert.equal(home.centre?.spelling, 'C');
    assert.equal(home.home?.referenceNote, 'C');
    assert.equal(home.home?.archetypeId, 'major_pentatonic');
    assert.equal(shifted.centre?.pc, mod12((home.centre?.pc ?? 0) + 2));
    assert.equal(shifted.home?.referenceNote, 'D');
    assert.equal(shifted.home?.archetypeId, 'major_pentatonic');
    assert.deepEqual(shifted.home?.pitchClasses, home.home?.pitchClasses.map((pc) => mod12(pc + 2)));
  });

  check('title, filename argument, and part order do not move HOME', () => {
    const base = homeFixture(0);
    const renamed = inferCentreAndHome(score({ ...base, title: 'Other Title', movementTitle: 'Other Title' }));
    const reordered = inferCentreAndHome(score({
      ...base,
      parts: [
        { id: 'b', name: 'Upright Bass', instrument: 'Upright Bass', role: 'bass' },
        { id: 'g', name: 'Electric Guitar', instrument: 'Electric Guitar', role: 'melody' },
      ],
    }));
    assert.deepEqual(renamed.centre, base && inferCentreAndHome(base).centre);
    assert.deepEqual(renamed.home, inferCentreAndHome(base).home);
    assert.deepEqual(reordered.home, inferCentreAndHome(base).home);
    const xml = `<?xml version="1.0"?><score-partwise><work><work-title>One</work-title></work><part-list><score-part id="P1"><part-name>Electric Guitar</part-name></score-part><score-part id="P2"><part-name>Upright Bass</part-name></score-part></part-list><part id="P1"><measure number="1"><harmony><root><root-step>C</root-step></root><kind>major</kind></harmony><note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice></note></measure></part><part id="P2"><measure number="1"><note><pitch><step>C</step><octave>3</octave></pitch><duration>1</duration><voice>1</voice></note></measure></part></score-partwise>`;
    const a = analyzePentatonicScore(xml, { sourceFile: 'a.musicxml', profile: 'wwh-duo-1.1' });
    const b = analyzePentatonicScore(xml.replace('One', 'Two'), { sourceFile: 'b.musicxml', profile: 'wwh-duo-1.1' });
    assert.deepEqual(a.identity.centre, b.identity.centre);
    assert.deepEqual(a.identity.home, b.identity.home);
  });

  check('chord quality does not move centre or HOME', () => {
    const major = homeFixture(0);
    const minor = score({
      ...major,
      events: major.events.map((item) => ({
        ...item,
        chordSymbol: item.chordSymbol?.replace('maj7', 'm7'),
        harmonyEvidence: item.harmonyEvidence.map((harmony) => ({ ...harmony, symbol: harmony.symbol.replace('maj7', 'm7') })),
      })),
    });
    const left = inferCentreAndHome(major);
    const right = inferCentreAndHome(minor);
    assert.deepEqual(right.centre, left.centre);
    assert.deepEqual(right.home, left.home);
  });

  check('final bass can move without moving the centre', () => {
    const base = homeFixture(0);
    const perturbed = score({
      ...base,
      events: base.events.map((item, index) =>
        index === base.events.length - 1
          ? { ...item, bassNotes: ['F#'], soundingAttacks: item.soundingAttacks.map((attack) => attack.role === 'bass' ? { ...attack, spelling: 'F#' } : attack) }
          : item
      ),
    });
    const left = inferCentreAndHome(base);
    const right = inferCentreAndHome(perturbed);
    assert.equal(right.centre?.spelling, left.centre?.spelling);
    assert.ok((left.centre?.score ?? 0) >= 4);
    assert.ok((left.centre?.margin ?? 0) >= 2);
  });

  check('removing the opening chord keeps the centre when section starts carry it', () => {
    const base = homeFixture(0);
    const removed = score({
      ...base,
      events: base.events.map((item, index) =>
        index === 0 ? { ...item, chordSymbol: undefined, harmonyEvidence: [] } : item
      ),
    });
    const left = inferCentreAndHome(base);
    const right = inferCentreAndHome(removed);
    assert.equal(right.centreStatus, 'CENTRE');
    assert.equal(right.centre?.spelling, left.centre?.spelling);
    assert.ok((right.centre?.score ?? 0) >= 4);
  });

  check('centre identity is deterministic', () => {
    const once = inferCentreAndHome(homeFixture(0));
    const twice = inferCentreAndHome(homeFixture(0));
    assert.deepEqual(twice, once);
  });

  check('neutral bars do not start a switch, and fields stay pairs with evidence', () => {
    for (const [file] of SOURCES) {
      const full = `${ALBUM}/${file}`;
      const before = createHash('sha256').update(fs.readFileSync(full)).digest('hex');
      const analysis = analyzePentatonicScore(fs.readFileSync(full, 'utf8'), { profile: 'wwh-duo-1.1', sourceFile: file, sourceSha256: before });
      const after = createHash('sha256').update(fs.readFileSync(full)).digest('hex');
      assert.equal(after, before);
      const events = analysis.path.events;
      for (let index = 1; index < events.length; index += 1) {
        const decision = events[index]!;
        if (decision.changeFlag !== 'changed') continue;
        const previous = events[index - 1]!;
        const diff = symDiff(previous.canonicalPitchSet, decision.canonicalPitchSet);
        if (diff.length === 0) continue;
        const bar = analysis.score.events.find((item) => item.id === decision.eventId);
        const sounding = new Set<number>();
        for (const attack of bar?.soundingAttacks ?? []) {
          const parsed = parseNoteToken(attack.spelling);
          if (parsed && attack.durationBeats > 0) sounding.add(parsed.pc);
        }
        for (const note of bar?.heldNotes ?? []) {
          const parsed = parseNoteToken(note);
          if (parsed) sounding.add(parsed.pc);
        }
        assert.ok(diff.some((pc) => sounding.has(pc)), `${file} m.${decision.sourceLabel} switched without a distinguishing pitch`);
      }
      for (const field of analysis.fields) {
        assert.equal(field.members.length, 2);
        assert.ok(field.mobile.length >= 2);
      }
      console.log(`DIAG ${file} centre ${analysis.identity.centre?.spelling ?? 'none'} ${analysis.identity.centreStatus} home ${analysis.identity.homeStatus} ${analysis.identity.home?.referenceNote ?? '-'} ${analysis.identity.home?.archetypeId ?? '-'} fields ${analysis.fields.length} raw ${analysis.summary.collectionChanges}`);
    }
  });

  check('diagnostic hypotheses are reported and not forced', () => {
    const expected = [
      { file: SOURCES[0][0], centre: 'A', hypothesis: 'A major' },
      { file: SOURCES[2][0], centre: 'F', hypothesis: 'F minor' },
      { file: SOURCES[1][0], centre: 'C', hypothesis: 'C minor or C ambiguous' },
    ];
    for (const row of expected) {
      const identity = inferCentreAndHome(importPentatonicScoreFromMusicXml(fs.readFileSync(`${ALBUM}/${row.file}`, 'utf8')));
      assert.equal(identity.centre?.spelling, row.centre);
      const actual = identity.homeStatus === 'HOME' ? `${identity.home?.referenceNote} ${identity.home?.archetypeId}` : identity.homeStatus;
      const match = row.hypothesis === 'A major'
        ? actual === 'A major_pentatonic'
        : row.hypothesis === 'F minor'
          ? actual === 'F minor_pentatonic'
          : actual === 'C minor_pentatonic' || actual === 'HOME_AMBIGUOUS';
      console.log(`HYPOTHESIS ${row.file} expected ${row.hypothesis} actual ${actual} ${match ? 'MATCH' : 'MISMATCH'}`);
      assert.equal(typeof match, 'boolean');
    }
  });

  return rows;
}

const rows = runPentatonicDev33Tests();
if (rows.some((row) => !row.ok)) process.exit(1);
