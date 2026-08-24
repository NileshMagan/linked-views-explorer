import { describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";

import { ApiError } from "./api-error";
import { DEFAULT_PAGE_SIZE, FINDINGS_ENDPOINT, fetchFindingsPage } from "./findings-api";
import { server } from "../mocks/server";

/**
 * These go over the wire. MSW intercepts a real `fetch`, so what is exercised
 * is the actual request the browser would make and the actual `Response` it
 * would receive — including status codes, headers and JSON parsing.
 */
describe("fetchFindingsPage", () => {
  it("requests the first page by default", async () => {
    const page = await fetchFindingsPage();

    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(page.findings.length).toBeGreaterThan(0);
  });

  it("reports the totals the server gave it", async () => {
    const page = await fetchFindingsPage();

    expect(page.total).toBe(26);
    expect(page.totalPages).toBe(Math.ceil(26 / DEFAULT_PAGE_SIZE));
  });

  it("sends page and pageSize as query parameters", async () => {
    let seen: URL | undefined;
    server.use(
      http.get(FINDINGS_ENDPOINT, ({ request }) => {
        seen = new URL(request.url);
        return HttpResponse.json({
          items: [], page: 3, pageSize: 5, total: 26, totalPages: 6,
        });
      })
    );

    await fetchFindingsPage({ page: 3, pageSize: 5 });

    expect(seen?.searchParams.get("page")).toBe("3");
    expect(seen?.searchParams.get("pageSize")).toBe("5");
  });

  it("returns a different slice for a different page", async () => {
    const [first, second] = await Promise.all([
      fetchFindingsPage({ page: 1 }),
      fetchFindingsPage({ page: 2 }),
    ]);

    const idsOf = (page: { findings: { id: number }[] }) =>
      page.findings.map((finding) => finding.id);

    expect(idsOf(first)).not.toEqual(idsOf(second));
    expect(idsOf(first).some((id) => idsOf(second).includes(id))).toBe(false);
  });

  it("keeps ids unique across pages, so brushing cannot confuse two findings", async () => {
    const pages = await Promise.all(
      [1, 2, 3, 4].map((page) => fetchFindingsPage({ page }))
    );
    const ids = pages.flatMap((page) => page.findings.map((finding) => finding.id));

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates the payload, so a malformed row never reaches a component", async () => {
    server.use(
      http.get(FINDINGS_ENDPOINT, () =>
        HttpResponse.json({
          items: [
            { id: 1, type: "absolute", x: 1, y: 2, label: "Good" },
            { id: 2, type: "absolute", x: 1, label: "Missing y" },
          ],
          page: 1, pageSize: 8, total: 2, totalPages: 1,
        })
      )
    );

    const page = await fetchFindingsPage();

    expect(page.findings).toHaveLength(1);
    // `total` still says 2: it counts what the server holds, not what could be
    // rendered. Deriving the page count from `items.length` would be wrong.
    expect(page.total).toBe(2);
  });

  it("rejects a bad page with the server's own explanation", async () => {
    await expect(fetchFindingsPage({ page: 999 })).rejects.toMatchObject({
      status: 404,
      message: "That page does not exist.",
    });
  });

  it("rejects an invalid pageSize", async () => {
    await expect(fetchFindingsPage({ pageSize: 5_000 })).rejects.toBeInstanceOf(
      ApiError
    );
  });

  it("turns a server error into a message fit to show", async () => {
    server.use(
      http.get(FINDINGS_ENDPOINT, () => new HttpResponse(null, { status: 500 }))
    );

    await expect(fetchFindingsPage()).rejects.toMatchObject({
      status: 500,
      message: "The server could not return findings right now. Please try again.",
    });
  });

  it("turns a network failure into an ApiError with no status", async () => {
    server.use(http.get(FINDINGS_ENDPOINT, () => HttpResponse.error()));

    const error = await fetchFindingsPage().catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBeUndefined();
    expect(error.message).toBe("Could not reach the server. Check your connection.");
    // Retried, because being offline for a moment is not the same as asking
    // for something that does not exist.
    expect(error.isRetryable).toBe(true);
  });

  it("reports an unreadable body rather than throwing a parse error at the UI", async () => {
    server.use(
      http.get(FINDINGS_ENDPOINT, () =>
        HttpResponse.text("<html>not json</html>", { status: 200 })
      )
    );

    await expect(fetchFindingsPage()).rejects.toMatchObject({
      message: "The server sent a response we could not read.",
    });
  });

  it("derives totalPages when the server omits it", async () => {
    server.use(
      http.get(FINDINGS_ENDPOINT, () =>
        HttpResponse.json({ items: [], page: 1, pageSize: 10, total: 25 })
      )
    );

    expect((await fetchFindingsPage()).totalPages).toBe(3);
  });

  it("passes an abort signal through, so a superseded request is cancelled", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      fetchFindingsPage({ signal: controller.signal })
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
