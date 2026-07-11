/**
 * Debussy — impressionist colour / parallel planing Song Mode / duo golden-path **harmony** slice.
 * Lead-sheet symbols only — receipts **`db:*`**.
 *
 * **DB_HARM encoding (research rules → slice behaviour)**
 * - **DB_HARM_01** — Parallel planing permitted types (triads, dom7, maj9, quartal, open 5ths):
 *   no classical P5/P8 guard; `applyParallelPlaningPass` + `pickPlaningQuality` (incl. quartal / sparse 5th colour).
 * - **DB_HARM_02** — Parallel dom7, whole-tone lateral block: whole-step transpose biases dom7/9 block in planing;
 *   receipt `db:dom7_wt_block@bar*`.
 * - **DB_HARM_03** — Whole tone as local field: `applyWholeToneFieldPass` spans 4–8 bars, phrase interior only;
 *   colour rewrites (not brief V-prep); receipts `db:whole_tone@bar*`.
 * - **DB_HARM_04** — Pentatonic subset layer: `applyPentatonicContrastPass` — slash pentatonic bass / sus / 6 colours over stem;
 *   `db:pentatonic@bar*`.
 * - **DB_HARM_05** — Added 2nd/6th non-functional tonic: `enrichDebussyTonic` avoids bare triad arrival (`add2`, `maj9`, `6/9`, `add6`).
 * - **DB_HARM_06** — Non-functional dom9 colour: `enrichDebussyDominant` → `9(no11)` / alt colours; not scored as V9→I resolution chain.
 * - **DB_HARM_07** — Open 5th / incomplete: planing + whole-tone pools include `sus4(no5)`, `(no3)` ambiguity sonorities.
 * - **DB_HARM_08** — Quartal aggregate planing: `pickPlaningQuality` emits `quartal` / `7sus4` lateral blocks; `db:planing@bar*`.
 * - **DB_HARM_09** — Scalar block entry (no prep): new whole-tone span → `db:scalar_entry@bar*`.
 * - **DB_HARM_10** — Weakened / anti-cadence: `applyUnresolvedAppoggiaturaPass` skips functional V7→I glue;
 *   `db:anti_cadence@bar*` + `resolutionSuppressed` guard count.
 *
 * **DB_VL encoding (texture / registral voice-leading — not lead-sheet `db:*`)**
 * - **DB_VL_01–06** — `VoiceRuleBundle` **`debussy`** (`voiceRuleBundles.ts`): wide spread, root/pedal bass posture,
 *   parallel repair off, multi-voice motion allowed; fingerprint lines cite each rule.
 * - Solver: `voiceLeadingSolver.ts` — parallel 5th/8ve penalties **off** for `voiceId === 'debussy'` (parallel planing primary).
 * - Style bias: `applyDebussyStyleSurface` (`songModeStyleSurface.ts`) — space/cadence softness complements registral wash.
 *
 * **DB_MEL encoding (melodic line / Song Mode lead)** — `planMelodyBehaviour` + **`applyDebussyMelodicEncoding`** (`melodyBehaviourPlanner.ts`):
 * - **DB_MEL_01** — Conjunct arabesque, major-second field: `stepwise` + `dissolving` contour + `half_quarter` rhythm; device `db:mel01_conjunct_arabesque`.
 * - **DB_MEL_02** — Pentatonic/modal cells vs shifting harmony: `modalIntervalPreference` + `db:mel02_modal_pentatonic_cells` (aligns `pentatonic_contrast` / harmony slice).
 * - **DB_MEL_03** — Short gestures, timbral handoff: lower `repetitionVsVariationBias` + `db:mel03_gesture_timbre_handoff`.
 * - **DB_MEL_04** — Coloristic ornaments (weak beat): `avoidStrongBeatOneAttack` + `attackDensity: low` + `db:mel04_coloristic_ornaments` (`leadMelodyPlanner` entrance delay).
 * - **DB_MEL_05** — Melody in texture: `commonToneReturnBias` + wide `interOnsetSpacing` + `db:mel05_texture_embedded`.
 * - Receipt helper: **`collectDebussyMelodicGrammarReceipts`** filters `devices` for `db:mel*`.
 *
 * **DB_FORM encoding (sectional / non-sonata continuity)** — **`applyDebussyFormEncoding`** + receipts **`db:form*`**:
 * - **DB_FORM_01** — Sectional transformational form (not sonata-functional): `db:form01_sectional_transform`.
 * - **DB_FORM_02** — Section boundary = texture / timbre / register, not cadence: `db:form02_boundary_texture_not_cadence` (pairs with `db:anti_cadence@bar*`).
 * - **DB_FORM_03** — Early / middle / late programme gate: `resolveDebussyProgramPeriod` → `db:form03_period_*` on `generationMetadata.debussyProgramPeriod`.
 * - **DB_FORM_04** — La mer–scale suite proportions (optional): `db:form04_lamer_suite_proportions` when `totalBars >= 48`.
 * - **DB_FORM_05** — Fog-to-emergence arc: `db:form05_emergence_arc` (harmony slice pentatonic/open + enrich toward added-note fields = emergence bias).
 *
 * **DB_ORCH encoding (orchestration posture — metadata `db:orch*`, bundle fingerprints)** — **`applyDebussyOrchestrationEncoding`**:
 * - **DB_ORCH_01** — Divided muted strings as harmonic cloud: `db:orch01_divided_muted_strings`.
 * - **DB_ORCH_02** — Woodwind primary melodic carrier: `db:orch02_woodwind_melodic_lead`.
 * - **DB_ORCH_03** — Arco + pizz simultaneously: `db:orch03_arco_pizz_simultaneous`.
 * - **DB_ORCH_04** — Harp shimmer / gliss timbre: `db:orch04_harp_shimmer_gliss`.
 * - **DB_ORCH_05** — Brass as colour not tutti mass: `db:orch05_brass_colour_not_mass`.
 * - **DB_ORCH_06** — Timbre structural (handoff changes harmony read): `db:orch06_timbre_structural`.
 * - **DB_ORCH_07** — Women's voices as instrumental colour: `debussyVocalColourOrchestral` + optional `db:orch07_vocal_colour_active`.
 *
 * **DB_FP encoding (composite fingerprints — `finalizeDebussyMetadata`)** — receipts **`db:fp*`** on `debussyFingerprintReceipts`:
 * - **DB_FP_01** — Harmonic: planing + whole-tone field + pentatonic layer + added-note tonic colour; **`db:fp01_harmonic_fingerprint_complete`** when all four evidenced in `debussyDeviceReceipts` + effective bars.
 * - **DB_FP_02** — Voice-leading: parallel planing + registral arabesque + pentatonic spread + harmonic colour; **`db:fp02_voice_leading_fingerprint_complete`** when planing + arabesque bars + pentatonic receipts align.
 * - **DB_FP_03** — Formal: non-cadential boundaries + emergence arc + timbral return proxy (arabesque); **`db:fp03_formal_fingerprint_complete`** when form02+form05 + arabesque/anti-cadence signals present.
 * - **DB_FP_04** — Orchestral: muted cloud + woodwind lead + arco/pizz + harp + timbre-structural; **`db:fp04_orchestral_fingerprint_complete`** when `db:orch01`–`04` and `db:orch06` all present on orchestration receipts.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { normalizeHarmonicVoiceId } from '../composer/voiceRuleBundles';
import { resolveBarSymbol } from '../harmony/harmonySpineProvider';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { inferTonicPitchClassFromBar1 } from './brianWilsonPetSoundsSlice';
import { isProtectedBar } from '../score-integrity/identityLock';

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

const PC_TO_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function pitchClassToSharpName(pc: number): string {
  return PC_TO_SHARP[((pc % 12) + 12) % 12]!;
}

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = h.indexOf('/');
  const head = slashIdx >= 0 ? h.slice(0, slashIdx) : h;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

function seededUnit(seed: number, bar: number, salt: number): number {
  let s = (seed ^ bar * 1103515245 ^ salt * 12345) >>> 0;
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff;
}

/** DB_FORM_03 — programme period gates formal / overlap behaviour hints. */
export type DebussyProgramPeriod = 'early' | 'middle' | 'late';

/** DB_FORM_* research tags on `generationMetadata.debussyFormReceipts`. */
export const debussyFormGrammarTags = {
  form01_sectional_transform: 'db:form01_sectional_transform',
  form02_boundary_texture_not_cadence: 'db:form02_boundary_texture_not_cadence',
  form03_period_early: 'db:form03_period_early',
  form03_period_middle: 'db:form03_period_middle',
  form03_period_late: 'db:form03_period_late',
  form04_lamer_suite_proportions: 'db:form04_lamer_suite_proportions',
  form05_emergence_arc: 'db:form05_emergence_arc',
} as const;

export function resolveDebussyProgramPeriod(seed: number): DebussyProgramPeriod {
  const u = seededUnit(seed, 1, 772101);
  if (u < 0.33) return 'early';
  if (u < 0.72) return 'middle';
  return 'late';
}

/** DB_FORM_01–05 — seed + bar budget receipts; call from `precomputeDebussyEffectiveHarmonyBars`. */
export function applyDebussyFormEncoding(context: CompositionContext): void {
  const md = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const period = resolveDebussyProgramPeriod(context.seed);
  const tb = context.form.totalBars;
  const receipts: string[] = [
    debussyFormGrammarTags.form01_sectional_transform,
    debussyFormGrammarTags.form02_boundary_texture_not_cadence,
    period === 'early'
      ? debussyFormGrammarTags.form03_period_early
      : period === 'middle'
        ? debussyFormGrammarTags.form03_period_middle
        : debussyFormGrammarTags.form03_period_late,
    debussyFormGrammarTags.form05_emergence_arc,
  ];
  if (tb >= 48) receipts.push(debussyFormGrammarTags.form04_lamer_suite_proportions);
  md.debussyProgramPeriod = period;
  md.debussyFormReceipts = receipts;
}

/** DB_ORCH_01–07 — orchestral texture receipts + optional vocal-instrument colour flag. */
export const debussyOrchestrationGrammarTags = {
  orch01_divided_muted_strings: 'db:orch01_divided_muted_strings',
  orch02_woodwind_melodic_lead: 'db:orch02_woodwind_melodic_lead',
  orch03_arco_pizz_simultaneous: 'db:orch03_arco_pizz_simultaneous',
  orch04_harp_shimmer_gliss: 'db:orch04_harp_shimmer_gliss',
  orch05_brass_colour_not_mass: 'db:orch05_brass_colour_not_mass',
  orch06_timbre_structural: 'db:orch06_timbre_structural',
  orch07_womens_voices_instrumental: 'db:orch07_womens_voices_instrumental',
} as const;

export function applyDebussyOrchestrationEncoding(context: CompositionContext): void {
  const md = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const seed = context.seed;
  const receipts: string[] = [
    debussyOrchestrationGrammarTags.orch01_divided_muted_strings,
    debussyOrchestrationGrammarTags.orch02_woodwind_melodic_lead,
    debussyOrchestrationGrammarTags.orch03_arco_pizz_simultaneous,
    debussyOrchestrationGrammarTags.orch04_harp_shimmer_gliss,
    debussyOrchestrationGrammarTags.orch05_brass_colour_not_mass,
    debussyOrchestrationGrammarTags.orch06_timbre_structural,
    debussyOrchestrationGrammarTags.orch07_womens_voices_instrumental,
  ];
  const vocalColour = seededUnit(seed, 2, 772201) < 0.34;
  md.debussyVocalColourOrchestral = vocalColour;
  if (vocalColour) receipts.push('db:orch07_vocal_colour_active');
  md.debussyOrchestrationReceipts = receipts;
}

/** DB_FP_01–04 — composite receipts (harmonic / VL / formal / orchestral full fingerprints). */
export const debussyFingerprintGrammarTags = {
  fp01_harmonic: 'db:fp01_harmonic_fingerprint',
  fp01_harmonic_complete: 'db:fp01_harmonic_fingerprint_complete',
  fp02_voice_leading: 'db:fp02_voice_leading_fingerprint',
  fp02_voice_leading_complete: 'db:fp02_voice_leading_fingerprint_complete',
  fp03_formal: 'db:fp03_formal_fingerprint',
  fp03_formal_complete: 'db:fp03_formal_fingerprint_complete',
  fp04_orchestral: 'db:fp04_orchestral_fingerprint',
  fp04_orchestral_complete: 'db:fp04_orchestral_fingerprint_complete',
} as const;

function effectiveBarsShowAddedNoteTonicColour(eff: readonly string[], tonicPc: number | undefined): boolean {
  for (const sym of eff) {
    const hp = parseChordSymbol(sym).harmonyPart;
    if (!/add2|maj9|6\/9|add6|add2\(add6\)|aug/i.test(hp)) continue;
    if (tonicPc === undefined || looksMajorTonicColour(sym, tonicPc)) return true;
  }
  return false;
}

function buildDebussyCompositeFingerprintReceipts(
  metadata: GenerationMetadata,
  acc: DebussyHarmonyAccumulator,
  context: CompositionContext,
  flat: readonly string[],
  arabLen: number
): string[] {
  const out: string[] = [];
  const eff = metadata.debussyEffectiveHarmonyBars ?? [];
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const devStr = flat.join('\n');
  const hasPlaning = devStr.includes('db:planing');
  const hasWt = devStr.includes('db:whole_tone');
  const hasPent = devStr.includes('db:pentatonic');
  const hasAddedTonicColour =
    devStr.includes('db:appoggiatura') || effectiveBarsShowAddedNoteTonicColour(eff, tonicPc);

  out.push(debussyFingerprintGrammarTags.fp01_harmonic);
  if (hasPlaning && hasWt && hasPent && hasAddedTonicColour) {
    out.push(debussyFingerprintGrammarTags.fp01_harmonic_complete);
  }

  out.push(debussyFingerprintGrammarTags.fp02_voice_leading);
  if (hasPlaning && hasPent && (arabLen > 0 || acc.wholeToneTouches >= 2)) {
    out.push(debussyFingerprintGrammarTags.fp02_voice_leading_complete);
  }

  const formJoin = (metadata.debussyFormReceipts ?? []).join(',');
  const hasForm02 = formJoin.includes('db:form02');
  const hasForm05 = formJoin.includes('db:form05');
  const timbralReturn = arabLen > 0 || hasPent || devStr.includes('db:anti_cadence');
  out.push(debussyFingerprintGrammarTags.fp03_formal);
  if (hasForm02 && hasForm05 && timbralReturn) {
    out.push(debussyFingerprintGrammarTags.fp03_formal_complete);
  }

  const orchJoin = (metadata.debussyOrchestrationReceipts ?? []).join(',');
  out.push(debussyFingerprintGrammarTags.fp04_orchestral);
  const orchNeed = [
    debussyOrchestrationGrammarTags.orch01_divided_muted_strings,
    debussyOrchestrationGrammarTags.orch02_woodwind_melodic_lead,
    debussyOrchestrationGrammarTags.orch03_arco_pizz_simultaneous,
    debussyOrchestrationGrammarTags.orch04_harp_shimmer_gliss,
    debussyOrchestrationGrammarTags.orch06_timbre_structural,
  ];
  if (orchNeed.every((t) => orchJoin.includes(t))) {
    out.push(debussyFingerprintGrammarTags.fp04_orchestral_complete);
  }

  return out;
}

function slashTail(symbol: string): string {
  return symbol.includes('/') ? symbol.slice(symbol.indexOf('/')) : '';
}

function transposeChordRoot(symbol: string, deltaPc: number): string {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = hp.indexOf('/');
  const head = slashIdx >= 0 ? hp.slice(0, slashIdx) : hp;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return symbol;
  const rootPc = noteNameToPitchClass(m[1]);
  if (rootPc === undefined) return symbol;
  const rest = head.slice(m[1].length);
  const newRoot = pitchClassToSharpName((rootPc + deltaPc + 12) % 12);
  const slash = slashTail(symbol);
  return `${newRoot}${rest}${slash}`;
}

function phraseRoleAtBar(
  bar: number,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): 'phraseStart' | 'phraseMiddle' | 'phraseFinal' {
  const idx = bar - 1;
  if (idx < 0 || idx >= positions.length) return 'phraseMiddle';
  return positions[idx]!;
}

function looksMajorTonicColour(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  const r = harmonyRootPc(symbol);
  if (r !== tonicPc) return false;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/m(?!aj)|dim|ø|sus/.test(tl)) return false;
  return true;
}

function looksBareMajorOnTonic(symbol: string, tonicPc: number | undefined): boolean {
  if (tonicPc === undefined) return false;
  if (harmonyRootPc(symbol) !== tonicPc) return false;
  const tl = parseChordSymbol(symbol).harmonyPart.toLowerCase();
  if (/m(?!aj)|dim|ø|sus/.test(tl)) return false;
  if (/maj9|maj13|maj6|6\/9|#11|add2|aug/.test(tl)) return false;
  const hp = parseChordSymbol(symbol).harmonyPart;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  return rest === '' || /^maj7?$/i.test(rest) || /^M7?$/i.test(rest) || rest === 'maj';
}

function looksBareMinor(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj|Δ|dim|ø|aug|sus/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  if (!/^m/.test(rest)) return false;
  return !/[79]|11|13|maj|add/.test(rest);
}

/** Plain dominant seventh only — no ext / alt / sus (Debussy enrich + whole-tone field). */
function looksPlainDom7Strict(symbol: string): boolean {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const tl = hp.toLowerCase();
  if (/maj7|mmaj7|Δ|sus|dim|ø|m(?!aj)/.test(tl)) return false;
  const m = hp.match(ROOT_AT_START);
  if (!m?.[1]) return false;
  const rest = hp.slice(m[1]!.length).replace(/\s/g, '');
  return /^7([^a-z]|$)|^7\(/.test(rest);
}

function extractRootAndSlash(symbol: string): { root: string; slash: string; rest: string } | undefined {
  const hp = parseChordSymbol(symbol).harmonyPart;
  const slashIdx = hp.indexOf('/');
  const head = slashIdx >= 0 ? hp.slice(0, slashIdx) : hp;
  const m = head.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  const root = m[1];
  const rest = head.slice(root.length);
  return { root, slash: slashTail(symbol), rest };
}

function debussyPhraseLength(seed: number, phraseIndex: number): number {
  const u = seededUnit(seed, phraseIndex, 770101);
  if (u < 0.06) return 2;
  if (u < 0.3) return 3;
  if (u < 0.57) return 4;
  if (u < 0.78) return 5;
  if (u < 0.92) return 6;
  if (u < 0.95) return 7;
  return 8;
}

/** Phrase grid — weighted lengths (Debussy arabesque asymmetry). */
export function computeDebussyPhrasePositions(
  totalBars: number,
  seed: number
): readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] {
  const out: ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[] = [];
  let bar = 1;
  let phraseIdx = 0;
  while (bar <= totalBars) {
    const len = debussyPhraseLength(seed, phraseIdx);
    const end = Math.min(bar + len - 1, totalBars);
    const span = end - bar + 1;
    for (let i = 0; i < span; i++) {
      const globalBar = bar + i;
      if (span <= 1) {
        out.push('phraseFinal');
      } else if (globalBar === bar) {
        out.push('phraseStart');
      } else if (globalBar === end) {
        out.push('phraseFinal');
      } else {
        out.push('phraseMiddle');
      }
    }
    bar = end + 1;
    phraseIdx++;
  }
  while (out.length < totalBars) out.push('phraseMiddle');
  return out.slice(0, totalBars);
}

function enrichDebussyTonic(symbol: string, tonicPc: number | undefined, seed: number, bar: number): string {
  if (!looksBareMajorOnTonic(symbol, tonicPc)) return symbol;
  const ex = extractRootAndSlash(symbol);
  if (!ex) return symbol;
  const u = seededUnit(seed, bar, 770201);
  const { root, slash } = ex;
  if (u < 0.22) return `${root}add2${slash}`;
  if (u < 0.38) return `${root}add6${slash}`;
  if (u < 0.55) return `${root}add2(add6)${slash}`;
  if (u < 0.72) return `${root}maj9${slash}`;
  if (u < 0.9) return `${root}6/9${slash}`;
  return `${root}aug${slash}`;
}

function enrichDebussyDominant(symbol: string, seed: number, bar: number): string {
  if (!looksPlainDom7Strict(symbol)) return symbol;
  const ex = extractRootAndSlash(symbol);
  if (!ex) return symbol;
  const u = seededUnit(seed, bar, 770301);
  const { root, slash } = ex;
  if (u < 0.4) return `${root}9(no11)${slash}`;
  if (u < 0.75) return `${root}aug7${slash}`;
  return `${root}7(b5#5)${slash}`;
}

function enrichDebussyMinor(symbol: string, seed: number, bar: number): string {
  if (!looksBareMinor(symbol)) return symbol;
  const ex = extractRootAndSlash(symbol);
  if (!ex) return symbol;
  const u = seededUnit(seed, bar, 770401);
  const { root, slash } = ex;
  if (u < 0.35) return `${root}m(add2)${slash}`;
  if (u < 0.65) return `${root}m9${slash}`;
  if (u < 0.85) return `${root}m6${slash}`;
  return `${root}m7${slash}`;
}

function isBridgeBar(bar: number, context: CompositionContext): boolean {
  for (const s of context.form.sections) {
    const lb = (s.label ?? '').toLowerCase();
    if (lb.includes('bridge') || lb === 'b') {
      if (bar >= s.startBar && bar < s.startBar + s.length) return true;
    }
  }
  return false;
}

function isMidOrBridgeBar(bar: number, tb: number, context: CompositionContext): boolean {
  if (isBridgeBar(bar, context)) return true;
  const lo = Math.floor(tb * 0.25);
  const hi = Math.ceil(tb * 0.75);
  return bar > lo && bar <= hi;
}

function looksResolvedDomToTonic(
  domSym: string,
  nextSym: string | undefined,
  tonicPc: number | undefined
): boolean {
  if (nextSym === undefined || tonicPc === undefined) return false;
  if (!looksPlainDom7Strict(domSym)) return false;
  return looksMajorTonicColour(nextSym, tonicPc);
}

function pickWholeToneColour(root: string, slash: string, seed: number, bar: number): string {
  const u = seededUnit(seed, bar, 770601);
  if (u < 0.24) return `${root}aug${slash}`;
  if (u < 0.38) return `${root}9(no11)${slash}`;
  if (u < 0.48) return `${root}sus4(no5)${slash}`;
  if (u < 0.56) return `${root}(no3)${slash}`;
  if (u < 0.64) return `${root}quartal${slash}`;
  if (u < 0.72) return `${root}maj7(#5)${slash}`;
  if (u < 0.82) return `${root}6/9(no5)${slash}`;
  if (u < 0.9) return `${root}add2(add6)${slash}`;
  if (u < 0.95) return `${root}7sus4${slash}`;
  return `${root}7(#5)${slash}`;
}

function applyWholeToneFieldPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[]
): void {
  let wtBarsRemaining = 0;
  let wtColl: 0 | 1 = 0;

  for (let b = 1; b <= tb; b++) {
    if (wtBarsRemaining > 0) wtBarsRemaining--;
    if (isProtectedBar(b, context)) continue;
    const role = phraseRoleAtBar(b, positions);
    if (role !== 'phraseStart' && role !== 'phraseMiddle') continue;
    const sym = out[b - 1]!;
    const eligible = looksPlainDom7Strict(sym) || looksMajorTonicColour(sym, tonicPc);
    if (!eligible) continue;
    if (seededUnit(seed, b, 770501) >= 0.41) continue;

    if (wtBarsRemaining <= 0) {
      const span = 4 + Math.floor(seededUnit(seed, b, 770502) * 5);
      wtBarsRemaining = Math.max(0, span - 1);
      wtColl = seededUnit(seed, b, 770503) < 0.5 ? 0 : 1;
      receipts.push(`db:scalar_entry@bar${b}`);
    }

    const ex = extractRootAndSlash(sym);
    if (!ex) continue;
    let { root } = ex;
    const { slash } = ex;
    const rPc = harmonyRootPc(sym);
    if (rPc === undefined) continue;

    if (wtColl === 1) {
      root = pitchClassToSharpName((rPc + 1 + 12) % 12);
    }

    out[b - 1] = pickWholeToneColour(root, slash, seed, b);
    receipts.push(`db:whole_tone@bar${b}`);
  }
}

function pickPlaningQuality(
  root: string,
  slash: string,
  seed: number,
  bar: number,
  transposeSemi: 1 | 2
): string {
  const u = seededUnit(seed, bar, 770801);
  if (transposeSemi === 2) {
    if (u < 0.2) return `${root}7${slash}`;
    if (u < 0.36) return `${root}9${slash}`;
    if (u < 0.5) return `${root}9(no11)${slash}`;
  }
  if (u < 0.12) return `${root}quartal${slash}`;
  if (u < 0.22) return `${root}sus4(no5)${slash}`;
  if (u < 0.3) return `${root}(no3)${slash}`;
  if (u < 0.42) return `${root}add2${slash}`;
  if (u < 0.54) return `${root}9${slash}`;
  if (u < 0.64) return `${root}${slash}`;
  if (u < 0.74) return `${root}7sus4${slash}`;
  if (u < 0.82) return `${root}maj9${slash}`;
  if (u < 0.9) return `${root}m${slash}`;
  if (u < 0.96) return `${root}6${slash}`;
  return `${root}7${slash}`;
}

function applyParallelPlaningPass(
  out: string[],
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 770701) >= 0.64) continue;
    const sym = out[b - 1]!;
    const ex = extractRootAndSlash(sym);
    if (!ex) continue;
    const uMove = seededUnit(seed, b, 770702);
    const delta = uMove < 0.71 ? 2 : uMove < 0.92 ? 1 : 0;
    if (delta === 0) continue;
    const moved = transposeChordRoot(sym, delta);
    const ex2 = extractRootAndSlash(moved);
    if (!ex2) continue;
    out[b - 1] = pickPlaningQuality(ex2.root, ex2.slash, seed, b, delta);
    receipts.push(`db:planing@bar${b}`);
    if (delta === 2 && seededUnit(seed, b, 770703) < 0.42) {
      receipts.push(`db:dom7_wt_block@bar${b}`);
    }
  }
}

function pentatonicBassPc(rootPc: number, seed: number, bar: number): number {
  const pent = [0, 2, 4, 7, 9];
  const idx = Math.floor(seededUnit(seed, bar, 770901) * pent.length) % pent.length;
  return (rootPc + (pent[idx] ?? 0) + 12) % 12;
}

function applyPentatonicContrastPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  if (tonicPc === undefined) return;
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (!isMidOrBridgeBar(b, tb, context)) continue;
    if (seededUnit(seed, b, 771001) >= 0.34) continue;
    const sym = out[b - 1]!;
    const ex = extractRootAndSlash(sym);
    if (!ex) continue;
    const rootPc = harmonyRootPc(sym);
    if (rootPc === undefined) continue;
    const mode = seededUnit(seed, b, 771002);
    const bassPc = pentatonicBassPc(rootPc, seed, b);
    const bassName = pitchClassToSharpName(bassPc);
    const stemNoSlash = `${ex.root}${ex.rest}`;
    if (mode < 0.41) {
      out[b - 1] = `${stemNoSlash}/${bassName}`;
    } else if (mode < 0.63) {
      out[b - 1] = `${ex.root}sus4${ex.slash}`;
    } else if (mode < 0.82) {
      out[b - 1] = `${ex.root}6${ex.slash}`;
    } else {
      out[b - 1] = `${ex.root}6/9${ex.slash}`;
    }
    receipts.push(`db:pentatonic@bar${b}`);
  }
}

function applyUnresolvedAppoggiaturaPass(
  out: string[],
  tonicPc: number | undefined,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext,
  positions: readonly ('phraseStart' | 'phraseMiddle' | 'phraseFinal')[],
  guards: DebussyAntiElaborationGuards
): void {
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (phraseRoleAtBar(b, positions) !== 'phraseMiddle') continue;
    if (seededUnit(seed, b, 771101) >= 0.27) continue;
    const sym = out[b - 1]!;
    const next = b < tb ? out[b] : undefined;
    if (
      seededUnit(seed, b, 771102) < 0.72 &&
      looksResolvedDomToTonic(sym, next, tonicPc)
    ) {
      guards.resolutionSuppressed++;
      receipts.push(`db:anti_cadence@bar${b}`);
      continue;
    }
    const ex = extractRootAndSlash(sym);
    if (!ex) continue;
    const { root, slash } = ex;
    const u = seededUnit(seed, b, 771103);
    if (u < 0.26) out[b - 1] = `${root}add2${slash}`;
    else if (u < 0.4) out[b - 1] = `${root}6${slash}`;
    else if (u < 0.62) out[b - 1] = `${root}maj9${slash}`;
    else if (u < 0.81) out[b - 1] = `${root}9${slash}`;
    else out[b - 1] = `${root}add2(add6)${slash}`;
    receipts.push(`db:appoggiatura@bar${b}`);
  }
}

export type DebussyArabesqueMotifKind =
  | 'sequence_by_step'
  | 'rhythmic_augmentation'
  | 'fragment_extension'
  | 'register_shift'
  | 'ornamental';

function pickArabesqueMotifKind(seed: number, bar: number): DebussyArabesqueMotifKind {
  const u = seededUnit(seed, bar, 771201);
  if (u < 0.33) return 'sequence_by_step';
  if (u < 0.47) return 'rhythmic_augmentation';
  if (u < 0.66) return 'fragment_extension';
  if (u < 0.79) return 'register_shift';
  return 'ornamental';
}

function applyArabesqueMotifFlag(
  genMeta: GenerationMetadata & Record<string, unknown>,
  seed: number,
  receipts: string[],
  tb: number,
  context: CompositionContext
): void {
  const bars: number[] = [];
  const byBar: Record<number, DebussyArabesqueMotifKind> = {};
  for (let b = 1; b <= tb; b++) {
    if (isProtectedBar(b, context)) continue;
    if (seededUnit(seed, b, 771301) >= 0.38) continue;
    bars.push(b);
    byBar[b] = pickArabesqueMotifKind(seed, b);
    receipts.push(`db:arabesque@bar${b}`);
  }
  genMeta.debussyArabesqueBars = bars.length ? bars : undefined;
  genMeta.debussyArabesqueMotifByBar = Object.keys(byBar).length ? byBar : undefined;
}

export function isSongwriterDebussy(
  genMeta: GenerationMetadata | undefined
): genMeta is GenerationMetadata & { songwriterStyleId: 'debussy' } {
  return genMeta?.songwriterStyleId === 'debussy';
}

/**
 * Primary songwriter or harmonicVoice selects Debussy harmony authority.
 * Single-gate (no styleProfile) — bill_evans HV pattern. Form/orch untouched.
 */
export function isDebussyHarmonicPath(
  metadata?: {
    songwriterStyleId?: string | null;
    harmonicVoice?: string | null;
  } | null
): boolean {
  const primary = normalizeHarmonicVoiceId(String(metadata?.songwriterStyleId ?? ''));
  const voice = normalizeHarmonicVoiceId(String(metadata?.harmonicVoice ?? ''));
  return primary === 'debussy' || voice === 'debussy';
}

export interface DebussyHarmonyAccumulator {
  barsConsidered: number;
  wholeToneTouches: number;
  planingTouches: number;
  pentatonicTouches: number;
  appoggiaturaTouches: number;
  arabesqueTouches: number;
}

export function createDebussyHarmonyAccumulator(): DebussyHarmonyAccumulator {
  return {
    barsConsidered: 0,
    wholeToneTouches: 0,
    planingTouches: 0,
    pentatonicTouches: 0,
    appoggiaturaTouches: 0,
    arabesqueTouches: 0,
  };
}

function scanChordForDebussyDiagnostics(chord: string, acc: DebussyHarmonyAccumulator): void {
  const c = chord.trim();
  if (!c) return;
  acc.barsConsidered++;
  const hp = parseChordSymbol(c).harmonyPart;
  const t = hp.toLowerCase();
  if (/aug|#5|\(#5\)/.test(t)) acc.wholeToneTouches++;
  if (/add2|planing|sus4|\(no3\)|quartal/.test(t)) acc.planingTouches++;
  if (/6\/9|pentatonic/.test(t) || /sus4/.test(t)) acc.pentatonicTouches++;
  if (/add2\(add6\)|maj9|m\(add2\)/.test(t)) acc.appoggiaturaTouches++;
}

export function accumulateDebussyHarmonyDiagnostics(
  _previousChord: string | undefined,
  currentChord: string,
  acc: DebussyHarmonyAccumulator
): void {
  scanChordForDebussyDiagnostics(currentChord, acc);
}

export interface DebussyAntiElaborationGuards {
  noopEnrich: number;
  resolutionSuppressed: number;
}

/** @deprecated — use resolveBarSymbol */
export function precomputeDebussyEffectiveHarmonyBars(context: CompositionContext): void {
  const genMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
  const tb = context.form.totalBars;
  const seed = context.seed;
  const tonicPc = inferTonicPitchClassFromBar1(context);
  const receipts: string[] = [];
  const guards: DebussyAntiElaborationGuards = {
    noopEnrich: 0,
    resolutionSuppressed: 0,
  };

  const positions = computeDebussyPhrasePositions(tb, seed);

  const raw: string[] = [];
  for (let b = 1; b <= tb; b++) {
    let sym = resolveBarSymbol(context, b).symbol;
    const before = sym;
    sym = enrichDebussyTonic(sym, tonicPc, seed, b);
    sym = enrichDebussyDominant(sym, seed, b);
    sym = enrichDebussyMinor(sym, seed, b);
    if (
      sym === before &&
      (looksBareMajorOnTonic(before, tonicPc) || looksBareMinor(before) || looksPlainDom7Strict(before))
    ) {
      guards.noopEnrich++;
    }
    raw.push(sym);
  }

  const out = [...raw];

  applyWholeToneFieldPass(out, tonicPc, seed, receipts, tb, context, positions);
  applyParallelPlaningPass(out, seed, receipts, tb, context);
  applyPentatonicContrastPass(out, tonicPc, seed, receipts, tb, context);
  applyUnresolvedAppoggiaturaPass(out, tonicPc, seed, receipts, tb, context, positions, guards);

  applyArabesqueMotifFlag(genMeta, seed, receipts, tb, context);

  applyDebussyFormEncoding(context);
  applyDebussyOrchestrationEncoding(context);

  genMeta.debussyEffectiveHarmonyBars = out;
  genMeta.debussyDeviceReceipts = receipts;
  genMeta.debussyAntiElaborationGuards = guards;
}

export function finalizeDebussyMetadata(
  metadata: GenerationMetadata,
  acc: DebussyHarmonyAccumulator,
  context: CompositionContext
): void {
  const flat = [...(metadata.debussyDeviceReceipts ?? [])];
  const g = metadata.debussyAntiElaborationGuards ?? {
    noopEnrich: 0,
    resolutionSuppressed: 0,
  };
  const guardTotal = g.noopEnrich + g.resolutionSuppressed;
  const arab = metadata.debussyArabesqueBars ?? [];
  const period = metadata.debussyProgramPeriod;
  const formRcpt = metadata.debussyFormReceipts ?? [];
  const orchRcpt = metadata.debussyOrchestrationReceipts ?? [];
  const vocalOrch = metadata.debussyVocalColourOrchestral;
  const fpRcpt = buildDebussyCompositeFingerprintReceipts(metadata, acc, context, flat, arab.length);
  metadata.debussyFingerprintReceipts = fpRcpt;
  const d = {
    songwriterId: 'debussy' as const,
    barsConsidered: acc.barsConsidered,
    wholeToneTouches: acc.wholeToneTouches,
    planingTouches: acc.planingTouches,
    pentatonicTouches: acc.pentatonicTouches,
    appoggiaturaTouches: acc.appoggiaturaTouches,
    arabesqueTouches: arab.length,
    antiElaborationGuardTriggers: guardTotal,
    antiElaborationGuards: { ...g },
    deviceReceipts: flat.length ? flat : undefined,
    programPeriod: period,
    formReceipts: formRcpt.length ? [...formRcpt] : undefined,
    orchestrationReceipts: orchRcpt.length ? [...orchRcpt] : undefined,
    vocalColourOrchestral: typeof vocalOrch === 'boolean' ? vocalOrch : undefined,
    fingerprintReceipts: fpRcpt.length ? [...fpRcpt] : undefined,
  } as const;
  const receipt = [
    `Debussy (impressionist slice): wt≈${acc.wholeToneTouches}`,
    `plan≈${acc.planingTouches}`,
    `pent≈${acc.pentatonicTouches}`,
    `appog≈${acc.appoggiaturaTouches}`,
    `arab=${arab.length}`,
    `bars=${acc.barsConsidered}`,
    `antiGuards=${guardTotal}`,
    period ? `formPeriod=${period}` : '',
    formRcpt.length ? `formTags=${formRcpt.join(',')}` : '',
    orchRcpt.length ? `orchTags=${orchRcpt.join(',')}` : '',
    typeof vocalOrch === 'boolean' ? `vocalOrch=${vocalOrch}` : '',
    fpRcpt.length ? `fpTags=${fpRcpt.join(',')}` : '',
    flat.length ? `devices=${flat.join(';')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  metadata.debussyDiagnostics = { ...d };
  metadata.debussySliceReceipt = receipt;
}
