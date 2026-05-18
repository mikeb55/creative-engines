/**
 * Structural MusicXML validation (XSD when xmllint available + DOM/xpath checks).
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { DOMParser, type Document as XmlDocument, type Element as XmlElement } from '@xmldom/xmldom';
import xpath from 'xpath';

function selectElements(expr: string, node: XmlDocument | XmlElement): XmlElement[] {
  return xpath.select(expr, node as unknown as Node) as unknown as XmlElement[];
}

function selectOneElement(expr: string, node: XmlDocument | XmlElement): XmlElement | undefined {
  const hit = xpath.select1(expr, node as unknown as Node);
  return hit && (hit as Node).nodeType === 1 ? (hit as unknown as XmlElement) : undefined;
}

export type XmlValidationOptions = {
  expectedPartCount?: number;
  expectHarmony?: boolean;
  beatsPerBar?: number;
  /** When true, XSD failures fail validation (CI with xmllint). */
  requireXsd?: boolean;
};

export type XmlValidationResult = {
  passed: boolean;
  failures: string[];
  warnings: string[];
  stats: {
    partCount: number;
    measureCount: number;
    harmonyCount: number;
  };
};

const SCHEMA_DIR = path.resolve(__dirname, '../../schemas/musicxml-4.0');
const MUSICXML_XSD = path.join(SCHEMA_DIR, 'musicxml.xsd');

function xmllintAvailable(): boolean {
  try {
    execFileSync('xmllint', ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function validateWithXsd(filePath: string): { ok: boolean; detail: string; ms: number } {
  const t0 = Date.now();
  if (!xmllintAvailable()) {
    return { ok: false, detail: 'xmllint not on PATH', ms: Date.now() - t0 };
  }
  if (!fs.existsSync(MUSICXML_XSD)) {
    return { ok: false, detail: `missing schema ${MUSICXML_XSD}`, ms: Date.now() - t0 };
  }
  try {
    execFileSync('xmllint', ['--noout', '--nonet', '--schema', MUSICXML_XSD, filePath], {
      stdio: 'pipe',
      encoding: 'utf-8',
      cwd: SCHEMA_DIR,
    });
    return { ok: true, detail: 'ok', ms: Date.now() - t0 };
  } catch (e) {
    const err = e as { stderr?: string; stdout?: string; message?: string };
    const detail = (err.stderr || err.stdout || err.message || String(e)).trim();
    return { ok: false, detail: detail.slice(0, 2000), ms: Date.now() - t0 };
  }
}

function parseXml(filePath: string): XmlDocument | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return new DOMParser().parseFromString(raw, 'application/xml');
  } catch {
    return null;
  }
}

function maxMeasureNumber(doc: XmlDocument): number {
  const nodes = selectElements('//*[local-name()="measure"]', doc);
  let max = 0;
  for (const el of nodes) {
    const num = parseInt(el.getAttribute('number') ?? '0', 10);
    if (num > max) max = num;
  }
  return max;
}

function validateMeasureBeatMath(doc: XmlDocument, beatsPerBar: number): string[] {
  const failures: string[] = [];
  const measures = selectElements('//*[local-name()="part"]/*[local-name()="measure"]', doc);

  for (const measure of measures) {
    let divisions = 1;
    const divisionsNode = selectOneElement(
      './/*[local-name()="attributes"]/*[local-name()="divisions"]',
      measure
    );
    if (parseDivisions(divisionsNode)) divisions = parseDivisions(divisionsNode)!;

    const timeEl = selectOneElement('.//*[local-name()="attributes"]/*[local-name()="time"]', measure);
    let beats = beatsPerBar;
    if (timeEl) {
      const b = timeEl.getElementsByTagName('beats')[0]?.textContent;
      if (b) beats = parseInt(b, 10) || beatsPerBar;
    }

    const expected = divisions * beats;
    let sum = 0;
    const notes = selectElements('.//*[local-name()="note"]', measure);
    for (const note of notes) {
      if (note.getElementsByTagName('rest').length > 0) continue;
      if (note.getElementsByTagName('chord').length > 0) continue;
      const durEl = note.getElementsByTagName('duration')[0];
      const d = durEl?.textContent ? parseInt(durEl.textContent, 10) : 0;
      if (Number.isFinite(d)) sum += d;
    }
    if (sum > 0 && Math.abs(sum - expected) > divisions) {
      failures.push(
        `measure ${measure.getAttribute('number') ?? '?'}: duration sum ${sum} != ~${expected}`
      );
    }

  }
  return failures;
}

function voiceTagWarnings(doc: XmlDocument): string[] {
  const warnings: string[] = [];
  const measures = selectElements('//*[local-name()="part"]/*[local-name()="measure"]', doc);
  for (const measure of measures) {
    const notes = selectElements('.//*[local-name()="note"]', measure);
    if (notes.length === 0) continue;
    let hasVoice = false;
    for (const note of notes) {
      if (note.getElementsByTagName('voice').length > 0) {
        hasVoice = true;
        break;
      }
    }
    if (!hasVoice) {
      warnings.push(`measure ${measure.getAttribute('number') ?? '?'}: no voice tags on notes`);
    }
  }
  return warnings;
}

function parseDivisions(el: XmlElement | undefined): number | undefined {
  if (!el?.textContent) return undefined;
  const v = parseInt(el.textContent.trim(), 10);
  return Number.isFinite(v) && v > 0 ? v : undefined;
}

export function validateMusicXmlFile(
  filePath: string,
  options: XmlValidationOptions = {}
): XmlValidationResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  const expectHarmony = options.expectHarmony !== false;
  const beatsPerBar = options.beatsPerBar ?? 4;
  const requireXsd = options.requireXsd === true;

  if (!fs.existsSync(filePath)) {
    return {
      passed: false,
      failures: [`missing file: ${filePath}`],
      warnings,
      stats: { partCount: 0, measureCount: 0, harmonyCount: 0 },
    };
  }

  const xsd = validateWithXsd(filePath);
  if (xsd.ok) {
    warnings.push(`xsd ok (${xsd.ms}ms)`);
  } else if (requireXsd) {
    failures.push(`xsd: ${xsd.detail}`);
  } else {
    warnings.push(`xsd skipped or failed (${xsd.ms}ms): ${xsd.detail.slice(0, 120)}`);
  }

  const doc = parseXml(filePath);
  if (!doc) {
    failures.push('xml parse failed');
    return {
      passed: false,
      failures,
      warnings,
      stats: { partCount: 0, measureCount: 0, harmonyCount: 0 },
    };
  }

  const partCount = selectElements('//*[local-name()="score-part"]', doc).length;
  const harmonyCount = selectElements('//*[local-name()="harmony"]', doc).length;
  const measureCount = maxMeasureNumber(doc);

  if (options.expectedPartCount != null && partCount !== options.expectedPartCount) {
    failures.push(`part count ${partCount} !== expected ${options.expectedPartCount}`);
  }

  if (expectHarmony && harmonyCount === 0) {
    failures.push('harmony count is zero but harmony expected');
  }

  warnings.push(...validateMeasureBeatMath(doc, beatsPerBar));
  warnings.push(...voiceTagWarnings(doc));

  return {
    passed: failures.length === 0,
    failures,
    warnings,
    stats: { partCount, measureCount, harmonyCount },
  };
}
