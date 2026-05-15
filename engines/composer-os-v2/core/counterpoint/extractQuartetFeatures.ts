import type { AbstractLineSet, CadenceTag, LineRole, LineRoleTag, NoteEvent } from './abstractLineSet';
import type {
  MotionProfile,
  PhraseCadenceStrength,
  QuartetFeatures,
  TextureClass,
  VoiceActivityProfile,
} from './quartetFeatureTypes';

const VOICE_ORDER: LineRole[] = ['soprano', 'alto', 'tenor', 'bass'];
const VOICE_IDS = ['S', 'A', 'T', 'B'] as const;

function clamp01(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

function roundKey(b: number): number {
  return Math.round(b * 1e6) / 1e6;
}

function roleToVoiceId(role: LineRole): 'S' | 'A' | 'T' | 'B' {
  const i = VOICE_ORDER.indexOf(role);
  return VOICE_IDS[i >= 0 ? i : 0];
}

function sortedVoiceEntries(
  lines: AbstractLineSet,
): Array<{ role: LineRole; notes: NoteEvent[]; tags: LineRoleTag[] }> {
  const byRole = new Map<LineRole, { role: LineRole; notes: NoteEvent[]; tags: LineRoleTag[] }>();
  for (const v of lines.voices) {
    if (!byRole.has(v.role)) {
      byRole.set(v.role, { role: v.role, notes: v.notes, tags: v.tags });
    }
  }
  const out: Array<{ role: LineRole; notes: NoteEvent[]; tags: LineRoleTag[] }> = [];
  for (const role of VOICE_ORDER) {
    const e = byRole.get(role);
    if (e) out.push(e);
  }
  return out;
}

function collectPhraseBoundaries(lines: AbstractLineSet): number[] {
  const s = new Set<number>();
  s.add(0);
  s.add(roundKey(lines.lengthBars));
  for (const v of lines.voices) {
    for (const n of v.notes) {
      s.add(roundKey(n.offsetBars));
      s.add(roundKey(n.offsetBars + n.durationBars));
    }
  }
  for (const c of lines.cadenceTags) {
    s.add(roundKey(c.positionBars));
  }
  const arr = [...s].filter((b) => b >= 0 && b <= lines.lengthBars).sort((a, b) => a - b);
  const merged: number[] = [];
  const eps = 1e-5;
  for (const b of arr) {
    if (merged.length === 0 || b - merged[merged.length - 1]! > eps) merged.push(b);
  }
  if (merged.length < 2 || merged[merged.length - 1]! < lines.lengthBars - eps) {
    if (merged[merged.length - 1]! < lines.lengthBars - eps) merged.push(lines.lengthBars);
  }
  return merged;
}

function notesOverlapping(
  notes: NoteEvent[],
  start: number,
  end: number,
): Array<{ n: NoteEvent; clipStart: number; clipEnd: number }> {
  const out: Array<{ n: NoteEvent; clipStart: number; clipEnd: number }> = [];
  for (const n of notes) {
    const ns = n.offsetBars;
    const ne = n.offsetBars + n.durationBars;
    const cs = Math.max(start, ns);
    const ce = Math.min(end, ne);
    if (ce > cs + 1e-9) out.push({ n, clipStart: cs, clipEnd: ce });
  }
  return out;
}

function cadenceStrengthAtEnd(
  cadences: CadenceTag[],
  phraseEnd: number,
  eps: number,
): PhraseCadenceStrength {
  let best: PhraseCadenceStrength = 'none';
  const rank: Record<PhraseCadenceStrength, number> = {
    none: 0,
    weak: 1,
    medium: 2,
    strong: 3,
  };
  for (const c of cadences) {
    if (Math.abs(c.positionBars - phraseEnd) <= eps) {
      const s = c.strength === 'strong' ? 'strong' : c.strength === 'medium' ? 'medium' : 'weak';
      if (rank[s] > rank[best]) best = s;
    }
  }
  return best;
}

function motionBetween(p0: number, p1: number): 'step' | 'leap' | 'same' {
  const d = Math.abs(p1 - p0);
  if (d < 0.5) return 'same';
  if (d <= 2) return 'step';
  return 'leap';
}

function buildVoiceProfile(
  voiceId: 'S' | 'A' | 'T' | 'B',
  notes: NoteEvent[],
  tags: LineRoleTag[],
  start: number,
  end: number,
  phraseLen: number,
  onsetClusters: Map<number, number>,
  allVoiceOnsets: number[][],
  selfIndex: number,
): VoiceActivityProfile {
  const overlaps = notesOverlapping(notes, start, end);
  const phraseDur = Math.max(phraseLen, 1e-9);
  let sounded = 0;
  const attacks: number[] = [];
  const pitchesAtAttack: number[] = [];
  let sustainedLong = 0;
  let midiMin = 128;
  let midiMax = -1;
  let durSum = 0;
  let noteCount = 0;

  for (const { n, clipStart, clipEnd } of overlaps) {
    const overlapLen = clipEnd - clipStart;
    sounded += overlapLen;
    const relOn = n.offsetBars;
    if (relOn >= start - 1e-9 && relOn < end - 1e-9) {
      attacks.push(roundKey(relOn));
      pitchesAtAttack.push(n.pitchMidi);
    }
    durSum += Math.min(n.durationBars, overlapLen);
    noteCount += 1;
    if (n.durationBars >= 0.75 * phraseLen || n.durationBars >= 2) sustainedLong += 1;
    midiMin = Math.min(midiMin, n.pitchMidi);
    midiMax = Math.max(midiMax, n.pitchMidi);
  }

  const restRatioSimple = clamp01(1 - sounded / phraseDur);

  let step = 0;
  let leap = 0;
  for (let i = 1; i < pitchesAtAttack.length; i++) {
    const m = motionBetween(pitchesAtAttack[i - 1]!, pitchesAtAttack[i]!);
    if (m === 'step') step++;
    else if (m === 'leap') leap++;
  }
  const mel = step + leap;
  const stepRatio = mel > 0 ? step / mel : 1;
  const leapRatio = mel > 0 ? leap / mel : 0;

  const meanNoteDurationBeats = noteCount > 0 ? durSum / noteCount : phraseDur;
  const attackRatePerBar = attacks.length / phraseDur;
  const sustainedRatio = noteCount > 0 ? sustainedLong / noteCount : 1;

  let registerCenterMidi = 60;
  let registerSpanSemitones = 0;
  if (midiMin <= midiMax) {
    registerCenterMidi = (midiMin + midiMax) / 2;
    registerSpanSemitones = midiMax - midiMin;
  }

  let coincide = 0;
  for (const t of attacks) {
    const k = roundKey(t);
    const c = onsetClusters.get(k) ?? 1;
    if (c >= 2) coincide++;
  }
  const independenceScore = clamp01(attacks.length > 0 ? 1 - coincide / attacks.length : 0.5);

  let syncWithOthers = 0;
  for (const t of attacks) {
    let otherSame = false;
    for (let j = 0; j < allVoiceOnsets.length; j++) {
      if (j === selfIndex) continue;
      if (allVoiceOnsets[j]!.some((u) => Math.abs(u - t) < 1e-4)) {
        otherSame = true;
        break;
      }
    }
    if (otherSame) syncWithOthers++;
  }
  const ensembleAlign = attacks.length > 0 ? syncWithOthers / attacks.length : 1;

  const isLead = tags.includes('melodic_lead');
  const isCounter = tags.includes('counter_melody');
  const salienceScore = clamp01(
    0.35 * (registerCenterMidi - 48) / 36 +
      0.25 * leapRatio +
      0.2 * (isLead ? 1 : 0) +
      0.15 * attackRatePerBar / 4 +
      0.05 * (isCounter ? 0.6 : 0),
  );

  return {
    voiceId,
    meanNoteDurationBeats,
    attackRatePerBar,
    restRatio: restRatioSimple,
    leapRatio: clamp01(leapRatio),
    stepRatio: clamp01(stepRatio),
    sustainedRatio: clamp01(sustainedRatio),
    registerCenterMidi,
    registerSpanSemitones,
    independenceScore,
    salienceScore: clamp01(salienceScore * (1 - 0.35 * ensembleAlign + 0.35)),
  };
}

function pitchSetAt(
  entries: Array<{ notes: NoteEvent[] }>,
  t: number,
): string {
  const pcs = new Set<number>();
  for (const { notes } of entries) {
    for (const n of notes) {
      if (n.offsetBars <= t + 1e-9 && t < n.offsetBars + n.durationBars - 1e-9) {
        pcs.add(((n.pitchMidi % 12) + 12) % 12);
      }
    }
  }
  return [...pcs].sort((a, b) => a - b).join(',');
}

function sliceTimes(start: number, end: number, step: number): number[] {
  const out: number[] = [];
  for (let t = start; t < end - 1e-9; t += step) out.push(t);
  return out;
}

function classifyTexture(
  homo: number,
  ind: number,
  imit: number,
  pedal: boolean,
  riffHint: boolean,
  punct: boolean,
): TextureClass {
  if (pedal && ind > 0.35) return 'pedal_plus_lines';
  if (imit > 0.45) return 'imitative';
  if (riffHint) return 'riff_layered';
  if (punct) return 'punctuated';
  if (homo > 0.72 && ind < 0.35) return 'chorale';
  if (homo > 0.55) return 'homorhythmic';
  if (ind > 0.55) return 'contrapuntal';
  return 'polyphonic';
}

function motionProfileFrom(stepRatioAvg: number, leapRatioAvg: number): MotionProfile {
  const s = stepRatioAvg;
  const l = leapRatioAvg;
  if (s > 0.62 && l < 0.22) return 'mostly_stepwise';
  if (l > 0.45) return 'angular';
  if (s > 0.38) return 'mixed';
  return 'mixed';
}

export function extractQuartetFeatures(lines: AbstractLineSet): QuartetFeatures[] {
  const entries = sortedVoiceEntries(lines);
  const boundaries = collectPhraseBoundaries(lines);
  const phraseSpecs: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const a = boundaries[i]!;
    const b = boundaries[i + 1]!;
    if (b - a > 1e-9) phraseSpecs.push({ start: a, end: b });
  }
  if (phraseSpecs.length === 0) phraseSpecs.push({ start: 0, end: lines.lengthBars });

  const results: QuartetFeatures[] = [];
  let phraseIndex = 0;
  for (const { start, end } of phraseSpecs) {
    const phraseLen = end - start;
    const eps = 1e-4;

    const allOnsets: number[][] = entries.map((e) =>
      e.notes
        .filter((n) => n.offsetBars >= start - eps && n.offsetBars < end - eps)
        .map((n) => roundKey(n.offsetBars)),
    );
    const onsetClusters = new Map<number, number>();
    for (const row of allOnsets) {
      for (const t of row) {
        onsetClusters.set(t, (onsetClusters.get(t) ?? 0) + 1);
      }
    }

    const voiceProfiles: VoiceActivityProfile[] = [];
    for (let vi = 0; vi < entries.length; vi++) {
      const e = entries[vi]!;
      const vid = roleToVoiceId(e.role);
      voiceProfiles.push(
        buildVoiceProfile(vid, e.notes, e.tags, start, end, phraseLen, onsetClusters, allOnsets, vi),
      );
    }
    while (voiceProfiles.length < 4) {
      const k = VOICE_IDS[voiceProfiles.length] ?? 'S';
      voiceProfiles.push({
        voiceId: k,
        meanNoteDurationBeats: phraseLen,
        attackRatePerBar: 0,
        restRatio: 1,
        leapRatio: 0,
        stepRatio: 1,
        sustainedRatio: 0,
        registerCenterMidi: 60,
        registerSpanSemitones: 0,
        independenceScore: 0,
        salienceScore: 0,
      });
    }

    const totalAttacks = allOnsets.reduce((s, r) => s + r.length, 0);
    const maxAttacksNorm = phraseLen * 4 * 8;
    const rhythmicDensity = clamp01(maxAttacksNorm > 0 ? totalAttacks / maxAttacksNorm : 0);

    let weakHits = 0;
    let attackTotal = 0;
    for (const row of allOnsets) {
      for (const t of row) {
        attackTotal++;
        const frac = ((t % 1) + 1) % 1;
        const nearDown = frac < 0.08 || frac > 0.92;
        const nearHalf = Math.abs(frac - 0.5) < 0.08;
        if (!nearDown && !nearHalf) weakHits++;
      }
    }
    const syncopationScore = attackTotal > 0 ? clamp01(weakHits / attackTotal) : 0;

    const sliceStep = Math.min(0.25, phraseLen / 8 || 0.25);
    const times = sliceTimes(start, end, sliceStep);
    let vChanges = 0;
    let prevSet = '';
    for (const t of times) {
      const set = pitchSetAt(entries, t);
      if (set !== prevSet && prevSet !== '') vChanges++;
      prevSet = set;
    }
    const slices = Math.max(1, times.length - 1);
    const verticalChangeRate = clamp01(vChanges / slices);
    const harmonicRhythmPerBar = phraseLen > 0 ? vChanges / phraseLen : 0;

    const indAvg =
      voiceProfiles.reduce((s, v) => s + v.independenceScore, 0) / Math.max(1, voiceProfiles.length);
    let homoNum = 0;
    let homoDen = 0;
    for (const t of onsetClusters.keys()) {
      const c = onsetClusters.get(t) ?? 0;
      if (c >= 2) homoNum += c;
      homoDen += c;
    }
    const homorhythmScore = homoDen > 0 ? clamp01(homoNum / homoDen) : 1;

    let imitEvents = 0;
    let imitHit = 0;
    const imap = lines.imitationMap ?? [];
    for (const ev of imap) {
      imitEvents++;
      const src = entries.find((e) => e.role === ev.sourceVoice);
      const dst = entries.find((e) => e.role === ev.imitatingVoice);
      if (!src || !dst) continue;
      const delayed = ev.delayBars;
      for (const n of src.notes) {
        const t0 = n.offsetBars;
        if (t0 < start - eps || t0 >= end - eps) continue;
        const t1 = t0 + delayed;
        const wantIc = ((ev.intervalSemitones % 12) + 12) % 12;
        const hit = dst.notes.some((m) => {
          if (Math.abs(m.offsetBars - t1) >= 0.02) return false;
          const ic = ((((m.pitchMidi - n.pitchMidi) % 12) + 12) % 12);
          return Math.abs(ic - wantIc) < 0.1;
        });
        if (hit) imitHit++;
      }
    }
    const imitationScore = imitEvents > 0 ? clamp01(imitHit / Math.max(1, imitEvents * 2)) : 0;

    const pitchesAll: number[] = [];
    for (const { notes } of entries) {
      for (const n of notesOverlapping(notes, start, end)) {
        pitchesAll.push(n.n.pitchMidi);
      }
    }
    const registralSpreadSemitones =
      pitchesAll.length > 0 ? Math.max(...pitchesAll) - Math.min(...pitchesAll) : 0;

    let crossingCount = 0;
    if (times.length >= 2) {
      for (let i = 1; i < times.length; i++) {
        const t0 = times[i - 1]!;
        const t1 = times[i]!;
        const order0: Array<{ id: string; p: number }> = [];
        const order1: Array<{ id: string; p: number }> = [];
        for (let vi = 0; vi < entries.length; vi++) {
          const e = entries[vi]!;
          const id = roleToVoiceId(e.role);
          const p0 = pitchAt(e.notes, t0);
          const p1 = pitchAt(e.notes, t1);
          if (p0 != null) order0.push({ id, p: p0 });
          if (p1 != null) order1.push({ id, p: p1 });
        }
        if (order0.length >= 2 && order1.length >= 2) {
          const rank = (o: Array<{ id: string; p: number }>) => [...o].sort((a, b) => b.p - a.p).map((x) => x.id);
          const r0 = rank(order0).join('');
          const r1 = rank(order1).join('');
          if (r0 !== r1) crossingCount++;
        }
      }
    }

    const meanP = (notes: NoteEvent[], tLo: number, tHi: number): number | null => {
      const pts: number[] = [];
      for (const n of notesOverlapping(notes, tLo, tHi)) {
        pts.push(n.n.pitchMidi);
      }
      if (pts.length === 0) return null;
      return pts.reduce((a, b) => a + b, 0) / pts.length;
    };
    const span = end - start;
    let loSeg = start;
    let hiSeg = end;
    if (span > 1e-6) {
      loSeg = start + span * 0.15;
      hiSeg = end - span * 0.15;
      if (loSeg >= hiSeg) {
        const mid = (start + end) / 2;
        loSeg = mid - span * 0.05;
        hiSeg = mid + span * 0.05;
      }
    }
    const sEntry = entries.find((e) => e.role === 'soprano') ?? entries[0];
    const bEntry = entries.find((e) => e.role === 'bass') ?? entries[entries.length - 1];
    const ms0 = sEntry ? meanP(sEntry.notes, start, loSeg) : null;
    const ms1 = sEntry ? meanP(sEntry.notes, hiSeg, end) : null;
    const mb0 = bEntry ? meanP(bEntry.notes, start, loSeg) : null;
    const mb1 = bEntry ? meanP(bEntry.notes, hiSeg, end) : null;
    let convergenceScore = 0.5;
    let divergenceScore = 0.5;
    if (ms0 != null && ms1 != null && mb0 != null && mb1 != null) {
      const outerSpread0 = ms0 - mb0;
      const outerSpread1 = ms1 - mb1;
      const d = outerSpread1 - outerSpread0;
      convergenceScore = clamp01(0.5 - d / 24);
      divergenceScore = clamp01(0.5 + d / 24);
    }

    let sustainedVoicesCount = 0;
    let activeVoicesCount = 0;
    for (const v of voiceProfiles) {
      if (v.sustainedRatio > 0.45) sustainedVoicesCount++;
      if (v.attackRatePerBar > 0.08 || v.restRatio < 0.85) activeVoicesCount++;
    }

    const pedalVoiceIds: Array<'S' | 'A' | 'T' | 'B'> = [];
    for (let vi = 0; vi < entries.length; vi++) {
      const e = entries[vi]!;
      const overlaps = notesOverlapping(e.notes, start, end);
      if (overlaps.length !== 1) continue;
      const n = overlaps[0]!.n;
      if (n.durationBars >= phraseLen - 1e-6) {
        pedalVoiceIds.push(roleToVoiceId(e.role));
      }
    }
    const pedalPresence = pedalVoiceIds.length > 0;

    const cadenceStrength = cadenceStrengthAtEnd(lines.cadenceTags, end, 0.03);
    const chordalStabilityScore = clamp01(1 - verticalChangeRate * 0.85);

    const contrapuntalIndependence = clamp01(indAvg);

    const arrivalBeatOffsets: number[] = [];
    const accentBeats: number[] = [];
    for (const row of allOnsets) {
      for (const t of row) {
        const frac = ((t % 1) + 1) % 1;
        if (frac < 0.06 || frac > 0.94) accentBeats.push(roundKey(t));
        else arrivalBeatOffsets.push(roundKey(t));
      }
    }

    const sal = [...voiceProfiles].sort((a, b) => b.salienceScore - a.salienceScore);
    const primaryLineVoiceIds = sal.slice(0, 2).map((v) => v.voiceId);
    const secondaryLineVoiceIds = sal.slice(2).map((v) => v.voiceId);

    const stepAvg = voiceProfiles.reduce((s, v) => s + v.stepRatio, 0) / voiceProfiles.length;
    const leapAvg = voiceProfiles.reduce((s, v) => s + v.leapRatio, 0) / voiceProfiles.length;
    const motionProfile: MotionProfile = motionProfileFrom(stepAvg, leapAvg);

    const textureTag = lines.textureTag?.type;
    const riffHint = textureTag === 'riff_layer' || textureTag === 'funk_grid';
    const punctHint = textureTag === 'collective_shout';

    const textureClass: TextureClass = classifyTexture(
      homorhythmScore,
      contrapuntalIndependence,
      imitationScore,
      pedalPresence,
      riffHint,
      punctHint,
    );

    results.push({
      phraseId: `phrase-${phraseIndex}`,
      startBeat: start,
      endBeat: end,
      textureClass,
      motionProfile,
      harmonicRhythmPerBar: clamp01(harmonicRhythmPerBar / 8),
      verticalChangeRate,
      rhythmicDensity,
      syncopationScore,
      contrapuntalIndependence,
      imitationScore,
      homorhythmScore,
      chordalStabilityScore,
      registralSpreadSemitones,
      crossingCount,
      convergenceScore,
      divergenceScore,
      sustainedVoicesCount,
      activeVoicesCount,
      pedalPresence,
      pedalVoiceIds,
      cadenceStrength,
      arrivalBeatOffsets,
      accentBeats,
      primaryLineVoiceIds,
      secondaryLineVoiceIds,
      voiceProfiles,
    });
    phraseIndex++;
  }

  return results;
}

function pitchAt(notes: NoteEvent[], t: number): number | null {
  for (const n of notes) {
    if (n.offsetBars <= t + 1e-9 && t < n.offsetBars + n.durationBars - 1e-9) return n.pitchMidi;
  }
  return null;
}
