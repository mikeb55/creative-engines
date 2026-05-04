/**
 * Records iReal Pro navigation symbols `{` `}` `S` `Q` (see `ireal-reader` Parser)
 * and maps them to compact bar indices (same non-empty measure filter as `ireal-reader`).
 */

import type { ParsedRepeatMarker } from './parsedChart';

type Rule = {
  token: string | RegExp;
  op?: (match?: RegExpMatchArray) => void;
};

type RawRepeatMarker = { type: ParsedRepeatMarker['type']; measureIndexOriginal: number };

function runRepeatMarkersInstrumentedParse(raw: string): {
  rawMarkers: RawRepeatMarker[];
  keptIndices: number[];
} {
  let measures: (string | null)[][] = [];
  let startRepeatLocation: number | null = null;
  let lastChord: string | null = null;
  let endRepeatLocation: number | null = null;
  let timeSignature: string | null = null;
  let thirdEndingImminent = false;
  let dcAlFineImminent = false;
  let dcAlCodaImminent = false;
  let dsAlCodaImminent = false;
  let fineLocation: number | null = null;
  let codaLocation: number | null = null;
  let segnoLocation: number | null = null;

  const rawMarkers: RawRepeatMarker[] = [];

  function pushMarker(type: ParsedRepeatMarker['type'], measureIndexOriginal: number) {
    rawMarkers.push({ type, measureIndexOriginal });
  }

  function checkForRepeats(match?: RegExpMatchArray) {
    const body = match?.[1]?.toLowerCase() ?? '';
    if (body === 'd.c. al 3rd ending') thirdEndingImminent = true;
    if (body === 'd.c. al fine') dcAlFineImminent = true;
    if (body === 'd.c. al coda') dcAlCodaImminent = true;
    if (body === 'd.s. al coda') dsAlCodaImminent = true;
    if (body === 'fine') fineLocation = measures.length;
  }

  function setTimeSignature(match?: RegExpMatchArray) {
    if (match?.[1]) timeSignature = match[1];
  }

  function pushNull() {
    if (measures.length === 0) measures.push([]);
    measures[measures.length - 1]!.push(null);
  }

  function repeatLastMeasure() {
    measures[measures.length - 1] = [...measures[measures.length - 2]!];
  }

  function repeatLastMeasureAndAddNew() {
    measures[measures.length] = [...measures[measures.length - 1]!];
  }

  function repeatLastTwoMeasures() {
    measures[measures.length - 1] = [...measures[measures.length - 3]!];
    measures[measures.length] = [...measures[measures.length - 2]!];
  }

  function setSegnoLocation() {
    segnoLocation = measures.length - 1;
    if (measures.length > 0) {
      pushMarker('segno', measures.length - 1);
    }
  }

  function setCodaLocation() {
    codaLocation = measures.length;
    if (measures.length > 0) {
      pushMarker('coda', measures.length - 1);
    }
  }

  function setStartRepeatLocation() {
    createNewMeasure();
    startRepeatLocation = measures.length - 1;
    endRepeatLocation = null;
    pushMarker('start', startRepeatLocation);
  }

  function setEndRepeatLocation(match?: RegExpMatchArray) {
    const ending = parseInt(match?.[1] ?? '0', 10);
    if (ending === 1) {
      endRepeatLocation = measures.length - 1;
    }
  }

  function createNewMeasure() {
    if (measures.length === 0 || measures[measures.length - 1]!.length !== 0) {
      measures.push([]);
    }
  }

  function repeatEverythingToEndRepeatLocation() {
    if (measures.length > 0) {
      pushMarker('end', measures.length - 1);
    }
    if (!endRepeatLocation) {
      endRepeatLocation = measures.length;
    }
    measures.push(...measures.slice(startRepeatLocation!, endRepeatLocation!));
    createNewMeasure();
  }

  function repeatRemainingEndings() {
    if (thirdEndingImminent) {
      repeatEverythingToEndRepeatLocation();
      thirdEndingImminent = false;
    }
    if (dcAlFineImminent) {
      measures.push(...measures.slice(0, fineLocation!));
      dcAlFineImminent = false;
    }
    if (dcAlCodaImminent) {
      measures.push(...measures.slice(0, codaLocation!));
      dcAlCodaImminent = false;
    }
    if (dsAlCodaImminent) {
      measures.push(...measures.slice(segnoLocation!, codaLocation!));
      dsAlCodaImminent = false;
    }
  }

  function pushChordInMeasures(match?: RegExpMatchArray) {
    if (measures.length === 0) measures.push([]);
    if (!match?.[0]) return;

    let chord = match[0];
    if (chord.startsWith('W') && lastChord) {
      chord = chord.replace('W', lastChord);
    } else {
      lastChord = chord.split('/')[0]!;
    }
    measures[measures.length - 1]!.push(chord);
  }

  const rules: Rule[] = [
    { token: 'XyQ' },
    { token: /\*\w/ },
    { token: /<(.*?)>/, op: checkForRepeats },
    { token: /T(\d+)/, op: setTimeSignature },
    { token: 'x', op: repeatLastMeasure },
    { token: 'Kcl', op: repeatLastMeasureAndAddNew },
    { token: 'r|XyQ', op: repeatLastTwoMeasures },
    { token: /Y+/ },
    { token: 'n', op: pushNull },
    { token: 'p' },
    { token: 'U' },
    { token: 'S', op: setSegnoLocation },
    { token: 'Q', op: setCodaLocation },
    { token: '{', op: setStartRepeatLocation },
    { token: '}', op: repeatEverythingToEndRepeatLocation },
    { token: 'LZ|', op: createNewMeasure },
    { token: '|', op: createNewMeasure },
    { token: 'LZ', op: createNewMeasure },
    { token: '[', op: createNewMeasure },
    { token: ']', op: repeatRemainingEndings },
    { token: /N(\d)/, op: setEndRepeatLocation },
    { token: 'Z', op: repeatRemainingEndings },
    { token: /[A-GW]{1}[\+\-\^\dhob#suadlt]*(\/[A-G][#b]?)?/, op: pushChordInMeasures },
  ];

  function parse(inputString: string): void {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]!;
      const tok = rule.token;
      if (typeof tok === 'string' && inputString.startsWith(tok)) {
        rule.op?.();
        parse(inputString.substring(tok.length).trim());
        return;
      }
      if (tok instanceof RegExp) {
        const match = inputString.match(tok);
        if (match && match.index === 0) {
          rule.op?.(match);
          parse(inputString.substring(match[0]!.length).trim());
          return;
        }
      }
      if (i === rules.length - 1 && inputString.length > 1) {
        parse(inputString.substring(1));
        return;
      }
    }
  }

  parse(raw);

  const keptIndices: number[] = [];
  for (let i = 0; i < measures.length; i++) {
    if (measures[i]!.length !== 0) keptIndices.push(i);
  }

  return { rawMarkers, keptIndices };
}

/** Map repeat / segno / coda symbols to compact bar indices (non-empty bars only). */
export function buildRepeatMarkersFromUnscrambledMusic(unscrambled: string): ParsedRepeatMarker[] {
  const { rawMarkers, keptIndices } = runRepeatMarkersInstrumentedParse(unscrambled);
  const origToCompact = new Map<number, number>();
  keptIndices.forEach((origIdx, compactIdx) => origToCompact.set(origIdx, compactIdx));

  const out: ParsedRepeatMarker[] = [];
  for (const m of rawMarkers) {
    const barIndex = origToCompact.get(m.measureIndexOriginal);
    if (barIndex !== undefined) {
      out.push({ type: m.type, barIndex });
    }
  }
  return out;
}
