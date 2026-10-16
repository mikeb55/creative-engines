import { useEffect, useRef, useState, type CSSProperties } from 'react';

const PITCH_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

function spellCollection(intervals: readonly number[] | undefined, reference: string, offset: number): string {
  if (!intervals?.length) return '';
  const root = PITCH_NAMES.indexOf(reference);
  if (root < 0) return intervals.join(' ');
  return intervals.map((interval) => PITCH_NAMES[(root + offset + interval + 120) % 12]).join(' ');
}

function hexatonicIdentity(family: '' | BhlHexatonicFamily, id: string, referencePc: number): { text: string; provisional: boolean } | { error: string } | null {
  if (!family || !id) return null;
  try {
    const colour = resolveBhlHexatonicColour({ family, id, referencePc });
    return {
      provisional: colour.provisional,
      text: `${colour.label}. ${colour.status}. Provenance: ${colour.provenance}. Pitches ${colour.pitchClasses.join(' ')}. Artistic approval: no.`,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function collectionPcs(intervals: readonly number[] | undefined, reference: string, offset: number): number[] {
  if (!intervals?.length) return [];
  const root = PITCH_NAMES.indexOf(reference);
  if (root < 0) return [];
  return [...new Set(intervals.map((interval) => (root + offset + interval + 120) % 12))].sort((a, b) => a - b);
}
import { listBhlHexatonicChoices, resolveBhlHexatonicColour, type BhlHexatonicFamily } from '@composer-os/core/bhl/bhlHexatonicColour';
import { api, isDesktopIpc } from '../services/api';
import { takeHexatonicHandoff } from './bhlHexatonicHandoff';
import { ScoreAudition } from '../score/ScoreAudition';
import { ScorePreview } from '../score/ScorePreview';
import { BhlEvidencePanel, type BhlComparisonView, type BhlEvidenceView, type BhlIntentView } from './BhlEvidencePanel';

type Span = { from: number; to: number };

type FieldChoice = { id: string; label: string; source: 'bass' | 'vault' };

type Region = {
  id: string;
  from: number;
  to: number;
  bars: number[];
  role: string;
  vaultChordType: string;
  pitchClasses: number[];
  pitchTransform: string;
  rhythmTransform: string;
  dialogue: string;
  density: string;
};

type Plan = { seed: number; span: Span; motif: { pitchClasses: number[] }; regions: Region[] };

type Inspect = {
  ok: true;
  sourcePath: string;
  sourceSha256: string;
  guitarPartId: string;
  bassPartId: string;
  guitarName: string;
  bassName: string;
  barCount: number;
  span: Span;
  metres: Array<{ partId: string; bar: number; beats: number; beatType: number }>;
  tempo: { beatUnit: string | null; perMinute: string | null; statedAtBar: number | null } | null;
  rehearsal: Array<{ bar: number; text: string; partId: string }>;
  bassEventCount: number;
  protectedGuitarBars: number[];
  plan: Plan;
  fieldChoices: Record<string, FieldChoice[]>;
  evidence: BhlEvidenceView;
};

type Compose = Inspect & {
  seed: number;
  events: Array<{ bar: number; onsetQuarters: number; quarters: number; midis: number[]; regionId: string }>;
  predicates: Array<{ id: string; ok: boolean; detail: string }>;
  feasibility: Array<{ bar: number; onsetQuarters: number; midis: number[]; feasible: boolean; fretSpan: number }>;
  harmony: Array<{ bar: number; label?: string; action?: string }>;
  verification: { ok: boolean; errors: string[]; reimports: boolean };
  outsideIdentical: boolean;
  guitarChanged: boolean;
  sourceUnchanged: boolean;
  xml: string;
  gce: {
    framework: string;
    technicalLabel: string;
    musicalLabel: string;
    musicallyApproved: false;
    candidateForAudition: false;
    notes: string[];
  };
  colourConstraint?: string | null;
  transfers?: {
    pentatonic?: { compatible?: string[]; contrasting?: string[] };
  };
  musicalEvidence: {
    original: BhlEvidenceView;
    candidate: BhlEvidenceView;
    comparison: BhlComparisonView;
    intentions: BhlIntentView[];
    limitations?: Array<{ regionId: string; intention: string; reason: string }>;
    fieldNotes?: Array<{ bar: number; onsetQuarters: number; pitchClass: number; status: 'in-field' | 'outside-permitted' }>;
    provisional: true;
  };
};

type RegionEdit = {
  fieldChoiceId: string;
  density: string;
  dialogue: string;
  pitchTransform: string;
};

const WORLDS = [
  { id: 'A', name: 'Triad Pairs' },
  { id: 'B', name: 'Harmonic Quadratonics' },
  { id: 'C', name: 'Major + Augmented' },
  { id: 'D', name: 'Major + Diminished' },
  { id: 'E', name: 'Pentatonic Harmony' },
  { id: 'F', name: 'Unrelated Major Triads' },
];

const PITCHES = [
  'neighbor-statement',
  'invert-into-field',
  'reproject-neighbor',
  'recall-cell',
  'retain-and-admit-bass',
];

const panel: CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--bg-panel)',
  borderRadius: 8,
  padding: '0.75rem',
  display: 'grid',
  gap: '0.5rem',
};

function editsFrom(plan: Plan): Record<string, RegionEdit> {
  const out: Record<string, RegionEdit> = {};
  for (const region of plan.regions) {
    out[region.id] = {
      fieldChoiceId: 'bass-field',
      density: region.density,
      dialogue: region.dialogue,
      pitchTransform: region.pitchTransform,
    };
  }
  return out;
}

export function BhlComposerPage() {
  const [sourcePath, setSourcePath] = useState('');
  const [spanFrom, setSpanFrom] = useState(33);
  const [spanTo, setSpanTo] = useState(40);
  const [seed, setSeed] = useState(3340);
  const [world, setWorld] = useState('A');
  const [hexFamily, setHexFamily] = useState<'' | BhlHexatonicFamily>('');
  const [hexId, setHexId] = useState('');
  const [hexReference, setHexReference] = useState(0);
  const hexChoices = listBhlHexatonicChoices();
  const [phraseArc, setPhraseArc] = useState('derived');
  const [continuation, setContinuation] = useState('hold');
  const [outsideColour, setOutsideColour] = useState(false);
  const [rhythm, setRhythm] = useState('derived');
  const [protectedText, setProtectedText] = useState('');
  const [exportDir, setExportDir] = useState('');
  const [status, setStatus] = useState('Ready. Wrong Turning is the regression example.');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState<Inspect | null>(null);
  const [edits, setEdits] = useState<Record<string, RegionEdit>>({});
  const [result, setResult] = useState<Compose | null>(null);
  const [stale, setStale] = useState(false);
  const [outputPath, setOutputPath] = useState('');
  const [mode, setMode] = useState<'import' | 'scratch'>('import');
  const [scratchBars, setScratchBars] = useState(16);
  const [scratchBeats, setScratchBeats] = useState(4);
  const [scratchBeatType, setScratchBeatType] = useState(4);
  const [scratchTempo, setScratchTempo] = useState(92);
  const [profileId, setProfileId] = useState('');
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string; description: string; density: string; dialogue: string; rhythm: string; phraseArc: string; continuation: string; quartal: boolean }>>([]);
  const [pentatonicOn, setPentatonicOn] = useState(false);
  const [archetypeId, setArchetypeId] = useState('major_pentatonic');
  const [referenceNote, setReferenceNote] = useState('C');
  const [relationshipId, setRelationshipId] = useState('home');
  const [archetypes, setArchetypes] = useState<Array<{ id: string; name: string; intervals?: number[]; role?: string; family?: string; pathArchetypeId?: string | null }>>([]);
  const [pitchSource, setPitchSource] = useState<'world' | 'riff'>('world');
  const [rhythmSource, setRhythmSource] = useState<'bhl' | 'riff' | 'core-b' | 'other-riff'>('bhl');
  const [rhythmSeed, setRhythmSeed] = useState(29);
  const [riffTransform, setRiffTransform] = useState('original');
  const [displacement, setDisplacement] = useState(0.5);
  const [contrastId, setContrastId] = useState('');
  const [relationships, setRelationships] = useState<Array<{ id: string; label: string; offset?: number }>>([]);
  const [referenceNotes, setReferenceNotes] = useState<string[]>(['C']);
  const [parentOn, setParentOn] = useState(false);
  const [parentText, setParentText] = useState('0 2 4 7 9');
  const [quartal, setQuartal] = useState(false);
  const [motifOn, setMotifOn] = useState(false);
  const [motifKind, setMotifKind] = useState('import');
  const [motifPitches, setMotifPitches] = useState('64 67 71');
  const [motifIntervals, setMotifIntervals] = useState('2 1 -2');
  const [riffSeed, setRiffSeed] = useState(17);
  const [motifTransform, setMotifTransform] = useState('none');
  const [motifSemitones, setMotifSemitones] = useState(2);
  const [catalogNote, setCatalogNote] = useState('');
  const [candidates, setCandidates] = useState<Array<Record<string, unknown>>>([]);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [compareText, setCompareText] = useState('');
  const [projectNotes, setProjectNotes] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [projectId, setProjectId] = useState('bhl-project');
  const [scratchXml, setScratchXml] = useState('');
  const projectRestored = useRef(false);

  useEffect(() => {
    const handoff = takeHexatonicHandoff();
    if (!handoff) return;
    setHexFamily(handoff.family);
    setHexId(handoff.id);
    setHexReference(handoff.referencePc);
    setStatus(`Hexatonic colour ${handoff.id} is provisional until a person accepts it.`);
  }, []);

  useEffect(() => {
    void api.bhlCatalog().then((raw) => {
      const row = raw as {
        ok?: boolean;
        catalog?: {
          profiles: Array<{ id: string; name: string; description: string; density: string; dialogue: string; rhythm: string; phraseArc: string; continuation: string; quartal: boolean }>;
          pentatonic: Array<{ id: string; name: string }>;
          colours?: Array<{ id: string; name: string; intervals: number[]; role: string; family: string; pathArchetypeId: string | null }>;
          relationships: Array<{ id: string; label: string; offset?: number }>;
          referenceNotes: string[];
          notWired: string[];
        };
      };
      if (!row.ok || !row.catalog) return;
      setProfiles(row.catalog.profiles);
      setArchetypes(row.catalog.colours?.length ? row.catalog.colours : row.catalog.pentatonic);
      setRelationships(row.catalog.relationships);
      setReferenceNotes(row.catalog.referenceNotes);
      setCatalogNote(row.catalog.notWired.join(' '));
    }).catch(() => {
      setCatalogNote('Resource catalog failed to load.');
    });
    void api.bhlDefaults().then((raw) => {
      const row = raw as { ok?: boolean; sourcePath?: string; exportDir?: string; span?: Span; error?: string };
      if (!row.ok || !row.sourcePath) {
        setError(row.error || 'BHL defaults failed');
        return;
      }
      if (projectRestored.current) return;
      setSourcePath(row.sourcePath);
      setExportDir(row.exportDir || '');
      if (row.span) {
        setSpanFrom(row.span.from);
        setSpanTo(row.span.to);
      }
    }).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
    });
  }, []);

  function markDirty() {
    setStale(true);
  }

  function musicalBody(): Record<string, unknown> {
    const parentPitchClasses = parentText
      .split(/[^0-9-]+/)
      .filter(Boolean)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value));
    const pitches = motifPitches
      .split(/[^0-9-]+/)
      .filter(Boolean)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value));
    const intervals = motifIntervals
      .split(/[^0-9-]+/)
      .filter(Boolean)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value));
    return {
      ...(profileId ? { profileId } : {}),
      riff: {
        pitchSource,
        rhythmSource,
        pitchSeed: riffSeed,
        rhythmSeed,
        transform: riffTransform,
        displacementQuarters: displacement,
      },
      ...(pentatonicOn ? { pentatonic: { archetypeId, referenceNote, relationshipId, contrastId } } : {}),
      ...(parentOn ? { parentPitchClasses } : {}),
      ...(motifOn
        ? {
            motif: {
              kind: motifKind,
              pitches,
              intervals,
              riffSeed,
              pitchTransform: motifTransform,
              semitones: motifSemitones,
            },
          }
        : {}),
      quartal,
    };
  }

  function applyProfile(id: string) {
    setProfileId(id);
    const profile = profiles.find((item) => item.id === id);
    if (!profile) return;
    setPhraseArc(profile.phraseArc);
    setContinuation(profile.continuation);
    setRhythm(profile.rhythm);
    setQuartal(profile.quartal);
    setEdits((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = { ...next[key]!, density: profile.density, dialogue: profile.dialogue };
      }
      return next;
    });
    markDirty();
  }

  function patchRegion(id: string, patch: Partial<RegionEdit>) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id]!, ...patch } }));
    markDirty();
  }

  async function chooseFile() {
    if (!isDesktopIpc() || !window.composerOsDesktop?.invokeApi) return;
    const picked = (await window.composerOsDesktop.invokeApi('composer-os-api:pick-leadsheet-file', {
      defaultPath: sourcePath,
    })) as { ok?: boolean; filepath?: string };
    if (picked.ok && picked.filepath) {
      setSourcePath(picked.filepath);
      setLocked(null);
      setResult(null);
      setOutputPath('');
    }
  }

  async function onImport() {
    setBusy(true);
    setError('');
    setStatus('Importing and locking…');
    setResult(null);
    setOutputPath('');
    try {
      const raw = await api.bhlInspect({
        sourcePath,
        span: { from: spanFrom, to: spanTo },
        protectedGuitarBars: protectedText,
        seed,
      });
      const row = raw as Inspect | { ok: false; error: string };
      if (!row.ok) throw new Error(row.error);
      setLocked(row);
      setEdits(editsFrom(row.plan));
      setSourcePath(row.sourcePath);
      setStale(false);
      setStatus(`Locked ${row.bassName} and ${row.guitarName}. Source file was not written.`);
    } catch (err) {
      setLocked(null);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('Import failed.');
    } finally {
      setBusy(false);
    }
  }

  async function onGenerate() {
    if (!locked) return;
    setBusy(true);
    setError('');
    setStatus('Generating guitar with the BHL composer…');
    setOutputPath('');
    try {
      const regions = locked.plan.regions.map((region) => ({
        id: region.id,
        ...(edits[region.id] ?? {}),
      }));
      const raw = await api.bhlCompose({
        sourcePath: locked.sourcePath,
        span: { from: spanFrom, to: spanTo },
        seed,
        world,
        phraseArc,
        continuation,
        outsideColour,
        rhythm,
        protectedGuitarBars: protectedText,
        regions,
        musical: musicalBody(),
        quartal,
        hexatonic: hexatonicBody(),
      });
      const row = raw as Compose | { ok: false; error: string };
      if (!row.ok) throw new Error(row.error);
      setResult(row);
      setStale(false);
      setStatus(row.verification.ok ? 'Generated. Locks passed. Export writes a new file.' : 'Generated. Locks failed.');
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('Generate failed.');
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    if (!result) return;
    setBusy(true);
    setError('');
    setStatus('Exporting MusicXML…');
    try {
      const raw = await api.bhlExport({
        sourcePath: result.sourcePath,
        span: result.span,
        seed: result.seed,
        protectedGuitarBars: result.protectedGuitarBars,
        sourceSha256: result.sourceSha256,
        xml: result.xml,
      });
      const row = raw as { ok: true; outputPath: string; bytes: number } | { ok: false; error: string };
      if (!row.ok) throw new Error(row.error);
      setOutputPath(row.outputPath);
      const blob = new Blob([result.xml], { type: 'application/vnd.recordare.musicxml+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = row.outputPath.split(/[/\\]/).pop() || 'bhl.musicxml';
      link.click();
      URL.revokeObjectURL(url);
      setStatus(`Exported ${row.bytes} bytes. Source file unchanged.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('Export failed.');
    } finally {
      setBusy(false);
    }
  }

  async function onScratch() {
    setBusy(true);
    setError('');
    setStatus('Writing a new guitar and bass score…');
    try {
      const raw = await api.bhlScratch({
        bars: scratchBars,
        beats: scratchBeats,
        beatType: scratchBeatType,
        tempo: scratchTempo,
        seed,
        title: 'BHL from scratch',
        overwrite: false,
      });
      const row = raw as { ok: true; sourcePath: string; xml: string; span: Span; sections: Array<{ mark: string; role: string; from: number; to: number }> } | { ok: false; error: string };
      if (!row.ok) throw new Error(row.error);
      setScratchXml(row.xml);
      setSourcePath(row.sourcePath);
      setSpanFrom(row.span.from);
      setSpanTo(row.span.to);
      setLocked(null);
      setResult(null);
      setCandidates([]);
      setStatus(`New score ${row.sections.map((section) => `${section.mark} ${section.role} ${section.from}–${section.to}`).join(' · ')}. Import and lock it.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('New score failed.');
    } finally {
      setBusy(false);
    }
  }

  function hexatonicBody(): { family: BhlHexatonicFamily; id: string; referencePc: number } | null {
    if (!hexFamily || !hexId) return null;
    return { family: hexFamily, id: hexId, referencePc: hexReference };
  }

  function generationBody(extra: Record<string, unknown> = {}) {
    const regions = locked?.plan.regions.map((region) => ({
      id: region.id,
      ...(edits[region.id] ?? {}),
    }));
    return {
      sourcePath,
      span: { from: spanFrom, to: spanTo },
      seed,
      world,
      phraseArc,
      continuation,
      outsideColour,
      rhythm,
      protectedGuitarBars: protectedText,
      regions,
      musical: musicalBody(),
      quartal,
      hexatonic: hexatonicBody(),
      ...extra,
    };
  }

  async function onCandidates() {
    if (!locked) return;
    setBusy(true);
    setError('');
    setStatus('Generating three candidates…');
    try {
      const raw = await api.bhlCandidates(generationBody());
      const row = raw as { ok: true; candidates: Array<Record<string, unknown>> } | { ok: false; error: string };
      if (!row.ok) throw new Error(row.error);
      setCandidates(row.candidates);
      setSelectedCandidate(String(row.candidates[0]?.id ?? ''));
      setCompareText('');
      setStatus('Three candidates stored. Comparison uses those files and does not generate again.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('Candidate generation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function onCompare() {
    const left = candidates.find((item) => item.id === selectedCandidate) ?? candidates[0];
    const right = candidates.find((item) => item.id !== left?.id);
    if (!left || !right) return;
    setBusy(true);
    setError('');
    try {
      const raw = await api.bhlCompare({
        leftXml: left.xml,
        rightXml: right.xml,
        span: { from: spanFrom, to: spanTo },
      });
      const row = raw as { ok: true; left: Record<string, unknown>; right: Record<string, unknown>; comparison: { notice: string } } | { ok: false; error: string };
      if (!row.ok) throw new Error(row.error);
      setCompareText(
        `${left.label} attacks ${String(row.left.guitarAttacks)}, rests ${String(row.left.guitarRests)}, voices ${JSON.stringify(row.left.voices)}, silences ${String(row.left.silences)}.\n${right.label} attacks ${String(row.right.guitarAttacks)}, rests ${String(row.right.guitarRests)}, voices ${JSON.stringify(row.right.voices)}, silences ${String(row.right.silences)}.\n${row.comparison.notice}`,
      );
      setStatus('Compared the stored MusicXML.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onRefine() {
    const original = candidates.find((item) => item.id === selectedCandidate);
    if (!original || !locked) return;
    setBusy(true);
    setError('');
    setStatus('Refining a copy. The selected candidate stays in the list.');
    try {
      const raw = await api.bhlRefine(generationBody({ original, seed: seed + 1 }));
      const row = raw as { ok: true; refined: Record<string, unknown> } | { ok: false; error: string };
      if (!row.ok) throw new Error(row.error);
      setCandidates((prev) => [...prev, row.refined]);
      setSelectedCandidate(String(row.refined.id));
      setStatus('Refined candidate added. The original is still in the list.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSaveProject() {
    setBusy(true);
    setError('');
    try {
      if (!locked) throw new Error('Import and lock before saving.');
      const project = {
        format: 'bhl-project',
        version: 1,
        id: projectId,
        title: projectId,
        savedAt: new Date().toISOString(),
        notes: projectNotes,
        mode,
        source: {
          path: locked.sourcePath,
          sha256: locked.sourceSha256,
          ...(mode === 'scratch' && scratchXml ? { xml: scratchXml } : {}),
        },
        span: { from: spanFrom, to: spanTo },
        world,
        settings: { seed, phraseArc, continuation, rhythm, outsideColour, musical: musicalBody(), hexatonic: hexatonicBody() },
        candidates: candidates.map((item) => ({
          ...item,
          notes: typeof item.notes === 'string' ? item.notes : projectNotes,
          decision: typeof item.decision === 'string' ? item.decision : '',
        })),
        selectedCandidateId: selectedCandidate || null,
      };
      const raw = await api.bhlSaveProject({ project, overwrite: false });
      const row = raw as { ok: true; path: string } | { ok: false; error: string };
      if (!row.ok) throw new Error(row.error);
      setProjectPath(row.path);
      setStatus(`Saved ${row.path}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onOpenProject() {
    if (!projectPath) return;
    setBusy(true);
    setError('');
    try {
      const raw = await api.bhlOpenProject({ path: projectPath });
      const row = raw as { ok: true; project: Record<string, unknown> } | { ok: false; error: string };
      if (!row.ok) throw new Error(row.error);
      projectRestored.current = true;
      const project = row.project;
      const source = project.source as { path?: string };
      const restoredPath = source?.path ?? sourcePath;
      if (source?.path) setSourcePath(source.path);
      const span = project.span as Span;
      if (span) {
        setSpanFrom(span.from);
        setSpanTo(span.to);
      }
      if (typeof project.world === 'string') setWorld(project.world);
      const settings = project.settings as { seed?: number; phraseArc?: string; continuation?: string; rhythm?: string; outsideColour?: boolean; musical?: Record<string, unknown>; hexatonic?: { family?: BhlHexatonicFamily; id?: string; referencePc?: number } | null } | undefined;
      if (settings) {
        if (typeof settings.seed === 'number') setSeed(settings.seed);
        if (typeof settings.phraseArc === 'string') setPhraseArc(settings.phraseArc);
        if (typeof settings.continuation === 'string') setContinuation(settings.continuation);
        if (typeof settings.rhythm === 'string') setRhythm(settings.rhythm);
        if (typeof settings.outsideColour === 'boolean') setOutsideColour(settings.outsideColour);
        if (settings.hexatonic?.family && settings.hexatonic.id) {
          setHexFamily(settings.hexatonic.family);
          setHexId(settings.hexatonic.id);
          setHexReference(settings.hexatonic.referencePc ?? 0);
        }
        const musical = settings.musical ?? {};
        const riff = musical.riff as { pitchSource?: string; rhythmSource?: string; pitchSeed?: number; rhythmSeed?: number; transform?: string; displacementQuarters?: number } | undefined;
        if (riff?.pitchSource === 'riff' || riff?.pitchSource === 'world') setPitchSource(riff.pitchSource);
        if (riff?.rhythmSource === 'bhl' || riff?.rhythmSource === 'riff' || riff?.rhythmSource === 'core-b' || riff?.rhythmSource === 'other-riff') setRhythmSource(riff.rhythmSource);
        if (typeof riff?.pitchSeed === 'number') setRiffSeed(riff.pitchSeed);
        if (typeof riff?.rhythmSeed === 'number') setRhythmSeed(riff.rhythmSeed);
        if (typeof riff?.transform === 'string') setRiffTransform(riff.transform);
        if (typeof riff?.displacementQuarters === 'number') setDisplacement(riff.displacementQuarters);
        const pent = musical.pentatonic as { archetypeId?: string; referenceNote?: string; relationshipId?: string; contrastId?: string } | undefined;
        setPentatonicOn(Boolean(pent));
        if (pent?.archetypeId) setArchetypeId(pent.archetypeId);
        if (pent?.referenceNote) setReferenceNote(pent.referenceNote);
        if (pent?.relationshipId) setRelationshipId(pent.relationshipId);
        setContrastId(pent?.contrastId ?? '');
        if (typeof musical.profileId === 'string') setProfileId(musical.profileId);
        setQuartal(musical.quartal === true);
      }
      if (typeof project.notes === 'string') setProjectNotes(project.notes);
      if (typeof project.mode === 'string') setMode(project.mode === 'scratch' ? 'scratch' : 'import');
      const stored = Array.isArray(project.candidates) ? (project.candidates as Array<Record<string, unknown>>) : [];
      setCandidates(stored);
      setSelectedCandidate(typeof project.selectedCandidateId === 'string' ? project.selectedCandidateId : String(stored[0]?.id ?? ''));
      setResult(null);
      const restoredWorld = typeof project.world === 'string' ? project.world : world;
      const restoredSpan = span ?? { from: spanFrom, to: spanTo };
      try {
        const inspected = await api.bhlInspect({
          sourcePath: restoredPath,
          span: restoredSpan,
          protectedGuitarBars: protectedText,
          seed: typeof settings?.seed === 'number' ? settings.seed : seed,
        });
        const lockedRow = inspected as Inspect | { ok: false; error: string };
        if (!lockedRow.ok) throw new Error(lockedRow.error);
        setLocked(lockedRow);
        setEdits(editsFrom(lockedRow.plan));
        setSourcePath(lockedRow.sourcePath);
        setStatus(`Project reopened. Harmonic world ${restoredWorld} restored and the source is locked again.`);
      } catch (lockError) {
        setLocked(null);
        const detail = lockError instanceof Error ? lockError.message : String(lockError);
        setStatus(`Project reopened. Harmonic world ${restoredWorld} restored. Lock again before generating. ${detail}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onOpen() {
    if (!outputPath) return;
    setError('');
    try {
      const raw = await api.bhlOpen({ outputPath });
      const row = raw as { ok: true; openedWith: string } | { ok: false; error: string };
      if (!row.ok) throw new Error(row.error);
      setStatus(`Asked ${row.openedWith} to open the export.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const protectedKey = protectedText
    .split(/[^0-9]+/)
    .filter(Boolean)
    .join(',');
  const selectedCandidateRow = candidates.find((item) => item.id === selectedCandidate) ?? null;
  const selectedCandidateXml = typeof selectedCandidateRow?.xml === 'string' ? selectedCandidateRow.xml : '';
  const selectedCandidateLabel = selectedCandidateRow
    ? String(selectedCandidateRow.label ?? selectedCandidateRow.id ?? 'Candidate')
    : '';
  const lockInputsDiffer = Boolean(
    locked &&
      (locked.sourcePath !== sourcePath ||
        locked.span.from !== spanFrom ||
        locked.span.to !== spanTo ||
        locked.protectedGuitarBars.join(',') !== protectedKey),
  );
  const guitarMetres = locked?.metres.filter((metre) => metre.partId === locked.guitarPartId) ?? [];
  const warnings = result?.feasibility.filter((note) => !note.feasible) ?? [];
  const failedPredicates = result?.predicates.filter((item) => !item.ok) ?? [];

  return (
    <div data-testid="bhl-page" style={{ display: 'grid', gap: '0.75rem' }}>
      <h2 style={{ margin: 0 }}>BHL Composer</h2>
      <p style={{ margin: 0, color: 'var(--text-muted)' }} data-testid="bhl-status">
        {status}
      </p>
      {error ? (
        <p data-testid="bhl-error" style={{ margin: 0, color: 'var(--error)' }}>
          {error}
        </p>
      ) : null}

      <section style={panel} data-testid="bhl-source-mode">
        <h3 style={{ margin: 0 }}>1. Source or new composition</h3>
        <label htmlFor="bhl-mode">
          Mode
          <select
            id="bhl-mode"
            data-testid="bhl-mode"
            value={mode}
            onChange={(event) => setMode(event.target.value === 'scratch' ? 'scratch' : 'import')}
            style={{ marginLeft: '0.35rem' }}
          >
            <option value="import">Import MusicXML</option>
            <option value="scratch">New composition</option>
          </select>
        </label>
        {mode === 'scratch' ? (
          <div data-testid="bhl-scratch" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'end' }}>
            <label htmlFor="bhl-scratch-bars">
              Bars
              <input id="bhl-scratch-bars" data-testid="bhl-scratch-bars" type="number" min={6} max={64} value={scratchBars} onChange={(event) => setScratchBars(Number(event.target.value))} style={{ width: '4rem', marginLeft: '0.35rem' }} />
            </label>
            <label htmlFor="bhl-scratch-beats">
              Beats
              <input id="bhl-scratch-beats" data-testid="bhl-scratch-beats" type="number" min={2} max={7} value={scratchBeats} onChange={(event) => setScratchBeats(Number(event.target.value))} style={{ width: '4rem', marginLeft: '0.35rem' }} />
            </label>
            <label htmlFor="bhl-scratch-type">
              Beat type
              <input id="bhl-scratch-type" data-testid="bhl-scratch-type" type="number" value={scratchBeatType} onChange={(event) => setScratchBeatType(Number(event.target.value))} style={{ width: '4rem', marginLeft: '0.35rem' }} />
            </label>
            <label htmlFor="bhl-scratch-tempo">
              Tempo
              <input id="bhl-scratch-tempo" data-testid="bhl-scratch-tempo" type="number" min={40} max={240} value={scratchTempo} onChange={(event) => setScratchTempo(Number(event.target.value))} style={{ width: '5rem', marginLeft: '0.35rem' }} />
            </label>
            <button type="button" data-testid="bhl-scratch-create" onClick={() => void onScratch()} disabled={busy}>
              Create guitar and bass score
            </button>
          </div>
        ) : null}
      </section>

      <section style={panel} data-testid="bhl-import">
        <h3 style={{ margin: 0 }}>Import and lock</h3>
        <label htmlFor="bhl-source">
          MusicXML path
          <input
            id="bhl-source"
            data-testid="bhl-source"
            value={sourcePath}
            onChange={(event) => {
              setSourcePath(event.target.value);
              setLocked(null);
              setResult(null);
            }}
            style={{ width: '100%', marginTop: '0.25rem' }}
          />
        </label>
        {isDesktopIpc() ? (
          <button type="button" className="secondary" onClick={() => void chooseFile()}>
            Choose MusicXML
          </button>
        ) : null}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label htmlFor="bhl-from">
            From bar
            <input
              id="bhl-from"
              data-testid="bhl-from"
              type="number"
              min={1}
              value={spanFrom}
              onChange={(event) => {
                setSpanFrom(Number(event.target.value));
                markDirty();
              }}
              style={{ width: '5rem', marginLeft: '0.35rem' }}
            />
          </label>
          <label htmlFor="bhl-to">
            To bar
            <input
              id="bhl-to"
              data-testid="bhl-to"
              type="number"
              min={1}
              value={spanTo}
              onChange={(event) => {
                setSpanTo(Number(event.target.value));
                markDirty();
              }}
              style={{ width: '5rem', marginLeft: '0.35rem' }}
            />
          </label>
          <label htmlFor="bhl-seed">
            Seed
            <input
              id="bhl-seed"
              data-testid="bhl-seed"
              type="number"
              value={seed}
              onChange={(event) => {
                setSeed(Number(event.target.value));
                markDirty();
              }}
              style={{ width: '6rem', marginLeft: '0.35rem' }}
            />
          </label>
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Same seed and same controls repeat the same guitar. A different seed moves the world line.
        </p>
        <label htmlFor="bhl-world">
          Harmonic world
          <select
            id="bhl-world"
            data-testid="bhl-world"
            value={world}
            onChange={(event) => {
              setWorld(event.target.value);
              markDirty();
            }}
            style={{ width: '100%', marginTop: '0.25rem' }}
          >
            {WORLDS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id} · {item.name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="bhl-hex-family">
          Hexatonic colour
          <select
            id="bhl-hex-family"
            data-testid="bhl-hex-family"
            value={hexFamily}
            onChange={(event) => {
              const family = event.target.value as '' | BhlHexatonicFamily;
              setHexFamily(family);
              const first = hexChoices.find((choice) => choice.family === family);
              setHexId(first?.id ?? '');
              markDirty();
            }}
            style={{ width: '100%', marginTop: '0.25rem' }}
          >
            <option value="">None — world pitches stay</option>
            <option value="scalar">Scalar collection</option>
            <option value="wps">WPS pair</option>
            <option value="provisional">Provisional H6 candidate</option>
          </select>
        </label>
        {hexFamily ? (
          <>
            <label htmlFor="bhl-hex-id">
              Construction
              <select
                id="bhl-hex-id"
                data-testid="bhl-hex-id"
                value={hexId}
                onChange={(event) => {
                  setHexId(event.target.value);
                  markDirty();
                }}
                style={{ width: '100%', marginTop: '0.25rem' }}
              >
                {hexChoices.filter((choice) => choice.family === hexFamily).map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.label}{choice.provisional ? ' — provisional' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="bhl-hex-reference">
              Reference note
              <select
                id="bhl-hex-reference"
                data-testid="bhl-hex-reference"
                value={hexReference}
                onChange={(event) => {
                  setHexReference(Number(event.target.value));
                  markDirty();
                }}
                style={{ marginLeft: '0.35rem' }}
              >
                {PITCH_NAMES.map((name, index) => (
                  <option key={name} value={index}>{name}</option>
                ))}
              </select>
            </label>
          </>
        ) : null}
        {(() => {
          const identity = hexatonicIdentity(hexFamily, hexId, hexReference);
          if (!identity) return null;
          if ('error' in identity) return <p data-testid="bhl-hex-identity">{identity.error}</p>;
          return <p data-testid="bhl-hex-identity">{identity.text}</p>;
        })()}
        <label htmlFor="bhl-protected">
          Protected guitar bars
          <input
            id="bhl-protected"
            data-testid="bhl-protected"
            value={protectedText}
            placeholder="empty, or 33, 36"
            onChange={(event) => {
              setProtectedText(event.target.value);
              markDirty();
            }}
            style={{ width: '100%', marginTop: '0.25rem' }}
          />
        </label>
        <button type="button" data-testid="bhl-import-lock" onClick={() => void onImport()} disabled={busy || !sourcePath}>
          Import and lock
        </button>
        {locked ? (
          <div data-testid="bhl-lock" style={{ display: 'grid', gap: '0.25rem' }}>
            <p style={{ margin: 0 }}>
              Guitar {locked.guitarName} ({locked.guitarPartId}). Bass {locked.bassName} ({locked.bassPartId}).
            </p>
            <p style={{ margin: 0 }} data-testid="bhl-tempo">
              Tempo {locked.tempo?.perMinute ?? '—'} {locked.tempo?.beatUnit ?? ''}
              {locked.tempo?.statedAtBar ? `, stated at bar ${locked.tempo.statedAtBar}` : ''}
            </p>
            <p style={{ margin: 0 }} data-testid="bhl-metre">
              Metre{' '}
              {guitarMetres.map((metre) => `${metre.bar}:${metre.beats}/${metre.beatType}`).join(' · ')}
            </p>
            <p style={{ margin: 0 }} data-testid="bhl-rehearsal">
              Rehearsal {locked.rehearsal.map((mark) => `${mark.bar}:${mark.text}`).join(', ') || 'none in this span'}
            </p>
            <p style={{ margin: 0 }} data-testid="bhl-sha">
              Source SHA-256 {locked.sourceSha256}
            </p>
            <p style={{ margin: 0 }}>Bass events in the span: {locked.bassEventCount}. Those events stay locked.</p>
          </div>
        ) : null}
      </section>

      {locked ? (
        <section style={panel} data-testid="bhl-configure">
          <h3 style={{ margin: 0 }}>Phrase and harmonic world</h3>
          <h3 style={{ margin: 0 }}>2. Musical language</h3>
          <label htmlFor="bhl-profile">
            Approach
            <select
              id="bhl-profile"
              data-testid="bhl-profile"
              value={profileId}
              onChange={(event) => applyProfile(event.target.value)}
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              <option value="">No profile — use the controls below</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
          {profileId ? (
            <p style={{ margin: 0 }} data-testid="bhl-profile-copy">
              {profiles.find((profile) => profile.id === profileId)?.description} Changing density, dialogue, rhythm, or continuation overrides the profile.
            </p>
          ) : null}
          <label htmlFor="bhl-arc">
            Phrase development
            <select
              id="bhl-arc"
              data-testid="bhl-phrase-arc"
              value={phraseArc}
              onChange={(event) => {
                setPhraseArc(event.target.value);
                markDirty();
              }}
              style={{ marginLeft: '0.35rem' }}
            >
              <option value="derived">follow the bass phrase</option>
              <option value="invert">invert the development</option>
              <option value="recall">recall the cell on the return</option>
            </select>
          </label>
          <label htmlFor="bhl-continuation">
            Phrase continuation
            <select
              id="bhl-continuation"
              data-testid="bhl-continuation"
              value={continuation}
              onChange={(event) => {
                setContinuation(event.target.value);
                markDirty();
              }}
              style={{ marginLeft: '0.35rem' }}
            >
              <option value="hold">keep the region's assigned dialogue</option>
              <option value="extend">extend the motif</option>
              <option value="fragment">fragment the motif</option>
              <option value="sequence">sequence the shape inside the field</option>
              <option value="rhythm">keep the rhythm, change the pitches</option>
              <option value="converse">answer the bass</option>
            </select>
          </label>
          <label htmlFor="bhl-outside">
            <input
              id="bhl-outside"
              data-testid="bhl-outside-colour"
              type="checkbox"
              checked={outsideColour}
              onChange={(event) => {
                setOutsideColour(event.target.checked);
                markDirty();
              }}
            />{' '}
            Permit one outside-field colour
          </label>
          <label htmlFor="bhl-rhythm">
            Rhythm
            <select
              id="bhl-rhythm"
              data-testid="bhl-rhythm"
              value={rhythm}
              onChange={(event) => {
                setRhythm(event.target.value);
                markDirty();
              }}
              style={{ marginLeft: '0.35rem' }}
            >
              <option value="derived">from the bass</option>
              <option value="displace">displace</option>
              <option value="syncopate">syncopate</option>
              <option value="sparse">sparse</option>
            </select>
          </label>
          {locked.plan.regions.map((region) => {
            const edit = edits[region.id];
            const choices = locked.fieldChoices[region.id] ?? [];
            if (!edit) return null;
            return (
              <div key={region.id} data-testid="bhl-region" style={{ display: 'grid', gap: '0.35rem' }}>
                <strong>
                  {region.role} · bars {region.bars.join(', ')} · rhythm {region.rhythmTransform}
                </strong>
                <label htmlFor={`bhl-field-${region.id}`}>
                  Harmonic field
                  <select
                    id={`bhl-field-${region.id}`}
                    data-testid="bhl-field"
                    value={edit.fieldChoiceId}
                    onChange={(event) => patchRegion(region.id, { fieldChoiceId: event.target.value })}
                    style={{ width: '100%', marginTop: '0.25rem' }}
                  >
                    {choices.map((choice) => (
                      <option key={choice.id} value={choice.id}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor={`bhl-pitch-${region.id}`}>
                  Motivic development
                  <select
                    id={`bhl-pitch-${region.id}`}
                    data-testid="bhl-pitch"
                    value={edit.pitchTransform}
                    onChange={(event) => patchRegion(region.id, { pitchTransform: event.target.value })}
                    style={{ width: '100%', marginTop: '0.25rem' }}
                  >
                    {PITCHES.map((pitch) => (
                      <option key={pitch} value={pitch}>
                        {pitch}
                      </option>
                    ))}
                  </select>
                </label>
                <label htmlFor={`bhl-density-${region.id}`}>
                  Rhythmic density
                  <select
                    id={`bhl-density-${region.id}`}
                    data-testid="bhl-density"
                    value={edit.density}
                    onChange={(event) => patchRegion(region.id, { density: event.target.value })}
                    style={{ marginLeft: '0.35rem' }}
                  >
                    <option value="dyad">dyad</option>
                    <option value="triad">triad</option>
                    <option value="single">single line</option>
                    <option value="alternate">alternate</option>
                    <option value="counterline">counterline</option>
                  </select>
                </label>
                <label htmlFor={`bhl-dialogue-${region.id}`}>
                  Bass dialogue
                  <select
                    id={`bhl-dialogue-${region.id}`}
                    data-testid="bhl-dialogue"
                    value={edit.dialogue}
                    onChange={(event) => patchRegion(region.id, { dialogue: event.target.value })}
                    style={{ marginLeft: '0.35rem' }}
                  >
                    <option value="answer-after-bass">answer after bass</option>
                    <option value="counter-motion">counter-motion</option>
                    <option value="handoff-before-bass">handoff before bass</option>
                    <option value="leave-space">leave space</option>
                  </select>
                </label>
              </div>
            );
          })}
          <details data-testid="bhl-riff-rhythm" open>
            <summary>Riff pitch, riff rhythm, and transformation</summary>
            <p style={{ margin: '0.35rem 0', color: 'var(--text-muted)' }}>
              Pitch and rhythm are chosen separately. The riff engine&apos;s Cmaj7 chord is not copied. Accents and articulations are not in the riff data, so they are not invented.
            </p>
            <label htmlFor="bhl-pitch-source">
              Riff pitch
              <select id="bhl-pitch-source" data-testid="bhl-pitch-source" value={pitchSource} onChange={(event) => { setPitchSource(event.target.value === 'riff' ? 'riff' : 'world'); markDirty(); }}>
                <option value="world">BHL world pitches</option>
                <option value="riff">Riff contour</option>
              </select>
            </label>
            <label htmlFor="bhl-rhythm-source">
              Riff rhythm
              <select id="bhl-rhythm-source" data-testid="bhl-rhythm-source" value={rhythmSource} onChange={(event) => {
                const value = event.target.value;
                setRhythmSource(value === 'riff' || value === 'core-b' || value === 'other-riff' ? value : 'bhl');
                markDirty();
              }}>
                <option value="bhl">BHL rhythm</option>
                <option value="riff">This riff&apos;s rhythm</option>
                <option value="core-b">Another core cell</option>
                <option value="other-riff">Multi-bar engine rhythm</option>
              </select>
            </label>
            {rhythmSource === 'core-b' || rhythmSource === 'other-riff' ? (
              <label htmlFor="bhl-rhythm-seed">
                Rhythm seed
                <input id="bhl-rhythm-seed" data-testid="bhl-rhythm-seed" type="number" value={rhythmSeed} onChange={(event) => { setRhythmSeed(Number(event.target.value)); markDirty(); }} />
              </label>
            ) : null}
            <label htmlFor="bhl-riff-transform">
              Rhythmic transformation
              <select id="bhl-riff-transform" data-testid="bhl-riff-transform" value={riffTransform} onChange={(event) => { setRiffTransform(event.target.value); markDirty(); }}>
                <option value="original">Original — state the cell once</option>
                <option value="continue">Continue — repeat the cell</option>
                <option value="displace">Displace</option>
                <option value="augment">Augment — twice as long</option>
                <option value="diminish">Diminish — twice as fast</option>
                <option value="fragment">Fragment — keep the opening</option>
                <option value="rest">Insert a rest</option>
              </select>
            </label>
            {riffTransform === 'displace' ? (
              <label htmlFor="bhl-displacement">
                Displacement in quarter-lengths
                <input id="bhl-displacement" data-testid="bhl-displacement" type="number" step="0.25" value={displacement} onChange={(event) => { setDisplacement(Number(event.target.value)); markDirty(); }} />
              </label>
            ) : null}
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              {rhythmSource === 'bhl'
                ? 'The Rhythm menu above still writes the guitar attacks.'
                : rhythmSource === 'riff'
                  ? 'Attacks come from the same core cell as the pitch riff. The rhythm seed is not used. Leave-space, handoff, silence, and protected guitar bars still win. A note that cannot fit the bar or the division grid is named and left out. It is not quantised.'
                  : rhythmSource === 'core-b'
                    ? 'Pitch stays on the pitch riff. Rhythm comes from a second core cell, generateRiffCoreMotif at the rhythm seed. Use a different seed from the pitch riff.'
                    : 'Rhythm comes from the multi-bar engine, buildMultiBarRhythm: four 4/4 bars, sixteenth grid, medium, neutral. There is no stored second corpus riff. The cell is placed into the phrase metre, including mixed metre, without quantising.'}
            </p>
          </details>
          <details data-testid="bhl-resources">
            <summary>Pentatonic, motif, and quartal colour</summary>
            <label htmlFor="bhl-pentatonic-on">
              <input id="bhl-pentatonic-on" data-testid="bhl-pentatonic-on" type="checkbox" checked={pentatonicOn} onChange={(event) => { setPentatonicOn(event.target.checked); markDirty(); }} /> Use a pentatonic collection on the development
            </label>
            {pentatonicOn ? (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <label htmlFor="bhl-archetype">
                  Collection
                  <select id="bhl-archetype" data-testid="bhl-archetype" value={archetypeId} onChange={(event) => { setArchetypeId(event.target.value); markDirty(); }}>
                    {archetypes.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label htmlFor="bhl-reference">
                  Reference
                  <select id="bhl-reference" data-testid="bhl-reference" value={referenceNote} onChange={(event) => { setReferenceNote(event.target.value); markDirty(); }}>
                    {referenceNotes.map((note) => (
                      <option key={note} value={note}>{note}</option>
                    ))}
                  </select>
                </label>
                <label htmlFor="bhl-relationship">
                  Relationship
                  <select id="bhl-relationship" data-testid="bhl-relationship" value={relationshipId} onChange={(event) => { setRelationshipId(event.target.value); markDirty(); }}>
                    {relationships.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label htmlFor="bhl-contrast">
                  Contrasting collection
                  <select id="bhl-contrast" data-testid="bhl-contrast" value={contrastId} onChange={(event) => { setContrastId(event.target.value); markDirty(); }}>
                    <option value="">None</option>
                    {archetypes.filter((item) => item.id !== archetypeId).map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
            {pentatonicOn ? (
              <p data-testid="bhl-colour-pcs" style={{ margin: 0 }}>
                Pitch classes: {spellCollection(archetypes.find((item) => item.id === archetypeId)?.intervals, referenceNote, relationships.find((item) => item.id === relationshipId)?.offset ?? 0) || 'not loaded'}
                {archetypes.find((item) => item.id === archetypeId)?.role ? ` — ${archetypes.find((item) => item.id === archetypeId)?.role}` : ''}
                {' '}Relationship shifts this collection. It does not add a new scale.
              </p>
            ) : null}
            {pentatonicOn ? (
              <p data-testid="bhl-colour-pairs" style={{ margin: 0 }}>
                {(() => {
                  const offset = relationships.find((item) => item.id === relationshipId)?.offset ?? 0;
                  const mine = new Set(collectionPcs(archetypes.find((item) => item.id === archetypeId)?.intervals, referenceNote, offset));
                  const rows = archetypes
                    .filter((item) => item.id !== archetypeId)
                    .map((item) => {
                      const pcs = collectionPcs(item.intervals, referenceNote, offset);
                      const shared = pcs.filter((pitchClass) => mine.has(pitchClass));
                      return { name: item.name, shared: shared.length };
                    });
                  const compatible = rows.filter((row) => row.shared >= 3).slice(0, 4).map((row) => `${row.name} (${row.shared})`);
                  const contrasting = rows.filter((row) => row.shared <= 1).slice(0, 4).map((row) => `${row.name} (${row.shared})`);
                  return `Compatible pairs: ${compatible.join(', ') || 'none with three shared pitches'}. Contrasting fields: ${contrasting.join(', ') || 'none with one or none shared'}.`;
                })()}
              </p>
            ) : null}
            <label htmlFor="bhl-parent-on">
              <input id="bhl-parent-on" data-testid="bhl-parent-on" type="checkbox" checked={parentOn} onChange={(event) => { setParentOn(event.target.checked); markDirty(); }} /> Derive a field from these pitch classes when no collection is selected
            </label>
            {parentOn ? (
              <input id="bhl-parent" data-testid="bhl-parent" value={parentText} onChange={(event) => { setParentText(event.target.value); markDirty(); }} />
            ) : null}
            <label htmlFor="bhl-quartal">
              <input id="bhl-quartal" data-testid="bhl-quartal" type="checkbox" checked={quartal} onChange={(event) => { setQuartal(event.target.checked); markDirty(); }} /> Quartal colour on dyads when the collection has a fourth
            </label>
            <label htmlFor="bhl-motif-on">
              <input id="bhl-motif-on" data-testid="bhl-motif-on" type="checkbox" checked={motifOn} onChange={(event) => { setMotifOn(event.target.checked); markDirty(); }} /> Replace the opening cell
            </label>
            {motifOn ? (
              <div style={{ display: 'grid', gap: '0.35rem' }}>
                <label htmlFor="bhl-motif-kind">
                  Motif source
                  <select id="bhl-motif-kind" data-testid="bhl-motif-kind" value={motifKind} onChange={(event) => { setMotifKind(event.target.value); markDirty(); }}>
                    <option value="import">Imported pitches</option>
                    <option value="constraints">Intervals</option>
                    <option value="riff">Existing riff generator</option>
                  </select>
                </label>
                {motifKind === 'import' ? (
                  <input data-testid="bhl-motif-pitches" value={motifPitches} onChange={(event) => { setMotifPitches(event.target.value); markDirty(); }} />
                ) : null}
                {motifKind === 'constraints' ? (
                  <input data-testid="bhl-motif-intervals" value={motifIntervals} onChange={(event) => { setMotifIntervals(event.target.value); markDirty(); }} />
                ) : null}
                {motifKind === 'riff' ? (
                  <input data-testid="bhl-riff-seed" type="number" value={riffSeed} onChange={(event) => { setRiffSeed(Number(event.target.value)); markDirty(); }} />
                ) : null}
                <label htmlFor="bhl-motif-transform">
                  Transform
                  <select id="bhl-motif-transform" data-testid="bhl-motif-transform" value={motifTransform} onChange={(event) => { setMotifTransform(event.target.value); markDirty(); }}>
                    <option value="none">None</option>
                    <option value="transpose">Transpose</option>
                    <option value="invert">Invert</option>
                    <option value="fragment">Fragment</option>
                    <option value="register">Register transfer</option>
                  </select>
                </label>
                {motifTransform === 'transpose' ? (
                  <input data-testid="bhl-motif-semitones" type="number" value={motifSemitones} onChange={(event) => { setMotifSemitones(Number(event.target.value)); markDirty(); }} />
                ) : null}
              </div>
            ) : null}
            {catalogNote ? <p style={{ margin: 0, color: 'var(--text-muted)' }}>{catalogNote}</p> : null}
          </details>
          <details data-testid="bhl-field-interaction">
            <summary>Harmonic-field interaction</summary>
            <p style={{ margin: '0.35rem 0' }}>
              Worlds A–D and F keep their harmonic fields. A selected colour sounds only on pitches those fields already contain. World E takes the collection as its pitch source. If nothing is shared, the guitar stays on the world field. The colour is not rewritten as major or minor pentatonic.
            </p>
            {result?.colourConstraint ? (
              <p data-testid="bhl-colour-constraint" style={{ margin: 0 }}>{result.colourConstraint}</p>
            ) : (
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Generate to see which pitches this colour can actually use.</p>
            )}
          </details>
          <details data-testid="bhl-handoff">
            <summary>Cross-engine transfer</summary>
            <p style={{ margin: '0.35rem 0' }}>Riff pitch, this riff&apos;s rhythm, another core cell, and the multi-bar engine rhythm move straight into this page. Pentatonic colours move straight in. Tonality Vault is the harmonic-field menu on each region. Liquid harmony is World B. Performance Composer only accepts a MusicXML file: export, then use Respond and choose that file. The Riff Engine does not import BHL.</p>
            {result && 'transfers' in result ? (
              <pre data-testid="bhl-transfers" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify((result as { transfers?: unknown }).transfers, null, 2)}</pre>
            ) : (
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Generate to see what this setting will transfer.</p>
            )}
          </details>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            The world changes the pitch field. Continuation develops a continuation region unless that region is silence,
            a handoff, or leave-space. Counter-motion writes a second guitar voice against the bass. A triad or dyad is
            one grip. Leave space keeps the last beat empty. On worlds A–D and F a pentatonic colour only sounds where it
            already belongs to the world. World E can take the colour as its pitch source.
          </p>
          {result && 'resourceLimitations' in result && Array.isArray((result as { resourceLimitations?: unknown }).resourceLimitations) ? (
            <ul data-testid="bhl-resource-limits">
              {((result as { resourceLimitations: string[] }).resourceLimitations).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          {lockInputsDiffer ? (
            <p data-testid="bhl-relock">Bar span, path, or protected bars changed. Import and lock again before generating.</p>
          ) : null}
          <button type="button" data-testid="bhl-generate" onClick={() => void onGenerate()} disabled={busy || lockInputsDiffer}>
            Generate guitar
          </button>
        </section>
      ) : null}

      {locked && !result ? (
        <BhlEvidencePanel original={locked.evidence} candidate={null} intentions={[]} limitations={[]} comparison={null} provisional={false} />
      ) : null}

      {result ? (
        <section style={panel} data-testid="bhl-result">
          <h3 style={{ margin: 0 }}>Candidate</h3>
          {stale ? <p data-testid="bhl-stale">Controls changed. This candidate is stale.</p> : null}
          <p style={{ margin: 0 }} data-testid="bhl-guitar-changed">
            Guitar {result.guitarChanged ? 'differs from the source in the writable bars' : 'matches the source guitar'}.
            Source SHA {result.sourceUnchanged ? 'unchanged' : 'CHANGED'}.
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {result.events.map((event) => (
              <li key={`${event.bar}-${event.onsetQuarters}-${event.regionId}`}>
                Bar {event.bar} at {event.onsetQuarters} for {event.quarters} · MIDI {event.midis.join(', ')} · {event.regionId}
              </li>
            ))}
          </ul>
          {result.harmony.length ? (
            <p style={{ margin: 0 }}>
              Harmony {result.harmony.map((item) => `${item.bar}:${item.label ?? ''} ${item.action ?? ''}`).join(' · ')}
            </p>
          ) : null}
          <BhlEvidencePanel
            original={locked?.evidence ?? result.musicalEvidence?.original ?? null}
            candidate={result.musicalEvidence?.candidate ?? null}
            intentions={result.musicalEvidence?.intentions ?? []}
            limitations={result.musicalEvidence?.limitations ?? []}
            fieldNotes={result.musicalEvidence?.fieldNotes ?? []}
            comparison={result.musicalEvidence?.comparison ?? null}
            provisional={Boolean(result.musicalEvidence?.provisional)}
          />
          <h3 style={{ margin: '0.5rem 0 0' }}>Technical validation</h3>
          <p style={{ margin: 0 }} data-testid="bhl-locks">
            Locks {result.verification.ok ? 'passed' : 'failed'}. Reimport {result.verification.reimports ? 'passed' : 'failed'}.
            Outside the span {result.outsideIdentical ? 'matches the source' : 'differs'}.
          </p>
          {result.verification.errors.length ? (
            <ul data-testid="bhl-lock-errors">
              {result.verification.errors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <p style={{ margin: 0 }} data-testid="bhl-predicates">
            Stylistic constraints {failedPredicates.length ? `${failedPredicates.length} failed` : 'passed'}.
          </p>
          {failedPredicates.map((item) => (
            <p key={item.id} style={{ margin: 0 }}>
              {item.id}: {item.detail}
            </p>
          ))}
          <p style={{ margin: 0 }} data-testid="bhl-feasibility">
            Guitar feasibility {warnings.length ? `${warnings.length} warning(s)` : 'clear'}.
          </p>
          {warnings.map((note) => (
            <p key={`${note.bar}-${note.onsetQuarters}`} style={{ margin: 0 }}>
              Bar {note.bar} at {note.onsetQuarters} MIDI {note.midis.join(',')} fret span {note.fretSpan}
            </p>
          ))}
          <h3 style={{ margin: '0.5rem 0 0' }}>Musical review · {result.gce.framework}</h3>
          <div data-testid="bhl-gce">
            <p style={{ margin: 0 }}>{result.gce.technicalLabel}</p>
            <p style={{ margin: 0 }}>{result.gce.musicalLabel}</p>
            {result.gce.notes.map((note) => (
              <p key={note} style={{ margin: 0, color: 'var(--text-muted)' }}>
                {note}
              </p>
            ))}
          </div>
          <button type="button" data-testid="bhl-export" onClick={() => void onExport()} disabled={busy || !result.verification.ok}>
            Export MusicXML
          </button>
          {outputPath ? (
            <p style={{ margin: 0 }} data-testid="bhl-output">
              {outputPath}
            </p>
          ) : null}
          <button type="button" className="secondary" data-testid="bhl-open" onClick={() => void onOpen()} disabled={!outputPath || busy}>
            Open in Sibelius
          </button>
          {exportDir ? (
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Exports go to {exportDir}. The source file stays where it is.
            </p>
          ) : null}
        </section>
      ) : null}

      <section style={panel} data-testid="bhl-candidates">
        <h3 style={{ margin: 0 }}>5. Candidates</h3>
        <button type="button" data-testid="bhl-candidates-generate" onClick={() => void onCandidates()} disabled={busy || !locked || lockInputsDiffer}>
          Generate three candidates
        </button>
        {candidates.map((item) => (
          <label key={String(item.id)} style={{ display: 'block' }}>
            <input
              type="radio"
              name="bhl-candidate"
              data-testid="bhl-candidate"
              checked={selectedCandidate === item.id}
              onChange={() => setSelectedCandidate(String(item.id))}
            />{' '}
            {String(item.label)} · seed {String(item.seed)}
            {item.parentId ? ` · refined from ${String(item.parentId)}` : ''}
          </label>
        ))}
        <button type="button" data-testid="bhl-compare" onClick={() => void onCompare()} disabled={busy || candidates.length < 2}>
          Compare stored candidates
        </button>
        <button type="button" data-testid="bhl-refine" onClick={() => void onRefine()} disabled={busy || !selectedCandidate}>
          Refine a copy
        </button>
        {compareText ? (
          <pre data-testid="bhl-compare-text" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {compareText}
          </pre>
        ) : null}
        {selectedCandidateXml ? (
          <>
            <ScoreAudition
              musicXml={selectedCandidateXml}
              label={`${selectedCandidateLabel} · CANDIDATE FOR AUDITION — NOT MUSICALLY APPROVED`}
            />
            <ScorePreview musicXml={selectedCandidateXml} />
          </>
        ) : null}
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>No numerical score and no automatic winner. CANDIDATE FOR AUDITION — NOT MUSICALLY APPROVED.</p>
      </section>

      <section style={panel} data-testid="bhl-save">
        <h3 style={{ margin: 0 }}>7. Save</h3>
        <label htmlFor="bhl-project-id">
          Project id
          <input id="bhl-project-id" data-testid="bhl-project-id" value={projectId} onChange={(event) => setProjectId(event.target.value)} style={{ marginLeft: '0.35rem' }} />
        </label>
        <label htmlFor="bhl-notes">
          Notes
          <textarea id="bhl-notes" data-testid="bhl-notes" value={projectNotes} onChange={(event) => setProjectNotes(event.target.value)} rows={3} style={{ width: '100%' }} />
        </label>
        <button type="button" data-testid="bhl-save-project" onClick={() => void onSaveProject()} disabled={busy || candidates.length === 0}>
          Save project
        </button>
        <label htmlFor="bhl-project-path">
          Project path
          <input id="bhl-project-path" data-testid="bhl-project-path" value={projectPath} onChange={(event) => setProjectPath(event.target.value)} style={{ width: '100%' }} />
        </label>
        <button type="button" data-testid="bhl-open-project" onClick={() => void onOpenProject()} disabled={busy || !projectPath}>
          Reopen project
        </button>
      </section>
    </div>
  );
}
