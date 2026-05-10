/**
 * Replace a contiguous bar span in partwise MusicXML with measures from a fragment score
 * (same part ids / export layout). Used by section-scoped regeneration.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { validateMusicXml } from '../../../../src/utils/musicXmlValidator';

function parseMeasureNumber(measure: any): number {
  const raw = measure.getAttribute?.('number') ?? '1';
  const n = parseInt(String(raw).replace(/\D/g, '') || '1', 10);
  return Number.isNaN(n) ? 1 : n;
}

function collectMeasureElements(partEl: any): any[] {
  const out: any[] = [];
  const children = partEl.childNodes ?? [];
  for (let i = 0; i < children.length; i++) {
    const n = children.item(i);
    if (n?.nodeType === 1 && (n as any).tagName === 'measure') out.push(n);
  }
  return out;
}

function serializeDoc(doc: any): string {
  const ser = new XMLSerializer();
  let s = ser.serializeToString(doc);
  if (!s.trimStart().startsWith('<?xml')) {
    s = `<?xml version="1.0" encoding="UTF-8"?>\n${s}`;
  }
  return s;
}

/**
 * For each `<part>`, remove measures with `number` in `[startBar, endBar]` and insert clones
 * from `fragmentXml` (measures numbered 1..span in export order). Renumbers inserted measures
 * to `startBar..endBar`.
 */
export function splicePartwiseMusicXmlMeasures(
  baseXml: string,
  fragmentXml: string,
  startBar: number,
  endBar: number
): { ok: true; xml: string } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!baseXml.includes('</score-partwise>') || !fragmentXml.includes('</score-partwise>')) {
    return { ok: false, errors: ['expected score-partwise MusicXML'] };
  }
  const span = endBar - startBar + 1;
  if (span < 1 || startBar < 1) {
    return { ok: false, errors: ['invalid bar range'] };
  }

  const parser = new DOMParser();
  const baseDoc = parser.parseFromString(baseXml, 'application/xml');
  const fragDoc = parser.parseFromString(fragmentXml, 'application/xml');
  const baseRoot = baseDoc.documentElement;
  const fragRoot = fragDoc.documentElement;
  if (!baseRoot || baseRoot.tagName === 'parsererror') {
    return { ok: false, errors: ['base XML parse failed'] };
  }
  if (!fragRoot || fragRoot.tagName === 'parsererror') {
    return { ok: false, errors: ['fragment XML parse failed'] };
  }

  const baseParts = [...baseDoc.getElementsByTagName('part')];
  const fragParts = [...fragDoc.getElementsByTagName('part')];

  const fragById = new Map<string, any>();
  for (const p of fragParts) {
    const id = p.getAttribute?.('id') ?? '';
    if (id) fragById.set(id, p);
  }

  for (const basePart of baseParts) {
    const pid = basePart.getAttribute?.('id') ?? '';
    const fragPart = fragById.get(pid);
    if (!fragPart) {
      errors.push(`fragment missing part id "${pid}"`);
      continue;
    }

    const fragMeasures = collectMeasureElements(fragPart);
    if (fragMeasures.length !== span) {
      errors.push(`part ${pid}: fragment has ${fragMeasures.length} measures, need ${span}`);
      continue;
    }

    const baseMeasures = collectMeasureElements(basePart);
    const left = baseMeasures.filter((m) => parseMeasureNumber(m) < startBar);
    const right = baseMeasures.filter((m) => parseMeasureNumber(m) > endBar);

    for (const m of [...baseMeasures]) {
      m.parentNode?.removeChild(m);
    }

    for (const m of left) {
      basePart.appendChild(m);
    }
    for (let i = 0; i < span; i++) {
      const imported = baseDoc.importNode(fragMeasures[i], true) as any;
      imported.setAttribute('number', String(startBar + i));
      basePart.appendChild(imported);
    }
    for (const m of right) {
      basePart.appendChild(m);
    }

    if (collectMeasureElements(basePart).length !== left.length + span + right.length) {
      errors.push(`part ${pid}: unexpected measure count after splice`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const xml = serializeDoc(baseDoc);
  const v = validateMusicXml(xml);
  if (!v.valid) {
    return { ok: false, errors: v.errors };
  }
  return { ok: true, xml };
}
