/** Desktop writes a file through IPC. Browser keeps the download link. */
export const HEXATONIC_WRITE_MUSICXML_CHANNEL = 'composer-os-api:hexatonic-write-musicxml';

export type HexatonicMusicXmlExportResult =
  | { mode: 'desktop'; fullPath: string }
  | { mode: 'browser'; filename: string };

export async function exportHexatonicMusicXml(args: {
  xml: string;
  label: string;
  fileName: string;
  invokeApi?: ((channel: string, payload?: unknown) => Promise<unknown>) | null;
  download: (filename: string, xml: string) => void;
}): Promise<HexatonicMusicXmlExportResult> {
  if (args.invokeApi) {
    const saved = (await args.invokeApi(HEXATONIC_WRITE_MUSICXML_CHANNEL, {
      xml: args.xml,
      label: args.label,
    })) as { ok?: boolean; fullPath?: string; error?: string };
    if (!saved?.ok || typeof saved.fullPath !== 'string' || !saved.fullPath) {
      throw new Error(saved?.error || 'Could not write MusicXML.');
    }
    return { mode: 'desktop', fullPath: saved.fullPath };
  }
  const safe = (args.fileName || 'hexatonic').replace(/\.musicxml$/i, '');
  const filename = `${safe}-${args.label}.musicxml`;
  args.download(filename, args.xml);
  return { mode: 'browser', filename };
}
