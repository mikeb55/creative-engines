/**
 * Performance Composer — Composer OS provenance stamp.
 * Written into each generated MusicXML (<identification> and a footer credit) and returned to the UI.
 * The build fields come from the running desktop app's build stamp; this module never invents them.
 */

import { elementChildren, parseScoreDocument, serializeNode } from './pcScore';

export interface PcProvenance {
  app: 'Composer OS';
  module: 'Performance Composer';
  operation: 'RESPOND' | 'TRITONE PAIR';
  engine: string;
  alternative: string;
  runId: string;
  clickedAt: string;
  /** Git commit the running app was built from (desktop build stamp), or 'not available'. */
  buildCommit: string;
  /** SHA-256 of the running desktop IPC bundle. */
  ipcBundleSha256: string;
  /** '1' when the build stamp matches the running bundle. */
  stampMatchesLiveIpc: string;
  sourceFile: string;
  sourceSha256: string;
  bars: string;
  seed: number;
}

const SOFTWARE_PREFIX = 'Composer OS · Performance Composer';
const FIELD_PREFIX = 'composer-os-';

export function provenanceLine(p: PcProvenance): string {
  return `${SOFTWARE_PREFIX} ${p.operation} ${p.alternative} · build ${p.buildCommit.slice(0, 12)} · ${p.clickedAt} · run ${p.runId}`;
}

function el(doc: Document, name: string, text?: string, attrs?: Record<string, string>): Element {
  const e = doc.createElement(name);
  if (text !== undefined) e.appendChild(doc.createTextNode(text));
  for (const [k, v] of Object.entries(attrs ?? {})) e.setAttribute(k, v);
  return e;
}

/** Add the stamp. Only header metadata changes; no part, measure or note is touched. */
export function stampProvenance(xml: string, p: PcProvenance): string {
  const doc = parseScoreDocument(xml);
  const root = doc.documentElement;
  const kids = elementChildren(root);
  let ident = elementChildren(root, 'identification')[0];
  if (!ident) {
    ident = el(doc, 'identification');
    const after = kids.find((k) => ['defaults', 'credit', 'part-list'].includes(k.nodeName)) ?? null;
    root.insertBefore(ident, after);
  }
  let encoding = elementChildren(ident, 'encoding')[0];
  if (!encoding) {
    encoding = el(doc, 'encoding');
    const after = elementChildren(ident).find((k) => ['source', 'relation', 'miscellaneous'].includes(k.nodeName)) ?? null;
    ident.insertBefore(encoding, after);
  }
  encoding.insertBefore(el(doc, 'software', provenanceLine(p)), elementChildren(encoding)[0] ?? null);
  let misc = elementChildren(ident, 'miscellaneous')[0];
  if (!misc) {
    misc = el(doc, 'miscellaneous');
    ident.appendChild(misc);
  }
  for (const [key, value] of Object.entries(p)) {
    misc.appendChild(el(doc, 'miscellaneous-field', String(value), { name: `${FIELD_PREFIX}${key}` }));
  }
  const hasRights = elementChildren(root, 'credit').some((c) => elementChildren(c, 'credit-type').some((t) => t.textContent?.trim() === 'rights'));
  if (!hasRights) {
    const credit = el(doc, 'credit', undefined, { page: '1' });
    credit.appendChild(el(doc, 'credit-type', 'rights'));
    credit.appendChild(el(doc, 'credit-words', provenanceLine(p), { 'font-size': '7', justify: 'center', halign: 'center', valign: 'bottom' }));
    const partList = elementChildren(root, 'part-list')[0] ?? null;
    root.insertBefore(credit, partList);
  }
  return serializeNode(doc);
}

/** Read the stamp back from a file (for the UI and tests). */
export function readProvenance(xml: string): Partial<PcProvenance> | null {
  const doc = parseScoreDocument(xml);
  const out: Record<string, string> = {};
  for (const f of doc.getElementsByTagName('miscellaneous-field')) {
    const name = f.getAttribute('name') ?? '';
    if (name.startsWith(FIELD_PREFIX)) out[name.slice(FIELD_PREFIX.length)] = f.textContent ?? '';
  }
  return Object.keys(out).length ? (out as unknown as Partial<PcProvenance>) : null;
}

/** Remove the stamp exactly, so lock verification compares against the untouched source header. */
export function stripProvenance(xml: string): string {
  const doc = parseScoreDocument(xml);
  const root = doc.documentElement;
  for (const s of [...doc.getElementsByTagName('software')]) {
    if (s.textContent?.startsWith(SOFTWARE_PREFIX)) s.parentNode?.removeChild(s);
  }
  for (const f of [...doc.getElementsByTagName('miscellaneous-field')]) {
    if ((f.getAttribute('name') ?? '').startsWith(FIELD_PREFIX)) f.parentNode?.removeChild(f);
  }
  for (const c of elementChildren(root, 'credit')) {
    if (elementChildren(c, 'credit-words').some((w) => w.textContent?.startsWith(SOFTWARE_PREFIX))) root.removeChild(c);
  }
  const ident = elementChildren(root, 'identification')[0];
  if (ident) {
    for (const name of ['encoding', 'miscellaneous']) {
      const e = elementChildren(ident, name)[0];
      if (e && elementChildren(e).length === 0 && !(e.textContent ?? '').trim()) ident.removeChild(e);
    }
    if (elementChildren(ident).length === 0 && !(ident.textContent ?? '').trim()) root.removeChild(ident);
  }
  return serializeNode(doc);
}
