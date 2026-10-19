export type AppRouteId =
  | 'home'
  | 'arranger'
  | 'structure'
  | 'ensemble'
  | 'grid'
  | 'presets'
  | 'outputs'
  | 'riffgen'
  | 'composer-engines'
  | 'slonimsky-etudes'
  | 'pentatonic'
  | 'hexatonic'
  | 'solo-piano'
  | 'piano-chamber'
  | 'bhl'
  | 'practice'
  | 'evaluation'
  | 'develop'
  | 'wwh-v8'
  | 'guide'
  | 'credits';

/** Logical path per route (also used as hash path: `#/riffgen`). */
const ROUTE_PATHS: Record<AppRouteId, string> = {
  home: '/',
  arranger: '/arranger',
  structure: '/structure',
  ensemble: '/ensemble',
  grid: '/grid',
  presets: '/presets',
  outputs: '/outputs',
  riffgen: '/riffgen',
  'composer-engines': '/composer-engines',
  'slonimsky-etudes': '/slonimsky-etudes',
  pentatonic: '/pentatonic',
  hexatonic: '/hexatonic',
  'solo-piano': '/solo-piano',
  'piano-chamber': '/orchestrate',
  bhl: '/bhl',
  practice: '/practice',
  evaluation: '/evaluation',
  develop: '/develop',
  'wwh-v8': '/wwh-v8',
  guide: '/guide',
  credits: '/credits',
};

const PATH_TO_ROUTE = new Map<string, AppRouteId>(
  Object.entries(ROUTE_PATHS).map(([id, p]) => [p, id as AppRouteId])
);

function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '') || '/';
  if (trimmed.endsWith('/index.html')) {
    const base = trimmed.slice(0, -'/index.html'.length) || '/';
    return base;
  }
  return trimmed;
}

/** Parse `#/riffgen`, `#riffgen`, or bare `/riffgen` → route path key. */
export function normalizeRoutePath(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('#')) s = s.slice(1);
  if (!s) return '/';
  if (!s.startsWith('/')) s = `/${s}`;
  return normalizePathname(s);
}

export function routeFromPathname(pathname: string): AppRouteId {
  const norm = normalizePathname(pathname);
  return PATH_TO_ROUTE.get(norm) ?? 'home';
}

/** Prefer hash (file://-safe). Fall back to pathname for legacy bookmarks / http. */
export function routeFromLocation(
  loc: Pick<Location, 'hash' | 'pathname'> = typeof window !== 'undefined'
    ? window.location
    : { hash: '', pathname: '/' }
): AppRouteId {
  const hashPath = normalizeRoutePath(loc.hash ?? '');
  if (loc.hash && loc.hash !== '#' && loc.hash !== '#/') {
    const fromHash = PATH_TO_ROUTE.get(hashPath);
    if (fromHash) return fromHash;
  }
  if (loc.hash === '#/' || loc.hash === '#') return 'home';

  // Legacy path-based URLs (http Vite, or old pushState bookmarks)
  const fromPath = routeFromPathname(loc.pathname);
  if (fromPath !== 'home' || normalizePathname(loc.pathname) === '/') {
    return fromPath;
  }
  // file:///C:/…/index.html → home
  return 'home';
}

export function pathForRoute(route: AppRouteId): string {
  return ROUTE_PATHS[route];
}

/** Hash fragment including `#`, e.g. `#/riffgen` or `#/`. */
export function hashForRoute(route: AppRouteId): string {
  const path = pathForRoute(route);
  return path === '/' ? '#/' : `#${path}`;
}

/**
 * Hash-based navigation — keeps `file://…/index.html` as the document URL so
 * Ctrl+R / Ctrl+Shift+R reload a real file (not `file:///C:/riffgen`).
 */
export function navigateToRoute(route: AppRouteId): void {
  const next = hashForRoute(route);
  if (typeof window === 'undefined') return;
  if (window.location.hash === next) return;
  window.location.hash = next;
}

/** Ensure location uses a hash route (migrate legacy pathname routes once). */
export function ensureHashRoute(): AppRouteId {
  if (typeof window === 'undefined') return 'home';
  const current = routeFromLocation(window.location);
  const want = hashForRoute(current);
  if (window.location.hash !== want) {
    const url = `${window.location.pathname}${window.location.search}${want}`;
    window.history.replaceState({ route: current }, '', url);
  }
  return current;
}

export function routeNavLabel(route: AppRouteId): string {
  switch (route) {
    case 'home':
      return 'Generate';
    case 'arranger':
      return 'Arranger';
    case 'structure':
      return 'Structure';
    case 'ensemble':
      return 'Ensemble';
    case 'grid':
      return 'Grid';
    case 'presets':
      return 'Presets';
    case 'outputs':
      return 'Outputs';
    case 'riffgen':
      return 'RiffGen';
    case 'composer-engines':
      return 'Composer Engines';
    case 'slonimsky-etudes':
      return 'Slonimsky Etudes';
    case 'pentatonic':
      return 'Pentatonic';
    case 'hexatonic':
      return 'Hexatonic';
    case 'solo-piano':
      return 'Solo Piano';
    case 'piano-chamber':
      return 'Piano to chamber';
    case 'bhl':
      return 'BHL';
    case 'practice':
      return 'Practice & Scales Studio';
    case 'evaluation':
      return 'Evaluation';
    case 'develop':
      return 'Development Studio';
    case 'wwh-v8':
      return 'Performance Composer';
    case 'guide':
      return 'Help';
    case 'credits':
      return 'Credits';
    default:
      return route;
  }
}

export const PRIMARY_NAV_ROUTES: readonly AppRouteId[] = [
  'home',
  'arranger',
  'structure',
  'ensemble',
  'grid',
  'presets',
  'outputs',
  'riffgen',
];

/** Known hash path segments for Electron did-fail-load recovery. */
export const ROUTE_HASH_SEGMENTS: readonly string[] = PRIMARY_NAV_ROUTES.filter(
  (id) => id !== 'home'
)
  .map((id) => pathForRoute(id).replace(/^\//, ''))
  .concat(['composer-engines', 'slonimsky-etudes', 'pentatonic', 'hexatonic', 'solo-piano', 'orchestrate', 'bhl', 'practice', 'evaluation', 'develop', 'wwh-v8', 'guide', 'credits']);
