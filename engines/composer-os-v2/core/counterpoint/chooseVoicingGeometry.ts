import type { VoiceRuleBundle } from '../composer/voiceRuleBundle';
import type { SectionWritingIntent } from './quartetFeatureTypes';

export type VoicingGeometryShape = 'close' | 'cluster' | 'spread' | 'drop2and4';

export interface VoicingGeometry {
  shape: VoicingGeometryShape;
  narrowAtCadence: boolean;
  expandTowardPhrasePeak: boolean;
}

/** Callers may attach optional phrase scores without changing `SectionWritingIntent` schema. */
export type SectionWritingIntentGeometry = SectionWritingIntent & {
  convergenceScore?: number;
  divergenceScore?: number;
};

/** Primary interval texture comes from styleProfileId tags (smoke + callers). */
function intervalTextureFromIntent(intent: SectionWritingIntentGeometry): 'closeChromatic' | 'open' | 'neutral' {
  const tag = (intent.styleProfileId ?? '').toUpperCase();
  if (tag.includes('CLOSE_CHROMATIC') || tag.includes('PASS34_CLOSE')) {
    return 'closeChromatic';
  }
  if (tag.includes('OPEN_INTERVAL') || tag.includes('PASS34_OPEN')) {
    return 'open';
  }
  if (intent.textureGoal === 'chorale' || intent.textureGoal === 'homorhythmic') {
    return 'closeChromatic';
  }
  if (intent.textureGoal === 'riff_layered' || intent.textureGoal === 'punctuated') {
    return 'open';
  }
  return 'neutral';
}

function convergenceHigh(intent: SectionWritingIntentGeometry): boolean {
  if (intent.convergenceScore != null && intent.convergenceScore > 0.62) {
    return true;
  }
  if (intent.motionRetention >= 0.62) return true;
  if (intent.textureGoal === 'chorale' || intent.textureGoal === 'homorhythmic') return true;
  return false;
}

function divergenceHigh(intent: SectionWritingIntentGeometry): boolean {
  if (intent.divergenceScore != null && intent.divergenceScore > 0.62) {
    return true;
  }
  if (intent.energyLevel >= 0.58 && intent.transparencyLevel >= 0.42) return true;
  if (intent.textureGoal === 'polyphonic' && intent.energyLevel > 0.5) return true;
  return false;
}

export function chooseVoicingGeometry(
  intent: SectionWritingIntentGeometry,
  vrb: VoiceRuleBundle,
): VoicingGeometry {
  const tex = intervalTextureFromIntent(intent);
  let shape: VoicingGeometryShape = 'close';
  let narrowAtCadence = false;
  let expandTowardPhrasePeak = false;

  if (tex === 'closeChromatic') {
    if (intent.textureGoal === 'chorale') {
      shape = 'close';
    } else {
      shape = 'cluster';
    }
  } else if (tex === 'open') {
    shape = 'spread';
  } else {
    shape = 'close';
  }

  if (convergenceHigh(intent)) {
    narrowAtCadence = true;
  } else {
    narrowAtCadence = false;
  }

  if (divergenceHigh(intent)) {
    expandTowardPhrasePeak = true;
  } else {
    expandTowardPhrasePeak = false;
  }

  const maxSpread = vrb.voicingPolicy.maxSpreadSemitones;
  if (maxSpread <= 18 && shape === 'spread') {
    shape = 'close';
  }
  if (maxSpread <= 14 && shape === 'cluster') {
    shape = 'close';
  }

  return { shape, narrowAtCadence, expandTowardPhrasePeak };
}
