/**
 * Aggregate MIDI + MusicXML output validation for a directory tree.
 */

import * as fs from 'fs';
import * as path from 'path';
import { validateMidiFile, type MidiValidationOptions, type MidiValidationResult } from './midiValidator';
import {
  validateMusicXmlFile,
  type XmlValidationOptions,
  type XmlValidationResult,
} from './musicXmlOutputValidator';

export type OutputValidationOptions = {
  expectedPartCount?: number;
  expectedBars?: number;
  beatsPerBar?: number;
  expectHarmony?: boolean;
  instrumentRanges?: MidiValidationOptions['instrumentRanges'];
  skipPitchRangeCheck?: boolean;
  requireXsd?: boolean;
  midiOptions?: MidiValidationOptions;
  xmlOptions?: XmlValidationOptions;
};

export type FileValidationResult = {
  file: string;
  kind: 'midi' | 'musicxml';
  passed: boolean;
  failures: string[];
  warnings: string[];
};

export type OutputValidationSuiteResult = {
  passed: boolean;
  midiResults: FileValidationResult[];
  xmlResults: FileValidationResult[];
  failures: string[];
  warnings: string[];
};

function walkMediaFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkMediaFiles(full, acc);
    else if (ent.isFile()) {
      const lower = ent.name.toLowerCase();
      if (lower.endsWith('.mid') || lower.endsWith('.midi')) acc.push(full);
      else if (lower.endsWith('.musicxml') || lower.endsWith('.xml')) acc.push(full);
    }
  }
  return acc;
}

export function runOutputValidationSuite(
  outputDir: string,
  options: OutputValidationOptions = {}
): OutputValidationSuiteResult {
  const midiResults: FileValidationResult[] = [];
  const xmlResults: FileValidationResult[] = [];
  const failures: string[] = [];
  const warnings: string[] = [];

  const beatsPerBar = options.beatsPerBar ?? 4;
  const midiOpts: MidiValidationOptions = {
    expectedPartCount: options.expectedPartCount,
    expectedBars: options.expectedBars,
    beatsPerBar,
    instrumentRanges: options.instrumentRanges,
    skipPitchRangeCheck: options.skipPitchRangeCheck,
    ...options.midiOptions,
  };
  const xmlOpts: XmlValidationOptions = {
    expectedPartCount: options.expectedPartCount,
    expectHarmony: options.expectHarmony,
    beatsPerBar,
    requireXsd: options.requireXsd,
    ...options.xmlOptions,
  };

  for (const file of walkMediaFiles(outputDir)) {
    const lower = file.toLowerCase();
    if (lower.endsWith('.mid') || lower.endsWith('.midi')) {
      const isDrumGuide = lower.includes('drum_guide');
      const r: MidiValidationResult = validateMidiFile(file, {
        ...midiOpts,
        skipPitchRangeCheck: isDrumGuide || midiOpts.skipPitchRangeCheck,
        expectedPartCount: isDrumGuide ? undefined : midiOpts.expectedPartCount,
      });
      midiResults.push({
        file,
        kind: 'midi',
        passed: r.passed,
        failures: r.failures,
        warnings: r.warnings,
      });
      if (!r.passed) failures.push(...r.failures.map((f) => `${path.basename(file)}: ${f}`));
      warnings.push(...r.warnings.map((w) => `${path.basename(file)}: ${w}`));
    } else {
      const r: XmlValidationResult = validateMusicXmlFile(file, xmlOpts);
      xmlResults.push({
        file,
        kind: 'musicxml',
        passed: r.passed,
        failures: r.failures,
        warnings: r.warnings,
      });
      if (!r.passed) failures.push(...r.failures.map((f) => `${path.basename(file)}: ${f}`));
      warnings.push(...r.warnings.map((w) => `${path.basename(file)}: ${w}`));
    }
  }

  const hasMedia = midiResults.length + xmlResults.length > 0;
  return {
    passed: failures.length === 0 && hasMedia,
    midiResults,
    xmlResults,
    failures,
    warnings,
  };
}
