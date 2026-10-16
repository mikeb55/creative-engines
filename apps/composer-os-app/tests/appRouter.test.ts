import { describe, expect, it } from 'vitest';
import {
  hashForRoute,
  normalizeRoutePath,
  pathForRoute,
  PRIMARY_NAV_ROUTES,
  routeFromLocation,
  routeFromPathname,
  routeNavLabel,
} from '../src/router/appRouter';

describe('appRouter hash routes (Phase 1.5 S1 + file:// reload fix)', () => {
  it('maps every primary nav id to a stable path and label', () => {
    for (const id of PRIMARY_NAV_ROUTES) {
      expect(pathForRoute(id).startsWith('/')).toBe(true);
      expect(routeNavLabel(id).length).toBeGreaterThan(0);
      expect(hashForRoute(id).startsWith('#')).toBe(true);
    }
    expect(pathForRoute('riffgen')).toBe('/riffgen');
    expect(hashForRoute('riffgen')).toBe('#/riffgen');
    expect(hashForRoute('home')).toBe('#/');
    expect(routeNavLabel('riffgen')).toBe('RiffGen');
    expect(pathForRoute('bhl')).toBe('/bhl');
    expect(hashForRoute('bhl')).toBe('#/bhl');
    expect(routeNavLabel('bhl')).toBe('BHL');
    expect(routeFromLocation({ hash: '#/bhl', pathname: '/index.html' })).toBe('bhl');
    expect(routeFromLocation({ hash: '#/practice', pathname: '/index.html' })).toBe('practice');
    expect(hashForRoute('practice')).toBe('#/practice');
    expect(routeNavLabel('practice')).toBe('Practice & Scales Studio');
    expect(routeFromLocation({ hash: '#/pentatonic', pathname: '/bhl' })).toBe('pentatonic');
    expect(routeFromLocation({ hash: '#/', pathname: '/bhl' })).toBe('home');
  });

  it('routeFromPathname resolves legacy path URLs', () => {
    expect(routeFromPathname('/riffgen')).toBe('riffgen');
    expect(routeFromPathname('/presets')).toBe('presets');
    expect(routeFromPathname('/')).toBe('home');
    expect(routeFromPathname('/nope')).toBe('home');
  });

  it('normalizeRoutePath accepts hash and bare forms', () => {
    expect(normalizeRoutePath('#/riffgen')).toBe('/riffgen');
    expect(normalizeRoutePath('#riffgen')).toBe('/riffgen');
    expect(normalizeRoutePath('/presets')).toBe('/presets');
    expect(normalizeRoutePath('')).toBe('/');
  });

  it('routeFromLocation prefers hash over pathname (file://-safe)', () => {
    expect(routeFromLocation({ hash: '#/riffgen', pathname: '/C:/Dev/ui/index.html' })).toBe(
      'riffgen'
    );
    expect(routeFromLocation({ hash: '#/presets', pathname: '/' })).toBe('presets');
    expect(routeFromLocation({ hash: '#/', pathname: '/riffgen' })).toBe('home');
    expect(routeFromLocation({ hash: '', pathname: '/outputs' })).toBe('outputs');
    expect(routeFromLocation({ hash: '', pathname: '/C:/foo/ui/index.html' })).toBe('home');
  });
});