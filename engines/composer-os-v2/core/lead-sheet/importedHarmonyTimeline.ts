export type ImportHarmonyModeMarker = 'root_based' | 'numeral_based' | 'unknown';

export interface ImportedHarmonyRoot {
  step?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  alter?: number;
  numeral?: string;
}

export interface ImportedHarmonyKind {
  value: string;
  text?: string;
  useSymbols?: boolean;
}

export interface ImportedHarmonyBass {
  step?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  alter?: number;
}

export type ImportedHarmonyDegreeType = 'add' | 'alter' | 'subtract' | 'unknown';

export interface ImportedHarmonyDegree {
  value?: number;
  alter?: number;
  type: ImportedHarmonyDegreeType;
}

export interface ImportedHarmonyTime {
  bar: number;
  beat: number;
  absoluteBeat?: number;
  offsetDivisions?: number;
  divisionsAtEvent?: number;
  eventIndexInBar: number;
}

export interface ImportedHarmonyEvent {
  time: ImportedHarmonyTime;
  sourceMarker: ImportHarmonyModeMarker;
  root?: ImportedHarmonyRoot;
  kind: ImportedHarmonyKind;
  bass?: ImportedHarmonyBass;
  degrees?: ImportedHarmonyDegree[];
  rawXml?: string;
}

export interface ImportedHarmonyTimeline {
  events: ImportedHarmonyEvent[];
}

function tagValue(xml: string, tagName: string): string | undefined {
  const m = xml.match(new RegExp(`<${tagName}[^>]*>([^<]+)</${tagName}>`, 'i'));
  return m?.[1]?.trim();
}

function parsePitchStep(value: string | undefined): ImportedHarmonyRoot['step'] | undefined {
  if (!value) return undefined;
  const up = value.trim().toUpperCase();
  if (up === 'A' || up === 'B' || up === 'C' || up === 'D' || up === 'E' || up === 'F' || up === 'G') return up;
  return undefined;
}

function parseIntMaybe(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseKind(harmonyXml: string): ImportedHarmonyKind | undefined {
  const value = tagValue(harmonyXml, 'kind');
  if (!value) return undefined;
  const text = harmonyXml.match(/<kind[^>]*text="([^"]+)"/i)?.[1]?.trim();
  const useSymbolsRaw = harmonyXml.match(/<kind[^>]*use-symbols="([^"]+)"/i)?.[1]?.trim().toLowerCase();
  const useSymbols = useSymbolsRaw === 'yes' ? true : useSymbolsRaw === 'no' ? false : undefined;
  return {
    value,
    ...(text ? { text } : {}),
    ...(useSymbols !== undefined ? { useSymbols } : {}),
  };
}

function parseRoot(harmonyXml: string): ImportedHarmonyRoot | undefined {
  const rootStep = parsePitchStep(tagValue(harmonyXml, 'root-step'));
  const rootAlter = parseIntMaybe(tagValue(harmonyXml, 'root-alter'));
  const numeral =
    tagValue(harmonyXml, 'function') ??
    tagValue(harmonyXml, 'numeral') ??
    tagValue(harmonyXml, 'numeral-root');
  if (!rootStep && rootAlter === undefined && !numeral) return undefined;
  return {
    ...(rootStep ? { step: rootStep } : {}),
    ...(rootAlter !== undefined ? { alter: rootAlter } : {}),
    ...(numeral ? { numeral } : {}),
  };
}

function parseBass(harmonyXml: string): ImportedHarmonyBass | undefined {
  const bassStep = parsePitchStep(tagValue(harmonyXml, 'bass-step'));
  const bassAlter = parseIntMaybe(tagValue(harmonyXml, 'bass-alter'));
  if (!bassStep && bassAlter === undefined) return undefined;
  return {
    ...(bassStep ? { step: bassStep } : {}),
    ...(bassAlter !== undefined ? { alter: bassAlter } : {}),
  };
}

function parseDegreeType(s: string | undefined): ImportedHarmonyDegreeType {
  if (!s) return 'unknown';
  const k = s.trim().toLowerCase();
  if (k === 'add' || k === 'alter' || k === 'subtract') return k;
  return 'unknown';
}

function parseDegrees(harmonyXml: string): ImportedHarmonyDegree[] | undefined {
  const blocks = harmonyXml.match(/<degree[^>]*>[\s\S]*?<\/degree>/gi) ?? [];
  const out: ImportedHarmonyDegree[] = [];
  for (const b of blocks) {
    const value = parseIntMaybe(tagValue(b, 'degree-value'));
    const alter = parseIntMaybe(tagValue(b, 'degree-alter'));
    const type = parseDegreeType(tagValue(b, 'degree-type'));
    out.push({
      ...(value !== undefined ? { value } : {}),
      ...(alter !== undefined ? { alter } : {}),
      type,
    });
  }
  return out.length > 0 ? out : undefined;
}

export interface ParseImportedHarmonyEventInput {
  harmonyXml: string;
  bar: number;
  divisions: number;
  beatsPerBar: number;
  eventIndexInBar: number;
}

export interface ParseImportedHarmonyEventResult {
  event?: ImportedHarmonyEvent;
  warnings: string[];
}

/**
 * Stage 1 storage-only parser for MusicXML `<harmony>` events.
 * It must not affect generation behavior; parse ambiguity only yields warnings.
 */
export function parseImportedHarmonyEvent(input: ParseImportedHarmonyEventInput): ParseImportedHarmonyEventResult {
  const warnings: string[] = [];
  const kind = parseKind(input.harmonyXml);
  if (!kind) {
    warnings.push(`Imported harmony at bar ${input.bar} missing required <kind>; skipped timeline event.`);
    return { warnings };
  }
  const root = parseRoot(input.harmonyXml);
  const bass = parseBass(input.harmonyXml);
  const degrees = parseDegrees(input.harmonyXml);
  const sourceMarker: ImportHarmonyModeMarker = root?.step
    ? 'root_based'
    : root?.numeral
      ? 'numeral_based'
      : 'unknown';
  const offsetDivisions = parseIntMaybe(tagValue(input.harmonyXml, 'offset')) ?? 0;
  const beat = Math.max(0, offsetDivisions / Math.max(1, input.divisions));
  const event: ImportedHarmonyEvent = {
    time: {
      bar: input.bar,
      beat,
      absoluteBeat:
        input.bar < 1
          ? beat
          : (input.bar - 1) * Math.max(1, input.beatsPerBar) + beat,
      offsetDivisions,
      divisionsAtEvent: input.divisions,
      eventIndexInBar: input.eventIndexInBar,
    },
    sourceMarker,
    ...(root ? { root } : {}),
    kind,
    ...(bass ? { bass } : {}),
    ...(degrees ? { degrees } : {}),
    rawXml: input.harmonyXml.trim(),
  };
  if (sourceMarker === 'unknown') {
    warnings.push(`Imported harmony at bar ${input.bar} has no root/numeral marker; stored with unknown source marker.`);
  }
  return { event, warnings };
}

export function sortImportedHarmonyTimeline(timeline: ImportedHarmonyTimeline): ImportedHarmonyTimeline {
  return {
    events: [...timeline.events].sort(
      (a, b) =>
        a.time.bar - b.time.bar ||
        a.time.beat - b.time.beat ||
        a.time.eventIndexInBar - b.time.eventIndexInBar
    ),
  };
}
