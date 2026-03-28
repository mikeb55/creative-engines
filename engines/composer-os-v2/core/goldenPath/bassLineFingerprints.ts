/**
 * Bass measure fingerprints — shared by generation (anti-loop) and bass identity validation.
 */

export function rhythmFingerprint(measure: {
  events: { kind: string; startBeat: number; duration: number }[];
}): string {
  const parts: string[] = [];
  for (const e of measure.events) {
    if (e.kind === 'note') {
      parts.push(`${e.startBeat.toFixed(2)}:${e.duration.toFixed(2)}`);
    }
  }
  return parts.join('|');
}

export function contourFingerprint(measure: { events: { kind: string; pitch?: number }[] }): string {
  const pitches: number[] = [];
  for (const e of measure.events) {
    if (e.kind === 'note' && 'pitch' in e) pitches.push((e as { pitch: number }).pitch);
  }
  if (pitches.length < 2) return '';
  const steps: string[] = [];
  for (let i = 1; i < pitches.length; i++) {
    steps.push(String(pitches[i] - pitches[i - 1]));
  }
  return steps.join(',');
}

/** Max absolute semitone step between consecutive bass notes (contour “motion class” hint). */
export function contourStepMaxAbs(measure: { events: { kind: string; pitch?: number }[] }): number {
  const pitches: number[] = [];
  for (const e of measure.events) {
    if (e.kind === 'note' && 'pitch' in e) pitches.push((e as { pitch: number }).pitch);
  }
  let max = 0;
  for (let i = 1; i < pitches.length; i++) {
    max = Math.max(max, Math.abs(pitches[i] - pitches[i - 1]));
  }
  return max;
}

/** Note count + total beat span of notes (rhythmic density proxy). */
export function bassNoteDensityFingerprint(measure: {
  events: { kind: string; startBeat: number; duration: number }[];
}): string {
  let n = 0;
  let sumDur = 0;
  for (const e of measure.events) {
    if (e.kind === 'note') {
      n++;
      sumDur += e.duration;
    }
  }
  return `${n}:${sumDur.toFixed(2)}`;
}

/**
 * 2-bar phrase key: contours + rhythms + density so we do not repeat the same 2-bar shape.
 */
export function phraseTwoBarFingerprint(
  m1: { events: { kind: string; startBeat: number; duration: number; pitch?: number }[] },
  m2: { events: { kind: string; startBeat: number; duration: number; pitch?: number }[] }
): string {
  const c1 = contourFingerprint(m1);
  const c2 = contourFingerprint(m2);
  const r1 = rhythmFingerprint(m1);
  const r2 = rhythmFingerprint(m2);
  const d1 = bassNoteDensityFingerprint(m1);
  const d2 = bassNoteDensityFingerprint(m2);
  return `${c1}||${c2}||${r1}||${r2}||${d1}||${d2}`;
}
