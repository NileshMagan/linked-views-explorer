import { CLEAR_SELECTION, SET_SELECTED_FINDING } from "./actionTypes";
import type {
  ClearSelection,
  SetSelectedFinding,
  SetSelectedFindingPayload,
} from "./types";

/**
 * Takes a bare id rather than a payload object because every caller is a UI
 * event handler that has only the id to hand.
 */
export const setSelectedFindingId = (id: number): SetSelectedFinding => ({
  type: SET_SELECTED_FINDING,
  payload: { id },
});

export const setSelectedFinding = (
  payload: SetSelectedFindingPayload
): SetSelectedFinding => ({
  type: SET_SELECTED_FINDING,
  payload,
});

/**
 * Distinct from selecting `NO_SELECTION` in intent, though not in effect:
 * this is "the thing that was brushed is gone", raised when the page changes.
 */
export const clearSelection = (): ClearSelection => ({ type: CLEAR_SELECTION });
