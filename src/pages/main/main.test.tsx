import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import Main, { type MainProps } from "./main";
import { makeAbsoluteFinding } from "../../test/test-utils";

/**
 * Main decides which of four states the user sees. The two views are replaced
 * with markers because what they draw is their own business and is covered by
 * their own suites — mixing them in here would make this file fail for reasons
 * that have nothing to do with the decision being tested.
 */
jest.mock("../../components/canvas/canvas.container", () => () => (
  <div data-testid="canvas" />
));
jest.mock("../../components/table/table.container", () => () => (
  <div data-testid="table" />
));

const renderMain = (props: Partial<MainProps> = {}) => {
  const fetchFindings = jest.fn();
  const result = render(
    <Main
      pending={false}
      error={null}
      isEmpty={false}
      fetchFindings={fetchFindings}
      {...props}
    />
  );
  return { ...result, fetchFindings };
};

describe("Main", () => {
  it("requests the findings once on mount", () => {
    const { fetchFindings } = renderMain();

    expect(fetchFindings).toHaveBeenCalledTimes(1);
  });

  it("shows a loading state while the fetch is in flight", () => {
    renderMain({ pending: true });

    expect(screen.getByRole("status")).toHaveTextContent("Loading findings");
    expect(screen.queryByTestId("canvas")).not.toBeInTheDocument();
  });

  it("shows the failure message instead of the views when the fetch failed", () => {
    renderMain({ error: "Unable to load findings. Please try again." });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to load findings. Please try again."
    );
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
  });

  it("offers a retry that asks for the findings again", () => {
    const { fetchFindings } = renderMain({ error: "Boom" });

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(fetchFindings).toHaveBeenCalledTimes(2);
  });

  it("distinguishes an empty result from a failure", () => {
    renderMain({ isEmpty: true });

    expect(screen.getByRole("status")).toHaveTextContent("No findings to display");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders both views once findings have loaded", () => {
    renderMain();

    expect(screen.getByTestId("canvas")).toBeInTheDocument();
    expect(screen.getByTestId("table")).toBeInTheDocument();
  });

  it("names the selected finding", () => {
    renderMain({ selectedFinding: makeAbsoluteFinding({ label: "Finding 4" }) });

    expect(screen.getByTestId("selected-finding")).toHaveTextContent("Finding 4");
  });

  it("says so when nothing is selected", () => {
    renderMain();

    expect(screen.getByTestId("selected-finding")).toHaveTextContent(
      "Nothing selected"
    );
  });

  it("prefers the loading state over the empty state", () => {
    // Both are true on the very first render; showing "no findings" before the
    // request has resolved would tell the user something untrue.
    renderMain({ pending: true, isEmpty: true });

    expect(screen.getByRole("status")).toHaveTextContent("Loading findings");
  });
});
