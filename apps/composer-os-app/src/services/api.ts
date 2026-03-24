const BASE = '/api';

function parseOkJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid JSON response');
  }
}

function friendlyHttpMessage(status: number, bodyText: string): string {
  let msg = bodyText;
  try {
    const j = JSON.parse(bodyText) as { error?: string };
    if (j.error) msg = j.error;
  } catch {
    /* use raw */
  }
  if (status === 0 || status >= 500) {
    return msg || 'Composer OS had a problem on the server. Try again or restart the app.';
  }
  if (status === 404) {
    return 'That feature was not found. Update Composer OS.';
  }
  if (status === 408 || status === 504) {
    return 'The request took too long. Try again with a different seed.';
  }
  return msg || `Request failed (${status})`;
}

function isDesktopIpc(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.composerOsDesktop &&
    window.composerOsDesktop.integration === 'ipc'
  );
}

async function ipcInvoke<T>(channel: string, payload?: unknown): Promise<T> {
  const bridge = window.composerOsDesktop;
  if (!bridge?.invokeApi) {
    throw new Error('Composer OS desktop IPC bridge is not available.');
  }
  return bridge.invokeApi(channel, payload) as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  if (isDesktopIpc()) {
    const map: Record<string, string> = {
      '/presets': 'composer-os-api:get-presets',
      '/style-modules': 'composer-os-api:get-style-modules',
      '/output-directory': 'composer-os-api:get-output-directory',
      '/diagnostics': 'composer-os-api:get-diagnostics',
      '/outputs': 'composer-os-api:get-outputs',
    };
    const ch = map[path];
    if (!ch) throw new Error(`Unknown IPC path: ${path}`);
    return ipcInvoke<T>(ch);
  }
  let r: Response;
  try {
    r = await fetch(`${BASE}${path}`);
  } catch {
    throw new Error(
      'Composer OS is not reachable. Make sure the app is running and try again.'
    );
  }
  const text = await r.text();
  if (!r.ok) {
    throw new Error(friendlyHttpMessage(r.status, text));
  }
  return parseOkJson<T>(text);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  if (isDesktopIpc()) {
    if (path === '/generate') {
      return ipcInvoke<T>('composer-os-api:generate', body);
    }
    if (path === '/open-output-folder') {
      return ipcInvoke<T>('composer-os-api:open-output-folder', body);
    }
    throw new Error(`Unknown IPC POST path: ${path}`);
  }
  let r: Response;
  try {
    r = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      'Composer OS is not reachable. Make sure the app is running and try again.'
    );
  }
  const text = await r.text();
  if (!r.ok) {
    throw new Error(friendlyHttpMessage(r.status, text));
  }
  return parseOkJson<T>(text);
}

export interface OutputDirectoryResponse {
  path: string;
  displayPath?: string;
}

export interface AppStyleModuleDto {
  id: string;
  name: string;
  enabled: boolean;
  type?: string;
}

export interface DiagnosticsResponse {
  appName: string;
  version: string;
  apiBasePath: string;
  activePort: number;
  desktopTransport?: 'ipc' | 'http';
  outputDirectory: string;
  outputDirectoryDisplay: string;
  outputDirectoryExists: boolean;
  outputDirectoryWritable: boolean;
  backendReachable: true;
  styleModules?: AppStyleModuleDto[];
}

export function displayOutputPath(r: OutputDirectoryResponse): string {
  return r.displayPath ?? r.path;
}

export interface OpenOutputFolderResponse {
  success: boolean;
  message?: string;
}

export async function fetchDiagnostics(): Promise<DiagnosticsResponse | null> {
  try {
    return await get<DiagnosticsResponse>('/diagnostics');
  } catch {
    return null;
  }
}

export const api = {
  getPresets: () =>
    get<{ presets: { id: string; name: string; description?: string; supported: boolean }[] }>(
      '/presets'
    ),
  getStyleModules: () => get<{ modules: AppStyleModuleDto[] }>('/style-modules'),
  getOutputDirectory: () => get<OutputDirectoryResponse>('/output-directory'),
  getDiagnostics: () => get<DiagnosticsResponse>('/diagnostics'),
  generate: (req: Record<string, unknown>) => post<Record<string, unknown>>('/generate', req),
  getOutputs: () => get<{ outputs: Array<Record<string, unknown>> }>('/outputs'),
  openOutputFolder: () => post<OpenOutputFolderResponse>('/open-output-folder', {}),
};

/** Shape checks for generation receipts (tests). */
export function isGenerationReceiptShape(r: Record<string, unknown>): boolean {
  if (typeof r.success !== 'boolean') return false;
  if (!r.validation || typeof r.validation !== 'object') return false;
  const v = r.validation as Record<string, unknown>;
  if (typeof v.readiness !== 'object' || v.readiness === null) return false;
  const rd = v.readiness as Record<string, unknown>;
  if (typeof rd.release !== 'number' || typeof rd.mx !== 'number') return false;
  return true;
}
