/**
 * Long-Line Practice Lab Phase 2A/2B — focused core tests.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/longLinePractice.test.ts
 */

import assert from 'node:assert/strict';
import {
  assertNoTabStaff,
  buildLongLineExportScoreForTests,
  defaultLongLineRegister,
  eventsRespectHarmonyFields,
  exportLongLinePracticeScores,
  exportLongLineScoresFromMusicXmlResult,
  extractLongLineMusicXmlContext,
  generateLongLine,
  generateLongLinesFromMusicXml,
  generateLongLinesOverHarmony,
  longLineMeterSpanQuarters,
  LONG_LINE_PROFILES,
  midisInRegister,
  type LongLineHarmonyBar,
  type LongLineProfile,
  type LongLineRequest,
} from '../core/long-line-practice';
import { validateStrictBarMath } from '../core/score-integrity/strictBarMath';
import { mod12 } from '../core/pentatonic/pitch';

let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(err);
  }
}

/** Minor pentatonic on C — known colour intervals, not a registry mutation. */
const MINOR_PENT: readonly number[] = [0, 3, 5, 7, 10];
/** Major pentatonic on C. */
const MAJOR_PENT: readonly number[] = [0, 2, 4, 7, 9];
/** Hirajoshi-like set on C. */
const HIRA: readonly number[] = [0, 2, 3, 7, 8];

/** Phase 2A golden — context-free lyrical must stay byte-stable. */
const LYRICAL_2A_SIGNATURE =
  '0@0:1.5:63|0@3.5:0.5:65|1@0:1:70|1@2:2:72|2@3:1:72|3@0:1.5:67|3@1.5:2:70|3@3.5:0.5:72';

function baseRequest(profile: LongLineProfile, overrides?: Partial<LongLineRequest>): LongLineRequest {
  return {
    pitchClasses: MINOR_PENT,
    bars: 4,
    register: { low: 60, high: 76 },
    profile,
    seed: 3340,
    beatsPerBar: 4,
    ...overrides,
  };
}

function harmonyBars(): LongLineHarmonyBar[] {
  return [
    { pitchClasses: MINOR_PENT, bassMidis: [36, 43] },
    { pitchClasses: MAJOR_PENT, bassMidis: [38] },
    { pitchClasses: HIRA, bassMidis: [40, 47, 40] },
    { pitchClasses: MINOR_PENT, bassMidis: [36] },
  ];
}

// ——— Phase 2A (existing behaviour) ———

check('determinism — same seed yields identical signature', () => {
  const a = generateLongLine(baseRequest('lyrical'));
  const b = generateLongLine(baseRequest('lyrical'));
  assert.equal(a.signature, b.signature);
  assert.deepEqual(a.events, b.events);
});

check('context-free behaviour unchanged — lyrical golden signature', () => {
  const result = generateLongLine(baseRequest('lyrical'));
  assert.equal(result.signature, LYRICAL_2A_SIGNATURE);
});

check('profile distinction — three profiles differ on fixed seed/context', () => {
  const signatures = LONG_LINE_PROFILES.map((profile) => generateLongLine(baseRequest(profile)).signature);
  assert.equal(new Set(signatures).size, 3, `expected 3 distinct signatures, got ${JSON.stringify(signatures)}`);
});

check('pitch constraint — every event pitch class is in the collection', () => {
  const allowed = new Set(MINOR_PENT.map((pc) => mod12(pc)));
  for (const profile of LONG_LINE_PROFILES) {
    const result = generateLongLine(baseRequest(profile));
    assert.ok(result.events.length > 0, `${profile} produced no events`);
    for (const event of result.events) {
      assert.ok(allowed.has(mod12(event.midi)), `${profile} out-of-collection midi ${event.midi}`);
      assert.equal(event.pitchClass, mod12(event.midi));
    }
  }
});

check('register constraint — every midi stays inside [low, high]', () => {
  const register = { low: 62, high: 74 };
  for (const profile of LONG_LINE_PROFILES) {
    const result = generateLongLine(baseRequest(profile, { register }));
    for (const event of result.events) {
      assert.ok(event.midi >= register.low && event.midi <= register.high, `${profile} midi ${event.midi} outside register`);
    }
  }
});

check('midisInRegister — empty when collection misses register', () => {
  assert.deepEqual(midisInRegister([1], { low: 60, high: 60 }), []);
  assert.ok(midisInRegister([0], { low: 60, high: 60 }).includes(60));
});

check('defaultLongLineRegister — uses shared guitar sounding range', () => {
  const reg = defaultLongLineRegister();
  assert.ok(reg.high > reg.low);
  const result = generateLongLine(baseRequest('experimental', { register: reg, bars: 2 }));
  for (const event of result.events) {
    assert.ok(event.midi >= reg.low && event.midi <= reg.high);
  }
});

check('rejects empty pitch collection', () => {
  assert.throws(() => generateLongLine(baseRequest('lyrical', { pitchClasses: [] })), /pitchClasses/);
});

// ——— Phase 2B (harmonic context) ———

check('harmonic-field compliance — each event pc sits in its bar field', () => {
  const bars = harmonyBars();
  const result = generateLongLinesOverHarmony({
    bars,
    register: { low: 60, high: 76 },
    seed: 3340,
  });
  assert.equal(result.candidates.length, 3);
  for (const candidate of result.candidates) {
    assert.ok(
      eventsRespectHarmonyFields(candidate.line.events, result.fields),
      `${candidate.profile} violated bar fields`,
    );
  }
});

check('changing fields — bar N uses field N, not a single union only', () => {
  const bars = harmonyBars();
  const result = generateLongLinesOverHarmony({
    bars,
    register: { low: 60, high: 76 },
    seed: 91001,
  });
  // Bar 1 is major pentatonic only — must never emit pc 3 or 10 (minor-only) or 8 (hira-only).
  const majorOnly = new Set(MAJOR_PENT);
  for (const candidate of result.candidates) {
    const bar1 = candidate.line.events.filter((e) => e.bar === 1);
    assert.ok(bar1.length > 0, `${candidate.profile} missing bar 1`);
    for (const event of bar1) {
      assert.ok(majorOnly.has(mod12(event.midi)), `${candidate.profile} bar1 midi ${event.midi} not in major field`);
    }
    // Bar 2 is hira — pc 8 is legal here; pc 10 is not.
    const bar2 = candidate.line.events.filter((e) => e.bar === 2);
    for (const event of bar2) {
      assert.ok(HIRA.includes(mod12(event.midi)), `${candidate.profile} bar2 midi ${event.midi} not in hira field`);
      assert.notEqual(mod12(event.midi), 10);
    }
  }
});

check('bass preservation — bassByBar equals input, source bars untouched', () => {
  const bars = harmonyBars();
  const bassSnapshot = bars.map((b) => [...(b.bassMidis ?? [])]);
  const result = generateLongLinesOverHarmony({
    bars,
    register: { low: 60, high: 76 },
    seed: 12,
  });
  for (const candidate of result.candidates) {
    assert.deepEqual(
      candidate.bassByBar.map((row) => [...row]),
      bassSnapshot,
      `${candidate.profile} bass mutated`,
    );
  }
  // Input object still holds original bass arrays.
  assert.deepEqual(
    bars.map((b) => [...(b.bassMidis ?? [])]),
    bassSnapshot,
  );
});

check('harmony adapter — three profiles distinct + deterministic', () => {
  const req = {
    bars: harmonyBars(),
    register: { low: 60, high: 76 },
    seed: 77241,
  };
  const a = generateLongLinesOverHarmony(req);
  const b = generateLongLinesOverHarmony(req);
  const sigs = a.candidates.map((c) => c.line.signature);
  assert.equal(new Set(sigs).size, 3);
  assert.deepEqual(
    a.candidates.map((c) => c.line.signature),
    b.candidates.map((c) => c.line.signature),
  );
});

// ——— Phase 2C (MusicXML intake) ———

const DUO_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <sound tempo="96"/>
      <harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <harmony><root><root-step>F</root-step></root><kind>major</kind></harmony>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="3">
      <harmony><root><root-step>G</root-step></root><kind>dominant</kind></harmony>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="4">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>F</sign><line>4</line></clef></attributes>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>1</duration><voice>1</voice></note>
      <note><pitch><step>C</step><octave>2</octave></pitch><duration>3</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <note><pitch><step>F</step><octave>2</octave></pitch><duration>2</duration><voice>1</voice></note>
      <note><pitch><step>A</step><octave>2</octave></pitch><duration>2</duration><voice>1</voice></note>
    </measure>
    <measure number="3">
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="4">
      <note><pitch><step>C</step><octave>2</octave></pitch><duration>1</duration><voice>1</voice></note>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>1</duration><voice>1</voice></note>
      <note><pitch><step>C</step><octave>2</octave></pitch><duration>2</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

const MISSING_HARMONY_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Guitar</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

check('MusicXML bar selection — range 2–3 keeps source bar numbers', () => {
  const ctx = extractLongLineMusicXmlContext(DUO_XML, { startBar: 2, endBar: 3 });
  assert.equal(ctx.bars.length, 2);
  assert.deepEqual(
    ctx.bars.map((b) => b.sourceBar),
    [2, 3],
  );
  assert.deepEqual(
    ctx.bars.map((b) => b.printedBar),
    ['2', '3'],
  );
  assert.equal(ctx.range.startBar, 2);
  assert.equal(ctx.range.endBar, 3);
});

check('MusicXML harmony extraction — explicit + carried fields', () => {
  const ctx = extractLongLineMusicXmlContext(DUO_XML, { startBar: 1, endBar: 4 });
  assert.equal(ctx.canGenerate, true);
  assert.equal(ctx.bars[0]!.harmonyStatus, 'explicit');
  assert.deepEqual(ctx.bars[0]!.pitchClasses, [0, 4, 7]); // C major
  assert.equal(ctx.bars[1]!.harmonyStatus, 'explicit');
  assert.deepEqual(ctx.bars[1]!.pitchClasses, [0, 5, 9]); // F major pcs sorted
  assert.equal(ctx.bars[2]!.harmonyStatus, 'explicit');
  assert.deepEqual(ctx.bars[2]!.pitchClasses, [2, 5, 7, 11]); // G7 sorted
  // Bar 4 has no mark — carries G7
  assert.equal(ctx.bars[3]!.harmonyStatus, 'carried');
  assert.deepEqual(ctx.bars[3]!.pitchClasses, ctx.bars[2]!.pitchClasses);
});

check('MusicXML bass preservation — bass midis match source notes', () => {
  const ctx = extractLongLineMusicXmlContext(DUO_XML, { startBar: 1, endBar: 4 });
  // Document order (not pitch-sorted): G2→C2; F2→A2; G2; C2→G2→C2
  assert.deepEqual([...ctx.bars[0]!.bassMidis], [43, 36]);
  assert.deepEqual([...ctx.bars[1]!.bassMidis], [41, 45]);
  assert.deepEqual([...ctx.bars[2]!.bassMidis], [43]);
  assert.deepEqual([...ctx.bars[3]!.bassMidis], [36, 43, 36]);
  const gen = generateLongLinesFromMusicXml({
    xml: DUO_XML,
    range: { startBar: 1, endBar: 4 },
    register: { low: 60, high: 76 },
    seed: 42,
  });
  assert.ok(gen.harmony);
  for (const candidate of gen.harmony!.candidates) {
    assert.deepEqual(
      candidate.bassByBar.map((row) => [...row]),
      [
        [43, 36],
        [41, 45],
        [43],
        [36, 43, 36],
      ],
    );
  }
});

check('MusicXML bass timing — exact onset/duration/order extracted', () => {
  const ctx = extractLongLineMusicXmlContext(DUO_XML, { startBar: 1, endBar: 4 });
  assert.deepEqual(ctx.bars[0]!.bassEvents, [
    { startBeat: 0, duration: 1, midi: 43 },
    { startBeat: 1, duration: 3, midi: 36 },
  ]);
  assert.deepEqual(ctx.bars[1]!.bassEvents, [
    { startBeat: 0, duration: 2, midi: 41 },
    { startBeat: 2, duration: 2, midi: 45 },
  ]);
  assert.deepEqual(ctx.bars[3]!.bassEvents, [
    { startBeat: 0, duration: 1, midi: 36 },
    { startBeat: 1, duration: 1, midi: 43 },
    { startBeat: 2, duration: 2, midi: 36 },
  ]);
});

check('MusicXML missing harmony — canGenerate false, no invented fields', () => {
  const ctx = extractLongLineMusicXmlContext(MISSING_HARMONY_XML, { startBar: 1, endBar: 2 });
  assert.equal(ctx.canGenerate, false);
  assert.ok(ctx.bars.every((b) => b.pitchClasses === null));
  assert.ok(ctx.bars.every((b) => b.harmonyStatus === 'missing'));
  assert.ok(ctx.issues.some((i) => /missing harmony/i.test(i)));
  const gen = generateLongLinesFromMusicXml({
    xml: MISSING_HARMONY_XML,
    range: { startBar: 1, endBar: 2 },
    register: { low: 60, high: 76 },
    seed: 1,
  });
  assert.equal(gen.harmony, null);
});

check('MusicXML generate — lines respect extracted fields', () => {
  const gen = generateLongLinesFromMusicXml({
    xml: DUO_XML,
    range: { startBar: 1, endBar: 3 },
    register: { low: 60, high: 76 },
    seed: 99,
  });
  assert.ok(gen.harmony);
  assert.equal(gen.harmony!.candidates.length, 3);
  assert.ok(eventsRespectHarmonyFields(gen.harmony!.candidates[0]!.line.events, gen.harmony!.fields));
});

check('MusicXML verified tempo extracted from source', () => {
  const ctx = extractLongLineMusicXmlContext(DUO_XML, { startBar: 1, endBar: 4 });
  assert.equal(ctx.tempoBpm, 96);
});

// ——— Phase 2D (MusicXML export) ———

function readPartNoteMidis(xml: string, partId: string): number[] {
  const partMatch = xml.match(new RegExp(`<part id="${partId}"[\\s\\S]*?</part>`));
  assert.ok(partMatch, `missing part ${partId}`);
  const midis: number[] = [];
  const noteRe = /<note>([\s\S]*?)<\/note>/g;
  let note: RegExpExecArray | null;
  while ((note = noteRe.exec(partMatch[0]!))) {
    const body = note[1]!;
    if (/<rest\/>/.test(body) || /<rest[\s>]/.test(body)) continue;
    const step = body.match(/<step>([A-G])<\/step>/)?.[1];
    const octave = Number(body.match(/<octave>(\d+)<\/octave>/)?.[1]);
    const alter = Number(body.match(/<alter>(-?\d+)<\/alter>/)?.[1] ?? '0');
    if (!step || !Number.isFinite(octave)) continue;
    const natural: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    midis.push((octave + 1) * 12 + (natural[step] ?? 0) + alter);
  }
  return midis;
}

check('export validity — schema, no TAB, tempo + source words present', () => {
  const gen = generateLongLinesFromMusicXml({
    xml: DUO_XML,
    range: { startBar: 1, endBar: 4 },
    register: { low: 60, high: 76 },
    seed: 42,
  });
  assert.ok(gen.harmony);
  const scores = exportLongLineScoresFromMusicXmlResult(gen);
  assert.equal(scores.length, 3);
  for (const score of scores) {
    assert.match(score.xml, /<score-partwise/);
    assertNoTabStaff(score.xml);
    assert.match(score.xml, /tempo="96"/);
    assert.match(score.xml, /source bar/);
    assert.match(score.xml, /<part id="guitar"/);
    assert.match(score.xml, /<part id="bass"/);
    // Available chords from source (C / F / G7) — not invented N.C.
    assert.match(score.xml, /<harmony/);
    assert.doesNotMatch(score.xml, /N\.C\./);
  }
});

check('export — three distinct profile scores', () => {
  const gen = generateLongLinesFromMusicXml({
    xml: DUO_XML,
    range: { startBar: 1, endBar: 4 },
    register: { low: 60, high: 76 },
    seed: 42,
  });
  const scores = exportLongLineScoresFromMusicXmlResult(gen!);
  const profiles = scores.map((s) => s.profile);
  assert.deepEqual(profiles, ['lyrical', 'intervallic', 'experimental']);
  const xmls = scores.map((s) => s.xml);
  assert.equal(new Set(xmls).size, 3);
  const guitarSets = scores.map((s) => readPartNoteMidis(s.xml, 'guitar').join(','));
  assert.equal(new Set(guitarSets).size, 3);
});

check('export bass preservation — bass midis match source', () => {
  const gen = generateLongLinesFromMusicXml({
    xml: DUO_XML,
    range: { startBar: 1, endBar: 4 },
    register: { low: 60, high: 76 },
    seed: 7,
  });
  const scores = exportLongLineScoresFromMusicXmlResult(gen!);
  for (const score of scores) {
    assert.deepEqual(readPartNoteMidis(score.xml, 'bass'), [43, 36, 41, 45, 43, 36, 43, 36]);
  }
});

check('export bass timing — score model keeps source onset/duration/order', () => {
  const gen = generateLongLinesFromMusicXml({
    xml: DUO_XML,
    range: { startBar: 1, endBar: 4 },
    register: { low: 60, high: 76 },
    seed: 7,
  });
  assert.ok(gen.harmony);
  const barMeta = gen.context.bars.map((b) => ({
    sourceBar: b.sourceBar,
    printedBar: b.printedBar,
    chordSymbol: b.chordSymbol,
  }));
  const score = buildLongLineExportScoreForTests(
    { harmony: gen.harmony!, barMeta, tempoBpm: 96 },
    'lyrical',
  );
  const bass = score.parts.find((p) => p.id === 'bass');
  assert.ok(bass);
  const notesOf = (measureIndex: number) =>
    bass!.measures[measureIndex]!.events
      .filter((e) => e.kind === 'note')
      .map((e) => ({
        startBeat: e.startBeat,
        duration: e.duration,
        midi: (e as { pitch: number }).pitch,
      }));
  assert.deepEqual(notesOf(0), [
    { startBeat: 0, duration: 1, midi: 43 },
    { startBeat: 1, duration: 3, midi: 36 },
  ]);
  assert.deepEqual(notesOf(1), [
    { startBeat: 0, duration: 2, midi: 41 },
    { startBeat: 2, duration: 2, midi: 45 },
  ]);
  assert.deepEqual(notesOf(3), [
    { startBeat: 0, duration: 1, midi: 36 },
    { startBeat: 1, duration: 1, midi: 43 },
    { startBeat: 2, duration: 2, midi: 36 },
  ]);
});

check('export bass — midis-only path does not invent timing', () => {
  const harmony = generateLongLinesOverHarmony({
    bars: [{ pitchClasses: [0, 4, 7], bassMidis: [43, 36] }],
    register: { low: 60, high: 76 },
    seed: 5,
  });
  assert.deepEqual([...harmony.candidates[0]!.bassByBar[0]!], [43, 36]);
  assert.deepEqual([...harmony.candidates[0]!.bassEventsByBar[0]!], []);
  const score = buildLongLineExportScoreForTests({ harmony, tempoBpm: 96 }, 'lyrical');
  const bassNotes = score.parts
    .find((p) => p.id === 'bass')!
    .measures[0]!.events.filter((e) => e.kind === 'note');
  assert.equal(bassNotes.length, 0);
  assert.ok(score.parts.find((p) => p.id === 'bass')!.measures[0]!.events.some((e) => e.kind === 'rest'));
});

check('export metre integrity — strict bar math on score model', () => {
  const gen = generateLongLinesFromMusicXml({
    xml: DUO_XML,
    range: { startBar: 1, endBar: 4 },
    register: { low: 60, high: 76 },
    seed: 11,
  });
  assert.ok(gen.harmony);
  const barMeta = gen.context.bars.map((b) => ({
    sourceBar: b.sourceBar,
    printedBar: b.printedBar,
    chordSymbol: b.chordSymbol,
  }));
  for (const profile of LONG_LINE_PROFILES) {
    const score = buildLongLineExportScoreForTests(
      { harmony: gen.harmony!, barMeta, tempoBpm: 96 },
      profile,
    );
    const math = validateStrictBarMath(score);
    assert.equal(math.valid, true, `${profile}: ${math.errors.join('; ')}`);
    assert.equal(score.timeSignature?.beats, 4);
    assert.equal(score.timeSignature?.beatType, 4);
    for (const part of score.parts) {
      for (const measure of part.measures) {
        assert.equal(measure.measureBeatSpanQuarters, 4);
      }
    }
  }
});

check('export refuses invented tempo when source has none', () => {
  const ctx = extractLongLineMusicXmlContext(MISSING_HARMONY_XML, { startBar: 1, endBar: 1 });
  assert.equal(ctx.tempoBpm, null);
  const harmony = generateLongLinesOverHarmony({
    bars: [{ pitchClasses: [0, 4, 7], bassMidis: [36] }],
    register: { low: 60, high: 76 },
    seed: 3,
  });
  assert.throws(
    () =>
      exportLongLineScoresFromMusicXmlResult({
        context: { ...ctx, canGenerate: true, bars: ctx.bars },
        harmony,
      }),
    /verified tempo/,
  );
  assert.throws(() => exportLongLinePracticeScores({ harmony, tempoBpm: 0 }), /verified/);
});

// ——— Phase 2D Fix 2 (mixed metres) ———

const MIXED_METRE_XML = `<?xml version="1.0"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <sound tempo="88"/>
      <harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <attributes><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
      <harmony><root><root-step>F</root-step></root><kind>major</kind></harmony>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>6</duration><voice>1</voice></note>
    </measure>
    <measure number="3">
      <attributes><time><beats>5</beats><beat-type>4</beat-type></time></attributes>
      <harmony><root><root-step>G</root-step></root><kind>dominant</kind></harmony>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>10</duration><voice>1</voice></note>
    </measure>
    <measure number="4">
      <attributes><time><beats>6</beats><beat-type>8</beat-type></time></attributes>
      <harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>6</duration><voice>1</voice></note>
    </measure>
    <measure number="5">
      <attributes><time><beats>12</beats><beat-type>8</beat-type></time></attributes>
      <harmony><root><root-step>A</root-step></root><kind>minor</kind></harmony>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>12</duration><voice>1</voice></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>F</sign><line>4</line></clef></attributes>
      <note><pitch><step>C</step><octave>2</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <attributes><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>F</step><octave>2</octave></pitch><duration>2</duration><voice>1</voice></note>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="3">
      <attributes><time><beats>5</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><pitch><step>D</step><octave>3</octave></pitch><duration>6</duration><voice>1</voice></note>
    </measure>
    <measure number="4">
      <attributes><time><beats>6</beats><beat-type>8</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>2</octave></pitch><duration>3</duration><voice>1</voice></note>
      <note><pitch><step>G</step><octave>2</octave></pitch><duration>3</duration><voice>1</voice></note>
    </measure>
    <measure number="5">
      <attributes><time><beats>12</beats><beat-type>8</beat-type></time></attributes>
      <note><pitch><step>A</step><octave>1</octave></pitch><duration>6</duration><voice>1</voice></note>
      <note><pitch><step>E</step><octave>2</octave></pitch><duration>6</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

check('mixed metres — extract 4/4, 3/4, 5/4, 6/8, 12/8', () => {
  const ctx = extractLongLineMusicXmlContext(MIXED_METRE_XML, { startBar: 1, endBar: 5 });
  assert.deepEqual(
    ctx.bars.map((b) => b.meter),
    [
      { beats: 4, beatType: 4 },
      { beats: 3, beatType: 4 },
      { beats: 5, beatType: 4 },
      { beats: 6, beatType: 8 },
      { beats: 12, beatType: 8 },
    ],
  );
  assert.deepEqual(
    ctx.bars.map((b) => (b.meter ? longLineMeterSpanQuarters(b.meter) : null)),
    [4, 3, 5, 3, 6],
  );
});

check('mixed metres — generation fits each bar span; bass timing kept', () => {
  const gen = generateLongLinesFromMusicXml({
    xml: MIXED_METRE_XML,
    range: { startBar: 1, endBar: 5 },
    register: { low: 60, high: 76 },
    seed: 55,
  });
  assert.ok(gen.harmony);
  assert.deepEqual(
    gen.harmony!.metersByBar.map((m) => (m ? `${m.beats}/${m.beatType}` : null)),
    ['4/4', '3/4', '5/4', '6/8', '12/8'],
  );
  const spans = [4, 3, 5, 3, 6];
  for (const candidate of gen.harmony!.candidates) {
    for (let bar = 0; bar < 5; bar += 1) {
      const span = spans[bar]!;
      for (const event of candidate.line.events.filter((e) => e.bar === bar)) {
        assert.ok(event.startBeat + event.duration <= span + 1e-6, `${candidate.profile} bar ${bar} overflow`);
      }
      const bass = candidate.bassEventsByBar[bar]!;
      assert.ok(bass.length >= 1, `${candidate.profile} bar ${bar} missing timed bass`);
      for (const event of bass) {
        assert.ok(event.startBeat + event.duration <= span + 1e-6);
      }
    }
  }
  // Exact bass rhythm bar 1 (4/4): C2 half + G2 half at divisions=2 → 2 + 2 quarters
  assert.deepEqual(gen.harmony!.candidates[0]!.bassEventsByBar[0], [
    { startBeat: 0, duration: 2, midi: 36 },
    { startBeat: 2, duration: 2, midi: 43 },
  ]);
  // Bar 4 (6/8): two dotted-quarter attacks = 1.5 + 1.5
  assert.deepEqual(gen.harmony!.candidates[0]!.bassEventsByBar[3], [
    { startBeat: 0, duration: 1.5, midi: 36 },
    { startBeat: 1.5, duration: 1.5, midi: 43 },
  ]);
});

check('mixed metres — export barMeterMap + measure spans', () => {
  const gen = generateLongLinesFromMusicXml({
    xml: MIXED_METRE_XML,
    range: { startBar: 1, endBar: 5 },
    register: { low: 60, high: 76 },
    seed: 55,
  });
  assert.ok(gen.harmony);
  const score = buildLongLineExportScoreForTests(
    {
      harmony: gen.harmony!,
      tempoBpm: 88,
      barMeta: gen.context.bars.map((b) => ({
        sourceBar: b.sourceBar,
        printedBar: b.printedBar,
        chordSymbol: b.chordSymbol,
        meter: b.meter,
      })),
    },
    'lyrical',
  );
  const math = validateStrictBarMath(score);
  assert.equal(math.valid, true, math.errors.join('; '));
  assert.deepEqual(score.barMeterMap, {
    1: { numerator: 4, denominator: 4 },
    2: { numerator: 3, denominator: 4 },
    3: { numerator: 5, denominator: 4 },
    4: { numerator: 6, denominator: 8 },
    5: { numerator: 12, denominator: 8 },
  });
  const spans = [4, 3, 5, 3, 6];
  for (const part of score.parts) {
    part.measures.forEach((measure, index) => {
      assert.equal(measure.measureBeatSpanQuarters, spans[index], `${part.id} m${index + 1}`);
    });
  }
  // Bass notes keep Fix-1 timing in mixed metres
  const bassNotes = score.parts
    .find((p) => p.id === 'bass')!
    .measures[0]!.events.filter((e) => e.kind === 'note')
    .map((e) => ({
      startBeat: e.startBeat,
      duration: e.duration,
      midi: (e as { pitch: number }).pitch,
    }));
  assert.deepEqual(bassNotes, [
    { startBeat: 0, duration: 2, midi: 36 },
    { startBeat: 2, duration: 2, midi: 43 },
  ]);
  const exported = exportLongLineScoresFromMusicXmlResult(gen);
  assert.equal(exported.length, 3);
  // Changing metres appear in MusicXML
  assert.match(exported[0]!.xml, /<beats>3<\/beats>/);
  assert.match(exported[0]!.xml, /<beats>5<\/beats>/);
  assert.match(exported[0]!.xml, /<beats>6<\/beats>/);
  assert.match(exported[0]!.xml, /<beat-type>8<\/beat-type>/);
});

check('context-free generation still defaults to 4/4 span', () => {
  const a = generateLongLine({
    pitchClasses: [0, 3, 5, 7, 10],
    bars: 4,
    register: { low: 60, high: 76 },
    profile: 'lyrical',
    seed: 3340,
    beatsPerBar: 4,
  });
  assert.equal(
    a.signature,
    '0@0:1.5:63|0@3.5:0.5:65|1@0:1:70|1@2:2:72|2@3:1:72|3@0:1.5:67|3@1.5:2:70|3@3.5:0.5:72',
  );
});

// ——— BMEF Correction 1 (profile differentiation) ———

function consecutiveRepeatRate(midis: readonly number[]): number {
  if (midis.length < 2) return 0;
  let repeats = 0;
  for (let i = 1; i < midis.length; i += 1) {
    if (midis[i] === midis[i - 1]) repeats += 1;
  }
  return repeats / (midis.length - 1);
}

function maxAbsLeap(midis: readonly number[]): number {
  let max = 0;
  for (let i = 1; i < midis.length; i += 1) {
    max = Math.max(max, Math.abs(midis[i]! - midis[i - 1]!));
  }
  return max;
}

function directionChanges(midis: readonly number[]): number {
  let changes = 0;
  let prevSign = 0;
  for (let i = 1; i < midis.length; i += 1) {
    const d = midis[i]! - midis[i - 1]!;
    const sign = d === 0 ? 0 : d > 0 ? 1 : -1;
    if (sign !== 0 && prevSign !== 0 && sign !== prevSign) changes += 1;
    if (sign !== 0) prevSign = sign;
  }
  return changes;
}

/** Same signed leap of ≥3 semitones appearing ≥ twice in a row = developing sequence cell. */
function hasDevelopingLeapSequence(midis: readonly number[]): boolean {
  let run = 0;
  let prevLeap: number | null = null;
  for (let i = 1; i < midis.length; i += 1) {
    const leap = midis[i]! - midis[i - 1]!;
    if (Math.abs(leap) >= 3 && leap === prevLeap) {
      run += 1;
      if (run >= 1) return true; // two identical leaps in a row
    } else {
      run = 0;
    }
    prevLeap = leap;
  }
  return false;
}

check('BMEF1 — lyrical stays sparse and golden-stable', () => {
  const lyrical = generateLongLine(baseRequest('lyrical', { bars: 16, seed: 77241 }));
  assert.equal(generateLongLine(baseRequest('lyrical')).signature, LYRICAL_2A_SIGNATURE);
  assert.ok(lyrical.events.length < 50, `lyrical too dense: ${lyrical.events.length}`);
  assert.ok(consecutiveRepeatRate(lyrical.events.map((e) => e.midi)) <= 0.35);
});

check('BMEF1 — intervallic: low repeats, wide leaps, developing sequences', () => {
  const result = generateLongLine(
    baseRequest('intervallic', { bars: 40, seed: 77241, register: { low: 52, high: 76 } }),
  );
  const midis = result.events.map((e) => e.midi);
  assert.ok(midis.length >= 40, `intervallic too sparse: ${midis.length}`);
  assert.ok(
    consecutiveRepeatRate(midis) < 0.12,
    `intervallic repeat rate ${consecutiveRepeatRate(midis)}`,
  );
  assert.ok(maxAbsLeap(midis) >= 7, `intervallic max leap ${maxAbsLeap(midis)}`);
  assert.ok(hasDevelopingLeapSequence(midis), 'intervallic missing developing leap sequence');
});

check('BMEF1 — experimental: more angular and varied than intervallic', () => {
  const intervallic = generateLongLine(
    baseRequest('intervallic', { bars: 40, seed: 77241, register: { low: 52, high: 76 } }),
  );
  const experimental = generateLongLine(
    baseRequest('experimental', { bars: 40, seed: 77241, register: { low: 52, high: 76 } }),
  );
  const iMidis = intervallic.events.map((e) => e.midi);
  const eMidis = experimental.events.map((e) => e.midi);
  assert.ok(consecutiveRepeatRate(eMidis) < 0.1, `experimental repeats ${consecutiveRepeatRate(eMidis)}`);
  assert.ok(maxAbsLeap(eMidis) >= maxAbsLeap(iMidis), 'experimental should leap at least as wide');
  assert.ok(maxAbsLeap(eMidis) >= 8, `experimental max leap ${maxAbsLeap(eMidis)}`);
  assert.ok(
    directionChanges(eMidis) > directionChanges(iMidis),
    `experimental contour changes ${directionChanges(eMidis)} vs intervallic ${directionChanges(iMidis)}`,
  );
  assert.ok(new Set(eMidis).size > new Set(iMidis).size * 0.85, 'experimental pitch variety weak');
});

check('BMEF1 — profile contour determinism', () => {
  for (const profile of LONG_LINE_PROFILES) {
    const a = generateLongLine(baseRequest(profile, { bars: 24, seed: 99 }));
    const b = generateLongLine(baseRequest(profile, { bars: 24, seed: 99 }));
    assert.equal(a.signature, b.signature, `${profile} nondeterministic`);
  }
});

check('BMEF1 — harmony locks preserved under new contour', () => {
  const bars: LongLineHarmonyBar[] = Array.from({ length: 16 }, (_, i) => ({
    pitchClasses: i % 2 === 0 ? MINOR_PENT : MAJOR_PENT,
    bassMidis: [36 + (i % 5)],
  }));
  const result = generateLongLinesOverHarmony({
    bars,
    register: { low: 52, high: 76 },
    seed: 77241,
  });
  assert.equal(result.candidates.length, 3);
  for (const candidate of result.candidates) {
    assert.ok(
      eventsRespectHarmonyFields(candidate.line.events, result.fields),
      `${candidate.profile} violated bar fields`,
    );
    assert.deepEqual(
      candidate.bassByBar.map((row) => [...row]),
      bars.map((b) => [...(b.bassMidis ?? [])]),
      `${candidate.profile} bass mutated`,
    );
  }
  const byProfile = Object.fromEntries(result.candidates.map((c) => [c.profile, c.line]));
  const lyricalNotes = byProfile.lyrical!.events.length;
  const intervallicNotes = byProfile.intervallic!.events.length;
  const experimentalNotes = byProfile.experimental!.events.length;
  assert.ok(lyricalNotes < intervallicNotes, 'lyrical should stay sparser than intervallic');
  assert.ok(
    consecutiveRepeatRate(byProfile.intervallic!.events.map((e) => e.midi)) < 0.15,
    'harmony intervallic repeats',
  );
  assert.ok(
    consecutiveRepeatRate(byProfile.experimental!.events.map((e) => e.midi)) < 0.12,
    'harmony experimental repeats',
  );
  assert.ok(experimentalNotes >= intervallicNotes * 0.8);
});

if (failed > 0) {
  console.error(`\nlongLinePractice: ${failed} FAIL`);
  process.exit(1);
}
console.log('\nlongLinePractice: PASS');
