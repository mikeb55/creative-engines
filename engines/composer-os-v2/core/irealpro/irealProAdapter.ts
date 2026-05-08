/// <reference path="./ireal-reader.d.ts" />
import iRealReader from 'ireal-reader';
import { harmoniesFromMeasures, type ParsedChart, type ParsedChord, type ParsedSection } from './parsedChart';
import {
  buildBarMeterMapFromUnscrambledMusic,
  extractUnscrambledMusicFromIrealInput,
  repeatsFieldFromParsedRepeatMarkers,
} from './irealProBarMeterScan';
import { buildRepeatMarkersFromUnscrambledMusic } from './irealProRepeatMarkersScan';
import { parseIrealTimeSignatureDigits } from './irealProTimeSignature';

type IRealMusic = {
  timeSignature: string | null;
  raw?: string;
  measures: (string | null)[][];
};

type IRealSong = {
  title?: string;
  composer?: string;
  style?: string;
  key?: string;
  transpose?: number | null;
  music?: IRealMusic;
  compStyle?: string;
  bpm?: number | null;
  repeats?: number | null;
};

type IRealPlaylist = {
  name?: string;
  songs: IRealSong[];
};

/** ireal-reader only matches `irealb://`; iReal Pro also emits `ireal://`. */
function normalizeForIRealLib(input: string): string {
  const s = input.trim();
  if (!/irealb:\/\//i.test(s) && /ireal:\/\//i.test(s)) {
    return s.replace(/ireal:\/\//gi, 'irealb://');
  }
  return s;
}

function parseTimeSignature(ts: string | null | undefined): { num: number; den: number } | null {
  return parseIrealTimeSignatureDigits(ts);
}

function splitChordSymbol(symbol: string): { rootNote: string; chordQuality: string } {
  const s = symbol.trim();
  if (s === '' || /^n\.?c\.?$/i.test(s)) {
    return { rootNote: '', chordQuality: '' };
  }
  const m = s.match(/^([A-G](?:#|b|♭|♯)?)(.*)$/);
  if (!m) {
    return { rootNote: '', chordQuality: s };
  }
  let root = m[1]!;
  root = root.replace('♭', 'b').replace('♯', '#');
  return {
    rootNote: root,
    chordQuality: (m[2] ?? '').trim(),
  };
}

function buildMeasures(measures: (string | null)[][] | undefined): ParsedChord[][] {
  if (!measures?.length) return [];
  const out: ParsedChord[][] = [];
  measures.forEach((chordsInBar, barIndex) => {
    const row: ParsedChord[] = [];
    (chordsInBar ?? []).forEach((cell, beatIndex) => {
      const symbol = cell == null ? 'N.C.' : String(cell);
      const { rootNote, chordQuality } = splitChordSymbol(symbol);
      row.push({
        symbol,
        rootNote,
        chordQuality,
        duration: 1,
        barIndex,
        beatIndex,
      });
    });
    out.push(row);
  });
  return out;
}

function defaultSections(totalBars: number): ParsedSection[] {
  if (totalBars <= 0) return [];
  return [{ label: 'A', startBar: 0, endBar: totalBars - 1 }];
}

function emptyChart(): ParsedChart {
  return {
    title: '',
    composer: '',
    key: null,
    meter: null,
    timeSignature: null,
    harmonies: [],
    barMeterMap: {},
    repeatMarkers: [],
    tempo: null,
    style: null,
    sections: [],
    measures: [],
    repeats: [],
  };
}

/**
 * Parse **ireal://** / **irealb://** URL or iReal Pro **HTML** export.
 * Uses **pianosnake/ireal-reader** (npm **`ireal-reader`**). First song in the playlist becomes **`ParsedChart`**.
 */
export function parseIRealProInput(input: string): ParsedChart {
  const normalized = normalizeForIRealLib(input);
  let playlist: IRealPlaylist;
  try {
    playlist = iRealReader(normalized);
  } catch {
    return emptyChart();
  }

  const song = playlist?.songs?.[0];
  if (!song) {
    return emptyChart();
  }

  const music = song.music;
  const measures = buildMeasures(music?.measures);
  const totalBars = measures.length;
  const globalTs = parseTimeSignature(music?.timeSignature ?? null);
  const unscrambled = extractUnscrambledMusicFromIrealInput(normalized);
  const barMeterMap =
    unscrambled && totalBars > 0 ? buildBarMeterMapFromUnscrambledMusic(unscrambled, globalTs) : {};
  const repeatMarkers =
    unscrambled && totalBars > 0 ? buildRepeatMarkersFromUnscrambledMusic(unscrambled) : [];

  let tempo: number | null =
    typeof song.bpm === 'number' && Number.isFinite(song.bpm) ? song.bpm : null;
  if (tempo === null || tempo === 0) {
    tempo = 120;
  }

  return {
    title: typeof song.title === 'string' ? song.title : '',
    composer: typeof song.composer === 'string' ? song.composer : '',
    key: typeof song.key === 'string' && song.key !== '' ? song.key : null,
    meter: globalTs,
    timeSignature: globalTs,
    harmonies: harmoniesFromMeasures(measures),
    barMeterMap,
    repeatMarkers,
    tempo,
    style: typeof song.style === 'string' && song.style !== '' ? song.style : null,
    sections: defaultSections(totalBars),
    measures,
    repeats: repeatsFieldFromParsedRepeatMarkers(repeatMarkers),
  };
}

export { parseIrealTimeSignatureDigits } from './irealProTimeSignature';
