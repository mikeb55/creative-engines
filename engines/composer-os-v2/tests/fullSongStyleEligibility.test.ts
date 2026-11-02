/**
 * Full-song style eligibility — native Mosaic only; stand-in stubs rejected at API boundary.
 *
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/fullSongStyleEligibility.test.ts
 */
import assert from 'node:assert/strict';
import { generateFullSongMusicXml } from '../core/song-mode/generateFullSongMusicXml';
import {
  assertFullSongStyleEligible,
  evaluateFullSongStyleEligibility,
  isFullSongStyleEligible,
  listFullSongSupportedStyleIds,
} from '../core/song-mode/fullSongStyleEligibility';
import { DISPATCH_STUB_ALIAS_IDS } from '../core/mosaic-mode/mosaicDispatchStubAliases';
import { DUO_COMPOSER_ROSTER_IDS } from '../core/mosaic-mode/mosaicComposerSliceRows';

function main(): void {
  const supported = listFullSongSupportedStyleIds();
  assert.ok(supported.length >= 70, `expected large native roster, got ${supported.length}`);
  assert.ok(supported.includes('beatles'));
  assert.ok(supported.includes('radiohead'));
  assert.ok(!supported.includes('carole_king'));
  assert.ok(!supported.includes('paul_simon'));
  assert.ok(!supported.includes('max_martin'));
  assert.ok(!supported.includes('nile_rodgers'));
  assert.ok(!supported.includes('david_gilmour'));

  for (const id of DUO_COMPOSER_ROSTER_IDS) {
    if (DISPATCH_STUB_ALIAS_IDS.has(id)) continue;
    assert.equal(isFullSongStyleEligible(id), true, `native roster id should be eligible: ${id}`);
  }

  const stub = evaluateFullSongStyleEligibility('carole_king');
  assert.equal(stub.eligible, false);
  assert.match(stub.reason ?? '', /stand-in/);
  assert.throws(
    () => assertFullSongStyleEligible('carole_king'),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /unsupported primarySongwriterStyle "carole_king"/);
      assert.match(err.message, /stand-in Mosaic dispatch/);
      assert.match(err.message, /native Mosaic dispatch/);
      return true;
    }
  );

  assert.throws(
    () =>
      generateFullSongMusicXml(334032, 16, {
        title: 'Eligibility Gate',
        primarySongwriterStyle: 'carole_king',
      }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /unsupported primarySongwriterStyle "carole_king"/);
      assert.doesNotMatch(err.message, /golden path failed/);
      return true;
    }
  );

  assert.equal(assertFullSongStyleEligible('beatles'), 'beatles');
  assert.equal(assertFullSongStyleEligible('Miles'), 'miles_davis');

  console.log(
    `fullSongStyleEligibility PASS supported=${supported.length} unsupportedStubsChecked=5`
  );
}

main();
