import { describe, expect, it } from "vitest";
import { ApiError } from "./api-error";

describe("ApiError", () => {
  it("is recognisable with instanceof despite the ES5 target", () => {
    // `extends Error` breaks the prototype chain when TypeScript downlevels;
    // the constructor restores it, and the retry policy depends on this.
    expect(new ApiError("Boom")).toBeInstanceOf(ApiError);
    expect(new ApiError("Boom")).toBeInstanceOf(Error);
  });

  it("keeps the original failure without exposing it in the message", () => {
    const originalError = new TypeError("fetch failed");
    const error = new ApiError("Could not reach the server.", { originalError });

    expect(error.message).toBe("Could not reach the server.");
    expect(error.originalError).toBe(originalError);
  });

  describe("isRetryable", () => {
    it("retries a network failure, which has no status", () => {
      expect(new ApiError("Offline").isRetryable).toBe(true);
    });

    it("retries a server error, which may be transient", () => {
      expect(new ApiError("Boom", { status: 500 }).isRetryable).toBe(true);
      expect(new ApiError("Boom", { status: 503 }).isRetryable).toBe(true);
    });

    it("does not retry a client error, which would fail identically", () => {
      // Asking again unchanged after a 400 or 404 just makes the user wait
      // through guaranteed failures before being told anything.
      expect(new ApiError("Bad page", { status: 400 }).isRetryable).toBe(false);
      expect(new ApiError("Gone", { status: 404 }).isRetryable).toBe(false);
      expect(new ApiError("Nope", { status: 422 }).isRetryable).toBe(false);
    });
  });
});
