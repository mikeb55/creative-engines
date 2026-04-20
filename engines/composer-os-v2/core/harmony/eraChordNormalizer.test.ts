import assert from 'node:assert/strict';
import {
  classifyChordFunction,
  normalizeChordSymbolsForEra,
  parseChordSymbol,
} from './eraChordNormalizer';

function run(): void {
  const p1 = parseChordSymbol('Cmaj7#11/E');
  assert.ok(p1);
  assert.equal(p1.root, 'C');
  assert.equal(p1.slashBass, 'E');

  const p2 = parseChordSymbol('G7alt');
  assert.ok(p2);
  assert.equal(classifyChordFunction(p2), 'dominant');

  const swing = normalizeChordSymbolsForEra(['Cmaj7#11', 'G7alt', 'F#m7b5'], 'swing');
  assert.equal(swing[0], 'C6');
  assert.equal(swing[1], 'G7b9');

  const bebop = normalizeChordSymbolsForEra(['G7alt', 'Dm7', 'Cmaj7'], 'bebop');
  assert.ok(bebop[0] === 'G7b9' || bebop[0] === 'G7#9');

  const fusion = normalizeChordSymbolsForEra(['D7sus', 'Gmaj7#11'], 'fusion');
  assert.equal(fusion[0], 'D7sus');
  assert.equal(fusion[1], 'Gmaj7#11');
}

run();
