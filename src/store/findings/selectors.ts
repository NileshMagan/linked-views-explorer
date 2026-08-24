/**
 * Selectors are the read API of the store. Components ask questions here
 * rather than reaching into state shape directly, so the shape can change
 * without touching a component.
 *
 * Only derived values are wrapped in `createSelector`. Memoising a plain field
 * read costs a cache slot and buys nothing, so the simple lookups are exported
 * as the bare functions they are.
 */

import { createSelector } from "reselect";
import type { AppState } from "../reducers/rootReducers";
import { NO_SELECTION } from "./types";
import type { Finding } from "../../data-structures/data";

export const getFindingsSelector = (state: AppState): Finding[] =>
  state.findings.findings;

export const getPendingSelector = (state: AppState): boolean =>
  state.findings.pending;

export const getErrorSelector = (state: AppState): string | null =>
  state.findings.error;

export const getSelectedFindingIdSelector = (state: AppState): number =>
  state.findings.selectedFindingId;

/**
 * The hovered finding itself, or undefined when nothing is hovered. Memoised
 * because it searches the list: without it every unrelated store update would
 * hand subscribers a fresh result and re-render them.
 */
export const getSelectedFindingSelector = createSelector(
  [getFindingsSelector, getSelectedFindingIdSelector],
  (findings, selectedFindingId): Finding | undefined =>
    selectedFindingId === NO_SELECTION
      ? undefined
      : findings.find((finding) => finding.id === selectedFindingId)
);

/**
 * True only when a completed fetch returned nothing, so the UI can tell an
 * empty result apart from a page that has not loaded yet or has failed.
 */
export const getIsEmptySelector = createSelector(
  [getFindingsSelector, getPendingSelector, getErrorSelector],
  (findings, pending, error) => !pending && error === null && findings.length === 0
);
