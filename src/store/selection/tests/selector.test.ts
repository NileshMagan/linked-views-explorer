import { getSelectedFindingIdSelector } from "../selectors";
import { initialState } from "../reducer";
import { NO_SELECTION } from "../types";
import type { AppState } from "../../reducers/rootReducers";

const stateWith = (selectedFindingId: number): AppState => ({
  selection: { ...initialState, selectedFindingId },
});

describe("getSelectedFindingIdSelector", () => {
  it("reads the selected id off the slice", () => {
    expect(getSelectedFindingIdSelector(stateWith(3))).toBe(3);
  });

  it("reports the sentinel when nothing is selected", () => {
    expect(getSelectedFindingIdSelector(stateWith(NO_SELECTION))).toBe(NO_SELECTION);
  });
});
