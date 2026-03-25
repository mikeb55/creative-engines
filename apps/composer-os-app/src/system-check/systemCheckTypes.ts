/** Mirrors engines/composer-os-v2/app-api/systemCheck.ts (UI-only shape). */

export type SystemCheckStepDto = {
  id: 'engine' | 'retro' | 'app';
  label: string;
  ok: boolean;
  exitCode: number | null;
};

export type SystemCheckResponse = {
  ok: boolean;
  summary: string;
  failureCount: number;
  failuresByCategory: { engine: number; retro: number; app: number };
  steps: SystemCheckStepDto[];
  detailLog: string;
  repoRoot: string;
};
