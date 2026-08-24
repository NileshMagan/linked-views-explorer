import {
  FETCH_FINDINGS_REQUEST,
  FETCH_FINDINGS_SUCCESS,
  FETCH_FINDINGS_FAILURE,
  SET_SELECTED_FINDING,
} from "./actionTypes";
import type {
  FetchFindingsRequest,
  FetchFindingsSuccess,
  FetchFindingsSuccessPayload,
  FetchFindingsFailure,
  FetchFindingsFailurePayload,
  SetSelectedFinding,
  SetSelectedFindingPayload,
} from "./types";

export const fetchFindingsRequest = (): FetchFindingsRequest => ({
  type: FETCH_FINDINGS_REQUEST,
});

export const fetchFindingsSuccess = (
  payload: FetchFindingsSuccessPayload
): FetchFindingsSuccess => ({
  type: FETCH_FINDINGS_SUCCESS,
  payload,
});

export const fetchFindingsFailure = (
  payload: FetchFindingsFailurePayload
): FetchFindingsFailure => ({
  type: FETCH_FINDINGS_FAILURE,
  payload,
});

/**
 * Takes the bare id rather than a payload object because every caller is a UI
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
