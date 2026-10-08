/**
 * Parse, bind, compile, and project one saved Performance Plan.
 */

import type { CompiledPerformance } from './compilePerformancePlan';
import { compilePerformancePlan } from './compilePerformancePlan';
import type { CueTrace, PerformancePlan } from './performancePlanTypes';
import { describePlan } from './performancePlanReport';
import { productFileName, projectPerformanceOutputs, type ProjectedScores } from './projectPerformanceOutputs';
import { indexSource, type SourceIndex } from './sourceIndexAdapter';
import { bindAndValidatePlan, type BoundPlan } from './validatePerformancePlan';

export interface DirectorExecution {
  index: SourceIndex;
  bound: BoundPlan;
  compiled: CompiledPerformance;
  scores: ProjectedScores;
  report: string;
  files: Array<{ name: string; contents: string }>;
}

export function executePerformancePlan(
  xml: string,
  planInput: unknown,
  sha256?: string,
  stem?: string,
  arrangementXml?: string,
  trace?: CueTrace
): DirectorExecution {
  const index = indexSource(xml, sha256);
  const arrangement = arrangementXml ? indexSource(arrangementXml) : null;
  const bound = bindAndValidatePlan(planInput, index, arrangement, trace ?? null);
  const compiled = compilePerformancePlan(bound, index);
  const scores = projectPerformanceOutputs(index, bound.plan, compiled);
  const fileStem = stem ?? bound.plan.id;
  const plan: PerformancePlan = bound.plan;
  const files = [
    { name: `${fileStem}-PERFORMANCE-PLAN.json`, contents: `${JSON.stringify(plan, null, 2)}\n` },
    { name: productFileName(fileStem, 'performance'), contents: scores.performance },
    { name: productFileName(fileStem, 'leadsheet'), contents: scores.leadsheet },
    { name: productFileName(fileStem, 'guitar_study'), contents: scores.guitar_study },
    { name: productFileName(fileStem, 'bass_partner'), contents: scores.bass_partner },
    { name: `${fileStem}-CUE-TRACE.json`, contents: `${JSON.stringify(bound.trace, null, 2)}\n` },
    { name: `${fileStem}-SOURCE-MAP.json`, contents: `${JSON.stringify(compiled.receipt.sourceMap, null, 2)}\n` },
    { name: `${fileStem}-EXECUTION-RECEIPT.json`, contents: `${JSON.stringify(compiled.receipt, null, 2)}\n` },
    { name: `${fileStem}-PLAN-REPORT.md`, contents: describePlan(index, plan, compiled) },
  ];
  return { index, bound, compiled, scores, report: files[7]!.contents, files };
}
