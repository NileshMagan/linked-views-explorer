import { call, put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { API, ApiError } from "../../api/api";
import type { Finding } from "../../data-structures/data";
import { fetchFindingsFailure, fetchFindingsSuccess } from "./actions";
import { FETCH_FINDINGS_REQUEST } from "./actionTypes";

const GENERIC_ERROR = "Something went wrong loading findings.";

/**
 * Only `ApiError` carries a message written for a user. Anything else is a
 * programming fault whose message could leak internals, so it is replaced.
 */
export const toUserFacingError = (error: unknown): string => {
  if (error instanceof ApiError) return error.message;
  return GENERIC_ERROR;
};

export function* fetchFindingsSaga(): SagaIterator {
  try {
    const findings: Finding[] = yield call(API.GetFindings);
    yield put(fetchFindingsSuccess({ findings }));
  } catch (error) {
    yield put(fetchFindingsFailure({ error: toUserFacingError(error) }));
  }
}

/**
 * `takeLatest` rather than `takeEvery`: if a second load starts before the
 * first resolves, the earlier response is stale and its result would race the
 * newer one into the store.
 */
export default function* findingsSaga(): SagaIterator {
  yield takeLatest(FETCH_FINDINGS_REQUEST, fetchFindingsSaga);
}
