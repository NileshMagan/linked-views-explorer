/**
 * The query layer: React Query owns server state.
 *
 * Server state is not client state. It is fetched, shared, cached, and can go
 * stale without anyone touching it — which is why it used to need a saga, an
 * action per outcome, and a reducer branch each. React Query models those
 * outcomes directly, so what remains here is the cache key and the policy.
 *
 * The brushing selection stays in Redux, because it is genuinely client state:
 * it is owned by this browser tab and no server has an opinion about it.
 */

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { DEFAULT_PAGE_SIZE, fetchFindingsPage } from "./findings-api";

/**
 * One place that builds cache keys, so an invalidation cannot miss a query by
 * spelling its key slightly differently.
 */
export const findingsKeys = {
  all: ["findings"] as const,
  page: (page: number, pageSize: number) =>
    [...findingsKeys.all, "page", { page, pageSize }] as const,
};

export interface UseFindingsPageOptions {
  page?: number;
  pageSize?: number;
}

export const useFindingsPage = ({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseFindingsPageOptions = {}) =>
  useQuery({
    queryKey: findingsKeys.page(page, pageSize),
    // The signal is forwarded so moving through pages quickly cancels the
    // requests left behind instead of letting them land out of order.
    queryFn: ({ signal }) => fetchFindingsPage({ page, pageSize, signal }),

    // Paging keeps the previous page on screen while the next one loads,
    // rather than blanking both views. `isPlaceholderData` lets the UI dim
    // itself so the stale page is not mistaken for the new one.
    placeholderData: keepPreviousData,
  });
