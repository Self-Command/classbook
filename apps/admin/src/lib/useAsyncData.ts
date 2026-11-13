import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
  type Dispatch,
  type SetStateAction,
} from 'react';

interface AsyncDataResult<T> {
  data: T | null;
  loading: boolean;
  error: unknown;
  reload: () => void;
  setData: Dispatch<SetStateAction<T | null>>;
}

export function useAsyncData<T>(
  loader: () => Promise<T>,
  dependencies: DependencyList,
): AsyncDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    loaderRef
      .current()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [...dependencies, version]);

  const reload = useCallback(() => {
    setVersion((value) => value + 1);
  }, []);

  return { data, loading, error, reload, setData };
}
