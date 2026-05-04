/// <reference path="./ireal-reader.d.ts" />
/**
 * iReal Pro encodes time-signature changes as `T` + digit run (see `ireal-reader` Parser).
 * The stock reader only keeps the *last* `T` in `music.timeSignature`.
 * This module re-walks the **unscrambled** music stream to attach each bar’s active meter
 * (at its first chord or `n` / null slot) and build a sparse {@link ParsedChart} `barMeterMap`.
 */

import * as unscramble from 'ireal-reader/unscramble';
import type { ParsedChart, ParsedRepeatMarker } from './parsedChart';
import { parseIrealTimeSignatureDigits } from './irealProTimeSignature';

const musicPrefix = '1r34LbKcu7';

export function extractUnscrambledMusicFromIrealInput(normalizedInput: string): string | null {
  try {
    const protocolRegex = /.*?irealb:\/\/([^"]*)/i;
    const m = protocolRegex.exec(normalizedInput.trim());
    if (!m) return null;
    const percentDecoded = decodeURIComponent(m[1]!);
    const parts = percentDecoded.split('===');
    const firstSong = parts[0];
    if (!firstSong) return null;
    const songParts = firstSong.split(/=+/).filter((x: string) => x !== '');
    for (const p of songParts) {
      if (p.startsWith(musicPrefix)) {
        const rest = p.slice(musicPrefix.length);
        if (rest) return unscramble.ireal(rest);
      }
    }
  } catch {
    return null;
  }
  return null;
}

type MeterRule = {
  token: string | RegExp;
  op?: (match?: RegExpMatchArray) => void;
};

/** Mirror `ireal-reader/Parser.js` so bar indices match `music.measures` after `removeEmptyMeasures`. */
function runMeterInstrumentedParse(raw: string): { meterDigitAtFirstChord: (string | null)[] } {
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

  const meterDigitAtFirstChord: (string | null)[] = [];

  function ensureMeterSlot(idx: number) {
    while (meterDigitAtFirstChord.length <= idx) meterDigitAtFirstChord.push(null);
  }

  function recordFirstSlot(idx: number) {
    ensureMeterSlot(idx);
    if (meterDigitAtFirstChord[idx] == null) {
      meterDigitAtFirstChord[idx] = timeSignature;
    }
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
    const idx = measures.length - 1;
    measures[idx]!.push(null);
    if (measures[idx]!.length === 1) {
      recordFirstSlot(idx);
    }
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
  }

  function setCodaLocation() {
    codaLocation = measures.length;
  }

  function setStartRepeatLocation() {
    createNewMeasure();
    startRepeatLocation = measures.length - 1;
    endRepeatLocation = null;
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
    const idx = measures.length - 1;
    measures[idx]!.push(chord);
    if (measures[idx]!.length === 1) {
      recordFirstSlot(idx);
    }
  }

  const rules: MeterRule[] = [
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

  const compactDigits: (string | null)[] = [];
  for (const origIdx of keptIndices) {
    compactDigits.push(meterDigitAtFirstChord[origIdx] ?? null);
  }

  return { meterDigitAtFirstChord: compactDigits };
}

/**
 * Sparse map: bar index → meter when it **changes** vs previous bar (bar 0 vs chart global / 4/4).
 */
export function buildBarMeterMapFromUnscrambledMusic(
  unscrambled: string,
  chartGlobalTimeSig: ParsedChart['timeSignature']
): Record<number, { num: number; den: number }> {
  const { meterDigitAtFirstChord } = runMeterInstrumentedParse(unscrambled);
  const defaultMeter = chartGlobalTimeSig ?? { num: 4, den: 4 };

  const perBar: { num: number; den: number }[] = [];
  for (let i = 0; i < meterDigitAtFirstChord.length; i++) {
    const d = meterDigitAtFirstChord[i];
    let m: { num: number; den: number };
    if (d != null && d !== '') {
      const p = parseIrealTimeSignatureDigits(d);
      m = p ?? (i === 0 ? defaultMeter : perBar[i - 1]!);
    } else {
      m = i === 0 ? defaultMeter : perBar[i - 1]!;
    }
    perBar[i] = m;
  }

  const map: Record<number, { num: number; den: number }> = {};
  for (let i = 0; i < perBar.length; i++) {
    const prev = i === 0 ? defaultMeter : perBar[i - 1]!;
    const curr = perBar[i]!;
    if (curr.num !== prev.num || curr.den !== prev.den) {
      map[i] = curr;
    }
  }
  return map;
}

/**
 * Maps compact repeat / segno / coda markers (same bar indices as {@link ParsedChart.repeatMarkers},
 * derived from the unscrambled stream where `{` `}` `S` `Q` align with
 * `startRepeatLocation` / `endRepeatLocation` / `segnoLocation` / `codaLocation` in the instrumented parse)
 * onto {@link ParsedChart.repeats}.
 */
export function repeatsFieldFromParsedRepeatMarkers(
  markers: ParsedRepeatMarker[]
): { type: string; barIndex: number }[] {
  return markers.map((m) => ({ type: m.type, barIndex: m.barIndex }));
}
