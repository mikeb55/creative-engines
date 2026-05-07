/**
 * Song-form and dual-layer rhythm previews → MusicXML strings (drum-only paths).
 */

import { createAfrobeatRhythmEngine, type TonyAllenFeel } from '../percussion/afrobeatRhythmEngine';
import { buildFelaAfrobeatPercussionPart } from '../song-mode/felaKutiSlice';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { exportGreekRhythmToMusicXml } from '../rhythm/greekRhythmMusicXmlExporter';
import { getGreekRebetikoPresetById } from '../rhythm/greekRebetikoRhythmPresets';
import type { ConflictStrategy } from '../rhythm/rhythmLayerMerge';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export interface BlendExporterSongSection {
  bars: { startBar: number; endBar: number };
  rhythm: { engine: 'afrobeat' | 'rebetiko'; presetId: string };
}

export interface BlendExporterSongForm {
  title: string;
  sections: BlendExporterSongSection[];
}

export interface BlendExporterBlendedPlan {
  afrobeatPreset: { presetId: string };
  rebetikoPreset: { presetId: string };
  conflictStrategy: ConflictStrategy;
}

function parseTonyAllenFeel(presetId: string): TonyAllenFeel {
  if (presetId === 'straight' || presetId === 'swing' || presetId === 'afrobeat') return presetId;
  return 'straight';
}

function extractMeasureTags(xml: string): string[] {
  return xml.match(/<measure\b[^>]*>[\s\S]*?<\/measure>/g) ?? [];
}

function extractPartInner(xml: string, partId: string): string {
  const re = new RegExp(`<part\\s+id="${partId}"[^>]*>([\\s\\S]*?)</part>`);
  const m = xml.match(re);
  return m ? m[1]!.trim() : '';
}

/** Normalize Fela instrument refs to P1 for single-part song-form concatenation. */
function normalizeFelaInstrumentRefs(xml: string): string {
  return xml.replace(/fela_drums-I1/g, 'P1-I1');
}

function wrapSinglePartScore(title: string, measuresBlock: string): string {
  const t = escapeXml(title);
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>${t}</work-title></work>
  <part-list>
    <score-part id="P1">
      <part-name>Rhythm blend</part-name>
      <score-instrument id="P1-I1"><instrument-name>GM Drum Kit</instrument-name></score-instrument>
    </score-part>
  </part-list>
  <part id="P1">
${measuresBlock}
  </part>
</score-partwise>
`;
}

/**
 * Serial sections left → right; metre/engine changes appear at section boundaries via each chunk’s measure-1 attributes.
 */
export function exportSongFormToMusicXml(form: BlendExporterSongForm): string {
  const sections = [...form.sections].sort((a, b) => a.bars.startBar - b.bars.startBar);
  const chunks: string[] = [];
  let measureNum = 1;

  for (const sec of sections) {
    const barCount = Math.max(1, sec.bars.endBar - sec.bars.startBar + 1);
    let fullXml: string;

    if (sec.rhythm.engine === 'rebetiko') {
      const preset = getGreekRebetikoPresetById(sec.rhythm.presetId);
      if (!preset) {
        throw new Error(`blendMusicXmlExporter: unknown rebetiko presetId "${sec.rhythm.presetId}"`);
      }
      fullXml = exportGreekRhythmToMusicXml(preset, barCount);
    } else {
      const engine = createAfrobeatRhythmEngine();
      const pattern = engine.selectPattern(parseTonyAllenFeel(sec.rhythm.presetId));
      const part = buildFelaAfrobeatPercussionPart(barCount, pattern);
      const score: ScoreModel = {
        title: form.title,
        tempo: 108,
        timeSignature: { beats: 4, beatType: 4 },
        parts: [part],
      };
      const res = exportScoreModelToMusicXml(score);
      if (!res.success || !res.xml) {
        throw new Error(res.errors?.join('; ') ?? 'Afrobeat MusicXML export failed');
      }
      fullXml = normalizeFelaInstrumentRefs(res.xml);
    }

    const partId = sec.rhythm.engine === 'rebetiko' ? 'P1' : 'fela_drums';
    const inner = extractPartInner(fullXml, partId);
    const wrapped = inner.trim().length > 0 ? `<part id="${partId}">${inner}</part>` : fullXml;
    let tags = extractMeasureTags(wrapped);
    if (tags.length === 0) {
      tags = extractMeasureTags(fullXml);
    }

    for (const mu of tags) {
      const renumbered = mu.replace(/<measure\s+number="\d+"/, `<measure number="${measureNum}"`);
      chunks.push(`    ${renumbered}`);
      measureNum += 1;
    }
  }

  return wrapSinglePartScore(form.title, chunks.join('\n'));
}

/**
 * Two stacked percussion parts (native metre each): Afrobeat **P1**, Rebetiko **P2**.
 * `conflictStrategy` is annotated in the work title for traceability (playback unchanged).
 */
export function exportBlendedScoreToMusicXml(plan: BlendExporterBlendedPlan): string {
  const engine = createAfrobeatRhythmEngine();
  const pattern = engine.selectPattern(parseTonyAllenFeel(plan.afrobeatPreset.presetId));
  const afroPart = buildFelaAfrobeatPercussionPart(1, pattern);
  const afroScore: ScoreModel = {
    title: 'Afrobeat layer',
    tempo: 108,
    timeSignature: { beats: 4, beatType: 4 },
    parts: [afroPart],
  };
  const afroRes = exportScoreModelToMusicXml(afroScore);
  if (!afroRes.success || !afroRes.xml) {
    throw new Error(afroRes.errors?.join('; ') ?? 'Afrobeat export failed');
  }
  const afroXml = normalizeFelaInstrumentRefs(afroRes.xml);

  const greekPreset = getGreekRebetikoPresetById(plan.rebetikoPreset.presetId);
  if (!greekPreset) {
    throw new Error(`blendMusicXmlExporter: unknown rebetiko presetId "${plan.rebetikoPreset.presetId}"`);
  }
  const greekXml = exportGreekRhythmToMusicXml(greekPreset, 1);

  const afroInner = extractPartInner(afroXml, 'fela_drums').replace(/fela_drums/g, 'P1');
  const greekInner = extractPartInner(greekXml, 'P1').replace(/id="P1"/g, 'id="P2"').replace(/P1-I1/g, 'P2-I1');

  const tag = escapeXml(`${plan.conflictStrategy}`);
  const title = escapeXml(`Layer blend (${plan.conflictStrategy})`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>${title}</work-title></work>
  <part-list>
    <score-part id="P1">
      <part-name>Afrobeat layer</part-name>
      <score-instrument id="P1-I1"><instrument-name>GM Drum Kit</instrument-name></score-instrument>
    </score-part>
    <score-part id="P2">
      <part-name>Rebetiko layer</part-name>
      <score-instrument id="P2-I1"><instrument-name>GM Drum Kit</instrument-name></score-instrument>
    </score-part>
  </part-list>
  <part id="P1">
${afroInner}
  </part>
  <part id="P2">
${greekInner}
  </part>
<!-- blend strategy: ${tag} -->
</score-partwise>
`;
}
