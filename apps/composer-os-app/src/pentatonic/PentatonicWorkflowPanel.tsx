import { useState } from 'react';
import { AUTO_COLOR_GUI_INTENTIONS, autoColorContextFromAnalysis, capturePentatonicProject, comparePentatonicCandidates, generatePracticeExample, getPentatonicColourResource, colourRoutePhraseTarget, listPentatonicColourResources, planAutoColor, planColourRoute, productionSnapshot, COLOUR_ROUTE_MAX_CONSECUTIVE_RETENTIONS, type AutoColorPlan, type ColourRouteResult, type CompareSet, type DuoRole, type FormFunction, type MusicalIntention, type PentatonicProjectV1, type ProductionSnapshot, PENTATONIC_NOTE_CHOICES } from '@composer-os/core/pentatonic';
import {
  DEV4C_ACTIVITIES,
  DEV4C_DEFAULT_METHOD,
  DEV4C_PURPOSES,
  activityLabel,
  analysePentatonicMusicXml,
  collectionForRegion,
  generatePentatonicPhrase,
  homeCollection,
  manualCollection,
  methodDescription,
  purposeLabel,
  transformPentatonicMotif,
  type Dev4cActivity,
  type Dev4cPurpose,
  type MusicianAnalysis,
  type PentatonicCandidateView,
  type PentatonicGenerateResult,
  type PentatonicTransformResult,
} from '@composer-os/core/pentatonic/dev4cWorkflow';
import { initPlayback, play, stop } from '../playback/playbackEngine';
import { parseXmlToPlaybackSequence } from '../playback/musicXmlToPlaybackSequence';
import { api } from '../services/api';
import { PentatonicColourRegistry } from './PentatonicColourRegistry';
import { exportPentatonicMusicXml } from './exportPentatonicMusicXml';

function restoredProjectProof(project: PentatonicProjectV1): string {
  const music = project.phrase?.music[0];
  const notes = music?.events.filter((event) => event.kind === 'note').map((event) => event.midi ?? 'rest') ?? [];
  const rests = music?.events.filter((event) => event.kind === 'rest').length ?? 0;
  const metre = music?.events[0] ? `${music.events[0].beats}/${music.events[0].beatType}` : 'none';
  return [
    `collection ${project.collection.resourceId}`,
    `centre ${project.collection.centre ?? 'NONE'}`,
    `spelling ${project.collection.spelling.join(' ') || 'NONE'}`,
    `identity ${project.collection.canonicalId}`,
    `route ${project.route.selectedCandidateId ?? 'none'}`,
    `seed ${project.route.seed}`,
    `phrase-seed ${project.phrase?.seed ?? 'none'}`,
    `ending ${project.route.ending}`,
    `steps ${project.route.minSteps}-${project.route.maxSteps}`,
    `retention ${project.route.retention.maxConsecutiveRetentions}`,
    `notes ${notes.join(' ') || 'NONE'}`,
    `rests ${rests}`,
    `metre ${metre}`,
    `silence ${project.phrase?.silence === true}`,
    `NONE ${project.collection.resourceId === 'NONE'}`,
    `NO_PHRASE ${project.phrase?.noPhrase === true}`,
    `motif ${project.phrase?.motif ?? 'none'}`,
  ].join(' | ');
}

function downloadXml(filename: string, xml: string): void {
  const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function ColourBlock(props: {
  selectedResource: string;
  resourceNotes: string;
  actualNotes: string;
  outsideResourceNotes: string;
}) {
  return (
    <div data-testid="pentatonic-workflow-colour">
      <p style={{ margin: '0.2rem 0' }}>SELECTED RESOURCE: {props.selectedResource}</p>
      <p style={{ margin: '0.2rem 0' }}>RESOURCE NOTES: {props.resourceNotes}</p>
      <p style={{ margin: '0.2rem 0' }}>ACTUAL GENERATED NOTES: {props.actualNotes}</p>
      <p style={{ margin: '0.2rem 0' }}>OUTSIDE-RESOURCE NOTES: {props.outsideResourceNotes}</p>
    </div>
  );
}

function GceBlock(props: { candidate: PentatonicCandidateView }) {
  if (props.candidate.silence || props.candidate.gceOverall === null) return null;
  return (
    <details>
      <summary>GCE evaluation</summary>
      <p style={{ margin: '0.2rem 0' }}>Overall {props.candidate.gceOverall.toFixed(2)}. Advisory. A higher score is not an automatic choice.</p>
      <ul>
        {props.candidate.gceCategories.map((row) => (
          <li key={row.category}>
            {row.category}: {row.score.toFixed(2)}
          </li>
        ))}
      </ul>
      {props.candidate.gceWarnings.length > 0 ? <p>Warnings: {props.candidate.gceWarnings.join(' ')}</p> : null}
    </details>
  );
}

export function PentatonicWorkflowPanel() {
  const [mode, setMode] = useState<'analyse' | 'transform' | 'generate' | 'auto-color' | 'compare' | 'export'>('analyse');
  const [fileName, setFileName] = useState('');
  const [xml, setXml] = useState('');
  const [reading, setReading] = useState<MusicianAnalysis | null>(null);
  const [regionIndex, setRegionIndex] = useState(0);
  const [resourceMode, setResourceMode] = useState<'auto' | 'manual'>('auto');
  const [manualArchetype, setManualArchetype] = useState('major_pentatonic');
  const [manualRef, setManualRef] = useState<string>(PENTATONIC_NOTE_CHOICES[0]);
  const [colourReference, setColourReference] = useState<string>(PENTATONIC_NOTE_CHOICES[0]);
  const [method, setMethod] = useState<'M-DEG' | 'M-NEAR'>(DEV4C_DEFAULT_METHOD);
  const [purpose, setPurpose] = useState<Dev4cPurpose>('MOTIF');
  const [activity, setActivity] = useState<Dev4cActivity>('SPARSE');
  const [transform, setTransform] = useState<PentatonicTransformResult | null>(null);
  const [generated, setGenerated] = useState<PentatonicGenerateResult | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedExportPath, setSavedExportPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoIntentions, setAutoIntentions] = useState<MusicalIntention[]>([]);
  const [autoForm, setAutoForm] = useState<FormFunction>('unknown');
  const [autoRole, setAutoRole] = useState<DuoRole>('UNKNOWN');
  const [autoResource, setAutoResource] = useState('major_pentatonic');
  const [autoGrounded, setAutoGrounded] = useState(false);
  const [autoPlan, setAutoPlan] = useState<AutoColorPlan | null>(null);
  const [snapshot, setSnapshot] = useState<ProductionSnapshot | null>(null);
  const [compared, setCompared] = useState<CompareSet | null>(null);
  const [compareIndex, setCompareIndex] = useState(0);
  const [colourRoute, setColourRoute] = useState<ColourRouteResult | null>(null);
  const [routePick, setRoutePick] = useState(0);
  const [routeMinSteps, setRouteMinSteps] = useState(3);
  const [routeMaxSteps, setRouteMaxSteps] = useState(5);
  const [routeEnding, setRouteEnding] = useState<'return' | 'open'>('return');
  const [routeSeed, setRouteSeed] = useState(1);
  const [phraseMotif, setPhraseMotif] = useState<string | null>(null);
  const [explicitNone, setExplicitNone] = useState(false);
  const [projectId, setProjectId] = useState('pentatonic-project');
  const [projectNotes, setProjectNotes] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [projectStatus, setProjectStatus] = useState('');
  const [restoredProof, setRestoredProof] = useState('');

  const region = reading?.analysis.regions[regionIndex] ?? null;

  const onFile = (file: File | null) => {
    if (!file) return;
    setError(null);
    setReading(null);
    setTransform(null);
    setGenerated(null);
    setChosen(null);
    setAutoPlan(null);
    setSnapshot(null);
    setCompared(null);
    setCompareIndex(0);
    Promise.resolve(file.text())
      .then((text) => {
        setFileName(file.name);
        setXml(text);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
  };

  const onAnalyse = () => {
    if (!xml) {
      setError('Load a MusicXML score first.');
      return;
    }
    setBusy(true);
    setError(null);
    const source = xml;
    Promise.resolve()
      .then(() => analysePentatonicMusicXml(source, { sourceFile: fileName }))
      .then((result) => {
        setReading(result);
        setRegionIndex(0);
        setTransform(null);
        setGenerated(null);
        setChosen(null);
        const context = autoColorContextFromAnalysis(result.analysis);
        setAutoForm(context.formFunction ?? 'unknown');
        setAutoRole(context.duoRole ?? 'UNKNOWN');
        setAutoResource(
          context.pathIsNone
            ? 'none'
            : getPentatonicColourResource(context.currentResourceId ?? '')
              ? context.currentResourceId!
              : 'major_pentatonic'
        );
        setAutoGrounded(context.grounding?.present === true);
        setAutoPlan(null);
        setSnapshot(productionSnapshot(result.analysis));
        setCompared(null);
        setCompareIndex(0);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setBusy(false));
  };

  const manualCollectionChoice = () => (resourceMode === 'manual' ? manualCollection(manualArchetype, manualRef) : null);

  const onTransform = () => {
    if (!reading || !region) {
      setError('Analyse a score first.');
      return;
    }
    const target = manualCollectionChoice() ?? collectionForRegion(region) ?? homeCollection(reading.analysis);
    if (!target) {
      setError('This region is NONE. Choose a manual resource or another region.');
      return;
    }
    setBusy(true);
    setError(null);
    Promise.resolve()
      .then(() =>
        transformPentatonicMotif({
          xml,
          analysis: reading.analysis,
          region,
          target,
          method,
        })
      )
      .then((result) => {
        setTransform(result);
        setGenerated(null);
        setChosen('transform');
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setBusy(false));
  };

  const onGenerate = () => {
    if (!reading || !region) {
      setError('Analyse a score first.');
      return;
    }
    setBusy(true);
    setError(null);
    const manual = manualCollectionChoice();
    Promise.resolve()
      .then(() =>
        generatePentatonicPhrase({
          xml,
          analysis: reading.analysis,
          region,
          purpose,
          activity,
          ...(manual ? { collection: manual } : {}),
        })
      )
      .then((result) => {
        setGenerated(result);
        setTransform(null);
        setChosen(null);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setBusy(false));
  };

  const hear = (musicXml: string, silence: boolean) => {
    if (silence) return;
    Promise.resolve()
      .then(async () => {
        await initPlayback();
        await play(parseXmlToPlaybackSequence(musicXml), () => undefined);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)));
  };

  const exportXml = (musicXml: string, label: string) => {
    const bridge = typeof window !== 'undefined' ? window.composerOsDesktop : undefined;
    setError(null);
    setBusy(true);
    Promise.resolve()
      .then(() =>
        exportPentatonicMusicXml({
          xml: musicXml,
          label,
          fileName,
          invokeApi: bridge?.invokeApi,
          download: downloadXml,
        })
      )
      .then((saved) => {
        setSavedExportPath(saved.mode === 'desktop' ? saved.fullPath : saved.filename);
      })
      .catch((caught: unknown) => {
        setSavedExportPath(null);
        setError(caught instanceof Error ? caught.message : String(caught));
      })
      .finally(() => setBusy(false));
  };

  const toggleIntention = (intention: MusicalIntention) => {
    setAutoPlan(null);
    setAutoIntentions((current) => {
      if (current.includes(intention)) return current.filter((item) => item !== intention);
      if (current.length >= 3) return current;
      return [...current, intention];
    });
  };

  const onCompare = () => {
    if (!reading || !region) {
      setError('Analyse a score first.');
      return;
    }
    setBusy(true);
    setError(null);
    const intentions = autoIntentions.length ? autoIntentions : (['RETAIN_MOTIF'] as MusicalIntention[]);
    Promise.resolve()
      .then(() => comparePentatonicCandidates({ xml, analysis: reading.analysis, region, intentions }))
      .then((result) => {
        setCompared(result);
        setCompareIndex(0);
        setChosen(null);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setBusy(false));
  };

  const exportable = (): { xml: string; label: string; silence: boolean } | null => {
    if (compared) {
      const candidate = compared.candidates[compareIndex] ?? compared.candidates[0];
      if (!candidate) return null;
      return { xml: candidate.musicXml, label: candidate.kind, silence: candidate.silence };
    }
    if (generated && chosen) {
      const candidate = generated.candidates.find((item) => item.letter === chosen);
      if (candidate) return { xml: candidate.musicXml, label: candidate.letter, silence: candidate.silence };
    }
    if (transform) return { xml: transform.musicXml, label: transform.method, silence: false };
    return null;
  };

  const onAutoColor = () => {
    setAutoPlan(
      planAutoColor({
        intentions: autoIntentions,
        formFunction: autoForm,
        duoRole: autoRole,
        pathIsNone: autoResource === 'none',
        currentResourceId: autoResource === 'none' ? null : autoResource,
        homeResourceId: autoResource === 'none' ? null : autoResource,
        homeKnown: autoResource !== 'none',
        fieldIsHome: autoResource !== 'none',
        hasMotif: autoResource !== 'none',
        lineageIdentity: autoResource === 'none' ? 'absent' : 'clear',
        holdCredible: true,
        quartalAvailable: autoResource !== 'none',
        density: 'sparse',
        grounding: autoGrounded
          ? { present: true, bassPedal: true, bassOstinato: false, sustainedTone: true, motifIdentity: true, explicitAnchor: false }
          : { present: false, bassPedal: false, bassOstinato: false, sustainedTone: false, motifIdentity: false, explicitAnchor: false },
      })
    );
  };

  const FORM_CHOICES: FormFunction[] = ['opening', 'continuation', 'development', 'climax', 'release', 'ending', 'unknown'];
  const ROLE_CHOICES: DuoRole[] = [
    'GUITAR_LEADS',
    'BASS_LEADS',
    'GUITAR_RESPONDS',
    'BASS_RESPONDS',
    'COUNTERPOINT',
    'SHARED_FIELD',
    'GUITAR_SUPPORTS',
    'BASS_SUPPORTS',
    'SPACE',
    'UNKNOWN',
  ];

  const applyProject = (project: PentatonicProjectV1) => {
    const none = project.collection.resourceId === 'NONE';
    setExplicitNone(none);
    setResourceMode(project.workflow.resourceMode);
    if (!none) setManualArchetype(project.collection.resourceId);
    if (project.collection.centre) {
      setManualRef(project.collection.centre);
      setColourReference(project.workflow.colourReference || project.collection.centre);
    }
    setRouteMinSteps(project.route.minSteps);
    setRouteMaxSteps(project.route.maxSteps);
    setRouteEnding(project.route.ending);
    setRouteSeed(project.route.seed);
    setRoutePick(project.route.selectedCandidateIndex);
    setColourRoute(project.route.generated);
    setPhraseMotif(project.phrase?.motif ?? null);
    setGenerated(project.phrase?.generated ?? null);
    setTransform(project.phrase?.transform ?? null);
    setChosen(project.workflow.chosen);
    setMethod(project.workflow.method);
    if (project.workflow.purpose === 'MOTIF' || project.workflow.purpose === 'LYRICAL_ANSWER' || project.workflow.purpose === 'COUNTERLINE' || project.workflow.purpose === 'COMPING_FRAGMENT' || project.workflow.purpose === 'DEVELOPMENT' || project.workflow.purpose === 'NO_PHRASE') {
      setPurpose(project.workflow.purpose);
    }
    if (project.workflow.activity === 'VERY_SPARSE' || project.workflow.activity === 'SPARSE' || project.workflow.activity === 'MODERATE') {
      setActivity(project.workflow.activity);
    }
    setMode(project.workflow.mode);
    setRegionIndex(project.source.regionIndex);
    setFileName(project.source.fileName ?? '');
    setXml(project.source.xml ?? project.phrase?.generated?.candidates[0]?.musicXml ?? '');
    setProjectId(project.id);
    setProjectNotes(project.notes);
    setRestoredProof(restoredProjectProof(project));
    setError(null);
  };

  const onSaveProject = () => {
    const storedRoute = colourRoute?.ok ? colourRoute : null;
    const captured = capturePentatonicProject({
      id: projectId,
      title: projectId,
      notes: projectNotes,
      resourceId: explicitNone ? 'NONE' : manualArchetype,
      centre: explicitNone ? manualRef : manualRef,
      routeMinSteps: storedRoute ? storedRoute.minSteps : routeMinSteps,
      routeMaxSteps: storedRoute ? storedRoute.maxSteps : routeMaxSteps,
      routeEnding: storedRoute ? storedRoute.ending : routeEnding,
      routeSeed: storedRoute ? storedRoute.seed : routeSeed,
      routePick,
      colourRoute,
      phraseSeed: generated?.musicContext.seed ?? routeSeed,
      motif: phraseMotif,
      purpose,
      activity,
      method,
      silence: Boolean(generated?.candidates.some((candidate) => candidate.silence) || purpose === 'NO_PHRASE'),
      noPhrase: purpose === 'NO_PHRASE' || Boolean(generated?.candidates.some((candidate) => candidate.purpose === 'NO_PHRASE')),
      generated,
      transform,
      chosen,
      importFileName: fileName || null,
      importXml: xml || null,
      regionIndex,
      mode,
      resourceMode,
      colourReference,
    });
    if (!captured.ok || !captured.project) {
      setError(captured.errors.join('; ') || 'Could not save this project.');
      return;
    }
    setBusy(true);
    setError(null);
    void api
      .pentatonicSaveProject({ project: captured.project, path: projectPath || undefined, overwrite: Boolean(projectPath) })
      .then((raw) => {
        const row = raw as { ok: true; path: string } | { ok: false; error: string };
        if (!row.ok) throw new Error(row.error);
        setProjectPath(row.path);
        setProjectStatus(`Saved ${row.path}`);
        setRestoredProof(restoredProjectProof(captured.project!));
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setBusy(false));
  };

  const onOpenProject = () => {
    if (!projectPath.trim()) {
      setError('Enter a project path.');
      return;
    }
    setBusy(true);
    setError(null);
    void api
      .pentatonicOpenProject({ path: projectPath })
      .then((raw) => {
        const row = raw as { ok: true; path: string; project: PentatonicProjectV1 } | { ok: false; error: string };
        if (!row.ok) throw new Error(row.error);
        applyProject(row.project);
        setProjectPath(row.path);
        setProjectStatus(`Reopened ${row.path}`);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : String(caught)))
      .finally(() => setBusy(false));
  };

  return (
    <div data-testid="pentatonic-workflow" style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
      <PentatonicColourRegistry
        referenceNote={colourReference}
        onReferenceNote={setColourReference}
        onUsePathCollection={(archetypeId, referenceNote) => {
          if (!getPentatonicColourResource(archetypeId)) {
            setError(`Pentatonic colour "${archetypeId}" is not registered. Refusing to substitute minor pentatonic.`);
            return;
          }
          setResourceMode('manual');
          setManualArchetype(archetypeId);
          setManualRef(referenceNote);
          setExplicitNone(false);
          setColourRoute(null);
          setRoutePick(0);
          setTransform(null);
          setGenerated(null);
          setError(null);
        }}
      />
      {resourceMode === 'manual' ? (
        <p data-testid="pentatonic-colour-path-selection" style={{ margin: 0 }}>
          Manual path collection: {manualRef} {getPentatonicColourResource(manualArchetype)?.displayName ?? manualArchetype}. Transform
          and Generate use it when Manual resource is selected.
        </p>
      ) : null}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'end' }}>
        <label htmlFor="pentatonic-colour-route-min">
          Minimum collection steps
          <input
            id="pentatonic-colour-route-min"
            data-testid="pentatonic-colour-route-min"
            type="number"
            min={2}
            max={8}
            step={1}
            value={routeMinSteps}
            onChange={(event) => setRouteMinSteps(Number(event.target.value))}
          />
        </label>
        <label htmlFor="pentatonic-colour-route-max">
          Maximum collection steps
          <input
            id="pentatonic-colour-route-max"
            data-testid="pentatonic-colour-route-max"
            type="number"
            min={2}
            max={8}
            step={1}
            value={routeMaxSteps}
            onChange={(event) => setRouteMaxSteps(Number(event.target.value))}
          />
        </label>
        <label htmlFor="pentatonic-project-seed">
          Seed
          <input
            id="pentatonic-project-seed"
            data-testid="pentatonic-project-seed"
            type="number"
            step={1}
            value={routeSeed}
            onChange={(event) => setRouteSeed(Number(event.target.value))}
          />
        </label>
        <label htmlFor="pentatonic-colour-route-ending">
          Ending
          <select
            id="pentatonic-colour-route-ending"
            data-testid="pentatonic-colour-route-ending"
            value={routeEnding}
            onChange={(event) => setRouteEnding(event.target.value === 'open' ? 'open' : 'return')}
          >
            <option value="return">Required return home</option>
            <option value="open">Open ending</option>
          </select>
        </label>
        <button
          type="button"
          data-testid="pentatonic-colour-generate-path"
          onClick={() => {
            const planned = planColourRoute({
              resourceId: manualArchetype,
              centre: manualRef,
              seed: routeSeed,
              minSteps: routeMinSteps,
              maxSteps: routeMaxSteps,
              ending: routeEnding,
            });
            if (!planned.ok) {
              setColourRoute(planned);
              setError(planned.error);
              return;
            }
            setError(null);
            setColourRoute(planned);
            setRoutePick(0);
            setResourceMode('manual');
          }}
        >
          Generate path
        </button>
      </div>
      <p data-testid="pentatonic-retention-setting" style={{ margin: 0 }}>
        Max consecutive retentions {COLOUR_ROUTE_MAX_CONSECUTIVE_RETENTIONS}. A second hold in a row stays illegal.
        {explicitNone ? ' Collection decision: NONE.' : ''}
      </p>
      <section data-testid="pentatonic-project" style={{ display: 'grid', gap: '0.45rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Project</h3>
        <p style={{ margin: 0 }}>
          Save stores this collection, route, selected candidate, motif, phrase and musical events. Reopen loads that file. It does not
          generate a new path.
        </p>
        <label htmlFor="pentatonic-project-id">
          Project id
          <input id="pentatonic-project-id" data-testid="pentatonic-project-id" value={projectId} onChange={(event) => setProjectId(event.target.value)} />
        </label>
        <label htmlFor="pentatonic-project-notes">
          Notes
          <textarea id="pentatonic-project-notes" data-testid="pentatonic-project-notes" value={projectNotes} onChange={(event) => setProjectNotes(event.target.value)} rows={2} />
        </label>
        <button type="button" data-testid="pentatonic-mark-none" onClick={() => { setExplicitNone(true); setColourRoute(null); }}>
          Mark collection NONE
        </button>
        <button type="button" data-testid="pentatonic-save-project" onClick={onSaveProject} disabled={busy}>
          Save project
        </button>
        <label htmlFor="pentatonic-project-path">
          Project path
          <input id="pentatonic-project-path" data-testid="pentatonic-project-path" value={projectPath} onChange={(event) => setProjectPath(event.target.value)} />
        </label>
        <button type="button" data-testid="pentatonic-open-project" onClick={onOpenProject} disabled={busy || !projectPath.trim()}>
          Reopen project
        </button>
        {projectStatus ? (
          <p data-testid="pentatonic-project-status" style={{ margin: 0 }}>
            {projectStatus}
          </p>
        ) : null}
        {restoredProof ? (
          <p data-testid="pentatonic-project-restored" style={{ margin: 0 }}>
            {restoredProof}
          </p>
        ) : null}
      </section>
      <p data-testid="pentatonic-colour-route-length-note" style={{ margin: 0 }}>
        Length counts collection steps, including the start. A repeated collection counts as a step. Length is not the number of changes.
      </p>
      {colourRoute?.ok ? (
        <div data-testid="pentatonic-colour-route" style={{ display: 'grid', gap: '0.35rem' }}>
          {(() => {
            const shown = [colourRoute.route, ...colourRoute.alternatives][routePick] ?? colourRoute.route;
            const target = colourRoutePhraseTarget(shown);
            return (
              <>
                <p style={{ margin: 0 }}>
                  Mean change score {shown.totalCost}. Collection steps {shown.steps.length}. Changes {shown.switchCount}. Collections{' '}
                  {shown.distinctCollections}. Pitch sets {shown.distinctPitchSets}. Ending {colourRoute.ending}.
                </p>
                <p data-testid="pentatonic-colour-route-target" data-target-id={target.id} style={{ margin: 0 }}>
                  Phrase target {target.resourceId} @ {target.centre}. Spelling {target.spelling.join(' ')}.
                </p>
                <ol data-testid="pentatonic-colour-route-steps" style={{ margin: 0 }}>
                  {shown.steps.map((step) => (
                    <li key={`${shown.id}-${step.index}-${step.instance.id}`}>
                      {step.role}: {step.instance.resourceId} @ {step.instance.centre} ({step.instance.orderedPitchClasses.join(' ')}).{' '}
                      Set {step.instance.canonicalPitchClasses.join(' ')}. {step.changeFlag}. Retained{' '}
                      {step.retainedPitchClasses.join(' ') || 'none'}. Change score {step.transitionCost}.
                    </li>
                  ))}
                </ol>
              </>
            );
          })()}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[colourRoute.route, ...colourRoute.alternatives].map((route, index) => (
              <button
                key={route.id}
                type="button"
                data-testid="pentatonic-colour-route-candidate"
                data-route-id={route.id}
                data-route-sets={route.steps.map((step) => step.instance.canonicalId).join('|')}
                aria-pressed={routePick === index}
                onClick={() => {
                  const target = colourRoutePhraseTarget(route);
                  setRoutePick(index);
                  setResourceMode('manual');
                  setManualArchetype(target.resourceId);
                  setManualRef(target.centre);
                }}
              >
                {index === 0 ? 'Best' : `Candidate ${index}`} {route.totalCost}{' '}
                {route.steps.map((step) => `${step.instance.resourceId}@${step.instance.centre}`).join(' > ')}
              </button>
            ))}
          </div>
          <button
            type="button"
            data-testid="pentatonic-colour-route-phrase"
            onClick={() => {
              const chosen = [colourRoute.route, ...colourRoute.alternatives][routePick] ?? colourRoute.route;
              const target = colourRoutePhraseTarget(chosen);
              const home = chosen.steps[0]!.instance;
              const motif = home.spelling.slice(0, 3).join(' ');
              setPhraseMotif(motif);
              const example = generatePracticeExample({
                fieldId: target.resourceId,
                centre: target.centre,
                motif,
                category: 'HOME_CONTINUITY',
                difficulty: 'SPARSE',
                variation: 0,
              });
              setGenerated({
                notice: `${target.resourceId} @ ${target.centre}. Motif ${motif}.`,
                musicContext: {
                  presetId: 'colour-path',
                  seed: routeSeed,
                  meter: '4/4',
                  harmonyChecksum: '',
                  barCount: 1,
                },
                candidates: [
                  {
                    letter: 'A',
                    purpose: 'MOTIF',
                    purposeLabel: 'Motif',
                    activityLabel: 'Sparse',
                    silence: example.pitches.length === 0,
                    resultLabel: example.notes || 'NONE',
                    selectedResource: `${target.centre} ${target.displayName}`,
                    resourceNotes: target.spelling.join(' '),
                    actualNotes: example.notes,
                    outsideResourceNotes: 'NONE',
                    scaleLike: null,
                    gceOverall: null,
                    gceCategories: [],
                    gceWarnings: [],
                    musicXml: example.musicXml,
                    method: 'M-DEG',
                    pitchChange: null,
                  },
                ],
              });
              setMode('generate');
              setError(null);
            }}
          >
            Phrase from path
          </button>
        </div>
      ) : null}
      <label htmlFor="pentatonic-workflow-mode">
        Mode
        <select
          id="pentatonic-workflow-mode"
          value={mode}
          onChange={(event) =>
            setMode(event.target.value as 'analyse' | 'transform' | 'generate' | 'auto-color' | 'compare' | 'export')
          }
        >
          <option value="analyse">Analyse</option>
          <option value="auto-color">Plan / AUTO COLOR</option>
          <option value="transform">Transform Motif</option>
          <option value="generate">Generate Phrase</option>
          <option value="compare">Compare</option>
          <option value="export">Export</option>
        </select>
      </label>
      <label htmlFor="pentatonic-workflow-file">
        MusicXML
        <input
          id="pentatonic-workflow-file"
          data-testid="pentatonic-workflow-file"
          type="file"
          accept=".musicxml,.xml,application/xml,text/xml"
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
      </label>
      {fileName ? <p style={{ margin: 0 }}>File: {fileName}</p> : null}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" data-testid="pentatonic-workflow-analyse" onClick={onAnalyse} disabled={busy || !xml}>
          {busy && mode === 'analyse' ? 'Analysing…' : 'Analyse'}
        </button>
        {mode === 'transform' ? (
          <button type="button" data-testid="pentatonic-workflow-transform" onClick={onTransform} disabled={busy || !reading}>
            Transform
          </button>
        ) : null}
        {mode === 'generate' ? (
          <button type="button" data-testid="pentatonic-workflow-generate" onClick={onGenerate} disabled={busy || !reading}>
            Generate
          </button>
        ) : null}
        {mode === 'auto-color' ? (
          <button type="button" data-testid="pentatonic-auto-color-plan" onClick={onAutoColor} disabled={autoIntentions.length === 0}>
            Plan
          </button>
        ) : null}
        {mode === 'compare' ? (
          <button type="button" data-testid="pentatonic-workflow-compare" onClick={onCompare} disabled={busy || !reading}>
            Compare
          </button>
        ) : null}
      </div>

      {reading ? (
        <div data-testid="pentatonic-workflow-reading" style={{ display: 'grid', gap: '0.35rem' }}>
          <p style={{ margin: 0 }} data-testid="pentatonic-workflow-centre">
            CENTRE: {reading.centre}
          </p>
          <p style={{ margin: 0 }} data-testid="pentatonic-workflow-home">
            HOME: {reading.home}
            {reading.home === 'not established' ? ` (${reading.homeStatus})` : ''}
          </p>
          <p style={{ margin: 0 }}>NONE regions: {reading.noneCount}</p>
          {snapshot ? (
            <div data-testid="pentatonic-workflow-snapshot" style={{ display: 'grid', gap: '0.2rem' }}>
              <p style={{ margin: 0 }}>CURRENT FIELD: {snapshot.currentField}</p>
              <p style={{ margin: 0 }}>FORM CONTEXT: {snapshot.formContext}</p>
              <p style={{ margin: 0 }}>DUO CONTEXT: {snapshot.duoContext}</p>
              <p style={{ margin: 0 }}>HOLD_FIELD: {snapshot.holdField}</p>
              <p style={{ margin: 0 }}>TRITONE_PAIR_FIELD: {snapshot.tritonePairField}</p>
              <p style={{ margin: 0 }}>PATH NONE: {snapshot.pathNone}</p>
              <p style={{ margin: 0 }}>NO_PHRASE: {snapshot.noPhrase}</p>
              <p style={{ margin: 0 }}>STRUCTURAL_SILENCE: {snapshot.structuralSilence}</p>
            </div>
          ) : null}
          <div data-testid="pentatonic-workflow-regions" style={{ display: 'grid', gap: '0.25rem' }}>
            {reading.regions.map((row) => (
              <p key={`${row.measureRangeLabel}-${row.collectionName}`} style={{ margin: 0 }} data-testid="pentatonic-workflow-region-row">
                {row.measureRangeLabel} — {row.collectionName}
                {row.none ? '' : ` — ${row.colour}`}
                {row.identityNote ? ` — ${row.identityNote}` : ''}
              </p>
            ))}
          </div>
          <label htmlFor="pentatonic-workflow-region">
            Region
            <select
              id="pentatonic-workflow-region"
              value={String(regionIndex)}
              onChange={(event) => setRegionIndex(Number(event.target.value))}
            >
              {reading.regions.map((row, index) => (
                <option key={`${row.measureRangeLabel}-${index}`} value={index}>
                  {row.measureRangeLabel} {row.collectionName}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {mode === 'transform' || mode === 'generate' ? (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label htmlFor="pentatonic-workflow-resource">
            Pentatonic resource
            <select
              id="pentatonic-workflow-resource"
              value={resourceMode}
              onChange={(event) => setResourceMode(event.target.value === 'manual' ? 'manual' : 'auto')}
            >
              <option value="auto">Auto / path recommendation</option>
              <option value="manual">Manual resource</option>
            </select>
          </label>
          {resourceMode === 'manual' ? (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <label htmlFor="pentatonic-workflow-archetype">
                Collection
                <select
                  id="pentatonic-workflow-archetype"
                  value={manualArchetype}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (!getPentatonicColourResource(next)) {
                      setError(`Pentatonic colour "${next}" is not registered. Refusing to substitute minor pentatonic.`);
                      return;
                    }
                    setManualArchetype(next);
                    setColourRoute(null);
                  }}
                >
                  {listPentatonicColourResources().map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="pentatonic-workflow-reference">
                Reference
                <select id="pentatonic-workflow-reference" value={manualRef} onChange={(event) => setManualRef(event.target.value)}>
                  {PENTATONIC_NOTE_CHOICES.map((note) => (
                    <option key={note} value={note}>
                      {note}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === 'transform' ? (
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          <label htmlFor="pentatonic-workflow-method">
            Transformation method
            <select
              id="pentatonic-workflow-method"
              value={method}
              onChange={(event) => setMethod(event.target.value === 'M-NEAR' ? 'M-NEAR' : 'M-DEG')}
            >
              <option value="M-DEG">M-DEG</option>
              <option value="M-NEAR">M-NEAR</option>
            </select>
          </label>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{methodDescription(method)}</p>
          {transform ? (
            <div data-testid="pentatonic-workflow-transform-result">
              <p data-testid="pentatonic-workflow-pitch-change" style={{ margin: '0.2rem 0' }}>
                PITCH CHANGE: {transform.pitchChange}
              </p>
              <ColourBlock
                selectedResource={transform.selectedResource}
                resourceNotes={transform.resourceNotes}
                actualNotes={transform.actualNotes}
                outsideResourceNotes={transform.outsideResourceNotes}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" data-testid="pentatonic-workflow-hear" onClick={() => hear(transform.musicXml, false)}>
                  Audition
                </button>
                <button
                  type="button"
                  data-testid="pentatonic-workflow-export"
                  onClick={() => exportXml(transform.musicXml, transform.method)}
                >
                  Export MusicXML
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === 'generate' ? (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label htmlFor="pentatonic-workflow-purpose">
            Purpose
            <select
              id="pentatonic-workflow-purpose"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value as Dev4cPurpose)}
            >
              {DEV4C_PURPOSES.map((item) => (
                <option key={item} value={item}>
                  {purposeLabel(item)}
                </option>
              ))}
            </select>
          </label>
          {purpose !== 'NO_PHRASE' ? (
            <label htmlFor="pentatonic-workflow-activity">
              Activity
              <select
                id="pentatonic-workflow-activity"
                value={activity}
                onChange={(event) => setActivity(event.target.value as Dev4cActivity)}
              >
                {DEV4C_ACTIVITIES.map((item) => (
                  <option key={item} value={item}>
                    {activityLabel(item)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p style={{ margin: 0 }}>No phrase leaves the bar silent. That is a result, not a failed generation.</p>
          )}
          {generated?.notice ? <p data-testid="pentatonic-workflow-notice">{generated.notice}</p> : null}
          {generated?.candidates.map((candidate) => (
            <article
              key={candidate.letter}
              data-testid="pentatonic-workflow-candidate"
              style={{
                border: chosen === candidate.letter ? '2px solid var(--text)' : '1px solid var(--border)',
                borderRadius: 8,
                padding: '0.6rem',
              }}
            >
              <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem' }}>
                {candidate.letter}
                {candidate.silence ? '' : ` — ${candidate.purposeLabel} — ${candidate.activityLabel}`}
              </h3>
              {candidate.silence ? (
                <p data-testid="pentatonic-workflow-silence" style={{ margin: '0.2rem 0' }}>
                  {candidate.resultLabel}
                </p>
              ) : (
                <p style={{ margin: '0.2rem 0' }}>
                  Purpose: {candidate.purposeLabel}. Resource: {candidate.selectedResource}.
                </p>
              )}
              <ColourBlock
                selectedResource={candidate.selectedResource}
                resourceNotes={candidate.resourceNotes}
                actualNotes={candidate.actualNotes}
                outsideResourceNotes={candidate.outsideResourceNotes}
              />
              {candidate.scaleLike ? <p style={{ margin: '0.2rem 0' }}>SCALE-LIKE MOTION: {candidate.scaleLike}</p> : null}
              <GceBlock candidate={candidate} />
              <button type="button" onClick={() => setChosen(candidate.letter)}>
                {chosen === candidate.letter ? 'Chosen' : `Choose ${candidate.letter}`}
              </button>
            </article>
          ))}
          {generated && chosen ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                data-testid="pentatonic-workflow-hear"
                onClick={() => {
                  const candidate = generated.candidates.find((item) => item.letter === chosen);
                  if (candidate) hear(candidate.musicXml, candidate.silence);
                }}
              >
                Audition
              </button>
              <button
                type="button"
                data-testid="pentatonic-workflow-export"
                onClick={() => {
                  const candidate = generated.candidates.find((item) => item.letter === chosen);
                  if (candidate) exportXml(candidate.musicXml, candidate.letter);
                }}
              >
                Export MusicXML
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === 'auto-color' ? (
        <div data-testid="pentatonic-auto-color" style={{ display: 'grid', gap: '0.45rem' }}>
          <div role="group" aria-label="Intentions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {AUTO_COLOR_GUI_INTENTIONS.map(([intention, label]) => {
              const on = autoIntentions.includes(intention);
              return (
                <button
                  key={intention}
                  type="button"
                  className={on ? '' : 'secondary'}
                  aria-pressed={on}
                  data-testid={`pentatonic-auto-intention-${intention}`}
                  onClick={() => toggleIntention(intention)}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <label htmlFor="pentatonic-auto-form">
              Form
              <select
                id="pentatonic-auto-form"
                value={autoForm}
                onChange={(event) => {
                  setAutoPlan(null);
                  setAutoForm(event.target.value as FormFunction);
                }}
              >
                {FORM_CHOICES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="pentatonic-auto-role">
              Duo
              <select
                id="pentatonic-auto-role"
                value={autoRole}
                onChange={(event) => {
                  setAutoPlan(null);
                  setAutoRole(event.target.value as DuoRole);
                }}
              >
                {ROLE_CHOICES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="pentatonic-auto-resource">
              Current field
              <select
                id="pentatonic-auto-resource"
                value={autoResource}
                onChange={(event) => {
                  setAutoPlan(null);
                  const value = event.target.value;
                  if (value !== 'none' && !getPentatonicColourResource(value)) {
                    setError(`Pentatonic colour "${value}" is not registered. Refusing to substitute minor pentatonic.`);
                    return;
                  }
                  setAutoResource(value);
                }}
              >
                {listPentatonicColourResources().map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.displayName}
                  </option>
                ))}
                <option value="none">NONE</option>
              </select>
            </label>
            <label htmlFor="pentatonic-auto-ground">
              <input
                id="pentatonic-auto-ground"
                type="checkbox"
                checked={autoGrounded}
                onChange={(event) => {
                  setAutoPlan(null);
                  setAutoGrounded(event.target.checked);
                }}
              />{' '}
              Grounding
            </label>
          </div>
          {autoPlan ? (
            <div data-testid="pentatonic-auto-color-plan-result" style={{ display: 'grid', gap: '0.2rem' }}>
              <p style={{ margin: 0 }}>INTENTION: {autoPlan.intentions.join(' + ') || 'none'}</p>
              <p style={{ margin: 0 }}>FORM CONTEXT: {autoPlan.formFunction}</p>
              <p style={{ margin: 0 }}>DUO CONTEXT: {autoPlan.duoRole}</p>
              <p style={{ margin: 0 }}>
                CURRENT FIELD: {getPentatonicColourResource(autoResource)?.displayName ?? autoResource}
              </p>
              <p style={{ margin: 0 }}>SELECTED ACTION: {autoPlan.action}</p>
              <p style={{ margin: 0 }}>TARGET COLOUR: {autoPlan.targetColour}</p>
              <p style={{ margin: 0 }}>PLAN: {autoPlan.outcome}</p>
              <p style={{ margin: 0 }}>SELECTED RESOURCE: {autoPlan.selectedResource}</p>
              <p style={{ margin: 0 }}>OPERATOR: {autoPlan.operator}</p>
              <p style={{ margin: 0 }}>RETURN / RESOLUTION: {autoPlan.returnBehaviour}</p>
              <p style={{ margin: 0 }}>SILENCE DECISION: {autoPlan.silencePreference}</p>
              <p style={{ margin: 0 }}>RATIONALE: {autoPlan.rationale}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === 'compare' && compared ? (
        <div data-testid="pentatonic-compare" style={{ display: 'grid', gap: '0.5rem' }}>
          <p style={{ margin: 0 }}>
            {compared.candidates.length} candidate{compared.candidates.length === 1 ? '' : 's'}. Ordered by the plan, then an alternative, then silence.
          </p>
          {compared.candidates.map((candidate, index) => (
            <article
              key={`${candidate.kind}-${candidate.slot}`}
              data-testid="pentatonic-compare-candidate"
              style={{
                border: compareIndex === index ? '2px solid var(--text)' : '1px solid var(--border)',
                borderRadius: 8,
                padding: '0.6rem',
              }}
            >
              <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem' }}>{candidate.kind}</h3>
              <p style={{ margin: '0.2rem 0' }}>OPERATOR: {candidate.operator}</p>
              <ColourBlock
                selectedResource={candidate.resource}
                resourceNotes={candidate.kind === 'SILENCE' ? 'NONE' : candidate.resource}
                actualNotes={candidate.generatedNotes}
                outsideResourceNotes={candidate.outsideResourceNotes}
              />
              <p style={{ margin: '0.2rem 0' }}>LINEAGE: {candidate.lineage}</p>
              <p style={{ margin: '0.2rem 0' }}>RETURN: {candidate.returnQuality}</p>
              <p style={{ margin: '0.2rem 0' }}>FORM FIT: {candidate.formFit}</p>
              <p style={{ margin: '0.2rem 0' }}>DUO FIT: {candidate.duoFit}</p>
              <p style={{ margin: '0.2rem 0' }}>GCE: {candidate.gceAdvisory}</p>
              {candidate.accepted ? null : <p style={{ margin: '0.2rem 0' }}>Rejected: {candidate.rejectionReasons.join(', ')}</p>}
              <button type="button" onClick={() => setCompareIndex(index)}>
                {compareIndex === index ? 'Chosen' : `Choose ${candidate.kind}`}
              </button>
            </article>
          ))}
        </div>
      ) : null}

      {mode === 'export' ? (
        <div data-testid="pentatonic-export" style={{ display: 'grid', gap: '0.35rem' }}>
          <p style={{ margin: 0 }}>Export writes a new MusicXML file. The loaded score stays where it is. No tablature.</p>
          {exportable() ? (
            <button
              type="button"
              data-testid="pentatonic-workflow-export-mode"
              onClick={() => {
                const row = exportable();
                if (row) exportXml(row.xml, row.label);
              }}
            >
              Export MusicXML
            </button>
          ) : (
            <p style={{ margin: 0 }}>Compare, generate, or transform first.</p>
          )}
        </div>
      ) : null}

      {savedExportPath ? (
        <p data-testid="pentatonic-export-path" style={{ margin: 0 }}>
          Saved {savedExportPath}
        </p>
      ) : null}
      {error ? (
        <p role="alert" data-testid="pentatonic-workflow-error">
          {error}
        </p>
      ) : null}
      <button type="button" className="secondary" onClick={() => stop()} style={{ justifySelf: 'start' }}>
        Stop audition
      </button>
    </div>
  );
}
