/**
 * Canonical MusicXML 3.1 partwise <note> serialization for Composer OS ScoreModel export.
 *
 * Child order matches the MusicXML "full-note" group: pitch|rest, duration, tie*,
 * then voice before type/dot, then stem (multi-voice), then notations.
 * Sibelius DTD: voice before type; stem after type/dot (before notations).
 *
 * For multi-voice single-staff guitar, callers may pass staffXml (<staff>1</staff>) so Sibelius/GP8
 * bind each voice layer to the staff (omit when monophonic).
 *
 * Sibelius-safe: <type> must precede <staff> on every note; rest and pitched paths use the same ordering.
 */

/** Rest note: rest → duration → voice → type (+ dots) → staff? (must match pitched-note discipline). */
export function noteXmlRestFragment(opts: {
  durationTicks: number;
  voice: number;
  typeAndDotsXml: string;
  /** After type/dot: explicit staff for single-staff polyphony (never before <type>). */
  staffXml?: string;
}): string {
  const { durationTicks, voice, typeAndDotsXml, staffXml = '' } = opts;
  return `        <note><rest/><duration>${durationTicks}</duration><voice>${voice}</voice>${typeAndDotsXml}${staffXml}</note>\n`;
}

/** Pitched note: pitch → duration → tie → voice → type (+ dots) → stem? → staff? → notations. */
export function noteXmlPitchedFragment(opts: {
  dynamicsAttr: string;
  pitchXml: string;
  durationTicks: number;
  tieXml: string;
  voice: number;
  typeAndDotsXml: string;
  /** Multi-voice: stem element so Sibelius / Guitar Pro render separate voices on one staff. */
  stemXml?: string;
  /** After stem: explicit staff for single-staff polyphony (Sibelius / GP8). */
  staffXml?: string;
  notationsXml: string;
}): string {
  const {
    dynamicsAttr,
    pitchXml,
    durationTicks,
    tieXml,
    voice,
    typeAndDotsXml,
    stemXml = '',
    staffXml = '',
    notationsXml,
  } = opts;
  return `        <note${dynamicsAttr}>${pitchXml}<duration>${durationTicks}</duration>${tieXml}<voice>${voice}</voice>${typeAndDotsXml}${stemXml}${staffXml}${notationsXml}</note>\n`;
}
