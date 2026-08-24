import findingsReducer, { initialState } from "../reducer";
import {
  fetchFindingsFailure,
  fetchFindingsRequest,
  fetchFindingsSuccess,
  setSelectedFindingId,
} from "../actions";
import { NO_SELECTION, type FindingsState } from "../types";
import { makeAbsoluteFinding, makeRadialFinding } from "../../../test/test-utils";

const findings = [makeAbsoluteFinding(), makeRadialFinding()];

describe("findings reducer", () => {
  it("starts empty and idle", () => {
    expect(findingsReducer(undefined, { type: "@@INIT" } as never)).toEqual({
      pending: false,
      findings: [],
      selectedFindingId: NO_SELECTION,
      error: null,
    });
  });

  it("returns the same state object for an unknown action", () => {
    // Identity matters: a new object here would notify every subscriber and
    // re-render the app on any action the slice does not handle.
    const state = { ...initialState };
    expect(findingsReducer(state, { type: "SOMETHING_ELSE" } as never)).toBe(state);
  });

  it("marks a request pending", () => {
    expect(findingsReducer(initialState, fetchFindingsRequest())).toMatchObject({
      pending: true,
    });
  });

  it("clears a previous error when a new request starts", () => {
    // Otherwise a retry renders a spinner and a stale failure at once.
    const failed: FindingsState = { ...initialState, error: "It broke" };

    expect(findingsReducer(failed, fetchFindingsRequest()).error).toBeNull();
  });

  it("stores findings on success and stops pending", () => {
    const pending: FindingsState = { ...initialState, pending: true };

    expect(findingsReducer(pending, fetchFindingsSuccess({ findings }))).toEqual({
      pending: false,
      findings,
      selectedFindingId: NO_SELECTION,
      error: null,
    });
  });

  it("clears a stale error on success", () => {
    const failed: FindingsState = { ...initialState, error: "It broke" };

    expect(findingsReducer(failed, fetchFindingsSuccess({ findings })).error).toBeNull();
  });

  it("clears findings and the selection on failure", () => {
    // The views must not keep drawing data the app has just failed to refresh,
    // and a selection pointing into a list that no longer exists is a bug
    // waiting to be indexed.
    const loaded: FindingsState = {
      ...initialState,
      findings,
      selectedFindingId: 2,
    };

    expect(findingsReducer(loaded, fetchFindingsFailure({ error: "Boom" }))).toEqual({
      pending: false,
      findings: [],
      selectedFindingId: NO_SELECTION,
      error: "Boom",
    });
  });

  it("records the selected finding", () => {
    expect(findingsReducer(initialState, setSelectedFindingId(2))).toMatchObject({
      selectedFindingId: 2,
    });
  });

  it("treats zero as clearing the selection", () => {
    const selected: FindingsState = { ...initialState, selectedFindingId: 2 };

    expect(
      findingsReducer(selected, setSelectedFindingId(NO_SELECTION))
    ).toMatchObject({ selectedFindingId: NO_SELECTION });
  });

  it("never mutates the state it was given", () => {
    const state: FindingsState = { ...initialState, findings: [] };
    const snapshot = JSON.stringify(state);

    findingsReducer(state, fetchFindingsSuccess({ findings }));
    findingsReducer(state, setSelectedFindingId(3));
    findingsReducer(state, fetchFindingsFailure({ error: "Boom" }));

    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
