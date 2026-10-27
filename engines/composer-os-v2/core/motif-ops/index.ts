export {
  C_MAJOR_FIELD,
  OPERATOR_IDS,
  lineageSuffix,
  type Motif,
  type MotifNoteEvent,
  type OperatorId,
  type OperatorResult,
  type TransformStep,
} from './types';
export { applyOperator, type OperatorParams } from './operators';
export { buildChain, placementsForChain, type ChainPlanStep, type DevelopmentChain, type LineagePlacement } from './developmentChain';
export { applyBudgetOperators, motifOpsEnabled, type MotifOpsFlag } from './budget';
export { DELIBERATE_TRANSFORM_DIFFERENCES } from './adapters';
export {
  discoverMotifs,
  motifFromDiscoveredPattern,
  type DiscoveredOccurrence,
  type DiscoveredPattern,
  type MotifDiscovery,
} from './motifDiscovery';
