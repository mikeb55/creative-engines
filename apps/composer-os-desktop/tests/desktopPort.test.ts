/**
 * Desktop port resolution tests
 */
import * as http from 'http';
import {
  isPortInUse,
  findAvailablePort,
  isComposerOsApi,
  resolveComposerOsPort,
} from '../electron/utils/portUtils';

function listenDummy(port: number, handler: http.RequestListener): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const s = http.createServer(handler);
    s.once('error', reject);
    s.listen(port, '127.0.0.1', () => resolve(s));
  });
}

describe('portUtils', () => {
  afterEach(() => {
    delete process.env.COMPOSER_OS_PREFERRED_PORT;
  });

  it('port free → isPortInUse false', async () => {
    const s = await listenDummy(0, (_req, res) => res.end());
    const addr = s.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    await new Promise<void>((r) => s.close(() => r()));
    if (port > 0) {
      expect(await isPortInUse(port)).toBe(false);
    }
  });

  it('port occupied → isPortInUse true', async () => {
    const s = await listenDummy(0, (_req, res) => res.end());
    const addr = s.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    expect(await isPortInUse(port)).toBe(true);
    await new Promise<void>((r) => s.close(() => r()));
  });

  it('isComposerOsApi true when /health returns composer-os', async () => {
    const s = await listenDummy(0, (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', app: 'composer-os' }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    const addr = s.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    expect(await isComposerOsApi(port)).toBe(true);
    await new Promise<void>((r) => s.close(() => r()));
  });

  it('isComposerOsApi false for wrong body', async () => {
    const s = await listenDummy(0, (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', app: 'other' }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    const addr = s.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    expect(await isComposerOsApi(port)).toBe(false);
    await new Promise<void>((r) => s.close(() => r()));
  });

  it('findAvailablePort skips occupied port', async () => {
    const s = await listenDummy(0, (_req, res) => res.end('dummy'));
    const addr = s.address();
    const occupied = typeof addr === 'object' && addr ? addr.port : 0;
    const next = await findAvailablePort(occupied);
    expect(next).toBe(occupied + 1);
    await new Promise<void>((r) => s.close(() => r()));
  });

  it('resolveComposerOsPort: free preferred → use preferred', async () => {
    process.env.COMPOSER_OS_PREFERRED_PORT = '49151';
    const r = await resolveComposerOsPort();
    expect(r.port).toBe(49151);
    expect(r.reuseExisting).toBe(false);
  });

  it('resolveComposerOsPort: occupied by Composer OS API → reuse', async () => {
    process.env.COMPOSER_OS_PREFERRED_PORT = '49152';
    const s = await listenDummy(49152, (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', app: 'composer-os' }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    const r = await resolveComposerOsPort();
    expect(r.port).toBe(49152);
    expect(r.reuseExisting).toBe(true);
    await new Promise<void>((resolve) => s.close(() => resolve()));
  });

  it('resolveComposerOsPort: occupied by dummy → switch port', async () => {
    process.env.COMPOSER_OS_PREFERRED_PORT = '49153';
    const s = await listenDummy(49153, (_req, res) => {
      res.writeHead(200);
      res.end('not composer os');
    });
    const r = await resolveComposerOsPort();
    expect(r.port).toBe(49154);
    expect(r.reuseExisting).toBe(false);
    await new Promise<void>((resolve) => s.close(() => resolve()));
  });
});
