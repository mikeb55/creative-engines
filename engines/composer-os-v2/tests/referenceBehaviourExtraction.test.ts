/**
 * Behaviour extraction from reference pieces.
 */

import { extractReferenceBehaviour } from '../core/reference-import/extractReferenceBehaviour';
import { parseMidiReference } from '../core/reference-import/midiReferenceParser';
import { parseMusicXmlReference } from '../core/reference-import/musicXmlReferenceParser';
import { referencePieceFromCompositionContext } from '../core/reference-import/internalReferenceAdapter';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import type { StyleStack } from '../core/style-modules/styleModuleTypes';

const SAMPLE_XML = `<?xml version="1.0"?>
<score-partwise version="2.1">
  <part-list><score-part id="P1"><part-name>Test</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration>
        <voice>1</voice>
      </note>
    </measure>
  </part>
</score-partwise>`;

export function runReferenceBehaviourExtractionTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const parsed = parseMusicXmlReference(SAMPLE_XML);
  const profile = parsed.piece ? extractReferenceBehaviour(parsed.piece) : null;
  out.push({
    ok: !!profile && profile.formArc !== undefined && profile.densityBand !== undefined,
    name: 'extractReferenceBehaviour returns profile',
  });

  const stack: StyleStack = { primary: 'barry_harris', weights: { primary: 1 } };
  const gp = runGoldenPath(42_001, { presetId: 'guitar_bass_duo', styleStack: stack });
  const ref = referencePieceFromCompositionContext(gp.context);
  const p2 = extractReferenceBehaviour(ref);
  out.push({
    ok: p2.harmonicRhythmBars >= 0 && ref.sourceKind === 'composer_os_internal',
    name: 'internal adapter + extraction for golden path context',
  });

  const midiBytes = new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, 0x01, 0xe0, 0x4d, 0x54, 0x72, 0x6b, 0x00, 0x00,
    0x00, 0x0c, 0x00, 0x90, 0x3c, 0x40, 0x00, 0x90, 0x3c, 0x00, 0x00, 0xff, 0x2f, 0x00,
  ]);
  const midi = parseMidiReference(midiBytes);
  const mp = midi.piece ? extractReferenceBehaviour(midi.piece) : null;
  out.push({
    ok: midi.ok && !!mp && (midi.piece?.noteSamples.length ?? 0) >= 1,
    name: 'minimal MIDI parses and behaviour extracts',
  });

  return out;
}
