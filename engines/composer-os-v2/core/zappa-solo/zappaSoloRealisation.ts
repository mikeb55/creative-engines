/**
 * Zappa Solo realisation — re-export + behaviour preset helpers (V107p4).
 */

export {
  realiseZappaSoloMusicContext,
  arcStateForBar,
  type ZappaSoloRealisationResult,
} from './zappaSoloMusicContextRealisation';

export { buildMusicContextFromZappaSolo } from './zappaSoloMusicContextProducer';

export type {
  ZappaSoloMusicContextPreset,
  ZappaSoloArcSegment,
  ZappaSoloArcState,
  ZappaSoloRealisationReceipt,
} from './zappaSoloMusicContextTypes';

import { buildMusicContextFromZappaSolo } from './zappaSoloMusicContextProducer';
import { realiseZappaSoloMusicContext } from './zappaSoloMusicContextRealisation';
import type { ZappaSoloMusicContextPreset, ZappaSoloArcSegment } from './zappaSoloMusicContextTypes';
import { loopHarmonyBarsToLength, type SoloExportNote } from '../solo/soloMusicContextExport';
import type { MusicContext } from '../music-context/musicContextTypes';

export type ZappaSoloBehaviourPreset = {
  harmonyBars: readonly string[];
  totalBars?: number;
  seed?: number;
  bpm?: number;
  key?: string;
  dramaticArc?: boolean;
  /** Target receipt metric — steers density/dissonance via arc weighting. */
  closureRefusalScore?: number;
  rhythmicElasticityScore?: number;
  modalAnchorRatio?: number;
};

export type ZappaSoloRealisationBundle = {
  musicContext: MusicContext;
  soloNotes: SoloExportNote[];
  soloLine: import('../solo/soloTypes').SoloLine;
};

function soloArcForBars(totalBars: number): ZappaSoloArcSegment[] {
  const q = Math.max(1, Math.floor(totalBars / 4));
  const tail = totalBars - q * 3;
  return [
    { startBar: 1, endBar: q, state: 'claim' },
    { startBar: q + 1, endBar: q * 2, state: 'agitation' },
    { startBar: q * 2 + 1, endBar: q * 3, state: 'fracture' },
    { startBar: q * 3 + 1, endBar: totalBars, state: 'crooked_landing' },
  ];
}

function zappaPresetFromBehaviour(behaviour: ZappaSoloBehaviourPreset): ZappaSoloMusicContextPreset {
  const totalBars = behaviour.totalBars ?? behaviour.harmonyBars.length;
  const harmonyBars = loopHarmonyBarsToLength(behaviour.harmonyBars, totalBars);
  const closure = behaviour.closureRefusalScore ?? 0.5;
  const elasticity = behaviour.rhythmicElasticityScore ?? 0.5;
  const anchor = behaviour.modalAnchorRatio ?? 0.65;
  return {
    harmonyBars,
    seed: behaviour.seed,
    bpm: behaviour.bpm,
    key: behaviour.key,
    participationLevel: 'primary',
    soloArc: behaviour.dramaticArc !== false ? soloArcForBars(totalBars) : undefined,
    density: 0.55 + elasticity * 0.35,
    dissonanceLevel: 0.35 + closure * 0.45,
    modalField: anchor >= 0.6 ? 'mixolydian' : 'dorian',
  };
}

/** Build MusicContext + solo note timeline for export. */
export function realiseZappaSoloFromBehaviour(behaviour: ZappaSoloBehaviourPreset): ZappaSoloRealisationBundle {
  const preset = zappaPresetFromBehaviour(behaviour);
  const ctx = buildMusicContextFromZappaSolo(preset);
  const { soloLine } = realiseZappaSoloMusicContext(
    preset,
    ctx.harmony.bars,
    ctx.key.root,
    ctx.harmony.checksum,
  );
  const soloNotes: SoloExportNote[] = soloLine.allNotes
    .filter((n) => !n.isRest)
    .map((n) => ({
      barIndex: n.barIndex,
      startBeat: n.startBeat,
      durationBeats: n.durationBeats,
      pitch: n.midi,
    }));
  return { musicContext: ctx, soloNotes, soloLine };
}
