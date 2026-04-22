/**
 * Generate page — mode-driven UI (no Style Stack / blend controls on main form).
 */
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { vi } from 'vitest';

vi.mock('../src/services/api', () => {
  const api = {
    getPresets: vi.fn().mockResolvedValue({
      presets: [{ id: 'song_mode', name: 'Song Mode', description: 'Song Mode', supported: true }],
    }),
    getStyleModules: vi.fn().mockResolvedValue({ modules: [] }),
    getOutputDirectory: vi.fn().mockResolvedValue({ path: 'C:/tmp', displayPath: 'C:/tmp' }),
    openOutputFolder: vi.fn().mockResolvedValue({ success: true }),
    generate: vi.fn(),
  };
  return { api, displayOutputPath: (r: { displayPath?: string; path: string }) => r.displayPath ?? r.path };
});

describe('HomeGenerate mode-driven UI', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/pages/HomeGenerate.tsx'), 'utf-8');

  async function renderHomeGenerate() {
    (globalThis as { window?: unknown }).window = { composerOsDesktop: undefined };
    const { HomeGenerate } = await import('../src/pages/HomeGenerate');
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(HomeGenerate, { onResult: () => undefined }));
    });
    return tree!;
  }

  function getGenerateButton(tree: ReturnType<typeof create>) {
    const generateButton = tree.root.findAllByType('button').find((b) => {
      const c = b.props.children;
      return (
        (typeof c === 'string' && c.includes('Generate')) ||
        (Array.isArray(c) && c.join('').includes('Generate'))
      );
    });
    expect(generateButton).toBeDefined();
    return generateButton!;
  }

  function getLeadSheetTextarea(tree: ReturnType<typeof create>) {
    const nodes = tree.root.findAllByType('textarea');
    const leadSheetNode = nodes.find(
      (n) => n.props.placeholder === 'Paste MusicXML here (LeadSheet, <score-partwise> root).'
    );
    expect(leadSheetNode).toBeDefined();
    return leadSheetNode!;
  }

  function getLeadSheetFileInput(tree: ReturnType<typeof create>) {
    const nodes = tree.root.findAllByType('input');
    const fileNode = nodes.find((n) => n.props.type === 'file');
    expect(fileNode).toBeDefined();
    return fileNode!;
  }

  function getClearLeadSheetButton(tree: ReturnType<typeof create>) {
    return tree.root.findAllByType('button').find((b) => b.props.children === 'Clear LeadSheet');
  }

  function getSongwriterSelect(tree: ReturnType<typeof create>) {
    const nodes = tree.root.findAllByType('select');
    const songwriterNode = nodes.find((n) => n.props.value === 'donald_fagen' || n.props.value === 'wayne_shorter');
    expect(songwriterNode).toBeDefined();
    return songwriterNode!;
  }

  it('does not import Style Blend or style module dropdowns (retired from Generate)', () => {
    expect(src).not.toContain('StyleBlendControls');
    expect(src).not.toContain('useStyleModules');
    expect(src).not.toContain('Style stack');
    expect(src).not.toContain('Style modules:');
  });

  it('uses fixed default score style stack constants for duo/ECM (not user-facing)', () => {
    expect(src).toContain('DEFAULT_SCORE_STYLE_STACK');
    expect(src).toContain('barry_harris');
  });

  it('does not expose numeric weight inputs (BPM/bars number fields are allowed)', () => {
    expect(src).not.toMatch(/Weights \(primary/);
  });

  it('has Try Another control', () => {
    expect(src).toMatch(/>[\s\n]*Try Another[\s\n]*</);
  });

  it('Try Another rolls variation and calls generate with override', () => {
    expect(src).toContain('setVariationId(next)');
    expect(src).toContain('void generate({ variationOverride: next })');
    expect(src).toMatch(/async \(opts\?: \{ seedOverride\?: number; variationOverride\?: string \}\)/);
    expect(src).toContain('opts?.variationOverride ?? variationId');
  });

  it('has optional title field', () => {
    expect(src).toContain('Title (optional)');
    expect(src).toMatch(/title:\s*scoreTitle\.trim/);
  });

  it('exposes chord progression field for Guitar–Bass Duo (custom or custom_locked when non-empty)', () => {
    expect(src).toContain('Chord progression (${songFormBars} bars)');
    expect(src).toContain('chordProgressionText');
    expect(src).toMatch(/harmonyMode:\s*'(custom_locked|custom)'/);
    expect(src).not.toMatch(/guitar_bass_duo[^\n]*harmonyMode:\s*'builtin'/);
  });

  it('does not show a Seed label in the UI', () => {
    expect(src).not.toMatch(/>\s*Seed\s*</i);
  });

  it('receipt does not surface manifest JSON paths', () => {
    expect(src).not.toMatch(/Manifest:/);
  });

  it('shows mode description card and result summary', () => {
    expect(src).toContain('About this mode');
    expect(src).toContain('Result summary');
    expect(src).toContain('Output type:');
    expect(src).toContain('getModeUx');
  });

  it('merges API presets into Generate mode list (same source as Presets tab)', () => {
    expect(src).toContain('mergePresetsWithRegistry');
    expect(src).toContain('APP_PRESET_REGISTRY');
    expect(src).toContain('../constants/composerOsPresetUi');
  });

  it('preflights custom duo harmony with shared engine parser', () => {
    expect(src).toContain('parseChordProgressionInput');
    expect(src).toContain('../utils/chordProgressionClient');
  });

  it('disables unsupported modes in the Mode dropdown like Presets (coming soon)', () => {
    expect(src).toContain('disabled={!m.supported}');
    expect(src).toMatch(/coming soon/);
  });

  it('uses creative control terminology', () => {
    expect(src).toContain('Creative control');
    expect(src).toContain('name="creativeLevel"');
    expect(src).not.toMatch(/>\s*Stability\s*</);
  });

  it('renders visible Variation toggle (label + Off/On) after nudge copy and passes variationEnabled to generate', () => {
    const nudge = 'How much the engine nudges the variation — not the form of the piece.';
    expect(src.indexOf(nudge)).toBeGreaterThan(-1);
    expect(src.indexOf("marginTop: '16px'")).toBeGreaterThan(src.indexOf(nudge));
    expect(src.indexOf("marginTop: '16px'")).toBeGreaterThan(src.indexOf("Surprise"));
    expect(src).toMatch(/<label[^>]*>\s*Variation\s*<\/label>/);
    expect(src).toContain("<option value=\"off\">Off</option>");
    expect(src).toContain("<option value=\"on\">On</option>");
    expect(src).toContain('variationEnabled: variationEnabled');
    expect(src).toContain('setVariationEnabled');
  });

  it('labels number of bars and ensemble size for Big Band', () => {
    expect(src).toContain('Number of bars');
    expect(src).toContain('Ensemble size');
  });

  it('shows experimental help when pairing flag is set', () => {
    expect(src).toContain('EXPERIMENTAL_HELP');
  });

  it('renders mode-specific blocks for ECM, Song, Big Band, String Quartet, Riff', () => {
    expect(src).toContain('ECM chamber mode');
    expect(src).toContain("presetId === 'song_mode'");
    expect(src).toContain("presetId === 'big_band'");
    expect(src).toContain("presetId === 'string_quartet'");
    expect(src).toContain("presetId === 'riff_generator'");
    expect(src).toContain('Riff options');
  });

  it('adds a Song Mode LeadSheet MusicXML input block with explicit Phase 1 route gating', () => {
    expect(src).toContain('LeadSheet MusicXML input (Phase 1)');
    expect(src).toContain('SONG_MODE_LEADSHEET_PHASE1_WRITERS');
    expect(src).toContain('LeadSheet MusicXML input is active for this route.');
    expect(src).toContain('LeadSheet MusicXML input is available only for Song Mode with Donald Fagen or Barry Harris.');
  });

  it('threads LeadSheet MusicXML into generate payload only for supported Song Mode writers', () => {
    expect(src).toContain('songModeLeadSheetMusicXml');
    expect(src).toContain('isSongModeLeadSheetPhase1Writer && songModeLeadSheetTrim.length > 0');
  });

  it('shows LeadSheet MusicXML input label and enabled textarea for Song Mode Donald Fagen', async () => {
    const tree = await renderHomeGenerate();
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('LeadSheet MusicXML input (Phase 1)');
    expect(text).toContain('LeadSheet MusicXML input is active for this route.');
    expect(text).not.toContain(
      'LeadSheet MusicXML input is available only for Song Mode with Donald Fagen or Barry Harris.'
    );
    const textarea = getLeadSheetTextarea(tree);
    expect(textarea.props.disabled).toBe(false);
  });

  it('shows file input for LeadSheet with .musicxml/.xml accept on supported route', async () => {
    const tree = await renderHomeGenerate();
    const fileInput = getLeadSheetFileInput(tree);
    expect(fileInput.props.accept).toContain('.musicxml');
    expect(fileInput.props.accept).toContain('.xml');
    expect(fileInput.props.disabled).toBe(false);
  });

  it('shows No file selected when nothing has been chosen', async () => {
    const tree = await renderHomeGenerate();
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('No file selected');
  });

  it('shows file name after selecting a LeadSheet file', async () => {
    const tree = await renderHomeGenerate();
    const fileInput = getLeadSheetFileInput(tree);
    const fakeFile = {
      name: 'my-song.musicxml',
      text: () => Promise.resolve('<score-partwise version="4.0"></score-partwise>'),
    };
    await act(async () => {
      fileInput.props.onChange({ target: { files: [fakeFile] } });
      await Promise.resolve();
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('Loaded file: my-song.musicxml');
  });

  it('clear button resets LeadSheet text and file name', async () => {
    const tree = await renderHomeGenerate();
    const fileInput = getLeadSheetFileInput(tree);
    const fakeFile = {
      name: 'my-song.musicxml',
      text: () => Promise.resolve('not xml'),
    };
    await act(async () => {
      fileInput.props.onChange({ target: { files: [fakeFile] } });
      await Promise.resolve();
    });
    let text = JSON.stringify(tree.toJSON());
    expect(text).toContain('Loaded file: my-song.musicxml');
    expect(text).toContain('LeadSheet MusicXML must include a <score-partwise> root element.');
    const clearButton = getClearLeadSheetButton(tree);
    expect(clearButton).toBeDefined();
    await act(async () => {
      clearButton!.props.onClick();
      await Promise.resolve();
    });
    text = JSON.stringify(tree.toJSON());
    expect(getLeadSheetTextarea(tree).props.value).toBe('');
    expect(text).toContain('No file selected');
    expect(text).not.toContain('LeadSheet MusicXML must include a <score-partwise> root element.');
  });

  it('for unsupported songwriter keeps LeadSheet controls disabled and shows route note', async () => {
    const tree = await renderHomeGenerate();
    const songwriterSelect = getSongwriterSelect(tree);
    await act(async () => {
      songwriterSelect.props.onChange({ target: { value: 'wayne_shorter' } });
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('LeadSheet MusicXML input is available only for Song Mode with Donald Fagen or Barry Harris.');
    expect(getLeadSheetTextarea(tree).props.disabled).toBe(true);
    expect(getLeadSheetFileInput(tree).props.disabled).toBe(true);
    expect(getClearLeadSheetButton(tree)).toBeUndefined();
  });

  it('receipt shows file source and file name for LeadSheet-loaded run', async () => {
    const { api } = await import('../src/services/api');
    vi.mocked(api.generate).mockResolvedValueOnce({
      success: true,
      filename: 'composer_os_song_mode_leadsheet_file_source.musicxml',
      filepath: 'C:/tmp/composer_os_song_mode_leadsheet_file_source.musicxml',
      requestEcho: { primarySongwriterStyle: 'donald_fagen' },
      runManifest: {
        presetId: 'song_mode',
        songModeLeadSheetInputApplied: true,
        songModeLeadSheetAnchorStartApplied: true,
      },
      validation: {
        integrityPassed: true,
        behaviourGatesPassed: true,
        mxValidationPassed: true,
        strictBarMathPassed: true,
        exportRoundTripPassed: true,
        instrumentMetadataPassed: true,
        readiness: { release: 10, mx: 10, shareable: true },
        errors: [],
      },
    } as Record<string, unknown>);
    const tree = await renderHomeGenerate();
    const fileInput = getLeadSheetFileInput(tree);
    const fakeFile = {
      name: 'something.musicxml',
      text: () => Promise.resolve('<score-partwise version="4.0"></score-partwise>'),
    };
    await act(async () => {
      fileInput.props.onChange({ target: { files: [fakeFile] } });
      await Promise.resolve();
    });
    const generateButton = getGenerateButton(tree);
    await act(async () => {
      generateButton.props.onClick();
      await Promise.resolve();
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('"Input source: ","File"');
    expect(text).toContain('"LeadSheet file: ","something.musicxml"');
  });

  it('receipt shows paste source with no file-name line for pasted LeadSheet run', async () => {
    const { api } = await import('../src/services/api');
    vi.mocked(api.generate).mockResolvedValueOnce({
      success: true,
      filename: 'composer_os_song_mode_leadsheet_paste_source.musicxml',
      filepath: 'C:/tmp/composer_os_song_mode_leadsheet_paste_source.musicxml',
      requestEcho: { primarySongwriterStyle: 'barry_harris' },
      runManifest: {
        presetId: 'song_mode',
        songModeLeadSheetInputApplied: true,
        songModeLeadSheetAnchorStartApplied: false,
      },
      validation: {
        integrityPassed: true,
        behaviourGatesPassed: true,
        mxValidationPassed: true,
        strictBarMathPassed: true,
        exportRoundTripPassed: true,
        instrumentMetadataPassed: true,
        readiness: { release: 10, mx: 10, shareable: true },
        errors: [],
      },
    } as Record<string, unknown>);
    const tree = await renderHomeGenerate();
    const textarea = getLeadSheetTextarea(tree);
    await act(async () => {
      textarea.props.onChange({ target: { value: '<score-partwise version="4.0"></score-partwise>' } });
    });
    const generateButton = getGenerateButton(tree);
    await act(async () => {
      generateButton.props.onClick();
      await Promise.resolve();
    });
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('"Input source: ","Paste"');
    expect(text).not.toContain('LeadSheet file:');
  });

  it('editing textarea after file load clears stale filename context and uses paste source', async () => {
    const { api } = await import('../src/services/api');
    vi.mocked(api.generate).mockResolvedValueOnce({
      success: true,
      filename: 'composer_os_song_mode_leadsheet_edit_after_file.musicxml',
      filepath: 'C:/tmp/composer_os_song_mode_leadsheet_edit_after_file.musicxml',
      requestEcho: { primarySongwriterStyle: 'donald_fagen' },
      runManifest: {
        presetId: 'song_mode',
        songModeLeadSheetInputApplied: true,
        songModeLeadSheetAnchorStartApplied: true,
      },
      validation: {
        integrityPassed: true,
        behaviourGatesPassed: true,
        mxValidationPassed: true,
        strictBarMathPassed: true,
        exportRoundTripPassed: true,
        instrumentMetadataPassed: true,
        readiness: { release: 10, mx: 10, shareable: true },
        errors: [],
      },
    } as Record<string, unknown>);
    const tree = await renderHomeGenerate();
    const fileInput = getLeadSheetFileInput(tree);
    const fakeFile = {
      name: 'stale.musicxml',
      text: () => Promise.resolve('<score-partwise version="4.0"></score-partwise>'),
    };
    await act(async () => {
      fileInput.props.onChange({ target: { files: [fakeFile] } });
      await Promise.resolve();
    });
    const textarea = getLeadSheetTextarea(tree);
    await act(async () => {
      textarea.props.onChange({ target: { value: '<score-partwise version="4.0"><part-list/></score-partwise>' } });
      await Promise.resolve();
    });
    let text = JSON.stringify(tree.toJSON());
    expect(text).toContain('No file selected');
    const generateButton = getGenerateButton(tree);
    await act(async () => {
      generateButton.props.onClick();
      await Promise.resolve();
    });
    text = JSON.stringify(tree.toJSON());
    expect(text).toContain('"Input source: ","Paste"');
    expect(text).not.toContain('LeadSheet file:');
  });

  it('shows LeadSheet and Melody anchor Applied when flags are true', async () => {
    const { api } = await import('../src/services/api');
    vi.mocked(api.generate).mockResolvedValueOnce({
      success: true,
      filename: 'composer_os_song_mode_leadsheet_applied.musicxml',
      filepath: 'C:/tmp/composer_os_song_mode_leadsheet_applied.musicxml',
      requestEcho: { primarySongwriterStyle: 'donald_fagen' },
      runManifest: {
        presetId: 'song_mode',
        songModeLeadSheetInputApplied: true,
        songModeLeadSheetAnchorStartApplied: true,
      },
      validation: {
        integrityPassed: true,
        behaviourGatesPassed: true,
        mxValidationPassed: true,
        strictBarMathPassed: true,
        exportRoundTripPassed: true,
        instrumentMetadataPassed: true,
        readiness: { release: 10, mx: 10, shareable: true },
        errors: [],
      },
    } as Record<string, unknown>);

    const tree = await renderHomeGenerate();
    const leadSheetTextarea = getLeadSheetTextarea(tree);
    await act(async () => {
      leadSheetTextarea.props.onChange({ target: { value: '<score-partwise version="4.0"></score-partwise>' } });
    });
    const generateButton = getGenerateButton(tree);
    await act(async () => {
      generateButton.props.onClick();
      await Promise.resolve();
    });

    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('"LeadSheet input: ","Applied"');
    expect(text).toContain('"Melody anchor: ","Applied"');
  });

  it('shows LeadSheet and Melody anchor Not applied when flags are false', async () => {
    const { api } = await import('../src/services/api');
    vi.mocked(api.generate).mockResolvedValueOnce({
      success: true,
      filename: 'composer_os_song_mode_leadsheet_not_applied.musicxml',
      filepath: 'C:/tmp/composer_os_song_mode_leadsheet_not_applied.musicxml',
      requestEcho: { primarySongwriterStyle: 'barry_harris' },
      runManifest: {
        presetId: 'song_mode',
        songModeLeadSheetInputApplied: false,
        songModeLeadSheetAnchorStartApplied: false,
      },
      validation: {
        integrityPassed: true,
        behaviourGatesPassed: true,
        mxValidationPassed: true,
        strictBarMathPassed: true,
        exportRoundTripPassed: true,
        instrumentMetadataPassed: true,
        readiness: { release: 10, mx: 10, shareable: true },
        errors: [],
      },
    } as Record<string, unknown>);

    const tree = await renderHomeGenerate();
    const leadSheetTextarea = getLeadSheetTextarea(tree);
    await act(async () => {
      leadSheetTextarea.props.onChange({ target: { value: '<score-partwise version="4.0"></score-partwise>' } });
    });
    const generateButton = getGenerateButton(tree);
    await act(async () => {
      generateButton.props.onClick();
      await Promise.resolve();
    });

    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('"LeadSheet input: ","Not applied"');
    expect(text).toContain('"Melody anchor: ","Not applied"');
  });

  it('does not render LeadSheet status when no LeadSheet was provided', async () => {
    const { api } = await import('../src/services/api');
    vi.mocked(api.generate).mockResolvedValueOnce({
      success: true,
      filename: 'composer_os_song_mode_no_leadsheet.musicxml',
      filepath: 'C:/tmp/composer_os_song_mode_no_leadsheet.musicxml',
      requestEcho: { primarySongwriterStyle: 'donald_fagen' },
      runManifest: {
        presetId: 'song_mode',
        songModeLeadSheetInputApplied: true,
        songModeLeadSheetAnchorStartApplied: true,
      },
      validation: {
        integrityPassed: true,
        behaviourGatesPassed: true,
        mxValidationPassed: true,
        strictBarMathPassed: true,
        exportRoundTripPassed: true,
        instrumentMetadataPassed: true,
        readiness: { release: 10, mx: 10, shareable: true },
        errors: [],
      },
    } as Record<string, unknown>);

    const tree = await renderHomeGenerate();
    const generateButton = getGenerateButton(tree);
    await act(async () => {
      generateButton.props.onClick();
      await Promise.resolve();
    });

    const text = JSON.stringify(tree.toJSON());
    expect(text).not.toContain('LeadSheet input:');
    expect(text).not.toContain('Melody anchor:');
  });

  it('does not render LeadSheet status for unsupported songwriter', async () => {
    const { api } = await import('../src/services/api');
    vi.mocked(api.generate).mockResolvedValueOnce({
      success: true,
      filename: 'composer_os_song_mode_unsupported_writer.musicxml',
      filepath: 'C:/tmp/composer_os_song_mode_unsupported_writer.musicxml',
      requestEcho: { primarySongwriterStyle: 'wayne_shorter' },
      runManifest: {
        presetId: 'song_mode',
        songModeLeadSheetInputApplied: true,
        songModeLeadSheetAnchorStartApplied: true,
      },
      validation: {
        integrityPassed: true,
        behaviourGatesPassed: true,
        mxValidationPassed: true,
        strictBarMathPassed: true,
        exportRoundTripPassed: true,
        instrumentMetadataPassed: true,
        readiness: { release: 10, mx: 10, shareable: true },
        errors: [],
      },
    } as Record<string, unknown>);

    const tree = await renderHomeGenerate();
    const songwriterSelect = getSongwriterSelect(tree);
    await act(async () => {
      songwriterSelect.props.onChange({ target: { value: 'wayne_shorter' } });
    });
    const leadSheetTextarea = getLeadSheetTextarea(tree);
    await act(async () => {
      leadSheetTextarea.props.onChange({ target: { value: '<score-partwise version="4.0"></score-partwise>' } });
    });
    const generateButton = getGenerateButton(tree);
    await act(async () => {
      generateButton.props.onClick();
      await Promise.resolve();
    });

    const text = JSON.stringify(tree.toJSON());
    expect(text).not.toContain('LeadSheet input:');
    expect(text).not.toContain('Melody anchor:');
  });

  it('maps Big Band and String Quartet pairing from the Songwriter dropdown (same state as Song Mode)', () => {
    expect(src).toMatch(/songwriterStyle:\s*songwriterStyle/);
    expect(src).toContain("presetId === 'big_band'");
    expect(src).toContain("presetId === 'string_quartet'");
    expect(src).toContain('Big band pairing');
    expect(src).toContain('String quartet harmony');
  });

  it('renders both Song Mode dev diagnostics blocks from one result payload', async () => {
    (globalThis as { window?: unknown }).window = { composerOsDesktop: undefined };
    const { HomeGenerate } = await import('../src/pages/HomeGenerate');
    const { api } = await import('../src/services/api');

    vi.mocked(api.generate)
      .mockResolvedValueOnce({
        success: true,
        filename: 'composer_os_song_mode_test_a.musicxml',
        filepath: 'C:/tmp/composer_os_song_mode_test_a.musicxml',
        runManifest: {
          presetId: 'song_mode',
          seed: 123,
          timestamp: '2026-04-21T00:00:00.000Z',
          songModeSectionShapingDiagnostics: {
            version: 1,
            totalBars: 32,
            densityDeltaBMinusA: 0.12,
            colourDeltaBMinusA: 0.08,
            openingVsReturnDelta: 0.14,
            returnVariationType: 'harmonic_recolour',
            returnVariationSummary: 'Return cadence lift applied.',
            contributingSlices: ['bacharach'],
          },
          songModeSectionBehaviourDescriptors: [
            {
              sliceId: 'bacharach',
              densityBiasByRole: { BRIDGE_LIFT: 0.03 },
              harmonicColourBiasByRole: { BRIDGE_LIFT: 0.08 },
            },
          ],
          songModeProfileRuleDiagnostics: {
            styleProfile: 'STYLE_SOPHISTICATED_POP',
            primarySongwriterStyleId: 'bacharach',
            resolvedRuleIds: ['bacharach.chromatic_mediant', 'found.hook_object'],
            behaviourSourceIds: ['bacharach'],
          },
          songModeDiagnosticsSummary: {
            profile: 'profile=STYLE_SOPHISTICATED_POP primary=bacharach secondary=-',
            rules: 'rules=2 sources=1',
            sectionShape: 'dB-A=0.12 cB-A=0.08 openRet=0.14 return=harmonic_recolour',
          },
        },
        validation: {
          integrityPassed: true,
          behaviourGatesPassed: true,
          mxValidationPassed: true,
          strictBarMathPassed: true,
          exportRoundTripPassed: true,
          instrumentMetadataPassed: true,
          readiness: { release: 10, mx: 10, shareable: true },
          errors: [],
        },
      } as Record<string, unknown>)
      .mockResolvedValueOnce({
      success: true,
      filename: 'composer_os_song_mode_test_b.musicxml',
      filepath: 'C:/tmp/composer_os_song_mode_test_b.musicxml',
      runManifest: {
        presetId: 'song_mode',
        seed: 124,
        timestamp: '2026-04-21T00:01:00.000Z',
        songModeSectionShapingDiagnostics: {
          version: 1,
          totalBars: 32,
          densityDeltaBMinusA: 0.27,
          colourDeltaBMinusA: 0.11,
          openingVsReturnDelta: 0.42,
          returnVariationType: 'evolved_comp',
          returnVariationSummary: 'Evolved return comp.',
          contributingSlices: ['fagen', 'bacharach'],
        },
        songModeSectionBehaviourDescriptors: [
          {
            sliceId: 'fagen',
            densityBiasByRole: { BRIDGE_LIFT: 0.06, RETURN: 0.02 },
            harmonicColourBiasByRole: { BRIDGE_LIFT: 0.11 },
            returnVariationType: 'evolved_comp',
          },
        ],
        songModeProfileRuleDiagnostics: {
          styleProfile: 'STYLE_SOPHISTICATED_POP',
          primarySongwriterStyleId: 'donald_fagen',
          resolvedRuleIds: ['fagen.voice_lead', 'found.hook_object', 'return.comp'],
          behaviourSourceIds: ['fagen', 'bacharach', 'style_sophisticated_pop'],
        },
        songModeDiagnosticsSummary: {
          profile: 'profile=STYLE_SOPHISTICATED_POP primary=donald_fagen secondary=-',
          rules: 'rules=3 sources=3',
          sectionShape: 'dB-A=0.27 cB-A=0.11 openRet=0.42 return=evolved_comp',
        },
      },
      validation: {
        integrityPassed: true,
        behaviourGatesPassed: true,
        mxValidationPassed: true,
        strictBarMathPassed: true,
        exportRoundTripPassed: true,
        instrumentMetadataPassed: true,
        readiness: { release: 10, mx: 10, shareable: true },
        errors: [],
      },
    } as Record<string, unknown>);

    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(HomeGenerate, { onResult: () => undefined }));
    });
    const generateButton = tree!.root.findAllByType('button').find((b) => {
      const c = b.props.children;
      return (typeof c === 'string' && c.includes('Generate')) || (Array.isArray(c) && c.join('').includes('Generate'));
    });
    expect(generateButton).toBeDefined();
    await act(async () => {
      generateButton!.props.onClick();
      await Promise.resolve();
    });
    await act(async () => {
      generateButton!.props.onClick();
      await Promise.resolve();
    });

    const text = JSON.stringify(tree!.toJSON());
    expect(text).toContain('Section Shape (dev diagnostics)');
    expect(text).toContain('Section Sources / Slates (dev)');
    expect(text).toContain('Song Mode Profile / Rules (dev)');
    expect(text).toContain('B / Bridge Lift');
    expect(text).toContain('+0.120');
    expect(text).toContain('Slate Tags');
    expect(text).toContain('density_bias');
    expect(text).toContain('Style profile');
    expect(text).toContain('STYLE_SOPHISTICATED_POP');
    expect(text).toContain('Compare recent Song Mode runs (dev)');
    expect(text).toContain('Seed 124 · 2026-04-21T00:01:00.000Z');
    expect(text).toContain('Seed 123 · 2026-04-21T00:00:00.000Z');
    expect(text).toContain('Runs are broadly similar on core contrast/return/source cues.');
  });
});
