import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "./api-error";

/**
 * Defaults chosen deliberately rather than inherited.
 *
 * The important one is `retry`: React Query retries three times by default,
 * which for a 400 or a 404 means waiting through three guaranteed failures
 * before the user is told anything. `ApiError.isRetryable` already knows the
 * difference, so the policy defers to it.
 */
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof ApiError && !error.isRetryable) return false;
          return failureCount < 2;
        },
        // Findings do not change while the user is looking at them, so
        // refetching on every window focus is noise.
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  });
