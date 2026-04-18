/**
 * Aggregate chord-symbol statistics from MusicXML harmony blocks (reference mining only).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import { extractHarmoniesFromFirstPartXml } from '../../core/export/chordSymbolMusicXml';

export interface ChordAggregateRatios {
  maj7Family: number;
  m7Family: number;
  dominant7Family: number;
  slashRatio: number;
  triadOrPower: number;
}

export interface BacharachFileMiningResult {
  /** Basename of source file */
  source: string;
  measureCount: number;
  chords: string[];
  ratios: ChordAggregateRatios;
}

function classifyChord(sym: string): {
  maj7Fam: boolean;
  m7Fam: boolean;
  dom7Fam: boolean;
  slash: boolean;
  triad: boolean;
} {
  const s = sym.trim();
  const low = s.toLowerCase();
  const slash = s.includes('/');
  const maj7Fam = /maj7|maj9|maj11|\u0394/.test(low);
  const m7Fam = /\bm7\b|^([a-g][#b]*)m7([^a-z0-9]|$)/i.test(s.split('/')[0]);
  const dom7Fam =
    !maj7Fam &&
    !m7Fam &&
    (/^[a-g][#b]*7([^a-z0-9]|$)/i.test(s.split('/')[0]) || /\b(dom|dominant)\b/i.test(low));
  const triad =
    !maj7Fam &&
    !m7Fam &&
    !dom7Fam &&
    /^[a-g][#b]*(m(in)?)?$/i.test(s.split('/')[0].replace(/\s+/g, ''));
  return { maj7Fam, m7Fam, dom7Fam, slash, triad };
}

export function aggregateChordRatios(chords: string[]): ChordAggregateRatios {
  if (chords.length === 0) {
    return {
      maj7Family: 0,
      m7Family: 0,
      dominant7Family: 0,
      slashRatio: 0,
      triadOrPower: 0,
    };
  }
  let maj = 0;
  let m7 = 0;
  let dom = 0;
  let slash = 0;
  let tri = 0;
  for (const c of chords) {
    const x = classifyChord(c);
    if (x.maj7Fam) maj++;
    if (x.m7Fam) m7++;
    if (x.dom7Fam) dom++;
    if (x.slash) slash++;
    if (x.triad) tri++;
  }
  const n = chords.length;
  return {
    maj7Family: maj / n,
    m7Family: m7 / n,
    dominant7Family: dom / n,
    slashRatio: slash / n,
    triadOrPower: tri / n,
  };
}

/** First score-like XML inside a directory tree. */
export function findScoreXmlUnderDir(dir: string): string | null {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/META-INF/i.test(e.name)) continue;
      const nested = findScoreXmlUnderDir(p);
      if (nested) return nested;
    } else if (/\.(musicxml|xml)$/i.test(e.name)) {
      return p;
    }
  }
  return null;
}

/**
 * Expand `.mxl` (zip) into a temp dir and return path to inner MusicXML. Returns null on failure.
 */
export function extractMxlToTempXml(mxlPath: string): { xmlPath: string; cleanup: () => void } | null {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bach-mxl-'));
  const cleanup = (): void => {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* skip */
    }
  };
  try {
    if (process.platform === 'win32') {
      const zipPath = path.join(tmp, 'inner.zip');
      fs.copyFileSync(mxlPath, zipPath);
      execSync(
        `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmp.replace(/'/g, "''")}' -Force"`,
        { stdio: 'ignore' }
      );
    } else {
      execSync(`unzip -o -q "${mxlPath}" -d "${tmp}"`, { stdio: 'ignore' });
    }
    const xmlPath = findScoreXmlUnderDir(tmp);
    if (!xmlPath) {
      cleanup();
      return null;
    }
    return {
      xmlPath,
      cleanup,
    };
  } catch {
    cleanup();
    return null;
  }
}

export function loadMusicXmlFromFile(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.musicxml' || ext === '.xml') {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }
  if (ext === '.mxl') {
    const got = extractMxlToTempXml(filePath);
    if (!got) return null;
    try {
      return fs.readFileSync(got.xmlPath, 'utf-8');
    } finally {
      got.cleanup();
    }
  }
  return null;
}

export function mineMusicXmlString(xml: string, sourceLabel: string): BacharachFileMiningResult {
  const map = extractHarmoniesFromFirstPartXml(xml);
  const nums = [...map.keys()].sort((a, b) => a - b);
  const chords = nums.map((n) => map.get(n)!).filter(Boolean);
  const measureCount = nums.length > 0 ? Math.max(...nums) : 0;
  return {
    source: sourceLabel,
    measureCount,
    chords,
    ratios: aggregateChordRatios(chords),
  };
}

export function mineMusicXmlFile(filePath: string): BacharachFileMiningResult | null {
  const xml = loadMusicXmlFromFile(filePath);
  if (!xml) return null;
  return mineMusicXmlString(xml, path.basename(filePath));
}

export interface BacharachCorpusSummary {
  filesWithHarmony: number;
  perFile: BacharachFileMiningResult[];
  meanRatios: ChordAggregateRatios | null;
}

export function summarizeCorpus(results: BacharachFileMiningResult[]): BacharachCorpusSummary {
  const ok = results.filter((r) => r.chords.length > 0);
  if (ok.length === 0) {
    return { filesWithHarmony: 0, perFile: results, meanRatios: null };
  }
  const sum = ok.reduce(
    (acc, r) => {
      acc.maj7Family += r.ratios.maj7Family;
      acc.m7Family += r.ratios.m7Family;
      acc.dominant7Family += r.ratios.dominant7Family;
      acc.slashRatio += r.ratios.slashRatio;
      acc.triadOrPower += r.ratios.triadOrPower;
      return acc;
    },
    {
      maj7Family: 0,
      m7Family: 0,
      dominant7Family: 0,
      slashRatio: 0,
      triadOrPower: 0,
    }
  );
  const n = ok.length;
  const meanRatios: ChordAggregateRatios = {
    maj7Family: sum.maj7Family / n,
    m7Family: sum.m7Family / n,
    dominant7Family: sum.dominant7Family / n,
    slashRatio: sum.slashRatio / n,
    triadOrPower: sum.triadOrPower / n,
  };
  return {
    filesWithHarmony: ok.length,
    perFile: results,
    meanRatios,
  };
}
