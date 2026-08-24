import {
  fetchFindingsFailure,
  fetchFindingsRequest,
  fetchFindingsSuccess,
  setSelectedFinding,
  setSelectedFindingId,
} from "../actions";
import {
  FETCH_FINDINGS_FAILURE,
  FETCH_FINDINGS_REQUEST,
  FETCH_FINDINGS_SUCCESS,
  SET_SELECTED_FINDING,
} from "../actionTypes";
import { makeAbsoluteFinding } from "../../../test/test-utils";

describe("findings action creators", () => {
  it("builds a request action with no payload", () => {
    expect(fetchFindingsRequest()).toEqual({ type: FETCH_FINDINGS_REQUEST });
  });

  it("carries findings on success", () => {
    const findings = [makeAbsoluteFinding()];

    expect(fetchFindingsSuccess({ findings })).toEqual({
      type: FETCH_FINDINGS_SUCCESS,
      payload: { findings },
    });
  });

  it("carries the message on failure", () => {
    expect(fetchFindingsFailure({ error: "Network unreachable" })).toEqual({
      type: FETCH_FINDINGS_FAILURE,
      payload: { error: "Network unreachable" },
    });
  });

  it("wraps a bare id for the selection action", () => {
    expect(setSelectedFindingId(4)).toEqual({
      type: SET_SELECTED_FINDING,
      payload: { id: 4 },
    });
  });

  it("produces the same action from either selection creator", () => {
    expect(setSelectedFindingId(4)).toEqual(setSelectedFinding({ id: 4 }));
  });

  it("returns a fresh object each call, so actions are never shared", () => {
    expect(fetchFindingsRequest()).not.toBe(fetchFindingsRequest());
  });
});
