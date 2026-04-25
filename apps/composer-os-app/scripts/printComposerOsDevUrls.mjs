/**
 * Prints canonical dev URLs before `npm run dev` (npm `predev` hook).
 * Vite may also open the browser when server.open is enabled (unless VITE_OPEN_BROWSER=0).
 */
const noOpen = process.env.VITE_OPEN_BROWSER === '0';
// Keep in sync with vite.config.ts server.port and scripts/startComposerOsAppApi.ts default PORT.
const web = 'http://localhost:5173/';
const apiPort = process.env.PORT ?? process.env.VITE_API_PORT ?? '3001';
const apiBase = `http://localhost:${apiPort}`;
const webHint = noOpen
  ? '(open this URL yourself — VITE_OPEN_BROWSER=0; auto-open script skipped)'
  : '("ui" process: scripts/openViteWhenReady.mjs should open the browser when Vite responds)';
console.log(`
[Composer OS] dev services (npm run dev)
  Web UI:  ${web}${webHint}
  API:     ${apiBase}/  (health: ${apiBase}/health)
`);