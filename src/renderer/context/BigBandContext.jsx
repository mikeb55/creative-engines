import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { BIG_BAND_DRUM_STYLES, bigBandDrumStylesForBand } from '../../engine/bigBandDrums.js';

const BigBandContext = createContext(null);

export const BIG_BAND_STYLE_OPTIONS = [
  { id: 'basie', label: 'Basie', bandStyle: 'basie' },
  { id: 'ellington', label: 'Ellington', bandStyle: 'ellington' },
  { id: 'kenton', label: 'Kenton', bandStyle: 'kenton' },
  { id: 'buddy_rich', label: 'Buddy Rich', bandStyle: 'rich' },
  { id: 'thad_jones', label: 'Thad Jones', bandStyle: 'thad' },
];

const SPREAD_OPTIONS = ['closed', 'drop-2', 'drop-3', 'spread'];
const REGISTER_OPTIONS = ['low', 'mid', 'high'];

function voice(id, label) {
  return { id, label, muted: false, solo: false };
}

function defaultSection(voices) {
  return {
    enabled: true,
    spread: 'closed',
    register: 'mid',
    voices: voices.map((v) => voice(v.id, v.label)),
  };
}

function buildDefaultConfig() {
  const style = BIG_BAND_STYLE_OPTIONS[0];
  return {
    styleId: style.id,
    bandStyle: style.bandStyle,
    soliMode: false,
    shoutChorus: false,
    drumStyleId: bigBandDrumStylesForBand(style.bandStyle)[0]?.id ?? BIG_BAND_DRUM_STYLES[0].id,
    sections: {
      trumpets: defaultSection([
        { id: 't_lead', label: 'Lead' },
        { id: 't_2', label: '2nd' },
        { id: 't_3', label: '3rd' },
        { id: 't_4', label: '4th' },
      ]),
      trombones: defaultSection([
        { id: 'tb_lead', label: 'Lead' },
        { id: 'tb_2', label: '2nd' },
        { id: 'tb_3', label: '3rd' },
        { id: 'tb_bass', label: 'Bass' },
      ]),
      saxes: defaultSection([
        { id: 'as_lead', label: 'Lead Alto' },
        { id: 'as_2', label: '2nd Alto' },
        { id: 'ts_lead', label: 'Lead Tenor' },
        { id: 'ts_2', label: '2nd Tenor' },
        { id: 'bari', label: 'Baritone' },
      ]),
      rhythm: defaultSection([
        { id: 'piano', label: 'Piano' },
        { id: 'bass', label: 'Bass' },
        { id: 'drums', label: 'Drums' },
        { id: 'guitar', label: 'Guitar' },
      ]),
    },
  };
}

export function BigBandProvider({ children }) {
  const [config, setConfig] = useState(buildDefaultConfig);

  const setStyleId = useCallback((styleId) => {
    const opt = BIG_BAND_STYLE_OPTIONS.find((s) => s.id === styleId);
    if (!opt) return;
    const firstDrum = bigBandDrumStylesForBand(opt.bandStyle)[0];
    setConfig((prev) => ({
      ...prev,
      styleId: opt.id,
      bandStyle: opt.bandStyle,
      drumStyleId: firstDrum?.id ?? prev.drumStyleId,
      ...(prev.shoutChorus ? { sections: applyShoutChorus(prev.sections) } : {}),
    }));
  }, []);

  const setDrumStyleId = useCallback((drumStyleId) => {
    setConfig((prev) => ({ ...prev, drumStyleId }));
  }, []);

  const patchSection = useCallback((sectionKey, patch) => {
    setConfig((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: { ...prev.sections[sectionKey], ...patch },
      },
    }));
  }, []);

  const patchVoice = useCallback((sectionKey, voiceId, patch) => {
    setConfig((prev) => {
      const sec = prev.sections[sectionKey];
      if (!sec) return prev;
      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: {
            ...sec,
            voices: sec.voices.map((v) => (v.id === voiceId ? { ...v, ...patch } : v)),
          },
        },
      };
    });
  }, []);

  const setSoliMode = useCallback((soliMode) => {
    setConfig((prev) => ({ ...prev, soliMode }));
  }, []);

  const setShoutChorus = useCallback((shoutChorus) => {
    setConfig((prev) => ({
      ...prev,
      shoutChorus,
      sections: shoutChorus ? applyShoutChorus(prev.sections) : prev.sections,
    }));
  }, []);

  const bigBandConfig = useMemo(() => {
    const { sections, styleId, bandStyle, soliMode, shoutChorus, drumStyleId } = config;
    return {
      styleId,
      bandStyle,
      soliMode,
      shoutChorus,
      drumStyleId,
      sections: JSON.parse(JSON.stringify(sections)),
    };
  }, [config]);

  const value = useMemo(
    () => ({
      config,
      bigBandConfig,
      spreadOptions: SPREAD_OPTIONS,
      registerOptions: REGISTER_OPTIONS,
      setStyleId,
      setDrumStyleId,
      patchSection,
      patchVoice,
      setSoliMode,
      setShoutChorus,
    }),
    [
      config,
      bigBandConfig,
      setStyleId,
      setDrumStyleId,
      patchSection,
      patchVoice,
      setSoliMode,
      setShoutChorus,
    ]
  );

  return <BigBandContext.Provider value={value}>{children}</BigBandContext.Provider>;
}

function applyShoutChorus(sections) {
  const next = { ...sections };
  for (const key of Object.keys(next)) {
    if (key === 'rhythm') continue;
    next[key] = {
      ...next[key],
      spread: 'spread',
      register: 'high',
    };
  }
  return next;
}

export function useBigBand() {
  const ctx = useContext(BigBandContext);
  if (!ctx) throw new Error('useBigBand must be used within BigBandProvider');
  return ctx;
}
