import {
  getErrorSelector,
  getFindingsSelector,
  getIsEmptySelector,
  getPendingSelector,
  getSelectedFindingIdSelector,
  getSelectedFindingSelector,
} from "../selectors";
import { initialState } from "../reducer";
import { NO_SELECTION, type FindingsState } from "../types";
import type { AppState } from "../../reducers/rootReducers";
import { makeAbsoluteFinding, makeRadialFinding } from "../../../test/test-utils";

const findings = [
  makeAbsoluteFinding({ id: 1, label: "Finding 1" }),
  makeRadialFinding({ id: 2, label: "Radial 1" }),
];

const stateWith = (findingsState: Partial<FindingsState> = {}): AppState => ({
  findings: { ...initialState, ...findingsState },
});

describe("simple field selectors", () => {
  it("reads each field off the slice", () => {
    const state = stateWith({
      findings,
      pending: true,
      error: "Boom",
      selectedFindingId: 2,
    });

    expect(getFindingsSelector(state)).toBe(findings);
    expect(getPendingSelector(state)).toBe(true);
    expect(getErrorSelector(state)).toBe("Boom");
    expect(getSelectedFindingIdSelector(state)).toBe(2);
  });
});

describe("getSelectedFindingSelector", () => {
  it("resolves the id to the finding it names", () => {
    expect(
      getSelectedFindingSelector(stateWith({ findings, selectedFindingId: 2 }))
    ).toEqual(findings[1]);
  });

  it("returns undefined when nothing is selected", () => {
    expect(
      getSelectedFindingSelector(
        stateWith({ findings, selectedFindingId: NO_SELECTION })
      )
    ).toBeUndefined();
  });

  it("returns undefined when the id names a finding that is gone", () => {
    // Reachable if a fetch resolves while a row is hovered.
    expect(
      getSelectedFindingSelector(stateWith({ findings, selectedFindingId: 99 }))
    ).toBeUndefined();
  });

  it("returns the same reference for an unchanged state", () => {
    // This is what the memoisation buys: a connected component comparing props
    // by reference does not re-render when an unrelated part of the store moves.
    const state = stateWith({ findings, selectedFindingId: 2 });

    expect(getSelectedFindingSelector(state)).toBe(
      getSelectedFindingSelector(state)
    );
  });

  it("recomputes when the selection changes", () => {
    expect(
      getSelectedFindingSelector(stateWith({ findings, selectedFindingId: 1 }))
    ).toEqual(findings[0]);
    expect(
      getSelectedFindingSelector(stateWith({ findings, selectedFindingId: 2 }))
    ).toEqual(findings[1]);
  });
});

describe("getIsEmptySelector", () => {
  it("is true only once a fetch has completed with nothing to show", () => {
    expect(getIsEmptySelector(stateWith({ findings: [] }))).toBe(true);
  });

  it("is false while still loading", () => {
    // An empty list mid-flight is "not yet", not "nothing".
    expect(getIsEmptySelector(stateWith({ findings: [], pending: true }))).toBe(
      false
    );
  });

  it("is false when the fetch failed", () => {
    // A failure has its own message; showing "no findings" would misreport it.
    expect(getIsEmptySelector(stateWith({ findings: [], error: "Boom" }))).toBe(
      false
    );
  });

  it("is false when there are findings", () => {
    expect(getIsEmptySelector(stateWith({ findings }))).toBe(false);
  });
});
