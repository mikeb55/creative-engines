/**
 * STYLE_INDIE_ART_POP Phase A — texture / role / phrase-edge deepening (no harmony policy).
 */

import type { CompositionContext } from '../core/compositionContext';
import type { NoteEvent, PartModel, ScoreModel } from '../core/score-model/scoreModelTypes';
import { createMeasure, createNote, addEvent, createScore } from '../core/score-model/scoreEventBuilder';
import { planSectionRoles } from '../core/section-roles/sectionRolePlanner';
import type { SectionWithRole } from '../core/section-roles/sectionRoleTypes';
import { applyIndieArtPopPhaseADeepening } from '../core/song-mode/indieArtPopPhaseA';
import {
  resolveIndieArtPopTuningTexture,
  type AlternateGuitarTuningResolved,
} from '../core/song-mode/alternateGuitarTunings';

function duo32Sections(): SectionWithRole[] {
  return planSectionRoles(
    [
      { label: 'A', startBar: 1, length: 8 },
      { label: 'B', startBar: 9, length: 8 },
      { label: 'A', startBar: 17, length: 8 },
      { label: 'B', startBar: 25, length: 8 },
    ],
    { A: 'statement', B: 'contrast' }
  );
}

function minimalIndieContext(alt?: AlternateGuitarTuningResolved): CompositionContext {
  return {
    presetId: 'guitar_bass_duo',
    form: {
      sections: [
        { label: 'A', startBar: 1, length: 8 },
        { label: 'B', startBar: 9, length: 8 },
        { label: 'A', startBar: 17, length: 8 },
        { label: 'B', startBar: 25, length: 8 },
      ],
      totalBars: 32,
    },
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      songModeHookFirstIdentity: true,
      styleProfile: 'STYLE_INDIE_ART_POP',
      ...(alt ? { alternateGuitarTuning: alt } : {}),
    },
  } as unknown as CompositionContext;
}

function buildMinimalGuitarPart(): PartModel {
  const measures = [];
  for (let b = 1; b <= 32; b++) {
    measures.push(createMeasure(b, 'Cmaj7'));
  }
  const nV1 = createNote(67, 0, 1, 1) as NoteEvent;
  nV1.velocity = 82;
  const nV2 = createNote(55, 2.5, 1.5, 2) as NoteEvent;
  nV2.velocity = 82;
  addEvent(measures[3]!, nV1);
  addEvent(measures[3]!, nV2);
  const nHook = createNote(64, 1, 1, 2) as NoteEvent;
  nHook.velocity = 77;
  addEvent(measures[24]!, nHook);

  return {
    id: 'guitar',
    name: 'Guitar',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures,
  };
}

function buildMinimalBassPart(): PartModel {
  const measures = [];
  for (let b = 1; b <= 32; b++) {
    const m = createMeasure(b, 'Cmaj7');
    const n = createNote(40, 0, 2, 1) as NoteEvent;
    n.velocity = 78;
    addEvent(m, n);
    measures.push(m);
  }
  return {
    id: 'bass',
    name: 'Bass',
    instrumentIdentity: 'acoustic_upright_bass',
    midiProgram: 32,
    clef: 'bass',
    measures,
  };
}

/** Matches post-`remapBassPartToElectricGuitar2ForIndieArtPop` second staff: walking line register, treble, id `guitar_2`. */
function buildMinimalGuitar2Part(): PartModel {
  const measures = [];
  for (let b = 1; b <= 32; b++) {
    const m = createMeasure(b, 'Cmaj7');
    const n = createNote(52, 0, 2, 1) as NoteEvent;
    n.velocity = 78;
    addEvent(m, n);
    measures.push(m);
  }
  return {
    id: 'guitar_2',
    name: 'Electric Guitar 2',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures,
  };
}

export function runIndieArtPopPhaseATests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  out.push({
    ok: resolveIndieArtPopTuningTexture(undefined) === 'standard',
    name: 'resolveIndieArtPopTuningTexture: absent tuning → standard',
  });
  out.push({
    ok:
      resolveIndieArtPopTuningTexture({
        mode: 'separate',
        guitar1: { presetId: 'drop_d', strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
        guitar2: { presetId: 'open_g', strings: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
      }) === 'separate_roles',
    name: 'resolveIndieArtPopTuningTexture: separate mode → separate_roles',
  });
  out.push({
    ok:
      resolveIndieArtPopTuningTexture({
        mode: 'shared',
        shared: { presetId: 'drone_cluster_1', strings: ['C2', 'C3', 'G3', 'G3', 'C4', 'D4'] },
      }) === 'drone_cluster',
    name: 'resolveIndieArtPopTuningTexture: shared drone preset → drone_cluster',
  });
  out.push({
    ok:
      resolveIndieArtPopTuningTexture({
        mode: 'shared',
        shared: { presetId: 'joni_style_open_color', strings: ['C2', 'G2', 'D3', 'G3', 'C4', 'E4'] },
      }) === 'open_modal',
    name: 'resolveIndieArtPopTuningTexture: shared Joni-style preset → open_modal',
  });

  const sections = duo32Sections();
  const guitar = buildMinimalGuitarPart();
  const bass = buildMinimalBassPart();
  const score: ScoreModel = createScore('Indie Art Pop Phase A test', [guitar, bass], { tempo: 120 });

  const ctx = minimalIndieContext({
    mode: 'separate',
    guitar1: { presetId: 'standard', strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
    guitar2: { presetId: 'drone_cluster_1', strings: ['C2', 'C3', 'G3', 'G3', 'C4', 'D4'] },
  });

  const v2Before = 82;
  applyIndieArtPopPhaseADeepening(score, ctx, sections);

  const m4 = score.parts[0]!.measures.find((x) => x.index === 4)!;
  const v2Note = m4.events.find((e) => e.kind === 'note' && ((e as NoteEvent).voice ?? 1) === 2) as NoteEvent;
  const v1Note = m4.events.find((e) => e.kind === 'note' && ((e as NoteEvent).voice ?? 1) === 1) as NoteEvent;

  out.push({
    ok: (v2Note?.velocity ?? 0) < v2Before - 5,
    name: 'Phase A: phrase-end voice-2 bar 4 gets a strong negative velocity dip (dropout feel)',
  });
  out.push({
    ok: (v1Note?.velocity ?? 0) > 82,
    name: 'Phase A: phrase-end voice-1 bar 4 gains lift vs baseline',
  });

  const m25 = score.parts[0]!.measures.find((x) => x.index === 25)!;
  const hookNote = m25.events.find((e) => e.kind === 'note') as NoteEvent;
  out.push({
    ok: hookNote.velocity === 77,
    name: 'Phase A: identity-protected bar 25 velocity unchanged',
  });

  out.push({
    ok: ctx.generationMetadata?.indieArtPopPhaseAApplied === true,
    name: 'Phase A: sets indieArtPopPhaseAApplied metadata',
  });
  out.push({
    ok: Array.isArray(ctx.generationMetadata?.indieArtPopStringsPlaceholderBars),
    name: 'Phase A: records strings-placeholder bar hint list',
  });

  const guitar2 = buildMinimalGuitarPart();
  const bass2 = buildMinimalBassPart();
  const scoreEcm: ScoreModel = createScore('ecm', [guitar2, bass2], { tempo: 120 });
  const ctxEcm = {
    ...minimalIndieContext(),
    generationMetadata: {
      ...minimalIndieContext().generationMetadata,
      styleProfile: 'STYLE_ECM',
    },
  } as unknown as CompositionContext;
  const m4EcmBefore = (scoreEcm.parts[0]!.measures.find((x) => x.index === 4)!.events.find(
    (e) => e.kind === 'note' && ((e as NoteEvent).voice ?? 1) === 2
  ) as NoteEvent)!.velocity;
  applyIndieArtPopPhaseADeepening(scoreEcm, ctxEcm, sections);
  const m4EcmAfter = (scoreEcm.parts[0]!.measures.find((x) => x.index === 4)!.events.find(
    (e) => e.kind === 'note' && ((e as NoteEvent).voice ?? 1) === 2
  ) as NoteEvent)!.velocity;
  out.push({
    ok: m4EcmBefore === m4EcmAfter,
    name: 'Phase A: no-op when style profile is not STYLE_INDIE_ART_POP',
  });

  const gPrimary = buildMinimalGuitarPart();
  const gSecond = buildMinimalGuitar2Part();
  const scoreDual: ScoreModel = createScore('Indie separate tunings (dual electric)', [gPrimary, gSecond], { tempo: 120 });
  const ctxDual = minimalIndieContext({
    mode: 'separate',
    guitar1: { presetId: 'drop_d', strings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
    guitar2: { presetId: 'open_g', strings: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
  });
  const m9g2Before = (scoreDual.parts[1]!.measures.find((x) => x.index === 9)!.events.find(
    (e) => e.kind === 'note'
  ) as NoteEvent)!.velocity;
  applyIndieArtPopPhaseADeepening(scoreDual, ctxDual, sections);
  const m9g2After = (scoreDual.parts[1]!.measures.find((x) => x.index === 9)!.events.find(
    (e) => e.kind === 'note'
  ) as NoteEvent)!.velocity;
  out.push({
    ok: m9g2Before === 78 && m9g2After > m9g2Before,
    name: 'Phase A: separate-tuning route shapes Electric Guitar 2 (ex-bass) velocities by section role',
  });

  const gAlias = buildMinimalGuitarPart();
  const bassAlias = buildMinimalBassPart();
  const scoreAlias: ScoreModel = createScore('alias', [gAlias, bassAlias], { tempo: 120 });
  const ctxAlias = {
    ...minimalIndieContext(),
    generationMetadata: {
      ...minimalIndieContext().generationMetadata,
      styleProfile: 'STYLE_INDEPENDENT_ART_POP' as const,
    },
  } as unknown as CompositionContext;
  const m4AliasBefore = (scoreAlias.parts[0]!.measures.find((x) => x.index === 4)!.events.find(
    (e) => e.kind === 'note' && ((e as NoteEvent).voice ?? 1) === 2
  ) as NoteEvent)!.velocity;
  applyIndieArtPopPhaseADeepening(scoreAlias, ctxAlias, sections);
  const m4AliasAfter = (scoreAlias.parts[0]!.measures.find((x) => x.index === 4)!.events.find(
    (e) => e.kind === 'note' && ((e as NoteEvent).voice ?? 1) === 2
  ) as NoteEvent)!.velocity;
  out.push({
    ok: m4AliasAfter !== m4AliasBefore,
    name: 'Phase A: STYLE_INDEPENDENT_ART_POP alias normalizes to Indie Art Pop and runs',
  });

  return out;
}
