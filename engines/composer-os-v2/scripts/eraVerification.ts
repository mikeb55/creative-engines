import assert from 'node:assert/strict';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';

type EraId = 'swing' | 'bebop' | 'post_bop';

interface EraMetrics {
  era: EraId;
  totalNonEmpty: number;
  swingMajorRatio: number;
  modernMajorRatio: number;
  alteredDomRatio: number;
  cleanDomRatio: number;
  rewrites: RewriteEvent[];
  rewrittenChords: string[];
  plainDominant: number;
  moderateTension: number;
  strongTension: number;
  swingMajorCount: number;
  modernMajorCount: number;
}

interface RewriteEvent {
  index: number;
  original: string;
  rewritten: string;
  ruleName: string;
}

const TARGET_BARS = 32;
const SEED = 50021;
const PRESET_ID = 'guitar_bass_duo';
const PRIMARY_STYLE = 'wayne_shorter';

const ERAS: EraId[] = ['swing', 'bebop', 'post_bop'];

function chordSegmentsFromContext(result: ReturnType<typeof runGoldenPath>): string[] {
  const segs = result.context?.chordSymbolPlan?.segments ?? [];
  return segs.map((s) => s.chord).filter((c) => c.trim().length > 0);
}

function hasAnyToken(symbol: string, tokens: string[]): boolean {
  const s = symbol.toLowerCase();
  return tokens.some((t) => s.includes(t));
}

function classifyDominantTension(chord: string): 'plain' | 'moderate' | 'strong' | 'none' {
  if (!chord) return 'none';
  const c = chord.toLowerCase();
  if (/7alt|dim7|7\(b9|b9,b13|#9,b13/.test(c)) return 'strong';
  if (/7b9|7#9|13b9|7#11|7b13|7\(#9\)|7\(b9\)/.test(c)) return 'moderate';
  if (/[^a-z](7|9|13)[^b#]|^[a-g][#b]?(7|9|13)$/.test(c)) return 'plain';
  return 'none';
}

function classifyTonicMajor(chord: string): 'swing_major' | 'modern_major' | 'none' {
  const c = chord.toLowerCase();
  if (/6\/9|^[a-g][#b]?6$/.test(c)) return 'swing_major';
  if (/maj9|maj7#11|maj7|maj13/.test(c)) return 'modern_major';
  return 'none';
}

function scoreEraSymbols(era: EraId, chords: string[]): EraMetrics {
  const nonEmpty = chords.map((c) => c.trim()).filter((c) => c.length > 0);
  const total = nonEmpty.length || 1;

  const swingMajorCount = nonEmpty.filter((c) => hasAnyToken(c, ['6/9', 'maj6', '6'])).length;
  const modernMajorCount = nonEmpty.filter((c) => hasAnyToken(c, ['maj9', 'maj7#11'])).length;
  const alteredDomCount = nonEmpty.filter((c) => hasAnyToken(c, ['alt', 'b9', '#9', 'b13'])).length;
  const cleanDomCount = nonEmpty.filter((c) => hasAnyToken(c, ['7', '9', '13'])).length;
  let plainDominant = 0;
  let moderateTension = 0;
  let strongTension = 0;
  let swingMajorTonic = 0;
  let modernMajorTonic = 0;
  for (const chord of nonEmpty) {
    const tension = classifyDominantTension(chord);
    if (tension === 'plain') plainDominant += 1;
    else if (tension === 'moderate') moderateTension += 1;
    else if (tension === 'strong') strongTension += 1;
    const tonic = classifyTonicMajor(chord);
    if (tonic === 'swing_major') swingMajorTonic += 1;
    else if (tonic === 'modern_major') modernMajorTonic += 1;
  }

  return {
    era,
    totalNonEmpty: nonEmpty.length,
    swingMajorRatio: swingMajorCount / total,
    modernMajorRatio: modernMajorCount / total,
    alteredDomRatio: alteredDomCount / total,
    cleanDomRatio: cleanDomCount / total,
    rewrites: [],
    rewrittenChords: chords,
    plainDominant,
    moderateTension,
    strongTension,
    swingMajorCount: swingMajorTonic,
    modernMajorCount: modernMajorTonic,
  };
}

function runEraGoldenPath(era: EraId): ReturnType<typeof runGoldenPath> {
  return runGoldenPath(SEED, {
    presetId: PRESET_ID,
    primarySongwriterStyle: PRIMARY_STYLE,
    totalBars: TARGET_BARS,
    bpm: 100,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    stylePairing: {
      songwriterStyle: PRIMARY_STYLE,
      arrangerStyle: 'thad',
      era,
    },
    styleProfile: 'STYLE_ECM',
  });
}

function inferRuleName(era: EraId, original: string, rewritten: string): string {
  const o = original.toLowerCase();
  const r = rewritten.toLowerCase();
  if (era === 'swing') {
    if (o.includes('maj9') && (r.includes('6/9') || r.endsWith('6'))) return 'swing_major_modern_to_6_9_or_6';
    if (o.includes('maj7') && r.endsWith('6')) return 'swing_major7_to_6';
    if ((o.includes('7alt') || o.includes('13b9')) && r.includes('7b9')) return 'swing_dom_alt_to_7b9';
  }
  if (era === 'bebop') {
    if (r.includes('7b9') || r.includes('7#9')) return 'bebop_dom_tension_keep_or_add';
    if (r.includes('dim7')) return 'bebop_dim_language';
  }
  if (era === 'post_bop') {
    if (r.includes('maj7#11') || r.includes('maj9')) return 'post_bop_modern_major_preserve';
  }
  return 'inferred_generic';
}

function buildRewriteEvents(era: EraId, original: string[], rewritten: string[]): RewriteEvent[] {
  const len = Math.min(original.length, rewritten.length);
  const out: RewriteEvent[] = [];
  for (let i = 0; i < len; i++) {
    const o = original[i] ?? '';
    const r = rewritten[i] ?? '';
    if (o !== r) {
      out.push({
        index: i,
        original: o,
        rewritten: r,
        ruleName: inferRuleName(era, o, r),
      });
    }
  }
  return out;
}

function verifyEra(era: EraId): EraMetrics {
  const baseline = runGoldenPath(SEED, {
    presetId: PRESET_ID,
    primarySongwriterStyle: PRIMARY_STYLE,
    totalBars: TARGET_BARS,
    bpm: 100,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    styleProfile: 'STYLE_ECM',
  });
  const result = runEraGoldenPath(era);
  const original = chordSegmentsFromContext(baseline);
  const chords = chordSegmentsFromContext(result);
  console.log('REWRITTEN CHORDS:', chords);
  const rewrites = buildRewriteEvents(era, original, chords);
  for (const rw of rewrites) {
    console.log(`REWRITE: ${rw.original} -> ${rw.rewritten} (era: ${era}, rule: ${rw.ruleName})`);
  }
  const scored = scoreEraSymbols(era, chords);
  return {
    ...scored,
    rewrites,
    rewrittenChords: chords,
  };
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function printMetrics(m: EraMetrics): void {
  console.log(`\n[${m.era}]`);
  console.log(`- non-empty chords: ${m.totalNonEmpty}`);
  console.log(`- swing_major ratio: ${pct(m.swingMajorRatio)}`);
  console.log(`- modern_major ratio: ${pct(m.modernMajorRatio)}`);
  console.log(`- altered_dom ratio: ${pct(m.alteredDomRatio)}`);
  console.log(`- clean_dom ratio: ${pct(m.cleanDomRatio)}`);
  console.log(
    `[${m.era}] plain:${m.plainDominant} moderate:${m.moderateTension} strong:${m.strongTension} swing_major:${m.swingMajorCount} modern:${m.modernMajorCount}`
  );
}

function main(): void {
  console.log('Era verification — song_mode_shorter (wayne_shorter)');

  const beforeSwing = runGoldenPath(SEED, {
    presetId: PRESET_ID,
    primarySongwriterStyle: PRIMARY_STYLE,
    totalBars: TARGET_BARS,
    bpm: 100,
    longFormEnabled: true,
    songModeHookFirstIdentity: true,
    styleProfile: 'STYLE_ECM',
  });
  const afterSwing = runEraGoldenPath('swing');
  const originalChords = chordSegmentsFromContext(beforeSwing);
  const rewrittenChords = chordSegmentsFromContext(afterSwing);
  console.log('BEFORE:', originalChords.slice(0, 8));
  console.log('AFTER:', rewrittenChords.slice(0, 8));

  const metrics = ERAS.map((era) => verifyEra(era));
  for (const m of metrics) printMetrics(m);

  const swing = metrics.find((m) => m.era === 'swing')!;
  const bebop = metrics.find((m) => m.era === 'bebop')!;
  const postBop = metrics.find((m) => m.era === 'post_bop')!;

  const swingChordsLower = swing.rewrittenChords.map((c) => c.toLowerCase());
  const bebopChordsLower = bebop.rewrittenChords.map((c) => c.toLowerCase());
  const postBopChordsLower = postBop.rewrittenChords.map((c) => c.toLowerCase());

  const failures: string[] = [];
  const check = (condition: boolean, message: string): void => {
    if (!condition) failures.push(message);
  };

  const swingTensionTotal = swing.moderateTension + swing.strongTension;
  const bebopTensionTotal = bebop.moderateTension + bebop.strongTension;
  const postBopTensionTotal = postBop.moderateTension + postBop.strongTension;

  // SWING checks
  check(swing.swingMajorCount >= 1, `SWING: expected swing_major >= 1, got ${swing.swingMajorCount}`);
  check(
    swing.plainDominant + swing.moderateTension > swing.strongTension,
    `SWING: expected (plain+moderate) > strong, got plain=${swing.plainDominant} moderate=${swing.moderateTension} strong=${swing.strongTension}`
  );
  check(!swingChordsLower.includes('cmaj9'), 'SWING: expected no Cmaj9 in rewritten output');
  check(!swingChordsLower.some((c) => c.includes('7alt')), 'SWING: expected no 7alt in rewritten output');

  // BEBOP checks
  check(
    bebopTensionTotal >= 1,
    `BEBOP: expected (moderate+strong) >= 1, got ${bebopTensionTotal}`
  );
  check(
    bebopTensionTotal >= swingTensionTotal,
    `BEBOP: expected bebop tension (${bebopTensionTotal}) >= swing tension (${swingTensionTotal})`
  );
  check(
    bebop.modernMajorCount > swing.modernMajorCount,
    `BEBOP: expected modern_major (${bebop.modernMajorCount}) > swing modern_major (${swing.modernMajorCount})`
  );
  check(
    bebopChordsLower.some((c) => c.includes('7b9') || c.includes('7#9')),
    'BEBOP: expected at least one 7b9 or 7#9'
  );

  // POST_BOP checks
  check(
    postBop.modernMajorCount >= 1,
    `POST_BOP: expected modern_major >= 1, got ${postBop.modernMajorCount}`
  );
  check(
    postBopTensionTotal >= swingTensionTotal,
    `POST_BOP: expected post_bop tension (${postBopTensionTotal}) >= swing tension (${swingTensionTotal})`
  );
  check(
    postBop.modernMajorCount > swing.modernMajorCount,
    `POST_BOP: expected modern_major (${postBop.modernMajorCount}) > swing modern_major (${swing.modernMajorCount})`
  );

  // Hierarchy check
  check(
    swingTensionTotal <= bebopTensionTotal,
    `HIERARCHY: expected swing tension (${swingTensionTotal}) <= bebop tension (${bebopTensionTotal})`
  );
  check(
    swingTensionTotal <= postBopTensionTotal,
    `HIERARCHY: expected swing tension (${swingTensionTotal}) <= post_bop tension (${postBopTensionTotal})`
  );

  const status = [
    `SWING: ${failures.some((f) => f.startsWith('SWING')) ? 'FAIL' : 'PASS'}`,
    `BEBOP: ${failures.some((f) => f.startsWith('BEBOP')) ? 'FAIL' : 'PASS'}`,
    `POST_BOP: ${failures.some((f) => f.startsWith('POST_BOP')) ? 'FAIL' : 'PASS'}`,
    `HIERARCHY: ${failures.some((f) => f.startsWith('HIERARCHY')) ? 'FAIL' : 'PASS'}`,
  ];
  console.log('\nASSERTION STATUS');
  for (const line of status) console.log(`- ${line}`);

  if (failures.length > 0) {
    console.log('\nASSERTION FAILURES');
    for (const f of failures) console.log(`- ${f}`);
    throw new Error(`Era verification failed with ${failures.length} assertion issue(s)`);
  }

  console.log('\nERA VERIFICATION: PASS');
}

main();
