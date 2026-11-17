import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '../services/api';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Retry transient failures only; a 4xx will not succeed on retry.
        retry: (failureCount, error) => {
          const status = isApiError(error) ? error.response?.status : undefined;
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
      },
    },
  });
}
