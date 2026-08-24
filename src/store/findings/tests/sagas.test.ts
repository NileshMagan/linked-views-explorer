import { call, put, takeLatest } from "redux-saga/effects";

import findingsSaga, { fetchFindingsSaga, toUserFacingError } from "../saga";
import { fetchFindingsFailure, fetchFindingsSuccess } from "../actions";
import { FETCH_FINDINGS_REQUEST } from "../actionTypes";
import { API, ApiError } from "../../../api/api";
import { makeAbsoluteFinding } from "../../../test/test-utils";

/** `SagaIterator` types `throw` as optional; every real generator has one. */
const throwInto = (saga: ReturnType<typeof fetchFindingsSaga>, error: unknown) =>
  (saga.throw as (e: unknown) => IteratorResult<unknown>)(error);

/**
 * redux-saga effects are plain objects describing intent, so these tests step
 * the generator and assert on what it *asked* for. Nothing is mocked and no
 * request is made — the saga's decisions are the unit under test.
 */
describe("fetchFindingsSaga", () => {
  it("asks the API for findings", () => {
    const saga = fetchFindingsSaga();

    expect(saga.next().value).toEqual(call(API.GetFindings));
  });

  it("puts the findings into the store on success", () => {
    const findings = [makeAbsoluteFinding()];
    const saga = fetchFindingsSaga();

    saga.next();
    expect(saga.next(findings).value).toEqual(
      put(fetchFindingsSuccess({ findings }))
    );
    expect(saga.next().done).toBe(true);
  });

  it("succeeds with an empty list rather than treating it as a failure", () => {
    const saga = fetchFindingsSaga();

    saga.next();
    expect(saga.next([]).value).toEqual(
      put(fetchFindingsSuccess({ findings: [] }))
    );
  });

  it("dispatches the failure message when the API rejects", () => {
    const saga = fetchFindingsSaga();

    saga.next();
    expect(throwInto(saga, new ApiError("Unable to load findings.")).value).toEqual(
      put(fetchFindingsFailure({ error: "Unable to load findings." }))
    );
  });

  it("completes after a failure, leaving the watcher able to retry", () => {
    const saga = fetchFindingsSaga();

    saga.next();
    throwInto(saga, new ApiError("Unable to load findings."));
    expect(saga.next().done).toBe(true);
  });
});

describe("toUserFacingError", () => {
  it("passes an ApiError's message through, because it was written for a user", () => {
    expect(toUserFacingError(new ApiError("Unable to load findings."))).toBe(
      "Unable to load findings."
    );
  });

  it("replaces anything else, so internals cannot reach the screen", () => {
    const generic = "Something went wrong loading findings.";

    expect(toUserFacingError(new TypeError("x.map is not a function"))).toBe(generic);
    expect(toUserFacingError("a thrown string")).toBe(generic);
    expect(toUserFacingError(undefined)).toBe(generic);
  });
});

describe("findingsSaga watcher", () => {
  it("takes only the latest request, so a slow response cannot overwrite a newer one", () => {
    const saga = findingsSaga();

    expect(saga.next().value).toEqual(
      takeLatest(FETCH_FINDINGS_REQUEST, fetchFindingsSaga)
    );
  });
});
