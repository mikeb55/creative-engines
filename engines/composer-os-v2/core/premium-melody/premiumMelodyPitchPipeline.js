"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var premiumMelodyPitchPipeline_exports = {};
__export(premiumMelodyPitchPipeline_exports, {
  applyPremiumMelodySurfaceOrnaments: () => applyPremiumMelodySurfaceOrnaments,
  buildPremiumMelodyPitchSlotList: () => buildPremiumMelodyPitchSlotList,
  derivePremiumMelodyPhrasePlanSeed: () => derivePremiumMelodyPhrasePlanSeed,
  derivePremiumMelodyPitchSlotSeed: () => derivePremiumMelodyPitchSlotSeed,
  derivePremiumMelodySurfaceOrnamentSeed: () => derivePremiumMelodySurfaceOrnamentSeed,
  runPremiumMelodyPitchPipeline: () => runPremiumMelodyPitchPipeline
});
module.exports = __toCommonJS(premiumMelodyPitchPipeline_exports);
var import_chordSymbolAnalysis = require("../harmony/chordSymbolAnalysis");
var import_premiumMelodyPrng = require("./premiumMelodyPrng");
var import_premiumMelodyCellLibrary = require("./premiumMelodyCellLibrary");
var import_premiumMelodyPhrase = require("./premiumMelodyPhrase");
var import_premiumMelodyPitchProfile = require("./premiumMelodyPitchProfile");
function fnv1a32(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function derivePremiumMelodyPitchSlotSeed(masterSeed, slotId, pitchSeedSalt) {
  return (masterSeed ^ fnv1a32(slotId) ^ pitchSeedSalt) >>> 0;
}
function derivePremiumMelodyPhrasePlanSeed(masterSeed, pitchSeedSalt) {
  return (masterSeed ^ fnv1a32("premium_melody_phrase_plan") ^ pitchSeedSalt) >>> 0;
}
function derivePremiumMelodySurfaceOrnamentSeed(masterSeed, slotId, ornamentIndex, pitchSeedSalt) {
  return (masterSeed ^ fnv1a32(`${slotId}:${ornamentIndex}`) ^ pitchSeedSalt) >>> 0;
}
function canonicalMelodySort(notes) {
  return [...notes].sort(
    (a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat || a.midiPitch - b.midiPitch
  );
}
function buildSlotId(bar, onsetBeat, durationBeats, slotIndex) {
  return `${bar}:${onsetBeat.toFixed(4)}:${durationBeats.toFixed(4)}:${slotIndex}`;
}
function durationBucket(durationBeats) {
  if (durationBeats <= 0.25) return "staccato";
  if (durationBeats <= 0.6) return "eighth";
  if (durationBeats <= 1.1) return "quarter";
  if (durationBeats <= 2.1) return "half";
  if (durationBeats <= 3.5) return "long";
  return "rest_gap";
}
function metricalStrength(onsetBeat) {
  if ((0, import_premiumMelodyPhrase.isPremiumMelodyStrongBeat)(onsetBeat)) return "strong";
  if ((0, import_premiumMelodyPhrase.isOffbeatOnset)(onsetBeat)) return "weak";
  return "medium";
}
function harmonyRootPc(chordSymbol) {
  const parsed = (0, import_chordSymbolAnalysis.parseChordSymbol)(chordSymbol);
  const rm = parsed.harmonyPart.match(/^([A-G](?:#|b)?)/i);
  if (!rm) return 0;
  return (0, import_chordSymbolAnalysis.noteNameToPitchClass)(rm[1]) ?? 0;
}
function chordThirdPc(chordSymbol) {
  const tones = (0, import_chordSymbolAnalysis.chordTonesForChordSymbol)(chordSymbol, { lockedHarmony: true });
  return (tones.third % 12 + 12) % 12;
}
function tonalCenterPcForMode(mode, chordSymbol, cadenceResolutionPc) {
  switch (mode) {
    case "chord_root":
      return harmonyRootPc(chordSymbol);
    case "chord_third":
      return chordThirdPc(chordSymbol);
    case "mode_tonic":
      return harmonyRootPc(chordSymbol);
    case "pedal_pc":
      return (cadenceResolutionPc % 12 + 12) % 12;
    default: {
      const _exhaustive = mode;
      return harmonyRootPc(chordSymbol);
    }
  }
}
function phrasePositionKind(index, roles, ordered) {
  if (roles.phraseStarts.has(index)) return "phrase_start";
  if (roles.phraseEnds.has(index)) return "phrase_cadence";
  const phraseIdx = (0, import_premiumMelodyPhrase.indexInPhrase)(ordered, index, roles);
  const phraseLen = (0, import_premiumMelodyPhrase.phraseLengthAt)(index, roles, ordered.length);
  if (phraseLen > 2 && phraseIdx === Math.floor(phraseLen * 0.55)) return "phrase_peak";
  const prev = ordered[index - 1];
  const curr = ordered[index];
  if (prev && curr.bar > prev.bar + 1) return "phrase_rest";
  const gap = curr.bar * import_premiumMelodyCellLibrary.BEATS_PER_BAR + curr.onsetBeat - (prev.bar * import_premiumMelodyCellLibrary.BEATS_PER_BAR + prev.onsetBeat + prev.durationBeats);
  if (gap >= 1.75) return "phrase_rest";
  return "phrase_interior";
}
function slotAccent(index, roles, onsetBeat) {
  if ((0, import_premiumMelodyPhrase.isStructuralLandingIndex)(index, roles)) return "structural";
  if (roles.phraseEnds.has(index)) return "cadential";
  if ((0, import_premiumMelodyPhrase.isOffbeatOnset)(onsetBeat)) return "syncopated";
  return "none";
}
function tieState(index, ordered) {
  const curr = ordered[index];
  const prev = ordered[index - 1];
  const next = ordered[index + 1];
  if (!prev || prev.midiPitch !== curr.midiPitch) return "none";
  const prevEnd = prev.bar * import_premiumMelodyCellLibrary.BEATS_PER_BAR + prev.onsetBeat + prev.durationBeats;
  const currStart = curr.bar * import_premiumMelodyCellLibrary.BEATS_PER_BAR + curr.onsetBeat;
  if (currStart > prevEnd + 0.05) return "none";
  const continues = next != null && next.midiPitch === curr.midiPitch && next.bar * import_premiumMelodyCellLibrary.BEATS_PER_BAR + next.onsetBeat <= currStart + curr.durationBeats + 0.05;
  if (continues && index > 0 && ordered[index - 1].midiPitch === curr.midiPitch) {
    return "tie_continue";
  }
  if (continues) return "tie_start";
  if (prev.midiPitch === curr.midiPitch) return "tie_end";
  return "none";
}
function noteRole(phrasePosition, bucket) {
  if (phrasePosition === "phrase_rest" || bucket === "rest_gap") return "rest_placeholder";
  if (phrasePosition === "phrase_start" || phrasePosition === "phrase_cadence") return "anchor";
  if (phrasePosition === "phrase_peak") return "appoggiatura_target";
  return "passing";
}
function chordSixthPc(chordSymbol) {
  const tones = (0, import_chordSymbolAnalysis.chordTonesForChordSymbol)(chordSymbol, { lockedHarmony: true });
  return (tones.root + 9) % 12;
}
function chordFitRole(midi, chordSymbol) {
  const tones = (0, import_chordSymbolAnalysis.chordTonesForChordSymbol)(chordSymbol, { lockedHarmony: true });
  const pc = (midi % 12 + 12) % 12;
  if (pc === tones.root % 12) return "root";
  if (pc === tones.third % 12) return "third";
  if (pc === tones.fifth % 12) return "fifth";
  if (pc === chordSixthPc(chordSymbol)) return "sixth";
  if (pc === tones.seventh % 12) return "seventh";
  const ninth = (tones.root + 2) % 12;
  const eleventh = (tones.third + 2) % 12;
  const thirteenth = (tones.fifth + 2) % 12;
  if (pc === ninth) return "ninth";
  if (pc === eleventh) return "eleventh";
  if (pc === thirteenth) return "thirteenth";
  if (pc === (tones.root + 1) % 12) return "avoid";
  return "extension";
}
function chordToneRank(midi, chordSymbol) {
  const role = chordFitRole(midi, chordSymbol);
  switch (role) {
    case "root":
      return 0;
    case "third":
    case "seventh":
      return 1;
    case "fifth":
    case "sixth":
    case "ninth":
      return 2;
    case "eleventh":
    case "thirteenth":
    case "extension":
      return 3;
    case "avoid":
      return 4;
    default: {
      const _exhaustive = role;
      return 4;
    }
  }
}
function chordFitMultiplier(role, vector) {
  switch (role) {
    case "root":
      return vector.root;
    case "third":
      return vector.third;
    case "fifth":
      return vector.fifth;
    case "sixth":
      return vector.sixth ?? vector.extension;
    case "seventh":
      return vector.seventh;
    case "ninth":
      return vector.ninth;
    case "eleventh":
      return vector.eleventh;
    case "thirteenth":
      return vector.thirteenth;
    case "extension":
      return vector.extension;
    case "avoid":
      return vector.avoid;
    default: {
      const _exhaustive = role;
      return 1;
    }
  }
}
function isTonicMajorChordHeuristic(chordSymbol) {
  const s = chordSymbol.replace(/\s/g, "");
  if (/maj6|maj69|maj7|maj9|maj11|MAJ7|MAJ9|Maj7|Maj9|\^|Δ/i.test(s)) return true;
  if (/^[A-G][#b]?6$/.test(s)) return true;
  if (/^[A-G][#b]?$/.test(s)) return true;
  if (/^[A-G][#b]?M(?!7|-)/.test(s)) return true;
  return false;
}
function isFunctionalChordHeuristic(chordSymbol) {
  return !isTonicMajorChordHeuristic(chordSymbol);
}
function resolveActiveChordFitVector(scorer, chordSymbol) {
  if (scorer.chordFitVectorFunctional != null && scorer.chordFitVectorTonicMajor != null) {
    return isFunctionalChordHeuristic(chordSymbol) ? scorer.chordFitVectorFunctional : scorer.chordFitVectorTonicMajor;
  }
  return scorer.chordFitVector;
}
function pcCircleDistance(a, b) {
  const d = Math.abs((a % 12 + 12) % 12 - (b % 12 + 12) % 12);
  return Math.min(d, 12 - d);
}
function nearestMidiToGuidePc(midi, guidePc, minMidi, maxMidi) {
  const octave = Math.floor(midi / 12);
  let best = midi;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let o = octave - 2; o <= octave + 2; o++) {
    const candidate = o * 12 + guidePc;
    if (candidate < minMidi || candidate > maxMidi) continue;
    const dist = Math.abs(candidate - midi);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best;
}
function pitchV2AnyEnabled(pitchProfile) {
  return pitchProfile.guideTone?.enabled === true || pitchProfile.climaxArc?.enabled === true || pitchProfile.approachPattern?.enabled === true;
}
function derivePitchV2PrePassSeed(normalizedSeed, pitchSeedSalt) {
  return (normalizedSeed ^ fnv1a32("premium_melody_pitch_v2_prepass") ^ pitchSeedSalt) >>> 0;
}
function primaryGuideCandidates(chordSymbol) {
  const thirdPc = chordThirdPc(chordSymbol);
  const seventhPc = ((0, import_chordSymbolAnalysis.chordTonesForChordSymbol)(chordSymbol, { lockedHarmony: true }).seventh % 12 + 12) % 12;
  return [thirdPc, seventhPc];
}
function secondaryGuidePc(chordSymbol, primaryPc) {
  const tones = (0, import_chordSymbolAnalysis.chordTonesForChordSymbol)(chordSymbol, { lockedHarmony: true });
  const root = tones.root % 12;
  const candidates = [chordSixthPc(chordSymbol), (root + 2) % 12, (tones.fifth + 2) % 12];
  let best = candidates[0];
  let bestDist = pcCircleDistance(primaryPc, best);
  for (let i = 1; i < candidates.length; i++) {
    const d = pcCircleDistance(primaryPc, candidates[i]);
    if (d > bestDist) {
      bestDist = d;
      best = candidates[i];
    }
  }
  return best;
}
function optimizeGuideTonePrimaryLine(chordSymbols, startHintPc) {
  if (chordSymbols.length === 0) return [];
  const choices = chordSymbols.map((sym) => primaryGuideCandidates(sym));
  const dp = [];
  for (let i = 0; i < choices.length; i++) {
    dp[i] = [0, 0];
    for (let j = 0; j < 2; j++) {
      const pc = choices[i][j];
      if (i === 0) {
        dp[i][j] = startHintPc != null ? pcCircleDistance(pc, startHintPc) : 0;
        continue;
      }
      let best = Number.POSITIVE_INFINITY;
      for (let k = 0; k < 2; k++) {
        const prevPc = choices[i - 1][k];
        const leap = pcCircleDistance(prevPc, pc);
        const cost = leap + (leap > 4 ? 0.5 : 0);
        best = Math.min(best, dp[i - 1][k] + cost);
      }
      dp[i][j] = best;
    }
  }
  const out = new Array(chordSymbols.length);
  let pick = dp[choices.length - 1][0] <= dp[choices.length - 1][1] ? 0 : 1;
  for (let i = choices.length - 1; i >= 0; i--) {
    out[i] = choices[i][pick];
    if (i > 0) {
      let bestK = 0;
      let bestCost = Number.POSITIVE_INFINITY;
      for (let k = 0; k < 2; k++) {
        const prevPc = choices[i - 1][k];
        const leap = pcCircleDistance(prevPc, out[i]);
        const cost = dp[i - 1][k] + leap + (leap > 4 ? 0.5 : 0);
        if (cost < bestCost) {
          bestCost = cost;
          bestK = k;
        }
      }
      pick = bestK;
    }
  }
  return out;
}
function pickApproachPattern(rand, length) {
  const lenRoll = rand();
  const L = lenRoll < 0.2 ? 2 : lenRoll < 0.7 ? 3 : 4;
  const useLen = Math.min(L, length);
  const kindRoll = rand();
  let kind;
  if (kindRoll < 0.4) {
    kind = rand() < 0.5 ? "half_step_below_short" : "half_step_below_long";
  } else if (kindRoll < 0.7) {
    kind = rand() < 0.5 ? "enclosure_below_above_short" : "enclosure_below_above_long";
  } else if (kindRoll < 0.9) {
    kind = "enclosure_above_below";
  } else {
    kind = "diatonic_run";
  }
  const patternMap = {
    half_step_below_short: [-1],
    half_step_below_long: [-3, -1],
    enclosure_below_above_short: [-1, 1],
    enclosure_below_above_long: [-1, -2],
    enclosure_above_below: [1, -1],
    diatonic_run: [-3, -2, -1]
  };
  let offsets = [...patternMap[kind]];
  if (offsets.length > useLen - 1) {
    offsets = offsets.slice(offsets.length - (useLen - 1));
  }
  while (offsets.length < useLen - 1) {
    offsets.unshift(offsets[0] - 1);
  }
  return { offsets };
}
function runPitchV2PhrasePrePass(ordered, roles, slots, pitchProfile, normalizedSeed, options) {
  const overlays = ordered.map(() => ({}));
  if (!pitchV2AnyEnabled(pitchProfile)) return overlays;
  const rand = (0, import_premiumMelodyPrng.mulberry32)(derivePitchV2PrePassSeed(normalizedSeed, pitchProfile.pitchSeedSalt));
  const phraseStarts = [...roles.phraseStarts].sort((a, b) => a - b);
  for (let pi = 0; pi < phraseStarts.length; pi++) {
    const start = phraseStarts[pi];
    const end = pi + 1 < phraseStarts.length ? phraseStarts[pi + 1] - 1 : ordered.length - 1;
    const phraseIndices = [];
    for (let i = start; i <= end; i++) phraseIndices.push(i);
    const N = phraseIndices.length;
    if (N === 0) continue;
    if (pitchProfile.guideTone?.enabled === true) {
      const chordSymbols = [];
      const chordStartIdx = [];
      for (const idx of phraseIndices) {
        const sym = resolveHarmonySymbol(ordered[idx].bar, options?.harmonyByBar);
        if (chordSymbols.length === 0 || chordSymbols[chordSymbols.length - 1] !== sym) {
          chordSymbols.push(sym);
          chordStartIdx.push(idx);
        }
      }
      const startHint = start > 0 ? ordered[start - 1].midiPitch % 12 : ordered[start].midiPitch % 12;
      const primaryLine = optimizeGuideTonePrimaryLine(chordSymbols, startHint);
      for (let ci = 0; ci < chordSymbols.length; ci++) {
        const sym = chordSymbols[ci];
        const primaryPc = primaryLine[ci];
        const secondaryPc = secondaryGuidePc(sym, primaryPc);
        const from = chordStartIdx[ci];
        const to = ci + 1 < chordStartIdx.length ? chordStartIdx[ci + 1] - 1 : end;
        for (let idx = from; idx <= to; idx++) {
          overlays[idx].guideTonePc = primaryPc;
          overlays[idx].secondaryGuideTonePc = secondaryPc;
        }
      }
    }
    if (pitchProfile.climaxArc?.enabled === true) {
      const jitter = rand() * 0.1 - 0.05;
      const cLocal = Math.max(0, Math.min(N - 1, Math.round((0.65 + jitter) * N)));
      const climaxGlobalIdx = phraseIndices[cLocal];
      const planner = pitchProfile.phrasePlanner;
      const R = (planner.registerMinMidi + planner.registerMaxMidi) / 2;
      const H = (planner.registerMaxMidi - planner.registerMinMidi) / 2;
      let phraseMin = Number.POSITIVE_INFINITY;
      for (const idx of phraseIndices) {
        phraseMin = Math.min(phraseMin, slots[idx].registerBandMinMidi);
      }
      for (let li = 0; li < phraseIndices.length; li++) {
        const idx = phraseIndices[li];
        const denom = Math.max(1, cLocal);
        const arc = cLocal === 0 ? R : R + H * (1 - Math.pow((li - cLocal) / denom, 2));
        let ideal = Math.round(
          Math.max(planner.registerMinMidi, Math.min(planner.registerMaxMidi, arc))
        );
        if (li === cLocal) {
          ideal = Math.max(ideal, Math.round(R + 6), Math.round(phraseMin + 9));
        }
        overlays[idx].idealPitchMidi = ideal;
        overlays[idx].climaxSlotIndex = climaxGlobalIdx;
      }
    }
  }
  for (let i = 0; i < ordered.length; i++) {
    const sym = resolveHarmonySymbol(ordered[i].bar, options?.harmonyByBar);
    const prevSym = i > 0 ? resolveHarmonySymbol(ordered[i - 1].bar, options?.harmonyByBar) : null;
    if (i === 0 || sym !== prevSym) {
      overlays[i].isChordBoundary = true;
    }
  }
  if (pitchProfile.approachPattern?.enabled === true) {
    const rate = pitchProfile.slotScorer.approachPatternRate ?? 0.6;
    for (let i = 0; i < ordered.length; i++) {
      if (!overlays[i].isChordBoundary) continue;
      if (slots[i].noteRole === "rest_placeholder") continue;
      if (rand() >= rate) continue;
      const lenRoll = rand();
      const L = lenRoll < 0.2 ? 2 : lenRoll < 0.7 ? 3 : 4;
      const firstIntermediate = i - (L - 1);
      if (firstIntermediate < 0) continue;
      let valid = true;
      for (let j = firstIntermediate; j < i; j++) {
        if (slots[j].noteRole === "rest_placeholder") {
          valid = false;
          break;
        }
      }
      if (!valid) continue;
      const { offsets } = pickApproachPattern(rand, L);
      for (let k = 0; k < offsets.length; k++) {
        const idx = i - offsets.length + k;
        if (overlays[idx].approachWindowRole === "target") {
          valid = false;
          break;
        }
      }
      if (!valid) continue;
      overlays[i].approachWindowRole = "target";
      overlays[i].isApproachTarget = true;
      overlays[i].approachTargetSlotIndex = i;
      for (let k = 0; k < offsets.length; k++) {
        const idx = i - offsets.length + k;
        overlays[idx].approachWindowRole = "intermediate";
        overlays[idx].approachTargetSlotIndex = i;
        overlays[idx].approachPatternOffsetSemitones = offsets[k];
      }
    }
  }
  return overlays;
}
function intervalSemitones(a, b) {
  return Math.abs(b - a);
}
function intervalWeight(semitones, table) {
  const clamped = Math.min(12, Math.max(1, semitones));
  const key = clamped;
  return table[key] ?? (semitones >= 8 ? 0.4 : 1);
}
function contourTargetDeltaForArc(arc, progress) {
  const p = Math.max(0, Math.min(1, progress));
  switch (arc) {
    case "arch":
      return Math.round(6 * Math.sin(p * Math.PI) - 3);
    case "ascending":
      return Math.round(p * 5);
    case "wave":
      return Math.round(3 * Math.sin(p * Math.PI * 2));
    case "modal_float":
      return Math.round(2 * Math.sin(p * Math.PI * 0.75));
    case "angular":
      return p > 0.45 && p < 0.55 ? 7 : Math.round(2 * Math.sin(p * Math.PI));
    default: {
      const _exhaustive = arc;
      return 0;
    }
  }
}
function resolveHarmonySymbol(bar, harmonyByBar) {
  return harmonyByBar?.[bar] ?? harmonyByBar?.[bar - 1] ?? "Cmaj9";
}
function planPremiumMelodyPhraseTargets(ordered, roles, planner, normalizedSeed, pitchSeedSalt, options) {
  const rand = (0, import_premiumMelodyPrng.mulberry32)(derivePremiumMelodyPhrasePlanSeed(normalizedSeed, pitchSeedSalt));
  const out = [];
  for (let index = 0; index < ordered.length; index++) {
    const note = ordered[index];
    const chordSymbol = resolveHarmonySymbol(note.bar, options?.harmonyByBar);
    const phraseIdx = (0, import_premiumMelodyPhrase.indexInPhrase)(ordered, index, roles);
    const phraseLen = (0, import_premiumMelodyPhrase.phraseLengthAt)(index, roles, ordered.length);
    const progress = phraseLen > 1 ? phraseIdx / (phraseLen - 1) : 0;
    const tonalCenterPc = tonalCenterPcForMode(
      planner.tonalCenterMode,
      chordSymbol,
      planner.cadenceResolutionPc
    );
    let cadenceTargetPc = null;
    if (roles.phraseEnds.has(index)) {
      const thirdPc = chordThirdPc(chordSymbol);
      const seventhPc = ((0, import_chordSymbolAnalysis.chordTonesForChordSymbol)(chordSymbol, { lockedHarmony: true }).seventh % 12 + 12) % 12;
      const prevPitch = index > 0 ? ordered[index - 1].midiPitch : note.midiPitch;
      cadenceTargetPc = Math.abs(prevPitch % 12 - thirdPc) <= Math.abs(prevPitch % 12 - seventhPc) ? thirdPc : seventhPc;
    }
    const registerJitter = Math.floor(rand() * 3) - 1;
    out.push({
      tonalCenterPc,
      registerBandMinMidi: Math.max(0, planner.registerMinMidi + registerJitter),
      registerBandMaxMidi: Math.min(127, planner.registerMaxMidi + registerJitter),
      contourTargetDelta: contourTargetDeltaForArc(planner.contourArc, progress),
      cadenceTargetPc
    });
  }
  return out;
}
function buildPremiumMelodyPitchSlotList(rhythmMelody, pitchProfile, profile, normalizedSeed, options) {
  const ordered = canonicalMelodySort(rhythmMelody);
  const roles = (0, import_premiumMelodyPhrase.detectPhraseRoles)(ordered, {
    restPhraseBreakBeats: profile.restPhraseBreakBeats,
    longNotePhraseBreakBeats: profile.longNotePhraseBreakBeats
  });
  const planned = planPremiumMelodyPhraseTargets(
    ordered,
    roles,
    pitchProfile.phrasePlanner,
    normalizedSeed,
    pitchProfile.pitchSeedSalt,
    options
  );
  const slots = [];
  for (let slotIndex = 0; slotIndex < ordered.length; slotIndex++) {
    const note = ordered[slotIndex];
    const chordSymbol = resolveHarmonySymbol(note.bar, options?.harmonyByBar);
    const durBucket = durationBucket(note.durationBeats);
    const phrasePos = phrasePositionKind(slotIndex, roles, ordered);
    const plan = planned[slotIndex];
    slots.push({
      slotId: buildSlotId(note.bar, note.onsetBeat, note.durationBeats, slotIndex),
      slotIndex,
      bar: note.bar,
      onsetBeat: note.onsetBeat,
      durationBeats: note.durationBeats,
      metricalStrength: metricalStrength(note.onsetBeat),
      durationBucket: durBucket,
      accent: slotAccent(slotIndex, roles, note.onsetBeat),
      phrasePosition: phrasePos,
      tieState: tieState(slotIndex, ordered),
      noteRole: noteRole(phrasePos, durBucket),
      harmonyChordSymbol: chordSymbol,
      harmonyRootPc: harmonyRootPc(chordSymbol),
      tonalCenterPc: plan.tonalCenterPc,
      registerBandMinMidi: plan.registerBandMinMidi,
      registerBandMaxMidi: plan.registerBandMaxMidi,
      contourTargetDelta: plan.contourTargetDelta,
      cadenceTargetPc: plan.cadenceTargetPc,
      importMidiPitch: note.midiPitch
    });
  }
  const v2Overlays = runPitchV2PhrasePrePass(
    ordered,
    roles,
    slots,
    pitchProfile,
    normalizedSeed,
    options
  );
  for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
    const overlay = v2Overlays[slotIndex];
    const slot = slots[slotIndex];
    if (overlay.guideTonePc != null) slot.guideTonePc = overlay.guideTonePc;
    if (overlay.secondaryGuideTonePc != null) slot.secondaryGuideTonePc = overlay.secondaryGuideTonePc;
    if (overlay.idealPitchMidi != null) slot.idealPitchMidi = overlay.idealPitchMidi;
    if (overlay.climaxSlotIndex != null) slot.climaxSlotIndex = overlay.climaxSlotIndex;
    if (overlay.isApproachTarget != null) slot.isApproachTarget = overlay.isApproachTarget;
    if (overlay.approachWindowRole != null) slot.approachWindowRole = overlay.approachWindowRole;
    if (overlay.approachTargetSlotIndex != null) {
      slot.approachTargetSlotIndex = overlay.approachTargetSlotIndex;
    }
    if (overlay.approachPatternOffsetSemitones != null) {
      slot.approachPatternOffsetSemitones = overlay.approachPatternOffsetSemitones;
    }
    if (overlay.isChordBoundary != null) slot.isChordBoundary = overlay.isChordBoundary;
  }
  return slots;
}
function passesHardFilters(midi, prevMidi, slot, scorer, pitchProfile) {
  if (midi < slot.registerBandMinMidi || midi > slot.registerBandMaxMidi) return false;
  let maxLeap = scorer.maxLeapSemitones;
  if (pitchProfile?.climaxArc?.enabled === true && slot.climaxSlotIndex != null && slot.slotIndex <= slot.climaxSlotIndex && slot.climaxSlotIndex - slot.slotIndex <= 1) {
    maxLeap = Math.min(maxLeap, pitchProfile.climaxArc.climaxMaxLeapSemitones ?? 5);
  }
  if (prevMidi != null && intervalSemitones(prevMidi, midi) > maxLeap) return false;
  if (chordFitRole(midi, slot.harmonyChordSymbol) === "avoid") return false;
  if (slot.approachWindowRole === "intermediate" && slot.guideTonePc != null) {
    const guideMidi = nearestMidiToGuidePc(
      midi,
      slot.guideTonePc,
      slot.registerBandMinMidi,
      slot.registerBandMaxMidi
    );
    if (Math.abs(midi - guideMidi) > 7) return false;
  }
  return true;
}
function enumerateCandidates(slot, scorer, prevMidi, globalMin, globalMax, pitchProfile) {
  const candidateMinMidi = Math.max(slot.registerBandMinMidi, globalMin);
  const candidateMaxMidi = Math.min(slot.registerBandMaxMidi, globalMax);
  const raw = [];
  for (let midi = candidateMinMidi; midi <= candidateMaxMidi; midi++) {
    if (!passesHardFilters(midi, prevMidi, slot, scorer, pitchProfile)) continue;
    const rank = chordToneRank(midi, slot.harmonyChordSymbol);
    if (rank === 4) continue;
    raw.push({ midi, chordToneRank: rank });
  }
  if (!raw.some((c) => c.chordToneRank <= 3)) {
    for (let midi = candidateMinMidi; midi <= candidateMaxMidi; midi++) {
      if (!passesHardFilters(midi, prevMidi, slot, scorer, pitchProfile)) continue;
      raw.push({ midi, chordToneRank: chordToneRank(midi, slot.harmonyChordSymbol) });
    }
  }
  raw.sort((a, b) => a.chordToneRank - b.chordToneRank || a.midi - b.midi);
  return raw;
}
function composerRuleMultiplier(midi, prevMidi, slot, signatureRules) {
  if (prevMidi == null) return 1;
  let mult = 1;
  const interval = intervalSemitones(prevMidi, midi);
  const currPc = midi % 12;
  if (signatureRules.includes("be_voice_leading")) {
    if (interval === 5 || interval === 7) mult *= 0.2;
    const thirdPc = chordThirdPc(slot.harmonyChordSymbol);
    const seventhPc = ((0, import_chordSymbolAnalysis.chordTonesForChordSymbol)(slot.harmonyChordSymbol, { lockedHarmony: true }).seventh % 12 + 12) % 12;
    if (interval <= 2 && (currPc === thirdPc || currPc === seventhPc)) mult *= 1.35;
  }
  if (signatureRules.includes("ws_modal_pivot")) {
    if (slot.metricalStrength === "weak" && interval >= 6) {
      const modePcs = [
        (slot.tonalCenterPc + 3) % 12,
        (slot.tonalCenterPc + 4) % 12,
        (slot.tonalCenterPc + 8) % 12
      ];
      if (modePcs.includes(currPc)) mult *= 1.45;
    }
    if (slot.metricalStrength === "strong" && interval <= 2) mult *= 0.85;
  }
  return mult;
}
function scoreCandidate(midi, prevMidi, slot, scorer, signatureRules, leapRecoveryActive, options) {
  const interval = prevMidi != null ? intervalSemitones(prevMidi, midi) : 1;
  const intervalFactor = intervalWeight(interval, scorer.intervalPreference);
  let prevIntervalFactor = 1;
  if (prevMidi != null && leapRecoveryActive && interval <= 2) prevIntervalFactor = 1.3;
  const role = chordFitRole(midi, slot.harmonyChordSymbol);
  const chordFit = chordFitMultiplier(role, resolveActiveChordFitVector(scorer, slot.harmonyChordSymbol));
  let metric = 1;
  if (slot.metricalStrength === "strong" && interval <= 2) metric *= 1.2;
  if (slot.metricalStrength === "weak" && (role === "third" || role === "seventh")) metric *= 1.15;
  const midRegister = (slot.registerBandMinMidi + slot.registerBandMaxMidi) / 2;
  const rangeDist = Math.abs(midi - midRegister) / Math.max(1, slot.registerBandMaxMidi - slot.registerBandMinMidi);
  const range = 1.1 - rangeDist * 0.3;
  let contour = 1;
  if (prevMidi != null) {
    const delta = midi - prevMidi;
    if (Math.abs(delta - slot.contourTargetDelta) <= 1) contour *= 1.25;
    if (slot.cadenceTargetPc != null) {
      const pc = midi % 12;
      const cadenceDist = Math.min(
        Math.abs(pc - slot.cadenceTargetPc),
        12 - Math.abs(pc - slot.cadenceTargetPc)
      );
      if (cadenceDist <= 2) contour *= 1.5;
    }
  }
  const composerRules = composerRuleMultiplier(midi, prevMidi, slot, signatureRules);
  const contourWeight = scorer.localContourWeight ?? scorer.weightContour;
  let guideToneProximity = 1;
  if (scorer.weightGuideToneProximity != null && slot.guideTonePc != null) {
    const guideMidi = nearestMidiToGuidePc(
      midi,
      slot.guideTonePc,
      slot.registerBandMinMidi,
      slot.registerBandMaxMidi
    );
    guideToneProximity = Math.exp(-Math.pow(midi - guideMidi, 2) / (2 * 2 * 2));
  }
  let guideToneHit = 1;
  if (slot.guideTonePc != null && scorer.weightGuideToneProximity != null) {
    const pc = (midi % 12 + 12) % 12;
    if (pc === slot.guideTonePc) guideToneHit = 1.5;
    else if (slot.secondaryGuideTonePc != null && pc === slot.secondaryGuideTonePc) guideToneHit = 1.3;
  }
  let targetChordTone = 1;
  if (slot.isApproachTarget === true) {
    if (role === "third" || role === "seventh" || role === "ninth" || role === "thirteenth") {
      targetChordTone = 1.4;
    } else if (role === "root" || role === "fifth") {
      targetChordTone = 1.1;
    }
  }
  let phraseArc = 1;
  if (scorer.weightPhraseArc != null && slot.idealPitchMidi != null) {
    phraseArc = Math.exp(-Math.pow(midi - slot.idealPitchMidi, 2) / (2 * 3 * 3));
    if (slot.climaxSlotIndex != null && slot.slotIndex > slot.climaxSlotIndex && midi > slot.idealPitchMidi) {
      phraseArc *= 0.85;
    }
  }
  if (options?.approachIdealMidi != null) {
    const dist = Math.abs(midi - options.approachIdealMidi);
    phraseArc *= Math.exp(-(dist * dist) / (2 * 1.5 * 1.5));
  }
  let product = Math.pow(intervalFactor, scorer.weightInterval) * Math.pow(prevIntervalFactor, scorer.weightPrevInterval) * Math.pow(chordFit, scorer.weightChordFit) * Math.pow(metric, scorer.weightMetric) * Math.pow(range, scorer.weightRange) * Math.pow(contour, contourWeight) * Math.pow(composerRules, scorer.weightComposerRules);
  if (scorer.weightGuideToneProximity != null) {
    product *= Math.pow(guideToneProximity, scorer.weightGuideToneProximity) * guideToneHit;
  }
  if (slot.isApproachTarget === true && scorer.approachPatternRate != null) {
    product *= targetChordTone;
  }
  if (scorer.weightPhraseArc != null) {
    product *= Math.pow(phraseArc, scorer.weightPhraseArc);
  }
  return product;
}
function weightedPickMidi(candidates, temperature, rand) {
  const scored = [...candidates].sort((a, b) => b.score - a.score);
  const topScore = scored[0].score;
  const invTemp = 1 / Math.max(0.01, temperature);
  let total = 0;
  const weights = scored.map((c) => {
    const w = Math.pow(Math.max(c.score, 1e-6), invTemp);
    total += w;
    return w;
  });
  let r = rand() * total;
  for (let i = 0; i < scored.length; i++) {
    r -= weights[i];
    if (r <= 0) return { midi: scored[i].midi, rank: i, topScore };
  }
  return { midi: scored[scored.length - 1].midi, rank: scored.length - 1, topScore };
}
function fallbackMidi(slot, scorer, pitchProfile) {
  const candidates = enumerateCandidates(
    slot,
    scorer,
    null,
    slot.registerBandMinMidi,
    slot.registerBandMaxMidi,
    pitchProfile
  );
  const rank0 = candidates.find((c) => c.chordToneRank === 0);
  if (rank0) return rank0.midi;
  const tonalMidi = Math.max(
    slot.registerBandMinMidi,
    Math.min(slot.registerBandMaxMidi, slot.registerBandMinMidi + slot.tonalCenterPc)
  );
  return candidates.length > 0 ? candidates[0].midi : tonalMidi;
}
function pickSlotMidi(note, slot, prevMidi, leapRecoverySlots, pitchProfile, normalizedSeed, constraints) {
  const scorer = pitchProfile.slotScorer;
  const globalMin = pitchProfile.phrasePlanner.registerMinMidi;
  const globalMax = pitchProfile.phrasePlanner.registerMaxMidi;
  if (slot.noteRole === "rest_placeholder") {
    return {
      chosenMidi: note.midiPitch,
      chosenRank: 0,
      topScore: 0,
      candidateCount: 0
    };
  }
  const leapRecoveryActive = leapRecoverySlots > 0;
  let candidates = enumerateCandidates(
    slot,
    scorer,
    prevMidi,
    globalMin,
    globalMax,
    pitchProfile
  );
  if (constraints?.minMidi != null) {
    candidates = candidates.filter((c) => c.midi >= constraints.minMidi);
  }
  if (constraints?.maxMidi != null) {
    candidates = candidates.filter((c) => c.midi <= constraints.maxMidi);
  }
  const candidateCount = candidates.length;
  if (candidateCount === 0) {
    return {
      chosenMidi: fallbackMidi(slot, scorer, pitchProfile),
      chosenRank: 0,
      topScore: 0,
      candidateCount: 0
    };
  }
  const rand = (0, import_premiumMelodyPrng.mulberry32)(
    derivePremiumMelodyPitchSlotSeed(normalizedSeed, slot.slotId, pitchProfile.pitchSeedSalt)
  );
  const scored = candidates.map((c) => ({
    midi: c.midi,
    score: scoreCandidate(
      c.midi,
      prevMidi,
      slot,
      scorer,
      pitchProfile.signatureRules,
      leapRecoveryActive,
      constraints?.approachIdealMidi != null ? { approachIdealMidi: constraints.approachIdealMidi } : void 0
    )
  }));
  const pick = weightedPickMidi(scored, scorer.temperature, rand);
  return {
    chosenMidi: pick.midi,
    chosenRank: pick.rank,
    topScore: pick.topScore,
    candidateCount
  };
}
function repairClimaxSlotPicks(ordered, slots, picks, pitchProfile, normalizedSeed) {
  if (pitchProfile.climaxArc?.enabled !== true) return;
  const climaxIndices = [
    ...new Set(
      slots.filter((s) => s.climaxSlotIndex != null && s.slotIndex === s.climaxSlotIndex).map((s) => s.slotIndex)
    )
  ];
  for (const climaxIdx of climaxIndices) {
    const phraseSlots = slots.filter((s) => s.climaxSlotIndex === climaxIdx);
    const otherMidis = [];
    for (const s of phraseSlots) {
      if (s.slotIndex === climaxIdx || s.noteRole === "rest_placeholder") continue;
      const p = picks[s.slotIndex];
      if (p != null) otherMidis.push(p.chosenMidi);
      else if (s.idealPitchMidi != null) otherMidis.push(s.idealPitchMidi);
    }
    if (otherMidis.length === 0) continue;
    const phraseMean = otherMidis.reduce((a, b) => a + b, 0) / otherMidis.length;
    const phraseMin = Math.min(...otherMidis);
    const floorMidi = Math.max(Math.ceil(phraseMean + 6), Math.ceil(phraseMin + 9));
    const climaxSlot = slots[climaxIdx];
    let chainPrev = null;
    for (let j = climaxIdx - 1; j >= 0; j--) {
      if (picks[j] != null) {
        chainPrev = picks[j].chosenMidi;
        break;
      }
    }
    picks[climaxIdx] = pickSlotMidi(
      ordered[climaxIdx],
      climaxSlot,
      chainPrev,
      0,
      pitchProfile,
      normalizedSeed,
      { minMidi: floorMidi }
    );
    const climaxMidi = picks[climaxIdx].chosenMidi;
    for (const neighborOffset of [-1, 1]) {
      const ni = climaxIdx + neighborOffset;
      if (ni < 0 || ni >= slots.length) continue;
      const nSlot = slots[ni];
      if (nSlot.climaxSlotIndex !== climaxIdx) continue;
      if (nSlot.approachWindowRole === "intermediate") continue;
      const nPick = picks[ni];
      if (nPick == null || nPick.chosenMidi <= climaxMidi - 2) continue;
      let nPrev = null;
      for (let j = ni - 1; j >= 0; j--) {
        if (picks[j] != null && j !== climaxIdx) {
          nPrev = picks[j].chosenMidi;
          break;
        }
      }
      picks[ni] = pickSlotMidi(
        ordered[ni],
        nSlot,
        nPrev,
        0,
        pitchProfile,
        normalizedSeed,
        { maxMidi: climaxMidi - 2 }
      );
    }
  }
}
function scoreAndAssignPremiumMelodyPitches(ordered, slots, pitchProfile, normalizedSeed) {
  const scorer = pitchProfile.slotScorer;
  const picks = new Array(ordered.length);
  let prevMidi = null;
  let leapRecoverySlots = 0;
  for (let i = 0; i < ordered.length; i++) {
    const slot = slots[i];
    if (slot.approachWindowRole === "intermediate") continue;
    const note = ordered[i];
    const pick = pickSlotMidi(note, slot, prevMidi, leapRecoverySlots, pitchProfile, normalizedSeed);
    picks[i] = pick;
    if (slot.noteRole !== "rest_placeholder") {
      if (prevMidi != null && intervalSemitones(prevMidi, pick.chosenMidi) > 5) {
        leapRecoverySlots = scorer.leapRecoveryBars;
      } else if (leapRecoverySlots > 0) {
        leapRecoverySlots--;
      }
      prevMidi = pick.chosenMidi;
    } else {
      prevMidi = pick.chosenMidi;
    }
  }
  repairClimaxSlotPicks(ordered, slots, picks, pitchProfile, normalizedSeed);
  for (let i = 0; i < ordered.length; i++) {
    const slot = slots[i];
    if (slot.approachWindowRole !== "intermediate") continue;
    const note = ordered[i];
    const targetIdx = slot.approachTargetSlotIndex;
    if (picks[targetIdx] == null) {
      const targetSlot = slots[targetIdx];
      let targetPrev = null;
      for (let j = targetIdx - 1; j >= 0; j--) {
        if (picks[j] != null) {
          targetPrev = picks[j].chosenMidi;
          break;
        }
      }
      picks[targetIdx] = pickSlotMidi(
        ordered[targetIdx],
        targetSlot,
        targetPrev,
        0,
        pitchProfile,
        normalizedSeed
      );
    }
    const targetMidi = picks[targetIdx].chosenMidi;
    const idealMidi = targetMidi + (slot.approachPatternOffsetSemitones ?? 0);
    let chainPrev = null;
    for (let j = i - 1; j >= 0; j--) {
      if (picks[j] != null) {
        chainPrev = picks[j].chosenMidi;
        break;
      }
    }
    if (chainPrev == null) chainPrev = targetMidi;
    picks[i] = pickSlotMidi(note, slot, chainPrev, 0, pitchProfile, normalizedSeed, {
      approachIdealMidi: idealMidi
    });
  }
  const out = [];
  const trace = [];
  for (let i = 0; i < ordered.length; i++) {
    const note = ordered[i];
    const slot = slots[i];
    const pick = picks[i] ?? {
      chosenMidi: note.midiPitch,
      chosenRank: 0,
      topScore: 0,
      candidateCount: 0
    };
    out.push({ ...note, midiPitch: pick.chosenMidi });
    const phraseRef = slot.approachWindowRole === "intermediate" ? `${pitchProfile.phrasePlanner.contourArc}:approach:${slot.slotIndex}` : slot.noteRole === "rest_placeholder" ? `${pitchProfile.phrasePlanner.contourArc}:skip_rest` : `${pitchProfile.phrasePlanner.contourArc}:${slot.slotIndex}`;
    trace.push({
      slotId: slot.slotId,
      slotIndex: slot.slotIndex,
      chosenMidiPitch: pick.chosenMidi,
      candidateCount: pick.candidateCount,
      topScore: pick.topScore,
      chosenRank: pick.chosenRank,
      phrasePlanRef: phraseRef
    });
  }
  return { melody: out, trace };
}
function runPremiumMelodyPitchPipeline(rhythmMelody, profile, pitchProfile, normalizedSeed, options) {
  (0, import_premiumMelodyPitchProfile.assertValidPremiumMelodyPitchProfile)(pitchProfile);
  const ordered = canonicalMelodySort(rhythmMelody);
  const slotList = buildPremiumMelodyPitchSlotList(
    rhythmMelody,
    pitchProfile,
    profile,
    normalizedSeed,
    options
  );
  const { melody, trace } = scoreAndAssignPremiumMelodyPitches(
    ordered,
    slotList,
    pitchProfile,
    normalizedSeed
  );
  return { pitchMelody: melody, slotList, pitchTrace: trace };
}
function surfaceOrnamentApplicable(kind, rules) {
  switch (kind) {
    case "approach":
      return rules.approachSemitones.length > 0;
    case "enclosure":
      return rules.enclosureEnabled;
    case "blues":
      return rules.bluesInflectionRate > 0;
    case "grace":
      return rules.graceNoteRate > 0;
    case "bend":
      return rules.bendTagRate > 0;
    default: {
      const _exhaustive = kind;
      return false;
    }
  }
}
function applySurfaceOrnamentKind(kind, annotations, rules, rand) {
  switch (kind) {
    case "approach":
      if (rand() < 0.65) {
        const idx = Math.floor(rand() * rules.approachSemitones.length);
        annotations.approachSemitones = rules.approachSemitones[idx];
      }
      break;
    case "enclosure":
      annotations.enclosure = true;
      break;
    case "blues":
      if (rand() < rules.bluesInflectionRate) annotations.bluesInflection = true;
      break;
    case "grace":
      if (rand() < rules.graceNoteRate) annotations.graceNote = true;
      break;
    case "bend":
      if (rand() < rules.bendTagRate) annotations.bendTag = true;
      break;
    default: {
      const _exhaustive = kind;
    }
  }
}
function applyPremiumMelodySurfaceOrnaments(expressiveMelody, slotList, pitchProfile, normalizedSeed) {
  const rules = pitchProfile.surfaceRules;
  if (!rules) return [...expressiveMelody];
  const ordered = canonicalMelodySort(expressiveMelody);
  const out = [];
  for (let i = 0; i < ordered.length; i++) {
    const note = ordered[i];
    const slot = slotList[i];
    if (!slot || slot.noteRole === "rest_placeholder") {
      out.push({ ...note });
      continue;
    }
    const expressive = note;
    const annotations = {
      ...expressive.pitchOrnamentAnnotations ?? {}
    };
    for (let oi = 0; oi < import_premiumMelodyPitchProfile.PREMIUM_MELODY_SURFACE_ORNAMENT_ORDER.length; oi++) {
      const kind = import_premiumMelodyPitchProfile.PREMIUM_MELODY_SURFACE_ORNAMENT_ORDER[oi];
      if (!surfaceOrnamentApplicable(kind, rules)) continue;
      const rand = (0, import_premiumMelodyPrng.mulberry32)(
        derivePremiumMelodySurfaceOrnamentSeed(
          normalizedSeed,
          slot.slotId,
          oi,
          pitchProfile.pitchSeedSalt
        )
      );
      applySurfaceOrnamentKind(kind, annotations, rules, rand);
    }
    const hasAnnotations = annotations.approachSemitones != null || annotations.enclosure || annotations.bluesInflection || annotations.graceNote || annotations.bendTag;
    out.push(hasAnnotations ? { ...note, pitchOrnamentAnnotations: annotations } : { ...note });
  }
  return out;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  applyPremiumMelodySurfaceOrnaments,
  buildPremiumMelodyPitchSlotList,
  derivePremiumMelodyPhrasePlanSeed,
  derivePremiumMelodyPitchSlotSeed,
  derivePremiumMelodySurfaceOrnamentSeed,
  runPremiumMelodyPitchPipeline
});
