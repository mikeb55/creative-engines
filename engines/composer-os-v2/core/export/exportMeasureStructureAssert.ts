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

  const partBlocks = xml.match(/<part id="[^"]+"[\s\S]*?<\/part>/g) ?? [];
  for (const pb of partBlocks) {
    const measures = [...pb.matchAll(/<measure\b[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/measure>/g)];
    for (const m of measures) {
      const measureNum = m[1]!;
      const inner = m[2] ?? '';
      const harmonyIdx = inner.indexOf('<harmony');
      const noteIdx = inner.indexOf('<note');
      if (harmonyIdx >= 0 && noteIdx >= 0 && harmonyIdx > noteIdx) {
        errors.push(`part measure ${measureNum}: <harmony> must precede first <note>`);
      }
      const backupIdx = inner.indexOf('<backup>');
      if (backupIdx >= 0) {
        if (noteIdx < 0) {
          errors.push(`part measure ${measureNum}: <backup> with no <note> before it`);
        } else if (backupIdx < noteIdx) {
          errors.push(`part measure ${measureNum}: <backup> before first <note>`);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`MusicXML export measure structure: ${errors.join('; ')}`);
  }
}
