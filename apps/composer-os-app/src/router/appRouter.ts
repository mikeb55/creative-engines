export type AppRouteId =
  | 'home'
  | 'arranger'
  | 'structure'
  | 'ensemble'
  | 'grid'
  | 'presets'
  | 'outputs'
  | 'composer-engines'
  | 'slonimsky-etudes'
  | 'guide'
  | 'credits';

const ROUTE_PATHS: Record<AppRouteId, string> = {
  home: '/',
  arranger: '/arranger',
  structure: '/structure',
  ensemble: '/ensemble',
  grid: '/grid',
  presets: '/presets',
  outputs: '/outputs',
  'composer-engines': '/composer-engines',
  'slonimsky-etudes': '/slonimsky-etudes',
  guide: '/guide',
  credits: '/credits',
};

const PATH_TO_ROUTE = new Map<string, AppRouteId>(
  Object.entries(ROUTE_PATHS).map(([id, p]) => [p, id as AppRouteId]),
);

function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '') || '/';
  if (trimmed.endsWith('/index.html')) {
    const base = trimmed.slice(0, -'/index.html'.length) || '/';
    return base;
  }
  return trimmed;
}

export function routeFromPathname(pathname: string): AppRouteId {
  const norm = normalizePathname(pathname);
  return PATH_TO_ROUTE.get(norm) ?? 'home';
}

export function pathForRoute(route: AppRouteId): string {
  return ROUTE_PATHS[route];
}

export function navigateToRoute(route: AppRouteId): void {
  const path = pathForRoute(route);
  if (window.location.pathname !== path) {
    window.history.pushState({ route }, '', path);
  }
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
    case 'composer-engines':
      return 'Composer Engines';
    case 'slonimsky-etudes':
      return 'Slonimsky Etudes';
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
];
