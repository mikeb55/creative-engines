/**
 * Jest integration: riff generator must emit true 16th-note divisions when riffGrid is 'sixteenth'.
 * Covers engine (`runRiffGenerator`) + app wiring (`runRiffGeneratorApp` / `parseRiffGrid`).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DOMParser } from '@xmldom/xmldom';
import { runRiffGenerator } from '../runRiffGenerator';
import { runRiffGeneratorApp } from '../../../app-api/riffGeneratorApp';
import type { GenerateRequest } from '../../../app-api/appApiTypes';
import type { RiffDensity, RiffStyleId } from '../riffTypes';

const STYLE_STACK: GenerateRequest['styleStack'] = {
  primary: 'barry_harris',
  styleBlend: { primary: 'strong', secondary: 'off', colour: 'off' },
};

/** Parse <divisions> from first measure attributes (default 480). */
export function readDivisionsFromMusicXml(xml: string): number {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const measures = doc.getElementsByTagName('measure');
  for (let i = 0; i < measures.length; i++) {
    const attrs = measures[i]!.getElementsByTagName('attributes');
    if (attrs.length) {
      const div = attrs[0]!.getElementsByTagName('divisions');
      if (div.length && div[0]!.textContent) {
        const n = parseInt(div[0]!.textContent.trim(), 10);
        if (Number.isFinite(n) && n > 0) return n;
      }
    }
  }
  const any = doc.getElementsByTagName('divisions');
  if (any.length && any[0]!.textContent) {
    const n = parseInt(any[0]!.textContent.trim(), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 480;
}

/** All <duration> text values on <note> elements in document order (first part first in partwise export). */
export function collectNoteDurations(xml: string): number[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const notes = doc.getElementsByTagName('note');
  const out: number[] = [];
  for (let i = 0; i < notes.length; i++) {
    const dur = notes[i]!.getElementsByTagName('duration')[0];
    if (dur?.textContent) {
      const n = parseInt(dur.textContent.trim(), 10);
      if (Number.isFinite(n)) out.push(n);
    }
  }
  return out;
}

/** Pitched 16ths only: <note> with <pitch> and duration === divisions/4. */
export function hasSixteenthNoteDurations(xml: string): boolean {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const divisions = readDivisionsFromMusicXml(xml);
  const sixteenth = divisions / 4;
  const notes = doc.getElementsByTagName('note');
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]!;
    if (n.getElementsByTagName('pitch').length === 0) continue;
    const dur = n.getElementsByTagName('duration')[0];
    if (!dur?.textContent) continue;
    if (parseInt(dur.textContent.trim(), 10) === sixteenth) return true;
  }
  return false;
}

function riffRequest(
  overrides: Partial<GenerateRequest> & {
    riffStyle: RiffStyleId;
    riffDensity: RiffDensity;
    riffGrid: 'eighth' | 'sixteenth';
  }
): GenerateRequest {
  return {
    presetId: 'riff_generator',
    styleStack: STYLE_STACK,
    seed: overrides.seed ?? 424242,
    title: overrides.title ?? 'Jest16th',
    totalBars: overrides.totalBars ?? 4,
    riffStyle: overrides.riffStyle,
    riffDensity: overrides.riffDensity,
    riffGrid: overrides.riffGrid,
    riffLineMode: overrides.riffLineMode ?? 'single_line',
    riffBass: overrides.riffBass ?? false,
    bpm: overrides.bpm ?? 100,
  };
}

/** Find a seed where riff export succeeds and MusicXML contains at least one pitched 16th (grid wiring + rhythm). */
function findSuccessfulXmlSixteenth(
  style: RiffStyleId,
  density: RiffDensity,
  maxTries = 2000
): string {
  for (let k = 0; k < maxTries; k++) {
    const seed = 50_000 + k * 31;
    const r = runRiffGenerator(seed, {
      bars: 4,
      density,
      style,
      grid: 'sixteenth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 100,
      title: 'Grid16',
    });
    if (r.success && r.xml && hasSixteenthNoteDurations(r.xml)) return r.xml;
  }
  throw new Error(
    `Expected at least one pitched 16th-note duration for style=${style}, density=${density}, grid='sixteenth', but found none after ${maxTries} seeds (export may succeed without using the 16th grid in notation).`
  );
}

function findSuccessfulXmlViaApp(style: RiffStyleId, density: RiffDensity, maxTries = 2000): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cos-riff-16-app-'));
  try {
    for (let k = 0; k < maxTries; k++) {
      const req = riffRequest({
        seed: 60_000 + k * 37,
        riffStyle: style,
        riffDensity: density,
        riffGrid: 'sixteenth',
        totalBars: 4,
      });
      const out = runRiffGeneratorApp(req, tmp);
      if (out.success && out.xml && hasSixteenthNoteDurations(out.xml)) return out.xml;
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  throw new Error(
    `runRiffGeneratorApp: expected pitched 16th durations with riffGrid='sixteenth' for style=${style} density=${density}; none in ${maxTries} successful exports (check app → engine wiring).`
  );
}

describe('riff generator 16th-note grid (engine)', () => {
  const styles = ['neutral', 'scofield', 'funk', 'metheny'] as const satisfies readonly RiffStyleId[];
  const densities = ['sparse', 'medium', 'dense'] as const satisfies readonly RiffDensity[];

  for (const style of styles) {
    for (const density of densities) {
      it(`emits at least one pitched 16th (duration=divisions/4) for style=${style}, density=${density}, grid=sixteenth`, () => {
        const xml = findSuccessfulXmlSixteenth(style, density);
        expect(xml.length).toBeGreaterThan(100);
        const divisions = readDivisionsFromMusicXml(xml);
        expect(divisions).toBe(480);
        const durs = collectNoteDurations(xml);
        expect(durs.length).toBeGreaterThan(0);
        expect(hasSixteenthNoteDurations(xml)).toBe(true);
      });
    }
  }
});

describe('riff generator 16th-note grid (app wiring)', () => {
  const styles = ['neutral', 'scofield', 'funk', 'metheny'] as const satisfies readonly RiffStyleId[];
  const densities = ['sparse', 'medium', 'dense'] as const satisfies readonly RiffDensity[];

  for (const style of styles) {
    for (const density of densities) {
      it(`runRiffGeneratorApp + riffGrid=sixteenth emits pitched 16ths for style=${style}, density=${density}`, () => {
        const xml = findSuccessfulXmlViaApp(style, density);
        expect(xml.length).toBeGreaterThan(100);
        expect(hasSixteenthNoteDurations(xml)).toBe(true);
      });
    }
  }
});

describe('riff generator eighth grid control', () => {
  it('eighth grid does not emit pitched 16th durations (sanity check)', () => {
    const xml = (() => {
      for (let k = 0; k < 400; k++) {
        const seed = 70_000 + k * 29;
        const r = runRiffGenerator(seed, {
          bars: 4,
          density: 'medium',
          style: 'neutral',
          grid: 'eighth',
          lineMode: 'single_line',
          bassEnabled: false,
          bpm: 100,
          title: 'Grid8',
        });
        if (r.success && r.xml) return r.xml;
      }
      throw new Error('no success');
    })();
    expect(hasSixteenthNoteDurations(xml)).toBe(false);
  });
});
