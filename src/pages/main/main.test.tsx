import { describe, expect, it, vi } from "vitest";

import { HttpResponse, http } from "msw";
import { fireEvent, screen, waitFor, waitForElementToBeRemoved } from "@testing-library/react";

import MainContainer from "./main.container";
import { FINDINGS_ENDPOINT } from "../../api/findings-api";
import { server } from "../../mocks/server";
import { makeTestQueryClient, renderWithProviders } from "../../test/test-utils";

/**
 * The page decides which of four states the user sees and owns the page
 * number. The two views are replaced with markers because what they draw is
 * their own business and is covered by their own suites — mixing them in here
 * would make this file fail for reasons that have nothing to do with the
 * decision being tested.
 */
// These are ES modules, so the factory has to return the module shape — a
// bare component would leave the import undefined.
vi.mock("../../components/canvas/canvas.container", () => ({
  default: () => <div data-testid="canvas" />,
}));
vi.mock("../../components/table/table.container", () => ({
  default: () => <div data-testid="table" />,
}));

const renderMain = (options = {}) =>
  renderWithProviders(<MainContainer />, {
    queryClient: makeTestQueryClient(),
    ...options,
  });

const waitForLoad = () =>
  waitForElementToBeRemoved(() => screen.queryByText(/loading findings/i));

describe("Main", () => {
  it("shows a loading state while the first page is in flight", () => {
    renderMain();

    expect(screen.getByRole("status")).toHaveTextContent("Loading findings");
    expect(screen.queryByTestId("canvas")).not.toBeInTheDocument();
  });

  it("renders both views once the page has loaded", async () => {
    renderMain();
    await waitForLoad();

    expect(screen.getByTestId("canvas")).toBeInTheDocument();
    expect(screen.getByTestId("table")).toBeInTheDocument();
  });

  it("shows the failure message instead of the views when the fetch failed", async () => {
    server.use(
      http.get(FINDINGS_ENDPOINT, () => new HttpResponse(null, { status: 500 }))
    );
    renderMain();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The server could not return findings right now."
    );
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
  });

  it("offers a retry that succeeds once the server recovers", async () => {
    let failing = true;
    server.use(
      http.get(FINDINGS_ENDPOINT, () => {
        if (failing) return new HttpResponse(null, { status: 500 });
        return HttpResponse.json({
          items: [{ id: 1, type: "absolute", x: 1, y: 2, label: "Recovered" }],
          page: 1, pageSize: 8, total: 1, totalPages: 1,
        });
      })
    );
    renderMain();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    failing = false;
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(screen.getByTestId("table")).toBeInTheDocument());
  });

  it("distinguishes an empty result from a failure", async () => {
    server.use(
      http.get(FINDINGS_ENDPOINT, () =>
        HttpResponse.json({ items: [], page: 1, pageSize: 8, total: 0, totalPages: 1 })
      )
    );
    renderMain();

    await waitFor(() =>
      expect(screen.getByText(/no findings to display/i)).toBeInTheDocument()
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("pages forward and asks the server for the next page", async () => {
    renderMain();
    await waitForLoad();

    expect(screen.getByTestId("page-status")).toHaveTextContent("Page 1 of 4");

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() =>
      expect(screen.getByTestId("page-status")).toHaveTextContent("Page 2 of 4")
    );
  });

  it("keeps the views on screen while the next page loads", async () => {
    // Blanking them would read as the data having gone away rather than as a
    // page turning.
    renderMain();
    await waitForLoad();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByTestId("table")).toBeInTheDocument();
    expect(screen.queryByText(/loading findings/i)).not.toBeInTheDocument();
  });

  it("clears the brushed finding when the page changes", async () => {
    // The selected finding is almost certainly not on the new page, and a
    // highlight pointing at a row that is no longer rendered is a lie.
    const { store } = renderMain({ selection: { selectedFindingId: 3 } });
    await waitForLoad();

    expect(screen.getByTestId("selected-finding")).toHaveTextContent("Finding 3");

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(store.getState().selection.selectedFindingId).toBe(0);
    expect(screen.getByTestId("selected-finding")).toHaveTextContent(
      "Nothing selected"
    );
  });

  it("names the brushed finding", async () => {
    renderMain({ selection: { selectedFindingId: 1 } });
    await waitForLoad();

    expect(screen.getByTestId("selected-finding")).toHaveTextContent("Finding 1");
  });

  it("says nothing is selected when nothing is", async () => {
    renderMain();
    await waitForLoad();

    expect(screen.getByTestId("selected-finding")).toHaveTextContent(
      "Nothing selected"
    );
  });
});
