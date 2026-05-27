import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const StringQuartetContext = createContext(null);

export const SQ_STYLE_PRESETS = [
  { id: 'beethoven', label: 'Beethoven' },
  { id: 'bartok', label: 'Bartók' },
  { id: 'ravel', label: 'Ravel' },
  { id: 'shostakovich', label: 'Shostakovich' },
  { id: 'kronos', label: 'Kronos (contemporary)' },
];

export const SQ_VOICING_STYLES = ['close', 'open', 'mixed'];
export const SQ_TEXTURES = [
  'homophonic',
  'melody_accompaniment',
  'contrapuntal',
  'antiphonal',
  'unison',
];
export const SQ_REGISTERS = ['low', 'mid', 'high', 'extended'];
export const SQ_TECHNIQUES = [
  'arco',
  'pizzicato',
  'col_legno',
  'sul_ponticello',
  'sul_tasto',
  'harmonics',
  'tremolo',
  'spiccato',
];
export const SQ_DYNAMICS = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'fff'];

const DEFAULT_VOICES = [
  { id: 'violin1', label: 'Violin I' },
  { id: 'violin2', label: 'Violin II' },
  { id: 'viola', label: 'Viola' },
  { id: 'cello', label: 'Cello' },
];

function defaultVoice({ id, label }) {
  return {
    id,
    label,
    muted: false,
    solo: false,
    register: 'mid',
    technique: 'arco',
    dynamic: 'mf',
  };
}

function buildDefault() {
  return {
    voicingStyle: 'close',
    texture: 'homophonic',
    stylePreset: 'beethoven',
    voices: DEFAULT_VOICES.map(defaultVoice),
  };
}

export function StringQuartetProvider({ children }) {
  const [state, setState] = useState(buildDefault);

  const patchVoice = useCallback((voiceId, patch) => {
    setState((prev) => ({
      ...prev,
      voices: prev.voices.map((v) => (v.id === voiceId ? { ...v, ...patch } : v)),
    }));
  }, []);

  const stringQuartetConfig = useMemo(
    () => ({
      voicingStyle: state.voicingStyle,
      texture: state.texture,
      stylePreset: state.stylePreset,
      voices: state.voices.map((v) => ({ ...v })),
    }),
    [state]
  );

  const value = useMemo(
    () => ({
      state,
      stringQuartetConfig,
      patchVoice,
      setVoicingStyle: (voicingStyle) => setState((p) => ({ ...p, voicingStyle })),
      setTexture: (texture) => setState((p) => ({ ...p, texture })),
      setStylePreset: (stylePreset) => setState((p) => ({ ...p, stylePreset })),
    }),
    [state, stringQuartetConfig, patchVoice]
  );

  return <StringQuartetContext.Provider value={value}>{children}</StringQuartetContext.Provider>;
}

export function useStringQuartet() {
  const ctx = useContext(StringQuartetContext);
  if (!ctx) throw new Error('useStringQuartet must be used within StringQuartetProvider');
  return ctx;
}
