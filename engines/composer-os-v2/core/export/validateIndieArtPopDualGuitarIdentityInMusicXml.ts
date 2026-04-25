export interface IndieArtPopDualGuitarIdentityResult {
  valid: boolean;
  errors: string[];
}

/**
 * Indie Art Pop (Song Mode + separate tunings) export guard:
 * require two explicit electric guitar parts and disallow piano/upright-bass fallback labels.
 */
export function validateIndieArtPopDualGuitarIdentityInMusicXml(xml: string): IndieArtPopDualGuitarIdentityResult {
  const errors: string[] = [];
  const guitar1 = xml.match(/<score-part id="guitar">[\s\S]*?<\/score-part>/);
  const guitar2 = xml.match(/<score-part id="guitar_2">[\s\S]*?<\/score-part>/);
  if (!guitar1) errors.push('Missing Electric Guitar 1 score-part (`id="guitar"`).');
  if (!guitar2) errors.push('Missing Electric Guitar 2 score-part (`id="guitar_2"`).');
  if (guitar1 && !guitar1[0].includes('<part-name>Clean Electric Guitar</part-name>')) {
    errors.push('Guitar 1 part-name must be "Clean Electric Guitar".');
  }
  if (guitar2 && !guitar2[0].includes('<part-name>Electric Guitar 2</part-name>')) {
    errors.push('Guitar 2 part-name must be "Electric Guitar 2".');
  }
  const electricProgramCount = (xml.match(/<midi-program>28<\/midi-program>/g) ?? []).length;
  if (electricProgramCount < 2) {
    errors.push('Expected at least two electric guitar midi-program entries (28).');
  }
  if (/<part-name>Piano<\/part-name>/i.test(xml)) {
    errors.push('Indie Art Pop dual-guitar export must not label parts as Piano.');
  }
  if (/<part-name>Upright Bass<\/part-name>/i.test(xml)) {
    errors.push('Indie Art Pop dual-guitar export must not label parts as Upright Bass.');
  }
  return { valid: errors.length === 0, errors };
}
