import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { createFunctionsClient, isPermanentError, type FunctionsClient } from '../client';

const FunctionsClientContext = createContext<FunctionsClient | null>(null);

export type QueryProviderProps = {
  /** Base URL of the callable functions (see para-backend/docs/deployment.md). */
  functionsUrl: string;
  /** Returns the signed-in user's Firebase ID token. Deployed functions require it. Pass a stable function. */
  getAuthToken?: () => Promise<string | null | undefined>;
  children: ReactNode;
};

/** TanStack Query client plus the backend client, for everything under it. */
export function QueryProvider({ functionsUrl, getAuthToken, children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failures, error) => !isPermanentError(error) && failures < 2,
          },
          mutations: { retry: false },
        },
      }),
  );
  const client = useMemo(
    () => createFunctionsClient({ baseUrl: functionsUrl, getAuthToken }),
    [functionsUrl, getAuthToken],
  );

  return (
    <FunctionsClientContext.Provider value={client}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </FunctionsClientContext.Provider>
  );
}

export function useFunctionsClient(): FunctionsClient {
  const client = useContext(FunctionsClientContext);
  if (!client) throw new Error('useFunctionsClient must be used inside <QueryProvider>.');
  return client;
}
