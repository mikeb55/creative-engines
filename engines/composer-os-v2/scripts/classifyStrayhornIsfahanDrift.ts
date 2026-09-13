/**
 * One-shot: classify every strayhorn_isfahan_drift row against isMajorKeyIiViTriple.
 */
import { isMajorKeyIiViTriple, frankZappaIiViRollingTriplePresent } from '../core/song-mode/songModeBuilder';
import { listStrayhornIsfahanDriftRows } from '../core/song-mode/strayhornIsfahanDriftChordPool';

const rows = listStrayhornIsfahanDriftRows();
let fail = 0;
for (const row of rows) {
  const matches: string[] = [];
  for (let i = 0; i <= row.chords.length - 3; i++) {
    const a = row.chords[i]!;
    const b = row.chords[i + 1]!;
    const c = row.chords[i + 2]!;
    if (isMajorKeyIiViTriple(a, b, c)) matches.push(`${a} | ${b} | ${c}`);
  }
  const rolling = frankZappaIiViRollingTriplePresent(row.chords);
  const status = matches.length || rolling ? 'FAIL' : 'PASS';
  if (status === 'FAIL') fail++;
  const extra = matches.length ? `  MATCH=${matches.join(' ;; ')}` : '';
  console.log(`${status}  ${row.section}[${row.index}]  ${row.chords.join('  ')}${extra}`);
}
console.log('---');
console.log(`rows=${rows.length} fail=${fail}`);
process.exit(fail ? 1 : 0);
