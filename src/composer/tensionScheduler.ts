/**
 * Re-export — canonical implementation in `engines/composer-os-v2/core/composer/`.
 */

export {
  applyTensionScheduleToContext,
  interpolateTensionForBarRange,
  voicingColorForTension,
  runTensionDeviationAudit,
  type TensionAuditRow,
} from '../../engines/composer-os-v2/core/composer/tensionScheduler';
