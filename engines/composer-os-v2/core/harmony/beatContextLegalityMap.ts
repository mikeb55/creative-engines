import { TONALITY_VAULT_DATABASE, type TonalityVaultChordRow } from './tonalityVaultDatabase';
import {
  selectQuadratonicMelodySpec,
  vaultDegreeToPitchClass,
} from './quadratonicMelodySelector';
import type { BeatLegality, NoteLayer, NoteTag, NoteTonalRole } from './noteTag';

const ROW_BY_TYPE = new Map<string, TonalityVaultChordRow>(
  TONALITY_VAULT_DATABASE.map((r) => [r.chordType, r])
);

const TRIAD_ROLES: [NoteTonalRole, NoteTonalRole, NoteTonalRole] = [
  'triadRoot',
  'triadThird',
  'triadFifth',
];

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12;
}

function relToAbs(rootPc: number, relPc: number): number {
  return normalizePc(rootPc + relPc);
}

/**
 * Absolute pitch class (0–11) → {@link NoteTag} for melody against one chord (Tonality Vault row).
 *
 * Triad tones (vault melodic triad): layer 0, strong beat.
 * Primary tension: layer 1, weak beat (also valid syncopated in style engines).
 * Other hierarchy tensions (non-triad, non-primary): layer 2, approach only.
 * Remaining pitch classes: layer 3, chaos.
 */
export function buildBeatContextLegalityMap(
  chordTypeId: string,
  rootPc: number
): Map<number, NoteTag> {
  const out = new Map<number, NoteTag>();
  const row = ROW_BY_TYPE.get(chordTypeId);
  const spec = selectQuadratonicMelodySpec(chordTypeId);
  if (!row || !spec) return out;

  const root = normalizePc(rootPc);

  const triadSlots = spec.melodicTriad.map((t, i) => ({
    relPc: t.pitchClassFromRoot,
    role: TRIAD_ROLES[i] ?? 'triadFifth',
  }));

  const primaryRel = normalizePc(spec.primaryTension.pitchClassFromRoot);

  const triadDegrees = new Set(spec.melodicTriad.map((t) => t.degree));

  const secondaryRelSet = new Set<number>();
  for (const deg of row.tensionHierarchy) {
    if (triadDegrees.has(deg) || deg === row.primaryTensionNote) continue;
    const pc = vaultDegreeToPitchClass(row, deg);
    if (pc !== undefined) secondaryRelSet.add(normalizePc(pc));
  }

  const triadAbsTargets = triadSlots.map((s) => relToAbs(root, s.relPc));

  for (let absPc = 0; absPc < 12; absPc++) {
    const rel = normalizePc(absPc - root);

    const triadMatch = triadSlots.find((s) => normalizePc(s.relPc) === rel);
    if (triadMatch) {
      const othersAbs = triadAbsTargets.filter((a) => a !== absPc);
      out.set(absPc, {
        tonalRole: triadMatch.role,
        layer: 0 as NoteLayer,
        beatLegality: 'strong',
        resolveTargets: othersAbs,
        voicingCompatibility: [],
        guitarTechniques: [],
      });
      continue;
    }

    if (rel === primaryRel) {
      const primaryResolve = [
        ...new Set(
          spec.primaryTension.resolvesTowardTriadDegrees
            .map((d) => {
              const rpc = vaultDegreeToPitchClass(row, d);
              return rpc !== undefined ? relToAbs(root, rpc) : null;
            })
            .filter((x): x is number => x !== null)
        ),
      ];
      out.set(absPc, {
        tonalRole: 'primaryTension',
        layer: 1 as NoteLayer,
        beatLegality: 'weak' as BeatLegality,
        resolveTargets: primaryResolve,
        voicingCompatibility: [],
        guitarTechniques: [],
      });
      continue;
    }

    if (secondaryRelSet.has(rel)) {
      out.set(absPc, {
        tonalRole: 'secondaryTension',
        layer: 2 as NoteLayer,
        beatLegality: 'approachOnly',
        resolveTargets: [...triadAbsTargets],
        voicingCompatibility: [],
        guitarTechniques: [],
      });
      continue;
    }

    out.set(absPc, {
      tonalRole: 'chaos',
      layer: 3 as NoteLayer,
      beatLegality: 'syncopated' as BeatLegality,
      resolveTargets: [],
      voicingCompatibility: [],
      guitarTechniques: [],
    });
  }

  return out;
}
