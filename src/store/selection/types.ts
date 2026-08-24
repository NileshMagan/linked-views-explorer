import { CLEAR_SELECTION, SET_SELECTED_FINDING } from "./actionTypes";

/**
 * Sentinel for "nothing is brushed". Findings are numbered from 1, so 0 is
 * free to mean no selection without forcing every consumer to narrow a null.
 */
export const NO_SELECTION = 0;

/**
 * Client state, and only client state.
 *
 * The findings themselves are server state and live in the React Query cache.
 * What is left here is the one thing no server has an opinion about: which
 * finding this browser tab is currently pointing at.
 */
export interface SelectionState {
  selectedFindingId: number;
}

export interface SetSelectedFindingPayload {
  id: number;
}

export interface SetSelectedFinding {
  type: typeof SET_SELECTED_FINDING;
  payload: SetSelectedFindingPayload;
}

export interface ClearSelection {
  type: typeof CLEAR_SELECTION;
}

export type SelectionActions = SetSelectedFinding | ClearSelection;
