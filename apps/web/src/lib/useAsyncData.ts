import { useCallback, useEffect, useRef, useState } from 'react';
import { UnauthorizedError, getErrorMessage } from './api';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface AsyncResult<T> extends AsyncState<T> {
  reload: () => void;
}

export function useAsyncData<T>(
  load: () => Promise<T>,
  deps: readonly unknown[],
): AsyncResult<T> {
  const loadRef = useRef(load);
  loadRef.current = load;

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setState((previous) => ({
      data: previous.data,
      loading: true,
      error: null,
    }));

    loadRef
      .current()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof UnauthorizedError) {
          setState({ data: null, loading: false, error: null });
          return;
        }
        setState({ data: null, loading: false, error: getErrorMessage(error) });
      });

    return () => {
      active = false;
    };
  }, [nonce, ...deps]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { ...state, reload };
}
