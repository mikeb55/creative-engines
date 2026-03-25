/**
 * MusicXML reference parser.
 */

import { parseMusicXmlReference } from '../core/reference-import/musicXmlReferenceParser';

const SAMPLE_XML = `<?xml version="1.0"?>
<score-partwise version="2.1">
  <part-list><score-part id="P1"><part-name>Test</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <harmony>
        <root><root-step>C</root-step></root>
        <kind>major</kind>
      </harmony>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
    </measure>
    <measure number="2">
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>4</duration>
        <voice>1</voice>
      </note>
    </measure>
  </part>
</score-partwise>`;

export function runMusicXmlReferenceParserTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const r = parseMusicXmlReference(SAMPLE_XML);
  out.push({
    ok: r.ok && !!r.piece && r.piece.totalBars === 2 && r.piece.noteSamples.length >= 1,
    name: 'parses minimal MusicXML and extracts notes',
  });

  const bad = parseMusicXmlReference('<not-xml');
  out.push({
    ok: !bad.ok,
    name: 'negative: malformed input fails',
  });

  const tw = parseMusicXmlReference(SAMPLE_XML.replace('score-partwise', 'score-timewise'));
  out.push({
    ok: !tw.ok,
    name: 'negative: timewise not supported',
  });

  return out;
}
