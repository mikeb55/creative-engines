/**
 * Song-form and dual-layer rhythm previews → MusicXML strings (drum-only paths).
 */

import { createAfrobeatRhythmEngine, type TonyAllenFeel } from '../percussion/afrobeatRhythmEngine';
import { buildFelaAfrobeatPercussionPart } from '../song-mode/felaKutiSlice';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { exportGreekRhythmToMusicXml } from '../rhythm/greekRhythmMusicXmlExporter';
import { getGreekRebetikoPresetById } from '../rhythm/greekRebetikoRhythmPresets';
import { exportBrazilianRhythmToMusicXml } from '../rhythm/brazilianRhythmMusicXmlExporter';
import { getBrazilianRhythmPresetById } from '../rhythm/brazilianRhythmPresets';
import { exportSecondLineRhythmToMusicXml } from '../rhythm/secondLineRhythmMusicXmlExporter';
import { getSecondLineRhythmPresetById } from '../rhythm/secondLineRhythmPresets';
import { exportCubanRhythmToMusicXml } from '../rhythm/cubanRhythmMusicXmlExporter';
import { getCubanRhythmPresetById } from '../rhythm/cubanRhythmPresets';
import type { ConflictStrategy } from '../rhythm/rhythmLayerMerge';
import type { RhythmEngineId } from '../rhythm/songFormRhythmTypes';

/** Matches `RhythmOutputEngine` in app `outputPaths.ts` for save routing. */
export const BLEND_RHYTHM_EXPORT_ENGINE = 'blended' as const;

/** Wide GM kit — dual-layer blend may reference any lane from five engines. */
const BLEND_SCORE_GM_MASTER = [
  36, 37, 38, 42, 44, 46, 47, 48, 49, 50, 51, 54, 56, 62, 64, 65, 67, 70, 73, 75, 81,
] as const;

function blendPercussionScorePartFromGmSet(partId: string, partName: string, gmNotes: readonly number[]): string {
  const name = escapeXml(partName);
  let blocks = '';
  for (const gm of gmNotes) {
    const id = `${partId}-I${gm}`;
    blocks += `
      <score-instrument id="${id}">
        <instrument-name>GM ${gm}</instrument-name>
        <instrument-sound>drum.kit</instrument-sound>
      </score-instrument>
      <midi-instrument id="${id}">
        <midi-channel>10</midi-channel>
        <midi-program>1</midi-program>
        <midi-unpitched>${gm}</midi-unpitched>
        <volume>78.7402</volume>
        <pan>0</pan>
      </midi-instrument>`;
  }
  return `    <score-part id="${partId}">
      <part-name>${name}</part-name>
      <part-abbreviation>Perc.</part-abbreviation>${blocks}
    </score-part>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export interface BlendExporterSongSection {
  bars: { startBar: number; endBar: number };
  rhythm: { engine: RhythmEngineId; presetId: string };
}

export interface BlendExporterSongForm {
  title: string;
  sections: BlendExporterSongSection[];
}

export interface BlendExporterEnginePreset {
  engine: RhythmEngineId;
  presetId: string;
}

export interface BlendExporterBlendedPlan {
  engineA: BlendExporterEnginePreset;
  engineB: BlendExporterEnginePreset;
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
  return xml.replace(/fela_drums-I(\d+)/g, 'P1-I$1');
}

function sourcePartIdForEngine(engine: RhythmEngineId): string {
  return engine === 'afrobeat' ? 'fela_drums' : 'P1';
}

/**
 * Full single-part MusicXML for one engine/preset (native metre each exporter).
 */
export function exportEngineRhythmSampleMusicXml(engine: RhythmEngineId, presetId: string, barCount: number): string {
  const n = Math.max(1, barCount);
  switch (engine) {
    case 'afrobeat': {
      const eng = createAfrobeatRhythmEngine();
      const pattern = eng.selectPattern(parseTonyAllenFeel(presetId));
      const part = buildFelaAfrobeatPercussionPart(n, pattern);
      const score: ScoreModel = {
        title: 'Rhythm',
        tempo: 108,
        timeSignature: { beats: 4, beatType: 4 },
        parts: [part],
      };
      const res = exportScoreModelToMusicXml(score);
      if (!res.success || !res.xml) {
        throw new Error(res.errors?.join('; ') ?? 'Afrobeat MusicXML export failed');
      }
      return normalizeFelaInstrumentRefs(res.xml);
    }
    case 'rebetiko': {
      const preset = getGreekRebetikoPresetById(presetId);
      if (!preset) {
        throw new Error(`blendMusicXmlExporter: unknown rebetiko presetId "${presetId}"`);
      }
      return exportGreekRhythmToMusicXml(preset, n);
    }
    case 'brazilian': {
      const preset = getBrazilianRhythmPresetById(presetId);
      if (!preset) {
        throw new Error(`blendMusicXmlExporter: unknown Brazilian presetId "${presetId}"`);
      }
      return exportBrazilianRhythmToMusicXml(preset, n);
    }
    case 'second_line': {
      const preset = getSecondLineRhythmPresetById(presetId);
      if (!preset) {
        throw new Error(`blendMusicXmlExporter: unknown Second Line presetId "${presetId}"`);
      }
      return exportSecondLineRhythmToMusicXml(preset, n);
    }
    case 'cuban': {
      const preset = getCubanRhythmPresetById(presetId);
      if (!preset) {
        throw new Error(`blendMusicXmlExporter: unknown Cuban presetId "${presetId}"`);
      }
      return exportCubanRhythmToMusicXml(preset, n);
    }
    default: {
      const _exhaustive: never = engine;
      throw new Error(`blendMusicXmlExporter: unsupported engine ${String(_exhaustive)}`);
    }
  }
}

function remapInstrumentRefs(inner: string, sourcePrefix: string, targetPrefix: string): string {
  return inner.replace(new RegExp(`${sourcePrefix}-I(\\d+)`, 'g'), `${targetPrefix}-I$1`);
}

function layerDisplayName(engine: RhythmEngineId): string {
  switch (engine) {
    case 'afrobeat':
      return 'Afrobeat layer';
    case 'rebetiko':
      return 'Rebetiko layer';
    case 'brazilian':
      return 'Brazilian layer';
    case 'second_line':
      return 'Second Line layer';
    case 'cuban':
      return 'Cuban layer';
    default: {
      const _e: never = engine;
      return String(_e);
    }
  }
}

function extractLayerInner(engine: RhythmEngineId, fullXml: string, targetPartId: 'P1' | 'P2'): string {
  const src = sourcePartIdForEngine(engine);
  let inner = extractPartInner(fullXml, src);
  const prefix = engine === 'afrobeat' ? 'fela_drums' : 'P1';
  inner = remapInstrumentRefs(inner, prefix, targetPartId);
  return inner.trim();
}

function wrapSinglePartScore(title: string, measuresBlock: string): string {
  const t = escapeXml(title);
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>${t}</work-title></work>
  <part-list>
${blendPercussionScorePartFromGmSet('P1', 'Rhythm blend', BLEND_SCORE_GM_MASTER)}
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
    const fullXml = exportEngineRhythmSampleMusicXml(sec.rhythm.engine, sec.rhythm.presetId, barCount);

    const srcPart = sourcePartIdForEngine(sec.rhythm.engine);
    const inner = extractPartInner(fullXml, srcPart);
    const normalizedInner =
      sec.rhythm.engine === 'afrobeat' ? remapInstrumentRefs(inner, 'fela_drums', 'P1') : inner;

    const wrapped =
      normalizedInner.trim().length > 0 ? `<part id="${srcPart}">${normalizedInner}</part>` : fullXml;
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
 * Two stacked percussion parts (native metre each): **P1** = Engine A, **P2** = Engine B.
 * `conflictStrategy` is annotated in a trailing comment for traceability (playback unchanged).
 */
export function exportBlendedScoreToMusicXml(plan: BlendExporterBlendedPlan): string {
  const afXml = exportEngineRhythmSampleMusicXml(plan.engineA.engine, plan.engineA.presetId, 1);
  const bfXml = exportEngineRhythmSampleMusicXml(plan.engineB.engine, plan.engineB.presetId, 1);

  const afInner = extractLayerInner(plan.engineA.engine, afXml, 'P1');
  const bfInner = extractLayerInner(plan.engineB.engine, bfXml, 'P2');

  const tag = escapeXml(`${plan.conflictStrategy}`);
  const title = escapeXml(`Layer blend (${plan.conflictStrategy})`);
  const nameA = escapeXml(layerDisplayName(plan.engineA.engine));
  const nameB = escapeXml(layerDisplayName(plan.engineB.engine));

  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>${title}</work-title></work>
  <part-list>
${blendPercussionScorePartFromGmSet('P1', nameA, BLEND_SCORE_GM_MASTER)}
${blendPercussionScorePartFromGmSet('P2', nameB, BLEND_SCORE_GM_MASTER)}
  </part-list>
  <part id="P1">
${afInner}
  </part>
  <part id="P2">
${bfInner}
  </part>
<!-- blend strategy: ${tag} -->
</score-partwise>
`;
}
