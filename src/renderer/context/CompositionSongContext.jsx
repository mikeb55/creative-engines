import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  createDefaultCompositionSong,
  patchSectionUi,
  repartitionSectionBars,
  sectionBarLength,
} from '../lib/compositionSongUi';

const CompositionSongContext = createContext(null);

export function CompositionSongProvider({ children, initialTotalBars = 32 }) {
  const [song, setSong] = useState(() => createDefaultCompositionSong(initialTotalBars));
  const [activeSectionId, setActiveSectionId] = useState(() => 'section_a');

  const activeSection = useMemo(
    () => song.sections.find((s) => s.id === activeSectionId) ?? song.sections[0] ?? null,
    [song.sections, activeSectionId]
  );

  const updateSong = useCallback((updater) => {
    setSong((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const renameSection = useCallback((sectionId, label) => {
    updateSong((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, label: label.trim() || s.label } : s)),
    }));
  }, [updateSong]);

  const addSection = useCallback(() => {
    updateSong((prev) => {
      const addBars = 8;
      const totalBars = prev.totalBars + addBars;
      const startBar = prev.totalBars + 1;
      const id = `section_${Date.now()}`;
      const nextSection = {
        id,
        label: 'New Section',
        type: 'custom',
        barRange: { startBar, endBar: totalBars },
        meterMap: [{ bar: startBar, meter: prev.globalDefaults.meter ?? '4/4' }],
      };
      return {
        ...prev,
        totalBars,
        sections: [...prev.sections, nextSection],
      };
    });
  }, [updateSong]);

  const deleteSection = useCallback((sectionId) => {
    if (!window.confirm('Delete this section?')) return;
    updateSong((prev) => {
      if (prev.sections.length <= 1) return prev;
      const remaining = prev.sections.filter((s) => s.id !== sectionId);
      const totalBars = remaining.reduce((sum, s) => sum + sectionBarLength(s), 0);
      const sections = repartitionSectionBars(remaining, totalBars);
      setActiveSectionId((cur) => {
        if (cur === sectionId) return sections[0]?.id ?? cur;
        return cur;
      });
      return { ...prev, totalBars, sections };
    });
  }, [updateSong]);

  const moveSection = useCallback((sectionId, direction) => {
    updateSong((prev) => {
      const idx = prev.sections.findIndex((s) => s.id === sectionId);
      if (idx < 0) return prev;
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= prev.sections.length) return prev;
      const copy = [...prev.sections];
      const tmp = copy[idx];
      copy[idx] = copy[swap];
      copy[swap] = tmp;
      const sections = repartitionSectionBars(copy, prev.totalBars);
      return { ...prev, sections };
    });
  }, [updateSong]);

  const patchActiveSection = useCallback(
    (patch) => {
      if (!activeSectionId) return;
      updateSong((prev) => patchSectionUi(prev, activeSectionId, patch));
    },
    [activeSectionId, updateSong]
  );

  const value = useMemo(
    () => ({
      song,
      setSong: updateSong,
      activeSectionId,
      setActiveSectionId,
      activeSection,
      renameSection,
      addSection,
      deleteSection,
      moveSection,
      patchActiveSection,
      patchSection: (sectionId, patch) => updateSong((prev) => patchSectionUi(prev, sectionId, patch)),
    }),
    [
      song,
      updateSong,
      activeSectionId,
      activeSection,
      renameSection,
      addSection,
      deleteSection,
      moveSection,
      patchActiveSection,
    ]
  );

  return <CompositionSongContext.Provider value={value}>{children}</CompositionSongContext.Provider>;
}

export function useCompositionSong() {
  const ctx = useContext(CompositionSongContext);
  if (!ctx) {
    throw new Error('useCompositionSong must be used within CompositionSongProvider');
  }
  return ctx;
}
