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
var premiumMelodyMotifCellRecall_exports = {};
__export(premiumMelodyMotifCellRecall_exports, {
  applyMelodicIntervalCellRecall: () => applyMelodicIntervalCellRecall,
  melodicIntervalCellRecallTargetBars: () => melodicIntervalCellRecallTargetBars
});
module.exports = __toCommonJS(premiumMelodyMotifCellRecall_exports);
function nonRestSlotsInBars(slots, barLo, barHi) {
  return slots.filter(
    (s) => s.bar >= barLo && s.bar <= barHi && s.noteRole !== "rest_placeholder"
  );
}
function midisInRegister(midis, minMidi, maxMidi) {
  return midis.every((m) => m >= minMidi && m <= maxMidi);
}
function shiftIntoRegister(midis, minMidi, maxMidi) {
  let out = [...midis];
  for (let guard = 0; guard < 8; guard++) {
    if (midisInRegister(out, minMidi, maxMidi)) return out;
    const lo = Math.min(...out);
    const hi = Math.max(...out);
    if (hi - lo > maxMidi - minMidi) return null;
    if (lo < minMidi) out = out.map((m) => m + 12);
    else if (hi > maxMidi) out = out.map((m) => m - 12);
    else return null;
  }
  return midisInRegister(out, minMidi, maxMidi) ? out : null;
}
function intervalVector(midis) {
  const out = [];
  for (let i = 1; i < midis.length; i++) {
    out.push(((midis[i] - midis[i - 1]) % 12 + 12) % 12);
  }
  return out;
}
function intervalsWithinTolerance(a, b, tol) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > tol) return false;
  }
  return true;
}
function countGuideHits(slots, midis) {
  let hits = 0;
  for (let i = 0; i < slots.length; i++) {
    const gt = slots[i].guideTonePc;
    if (gt == null) continue;
    if ((midis[i] % 12 + 12) % 12 === (gt % 12 + 12) % 12) hits++;
  }
  return hits;
}
function resolveCellSpecs(cfg) {
  if (cfg.cells != null && cfg.cells.length > 0) {
    return [...cfg.cells];
  }
  if (cfg.seedBars != null && cfg.targetBars != null) {
    return [{ seedBars: cfg.seedBars, targetBars: cfg.targetBars }];
  }
  return [];
}
function melodicIntervalCellRecallTargetBars(pitchProfile) {
  const cfg = pitchProfile.melodicIntervalCellRecall;
  const out = /* @__PURE__ */ new Set();
  if (cfg?.enabled !== true) return out;
  for (const cell of resolveCellSpecs(cfg)) {
    const [lo, hi] = cell.targetBars;
    for (let b = lo; b <= hi; b++) out.add(b);
  }
  return out;
}
function reinjectOneCell(slots, picks, pitchProfile, cell, cellSize, tol) {
  const [seedLo, seedHi] = cell.seedBars;
  const [tgtLo, tgtHi] = cell.targetBars;
  const seedSlots = nonRestSlotsInBars(slots, seedLo, seedHi).slice(0, cellSize);
  const targetSlots = nonRestSlotsInBars(slots, tgtLo, tgtHi).slice(0, cellSize);
  if (seedSlots.length < cellSize || targetSlots.length < cellSize) return;
  const seedMidis = [];
  for (const s of seedSlots) {
    const pick = picks[s.slotIndex];
    if (pick == null) return;
    seedMidis.push(pick.chosenMidi);
  }
  const seedSteps = [];
  for (let i = 1; i < seedMidis.length; i++) {
    seedSteps.push(seedMidis[i] - seedMidis[i - 1]);
  }
  const seedIv = intervalVector(seedMidis);
  const minMidi = pitchProfile.phrasePlanner.registerMinMidi;
  const maxMidi = pitchProfile.phrasePlanner.registerMaxMidi;
  const currentTarget = targetSlots.map((s) => picks[s.slotIndex]?.chosenMidi ?? s.importMidiPitch);
  const anchor = currentTarget[0];
  let best = null;
  const startCandidates = /* @__PURE__ */ new Set();
  startCandidates.add(anchor);
  for (const d of [-12, -7, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 7, 12]) {
    startCandidates.add(anchor + d);
  }
  const gt0 = targetSlots[0].guideTonePc;
  if (gt0 != null) {
    for (let oct = 0; oct < 8; oct++) {
      const m = gt0 + 12 * oct;
      if (m >= minMidi - 12 && m <= maxMidi + 12) startCandidates.add(m);
    }
  }
  for (const start of startCandidates) {
    const raw = [start];
    for (const step of seedSteps) raw.push(raw[raw.length - 1] + step);
    const shifted = shiftIntoRegister(raw, minMidi, maxMidi);
    if (shifted == null) continue;
    if (!intervalsWithinTolerance(intervalVector(shifted), seedIv, tol)) continue;
    const guideHits = countGuideHits(targetSlots, shifted);
    let drift = 0;
    for (let i = 0; i < cellSize; i++) {
      drift += Math.abs(shifted[i] - currentTarget[i]);
    }
    if (best == null || guideHits > best.guideHits || guideHits === best.guideHits && drift < best.drift) {
      best = { midis: shifted, guideHits, drift };
    }
  }
  if (best == null) return;
  for (let i = 0; i < cellSize; i++) {
    const slot = targetSlots[i];
    const prev = picks[slot.slotIndex];
    picks[slot.slotIndex] = {
      chosenMidi: best.midis[i],
      chosenRank: prev?.chosenRank ?? 0,
      topScore: prev?.topScore ?? 0,
      candidateCount: prev?.candidateCount ?? 0
    };
  }
}
function applyMelodicIntervalCellRecall(_ordered, slots, picks, pitchProfile) {
  const cfg = pitchProfile.melodicIntervalCellRecall;
  if (cfg?.enabled !== true) return;
  const cellSize = cfg.cellSize > 0 ? cfg.cellSize : 4;
  const tol = cfg.intervalTolerance >= 0 ? cfg.intervalTolerance : 2;
  const specs = resolveCellSpecs(cfg);
  for (const cell of specs) {
    reinjectOneCell(slots, picks, pitchProfile, cell, cellSize, tol);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  applyMelodicIntervalCellRecall,
  melodicIntervalCellRecallTargetBars
});
