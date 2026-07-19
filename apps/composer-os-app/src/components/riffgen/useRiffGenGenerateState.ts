/**
 * Phase 1.5 S3 — local riff generate state for RiffGen tab.
 * Copies minimal HomeGenerate riff wiring; does NOT share HomeGenerate code.
 */
import { useCallback, useRef, useState } from 'react';
import { api } from '../../services/api';
import { mapCoreUiToGenerationFields } from '../../utils/buildGenerateRequestBody';
import {
  RIFF_BAR_COUNT_DEFAULT,
  RIFF_ODD_METER_NONE,
  clampRiffBarCount,
  defaultRiffVrbIdForFamily,
  isZappaRiffVrbId,
  riffGateLabelsFromFailedRules,
  type RiffBarCount,
  type RiffCarryForward,
  type RiffFamilyTag,
  type RiffOddMeterSelectValue,
  type ZappaChainDepthUi,
  type ZappaEraPresetUi,
  type ZappaPhraseCharacterUi,
  type ZappaStyleModeUi,
  type ZappaSymmetryBiasUi,
} from '../../types/riffGeneratorUi';
import type { RiffDensity, RiffGridMode, RiffLineMode } from '@composer-os/core/riff-generator/riffTypes';
import type { RiffChordLoopDisclosure } from '@composer-os/core/riff-generator/riffChordLoop';

const STYLE_STACK = {
  primary: 'barry_harris' as const,
  styleBlend: { primary: 'strong' as const, secondary: 'off' as const, colour: 'off' as const },
};

/** Local copy of HomeGenerate variation id helpers — not extracted from Home. */
function nextVariationIdToken(current: string): string {
  const t = current.trim();
  const m = /^v-(\d+)$/.exec(t);
  if (m) return `v-${Number(m[1]) + 1}`;
  return `v-${Date.now().toString(36)}`;
}

function newVariationIdToken(): string {
  return `v-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export type RiffGenOp = 'full' | 'regenerate' | 'mutate';

export type RiffGenGenerateResult = {
  success?: boolean;
  error?: string;
  filename?: string;
  filepath?: string;
  validation?: { errors?: string[]; readiness?: { shareable?: boolean } };
  riffCarryForward?: RiffCarryForward;
  riffMusicality?: { failedRules?: string[] };
  runManifest?: { seed?: number };
  /** Phase 1 chord-loop trust disclosure. */
  chordLoopDisclosure?: RiffChordLoopDisclosure;
};

export function buildRiffGenGeneratePayload(args: {
  seed: number;
  variationId: string;
  bpm: number;
  family: RiffFamilyTag;
  vrbId: string;
  bars: RiffBarCount;
  oddMeterPreset: RiffOddMeterSelectValue;
  density: RiffDensity;
  riffGrid: RiffGridMode;
  riffLineMode: RiffLineMode;
  riffBass: boolean;
  riffSolo: boolean;
  chordProgressionText: string;
  zappaStyleMode: ZappaStyleModeUi;
  zappaEraPreset: ZappaEraPresetUi;
  zappaPhraseCharacter: ZappaPhraseCharacterUi;
  zappaSymmetryBias: ZappaSymmetryBiasUi;
  zappaChainDepth: ZappaChainDepthUi;
  op: RiffGenOp;
  barLocks: boolean[];
  carryForward: RiffCarryForward | null;
}): Record<string, unknown> {
  const bars = clampRiffBarCount(args.bars);
  const chordTrim = args.chordProgressionText.trim();
  const coreFields = mapCoreUiToGenerationFields({
    presetId: 'riff_generator',
    seed: args.seed,
    tonalCenter: '',
    bpm: args.bpm,
    totalBars: bars,
    variationId: args.variationId.trim() || 'v-1',
    creativeControlLevel: 'stable',
  });
  return {
    ...coreFields,
    variationEnabled: false,
    styleStack: STYLE_STACK,
    chromaticStrength: 'off',
    riffVrbId: args.vrbId,
    totalBars: bars,
    ...(args.oddMeterPreset ? { riffOddMeterPreset: args.oddMeterPreset } : {}),
    riffDensity: args.density,
    riffGrid: args.riffGrid,
    riffLineMode: args.riffLineMode,
    riffBass: args.riffBass,
    ...(args.riffSolo ? { riffSolo: true } : {}),
    ...(chordTrim ? { chordProgressionText: chordTrim } : {}),
    ...(isZappaRiffVrbId(args.vrbId)
      ? {
          zappaStyleMode: args.zappaStyleMode,
          zappaEraPreset: args.zappaEraPreset,
          zappaPhraseCharacter: args.zappaPhraseCharacter,
          zappaSymmetryBias: args.zappaSymmetryBias,
          zappaChainDepth: args.zappaChainDepth,
        }
      : {}),
    ...(args.op !== 'full' &&
    args.carryForward &&
    (args.op === 'regenerate' || args.op === 'mutate')
      ? {
          riffOp: args.op,
          riffBarLocks: args.barLocks.slice(0, bars),
          riffCarryForward: args.carryForward,
        }
      : {}),
  };
}

function notifyGenPhase(phase: 'running' | 'succeeded' | 'failed' | 'idle'): void {
  window.composerOsDesktop?.notifyGenerationPhase(phase);
}

export function useRiffGenGenerateState() {
  const [family, setFamily] = useState<RiffFamilyTag>('rock');
  const [vrbId, setVrbId] = useState(defaultRiffVrbIdForFamily('rock'));
  const [bars, setBars] = useState<RiffBarCount>(RIFF_BAR_COUNT_DEFAULT);
  const [oddMeterPreset, setOddMeterPreset] = useState<RiffOddMeterSelectValue>(RIFF_ODD_METER_NONE);
  const [density, setDensity] = useState<RiffDensity>('medium');
  const [riffGrid, setRiffGrid] = useState<RiffGridMode>('eighth');
  const [riffLineMode, setRiffLineMode] = useState<RiffLineMode>('single_line');
  const [riffBass, setRiffBass] = useState(false);
  const [riffSolo, setRiffSolo] = useState(false);
  const [barLocks, setBarLocks] = useState<boolean[]>([]);
  const [carryForward, setCarryForward] = useState<RiffCarryForward | null>(null);
  const [gateMessages, setGateMessages] = useState<string[]>([]);
  const [zappaAdvancedOpen, setZappaAdvancedOpen] = useState(false);
  const [zappaStyleMode, setZappaStyleMode] = useState<ZappaStyleModeUi>('classic');
  const [zappaEraPreset, setZappaEraPreset] = useState<ZappaEraPresetUi>('mothers');
  const [zappaPhraseCharacter, setZappaPhraseCharacter] = useState<ZappaPhraseCharacterUi>('angular');
  const [zappaSymmetryBias, setZappaSymmetryBias] = useState<ZappaSymmetryBiasUi>('balanced');
  const [zappaChainDepth, setZappaChainDepth] = useState<ZappaChainDepthUi>(2);
  const [chordProgressionText, setChordProgressionText] = useState('Am7 | Dm7 | G7 | Cmaj7');
  const [bpm, setBpm] = useState(120);
  const [baseSeed, setBaseSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [variationId, setVariationId] = useState('v-1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RiffGenGenerateResult | null>(null);
  const opRef = useRef<RiffGenOp>('full');

  const onFamilyChange = useCallback((next: RiffFamilyTag) => {
    setFamily(next);
    setVrbId(defaultRiffVrbIdForFamily(next));
  }, []);

  const onBarsChange = useCallback((n: RiffBarCount) => {
    const barsN = clampRiffBarCount(n);
    setBars(barsN);
    setBarLocks((prev) => {
      const next = prev.slice(0, barsN);
      while (next.length < barsN) next.push(false);
      return next;
    });
  }, []);

  const onBarLockChange = useCallback((i: number, locked: boolean) => {
    setBarLocks((prev) => {
      const next = [...prev];
      while (next.length < clampRiffBarCount(bars)) next.push(false);
      next[i] = locked;
      return next;
    });
  }, [bars]);

  const onNewVariation = useCallback(() => {
    setVariationId(newVariationIdToken());
    setBaseSeed(Math.floor(Math.random() * 1e9));
  }, []);

  const onNextVariation = useCallback(() => {
    setVariationId((v) => nextVariationIdToken(v));
  }, []);

  const openFolder = useCallback(async (folderPath?: string) => {
    setError(null);
    try {
      const r = await api.openOutputFolder(folderPath ? { path: folderPath } : {});
      if (!r.success && r.message) {
        setError(r.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const runGenerate = useCallback(
    async (op: RiffGenOp) => {
      opRef.current = op;
      setLoading(true);
      setError(null);
      setGateMessages([]);
      notifyGenPhase('running');
      try {
        const payload = buildRiffGenGeneratePayload({
          seed: baseSeed,
          variationId,
          bpm,
          family,
          vrbId,
          bars,
          oddMeterPreset,
          density,
          riffGrid,
          riffLineMode,
          riffBass,
          riffSolo,
          chordProgressionText,
          zappaStyleMode,
          zappaEraPreset,
          zappaPhraseCharacter,
          zappaSymmetryBias,
          zappaChainDepth,
          op,
          barLocks,
          carryForward,
        });
        const r = (await api.generate(payload)) as RiffGenGenerateResult;
        setResult(r);
        if (r.success) {
          if (r.riffCarryForward) setCarryForward(r.riffCarryForward);
          const failed = r.riffMusicality?.failedRules ?? [];
          setGateMessages(riffGateLabelsFromFailedRules(failed));
          notifyGenPhase('succeeded');
        } else {
          const errMsg =
            r.error ??
            (r.validation?.errors?.length ? r.validation.errors.join(' ') : undefined) ??
            'Generation failed.';
          setError(errMsg);
          notifyGenPhase('failed');
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setResult(null);
        notifyGenPhase('failed');
      } finally {
        setLoading(false);
      }
    },
    [
      baseSeed,
      variationId,
      bpm,
      family,
      vrbId,
      bars,
      oddMeterPreset,
      density,
      riffGrid,
      riffLineMode,
      riffBass,
      riffSolo,
      chordProgressionText,
      zappaStyleMode,
      zappaEraPreset,
      zappaPhraseCharacter,
      zappaSymmetryBias,
      zappaChainDepth,
      barLocks,
      carryForward,
    ]
  );

  return {
    family,
    vrbId,
    bars,
    oddMeterPreset,
    density,
    riffGrid,
    riffLineMode,
    riffBass,
    riffSolo,
    barLocks,
    carryForward,
    gateMessages,
    zappaAdvancedOpen,
    zappaStyleMode,
    zappaEraPreset,
    zappaPhraseCharacter,
    zappaSymmetryBias,
    zappaChainDepth,
    chordProgressionText,
    bpm,
    baseSeed,
    variationId,
    loading,
    error,
    result,
    setVrbId,
    setOddMeterPreset,
    setDensity,
    setRiffGrid,
    setRiffLineMode,
    setRiffBass,
    setRiffSolo,
    setZappaAdvancedOpen,
    setZappaStyleMode,
    setZappaEraPreset,
    setZappaPhraseCharacter,
    setZappaSymmetryBias,
    setZappaChainDepth,
    setChordProgressionText,
    setBpm,
    setBaseSeed,
    onFamilyChange,
    onBarsChange,
    onBarLockChange,
    onNewVariation,
    onNextVariation,
    openFolder,
    generate: () => void runGenerate('full'),
    regenerate: () => void runGenerate('regenerate'),
    mutate: () => void runGenerate('mutate'),
  };
}
