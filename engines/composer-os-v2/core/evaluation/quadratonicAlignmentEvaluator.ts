import { parseChordSymbol, noteNameToPitchClass } from '../harmony/chordSymbolAnalysis';
import { selectQuadratonicMelodySpec } from '../harmony/quadratonicMelodySelector';
import type { ChordEvent, MeasureModel, NoteEvent, ScoreModel } from '../score-model/scoreModelTypes';
import type { StyleProfile, Score10 } from './evaluationTypes';

const ROOT_RE = /^([A-G](?:#|b)?)/i;

const DEFAULT_QUADRATONIC_WEIGHT = 0.1;

/** Map lead-sheet harmony (root + quality) to a Tonality Vault `chordType` id for quadratonic scoring. */
export function mapHarmonyPartToVaultChordType(harmonyPart: string): string | null {
  const h0 = harmonyPart.trim();
  const rm = h0.match(ROOT_RE);
  if (!rm) return null;
  const rest = h0.slice(rm[0].length).trim();
  if (!rest) return 'Maj7';

  if (/m\s*\(\s*maj|mmaj|min\s*maj|minor\s*maj|mMaj/i.test(rest)) {
    if (/13|#11/i.test(rest)) return 'minMaj13#11#9';
    return 'minMaj9';
  }

  if (/ø|m7b5|min7b5|-7\s*\(\s*b5/i.test(rest)) return 'min7b5';
  if (/dim7|°7|\bo7\b/i.test(rest)) return 'dim7b13';

  if (/sus.*b9|sus4.*b9|susb9/i.test(rest)) return 'sus-b9';
  if (/^sus|sus2|sus4/i.test(rest) && !/sus.*b9/i.test(rest)) return 'sus9';

  if (/maj7#11#9|Δ7#11#9|Maj7#11#9/i.test(rest)) return 'Maj7#11#9';
  if (/maj7#11|Δ7#11|maj\s*#11/i.test(rest)) return 'Maj7#11';
  if (/maj7#5|Δ7#5/i.test(rest)) return 'Maj7#5';

  if (/13#11#9|13♯11♯9/i.test(rest)) return '13#11#9';
  if (/13b9|13\s*b9/i.test(rest)) return '13b9';
  if (/7#9#5|7\s*\(\s*#9#5\s*\)/i.test(rest)) return '7#9#5';

  if (/m11|min11|-11/i.test(rest)) return 'min11';
  if (/m9|min9|-9/i.test(rest)) return 'min9';

  if (/maj9|Maj9|M9/i.test(rest) && !/m9|min9/i.test(rest)) return 'Maj9';
  if (/maj7|Δ|ma7|Maj7|\^7/i.test(rest)) return 'Maj7';

  if (/^m(?!aj)|^min|^-/i.test(rest)) {
    if (/11/i.test(rest)) return 'min11';
    if (/9/i.test(rest)) return 'min9';
    if (/7/i.test(rest)) return 'min9';
    return 'min9';
  }

  if (/13/i.test(rest)) return '13#11#9';
  if (/11/i.test(rest)) return '13#11#9';
  if (/9/i.test(rest)) return '13#11#9';
  if (/7|alt/i.test(rest)) return '13#11#9';

  return 'Maj7';
}

function pitchesFromNoteEvent(ev: NoteEvent): number[] {
  const extra = ev.pitches?.length ? ev.pitches : [];
  return [ev.pitch, ...extra];
}

function chordLabelForBar(score: ScoreModel, barIndex: number): string | null {
  for (const part of score.parts ?? []) {
    const m = part.measures[barIndex - 1];
    if (m?.chord) return m.chord;
  }
  for (const part of score.parts ?? []) {
    const m = part.measures[barIndex - 1];
    if (!m) continue;
    for (const ev of m.events) {
      if (ev.kind === 'chord') {
        const sym = (ev as ChordEvent).chordSymbol;
        if (sym) return sym;
      }
    }
  }
  return null;
}

function pickLeadPart(score: ScoreModel): MeasureModel[] | null {
  const parts = score.parts ?? [];
  if (parts.length === 0) return null;

  const preferIds = ['guitar', 'guitar_1', 'violin1', 'violin_1', 'melody', 'lead', 'piano'];
  for (const id of preferIds) {
    const p = parts.find((x) => x.id === id);
    if (p) return p.measures;
  }

  const treble = parts.filter((p) => p.clef === 'treble');
  const pool = treble.length > 0 ? treble : parts;

  let best = pool[0]!;
  let bestAvg = -Infinity;
  for (const p of pool) {
    let sum = 0;
    let n = 0;
    for (const m of p.measures) {
      for (const ev of m.events) {
        if (ev.kind !== 'note') continue;
        for (const midi of pitchesFromNoteEvent(ev as NoteEvent)) {
          sum += midi;
          n++;
        }
      }
    }
    const avg = n > 0 ? sum / n : 0;
    if (avg > bestAvg) {
      bestAvg = avg;
      best = p;
    }
  }
  return best.measures;
}

/**
 * 0–10: fraction of melody notes whose pitch class matches the quadratonic set for the bar chord (Tonality Vault).
 */
export function evaluateQuadratonicAlignmentScore(output: unknown): Score10 {
  if (output == null || typeof output !== 'object') return 5;
  const score = output as ScoreModel;
  const parts = score.parts ?? [];
  if (parts.length < 1) return 5;

  const leadMeasures = pickLeadPart(score);
  if (!leadMeasures || leadMeasures.length < 1) return 5;

  let weightedHits = 0;
  let weightedTotal = 0;

  for (let b = 1; b <= leadMeasures.length; b++) {
    const label = chordLabelForBar(score, b);
    if (!label) continue;

    const parsed = parseChordSymbol(label);
    const vaultType = mapHarmonyPartToVaultChordType(parsed.harmonyPart);
    if (!vaultType) continue;

    const spec = selectQuadratonicMelodySpec(vaultType);
    if (!spec) continue;

    const rm = parsed.harmonyPart.match(ROOT_RE);
    const rootPc = rm ? noteNameToPitchClass(rm[1] ?? '') : undefined;
    if (rootPc === undefined) continue;

    const qpcs = new Set(spec.quadratonicPitchClassesFromRoot.map((pc) => ((pc % 12) + 12) % 12));

    const m = leadMeasures[b - 1];
    if (!m) continue;

    for (const ev of m.events) {
      if (ev.kind !== 'note') continue;
      const ne = ev as NoteEvent;
      for (const midi of pitchesFromNoteEvent(ne)) {
        const notePc = ((midi % 12) + 12) % 12;
        const rel = (notePc - rootPc + 12) % 12;
        weightedTotal++;
        if (qpcs.has(rel)) weightedHits++;
      }
    }
  }

  if (weightedTotal === 0) return 5;

  const ratio = weightedHits / weightedTotal;
  return Math.max(1, Math.min(10, Math.round(ratio * 10))) as Score10;
}

/** Classical song overlays + Song Mode surface styles bump quadratonic weight via metadata (see Phase 5). */
export function resolveQuadratonicAlignmentWeight(
  profile: StyleProfile<unknown>,
  metadata?: Record<string, unknown>
): number {
  const overlay = metadata?.classicalOverlay ?? metadata?.classicalSongOverlay;
  if (overlay === 'schubert' || overlay === 'schumann' || overlay === 'faure') {
    return 0.15;
  }

  if (typeof profile.quadratonicAlignmentWeight === 'number' && Number.isFinite(profile.quadratonicAlignmentWeight)) {
    return profile.quadratonicAlignmentWeight;
  }

  const surf = metadata?.styleProfile ?? metadata?.songSurfaceStyleProfile;
  if (surf === 'STYLE_MODERN_JAZZ' || surf === 'STYLE_PAT_METHENY') {
    return 0.25;
  }

  return DEFAULT_QUADRATONIC_WEIGHT;
}
