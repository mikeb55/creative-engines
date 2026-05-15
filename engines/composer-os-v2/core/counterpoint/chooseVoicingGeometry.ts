import type { VoiceRuleBundle } from '../composer/voiceRuleBundle';
import type { SectionWritingIntent } from './quartetFeatureTypes';

export type VoicingGeometryShape = 'close' | 'cluster' | 'spread' | 'drop2and4';

export interface VoicingGeometry {
  shape: VoicingGeometryShape;
  narrowAtCadence: boolean;
  expandTowardPhrasePeak: boolean;
}

/** Primary interval texture comes from styleProfileId tags (smoke + callers). */
function intervalTextureFromIntent(intent: SectionWritingIntent): 'closeChromatic' | 'open' | 'neutral' {
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

function convergenceLike(intent: SectionWritingIntent): boolean {
  if (intent.motionRetention >= 0.62) return true;
  if (intent.textureGoal === 'chorale' || intent.textureGoal === 'homorhythmic') return true;
  return false;
}

function divergenceLike(intent: SectionWritingIntent): boolean {
  if (intent.energyLevel >= 0.58 && intent.transparencyLevel >= 0.42) return true;
  if (intent.textureGoal === 'polyphonic' && intent.energyLevel > 0.5) return true;
  return false;
}

export function chooseVoicingGeometry(intent: SectionWritingIntent, vrb: VoiceRuleBundle): VoicingGeometry {
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
    if (intent.leadSection === 'trumpets' || intent.leadSection === 'mixed_reeds_brass') {
      shape = 'drop2and4';
    } else {
      shape = 'spread';
    }
  } else {
    shape = 'close';
  }

  if (convergenceLike(intent)) {
    narrowAtCadence = true;
  } else {
    narrowAtCadence = false;
  }

  if (divergenceLike(intent)) {
    expandTowardPhrasePeak = true;
  } else {
    expandTowardPhrasePeak = false;
  }

  const maxSpread = vrb.voicingPolicy.maxSpreadSemitones;
  if (maxSpread <= 18 && (shape === 'spread' || shape === 'drop2and4')) {
    shape = 'close';
  }
  if (maxSpread <= 14 && shape === 'cluster') {
    shape = 'close';
  }

  return { shape, narrowAtCadence, expandTowardPhrasePeak };
}
