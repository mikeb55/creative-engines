/**
 * Billy Strayhorn — research-grounded no-ii–V–I chord pool (`strayhorn_isfahan_drift`).
 * Tagged `{ noIiVi: true }` like Frank Zappa / Joni Mitchell rows.
 * Existing untagged tiers (`strayhorn_chromatic_ballad` / `_lush_life` / `_chelsea_bridge`) stay as-is.
 *
 * Source works: Chelsea Bridge, Lush Life, Isfahan, Blood Count, Lotus Blossom.
 */

export type BillyStrayhornIsfahanPoolId = 'isfahan_drift';

export interface BillyStrayhornRowTags {
  noIiVi: true;
  pool: BillyStrayhornIsfahanPoolId;
}

export interface BillyStrayhornChordPoolRow {
  chords: string[];
  tags: BillyStrayhornRowTags;
}

const TAG: BillyStrayhornRowTags = { noIiVi: true, pool: 'isfahan_drift' };

function row(chords: string[]): BillyStrayhornChordPoolRow {
  return { chords, tags: TAG };
}

/** Verse — parallel colour planing. */
const VERSE: BillyStrayhornChordPoolRow[] = [
  row(['Bbm6/9', 'Abm6/9', 'Bbm6/9', 'Abm6/9']),
  row(['Bbm6/9', 'Abm6/9', 'Gbm6/9', 'Fm6/9']),
  row(['Emaj7', 'Ebmaj7#11', 'Dmaj7#11', 'D7#11']),
  row(['Abm(maj7)', 'Gbm(maj7)', 'Fm(maj7)', 'Ebm(maj7)']),
  row(['Fmaj7#11', 'Emaj7#11', 'Ebmaj7#11', 'Dbmaj9']),
];

/** Pre-chorus — chromatic mediant / minor-third drift. */
const PRE_CHORUS: BillyStrayhornChordPoolRow[] = [
  row(['Dbmaj9', 'Emaj9', 'Gmaj9', 'Bbmaj9']),
  row(['Fmaj7', 'Abmaj7#11', 'Bmaj9', 'Dbmaj9']),
  row(['G6/9', 'Gm6/9', 'Fmaj7', 'Dbmaj9']),
  row(['Dbmaj9', 'Fm9', 'Gm9', 'Bbm6/9']),
];

/** Chorus — tritone reinterpretation. */
const CHORUS: BillyStrayhornChordPoolRow[] = [
  row(['Eb7#9', 'Amaj7#11', 'Ab13', 'Dbmaj9']),
  row(['Dbmaj7', 'Cb7#11', 'Emaj7', 'D7#11']),
  row(['Bb/D', 'Dbm6', 'Cm7b5', 'F7']),
  row(['G13b9', 'Db7#11', 'Cmaj7#11', 'Ebmaj7']),
];

/** Bridge — non-functional dominant chains + connective devices. */
const BRIDGE: BillyStrayhornChordPoolRow[] = [
  row(['Db9', 'C9', 'B9', 'Bb9']),
  row(['E13', 'F13', 'Gb13', 'G13']),
  row(['Ab13b9', 'G13b9', 'Gb13b9', 'F13b9']),
  row(['C7#9', 'F7#9', 'Bb7', 'Ab13#11']),
  row(['Dm(maj7)', 'Dm7#5', 'Dm6', 'D7#11']),
  row(['E/A', 'Eb/A', 'Dm/A', 'F/A']),
  row(['Db6/9', 'D7#11', 'Db6/9', 'D7#11']),
  row(['Bbm6/9', 'Abm6/9', 'Gbmaj7#11', 'Dbmaj9']),
];

export const STRAYHORN_ISFAHAN_DRIFT_POOL_ID = 'strayhorn_isfahan_drift' as const;

export const STRAYHORN_ISFAHAN_DRIFT_POOL: {
  verse: BillyStrayhornChordPoolRow[];
  chorus: BillyStrayhornChordPoolRow[];
  bridge: BillyStrayhornChordPoolRow[];
  pre_chorus: BillyStrayhornChordPoolRow[];
} = {
  verse: VERSE,
  chorus: CHORUS,
  bridge: BRIDGE,
  pre_chorus: PRE_CHORUS,
};

export function listStrayhornIsfahanDriftRows(): readonly { section: string; index: number; chords: string[] }[] {
  return [
    ...VERSE.map((r, i) => ({ section: 'verse', index: i, chords: r.chords })),
    ...PRE_CHORUS.map((r, i) => ({ section: 'pre_chorus', index: i, chords: r.chords })),
    ...CHORUS.map((r, i) => ({ section: 'chorus', index: i, chords: r.chords })),
    ...BRIDGE.map((r, i) => ({ section: 'bridge', index: i, chords: r.chords })),
  ];
}
