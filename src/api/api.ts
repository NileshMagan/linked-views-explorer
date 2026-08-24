/**
 * The API layer.
 *
 * `data.json` stands in for a real endpoint, as the task specifies, so the
 * transport is trivial — but the boundary it sits on is not. Everything past
 * this module works with a validated `Finding`, never with the raw payload,
 * and every failure leaves here as an `ApiError` with a message that is safe
 * to show a user.
 *
 * The data source is a parameter with a default rather than a hard import, so
 * the failure path is reachable from a test without mocking the module
 * registry. Swapping the stub for `fetch` later changes only `defaultSource`.
 */

import findingsPayload from "./data.json";
import { parseFindings } from "./parse-findings";
import type { Finding } from "../data-structures/data";

/** Raised for any failure reaching or reading the findings endpoint. */
export class ApiError extends Error {
  /** The underlying failure, kept for logging. Named to avoid clashing
   *  with the ES2022 `Error.cause` field, which is typed as `Error`. */
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = "ApiError";
    this.originalError = originalError;
    // Restores the prototype chain, which `extends Error` breaks when
    // TypeScript targets ES5 — without it `instanceof ApiError` is false.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export type FindingsSource = () => Promise<unknown>;

const defaultSource: FindingsSource = async () => findingsPayload;

export abstract class API {
  /**
   * Resolves with every finding the payload describes well enough to render.
   * Rejects with `ApiError` if the endpoint itself could not be read — a
   * distinction the saga relies on to tell "nothing to show" apart from
   * "something went wrong".
   */
  public static async GetFindings(
    source: FindingsSource = defaultSource
  ): Promise<Finding[]> {
    let payload: unknown;

    try {
      payload = await source();
    } catch (cause) {
      throw new ApiError("Unable to load findings. Please try again.", cause);
    }

    return parseFindings(payload);
  }
}
