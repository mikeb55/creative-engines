/**
 * General-purpose melody pitch-class extraction for reharm preview (from exp3 probe guitarBarPitches + dominantMelodyPc).
 * Reads one lead part from MusicXML — no bar-specific or vault heuristics.
 */

export type ReharmMelodyPcsExtraction =
  | {
      ok: true;
      melodyPcs: (number | null)[];
      partLabel: string;
      barsWithNotes: number;
      barsEmpty: number;
    }
  | { ok: false; reason: string };

const STEP_TO_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function firstChildText(parent: Element | null, localName: string): string | undefined {
  if (!parent) return undefined;
  for (let i = 0; i < parent.children.length; i++) {
    const c = parent.children[i]!;
    if (c.localName === localName) return c.textContent?.trim();
  }
  return undefined;
}

function parseIntMaybe(s: string | undefined): number | undefined {
  if (s === undefined || s === '') return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

export function normPitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

/** Most frequent pitch class in bar (exp3 dominantMelodyPc). */
export function dominantPitchClassFromPitches(pitches: readonly number[]): number | null {
  if (!pitches.length) return null;
  const counts = new Map<number, number>();
  for (const p of pitches) {
    const pc = normPitchClass(p);
    counts.set(pc, (counts.get(pc) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestN = -1;
  for (const [pc, n] of counts) {
    if (n > bestN) {
      bestN = n;
      best = pc;
    }
  }
  return best;
}

function beatsPerBarFromTimeSig(timeSig: string): number {
  const slash = /^(\d+)\s*\/\s*(\d+)/.exec(timeSig.trim());
  if (slash) return Math.max(1, parseInt(slash[1]!, 10));
  const lead = /^(\d+)/.exec(timeSig.trim());
  if (lead) return Math.max(1, parseInt(lead[1]!, 10));
  return 4;
}

function pitchElementToMidi(pitchEl: Element): number | null {
  const stepRaw = firstChildText(pitchEl, 'step');
  const octaveRaw = firstChildText(pitchEl, 'octave');
  if (!stepRaw || octaveRaw === undefined) return null;
  const step = stepRaw[0]!.toUpperCase();
  const base = STEP_TO_PC[step];
  if (base === undefined) return null;
  const alterVal = firstChildText(pitchEl, 'alter');
  const alter = alterVal !== undefined && alterVal !== '' ? parseFloat(alterVal) : 0;
  const octave = parseInt(octaveRaw, 10);
  if (!Number.isFinite(octave)) return null;
  const pc = ((base + alter) % 12 + 12) % 12;
  return (octave + 1) * 12 + pc;
}

function parseAttributes(attributesEl: Element, state: { divisions: number; beatsPerBar: number }): void {
  const divs = parseIntMaybe(firstChildText(attributesEl, 'divisions'));
  if (divs !== undefined && divs > 0) state.divisions = divs;
  const timeEl = Array.from(attributesEl.children).find((c) => c.localName === 'time');
  if (timeEl) {
    const beatsT = firstChildText(timeEl, 'beats');
    const beats = beatsT !== undefined ? parseInt(beatsT, 10) : NaN;
    if (Number.isFinite(beats) && beats > 0) state.beatsPerBar = beats;
  }
}

function measureChildrenSorted(partEl: Element): Element[] {
  const measures = Array.from(partEl.children).filter((c) => c.localName === 'measure');
  return measures.sort((a, b) => {
    const na = parseInt(a.getAttribute('number') ?? '0', 10);
    const nb = parseInt(b.getAttribute('number') ?? '0', 10);
    return na - nb;
  });
}

type PartMeta = { id: string; label: string };

function partMetaFromDoc(doc: Document): PartMeta[] {
  const out: PartMeta[] = [];
  const root = doc.documentElement;
  if (!root) return out;
  for (let i = 0; i < root.children.length; i++) {
    const c = root.children[i]!;
    if (c.localName !== 'part-list') continue;
    for (let j = 0; j < c.children.length; j++) {
      const sp = c.children[j]!;
      if (sp.localName !== 'score-part') continue;
      const id = sp.getAttribute('id');
      if (!id) continue;
      let label = id;
      for (let k = 0; k < sp.children.length; k++) {
        const ch = sp.children[k]!;
        if (ch.localName === 'part-name' || ch.localName === 'instrument-name') {
          const t = ch.textContent?.trim();
          if (t) label = t;
        }
      }
      out.push({ id, label });
    }
  }
  return out;
}

function allPartElements(doc: Document): Element[] {
  const root = doc.documentElement;
  if (!root) return [];
  return Array.from(root.children).filter((c) => c.localName === 'part');
}

function inferScoreMeterSeed(firstPartEl: Element | null, timeSig: string): {
  divisions: number;
  beatsPerBar: number;
} {
  const seed = { divisions: 1, beatsPerBar: beatsPerBarFromTimeSig(timeSig) };
  if (!firstPartEl) return seed;
  let measureIdx = 0;
  for (const measureEl of measureChildrenSorted(firstPartEl)) {
    measureIdx += 1;
    if (measureIdx > 12) break;
    for (let i = 0; i < measureEl.children.length; i++) {
      const child = measureEl.children[i]!;
      if (child.localName === 'attributes') parseAttributes(child, seed);
    }
  }
  return seed;
}

function pitchesByBarFromPart(partEl: Element, meterSeed: { divisions: number; beatsPerBar: number }): Map<number, number[]> {
  const state = { divisions: meterSeed.divisions, beatsPerBar: meterSeed.beatsPerBar };
  const byBar = new Map<number, number[]>();

  for (const measureEl of measureChildrenSorted(partEl)) {
    const barIndex = Math.max(1, parseInt(measureEl.getAttribute('number') ?? '1', 10) || 1);
    let cursorDiv = 0;
    let lastPrimaryDur = 0;
    const barPitches: number[] = byBar.get(barIndex) ?? [];

    for (let i = 0; i < measureEl.children.length; i++) {
      const child = measureEl.children[i]!;
      const tag = child.localName;
      if (tag === 'attributes') {
        parseAttributes(child, state);
        continue;
      }
      if (tag === 'backup') {
        const d = parseIntMaybe(firstChildText(child, 'duration'));
        if (d !== undefined && d > 0) cursorDiv -= d;
        continue;
      }
      if (tag === 'forward') {
        const d = parseIntMaybe(firstChildText(child, 'duration'));
        if (d !== undefined && d > 0) cursorDiv += d;
        continue;
      }
      if (tag !== 'note') continue;

      const durRaw = firstChildText(child, 'duration');
      const durationDivs = durRaw !== undefined ? parseInt(durRaw, 10) : NaN;
      const hasChord = Array.from(child.children).some((c) => c.localName === 'chord');
      const isRest =
        Array.from(child.children).some((c) => c.localName === 'rest') ||
        child.getElementsByTagName('rest').length > 0;

      if (!Number.isFinite(durationDivs) || durationDivs <= 0) continue;
      if (isRest) {
        if (!hasChord) cursorDiv += durationDivs;
        lastPrimaryDur = 0;
        continue;
      }

      const pitchEl = Array.from(child.children).find((c) => c.localName === 'pitch');
      if (!pitchEl) {
        if (!hasChord) cursorDiv += durationDivs;
        lastPrimaryDur = hasChord ? lastPrimaryDur : durationDivs;
        continue;
      }

      const midi = pitchElementToMidi(pitchEl);
      if (midi === null || midi <= 0) {
        if (!hasChord) cursorDiv += durationDivs;
        lastPrimaryDur = hasChord ? lastPrimaryDur : durationDivs;
        continue;
      }

      barPitches.push(midi);
      if (!hasChord) {
        cursorDiv += durationDivs;
        lastPrimaryDur = durationDivs;
      } else {
        lastPrimaryDur = durationDivs;
      }
    }

    if (barPitches.length) byBar.set(barIndex, barPitches);
  }

  return byBar;
}

function isExcludedCompPartLabel(label: string): boolean {
  const l = label.toLowerCase();
  return (
    /bass|drum|perc|kick|snare|hat|cymbal|piano|comp|harmony|chord|unpitched/.test(l) &&
    !/guitar/.test(l)
  );
}

function isPreferredGuitarLeadLabel(label: string): boolean {
  const l = label.toLowerCase();
  return /electric\s*guitar|elec\.?\s*gtr|clean_electric|guitar|gtr/.test(l) && !/bass/.test(l);
}

function selectMelodyLeadPart(
  partEls: Element[],
  partMeta: PartMeta[]
): { partEl: Element; label: string } | null {
  if (!partEls.length) return null;

  const metaById = new Map(partMeta.map((m) => [m.id, m.label]));

  for (let i = 0; i < partEls.length; i++) {
    const partEl = partEls[i]!;
    const id = partEl.getAttribute('id') ?? `P${i + 1}`;
    const label = metaById.get(id) ?? id;
    if (isPreferredGuitarLeadLabel(label)) return { partEl, label };
  }

  let best: { partEl: Element; label: string; noteCount: number } | null = null;
  for (let i = 0; i < partEls.length; i++) {
    const partEl = partEls[i]!;
    const id = partEl.getAttribute('id') ?? `P${i + 1}`;
    const label = metaById.get(id) ?? id;
    if (isExcludedCompPartLabel(label)) continue;
    const noteCount = partEl.getElementsByTagName('note').length;
    if (!best || noteCount > best.noteCount) best = { partEl, label, noteCount };
  }

  if (best && best.noteCount > 0) return { partEl: best.partEl, label: best.label };
  return null;
}

export function extractMelodyPcsForBarRange(
  musicXml: string,
  startBar: number,
  endBar: number,
  timeSig = '4/4'
): ReharmMelodyPcsExtraction {
  const xml = musicXml.trim();
  if (!xml) return { ok: false, reason: 'No MusicXML available from last generate.' };

  const sb = Math.min(startBar, endBar);
  const eb = Math.max(startBar, endBar);
  if (sb < 1 || eb < sb) return { ok: false, reason: 'Invalid bar range for melody extraction.' };

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return { ok: false, reason: 'MusicXML parse failed.' };
  }

  const partEls = allPartElements(doc);
  if (!partEls.length) return { ok: false, reason: 'No parts in MusicXML.' };

  const selected = selectMelodyLeadPart(partEls, partMetaFromDoc(doc));
  if (!selected) return { ok: false, reason: 'No lead melody part found in MusicXML.' };

  const meterSeed = inferScoreMeterSeed(partEls[0] ?? null, timeSig);
  const byBar = pitchesByBarFromPart(selected.partEl, meterSeed);

  const melodyPcs: (number | null)[] = [];
  let barsWithNotes = 0;
  let barsEmpty = 0;

  for (let b = sb; b <= eb; b++) {
    const pitches = byBar.get(b) ?? [];
    if (!pitches.length) {
      melodyPcs.push(null);
      barsEmpty += 1;
    } else {
      melodyPcs.push(dominantPitchClassFromPitches(pitches));
      barsWithNotes += 1;
    }
  }

  if (barsWithNotes === 0) {
    return {
      ok: false,
      reason: `Lead part "${selected.label}" has no notes in bars ${sb}–${eb}.`,
    };
  }

  return {
    ok: true,
    melodyPcs,
    partLabel: selected.label,
    barsWithNotes,
    barsEmpty,
  };
}