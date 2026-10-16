import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { parseXmlToGridData } from '../lib/gridMusicXml.js';

const LastGenerateContext = createContext(null);

/** @typedef {{ id: string, name: string }} GridVoice */
/** @typedef {{
 *   pitch: number,
 *   startBeat: number,
 *   duration: number,
 *   barIndex: number,
 *   absoluteBeat: number,
 *   voiceId: string,
 *   voiceName: string,
 * }} GridNote */

export function LastGenerateProvider({ children }) {
  const [gridData, setGridData] = useState(null);
  const [playbackBeat, setPlaybackBeat] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [musicXml, setMusicXml] = useState(null);

  const publishGridFromXml = useCallback((xml, bpm, timeSig) => {
    if (!xml || typeof xml !== 'string' || !xml.trim()) {
      setGridData(null);
      return;
    }
    const data = parseXmlToGridData(xml, bpm, timeSig);
    setMusicXml(xml);
    setGridData(data.notes?.length > 0 ? data : null);
    setGeneratedAt(new Date().toISOString());
    setPlaybackBeat(0);
  }, []);

  const clearGrid = useCallback(() => {
    setGridData(null);
    setMusicXml(null);
    setGeneratedAt(null);
    setPlaybackBeat(0);
    setIsPlaying(false);
  }, []);

  const value = useMemo(
    () => ({
      gridData,
      playbackBeat,
      isPlaying,
      generatedAt,
      musicXml,
      publishGridFromXml,
      setPlaybackBeat,
      setIsPlaying,
      clearGrid,
    }),
    [gridData, playbackBeat, isPlaying, generatedAt, musicXml, publishGridFromXml, clearGrid]
  );

  return <LastGenerateContext.Provider value={value}>{children}</LastGenerateContext.Provider>;
}

export function useLastGenerate() {
  const ctx = useContext(LastGenerateContext);
  if (!ctx) throw new Error('useLastGenerate must be used within LastGenerateProvider');
  return ctx;
}
