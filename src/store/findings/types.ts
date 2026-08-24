import {
  FETCH_FINDINGS_REQUEST,
  FETCH_FINDINGS_SUCCESS,
  FETCH_FINDINGS_FAILURE,
  SET_SELECTED_FINDING,
} from "./actionTypes";
import type { Finding } from "../../data-structures/data";

/**
 * Sentinel for "nothing is hovered". The findings themselves are numbered from
 * 1, so 0 is free to mean no selection without reaching for null and forcing
 * every consumer to narrow.
 */
export const NO_SELECTION = 0;

export interface FindingsState {
  /** True while a fetch is in flight, so the UI can show a loading state. */
  pending: boolean;
  findings: Finding[];
  /** The id of the hovered finding, or `NO_SELECTION`. */
  selectedFindingId: number;
  /** User-facing failure message, or null when the last fetch succeeded. */
  error: string | null;
}

export interface FetchFindingsSuccessPayload {
  findings: Finding[];
}

export interface FetchFindingsFailurePayload {
  error: string;
}

export interface SetSelectedFindingPayload {
  id: number;
}

export interface FetchFindingsRequest {
  type: typeof FETCH_FINDINGS_REQUEST;
}

export interface FetchFindingsSuccess {
  type: typeof FETCH_FINDINGS_SUCCESS;
  payload: FetchFindingsSuccessPayload;
}

export interface FetchFindingsFailure {
  type: typeof FETCH_FINDINGS_FAILURE;
  payload: FetchFindingsFailurePayload;
}

export interface SetSelectedFinding {
  type: typeof SET_SELECTED_FINDING;
  payload: SetSelectedFindingPayload;
}

export type FindingsActions =
  | FetchFindingsRequest
  | FetchFindingsSuccess
  | FetchFindingsFailure
  | SetSelectedFinding;
