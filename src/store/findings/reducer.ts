import {
  FETCH_FINDINGS_REQUEST,
  FETCH_FINDINGS_SUCCESS,
  FETCH_FINDINGS_FAILURE,
  SET_SELECTED_FINDING,
} from "./actionTypes";
import { NO_SELECTION, type FindingsActions, type FindingsState } from "./types";

export const initialState: FindingsState = {
  pending: false,
  findings: [],
  selectedFindingId: NO_SELECTION,
  error: null,
};

const findingsReducer = (
  state: FindingsState = initialState,
  action: FindingsActions
): FindingsState => {
  switch (action.type) {
    case FETCH_FINDINGS_REQUEST:
      // The previous error is cleared on request so a retry does not render a
      // stale failure alongside a fresh spinner.
      return { ...state, pending: true, error: null };

    case FETCH_FINDINGS_SUCCESS:
      return {
        ...state,
        pending: false,
        findings: action.payload.findings,
        error: null,
      };

    case FETCH_FINDINGS_FAILURE:
      // Findings are cleared so the canvas and table cannot keep drawing data
      // the app has just admitted it could not refresh.
      return {
        ...state,
        pending: false,
        findings: [],
        selectedFindingId: NO_SELECTION,
        error: action.payload.error,
      };

    case SET_SELECTED_FINDING:
      return { ...state, selectedFindingId: action.payload.id };

    default:
      return state;
  }
};

export default findingsReducer;
