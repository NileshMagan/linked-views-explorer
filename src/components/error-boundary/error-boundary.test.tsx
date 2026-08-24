import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

import { render, screen } from "@testing-library/react";

import ErrorBoundary from "./error-boundary";

const Boom = (): JSX.Element => {
  throw new Error("Canvas context unavailable");
};

describe("ErrorBoundary", () => {
  // These tests throw on purpose. React logs caught render errors to the
  // console and jsdom re-reports them as uncaught window errors, so a passing
  // suite would be full of red that means nothing. Both are silenced only for
  // the duration of this file.
  let consoleError: MockInstance;
  const swallow = (event: Event) => event.preventDefault();

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    window.addEventListener("error", swallow);
  });

  afterEach(() => {
    consoleError.mockRestore();
    window.removeEventListener("error", swallow);
  });

  it("renders its children while nothing has thrown", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    );

    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("shows the default fallback when a child throws", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
  });

  it("prefers a supplied fallback", () => {
    render(
      <ErrorBoundary fallback={<p role="alert">The canvas could not be drawn.</p>}>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The canvas could not be drawn."
    );
  });

  it("reports the error so a real deployment can log it", () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <Boom />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe("Canvas context unavailable");
  });

  it("contains the failure instead of taking its siblings down", () => {
    // This is the whole reason the boundary exists: React unmounts the entire
    // tree on an uncaught render error, so without it a broken canvas would
    // also erase the table.
    render(
      <div>
        <ErrorBoundary fallback={<p>Canvas failed</p>}>
          <Boom />
        </ErrorBoundary>
        <p>Table still here</p>
      </div>
    );

    expect(screen.getByText("Canvas failed")).toBeInTheDocument();
    expect(screen.getByText("Table still here")).toBeInTheDocument();
  });
});
