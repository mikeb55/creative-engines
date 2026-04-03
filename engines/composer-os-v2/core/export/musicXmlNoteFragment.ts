/**
 * Canonical MusicXML 3.1 partwise <note> serialization for Composer OS ScoreModel export.
 *
 * Child order matches the MusicXML "full-note" group: pitch|rest, duration, tie*,
 * then voice before type/dot, then notations (Sibelius DTD rejects voice after type).
 *
 * Do not emit <staff> on notes unless the part declares multiple staves — callers pass
 * staff only when multi-staff; single-line duo omits it.
 */

/** Rest note: rest → duration → voice → type (+ dots). */
export function noteXmlRestFragment(opts: {
  durationTicks: number;
  voice: number;
  typeAndDotsXml: string;
}): string {
  const { durationTicks, voice, typeAndDotsXml } = opts;
  return `        <note><rest/><duration>${durationTicks}</duration><voice>${voice}</voice>${typeAndDotsXml}</note>\n`;
}

/** Pitched note: pitch → duration → tie → voice → type (+ dots) → notations. */
export function noteXmlPitchedFragment(opts: {
  dynamicsAttr: string;
  pitchXml: string;
  durationTicks: number;
  tieXml: string;
  voice: number;
  typeAndDotsXml: string;
  notationsXml: string;
}): string {
  const { dynamicsAttr, pitchXml, durationTicks, tieXml, voice, typeAndDotsXml, notationsXml } = opts;
  return `        <note${dynamicsAttr}>${pitchXml}<duration>${durationTicks}</duration>${tieXml}<voice>${voice}</voice>${typeAndDotsXml}${notationsXml}</note>\n`;
}
