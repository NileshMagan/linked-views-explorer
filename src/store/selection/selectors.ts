/**
 * The store's read API. Components ask questions here rather than reaching
 * into state shape, so the shape can change without touching a component.
 *
 * Nothing is memoised, because nothing is derived — the slice holds one
 * number. Wrapping a plain field read in `createSelector` costs a cache slot
 * and buys nothing.
 */

import type { AppState } from "../reducers/rootReducers";

export const getSelectedFindingIdSelector = (state: AppState): number =>
  state.selection.selectedFindingId;
