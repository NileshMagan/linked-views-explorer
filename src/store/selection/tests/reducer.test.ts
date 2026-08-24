import selectionReducer, { initialState } from "../reducer";
import { clearSelection, setSelectedFindingId } from "../actions";
import { NO_SELECTION, type SelectionState } from "../types";

describe("selection reducer", () => {
  it("starts with nothing selected", () => {
    expect(selectionReducer(undefined, { type: "@@INIT" } as never)).toEqual({
      selectedFindingId: NO_SELECTION,
    });
  });

  it("returns the same state object for an unknown action", () => {
    // Identity matters: a new object would notify every subscriber and
    // re-render the app on any action this slice does not handle.
    const state = { ...initialState };
    expect(selectionReducer(state, { type: "SOMETHING_ELSE" } as never)).toBe(state);
  });

  it("records the selected finding", () => {
    expect(selectionReducer(initialState, setSelectedFindingId(2))).toEqual({
      selectedFindingId: 2,
    });
  });

  it("returns the same state when the id has not moved", () => {
    // Hover fires on every pointer move, so re-selecting the row already under
    // the cursor must not cost a render.
    const state: SelectionState = { selectedFindingId: 2 };
    expect(selectionReducer(state, setSelectedFindingId(2))).toBe(state);
  });

  it("treats zero as clearing the selection", () => {
    const state: SelectionState = { selectedFindingId: 2 };
    expect(selectionReducer(state, setSelectedFindingId(NO_SELECTION))).toEqual({
      selectedFindingId: NO_SELECTION,
    });
  });

  it("clears an active selection", () => {
    const state: SelectionState = { selectedFindingId: 7 };
    expect(selectionReducer(state, clearSelection())).toEqual({
      selectedFindingId: NO_SELECTION,
    });
  });

  it("is a no-op when clearing nothing", () => {
    const state: SelectionState = { selectedFindingId: NO_SELECTION };
    expect(selectionReducer(state, clearSelection())).toBe(state);
  });

  it("never mutates the state it was given", () => {
    const state: SelectionState = { selectedFindingId: 1 };
    const snapshot = JSON.stringify(state);

    selectionReducer(state, setSelectedFindingId(9));
    selectionReducer(state, clearSelection());

    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
