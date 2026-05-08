/**
 * MusicXML structural gate (stringsync parse + Composer OS sibling-order rules).
 * Used in development after export; optional CI-style assertions via tests.
 */

import { MusicXML } from '@stringsync/musicxml';
import { xml2js } from 'xml-js';

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

/** xml-js element shape (compact: false). */
type XmlJsEl = {
  type?: string;
  name?: string;
  elements?: XmlJsEl[];
  text?: string | { text?: string }[];
};

/** Sibelius-facing canonical sibling order for unpitched notes (MusicXML 3.1 subset). */
const UNPITCHED_NOTE_SIBLING_RANK: Record<string, number> = {
  chord: 5,
  tied: 8,
  tie: 9,
  unpitched: 15,
  duration: 20,
  instrument: 30,
  voice: 40,
  type: 50,
  stem: 60,
  notehead: 65,
  staff: 70,
};

function elementChildren(el: XmlJsEl): XmlJsEl[] {
  return (el.elements ?? []).filter((c) => c.type === 'element') as XmlJsEl[];
}

function textContent(el: XmlJsEl): string {
  const parts: string[] = [];
  for (const c of el.elements ?? []) {
    if (c.type === 'text' && typeof c.text === 'string') parts.push(c.text);
  }
  return parts.join('').trim();
}

function collectNotes(nodes: XmlJsEl[] | undefined, acc: XmlJsEl[]): void {
  if (!nodes) return;
  for (const n of nodes) {
    if (n.type !== 'element') continue;
    if (n.name === 'note') acc.push(n);
    collectNotes(n.elements, acc);
  }
}

function unpitchedDisplayOctaveViolations(unpitched: XmlJsEl): string[] {
  const out: string[] = [];
  for (const ch of elementChildren(unpitched)) {
    if (ch.name !== 'display-octave') continue;
    const raw = textContent(ch);
    const v = parseInt(raw, 10);
    if (raw === '6' || v === 6) {
      out.push(
        `<unpitched> displayOctave ${raw} rejected for Composer OS percussion staff (expected displayOctave 2–5)`
      );
    }
  }
  return out;
}

function validateUnpitchedNoteSiblingOrder(noteEl: XmlJsEl, noteIndex: number): string[] {
  const kids = elementChildren(noteEl);
  const names = kids.map((k) => k.name ?? '');
  if (!names.includes('unpitched')) return [];

  const rankedTags = names.filter((n) => n in UNPITCHED_NOTE_SIBLING_RANK);
  const ranks = rankedTags.map((n) => UNPITCHED_NOTE_SIBLING_RANK[n]!);
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i]! <= ranks[i - 1]!) {
      return [
        `note[${noteIndex}] element order: MusicXML 3.1 sibling sequence violated (${rankedTags.join(
          ' → '
        )}); expected unpitched → duration → instrument → voice → type → stem → notehead → staff`,
      ];
    }
  }
  return [];
}

/**
 * Validates MusicXML string: stringsync document parse + Composer OS ordering / percussion rules.
 * Returns structured errors (paths/context in message strings); callers decide logging.
 */
export function validateMusicXml(xmlString: string): ValidationResult {
  const errors: string[] = [];

  try {
    MusicXML.parse(xmlString);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`parse: ${msg}`);
  }

  let roots: XmlJsEl[];
  try {
    const doc = xml2js(xmlString, {
      compact: false,
      trim: true,
      ignoreDeclaration: true,
      ignoreInstruction: true,
    }) as { elements?: XmlJsEl[] };
    roots = doc.elements ?? [];
  } catch (e) {
    errors.push(`xml2js: ${e instanceof Error ? e.message : String(e)}`);
    return finalize(errors);
  }

  const notes: XmlJsEl[] = [];
  collectNotes(roots, notes);

  notes.forEach((noteEl, idx) => {
    const n = idx + 1;
    errors.push(...validateUnpitchedNoteSiblingOrder(noteEl, n));

    for (const ch of elementChildren(noteEl)) {
      if (ch.name !== 'unpitched') continue;
      errors.push(...unpitchedDisplayOctaveViolations(ch));
    }
  });

  return finalize(errors);
}

function finalize(errors: string[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}
