import {
  lyricalAnswerExampleRegion,
  type PentatonicColourTension,
  type PentatonicDepth,
  type PentatonicPurpose,
  type PentatonicRegionInput,
} from '@composer-os/core/pentatonic';

export interface PentatonicInheritedContext {
  tonalCentreRoot?: string;
  tonalCentreMode?: 'major' | 'minor';
  harmonyBars?: readonly string[];
  melodyNotes?: readonly string[];
}

export interface PentatonicFormState {
  tonalCentreRoot: string;
  tonalCentreMode: 'major' | 'minor';
  useInheritedTonalCentre: boolean;
  useInheritedHarmony: boolean;
  useInheritedMelody: boolean;
  homeArchetypeId: string;
  homeReference: string;
  currentMode: 'none' | 'registry' | 'notes';
  currentArchetypeId: string;
  currentReference: string;
  currentNotes: string[];
  harmonyText: string;
  melodyNotes: string[];
  bassNotes: string[];
  heldNotes: string[];
  purpose: '' | PentatonicPurpose;
  colourTension: '' | PentatonicColourTension;
  depth: PentatonicDepth;
  strictMelody: boolean;
  targetNotes: string[];
  protectedNotes: string[];
  cautionNotes: string[];
}

export function emptyPentatonicForm(inherited?: PentatonicInheritedContext | null): PentatonicFormState {
  return {
    tonalCentreRoot: 'C',
    tonalCentreMode: 'major',
    useInheritedTonalCentre: Boolean(inherited?.tonalCentreRoot),
    useInheritedHarmony: Boolean(inherited?.harmonyBars && inherited.harmonyBars.length > 0),
    useInheritedMelody: Boolean(inherited?.melodyNotes && inherited.melodyNotes.length > 0),
    homeArchetypeId: '',
    homeReference: 'A',
    currentMode: 'none',
    currentArchetypeId: 'minor_pentatonic',
    currentReference: 'A',
    currentNotes: [],
    harmonyText: '',
    melodyNotes: [],
    bassNotes: [],
    heldNotes: [],
    purpose: '',
    colourTension: '',
    depth: 'near',
    strictMelody: false,
    targetNotes: [],
    protectedNotes: [],
    cautionNotes: [],
  };
}

export function examplePentatonicForm(): PentatonicFormState {
  const example = lyricalAnswerExampleRegion();
  return {
    ...emptyPentatonicForm(),
    tonalCentreRoot: example.tonalCentre.root,
    tonalCentreMode: example.tonalCentre.mode,
    useInheritedTonalCentre: false,
    useInheritedHarmony: false,
    useInheritedMelody: false,
    homeArchetypeId: example.home?.archetypeId ?? 'minor_pentatonic',
    homeReference: example.home?.referenceNote ?? 'A',
    harmonyText: example.harmonyBars?.[0] ?? '',
    melodyNotes: [...(example.melodyNotes ?? [])],
    bassNotes: [...(example.bassNotes ?? [])],
    purpose: example.purpose ?? 'lyrical_answer',
    depth: example.depth ?? 'near',
  };
}

export function pentatonicFormIsDirty(form: PentatonicFormState): boolean {
  const empty = emptyPentatonicForm();
  const musical = (value: PentatonicFormState) => ({
    tonalCentreRoot: value.tonalCentreRoot,
    tonalCentreMode: value.tonalCentreMode,
    homeArchetypeId: value.homeArchetypeId,
    homeReference: value.homeReference,
    currentMode: value.currentMode,
    currentArchetypeId: value.currentArchetypeId,
    currentReference: value.currentReference,
    currentNotes: value.currentNotes,
    harmonyText: value.harmonyText,
    melodyNotes: value.melodyNotes,
    bassNotes: value.bassNotes,
    heldNotes: value.heldNotes,
    purpose: value.purpose,
    colourTension: value.colourTension,
    depth: value.depth,
    strictMelody: value.strictMelody,
    targetNotes: value.targetNotes,
    protectedNotes: value.protectedNotes,
    cautionNotes: value.cautionNotes,
  });
  return JSON.stringify(musical(form)) !== JSON.stringify(musical(empty));
}

export function resolvePentatonicRegion(
  form: PentatonicFormState,
  inherited?: PentatonicInheritedContext | null
): PentatonicRegionInput {
  const useTonal = form.useInheritedTonalCentre && Boolean(inherited?.tonalCentreRoot);
  const region: PentatonicRegionInput = {
    tonalCentre: {
      root: useTonal ? inherited!.tonalCentreRoot! : form.tonalCentreRoot,
      mode: useTonal ? inherited?.tonalCentreMode ?? form.tonalCentreMode : form.tonalCentreMode,
    },
    depth: form.depth,
    strictMelodyMembership: form.strictMelody,
    melodyNotes:
      form.melodyNotes.length === 0 && form.useInheritedMelody && inherited?.melodyNotes
        ? [...inherited.melodyNotes]
        : [...form.melodyNotes],
    bassNotes: [...form.bassNotes],
    heldNotes: [...form.heldNotes],
    targetNotes: [...form.targetNotes],
    protectedNotes: [...form.protectedNotes],
    cautionNotes: [...form.cautionNotes],
  };
  const typedHarmony = form.harmonyText
    .split('|')
    .map((bar) => bar.trim())
    .filter((bar) => bar.length > 0);
  if (typedHarmony.length > 0) region.harmonyBars = typedHarmony;
  else if (form.useInheritedHarmony && inherited?.harmonyBars) region.harmonyBars = [...inherited.harmonyBars];
  else region.harmonyBars = [];
  if (form.homeArchetypeId) {
    region.home = { archetypeId: form.homeArchetypeId, referenceNote: form.homeReference };
  }
  if (form.currentMode === 'registry') {
    region.current = { archetypeId: form.currentArchetypeId, referenceNote: form.currentReference };
  } else if (form.currentMode === 'notes') {
    region.current = { notes: [...form.currentNotes] };
  }
  if (form.purpose) region.purpose = form.purpose;
  if (form.colourTension) region.colourTension = form.colourTension;
  return region;
}

export function pentatonicFormSnapshot(form: PentatonicFormState, inherited?: PentatonicInheritedContext | null): string {
  return JSON.stringify(resolvePentatonicRegion(form, inherited));
}
