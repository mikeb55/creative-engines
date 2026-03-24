import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export type StyleModuleOption = { id: string; name: string; enabled?: boolean };

export const STYLE_MODULES_UNAVAILABLE_MSG = 'No style modules available — check backend';

/** Testable: empty successful response should surface the same message as fetch failure. */
export function styleModulesListError(modules: StyleModuleOption[] | undefined): string | null {
  if (!modules || modules.length === 0) return STYLE_MODULES_UNAVAILABLE_MSG;
  return null;
}

export function useStyleModules() {
  const [modules, setModules] = useState<StyleModuleOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .getStyleModules()
      .then((r) => {
        const list = r.modules ?? [];
        setModules(list);
        setError(styleModulesListError(list));
      })
      .catch(() => {
        setModules([]);
        setError(STYLE_MODULES_UNAVAILABLE_MSG);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { modules, error, loading, reload };
}
