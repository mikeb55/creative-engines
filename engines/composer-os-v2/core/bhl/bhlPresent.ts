/**
 * BHL presentation layer.
 * Moves printed text so MuseScore 4 can place it above the staff.
 * Notes, rests, bass, metre, tempo, and harmony symbols stay as they are.
 */

function decodeXml(value: string): string {
  return value
    .replace(/&#10;/g, '\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function promoteWorkTitle(xml: string): string {
  const work = /<work-title>([\s\S]*?)<\/work-title>/.exec(xml);
  if (!work) return xml;
  const title = work[1].trim();
  if (!title) return xml;
  const movement = /<movement-title>([\s\S]*?)<\/movement-title>/.exec(xml);
  if (!movement) {
    return xml.replace(
      /<\/work>\s*/,
      (close) => `${close}<movement-title>${title}</movement-title>\n  `,
    );
  }
  if (movement[1].trim() === decodeXml(title).trim() || movement[1].trim() === title) return xml;
  return xml.replace(/<movement-title>[\s\S]*?<\/movement-title>/, `<movement-title>${title}</movement-title>`);
}

function isTextDirection(block: string): boolean {
  if (/<metronome\b|<sound\b|<dynamics\b|<wedge\b|<pedal\b|<octave-shift\b/.test(block)) return false;
  return /<(?:words|rehearsal)\b/.test(block);
}

function textsOf(block: string): string[] {
  const lines: string[] = [];
  const pattern = /<(words|rehearsal)\b[^>]*>([\s\S]*?)<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(block))) {
    const text = decodeXml(match[2] ?? '').replace(/\s+/g, ' ').trim();
    if (text) lines.push(text);
  }
  return lines;
}

function stripPosition(tag: string): string {
  return tag.replace(/\sdefault-[xy]="[^"]*"/g, '');
}

/** Long staff lines run off the right edge of a system. Break them for print only. */
function wrapLine(line: string, width = 28): string[] {
  if (line.length <= width) return [line];
  const parts: string[] = [];
  let rest = line;
  while (rest.length > width) {
    let cut = rest.lastIndexOf(' ', width);
    if (cut < 8) cut = width;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

function stripHarmonyOffsets(measure: string): string {
  return measure.replace(/<harmony\b[^>]*>/g, (tag) => stripPosition(tag));
}

function stackMeasure(measure: string): string {
  const matches = [...measure.matchAll(/<direction\b[^>]*>[\s\S]*?<\/direction>/g)];
  const textMatches = matches.filter((match) => isTextDirection(match[0]));
  const lines = textMatches.flatMap((match) => textsOf(match[0])).flatMap((line) => wrapLine(line));
  if (!lines.length) return stripHarmonyOffsets(measure);
  if (lines.length === 1 && lines[0]!.length <= 28) {
    let next = measure;
    for (const match of textMatches) {
      next = next.replace(match[0], stripPosition(match[0]));
    }
    return stripHarmonyOffsets(next);
  }
  const stacked = `<direction placement="above"><direction-type><words font-size="10">${lines.map(escapeXml).join('&#10;')}</words></direction-type></direction>`;
  let cursor = 0;
  let built = '';
  let inserted = false;
  for (const match of textMatches) {
    const start = match.index ?? 0;
    built += measure.slice(cursor, start);
    if (!inserted) {
      built += stacked;
      inserted = true;
    }
    cursor = start + match[0].length;
  }
  built += measure.slice(cursor);
  return stripHarmonyOffsets(built);
}

/** Printed heading and staff-text stack. Musical events are not rewritten. */
export function presentBhlScore(xml: string): string {
  const titled = promoteWorkTitle(xml);
  return titled.replace(/<measure\b[^>]*>[\s\S]*?<\/measure>/g, (measure) => stackMeasure(measure));
}
