import {
  parseImportedHarmonyEvent,
  sortImportedHarmonyTimeline,
  type ImportedHarmonyTimeline,
} from '../core/lead-sheet/importedHarmonyTimeline';

function testParsesRootAndKind(): boolean {
  const xml = `<harmony><root><root-step>C</root-step><root-alter>1</root-alter></root><kind text="maj7">major-seventh</kind></harmony>`;
  const r = parseImportedHarmonyEvent({
    harmonyXml: xml,
    bar: 1,
    divisions: 4,
    beatsPerBar: 4,
    eventIndexInBar: 0,
  });
  return (
    !!r.event &&
    r.event.sourceMarker === 'root_based' &&
    r.event.root?.step === 'C' &&
    r.event.root?.alter === 1 &&
    r.event.kind.value === 'major-seventh' &&
    r.event.kind.text === 'maj7'
  );
}

function testParsesNumeralAndKind(): boolean {
  const xml = `<harmony><function>V</function><kind>dominant</kind></harmony>`;
  const r = parseImportedHarmonyEvent({
    harmonyXml: xml,
    bar: 2,
    divisions: 8,
    beatsPerBar: 4,
    eventIndexInBar: 0,
  });
  return !!r.event && r.event.sourceMarker === 'numeral_based' && r.event.root?.numeral === 'V';
}

function testParsesBassAndDegrees(): boolean {
  const xml = `<harmony><root><root-step>D</root-step></root><kind text="7">dominant</kind><bass><bass-step>F</bass-step><bass-alter>1</bass-alter></bass><degree><degree-value>9</degree-value><degree-alter>-1</degree-alter><degree-type>add</degree-type></degree></harmony>`;
  const r = parseImportedHarmonyEvent({
    harmonyXml: xml,
    bar: 3,
    divisions: 4,
    beatsPerBar: 4,
    eventIndexInBar: 0,
  });
  return (
    !!r.event &&
    r.event.bass?.step === 'F' &&
    r.event.bass?.alter === 1 &&
    (r.event.degrees?.length ?? 0) === 1 &&
    r.event.degrees?.[0]?.value === 9 &&
    r.event.degrees?.[0]?.alter === -1 &&
    r.event.degrees?.[0]?.type === 'add'
  );
}

function testOffsetOrderingDeterministic(): boolean {
  const t: ImportedHarmonyTimeline = {
    events: [
      {
        time: { bar: 1, beat: 2, eventIndexInBar: 1 },
        sourceMarker: 'unknown',
        kind: { value: 'major' },
      },
      {
        time: { bar: 1, beat: 1, eventIndexInBar: 0 },
        sourceMarker: 'unknown',
        kind: { value: 'major' },
      },
      {
        time: { bar: 1, beat: 2, eventIndexInBar: 0 },
        sourceMarker: 'unknown',
        kind: { value: 'major' },
      },
    ],
  };
  const s = sortImportedHarmonyTimeline(t);
  return (
    s.events[0]?.time.beat === 1 &&
    s.events[1]?.time.beat === 2 &&
    s.events[1]?.time.eventIndexInBar === 0 &&
    s.events[2]?.time.eventIndexInBar === 1
  );
}

function testBestEffortAmbiguousHandling(): boolean {
  const missingKind = `<harmony><root><root-step>C</root-step></root></harmony>`;
  const noRootNumeral = `<harmony><kind>major</kind></harmony>`;
  const a = parseImportedHarmonyEvent({
    harmonyXml: missingKind,
    bar: 4,
    divisions: 4,
    beatsPerBar: 4,
    eventIndexInBar: 0,
  });
  const b = parseImportedHarmonyEvent({
    harmonyXml: noRootNumeral,
    bar: 4,
    divisions: 4,
    beatsPerBar: 4,
    eventIndexInBar: 1,
  });
  return (
    !a.event &&
    a.warnings.some((w) => /missing required <kind>/i.test(w)) &&
    !!b.event &&
    b.event.sourceMarker === 'unknown' &&
    b.warnings.some((w) => /unknown source marker/i.test(w))
  );
}

export function runImportedHarmonyTimelineTests(): { ok: boolean; name: string }[] {
  return [
    { ok: testParsesRootAndKind(), name: 'imported harmony timeline: parses root + required kind' },
    { ok: testParsesNumeralAndKind(), name: 'imported harmony timeline: parses numeral-based harmony + kind' },
    { ok: testParsesBassAndDegrees(), name: 'imported harmony timeline: parses bass and degree modifiers' },
    { ok: testOffsetOrderingDeterministic(), name: 'imported harmony timeline: deterministic bar/beat/event ordering' },
    { ok: testBestEffortAmbiguousHandling(), name: 'imported harmony timeline: best-effort ambiguity handling with warnings' },
  ];
}

