/**
 * The single error type the API layer throws.
 *
 * It carries two things the UI genuinely needs and cannot recover otherwise:
 * a `message` already written for a person, and the HTTP `status` — absent
 * when the request never reached a server at all. `isRetryable` reads that
 * status so the retry policy lives with the error rather than being
 * re-derived at every call site.
 */
export class ApiError extends Error {
  /** HTTP status, or undefined for a network-level failure. */
  readonly status?: number;
  /** The underlying failure, kept for logging and never shown. */
  readonly originalError?: unknown;

  constructor(
    message: string,
    options: { status?: number; originalError?: unknown } = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.originalError = options.originalError;
    // `extends Error` breaks the prototype chain when TypeScript targets ES5;
    // without this `instanceof ApiError` is false.
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * A 4xx means the request itself was wrong — asking again unchanged will
   * fail the same way. A 5xx or a network failure may well be transient.
   */
  get isRetryable(): boolean {
    if (this.status === undefined) return true;
    return this.status >= 500;
  }
}
