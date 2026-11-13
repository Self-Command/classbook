import { createContext, useContext, useEffect, type ReactNode } from 'react';
import {
  DEFAULT_SITE_COPY,
  type SiteCopy,
  type SiteSettingsDto,
} from '@classbook/shared';
import { settingsApi } from './api';
import { useAsyncData } from './useAsyncData';

interface SiteCopyContextValue {
  copy: SiteCopy;
  settings: SiteSettingsDto | null;
  loading: boolean;
}

const SiteCopyContext = createContext<SiteCopyContextValue>({
  copy: DEFAULT_SITE_COPY,
  settings: null,
  loading: true,
});

export function resolveSiteCopy(raw: Partial<SiteCopy> | undefined): SiteCopy {
  const copy = { ...DEFAULT_SITE_COPY };
  if (!raw) return copy;

  for (const key of Object.keys(DEFAULT_SITE_COPY) as (keyof SiteCopy)[]) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim() !== '') {
      copy[key] = value;
    }
  }
  return copy;
}

export function SiteCopyProvider({ children }: { children: ReactNode }) {
  const { data, loading } = useAsyncData(() => settingsApi.getPublic(), []);
  const copy = resolveSiteCopy(data?.copy);

  useEffect(() => {
    document.title = copy.tabTitle;
  }, [copy.tabTitle]);

  return (
    <SiteCopyContext.Provider value={{ copy, settings: data, loading }}>
      {children}
    </SiteCopyContext.Provider>
  );
}

export function useSiteCopy(): SiteCopyContextValue {
  return useContext(SiteCopyContext);
}
