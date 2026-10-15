import {
  listPentatonicColourResources,
  mod12,
  parseNoteToken,
  PENTATONIC_NOTE_CHOICES,
  spellFromReference,
  type PentatonicColourResource,
} from '@composer-os/core/pentatonic';

export function colourPitchClasses(reference: string, intervals: readonly number[]): number[] {
  const root = parseNoteToken(reference)?.pc ?? 0;
  return intervals.map((interval) => mod12(root + interval));
}

export function colourSpelling(reference: string, resource: PentatonicColourResource): string {
  return spellFromReference(reference, resource.intervals, resource.letterSteps).join(' ');
}

export function PentatonicColourRegistry(props: {
  referenceNote: string;
  onReferenceNote: (note: string) => void;
  onUsePathCollection: (archetypeId: string, referenceNote: string) => void;
}) {
  const resources = listPentatonicColourResources();
  return (
    <section data-testid="pentatonic-colour-registry" aria-labelledby="pentatonic-colour-heading" style={{ display: 'grid', gap: '0.65rem' }}>
      <h3 id="pentatonic-colour-heading" style={{ margin: 0, fontSize: '1rem' }}>
        Colour collections
      </h3>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        {resources.length} registered collections. Each one can be the manual path collection at the spelling reference. Unknown ids are
        rejected.
      </p>
      <label htmlFor="pentatonic-colour-reference">
        Spelling reference
        <select
          id="pentatonic-colour-reference"
          data-testid="pentatonic-colour-reference"
          value={props.referenceNote}
          onChange={(event) => props.onReferenceNote(event.target.value)}
        >
          {PENTATONIC_NOTE_CHOICES.map((note) => (
            <option key={note} value={note}>
              {note}
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {resources.map((resource) => {
          const spelling = colourSpelling(props.referenceNote, resource);
          const pitchClasses = colourPitchClasses(props.referenceNote, resource.intervals);
          return (
            <article
              key={resource.id}
              data-testid="pentatonic-colour-row"
              data-colour-id={resource.id}
              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.6rem 0.75rem' }}
            >
              <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem' }}>{resource.displayName}</h4>
              <p data-testid="pentatonic-colour-intervals" style={{ margin: '0.15rem 0' }}>
                Intervals: {resource.intervals.join(' ')}
              </p>
              <p data-testid="pentatonic-colour-pitch-classes" style={{ margin: '0.15rem 0' }}>
                Pitch classes at {props.referenceNote}: {pitchClasses.join(' ')}
              </p>
              <p data-testid="pentatonic-colour-spelling" style={{ margin: '0.15rem 0' }}>
                Spelling: {spelling}
              </p>
              <p style={{ margin: '0.15rem 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{resource.role}</p>
              <button
                type="button"
                data-testid="pentatonic-colour-use-path"
                data-colour-id={resource.id}
                onClick={() => props.onUsePathCollection(resource.id, props.referenceNote)}
              >
                Use for path transform and phrase generation
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
