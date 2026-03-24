const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export const api = {
  getPresets: () => get<{ presets: { id: string; name: string; description?: string; supported: boolean }[] }>('/presets'),
  getStyleModules: () => get<{ modules: { id: string; name: string }[] }>('/style-modules'),
  generate: (req: Record<string, unknown>) => post<Record<string, unknown>>('/generate', req),
  getOutputs: () => get<{ outputs: Array<Record<string, unknown>> }>('/outputs'),
  openOutputFolder: () => post<{ success: boolean }>('/open-output-folder', {}),
};
