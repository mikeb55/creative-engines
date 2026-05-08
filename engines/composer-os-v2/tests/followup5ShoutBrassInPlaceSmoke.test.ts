/**
 * Follow-up 5 — in-place shout merge into brass/reed parts (additive smoke).
 */

import {
  appendMingusCollectiveImprovPart,
  applyMingusGospelShoutInPlace,
  mergeShoutChorusIntoExistingParts,
} from '../core/composer/bigBandShoutMusicXml';
import type { ShoutChorusScore } from '../core/composer/bigBandSectionWriter';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { validateMusicXml } from '../../../src/utils/musicXmlValidator';

function fixtureTwoTrumpetAndBass(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
<part-list>
<score-part id="P_TRUMPET_1"><part-name>Tpt 1</part-name><score-instrument id="P_TRUMPET_1-I1"><instrument-name>Trumpet</instrument-name></score-instrument></score-part>
<score-part id="P_TRUMPET_2"><part-name>Tpt 2</part-name><score-instrument id="P_TRUMPET_2-I1"><instrument-name>Trumpet</instrument-name></score-instrument></score-part>
<score-part id="P_BASS"><part-name>Bass</part-name><score-instrument id="P_BASS-I1"><instrument-name>Bass</instrument-name></score-instrument></score-part>
</part-list>
<part id="P_TRUMPET_1">
<measure number="1"><attributes><divisions>8</divisions></attributes><direction><words>mf</words></direction><note><pitch><step>C</step><octave>4</octave></pitch><duration>32</duration><instrument id="P_TRUMPET_1-I1"/><voice>1</voice><type>whole</type><stem>up</stem></note></measure>
<measure number="2"><note><pitch><step>D</step><octave>4</octave></pitch><duration>32</duration><instrument id="P_TRUMPET_1-I1"/><voice>1</voice><type>whole</type><stem>up</stem></note></measure>
</part>
<part id="P_TRUMPET_2">
<measure number="1"><attributes><divisions>8</divisions></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>32</duration><instrument id="P_TRUMPET_2-I1"/><voice>1</voice><type>whole</type><stem>up</stem></note></measure>
<measure number="2"><note><pitch><step>D</step><octave>4</octave></pitch><duration>32</duration><instrument id="P_TRUMPET_2-I1"/><voice>1</voice><type>whole</type><stem>up</stem></note></measure>
</part>
<part id="P_BASS">
<measure number="1"><attributes><divisions>8</divisions></attributes><note><pitch><step>E</step><octave>2</octave></pitch><duration>32</duration><instrument id="P_BASS-I1"/><voice>1</voice><type>whole</type><stem>down</stem></note></measure>
<measure number="2"><note><pitch><step>E</step><octave>2</octave></pitch><duration>32</duration><instrument id="P_BASS-I1"/><voice>1</voice><type>whole</type><stem>down</stem></note></measure>
</part>
</score-partwise>`;
}

function countSubstring(hay: string, needle: string): number {
  let c = 0;
  let i = 0;
  while (true) {
    const j = hay.indexOf(needle, i);
    if (j < 0) break;
    c++;
    i = j + needle.length;
  }
  return c;
}

function testBrassMeasuresGetShoutEighthGrid(): boolean {
  const bundle = getVoiceRuleBundle('gil_evans');
  const score: ShoutChorusScore = {
    shoutBarRange: [2, 2],
    divisions: 8,
    rhythmCellId: 'rd_shout_grid',
    totalMeasures: 2,
    tensionLevel: 0.95,
    dominantVoicingColor: 'tritone-sus',
  };
  const out = mergeShoutChorusIntoExistingParts(fixtureTwoTrumpetAndBass(), score, bundle);
  const tptBlock = out.match(/<part id="P_TRUMPET_1">[\s\S]*?<\/part>/)?.[0] ?? '';
  const m2 = tptBlock.split('<measure number="2">')[1]?.split('</measure>')[0] ?? '';
  const eighths = countSubstring(m2, '<type>eighth</type>');
  return eighths >= 6;
}

function testBassUnchangedInShoutBars(): boolean {
  const bundle = getVoiceRuleBundle('gil_evans');
  const score: ShoutChorusScore = {
    shoutBarRange: [2, 2],
    divisions: 8,
    rhythmCellId: 'rd_shout_grid',
    totalMeasures: 2,
  };
  const out = mergeShoutChorusIntoExistingParts(fixtureTwoTrumpetAndBass(), score, bundle);
  const bass = out.match(/<part id="P_BASS">[\s\S]*?<\/part>/)?.[0] ?? '';
  const m2 = bass.split('<measure number="2">')[1]?.split('</measure>')[0] ?? '';
  return countSubstring(m2, '<type>whole</type>') === 1 && countSubstring(m2, '<note>') === 1;
}

function testDirectionPreservedOnNonShoutMeasure(): boolean {
  const bundle = getVoiceRuleBundle('gil_evans');
  const score: ShoutChorusScore = {
    shoutBarRange: [2, 2],
    divisions: 8,
    rhythmCellId: 'rd_shout_grid',
    totalMeasures: 2,
  };
  const out = mergeShoutChorusIntoExistingParts(fixtureTwoTrumpetAndBass(), score, bundle);
  const tpt = out.match(/<part id="P_TRUMPET_1">[\s\S]*?<\/part>/)?.[0] ?? '';
  const m1 = tpt.split('<measure number="1">')[1]?.split('</measure>')[0] ?? '';
  return m1.includes('<direction>') && m1.includes('mf');
}

function testNoGospelLayersAfterMerge(): boolean {
  const bundle = getVoiceRuleBundle('gil_evans');
  const score: ShoutChorusScore = {
    shoutBarRange: [2, 2],
    divisions: 8,
    rhythmCellId: 'rd_shout_grid',
    totalMeasures: 2,
  };
  const out = mergeShoutChorusIntoExistingParts(fixtureTwoTrumpetAndBass(), score, bundle);
  return !out.includes('P_MINGUS_GOSPEL_LAYER');
}

function testRemovesPreexistingGospelLayerParts(): boolean {
  const bundle = getVoiceRuleBundle('gil_evans');
  const base = fixtureTwoTrumpetAndBass().replace(
    '</part-list>',
    `<score-part id="P_MINGUS_GOSPEL_LAYER_1"><part-name>G</part-name><score-instrument id="P_MINGUS_GOSPEL_LAYER_1-I1"><instrument-name>X</instrument-name></score-instrument></score-part>
</part-list>`
  );
  const withLayer = base.replace(
    '</score-partwise>',
    `<part id="P_MINGUS_GOSPEL_LAYER_1"><measure number="1"><attributes><divisions>8</divisions></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>32</duration><instrument id="P_MINGUS_GOSPEL_LAYER_1-I1"/><voice>1</voice><type>whole</type></note></measure><measure number="2"><note><pitch><step>D</step><octave>4</octave></pitch><duration>32</duration><instrument id="P_MINGUS_GOSPEL_LAYER_1-I1"/><voice>1</voice><type>whole</type></note></measure></part>
</score-partwise>`
  );
  const score: ShoutChorusScore = {
    shoutBarRange: [2, 2],
    divisions: 8,
    rhythmCellId: 'rd_shout_grid',
    totalMeasures: 2,
  };
  const out = mergeShoutChorusIntoExistingParts(withLayer, score, bundle);
  return !out.includes('P_MINGUS_GOSPEL_LAYER_1');
}

function testValidateAfterInPlaceMerge(): boolean {
  const bundle = getVoiceRuleBundle('gil_evans');
  const score: ShoutChorusScore = {
    shoutBarRange: [2, 2],
    divisions: 8,
    rhythmCellId: 'rd_shout_grid',
    totalMeasures: 2,
  };
  const out = mergeShoutChorusIntoExistingParts(fixtureTwoTrumpetAndBass(), score, bundle);
  return validateMusicXml(out).valid;
}

function testGospelInPlaceStampsRdShoutGrid(): boolean {
  const bundle = getVoiceRuleBundle('charles_mingus');
  const score: ShoutChorusScore = {
    shoutBarRange: [2, 2],
    divisions: 8,
    rhythmCellId: 'rd_shout_grid',
    totalMeasures: 2,
  };
  let xml = mergeShoutChorusIntoExistingParts(fixtureTwoTrumpetAndBass(), score, bundle);
  xml = applyMingusGospelShoutInPlace(xml, { shoutLo: 2, shoutHi: 2 }, bundle);
  const tpt = xml.match(/<part id="P_TRUMPET_1">[\s\S]*?<\/part>/)?.[0] ?? '';
  return tpt.includes('rd_shout_grid');
}

function testCollectiveStillAppended(): boolean {
  const bundle = getVoiceRuleBundle('gil_evans');
  const score: ShoutChorusScore = {
    shoutBarRange: [2, 2],
    divisions: 8,
    rhythmCellId: 'rd_shout_grid',
    totalMeasures: 2,
  };
  let xml = mergeShoutChorusIntoExistingParts(fixtureTwoTrumpetAndBass(), score, bundle);
  xml = appendMingusCollectiveImprovPart(xml, 2);
  return xml.includes('P_MINGUS_COLLECTIVE');
}

function testSingleLeadPartUnchangedWhenNoBrassIds(): boolean {
  const bundle = getVoiceRuleBundle('wayne_shorter');
  const minimal = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1"><part-list><score-part id="P1"><part-name>L</part-name></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>8</divisions></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>32</duration><voice>1</voice><type>whole</type></note></measure></part>
</score-partwise>`;
  const score: ShoutChorusScore = {
    shoutBarRange: [1, 1],
    divisions: 8,
    rhythmCellId: 'rd_shout_grid',
    totalMeasures: 1,
  };
  const out = mergeShoutChorusIntoExistingParts(minimal, score, bundle);
  return out.includes('<part id="P1">') && countSubstring(out, '<type>whole</type>') >= 1 && validateMusicXml(out).valid;
}

export function runFollowup5ShoutBrassInPlaceSmokeTests(): { name: string; ok: boolean }[] {
  return [
    ['Follow-up 5 — brass shout bars use eighth-note grid', testBrassMeasuresGetShoutEighthGrid],
    ['Follow-up 5 — bass part untouched in shout range', testBassUnchangedInShoutBars],
    ['Follow-up 5 — direction preserved outside shout measure', testDirectionPreservedOnNonShoutMeasure],
    ['Follow-up 5 — no P_MINGUS_GOSPEL_LAYER after merge', testNoGospelLayersAfterMerge],
    ['Follow-up 5 — strip legacy P_MINGUS_GOSPEL_LAYER_* parts', testRemovesPreexistingGospelLayerParts],
    ['Follow-up 5 — validateMusicXml after in-place merge', testValidateAfterInPlaceMerge],
    ['Follow-up 5 — Mingus gospel in-place stamps rd_shout_grid', testGospelInPlaceStampsRdShoutGrid],
    ['Follow-up 5 — collective part still append-only', testCollectiveStillAppended],
    ['Follow-up 5 — non-brass-only score unchanged + valid', testSingleLeadPartUnchangedWhenNoBrassIds],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
