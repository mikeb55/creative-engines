/**
 * Follow-up 4 — Mingus overlay MusicXML + Schneider/Threadgill activeMotifIds + shout export helpers (additive smoke).
 */

import type { FormSection } from '../core/composer/formController';
import {
  appendMingusCollectiveImprovPart,
  injectMingusGospelShoutOverlay,
  mergeShoutChorusIntoPartwiseXml,
} from '../core/composer/bigBandShoutMusicXml';
import {
  buildShoutChorusSection,
  shoutChorusPlan,
  type ShoutChorusScore,
} from '../core/composer/bigBandSectionWriter';
import {
  buildHarmonicScenesForVoiceBundle,
  buildHarmonicScenesFromFormPlan,
  threadgillMotifIdsMatchingFamily,
} from '../core/composer/harmonicScene';
import { buildFormSections } from '../core/composer/formController';
import type { RhythmMotifBinding } from '../core/composer/rhythmDnaMotifBinder';
import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { buildThemeGenome } from '../core/motif/themeGenomeBuilder';
import type { ThemeGenome } from '../core/motif/themeGenome';
import { validateMusicXml } from '../../../src/utils/musicXmlValidator';

function minimalPartwiseXml(measureCount: number): string {
  const measures: string[] = [];
  const divisions = 8;
  for (let m = 1; m <= measureCount; m++) {
    const attrs =
      m === 1
        ? `<attributes><divisions>${divisions}</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>`
        : '';
    measures.push(`<measure number="${m}">${attrs}<note><pitch><step>C</step><octave>4</octave></pitch><duration>${divisions * 4}</duration><voice>1</voice><type>whole</type></note></measure>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
<part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
<part id="P1">${measures.join('')}</part>
</score-partwise>`;
}

function testMergeShoutChorusAddsUnisonMarker(): boolean {
  const xml = minimalPartwiseXml(16);
  const score: ShoutChorusScore = {
    shoutBarRange: [5, 8],
    divisions: 8,
    rhythmCellId: 'rd_shout_grid',
    totalMeasures: 16,
  };
  const merged = mergeShoutChorusIntoPartwiseXml(xml, score);
  return (
    merged.includes('shout-chorus-unison') &&
    merged.includes('rhythm-cell:rd_shout_grid') &&
    merged.includes('P_SHOUT_UNISON_EXPORT')
  );
}

function testMingusGospelOverlayContainsRdShoutGrid(): boolean {
  const xml = minimalPartwiseXml(32);
  const out = injectMingusGospelShoutOverlay(xml, { triggerBar: 25, shoutHi: 30 });
  return out.includes('<!-- rd_shout_grid -->') && out.includes('P_MINGUS_GOSPEL_LAYER_1');
}

function testCollectivePartIdPresent(): boolean {
  const xml = minimalPartwiseXml(12);
  const out = appendMingusCollectiveImprovPart(xml, 12);
  return out.includes('P_MINGUS_COLLECTIVE') && out.includes('Mingus Collective');
}

function testValidateMusicXmlAfterFollowup4Pipeline(): boolean {
  let xml = minimalPartwiseXml(20);
  xml = mergeShoutChorusIntoPartwiseXml(xml, {
    shoutBarRange: [3, 6],
    divisions: 8,
    rhythmCellId: 'rd_shout_grid',
    totalMeasures: 20,
  });
  xml = injectMingusGospelShoutOverlay(xml, { triggerBar: 3, shoutHi: 6 });
  xml = appendMingusCollectiveImprovPart(xml, 20);
  const v = validateMusicXml(xml);
  return v.valid;
}

function testSchneiderStubDevelopmentIncludesSecondary(): boolean {
  const bundle = getVoiceRuleBundle('maria_schneider');
  const genome = buildThemeGenome('maria_schneider', 42, undefined, bundle);
  const form = { totalBars: 16, sections: [{ label: 'A', startBar: 1, length: 16 }] };
  const scenes = buildHarmonicScenesForVoiceBundle(form, bundle, genome);
  const dev = scenes[0]!;
  return (
    dev.activeMotifIds.includes(genome.primaryCell.id) &&
    Boolean(genome.secondaryCell?.id && dev.activeMotifIds.includes(genome.secondaryCell.id))
  );
}

function testSchneiderIntroOnlyPrimary(): boolean {
  const bundle = getVoiceRuleBundle('maria_schneider');
  const genome = buildThemeGenome('maria_schneider', 7, undefined, bundle);
  const intro: FormSection = {
    sceneId: 'intro_x',
    role: 'intro',
    barRange: [1, 6],
    targetTensionStart: 0.15,
    targetTensionEnd: 0.2,
    motifRecallRequired: false,
  };
  const scenes = buildHarmonicScenesFromFormPlan([intro], genome, undefined, bundle);
  return scenes[0]!.activeMotifIds.length === 1 && scenes[0]!.activeMotifIds[0] === genome.primaryCell.id;
}

function testSchneiderRecapOnlyPrimary(): boolean {
  const bundle = getVoiceRuleBundle('maria_schneider');
  const genome = buildThemeGenome('maria_schneider', 8, undefined, bundle);
  const form = { totalBars: 16, sections: [{ label: 'A', startBar: 1, length: 16 }] };
  const scenes = buildHarmonicScenesForVoiceBundle(form, bundle, genome);
  const recap = scenes[1]!;
  return (
    recap.activeMotifIds.length >= 1 &&
    recap.activeMotifIds.includes(genome.primaryCell.id) &&
    !recap.activeMotifIds.includes(genome.secondaryCell!.id)
  );
}

function testThreadgillStubRotatesMotifIds(): boolean {
  const bundle = getVoiceRuleBundle('henry_threadgill');
  const base = buildThemeGenome('henry_threadgill', 100, undefined, bundle);
  const genome = {
    ...base,
    primaryCell: { ...base.primaryCell, id: 'fam0', intervals: [2] },
    secondaryCell: base.secondaryCell
      ? { ...base.secondaryCell, id: 'fam1', intervals: [6] }
      : undefined,
    bridgeCell: base.bridgeCell ? { ...base.bridgeCell, id: 'fam2', intervals: [10] } : undefined,
  };
  const form = {
    totalBars: 24,
    sections: [
      { label: 'a', startBar: 1, length: 8 },
      { label: 'b', startBar: 9, length: 8 },
      { label: 'c', startBar: 17, length: 8 },
    ],
  };
  const scenes = buildHarmonicScenesForVoiceBundle(form, bundle, genome);
  const a0 = scenes[0]!.activeMotifIds.slice().sort().join(',');
  const a1 = scenes[1]!.activeMotifIds.slice().sort().join(',');
  const a2 = scenes[2]!.activeMotifIds.slice().sort().join(',');
  return a0 !== a1 && a1 !== a2 && a0.includes('fam0') && a1.includes('fam1') && a2.includes('fam2');
}

function testThreadgillMismatchYieldsEmptyFamilyIds(): boolean {
  const bundle = getVoiceRuleBundle('henry_threadgill');
  const base = buildThemeGenome('henry_threadgill', 101, undefined, bundle);
  const badCell = { ...base.primaryCell, id: 'ic4_only', intervals: [4] };
  const genome = {
    ...base,
    primaryCell: badCell,
    secondaryCell: base.secondaryCell ? { ...base.secondaryCell, id: 'ic4_s', intervals: [4] } : undefined,
    bridgeCell: undefined,
    cadentialTail: undefined,
  } as ThemeGenome;
  const ids = threadgillMotifIdsMatchingFamily(genome, 0);
  return ids.length === 0;
}

function testFreeArcBundlesOmitShoutChorus(): boolean {
  const ws = buildFormSections({ totalBars: 40, sections: [] }, getVoiceRuleBundle('wayne_shorter'));
  const jc = buildFormSections({ totalBars: 40, sections: [] }, getVoiceRuleBundle('john_coltrane'));
  const hasShout = (fs: typeof ws) => fs.some((s) => s.role === 'shout-chorus');
  return !hasShout(ws) && !hasShout(jc);
}

function testShoutChorusPlanCarriesTriggerAndScore(): boolean {
  const mingus = getVoiceRuleBundle('charles_mingus');
  const binding = { allowedRhythmCells: ['rd_quarter_on_1'] } as RhythmMotifBinding;
  const fs: FormSection = {
    sceneId: 'blues_shout',
    role: 'shout-chorus',
    barRange: [25, 36],
    targetTensionStart: 0.8,
    targetTensionEnd: 0.95,
    motifRecallRequired: false,
  };
  const plan = shoutChorusPlan(mingus, binding, fs, { sectionLeadBar: 25 });
  const score = buildShoutChorusSection({ form: { totalBars: 48 } }, plan);
  return (
    plan.triggerBar === 25 &&
    score != null &&
    score.shoutBarRange[0] === 25 &&
    score.rhythmCellId === 'rd_shout_grid'
  );
}

export function runFollowup4MingusSchneiderThreadgillSmokeTests(): { name: string; ok: boolean }[] {
  return [
    ['Follow-up 4 — shout merge adds unison + rhythm markers', testMergeShoutChorusAddsUnisonMarker],
    ['Follow-up 4 — Mingus gospel overlay stamps rd_shout_grid', testMingusGospelOverlayContainsRdShoutGrid],
    ['Follow-up 4 — collective part P_MINGUS_COLLECTIVE', testCollectivePartIdPresent],
    ['Follow-up 4 — validateMusicXml passes after pipeline', testValidateMusicXmlAfterFollowup4Pipeline],
    ['Follow-up 4 — Schneider stub development lists primary + secondary', testSchneiderStubDevelopmentIncludesSecondary],
    ['Follow-up 4 — Schneider intro scene primary motif only', testSchneiderIntroOnlyPrimary],
    ['Follow-up 4 — Schneider recap half omits secondary motif id', testSchneiderRecapOnlyPrimary],
    ['Follow-up 4 — Threadgill stub rotates activeMotifIds by family', testThreadgillStubRotatesMotifIds],
    ['Follow-up 4 — Threadgill family mismatch yields empty ids', testThreadgillMismatchYieldsEmptyFamilyIds],
    ['Follow-up 4 — Wayne + Coltrane free arcs omit shout-chorus', testFreeArcBundlesOmitShoutChorus],
    ['Follow-up 4 — Mingus shout plan + score wiring', testShoutChorusPlanCarriesTriggerAndScore],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
