# Wyble MusicXML Import (V1)

Parses MusicXML files into chord progressions for the Jimmy Wyble Engine.

## V1 Supported Input

- MusicXML with **explicit chord symbols** (`<harmony>` or frame chord elements)
- **Linear form only** — no repeats, D.S., D.C., coda
- **4/4 time** only
- One harmony stream
- Lead-sheet style preferred

## V1 Unsupported

- No chord symbols
- Repeat / coda / D.S. / D.C.
- First/second ending logic
- Odd meters (3/4, 6/8, etc.)
- Chord inference from notes
- Multi-stream ambiguous harmony

## Usage

```ts
import { parseMusicXMLToProgression } from './parseMusicXMLToProgression';

const result = parseMusicXMLToProgression(xmlString);
if (result.success) {
  const { progression, totalBars } = result;
  // progression: [{ chord: 'Dm7', bars: 2 }, { chord: 'G7', bars: 2 }, ...]
}
```

## Output Format

Progression matches internal Wyble format: `{ chord: string, bars: number }[]`
