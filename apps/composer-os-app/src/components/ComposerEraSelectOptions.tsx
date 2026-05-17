import {
  COMPOSER_ERA_CLASSICAL_OPTIONS,
  COMPOSER_ERA_JAZZ_OPTIONS,
  COMPOSER_ERA_NO_ERA_TOOLTIP,
  COMPOSER_ERA_SELECT_NULL,
} from '../types/composerEraOptions';

/** Unified jazz + classical era `<select>` children — all modes, no mode gating. */
export function ComposerEraSelectOptions({ includeNoEra = true }: { includeNoEra?: boolean }) {
  return (
    <>
      {includeNoEra ? (
        <option value={COMPOSER_ERA_SELECT_NULL} title={COMPOSER_ERA_NO_ERA_TOOLTIP}>
          — No Era —
        </option>
      ) : null}
      <optgroup label="Jazz Eras">
        {COMPOSER_ERA_JAZZ_OPTIONS.map((o) => (
          <option key={o.id} value={o.id} title={o.tooltip}>
            {o.label}
          </option>
        ))}
      </optgroup>
      <optgroup label="Classical / Chamber Eras">
        {COMPOSER_ERA_CLASSICAL_OPTIONS.map((o) => (
          <option key={o.id} value={o.id} title={o.tooltip}>
            {o.label}
          </option>
        ))}
      </optgroup>
    </>
  );
}
