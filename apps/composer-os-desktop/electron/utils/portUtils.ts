/**
 * Port detection and Composer OS API identification for desktop startup.
 */

import * as net from 'net';
import * as http from 'http';

const HEALTH_PATH = '/health';

export interface HealthResponse {
  status: string;
  app: string;
}

/**
 * True if something is listening on 127.0.0.1:port (TCP).
 */
export function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
        return;
      }
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => resolve(false));
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * GET /health — Composer OS API identification.
 */
export function isComposerOsApi(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(
      `http://127.0.0.1:${port}${HEALTH_PATH}`,
      { timeout: 2000 },
      (res) => {
        let body = '';
        res.on('data', (c) => {
          body += c;
        });
        res.on('end', () => {
          try {
            const j = JSON.parse(body) as HealthResponse;
            resolve(res.statusCode === 200 && j.app === 'composer-os' && j.status === 'ok');
          } catch {
            resolve(false);
          }
        });
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * First port >= startPort that is not in use on 127.0.0.1.
 */
export function findAvailablePort(startPort: number, maxAttempts = 100): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryNext = async (p: number, attempts: number) => {
      if (attempts <= 0) {
        reject(new Error(`No free port found starting at ${startPort}`));
        return;
      }
      const inUse = await isPortInUse(p);
      if (!inUse) {
        resolve(p);
        return;
      }
      await tryNext(p + 1, attempts - 1);
    };
    void tryNext(startPort, maxAttempts);
  });
}

function preferredPort(): number {
  const v = process.env.COMPOSER_OS_PREFERRED_PORT;
  if (v !== undefined && v !== '') return parseInt(v, 10);
  return 3001;
}

/**
 * Choose port for Composer OS API:
 * - If preferred is free → use it (caller will start server).
 * - If preferred is busy and serves Composer OS /health → reuse (caller skips start).
 * - If preferred is busy and not our API → next free from preferred+1.
 */
export async function resolveComposerOsPort(): Promise<{ port: number; reuseExisting: boolean }> {
  const pref = preferredPort();
  const busy = await isPortInUse(pref);
  if (!busy) {
    return { port: pref, reuseExisting: false };
  }
  const ours = await isComposerOsApi(pref);
  if (ours) {
    return { port: pref, reuseExisting: true };
  }
  const port = await findAvailablePort(pref + 1);
  return { port, reuseExisting: false };
}
