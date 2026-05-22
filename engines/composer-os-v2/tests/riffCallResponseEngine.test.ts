import { computeGuitarRestWindows } from '../core/riff-generator/riffCallResponseEngine';
import { resolveRiffGeneratorProfile } from '../core/riff-generator/resolveRiffGeneratorProfile';

export function runRiffCallResponseEngineTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  {
    const profile = resolveRiffGeneratorProfile({
      vrbId: 'sly_stone',
      style: 'funk',
      grid: 'sixteenth',
      density: 'medium',
    });
    const windows = computeGuitarRestWindows(profile, 4, 'sly_stone');
    const ok =
      windows.length >= 1 &&
      windows.every((w) => w.endBeat - w.startBeat >= 1 && w.endBeat - w.startBeat <= 2.01) &&
      windows.every((w) => w.ghostOnly);
    out.push({
      ok,
      name: 'sly_stone call-response: rest window 1–2 beats, ghostOnly',
    });
  }

  {
    const profile = resolveRiffGeneratorProfile({
      vrbId: 'led_zeppelin',
      style: 'neutral',
      grid: 'eighth',
      density: 'medium',
    });
    const windows = computeGuitarRestWindows(profile, 4, 'led_zeppelin');
    out.push({
      ok: windows.length === 0,
      name: 'led_zeppelin blues_rock: no vocal call-response rest window',
    });
  }

  return out;
}
