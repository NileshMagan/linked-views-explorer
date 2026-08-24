import { describe, expect, it } from "vitest";
import { clearSelection, setSelectedFinding, setSelectedFindingId } from "../actions";
import { CLEAR_SELECTION, SET_SELECTED_FINDING } from "../actionTypes";

describe("selection action creators", () => {
  it("wraps a bare id", () => {
    expect(setSelectedFindingId(4)).toEqual({
      type: SET_SELECTED_FINDING,
      payload: { id: 4 },
    });
  });

  it("produces the same action from either selection creator", () => {
    expect(setSelectedFindingId(4)).toEqual(setSelectedFinding({ id: 4 }));
  });

  it("builds a clear action with no payload", () => {
    expect(clearSelection()).toEqual({ type: CLEAR_SELECTION });
  });

  it("returns a fresh object each call, so actions are never shared", () => {
    expect(clearSelection()).not.toBe(clearSelection());
  });
});
