/**
 * Ensures `globalThis.DOMParser` exists for {@link parseMusicXml} in Node / Vitest / ts-node.
 * Browser builds already have DOMParser; `@xmldom/xmldom` supplies it elsewhere.
 */

/// <reference lib="dom" />

import { DOMParser as XmldomDOMParser } from '@xmldom/xmldom';

export function ensureMusicXmlDomParserPolyfill(): void {
  const g = globalThis as unknown as { DOMParser?: typeof DOMParser };
  if (typeof g.DOMParser !== 'undefined') return;
  g.DOMParser = XmldomDOMParser as unknown as typeof DOMParser;
}
