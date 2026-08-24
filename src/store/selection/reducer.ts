import { CLEAR_SELECTION, SET_SELECTED_FINDING } from "./actionTypes";
import { NO_SELECTION, type SelectionActions, type SelectionState } from "./types";

export const initialState: SelectionState = {
  selectedFindingId: NO_SELECTION,
};

const selectionReducer = (
  state: SelectionState = initialState,
  action: SelectionActions
): SelectionState => {
  switch (action.type) {
    case SET_SELECTED_FINDING:
      // Returning the same object when the id has not moved keeps hover, which
      // fires on every pointer move, from notifying subscribers needlessly.
      if (state.selectedFindingId === action.payload.id) return state;
      return { ...state, selectedFindingId: action.payload.id };

    case CLEAR_SELECTION:
      if (state.selectedFindingId === NO_SELECTION) return state;
      return { ...state, selectedFindingId: NO_SELECTION };

    default:
      return state;
  }
};

export default selectionReducer;
