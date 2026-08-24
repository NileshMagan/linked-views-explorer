/**
 * Shared test helpers.
 *
 * Three things live here: a way to render against real providers, factories
 * for building findings, and a query client tuned for tests. The factories
 * matter more than they look — a test that spells out a whole finding inline
 * buries the one field it actually cares about, so these default everything
 * and let each test override only what it is testing.
 */

import { type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore, type Store } from "redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import rootReducer, { type AppState } from "../store/reducers/rootReducers";
import { initialState as selectionInitialState } from "../store/selection/reducer";
import type { SelectionState } from "../store/selection/types";
import {
  FINDING_ABSOLUTE_TYPE,
  FINDING_RADIAL_TYPE,
  type AbsoluteFinding,
  type RadialFinding,
} from "../data-structures/data";

export const makeAbsoluteFinding = (
  overrides: Partial<AbsoluteFinding> = {}
): AbsoluteFinding => ({
  id: 1,
  type: FINDING_ABSOLUTE_TYPE,
  label: "Finding 1",
  note: "Lorem ipsum dolor sit amet",
  x: 10,
  y: 20,
  ...overrides,
});

export const makeRadialFinding = (
  overrides: Partial<RadialFinding> = {}
): RadialFinding => ({
  id: 2,
  type: FINDING_RADIAL_TYPE,
  label: "Radial 1",
  note: "Duis aute irure dolor",
  hours: 3,
  minutes: 0,
  distanceFromCenter: 100,
  ...overrides,
});

/** A real store, not a mock, so `connect` and the selectors are exercised. */
export const makeTestStore = (
  selection: Partial<SelectionState> = {}
): Store<AppState> =>
  createStore(rootReducer, {
    selection: { ...selectionInitialState, ...selection },
  });

/**
 * Retries are disabled: a test that exercises the failure path should fail
 * once and be done, not wait through the production retry schedule.
 */
export const makeTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  });

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  store?: Store<AppState>;
  selection?: Partial<SelectionState>;
  queryClient?: QueryClient;
}

export const renderWithProviders = (
  ui: ReactElement,
  { store, selection, queryClient, ...options }: RenderWithProvidersOptions = {}
): RenderResult & { store: Store<AppState>; queryClient: QueryClient } => {
  const testStore = store ?? makeTestStore(selection);
  const testQueryClient = queryClient ?? makeTestQueryClient();

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      <Provider store={testStore}>{children}</Provider>
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper, ...options }),
    store: testStore,
    queryClient: testQueryClient,
  };
};

/** For hooks that need the query cache but no store. */
export const queryWrapper = (queryClient: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
