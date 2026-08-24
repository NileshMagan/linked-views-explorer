import { describe, expect, it, vi } from "vitest";

import { fireEvent, screen, waitFor, waitForElementToBeRemoved } from "@testing-library/react";

import App from "./App";
import { renderWithProviders } from "./test/test-utils";

vi.mock("fabric", () => import("./test/fabric-mock"));

/**
 * The one integration test: a real store, a real query client, a real `fetch`
 * answered by MSW, and no component mocked below App.
 *
 * The suites either side of this one each prove a single layer in isolation.
 * This proves they are actually wired to each other — the failure mode unit
 * tests cannot catch, where every part works and nothing is connected.
 */
const waitForLoad = () =>
  waitForElementToBeRemoved(() => screen.queryByText(/loading findings/i));

describe("App", () => {
  it("renders the heading", async () => {
    renderWithProviders(<App />);

    expect(
      screen.getByRole("heading", { name: /Linked Views Explorer/i })
    ).toBeInTheDocument();

    await waitForLoad();
  });

  it("fetches the first page over HTTP and renders it in both views", async () => {
    renderWithProviders(<App />);
    await waitForLoad();

    expect(screen.getByTestId("findings-canvas")).toBeInTheDocument();
    expect(screen.getAllByRole("row").length).toBeGreaterThan(0);
  });

  it("brushes across views: hovering a row names the finding", async () => {
    // The whole point of the application, exercised end to end — the table
    // reports hover, Redux holds the id, and the page resolves it against the
    // findings React Query fetched.
    renderWithProviders(<App />);
    await waitForLoad();

    const firstRow = screen.getAllByRole("row")[0];
    fireEvent.mouseEnter(firstRow);

    await waitFor(() =>
      expect(screen.getByTestId("selected-finding")).not.toHaveTextContent(
        "Nothing selected"
      )
    );
    expect(firstRow).toHaveClass("highlighted");
  });

  it("clears the brush when the pointer leaves", async () => {
    renderWithProviders(<App />);
    await waitForLoad();

    const firstRow = screen.getAllByRole("row")[0];
    fireEvent.mouseEnter(firstRow);
    fireEvent.mouseLeave(firstRow);

    await waitFor(() =>
      expect(screen.getByTestId("selected-finding")).toHaveTextContent(
        "Nothing selected"
      )
    );
  });

  it("pages through the whole dataset", async () => {
    renderWithProviders(<App />);
    await waitForLoad();

    expect(screen.getByTestId("page-status")).toHaveTextContent("Page 1 of 4");

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() =>
      expect(screen.getByTestId("page-status")).toHaveTextContent("Page 2 of 4")
    );

    // The last page is short: 26 rows at 8 per page.
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() =>
      expect(screen.getByTestId("page-status")).toHaveTextContent("Page 3 of 4")
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /next/i })).toBeDisabled()
    );
  });

  it("drops the malformed rows the fixture deliberately contains", async () => {
    // 26 rows are served across four pages; three cannot be rendered, so 23
    // findings reach the table. The parser is doing this, end to end.
    renderWithProviders(<App />);
    await waitForLoad();

    let rows = screen.queryAllByRole("row").length;
    for (let page = 2; page <= 4; page += 1) {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      // Waiting on the page number alone is not enough: it changes the instant
      // the button is clicked while the previous page is still on screen, so
      // the rows would be counted twice. "updating…" clearing is the signal
      // that the new data has actually landed.
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => {
        const status = screen.getByTestId("page-status");
        expect(status).toHaveTextContent(`Page ${page} of 4`);
        expect(status).not.toHaveTextContent("updating");
      });
      rows += screen.queryAllByRole("row").length;
    }

    expect(rows).toBe(23);
  });

  it("shows the empty state on a page whose every row was unusable", async () => {
    // The last page holds only the deliberately broken rows, so the client has
    // nothing to draw even though the server counted them in `total`. Saying
    // "no findings" is the honest outcome; pretending the page does not exist
    // would contradict the pager.
    renderWithProviders(<App />);
    await waitForLoad();

    for (let page = 2; page <= 4; page += 1) {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => {
        const status = screen.getByTestId("page-status");
        expect(status).toHaveTextContent(`Page ${page} of 4`);
        expect(status).not.toHaveTextContent("updating");
      });
    }

    expect(screen.getByText(/no findings to display/i)).toBeInTheDocument();
    // The pager stays usable, so the reader can get back.
    expect(screen.getByRole("button", { name: /previous/i })).toBeEnabled();
  });
});
