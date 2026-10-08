/**
 * Guitar-only projection of an existing chord-melody file.
 * The guitar part is copied as text. The bass staff is removed. The source file is not written.
 */

function partBlocks(xml: string, tag: 'score-part' | 'part'): Array<{ id: string; xml: string }> {
  const pattern =
    tag === 'part'
      ? /<part id="([^"]+)"[^>]*>([\s\S]*?)<\/part>/g
      : /<score-part\b([^>]*)>([\s\S]*?)<\/score-part>/g;
  const blocks: Array<{ id: string; xml: string }> = [];
  for (const match of xml.matchAll(pattern)) {
    const id = tag === 'part' ? (match[1] ?? '') : (/id="([^"]+)"/.exec(match[1] ?? '')?.[1] ?? '');
    blocks.push({ id, xml: match[0] });
  }
  return blocks;
}

export function guitarOnlyChordMelody(xml: string, title: string): string {
  const scoreParts = partBlocks(xml, 'score-part');
  const bass = scoreParts.find((part) => /<part-name>[^<]*bass[^<]*<\/part-name>/i.test(part.xml));
  if (!bass) throw new Error('no bass staff to omit');
  const guitar = scoreParts.find((part) => part !== bass);
  if (!guitar) throw new Error('no guitar staff to keep');
  const parts = partBlocks(xml, 'part');
  const guitarPart = parts.find((part) => part.id === guitar.id);
  const bassPart = parts.find((part) => part.id === bass.id);
  if (!guitarPart || !bassPart) throw new Error('guitar or bass part body is missing');
  let out = xml.replace(bass.xml, '').replace(bassPart.xml, '');
  if (!out.includes(guitarPart.xml)) throw new Error('guitar part changed while omitting the bass staff');
  const safeTitle = title.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char] ?? char);
  out = out.replace(/<work-title>[^<]*<\/work-title>/, `<work-title>${safeTitle}</work-title>`);
  if (!out.includes(guitarPart.xml)) throw new Error('guitar part changed while setting the title');
  if (partBlocks(out, 'score-part').some((part) => /bass/i.test(part.xml))) throw new Error('bass staff remains');
  return out;
}
