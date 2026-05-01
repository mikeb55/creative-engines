import React from 'react';

/**
 * In-app user guide — plain English, aligned with `docs/USER_GUIDE.md` and
 * `engines/composer-os-v2/app-api/releaseMetadata.ts` (not engine internals).
 */
export function UserGuide() {
  const codeStyle: React.CSSProperties = {
    fontFamily: 'ui-monospace, monospace',
    fontSize: '0.85rem',
    background: 'var(--surface, #1a1a1e)',
    padding: '0.35rem 0.5rem',
    borderRadius: 4,
    border: '1px solid var(--border)',
    display: 'inline-block',
    marginTop: '0.25rem',
    wordBreak: 'break-all',
  };
  const section: React.CSSProperties = { marginBottom: '1.5rem' };
  const h2: React.CSSProperties = { fontSize: '1.1rem', margin: '0 0 0.5rem' };
  const ul: React.CSSProperties = { margin: '0.25rem 0 0', paddingLeft: '1.25rem' };
  const p: React.CSSProperties = { margin: '0.35rem 0', lineHeight: 1.5, color: 'var(--text-muted)' };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <h2 style={{ marginTop: 0 }}>How to use Composer OS</h2>
      <p style={{ ...p, color: 'var(--text-muted)' }}>
        Short guide to what this app does today and how to run it. For the same content in more detail,
        see the repo file <code style={codeStyle}>docs/USER_GUIDE.md</code>.
      </p>

      <section style={section}>
        <h3 style={h2}>1) What Composer OS is</h3>
        <p style={p}>
          Composer OS is a desktop-friendly app that generates jazz and contemporary instrumental scores from
          your settings — mostly as <strong>MusicXML</strong> files you can open in MuseScore, Dorico, Sibelius,
          or similar. You pick a <strong>mode</strong> (preset), set tempo, harmony, and other options, then
          press <strong>Generate</strong>. Files are saved to a <strong>Composer OS library folder</strong> on
          your computer (see below).
        </p>
      </section>

      <section style={section}>
        <h3 style={h2}>2) What you can do right now</h3>
        <ul style={ul}>
          <li>
            <strong>Generate</strong> — eight modes: Guitar–Bass Duo, Duo (Single-Line), Wyble Etude, ECM Chamber,
            Song Mode, Big Band, String Quartet, Riff Generator.
          </li>
          <li>
            <strong>Presets</strong> — read names and short descriptions for each mode.
          </li>
          <li>
            <strong>Outputs</strong> — list recent files and open the library folder (or a file’s folder).
          </li>
          <li>
            <strong>Slonimsky Etudes</strong> — standalone study tab: pattern family, chords, key, generate short
            MusicXML etudes (see <strong>What&apos;s new — May 2026</strong> below).
          </li>
          <li>
            <strong>Composer Engines</strong> — three extra generators (Wayne Shorter, Thelonious Monk, Charlie
            Parker). In the browser, “Open in folder” may not work; use the desktop app for that.
          </li>
          <li>
            <strong>Diagnostics</strong> — connection, output directory, optional system check.
          </li>
        </ul>
      </section>

      <section style={section}>
        <h3 style={h2}>3) How to run the app locally</h3>
        <p style={p}>From the <strong>repository root</strong>:</p>
        <pre style={{ ...codeStyle, display: 'block', whiteSpace: 'pre-wrap' }}>
          cd apps/composer-os-app{'\n'}
          npm install{'\n'}
          npm run dev
        </pre>
        <ul style={ul}>
          <li>
            The <strong>web UI</strong> opens at <strong>http://localhost:5173</strong> (Vite).
          </li>
          <li>
            The <strong>API</strong> runs on <strong>http://localhost:3001</strong>. The UI talks to it through
            Vite’s proxy. If you see brief “proxy error” lines when the page first loads, wait a second — the API
            may still be starting.
          </li>
          <li>
            <strong>Production build:</strong> from repo root,{' '}
            <code style={codeStyle}>npm run build --prefix apps/composer-os-app</code> writes static files to{' '}
            <code style={codeStyle}>apps/composer-os-app/dist</code>. The API can serve that folder when present.
          </li>
        </ul>
      </section>

      <section style={section}>
        <h3 style={h2}>4) How to generate music</h3>
        <ol style={{ ...ul, listStyle: 'decimal' }}>
          <li>Open the <strong>Generate</strong> tab.</li>
          <li>
            Choose a <strong>mode</strong> from the dropdown. Read the “About this mode” card — it says what the
            mode produces (usually MusicXML).
          </li>
          <li>
            Set <strong>tempo (BPM)</strong>, <strong>bars</strong>, <strong>key / tonal centre</strong> where
            shown, and <strong>chords</strong> if the mode needs them (Wyble Etude <em>requires</em> chords; others
            may use built-in harmony if you leave chords empty).
          </li>
          <li>
            Click <strong>Generate</strong>. When it succeeds, the receipt shows where the file was written and
            validation notes.
          </li>
          <li>
            Use <strong>Open library folder</strong> (or <strong>Outputs</strong>) to find files on disk. There is
            no separate “download” button — files are already on your machine.
          </li>
        </ol>
        <p style={p}>
          <strong>Modes in the UI:</strong> Guitar–Bass Duo; Guitar–Bass Duo (Single-Line); Wyble Etude; ECM
          Chamber (Metheny vs Schneider); Song Mode; Big Band; String Quartet; Riff Generator. Big Band and String
          Quartet can fall back to <strong>planning JSON</strong> if full score export fails — the receipt tells you
          which you got.
        </p>
        <p style={{ ...p, marginTop: '0.75rem' }}>
          <strong>Song Mode — grouped dropdowns:</strong> <strong>Songwriter</strong> is grouped into{' '}
          <strong>Shipped (full slice)</strong>, <strong>Ready to build</strong>, and <strong>In library</strong>.
          <strong> Arranger</strong> is grouped into <strong>Big band core (research-backed)</strong> and{' '}
          <strong>Charts & studio voices</strong>. Under <strong>Arranger</strong> and <strong>Era</strong>, a short
          line explains that together they <strong>nudge style pairing</strong> and era-aware harmony colour in
          planning — hints only; they do not switch Big Band or String Quartet scoring rules by themselves.
        </p>
      </section>

      <section style={section}>
        <h3 style={h2}>5) How exports work</h3>
        <ul style={ul}>
          <li>
            <strong>Where files go:</strong> by default under your <strong>Documents</strong> folder, in{' '}
            <strong>Mike Composer Files</strong>, then a subfolder per mode (e.g. <code style={codeStyle}>
              Guitar-Bass Duos
            </code>
            , <code style={codeStyle}>Riffs</code>, <code style={codeStyle}>Song Mode</code>, etc.). You can
            override the root with the environment variable <code style={codeStyle}>COMPOSER_OS_OUTPUT_DIR</code>{' '}
            (advanced).
          </li>
          <li>
            <strong>Format:</strong> successful runs usually produce <strong>.musicxml</strong>. Open that file in
            MuseScore, Dorico, Sibelius, or another notation app — use <strong>File → Open</strong> and pick the
            file from your Composer OS folder.
          </li>
          <li>
            <strong>Manifests:</strong> extra metadata may sit in an <code style={codeStyle}>_meta</code> subfolder
            next to your MusicXML — you normally do not need to open those by hand.
          </li>
        </ul>
      </section>

      <section style={section}>
        <h3 style={h2}>6) Wyble ON/OFF examples (developer script)</h3>
        <p style={p}>
          This is <strong>not</strong> a button in the app. It is a <strong>command-line export</strong> for
          developers who want to compare two orchestra layouts for <strong>string quartet</strong> and{' '}
          <strong>big band</strong>: <strong>ON</strong> uses the default Wyble voice layout; <strong>OFF</strong>{' '}
          turns off that layout for an A/B test. It does <strong>not</strong> apply to the Guitar–Bass Duo screen.
        </p>
        <p style={p}>From the repo, run (engine package):</p>
        <pre style={{ ...codeStyle, display: 'block', whiteSpace: 'pre-wrap' }}>
          cd engines/composer-os-v2{'\n'}
          npm run export:wyble-examples
        </pre>
        <p style={p}>
          Optional flags: <code style={codeStyle}>--family quartet|bigband|all</code>,{' '}
          <code style={codeStyle}>--seed 12345</code>,{' '}
          <code style={codeStyle}>--out &quot;C:\\path\\to\\folder&quot;</code>.
        </p>
        <p style={p}>
          <strong>Default output folder</strong> (if you do not pass <code style={codeStyle}>--out</code>):{' '}
          <code style={codeStyle}>
            C:\Users\mike\Documents\Mike Composer Files\wyble-test
          </code>{' '}
          — change it with <code style={codeStyle}>--out</code> on your machine.
        </p>
        <p style={p}>
          <strong>Files written:</strong> for each family, two MusicXML files such as{' '}
          <code style={codeStyle}>quartet_wyble_ON_seed…</code> and <code style={codeStyle}>
            quartet_wyble_OFF_seed…
          </code>{' '}
          (and big-band names with <code style={codeStyle}>bigband_</code>).
        </p>
      </section>

      <section style={section}>
        <h3 style={h2}>What&apos;s new — May 2026</h3>
        <p style={p}>
          <strong>Slonimsky Etudes tab:</strong> Open <strong>Slonimsky Etudes</strong> from the nav bar for a{' '}
          <strong>standalone practice tool</strong> — pick a pattern family and pattern, type your chord
          progression, choose key and tempo, then generate a short etude as MusicXML. It does{' '}
          <strong>not</strong> replace Song Mode or other Generate modes; it saves files to your library like other
          runs. Use <strong>Open in folder</strong> after a successful generate to locate the file.
        </p>
        <p style={p}>
          <strong>Big Band and String Quartet — MusicXML lead sheets:</strong> You can attach a lead-sheet MusicXML
          file when arranging. The app can read chord symbols from your file and steer the arrangement&apos;s harmony.
          Choose <strong>free harmony</strong> (engine picks harmony), <strong>lock harmony</strong> (follow your
          chords bar for bar), or <strong>blend harmony</strong> (mix engine and imported chords using the blend
          control). The receipt tells you which mode ran and how many bars followed your import.
        </p>
      </section>

      <section style={section}>
        <h3 style={h2}>7) Current limitations</h3>
        <ul style={ul}>
          <li>
            <strong>No separate Help URL in the address bar</strong> — this screen is a tab inside the app, not a
            routed page.
          </li>
          <li>
            <strong>Composer Engines “Open in folder”</strong> needs the desktop shell; in a plain browser it may
            not work.
          </li>
          <li>
            <strong>Big Band / String Quartet</strong> may return planning JSON instead of MusicXML if export
            fails — check the receipt.
          </li>
          <li>
            The old <strong>Style Stack</strong> page exists in the codebase but is <strong>not linked</strong> in
            the main navigation.
          </li>
        </ul>
      </section>
    </div>
  );
}
