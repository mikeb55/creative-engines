import { orbitAPassage, orbitBPassage, type PentatonicPassage, type PentatonicPathResult } from '@composer-os/core/pentatonic';
import {
  emptyPassageRow,
  type PentatonicFormState,
  type PentatonicPassageRow,
} from './resolvePentatonicForm';

function applyPassage(form: PentatonicFormState, passage: PentatonicPassage): PentatonicFormState {
  return {
    ...form,
    analysisMode: 'passage',
    evidenceProfile: passage.evidenceProfile === 'wwh-duo-1.0' ? 'wwh-duo-1.1' : passage.evidenceProfile ?? 'wwh-duo-1.1',
    tonalCentreRoot: passage.tonalCentre?.root ?? form.tonalCentreRoot,
    tonalCentreMode: passage.tonalCentre?.mode ?? form.tonalCentreMode,
    useInheritedTonalCentre: false,
    homeArchetypeId: passage.home?.archetypeId ?? 'minor_pentatonic',
    homeReference: passage.home?.referenceNote ?? 'F',
    depth: passage.depth ?? 'chromatic',
    purpose: passage.purpose ?? form.purpose,
    passageRows: passage.events.map((event) => ({
      id: event.id,
      sourceLabel: event.sourceLabel,
      chord: event.chordSymbol ?? '',
      melodyText: (event.melodyNotes ?? []).join(' '),
      bassText: (event.bassNotes ?? []).join(' '),
      melodyRest: event.melodyRest === true,
      bassRest: event.bassRest === true,
      phraseBoundary: event.phraseBoundaryAfter === true,
    })),
  };
}

export function passageFormFromOrbit(form: PentatonicFormState, which: 'a' | 'b'): PentatonicFormState {
  return applyPassage(form, which === 'a' ? orbitAPassage() : orbitBPassage());
}

export function PentatonicPassagePanel(props: {
  form: PentatonicFormState;
  patch: (partial: Partial<PentatonicFormState>) => void;
  result: PentatonicPathResult | null;
  stale: boolean;
  loading: boolean;
  onFind: () => void;
  onReset: () => void;
}) {
  const updateRow = (id: string, partial: Partial<PentatonicPassageRow>) => {
    props.patch({
      passageRows: props.form.passageRows.map((row) => (row.id === id ? { ...row, ...partial } : row)),
    });
  };
  const move = (index: number, direction: -1 | 1) => {
    const next = [...props.form.passageRows];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row!);
    props.patch({ passageRows: next });
  };

  return (
    <div data-testid="pentatonic-passage" style={{ display: 'grid', gap: '0.75rem' }}>
      <p style={{ margin: 0 }}>
        While We're Here passage. Asks how pentatonic resources move through these events. Heuristic costs, not confidence.
      </p>
      <label htmlFor="pentatonic-evidence-profile">
        Evidence profile
        <select
          id="pentatonic-evidence-profile"
          value={props.form.evidenceProfile}
          onChange={(event) => props.patch({ evidenceProfile: event.target.value as PentatonicFormState['evidenceProfile'] })}
        >
          <option value="default">Dev 1 defaults</option>
          <option value="wwh-duo-1.1">wwh-duo-1.1</option>
        </select>
      </label>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Source label', 'Chord', 'Melody notes', 'Bass notes', 'Melody rest', 'Bass rest', 'Phrase boundary', ''].map((heading) => (
                <th key={heading} style={{ textAlign: 'left', fontSize: '0.8rem', padding: '0.25rem' }}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.form.passageRows.map((row, index) => (
              <tr key={row.id}>
                <td>
                  <input aria-label={`Source label ${index + 1}`} value={row.sourceLabel} onChange={(event) => updateRow(row.id, { sourceLabel: event.target.value })} />
                </td>
                <td>
                  <input aria-label={`Chord ${index + 1}`} value={row.chord} onChange={(event) => updateRow(row.id, { chord: event.target.value })} />
                </td>
                <td>
                  <input aria-label={`Melody ${index + 1}`} value={row.melodyText} onChange={(event) => updateRow(row.id, { melodyText: event.target.value })} />
                </td>
                <td>
                  <input aria-label={`Bass ${index + 1}`} value={row.bassText} onChange={(event) => updateRow(row.id, { bassText: event.target.value })} />
                </td>
                <td>
                  <input type="checkbox" aria-label={`Melody rest ${index + 1}`} checked={row.melodyRest} onChange={(event) => updateRow(row.id, { melodyRest: event.target.checked })} />
                </td>
                <td>
                  <input type="checkbox" aria-label={`Bass rest ${index + 1}`} checked={row.bassRest} onChange={(event) => updateRow(row.id, { bassRest: event.target.checked })} />
                </td>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Phrase boundary ${index + 1}`}
                    checked={row.phraseBoundary}
                    onChange={(event) => updateRow(row.id, { phraseBoundary: event.target.checked })}
                  />
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button type="button" onClick={() => move(index, -1)}>
                    Move Up
                  </button>
                  <button type="button" onClick={() => move(index, 1)}>
                    Move Down
                  </button>
                  <button
                    type="button"
                    onClick={() => props.patch({ passageRows: props.form.passageRows.filter((item) => item.id !== row.id) })}
                  >
                    Remove Bar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          data-testid="pentatonic-add-bar"
          onClick={() =>
            props.patch({
              passageRows: [...props.form.passageRows, emptyPassageRow(`row-${props.form.passageRows.length + 1}-${Date.now()}`)],
            })
          }
        >
          Add Bar
        </button>
        <button type="button" data-testid="pentatonic-orbit-a" onClick={() => props.patch(passageFormFromOrbit(props.form, 'a'))}>
          Load Orbit A Example
        </button>
        <button type="button" data-testid="pentatonic-orbit-b" onClick={() => props.patch(passageFormFromOrbit(props.form, 'b'))}>
          Load Orbit B Example
        </button>
        <button type="button" data-testid="pentatonic-find-path" onClick={props.onFind} disabled={props.loading}>
          {props.loading ? 'Finding…' : 'Find Path'}
        </button>
        <button type="button" className="secondary" data-testid="pentatonic-reset-passage" onClick={props.onReset}>
          Reset Passage
        </button>
      </div>
      {props.stale && props.result ? <p data-testid="pentatonic-path-stale">Inputs changed. This path is stale.</p> : null}
      {props.result?.kind === 'validation' ? (
        <ul>
          {props.result.validationErrors.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {props.result?.kind === 'analysis' ? (
        <div data-testid="pentatonic-path-result">
          <h3>Path</h3>
          <pre data-testid="pentatonic-path-segments" style={{ whiteSpace: 'pre-wrap' }}>
            {props.result.explanation}
          </pre>
          <p>
            Switches {props.result.switchCount}. Distinct resources {props.result.distinctResources}. Heuristic path cost{' '}
            {props.result.totalPathCost}. No-change comparison {props.result.bestStaticPathCost}{' '}
            {props.result.bestStaticStateName ?? ''}.
          </p>
          <details>
            <summary>Per-event local scores and transitions</summary>
            <ul>
              {props.result.events.map((event) => (
                <li key={event.eventId}>
                  {event.sourceLabel}: {event.chosenName}. Local heuristic {event.localScore ?? 'none'}. Best local {event.localBestName ?? 'none'}{' '}
                  {event.localBestScore ?? ''}. {event.explanation}
                </li>
              ))}
            </ul>
            {props.result.diagnostics.length > 0 ? <p>{props.result.diagnostics.join(' ')}</p> : null}
          </details>
        </div>
      ) : null}
    </div>
  );
}
