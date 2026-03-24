/**
 * Guitar–Bass Duo: exported bass part must read as acoustic/upright double bass, not generic or vocal.
 */

import {
  GUITAR_BASS_DUO_BASS_INSTRUMENT_SOUND,
  GUITAR_BASS_DUO_BASS_PART_NAME,
} from '../instrument-profiles/guitarBassDuoExportNames';

export interface BassIdentityResult {
  valid: boolean;
  errors: string[];
}

export function validateGuitarBassDuoBassIdentityInMusicXml(xml: string): BassIdentityResult {
  const errors: string[] = [];
  const bassPart = xml.match(/<score-part id="bass">[\s\S]*?<\/score-part>/);
  if (!bassPart) {
    return { valid: false, errors: ['Missing bass score-part'] };
  }
  const block = bassPart[0];
  if (!block.includes(`<part-name>${GUITAR_BASS_DUO_BASS_PART_NAME}</part-name>`)) {
    errors.push(`Bass part-name must be "${GUITAR_BASS_DUO_BASS_PART_NAME}"`);
  }
  if (!block.includes('<midi-program>33</midi-program>')) {
    errors.push('Bass midi-program must be 33 (GM Acoustic Bass)');
  }
  if (!block.includes(`<instrument-sound>${GUITAR_BASS_DUO_BASS_INSTRUMENT_SOUND}</instrument-sound>`)) {
    errors.push(`Bass instrument-sound must be ${GUITAR_BASS_DUO_BASS_INSTRUMENT_SOUND}`);
  }
  if (/<instrument-name>[^<]*(choir|vocal|voice\s|singer)[^<]*<\/instrument-name>/i.test(block)) {
    errors.push('Bass instrument-name must not suggest vocal/choir');
  }
  return { valid: errors.length === 0, errors };
}
