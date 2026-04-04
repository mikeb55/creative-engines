/**
 * Post-export structural checks for Sibelius-strict MusicXML 3.1 measure ordering.
 * Does not validate full schema — only sibling order / obvious scope errors we can detect cheaply.
 */

/**
 * Throws if exported XML violates measure-level rules for single-staff multi-voice + harmony.
 * - &lt;backup&gt; must not appear inside a &lt;note&gt; element.
 * - Beat-1 &lt;harmony&gt; (when present) must appear before the first &lt;note&gt; in that measure.
 * - &lt;backup&gt; (when present) must appear after the first &lt;note&gt; (voice-1 layer started).
 */
export function assertSibeliusExportMeasureStructure(xml: string): void {
  const errors: string[] = [];

  if (/<note\b[^>]*>(?:(?!<\/note>).)*<backup\b/.test(xml)) {
    errors.push('<backup> appears inside <note> content (invalid scope)');
  }

  const partBlocks = xml.match(/<part id="([^"]+)"[\s\S]*?<\/part>/g) ?? [];
  for (const pb of partBlocks) {
    const idMatch = /^<part id="([^"]+)"/.exec(pb);
    const partId = idMatch?.[1] ?? '';
    const measures = [...pb.matchAll(/<measure\b[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g)];
    const anyVoice2InPart = measures.some((row) => /<voice>2<\/voice>/.test(row[2] ?? ''));
    for (const m of measures) {
      const measureNum = m[1]!;
      const inner = m[2] ?? '';
      const harmonyIdx = inner.indexOf('<harmony');
      const noteIdx = inner.indexOf('<note');
      if (harmonyIdx >= 0 && noteIdx >= 0 && harmonyIdx > noteIdx) {
        errors.push(`part ${partId} measure ${measureNum}: <harmony> must precede first <note>`);
      }
      const backupIdx = inner.indexOf('<backup>');
      if (backupIdx >= 0) {
        if (noteIdx < 0) {
          errors.push(`part ${partId} measure ${measureNum}: <backup> with no <note> before it`);
        } else if (backupIdx < noteIdx) {
          errors.push(`part ${partId} measure ${measureNum}: <backup> before first <note>`);
        }
      }
      if (anyVoice2InPart) {
        const backupCount = (inner.match(/<backup>/g) ?? []).length;
        if (backupCount !== 1) {
          errors.push(
            `part ${partId} measure ${measureNum}: dual-voice part requires exactly one <backup> per measure (found ${backupCount})`
          );
        }
        const firstV2 = inner.indexOf('<voice>2</voice>');
        if (firstV2 >= 0 && backupIdx >= 0 && firstV2 < backupIdx) {
          errors.push(`part ${partId} measure ${measureNum}: <backup> must precede first voice-2 <note>`);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`MusicXML export measure structure: ${errors.join('; ')}`);
  }
}

/**
 * Sibelius DTD: within each &lt;note&gt;, &lt;staff&gt; must not precede &lt;type&gt; (rest path used to violate this).
 */
export function assertNoteXmlCanonicalChildOrder(xml: string): void {
  const errors: string[] = [];
  let noteIndex = 0;
  const noteRe = /<note\b[^>]*>([\s\S]*?)<\/note>/g;
  let m: RegExpExecArray | null;
  while ((m = noteRe.exec(xml)) !== null) {
    noteIndex += 1;
    const inner = m[1] ?? '';
    const typeIdx = inner.indexOf('<type');
    const staffIdx = inner.indexOf('<staff');
    if (typeIdx >= 0 && staffIdx >= 0 && staffIdx < typeIdx) {
      errors.push(`note #${noteIndex}: <staff> appears before <type> (invalid for Sibelius)`);
    }
  }
  if (errors.length > 0) {
    throw new Error(`MusicXML note child order: ${errors.join('; ')}`);
  }
}
