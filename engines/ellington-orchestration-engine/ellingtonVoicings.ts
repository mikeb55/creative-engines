/**
 * Ellington Orchestration Engine — Voicing logic
 * Drop-2, spread voicings, sax soli clusters, trumpet lead, trombone support.
 */

const ROOT_MIDI: Record<string, number> = {
  C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65,
  'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69, 'A#': 70, Bb: 70, B: 71,
};

const CHORD_TONES: Record<string, number[]> = {
  maj: [0, 4, 7, 11],
  min: [0, 3, 7, 10],
  dom: [0, 4, 7, 10],
  m7b5: [0, 3, 6, 10],
  m6: [0, 3, 7, 9],
  '6': [0, 4, 7, 9],
};

function parseChord(chord: string): { root: string; quality: string } {
  const base = chord.split('/')[0];
  const m = base.match(/^([A-Ga-g][#b]?)(maj7#11|maj7b5|maj13|maj7|min7|m7|m9|7|#11|11|dom7|m7b5|m6|6)?/i);
  if (!m) return { root: 'C', quality: 'maj' };
  let q = (m[2] || 'maj').toLowerCase();
  if (q === 'm7' || q === 'min7' || q === 'm9') q = 'min';
  if (q === '7' || q === 'dom7' || q === '11' || q === '#11') q = 'dom';
  if (q === 'maj7' || q === 'maj7#11' || q === 'maj7b5' || q === 'maj13') q = 'maj';
  const root = m[1].charAt(0).toUpperCase() + (m[1].slice(1) || '');
  return { root, quality: q };
}

function getChordTones(chord: string, octave: number): number[] {
  const { root, quality } = parseChord(chord);
  const base = ROOT_MIDI[root] ?? 60;
  const rootMidi = base + (octave - 4) * 12;
  const degrees = CHORD_TONES[quality] ?? CHORD_TONES.maj;
  return degrees.map((d) => rootMidi + d);
}

/** Drop-2: take 4-note close voicing, drop 2nd from top down an octave */
export function drop2Voicing(chord: string, octave: number): number[] {
  const tones = getChordTones(chord, octave);
  if (tones.length < 4) return tones;
  const [bass, mid1, mid2, soprano] = tones;
  return [bass - 12, mid1, mid2, soprano].sort((a, b) => a - b);
}

/** Spread: wider intervals for brass */
export function spreadVoicing(chord: string, octave: number): number[] {
  const tones = getChordTones(chord, octave);
  if (tones.length < 4) return tones;
  return [
    tones[0],
    tones[1] + 12,
    tones[2],
    tones[3] + 12,
  ].sort((a, b) => a - b);
}

/** Sax soli cluster: close voicing in mid register */
export function saxSoliVoicing(chord: string, octave: number): number[] {
  const tones = getChordTones(chord, octave);
  return tones.map((t) => t + 12).sort((a, b) => a - b);
}

/** Trumpet lead: melody note + support */
export function trumpetLeadVoicing(chord: string, octave: number, leadNote?: number): number[] {
  const tones = getChordTones(chord, octave);
  const lead = leadNote ?? Math.max(...tones) + 12;
  const leadPc = lead % 12;
  const support = tones.filter((t) => (t % 12) !== leadPc).slice(0, 3);
  if (support.length < 3) {
    return [lead, ...tones.slice(0, 3)].sort((a, b) => b - a);
  }
  return [lead, ...support].sort((a, b) => b - a);
}

/** Trombone support: lower register, drop-2 style */
export function tromboneSupportVoicing(chord: string, octave: number): number[] {
  return drop2Voicing(chord, octave - 1);
}

/** Rhythm guide tones: 3rd and 7th */
export function rhythmGuideTones(chord: string, octave: number): number[] {
  const tones = getChordTones(chord, octave);
  const third = tones[1];
  const seventh = tones[3] ?? tones[2];
  return [third, seventh];
}

function voiceLeadSmooth(prev: number[], next: number[]): number[] {
  if (prev.length === 0) return next;
  const out: number[] = [];
  const used = new Set<number>();
  for (let i = 0; i < next.length; i++) {
    const prevN = prev[Math.min(i, prev.length - 1)];
    const available = next.filter((n) => !used.has(n));
    const best = available.reduce((a, b) =>
      Math.abs(b - prevN) < Math.abs(a - prevN) ? b : a
    );
    out.push(best);
    used.add(best);
  }
  return out;
}

export interface SectionVoicing {
  bar: number;
  chord: string;
  pitches: number[];
}

export function generateSectionVoicings(
  progression: { chord: string; bars: number }[],
  section: 'trumpets' | 'trombones' | 'saxes' | 'rhythm',
  seed: number
): SectionVoicing[] {
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const result: SectionVoicing[] = [];
  let bar = 1;
  let lastPitches: number[] = [];
  for (const seg of progression) {
    for (let b = 0; b < seg.bars; b++) {
      let pitches: number[];
      switch (section) {
        case 'trumpets':
          pitches = trumpetLeadVoicing(seg.chord, 5);
          break;
        case 'trombones':
          pitches = tromboneSupportVoicing(seg.chord, 4);
          break;
        case 'saxes':
          pitches = saxSoliVoicing(seg.chord, 4);
          break;
        case 'rhythm':
          pitches = rhythmGuideTones(seg.chord, 4);
          break;
        default:
          pitches = drop2Voicing(seg.chord, 4);
      }
      if (lastPitches.length > 0 && rnd() > 0.3) {
        pitches = voiceLeadSmooth(lastPitches, pitches) as number[];
      }
      lastPitches = pitches;
      result.push({ bar, chord: seg.chord, pitches });
      bar++;
    }
  }
  return result;
}
