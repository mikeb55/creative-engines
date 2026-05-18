import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import * as Tone from 'tone';
import { api } from '../services/api';
import {
  initVoices,
  setMute as setStringVoiceMute,
  setSolo as setStringVoiceSolo,
  startPlayback,
  stopPlayback,
  type AllVoiceNotes,
  type StringVoice,
} from '../playback/stringVoices';
import {
  composerEraDomValue,
  composerEraSelectValueFromDom,
  resolveSqToBbLengthFromUi,
  resolveSqToBbUserChordInput,
  canGenerateWithUserChords,
  detectBarCountMismatch,
  lightCountUserChordBars,
  parseUserChordInput,
  sqToBbClassicalEraCompatibility,
  type SqToBbChordMismatchResolution,
  sqToBbEraForRequest,
  sqToBbMismatchNoticeMessage,
  SQ_TO_BB_DENSITY_OPTIONS,
  SQ_TO_BB_LENGTH_CUSTOM,
  SQ_TO_BB_LENGTH_PRESETS,
  SQ_TO_BB_SQ_COMPOSER_OPTIONS,
  SQ_TO_BB_SQ_COMPOSER_SELECT_NULL,
  SQ_TO_BB_DEFAULT_SECTION_LABEL_MODE,
  SQ_TO_BB_STYLE_PROFILES,
  getSectionLabelsForMode,
  type SqToBbSectionLabelMode,
  type SqToBbChordSourceMode,
  type SqToBbDensity,
  type SqToBbEraSelectValue,
  type SqToBbLengthSelectValue,
  type SqToBbSqComposer,
  type SqToBbSqComposerId,
  type SqToBbStyleProfileId,
  type SqToBbVoiceLaneId,
  type SqToBbWorkflowPayloadUi,
} from '../types/sqToBbWorkflowUi';
import { ComposerEraSelectOptions } from './ComposerEraSelectOptions';
import { SqToBbCompatibilityBadge } from './SqToBbCompatibilityBadge';
import { SqToBbMismatchNotice } from './SqToBbMismatchNotice';

const MAX_USER_REGENS = 2;
const LANE_ORDER: SqToBbVoiceLaneId[] = ['S', 'A', 'T', 'B'];

const LANE_TO_STRING_VOICE: Record<SqToBbVoiceLaneId, StringVoice> = {
  S: 'violin1',
  A: 'violin2',
  T: 'viola',
  B: 'cello',
};

function workflowToAllVoiceNotes(wf: SqToBbWorkflowPayloadUi): AllVoiceNotes {
  const out: AllVoiceNotes = { violin1: [], violin2: [], viola: [], cello: [] };
  for (const lane of wf.lanes) {
    const voice = LANE_TO_STRING_VOICE[lane.voiceId];
    if (!voice) continue;
    for (const n of lane.notes) {
      out[voice].push({
        pitchMidi: n.pitchMidi,
        offsetBars: n.offsetBars,
        durationBars: n.durationBars,
      });
    }
  }
  return out;
}

function hasAnyVoiceNotes(notes: AllVoiceNotes): boolean {
  return (
    notes.violin1.length > 0 ||
    notes.violin2.length > 0 ||
    notes.viola.length > 0 ||
    notes.cello.length > 0
  );
}

const row: CSSProperties = { marginBottom: '0.75rem' };
const flexRow: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' };

type ApiGenResult = {
  success?: boolean;
  error?: string;
  sqToBbWorkflow?: SqToBbWorkflowPayloadUi;
};

function PanelRow({ children }: { children: ReactNode }) {
  return <div style={row}>{children}</div>;
}

const zoneShell: CSSProperties = {
  marginBottom: '1rem',
  padding: '0.75rem 0.85rem',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'rgba(0, 0, 0, 0.03)',
};

const zoneTitle: CSSProperties = {
  margin: '0 0 0.65rem',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};

function WorkflowZone({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={zoneShell}>
      <div style={zoneTitle}>{title}</div>
      {children}
    </div>
  );
}

function gate1BadgeStyle(outcome: string): { bg: string; color: string; border: string } {
  switch (outcome) {
    case 'pass':
      return { bg: 'rgba(34,197,94,0.15)', color: 'rgb(22,163,74)', border: 'rgba(34,197,94,0.45)' };
    case 'retry_pass':
      return { bg: 'rgba(245,158,11,0.15)', color: 'rgb(180,83,9)', border: 'rgba(245,158,11,0.45)' };
    case 'fail':
      return { bg: 'rgba(239,68,68,0.12)', color: 'rgb(185,28,28)', border: 'rgba(239,68,68,0.4)' };
    default:
      return { bg: 'rgba(100,116,139,0.12)', color: 'var(--text-muted)', border: 'var(--border)' };
  }
}

function gate2BadgeStyle(outcome: string): { bg: string; color: string; border: string } {
  switch (outcome) {
    case 'pass':
      return { bg: 'rgba(34,197,94,0.15)', color: 'rgb(22,163,74)', border: 'rgba(34,197,94,0.45)' };
    case 'review':
      return { bg: 'rgba(245,158,11,0.15)', color: 'rgb(180,83,9)', border: 'rgba(245,158,11,0.45)' };
    case 'fail':
      return { bg: 'rgba(239,68,68,0.12)', color: 'rgb(185,28,28)', border: 'rgba(239,68,68,0.4)' };
    default:
      return { bg: 'rgba(100,116,139,0.12)', color: 'var(--text-muted)', border: 'var(--border)' };
  }
}

function LaneStrip({
  lane,
  totalBars,
  muted,
  soloActive,
  onToggleMute,
  onToggleSolo,
}: {
  lane: SqToBbWorkflowPayloadUi['lanes'][0];
  totalBars: number;
  muted: boolean;
  soloActive: boolean;
  onToggleMute: () => void;
  onToggleSolo: () => void;
}) {
  const span = Math.max(1, totalBars);
  return (
    <PanelRow>
      <div style={flexRow}>
        <strong style={{ width: 52, fontSize: '0.85rem' }}>{lane.voiceId}</strong>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{lane.label}</span>
        <label style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={muted} onChange={onToggleMute} />
          Mute
        </label>
        <label style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={soloActive} onChange={onToggleSolo} />
          Solo
        </label>
      </div>
      <div
        style={{
          position: 'relative',
          height: 28,
          borderRadius: 4,
          background: 'rgba(0,0,0,0.08)',
          border: '1px solid var(--border)',
        }}
      >
        {lane.notes.map((n, i) => {
          const left = (n.offsetBars / span) * 100;
          const width = Math.max(1.5, (n.durationBars / span) * 100);
          const hue = lane.voiceId === 'S' ? 210 : lane.voiceId === 'A' ? 160 : lane.voiceId === 'T' ? 45 : 280;
          return (
            <div
              key={`${lane.voiceId}-${i}-${n.offsetBars}`}
              title={`MIDI ${n.pitchMidi}`}
              style={{
                position: 'absolute',
                left: `${left}%`,
                width: `${width}%`,
                top: 2,
                bottom: 2,
                borderRadius: 2,
                background: `hsla(${hue}, 55%, 48%, ${muted ? 0.2 : 0.85})`,
                border: '1px solid rgba(0,0,0,0.15)',
              }}
            />
          );
        })}
      </div>
    </PanelRow>
  );
}

export function SqToBbWorkflowPanel({
  seed,
  totalBars: _parentTotalBars,
  bpm,
  styleProfile,
  onStyleProfileChange,
  era,
  onEraChange,
}: {
  seed: number;
  totalBars: number;
  bpm: number;
  styleProfile: SqToBbStyleProfileId;
  onStyleProfileChange: (id: SqToBbStyleProfileId) => void;
  era: SqToBbEraSelectValue;
  onEraChange: (value: SqToBbEraSelectValue) => void;
}) {
  const [lengthSelect, setLengthSelect] = useState<SqToBbLengthSelectValue>(32);
  const [customLengthBars, setCustomLengthBars] = useState('');
  const [sqComposer, setSqComposer] = useState<SqToBbSqComposer>(null);
  const [sectionLabelMode, setSectionLabelMode] = useState<SqToBbSectionLabelMode>(
    SQ_TO_BB_DEFAULT_SECTION_LABEL_MODE,
  );
  const [sectionVrbAssignments, setSectionVrbAssignments] = useState<Record<string, string | null>>(
    () => Object.fromEntries(getSectionLabelsForMode(SQ_TO_BB_DEFAULT_SECTION_LABEL_MODE).map((l) => [l, null])),
  );
  const [chordSourceMode, setChordSourceMode] = useState<SqToBbChordSourceMode>('generate_harmony');
  const [chordProgressionRaw, setChordProgressionRaw] = useState('');
  const [chordValidationTick, setChordValidationTick] = useState(0);
  const [chordMismatchResolution, setChordMismatchResolution] =
    useState<SqToBbChordMismatchResolution | null>(null);
  const [sqToBbDensity, setSqToBbDensity] = useState<SqToBbDensity>('medium');
  const [bbLightTouch, setBbLightTouch] = useState(false);
  const [workflow, setWorkflow] = useState<SqToBbWorkflowPayloadUi | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRegenCount, setUserRegenCount] = useState(0);
  const [regenPhraseIndex, setRegenPhraseIndex] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'sketch' | 'bb'>('idle');
  const [muted, setMuted] = useState<Record<SqToBbVoiceLaneId, boolean>>({
    S: false,
    A: false,
    T: false,
    B: false,
  });
  const [solo, setSolo] = useState<SqToBbVoiceLaneId | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stringsLoading, setStringsLoading] = useState(false);
  const [dismissedMismatchPair, setDismissedMismatchPair] = useState<string | null>(null);

  const sqSourceLocked = phase !== 'idle';
  const sectionLabels = useMemo(() => getSectionLabelsForMode(sectionLabelMode), [sectionLabelMode]);
  const sectionVrbMapPayload = useMemo(() => {
    const map: Record<string, string> = {};
    for (const label of sectionLabels) {
      const vrbId = sectionVrbAssignments[label];
      if (vrbId) map[label] = vrbId;
    }
    return Object.keys(map).length > 0 ? map : undefined;
  }, [sectionLabels, sectionVrbAssignments]);
  const bbOutputLocked = sqSourceLocked;
  const eraCompatibility = useMemo(
    () => sqToBbClassicalEraCompatibility(era, styleProfile),
    [era, styleProfile],
  );
  const mismatchNoticeMessage = useMemo(
    () => sqToBbMismatchNoticeMessage(era, styleProfile),
    [era, styleProfile],
  );
  const mismatchNoticePairKey =
    mismatchNoticeMessage != null ? `${String(era)}:${styleProfile}` : null;
  const showMismatchNotice =
    mismatchNoticeMessage != null &&
    mismatchNoticePairKey != null &&
    dismissedMismatchPair !== mismatchNoticePairKey;
  const lengthResolved = useMemo(
    () => resolveSqToBbLengthFromUi(lengthSelect, customLengthBars),
    [lengthSelect, customLengthBars],
  );
  const lengthBars = lengthResolved.ok ? lengthResolved.lengthBars : 32;
  const userChordInput = useMemo(
    () => resolveSqToBbUserChordInput(chordSourceMode, chordProgressionRaw),
    [chordSourceMode, chordProgressionRaw],
  );
  const chordLightCount = useMemo(() => {
    if (chordSourceMode !== 'use_user_chords') return null;
    return lightCountUserChordBars(chordProgressionRaw);
  }, [chordSourceMode, chordProgressionRaw]);
  const chordParse = useMemo(() => {
    if (chordSourceMode !== 'use_user_chords' || chordValidationTick === 0) return null;
    return parseUserChordInput(chordProgressionRaw);
  }, [chordSourceMode, chordProgressionRaw, chordValidationTick]);
  const barCountMismatch = useMemo(() => {
    if (chordSourceMode !== 'use_user_chords' || chordLightCount == null) return null;
    return detectBarCountMismatch(chordLightCount, lengthBars);
  }, [chordSourceMode, chordLightCount, lengthBars]);
  const chordGenerateGate = useMemo(
    () =>
      canGenerateWithUserChords(
        chordProgressionRaw,
        lengthBars,
        chordSourceMode,
        chordMismatchResolution,
      ),
    [chordProgressionRaw, lengthBars, chordSourceMode, chordMismatchResolution],
  );
  const canStartSketch =
    lengthResolved.ok && phase === 'idle' && !loading && chordGenerateGate.ok;

  const regenCeilingReached = userRegenCount >= MAX_USER_REGENS;
  const canApprove = Boolean(workflow && !workflow.gate1BlockedRenderer && workflow.gate1.proceedToRenderer);
  const gate2 = workflow?.gate2;
  const exportAllowed = Boolean(
    gate2 && (gate2.outcome === 'pass' || gate2.outcome === 'review') && !gate2.hardFail,
  );
  const showSketchActions = Boolean(workflow && phase === 'sketch' && !gate2);
  const gate1ReviewHint = workflow?.gate1.reviewHint;
  const flaggedPhraseIndex = gate1ReviewHint?.flaggedPhraseIndex ?? null;

  useEffect(() => {
    if (flaggedPhraseIndex != null) {
      setRegenPhraseIndex(flaggedPhraseIndex);
    }
  }, [workflow?.action, workflow?.seed, flaggedPhraseIndex]);

  const allVoiceNotes = useMemo(
    () => (workflow ? workflowToAllVoiceNotes(workflow) : null),
    [workflow],
  );

  const callApi = useCallback(
    async (action: string, extra: Record<string, unknown> = {}, lineSet?: unknown) => {
      setLoading(true);
      setError(null);
      try {
        const eraTag = sqToBbEraForRequest(era);
        const body: Record<string, unknown> = {
          presetId: 'sq_to_bb',
          seed,
          totalBars: lengthBars,
          lengthBars,
          bpm,
          sqToBbAction: action,
          sqToBbStyleProfile: styleProfile,
          styleStack: { primary: 'bob_brookmeyer' },
          sqToBbChordSourceMode: chordSourceMode,
          userChordInput,
          ...(chordMismatchResolution
            ? { sqToBbChordMismatchResolution: chordMismatchResolution }
            : {}),
          sqToBbSqComposer: sectionVrbMapPayload ? null : sqComposer,
          sectionLabelMode,
          ...(sectionVrbMapPayload ? { sectionVrbMap: sectionVrbMapPayload } : {}),
          sqToBbDensity,
          ...(bbLightTouch ? { bbLightTouch: true } : {}),
          ...(eraTag !== undefined ? { sqToBbEra: eraTag } : { sqToBbEra: null }),
          ...extra,
        };
        const ls = lineSet ?? workflow?.contrapuntalLineSet;
        if (ls) body.sqToBbLineSet = ls;
        const r = (await api.generate(body)) as ApiGenResult;
        if (!r.sqToBbWorkflow) {
          throw new Error(r.error ?? 'SQ→BB workflow returned no payload');
        }
        setWorkflow(r.sqToBbWorkflow);
        if (!r.success && r.error) setError(r.error);
        return r;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [
      seed,
      lengthBars,
      bpm,
      styleProfile,
      era,
      sqComposer,
      sectionLabelMode,
      sectionVrbMapPayload,
      sqToBbDensity,
      bbLightTouch,
      chordSourceMode,
      userChordInput,
      chordMismatchResolution,
      workflow?.contrapuntalLineSet,
    ],
  );

  const handleSketch = () => {
    if (!lengthResolved.ok) return;
    setUserRegenCount(0);
    setPhase('sketch');
    void callApi('sketch').then((r) => {
      if (r?.sqToBbWorkflow) setPhase('sketch');
    });
  };

  const handleRegenWhole = () => {
    if (regenCeilingReached) return;
    const next = userRegenCount + 1;
    setUserRegenCount(next);
    setPhase('sketch');
    void callApi('regenerate_whole', { seed: seed + next * 17_371 });
  };

  const handleRegenPhrase = () => {
    if (regenCeilingReached) return;
    const next = userRegenCount + 1;
    setUserRegenCount(next);
    setPhase('sketch');
    void callApi('regenerate_phrase', {
      sqToBbPhraseIndex: regenPhraseIndex,
      seed: seed + next * 17_371,
    });
  };

  const handleApprove = () => {
    if (!canApprove || !workflow) return;
    void callApi('translate', {}, workflow.contrapuntalLineSet).then((r) => {
      if (r?.sqToBbWorkflow) setPhase('bb');
    });
  };

  const handleExport = () => {
    if (!exportAllowed || !workflow) return;
    void callApi('export', {}, workflow.contrapuntalLineSet);
  };

  const handlePlay = async () => {
    if (!allVoiceNotes || !hasAnyVoiceNotes(allVoiceNotes)) return;
    setStringsLoading(true);
    try {
      await Tone.start();
      await initVoices();
      setIsPlaying(true);
      await startPlayback(allVoiceNotes, bpm, () => {
        setIsPlaying(false);
      });
    } catch (e) {
      setIsPlaying(false);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStringsLoading(false);
    }
  };

  const handleStopPlayback = () => {
    stopPlayback();
    setIsPlaying(false);
  };

  const downloadXml = (xml: string | undefined, filename: string) => {
    if (!xml) return;
    const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportThenDownload = (which: 'sq' | 'bb') => {
    if (!exportAllowed || !workflow) return;
    const run = async () => {
      let wf = workflow;
      if (which === 'sq' ? !wf.sqMusicXml : !wf.bbMusicXml) {
        const r = await callApi('export', {}, wf.contrapuntalLineSet);
        wf = r?.sqToBbWorkflow ?? wf;
      }
      const xml = which === 'sq' ? wf.sqMusicXml : wf.bbMusicXml;
      downloadXml(xml, `sq_to_bb_${which}_${seed}.musicxml`);
    };
    void run();
  };

  const g1Style = workflow ? gate1BadgeStyle(workflow.gate1.outcome) : null;
  const g2Style = gate2 ? gate2BadgeStyle(gate2.outcome) : null;

  return (
    <div
      style={{
        marginBottom: '1.25rem',
        padding: '1rem',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--bg-panel)',
        maxWidth: 720,
      }}
    >
      <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem' }}>SQ → BB workflow</h3>

      <WorkflowZone title="SQ Source">
        <fieldset
          disabled={sqSourceLocked || loading}
          style={{ border: 'none', margin: 0, padding: 0 }}
        >
          <div style={{ marginBottom: '0.75rem' }}>
            <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              Section label mode
            </span>
            <label style={{ fontSize: '0.85rem', marginRight: '1rem' }}>
              <input
                type="radio"
                name="sqToBbSectionLabelMode"
                checked={sectionLabelMode === 'song'}
                onChange={() => {
                  setSectionLabelMode('song');
                  setSectionVrbAssignments(
                    Object.fromEntries(getSectionLabelsForMode('song').map((l) => [l, null])),
                  );
                }}
              />{' '}
              Song
            </label>
            <label style={{ fontSize: '0.85rem' }}>
              <input
                type="radio"
                name="sqToBbSectionLabelMode"
                checked={sectionLabelMode === 'instrumental'}
                onChange={() => {
                  setSectionLabelMode('instrumental');
                  setSectionVrbAssignments(
                    Object.fromEntries(getSectionLabelsForMode('instrumental').map((l) => [l, null])),
                  );
                }}
              />{' '}
              Instrumental
            </label>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            {sectionLabels.map((label) => (
              <motion
                key={label}
                style={{ ...flexRow, marginBottom: '0.35rem', alignItems: 'center' }}
              >
                <span style={{ width: 108, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{label}</span>
                <select
                  value={sectionVrbAssignments[label] ?? SQ_TO_BB_SQ_COMPOSER_SELECT_NULL}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSectionVrbAssignments((prev) => ({
                      ...prev,
                      [label]: v === SQ_TO_BB_SQ_COMPOSER_SELECT_NULL ? null : v,
                    }));
                  }}
                  style={{ maxWidth: 220, flex: '1 1 180px' }}
                >
                  {SQ_TO_BB_SQ_COMPOSER_OPTIONS.map((o) => (
                    <option
                      key={`${label}-${o.id ?? 'none'}`}
                      value={o.id ?? SQ_TO_BB_SQ_COMPOSER_SELECT_NULL}
                      disabled={!o.enabled}
                    >
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            SQ Harmonic Voice
          </label>
          <select
            value={sqComposer ?? SQ_TO_BB_SQ_COMPOSER_SELECT_NULL}
            onChange={(e) => {
              const v = e.target.value;
              setSqComposer(
                v === SQ_TO_BB_SQ_COMPOSER_SELECT_NULL ? null : (v as SqToBbSqComposerId),
              );
            }}
            style={{ marginBottom: '0.75rem', maxWidth: 320 }}
          >
            {SQ_TO_BB_SQ_COMPOSER_OPTIONS.map((o) => (
              <option key={o.id ?? 'none'} value={o.id ?? SQ_TO_BB_SQ_COMPOSER_SELECT_NULL} disabled={!o.enabled}>
                {o.label}
              </option>
            ))}
          </select>

          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            Era
          </label>
          <select
            value={composerEraDomValue(era)}
            onChange={(e) => onEraChange(composerEraSelectValueFromDom(e.target.value))}
            disabled={loading || sqSourceLocked}
            style={{ marginBottom: '0.75rem', maxWidth: 320 }}
          >
            <ComposerEraSelectOptions />
          </select>

          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            Bar count
          </label>
          <div style={{ ...flexRow, marginBottom: lengthSelect === SQ_TO_BB_LENGTH_CUSTOM ? 4 : '0.75rem' }}>
            <select
              value={lengthSelect}
              onChange={(e) => {
                const v = e.target.value;
                setLengthSelect(
                  v === SQ_TO_BB_LENGTH_CUSTOM
                    ? SQ_TO_BB_LENGTH_CUSTOM
                    : (Number(v) as SqToBbLengthSelectValue),
                );
              }}
            >
              {SQ_TO_BB_LENGTH_PRESETS.map((n) => (
                <option key={n} value={n}>
                  {n} bars
                </option>
              ))}
              <option value={SQ_TO_BB_LENGTH_CUSTOM}>Custom</option>
            </select>
            {lengthSelect === SQ_TO_BB_LENGTH_CUSTOM && (
              <input
                type="number"
                min={8}
                max={128}
                step={1}
                value={customLengthBars}
                onChange={(e) => setCustomLengthBars(e.target.value)}
                placeholder="e.g. 28"
                style={{
                  width: 88,
                  padding: '0.35rem 0.5rem',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-input, var(--bg))',
                  color: 'var(--text)',
                }}
              />
            )}
          </div>
          {lengthSelect === SQ_TO_BB_LENGTH_CUSTOM && !lengthResolved.ok && (
            <p style={{ fontSize: '0.82rem', color: 'rgb(185,28,28)', margin: '0 0 0.75rem' }}>
              {lengthResolved.error}
            </p>
          )}

          <legend style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
            Chord progression
          </legend>
          <div style={{ ...flexRow, marginBottom: 8 }}>
            <label style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <input
                type="radio"
                name="sqToBbChordSource"
                checked={chordSourceMode === 'generate_harmony'}
                onChange={() => {
                  setChordSourceMode('generate_harmony');
                  setChordMismatchResolution(null);
                  setChordValidationTick(0);
                }}
              />
              Generate harmony
            </label>
            <label style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <input
                type="radio"
                name="sqToBbChordSource"
                checked={chordSourceMode === 'use_user_chords'}
                onChange={() => setChordSourceMode('use_user_chords')}
              />
              Use my chords
            </label>
          </div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            Chord progression (optional)
          </label>
          <textarea
            value={chordProgressionRaw}
            onChange={(e) => {
              setChordProgressionRaw(e.target.value);
              setChordMismatchResolution(null);
            }}
            onBlur={() => setChordValidationTick((n) => n + 1)}
            placeholder="Fmaj7#11 | Ebmaj7#5 | Dbmaj7 | Bmaj7 ..."
            rows={3}
            disabled={chordSourceMode === 'generate_harmony'}
            style={{
              width: '100%',
              maxWidth: 560,
              padding: '0.45rem 0.6rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-input, var(--bg))',
              color: 'var(--text)',
              fontFamily: 'inherit',
              fontSize: '0.85rem',
              resize: 'vertical',
              marginBottom: 4,
              opacity: chordSourceMode === 'generate_harmony' ? 0.55 : 1,
            }}
          />
          {chordSourceMode === 'use_user_chords' && chordLightCount != null && chordProgressionRaw.trim() ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 6px' }}>
              {chordLightCount} chord{chordLightCount === 1 ? '' : 's'} detected
            </p>
          ) : null}
          {chordParse && chordParse.tokens.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px 8px',
                fontSize: '0.82rem',
                marginBottom: 6,
                maxWidth: 560,
              }}
            >
              {chordParse.tokens.map((t, i) => (
                <span
                  key={`${t.start}-${i}`}
                  title={t.warningReason}
                  style={{
                    textDecoration:
                      t.confidence === 'warning'
                        ? 'underline wavy rgb(202,138,4)'
                        : t.confidence === 'error'
                          ? 'underline wavy rgb(185,28,28)'
                          : undefined,
                    color: t.confidence === 'error' ? 'rgb(185,28,28)' : undefined,
                  }}
                >
                  {t.token}
                </span>
              ))}
            </div>
          ) : null}
          {chordSourceMode === 'use_user_chords' &&
          barCountMismatch &&
          barCountMismatch.kind === 'fewer' ? (
            <div
              style={{
                padding: '0.5rem 0.65rem',
                marginBottom: 8,
                borderRadius: 6,
                border: '1px solid rgb(202,138,4)',
                background: 'rgba(202,138,4,0.08)',
                fontSize: '0.82rem',
                maxWidth: 560,
              }}
            >
              <p style={{ margin: '0 0 8px' }}>
                {barCountMismatch.chordCount} chords found for {barCountMismatch.barCount} bars. Choose:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setChordMismatchResolution('repeat')}
                  style={{
                    fontWeight: chordMismatchResolution === 'repeat' ? 600 : 400,
                  }}
                >
                  Repeat progression
                </button>
                <button
                  type="button"
                  onClick={() => setChordMismatchResolution('fill_internal')}
                  style={{
                    fontWeight: chordMismatchResolution === 'fill_internal' ? 600 : 400,
                  }}
                >
                  Fill remaining bars internally
                </button>
                <button type="button" onClick={() => setChordMismatchResolution(null)}>
                  Edit input
                </button>
              </div>
            </div>
          ) : null}
          {chordSourceMode === 'use_user_chords' && barCountMismatch?.kind === 'more' ? (
            <p style={{ fontSize: '0.82rem', color: 'rgb(185,28,28)', margin: '0 0 8px', maxWidth: 560 }}>
              {barCountMismatch.chordCount} chords found for {barCountMismatch.barCount} bars. Extra chords not
              applied. Edit input or increase bar count.
            </p>
          ) : null}
          {chordSourceMode === 'use_user_chords' && !chordGenerateGate.ok ? (
            <p style={{ fontSize: '0.82rem', color: 'rgb(185,28,28)', margin: '0 0 0.75rem', maxWidth: 560 }}>
              {chordGenerateGate.message}
            </p>
          ) : (
            <div style={{ marginBottom: '0.75rem' }} />
          )}

          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>
            Density
          </label>
          <select
            value={sqToBbDensity}
            onChange={(e) => setSqToBbDensity(e.target.value as SqToBbDensity)}
            disabled={loading || sqSourceLocked}
            style={{ maxWidth: 200 }}
          >
            {SQ_TO_BB_DENSITY_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </fieldset>
      </WorkflowZone>

      <WorkflowZone title="BB Output">
        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>
          BB Arranging Style
        </label>
        <div style={{ ...flexRow, alignItems: 'flex-start' }}>
          <select
            value={styleProfile}
            onChange={(e) => onStyleProfileChange(e.target.value as SqToBbStyleProfileId)}
            disabled={loading || bbOutputLocked}
          >
            {SQ_TO_BB_STYLE_PROFILES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          {eraCompatibility ? <SqToBbCompatibilityBadge level={eraCompatibility} /> : null}
        </div>
        {showMismatchNotice && mismatchNoticeMessage ? (
          <SqToBbMismatchNotice
            message={mismatchNoticeMessage}
            onDismiss={() => setDismissedMismatchPair(mismatchNoticePairKey)}
          />
        ) : null}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: '0.75rem',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}
        >
          <input
            type="checkbox"
            checked={bbLightTouch}
            onChange={(e) => setBbLightTouch(e.target.checked)}
            disabled={loading || bbOutputLocked}
          />
          Light Touch
        </label>
      </WorkflowZone>

      {phase === 'idle' && (
        <button type="button" onClick={handleSketch} disabled={!canStartSketch}>
          {loading ? 'Generating…' : 'Generate SQ sketch (Step 2)'}
        </button>
      )}

      {workflow && g1Style && !showSketchActions && (
        <PanelRow>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '0.2rem 0.55rem',
              borderRadius: 6,
              border: g1Style.border,
              background: g1Style.bg,
              color: g1Style.color,
            }}
          >
            Gate 1: {workflow.gate1.outcome.toUpperCase()}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 8 }}>
            Melodic Identity {workflow.gate1.melodicIdentity.toFixed(1)} · Phrase Grammar{' '}
            {workflow.gate1.phraseGrammar.toFixed(1)}
          </span>
        </PanelRow>
      )}

      {workflow && showSketchActions && g1Style && (
        <PanelRow>
          {gate1ReviewHint ? (
            <p style={{ fontSize: '0.82rem', margin: '0 0 0.35rem', color: 'var(--text)' }}>
              {gate1ReviewHint.detailLine}
            </p>
          ) : (
            <span
              style={{
                display: 'inline-block',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '0.2rem 0.55rem',
                borderRadius: 6,
                border: g1Style.border,
                background: g1Style.bg,
                color: g1Style.color,
              }}
            >
              Gate 1: {workflow.gate1.outcome.toUpperCase()}
            </span>
          )}
          {!gate1ReviewHint && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 8 }}>
              Melodic Identity {workflow.gate1.melodicIdentity.toFixed(1)} · Phrase Grammar{' '}
              {workflow.gate1.phraseGrammar.toFixed(1)}
            </span>
          )}
        </PanelRow>
      )}

      {workflow &&
        LANE_ORDER.map((id) => {
          const lane = workflow.lanes.find((l) => l.voiceId === id);
          if (!lane) return null;
          return (
            <LaneStrip
              key={id}
              lane={lane}
              totalBars={workflow.totalBars}
              muted={muted[id]}
              soloActive={solo === id}
              onToggleMute={() => {
                const next = !muted[id];
                setMuted((m) => ({ ...m, [id]: next }));
                setStringVoiceMute(LANE_TO_STRING_VOICE[id], next);
              }}
              onToggleSolo={() => {
                if (solo === id) {
                  setSolo(null);
                  setStringVoiceSolo(null);
                  for (const laneId of LANE_ORDER) {
                    setStringVoiceMute(LANE_TO_STRING_VOICE[laneId], muted[laneId]);
                  }
                } else {
                  setSolo(id);
                  setStringVoiceSolo(LANE_TO_STRING_VOICE[id]);
                }
              }}
            />
          );
        })}

      {workflow && workflow.phraseFeatures.length > 0 && (
        <PanelRow>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
            Phrase features
          </div>
          <div style={{ ...flexRow, alignItems: 'stretch' }}>
            {workflow.phraseFeatures.map((pf, idx) => {
              const isFlaggedPhrase = flaggedPhraseIndex === idx;
              const isSelected = regenPhraseIndex === idx;
              return (
              <button
                key={pf.phraseId}
                type="button"
                onClick={() => setRegenPhraseIndex(idx)}
                style={{
                  padding: '0.45rem 0.6rem',
                  borderRadius: 6,
                  border: isFlaggedPhrase
                    ? '1px solid rgba(245,158,11,0.65)'
                    : isSelected
                      ? '1px solid rgba(59,130,246,0.55)'
                      : '1px solid var(--border)',
                  background: isFlaggedPhrase
                    ? 'rgba(245,158,11,0.12)'
                    : isSelected
                      ? 'rgba(59,130,246,0.1)'
                      : 'rgba(0,0,0,0.04)',
                  fontSize: '0.75rem',
                  lineHeight: 1.35,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <strong>{pf.phraseId}</strong>
                <div>
                  {pf.textureClass} · density {pf.density} · cadence {pf.cadencePoint} · independence{' '}
                  {pf.lineIndependence}
                </div>
              </button>
              );
            })}
          </div>
        </PanelRow>
      )}

      {workflow && (
        <PanelRow>
          <div style={flexRow}>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                if (isPlaying) {
                  handleStopPlayback();
                } else {
                  void Tone.start();
                  void handlePlay();
                }
              }}
              disabled={loading || stringsLoading}
            >
              {stringsLoading
                ? 'Loading strings...'
                : isPlaying
                  ? 'Pause'
                  : 'Play all voices'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={handleStopPlayback}
              disabled={!isPlaying && !stringsLoading}
            >
              Stop
            </button>
          </div>
        </PanelRow>
      )}

      {showSketchActions && (
        <PanelRow>
          <div style={flexRow}>
            <button type="button" onClick={handleApprove} disabled={loading || !canApprove}>
              Approve → translate (Step 4)
            </button>
            <button
              type="button"
              className="secondary"
              onClick={handleRegenPhrase}
              disabled={loading || regenCeilingReached}
            >
              Regenerate phrase
            </button>
            <button
              type="button"
              className="secondary"
              onClick={handleRegenWhole}
              disabled={loading || regenCeilingReached}
            >
              Regenerate whole sketch
            </button>
          </div>
          {userRegenCount > 0 && !regenCeilingReached && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
              Regeneration {userRegenCount} of {MAX_USER_REGENS}
            </p>
          )}
          {regenCeilingReached && (
            <p style={{ fontSize: '0.85rem', color: 'rgb(180,83,9)', margin: '0.5rem 0 0' }}>
              Maximum regenerations reached. Try adjusting your prompt or chord progression.
            </p>
          )}
        </PanelRow>
      )}

      {gate2 && g2Style && (
        <PanelRow>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '0.2rem 0.55rem',
              borderRadius: 6,
              border: g2Style.border,
              background: g2Style.bg,
              color: g2Style.color,
            }}
          >
            Gate 2: {gate2.outcome.toUpperCase()}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 8 }}>
            Arr {gate2.arrangementOrchestration.toFixed(1)} · Econ {gate2.economyFocus.toFixed(1)} · hierarchy{' '}
            {gate2.hierarchyClarity.toFixed(3)} · GCE {gate2.overallGce.toFixed(1)}
          </span>
          {gate2.hardFail && (
            <p style={{ fontSize: '0.82rem', color: 'rgb(185,28,28)', margin: '0.35rem 0 0' }}>
              hierarchyClarity below 0.40 — regenerate whole sketch (uses retry budget) or change style.
            </p>
          )}
        </PanelRow>
      )}

      {workflow?.bbPhrases && workflow.bbPhrases.length > 0 && (
        <PanelRow>
          <strong style={{ fontSize: '0.85rem' }}>BB section assignments</strong>
          {workflow.bbPhrases.map((bp) => (
            <details key={bp.phraseId} style={{ marginTop: 6, fontSize: '0.8rem' }}>
              <summary>
                {bp.phraseId} — geometry: <strong>{bp.geometryShape}</strong>
              </summary>
              <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
                {bp.assignments.map((a, i) => (
                  <li key={`${a.section}-${a.role}-${i}`}>
                    {a.section} / {a.role}
                    {a.lineDerived ? ' (line-derived)' : ''}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </PanelRow>
      )}

      {phase === 'bb' && gate2?.hardFail && !regenCeilingReached && (
        <PanelRow>
          <button type="button" className="secondary" onClick={handleRegenWhole} disabled={loading}>
            Regenerate whole sketch (Gate 2 recovery)
          </button>
        </PanelRow>
      )}

      {workflow && gate2 && (
        <PanelRow>
          <div style={flexRow}>
            <button type="button" onClick={handleExport} disabled={loading || !exportAllowed}>
              Write to library
            </button>
            <button
              type="button"
              className="secondary"
              disabled={loading || !exportAllowed}
              onClick={() => exportThenDownload('sq')}
            >
              Export SQ
            </button>
            <button
              type="button"
              className="secondary"
              disabled={loading || !exportAllowed}
              onClick={() => exportThenDownload('bb')}
            >
              Export BB
            </button>
          </div>
          {(workflow.sqMusicXmlFilepath || workflow.bbMusicXmlFilepath) && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
              {workflow.sqMusicXmlFilepath && <>SQ: {workflow.sqMusicXmlFilepath}</>}
              {workflow.sqMusicXmlFilepath && workflow.bbMusicXmlFilepath && <br />}
              {workflow.bbMusicXmlFilepath && <>BB: {workflow.bbMusicXmlFilepath}</>}
            </p>
          )}
        </PanelRow>
      )}

      {error && (
        <p style={{ color: 'var(--error, #b91c1c)', fontSize: '0.88rem', marginTop: '0.75rem' }}>{error}</p>
      )}
    </div>
  );
}
