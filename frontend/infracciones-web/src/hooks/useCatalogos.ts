import { useCallback, useEffect, useState } from 'react';

import { getErrorMessage } from '../services/api/apiClient';
import { getCatalogosBundle } from '../services/api/catalogos.api';
import type { CatalogosBundle } from '../types/catalogos.types';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface LoadState<T> {
  status: LoadStatus;
  data: T | null;
  error: string | null;
}

function createIdleState<T>(): LoadState<T> {
  return {
    status: 'idle',
    data: null,
    error: null,
  };
}

export function useCatalogos() {
  const [state, setState] = useState<LoadState<CatalogosBundle>>(
    createIdleState<CatalogosBundle>(),
  );

  const refresh = useCallback(async (): Promise<void> => {
    setState({
      status: 'loading',
      data: null,
      error: null,
    });

    try {
      const data = await getCatalogosBundle();
      setState({
        status: 'ready',
        data,
        error: null,
      });
    } catch (error) {
      setState({
        status: 'error',
        data: null,
        error: getErrorMessage(error),
      });
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  return {
    catalogs: state.data,
    error: state.error,
    loading: state.status === 'loading' || state.status === 'idle',
    refresh,
  };
}
