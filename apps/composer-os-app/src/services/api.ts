const BASE = '/api';

function parseOkJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid JSON response');
  }
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  const text = await r.text();
  if (!r.ok) {
    let msg = text;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* use raw */
    }
    throw new Error(msg || `Request failed (${r.status})`);
  }
  return parseOkJson<T>(text);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) {
    let msg = text;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* use raw */
    }
    throw new Error(msg || `Request failed (${r.status})`);
  }
  return parseOkJson<T>(text);
}

export const api = {
  getPresets: () => get<{ presets: { id: string; name: string; description?: string; supported: boolean }[] }>('/presets'),
  getStyleModules: () => get<{ modules: { id: string; name: string }[] }>('/style-modules'),
  getOutputDirectory: () => get<{ path: string }>('/output-directory'),
  generate: (req: Record<string, unknown>) => post<Record<string, unknown>>('/generate', req),
  getOutputs: () => get<{ outputs: Array<Record<string, unknown>> }>('/outputs'),
  openOutputFolder: () => post<{ success: boolean }>('/open-output-folder', {}),
};
