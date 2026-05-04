import type { ParsedChart, ParsedChord, ParsedSection } from './parsedChart';

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

const iRealReader = require('ireal-reader') as (data: string) => IRealPlaylist;

/** ireal-reader only matches `irealb://`; iReal Pro also emits `ireal://`. */
function normalizeForIRealLib(input: string): string {
  const s = input.trim();
  if (!/irealb:\/\//i.test(s) && /ireal:\/\//i.test(s)) {
    return s.replace(/ireal:\/\//gi, 'irealb://');
  }
  return s;
}

function parseTimeSignature(ts: string | null | undefined): { num: number; den: number } | null {
  if (ts == null || ts === '') return null;
  const d = String(ts).replace(/\D/g, '');
  if (d.length < 2) return null;
  if (d === '128') return { num: 12, den: 8 };
  if (d.length === 2) {
    const num = parseInt(d[0]!, 10);
    const den = parseInt(d[1]!, 10);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
    return { num, den };
  }
  const den = parseInt(d.slice(-1), 10);
  const num = parseInt(d.slice(0, -1), 10);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
  return { num, den };
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
    timeSignature: null,
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

  return {
    title: typeof song.title === 'string' ? song.title : '',
    composer: typeof song.composer === 'string' ? song.composer : '',
    key: typeof song.key === 'string' && song.key !== '' ? song.key : null,
    timeSignature: parseTimeSignature(music?.timeSignature ?? null),
    tempo: typeof song.bpm === 'number' && Number.isFinite(song.bpm) ? song.bpm : null,
    style: typeof song.style === 'string' && song.style !== '' ? song.style : null,
    sections: defaultSections(totalBars),
    measures,
    repeats: [],
  };
}
