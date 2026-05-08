/**
 * Phase 8 — Append minimal improv part to MusicXML partwise score (additive export).
 */

/** Insert score-part + part before closing tags (best-effort for Composer OS exporter output). */
export function appendImprovPartToPartwiseXml(baseXml: string, divisions = 8): string {
  if (!baseXml.includes('</score-partwise>')) return baseXml;
  const partId = 'P_IMPROV_PHASE8';
  const partListEntry = `<score-part id="${partId}"><part-name>Improv</part-name></score-part>`;
  let xml = baseXml;
  if (xml.includes('</part-list>')) {
    xml = xml.replace('</part-list>', `${partListEntry}\n</part-list>`);
  }
  const dur = divisions * 4;
  const partBody = `<part id="${partId}">
<measure number="1">
<attributes>
<divisions>${divisions}</divisions>
</attributes>
<note><pitch><step>C</step><octave>5</octave></pitch><duration>${dur}</duration><voice>1</voice><type>whole</type></note>
</measure>
</part>`;
  xml = xml.replace('</score-partwise>', `${partBody}\n</score-partwise>`);
  return xml;
}
