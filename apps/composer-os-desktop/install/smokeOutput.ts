/**
 * PASS/FAIL lines for desktop rebuild-and-smoke (testable, no fake success).
 */

export type SmokePass = {
  ok: true;
  packagedExePath: string;
  launched: boolean;
  buildVersion: string;
  uiBuildTimestamp: string;
};

export type SmokeFail = {
  ok: false;
  blockingStep: string;
  detail?: string;
};

export type SmokeResult = SmokePass | SmokeFail;

/** Final output only (what the CLI prints). */
export function formatSmokeReport(r: SmokeResult): string {
  if (!r.ok) {
    const lines = ['FAIL', `blocking step: ${r.blockingStep}`];
    if (r.detail) lines.push(r.detail);
    return lines.join('\n');
  }
  return [
    'PASS',
    `packaged exe path: ${r.packagedExePath}`,
    `launched: ${r.launched ? 'yes' : 'no'}`,
    `build version: ${r.buildVersion}`,
    `ui build timestamp: ${r.uiBuildTimestamp}`,
  ].join('\n');
}
