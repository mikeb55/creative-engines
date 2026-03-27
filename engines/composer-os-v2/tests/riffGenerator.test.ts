/**
 * Riff Generator — deterministic smoke + GCE gate
 */

import { runRiffGenerator } from '../core/riff-generator/runRiffGenerator';

export function runRiffGeneratorTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  {
    const r = runRiffGenerator(0, {
      bars: 2,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 100,
      title: 'Smoke',
    });
    const ok =
      r.success === true &&
      !!r.xml &&
      r.gce !== undefined &&
      r.gce >= 9.0 &&
      r.xml.includes('<score-partwise') &&
      r.xml.includes('Riff');
    out.push({ ok, name: 'runRiffGenerator seed 0 passes GCE gate and exports XML' });
  }

  {
    const r = runRiffGenerator(0, {
      bars: 2,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'guitar_bass',
      bassEnabled: true,
      bpm: 100,
      title: 'Bass',
    });
    const ok =
      r.success === true &&
      !!r.xml &&
      r.gce !== undefined &&
      r.gce >= 9.0 &&
      r.xml.includes('Double Bass') &&
      r.xml.includes('midi-program');
    out.push({ ok, name: 'runRiffGenerator guitar+bass mode exports with bass part' });
  }

  return out;
}
