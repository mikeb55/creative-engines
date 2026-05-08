/**
 * Re-export — canonical implementation in `engines/composer-os-v2/core/composer/`.
 */

export {
  RHYTHM_DNA_CELL_IDS,
  RHYTHM_DNA_CELL_TABLE,
  syncopationFromMotifCell,
  computeRhythmMotifBinding,
  filterRhythmCellsByBinding,
  antiMetricPenaltyForCell,
  mingusShoutInjectActive,
  coltraneAllowsTiedSyncopationCell,
  applyRhythmMotifBindingToConstraints,
  type RhythmMotifBinding,
  type RhythmDnaCellId,
  type RhythmDnaCellMeta,
} from '../../engines/composer-os-v2/core/composer/rhythmDnaMotifBinder';
