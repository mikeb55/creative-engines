/**
 * Composer OS V2 — MusicXML validation shell
 */

import { validateMusicXml } from '../../../../src/utils/musicXmlValidator';
import type { SchemaValidationResult, ReParseResult } from './exportTypes';

/** Top-level &lt;direction-type&gt; child → MusicXML xs:choice branch (only one branch per direction-type). */
const DIRECTION_TYPE_CHILD_BRANCH: Record<string, string> = {
  rehearsal: 'rehearsal',
  segno: 'segno',
  coda: 'coda',
  words: 'words-symbol',
  symbol: 'words-symbol',
  wedge: 'wedge',
  dynamics: 'dynamics',
  dashes: 'dashes',
  bracket: 'bracket',
  pedal: 'pedal',
  metronome: 'metronome',
  'octave-shift': 'octave-shift',
  'harp-pedals': 'harp-pedals',
  damp: 'damp',
  'damp-all': 'damp-all',
  eyeglasses: 'eyeglasses',
  'string-mute': 'string-mute',
  scordatura: 'scordatura',
  image: 'image',
  'principal-voice': 'principal-voice',
  percussion: 'percussion',
  'accordion-registration': 'accordion-registration',
  'staff-divide': 'staff-divide',
  'other-direction': 'other-direction',
};

function topLevelElementNamesInXmlFragment(fragment: string): string[] {
  const names: string[] = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9-]*)[^>]*>/g;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(fragment)) !== null) {
    const raw = match[0];
    const tag = match[1];
    if (raw.startsWith('</')) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (raw.endsWith('/>')) {
      if (depth === 0) names.push(tag);
      continue;
    }
    if (depth === 0) names.push(tag);
    depth++;
  }
  return names;
}

/**
 * MusicXML direction-type is xs:choice — one branch only (e.g. metronome OR words, not both).
 * Sibelius: "Element words is not defined in this scope" when words follows metronome in same block.
 */
export function findDirectionTypeScopeViolations(xml: string): string[] {
  const violations: string[] = [];
  const re = /<direction-type[^>]*>([\s\S]*?)<\/direction-type>/g;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = re.exec(xml)) !== null) {
    index++;
    const topLevel = topLevelElementNamesInXmlFragment(match[1] ?? '');
    const branches = new Set<string>();
    const branchChildren: string[] = [];
    for (const name of topLevel) {
      const branch = DIRECTION_TYPE_CHILD_BRANCH[name];
      if (branch == null) continue;
      branchChildren.push(name);
      branches.add(branch);
    }
    if (branches.size > 1) {
      violations.push(
        `direction-type[${index}]: mixed direction-type children (${branchChildren.join(', ')}) — only one MusicXML choice branch allowed per <direction-type>`
      );
    }
  }
  return violations;
}

/**
 * MusicXML 3.1 partwise DTD / Sibelius: &lt;offset&gt; is not valid inside &lt;harmony&gt;.
 * Mid-measure chord changes must use document-order placement (rests/notes before the harmony block).
 */
export function findHarmonyChildOffsetViolations(xml: string): string[] {
  const violations: string[] = [];
  const re = /<harmony[^>]*>([\s\S]*?)<\/harmony>/g;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = re.exec(xml)) !== null) {
    index++;
    if (/<offset[\s>]/.test(match[1] ?? '')) {
      violations.push(
        `harmony[${index}]: <offset> inside <harmony> is out of scope for MusicXML 3.1 partwise export`
      );
    }
  }
  return violations;
}

/** Structural schema checks for exported MusicXML (root + Sibelius-safe harmony + parse gate). */
export function validateMusicXmlSchema(xml: string): SchemaValidationResult {
  const errors: string[] = [];
  if (!xml.includes('<score-partwise')) {
    errors.push('Missing score-partwise root');
  }
  errors.push(...findHarmonyChildOffsetViolations(xml));
  errors.push(...findDirectionTypeScopeViolations(xml));
  const parsed = validateMusicXml(xml);
  if (!parsed.valid) {
    errors.push(...parsed.errors);
  }
  return { valid: errors.length === 0, errors };
}

/** Stub: re-parse validation. */
export function reParseMusicXml(xml: string): ReParseResult {
  const hasMeasure = xml.includes('<measure');
  return {
    valid: hasScorePartwise(xml),
    measureCount: hasMeasure ? 1 : 0,
    errors: hasScorePartwise(xml) ? [] : ['Parse failed'],
  };
}

function hasScorePartwise(x: string): boolean {
  return x.includes('<score-partwise');
}
