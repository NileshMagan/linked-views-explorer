/**
 * Shared test helpers.
 *
 * Two things live here: a way to render a connected component against a real
 * store, and factories for building findings. The factories matter more than
 * they look — a test that spells out a whole finding inline buries the one
 * field it actually cares about, so these default everything and let each test
 * override only what it is testing.
 */

import React, { type ReactElement } from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore, type Store } from "redux";

import rootReducer, { type AppState } from "../store/reducers/rootReducers";
import { initialState as findingsInitialState } from "../store/findings/reducer";
import type { FindingsState } from "../store/findings/types";
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

/** A real store, not a mock, so `connect` and the selectors are exercised too. */
export const makeTestStore = (
  findings: Partial<FindingsState> = {}
): Store<AppState> =>
  createStore(rootReducer, {
    findings: { ...findingsInitialState, ...findings },
  });

interface RenderWithStoreOptions extends Omit<RenderOptions, "wrapper"> {
  store?: Store<AppState>;
  findings?: Partial<FindingsState>;
}

export const renderWithStore = (
  ui: ReactElement,
  { store, findings, ...options }: RenderWithStoreOptions = {}
): RenderResult & { store: Store<AppState> } => {
  const testStore = store ?? makeTestStore(findings);
  const result = render(ui, {
    wrapper: ({ children }) => <Provider store={testStore}>{children}</Provider>,
    ...options,
  });
  return { ...result, store: testStore };
};
