import { describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { renderHook, waitFor } from "@testing-library/react";

import { findingsKeys, useFindingsPage } from "./use-findings";
import { FINDINGS_ENDPOINT } from "./findings-api";
import { createQueryClient } from "./query-client";
import { server } from "../mocks/server";
import { makeTestQueryClient, queryWrapper } from "../test/test-utils";

describe("findingsKeys", () => {
  it("builds one key per page, so pages cache separately", () => {
    expect(findingsKeys.page(1, 8)).not.toEqual(findingsKeys.page(2, 8));
  });

  it("nests every key under a shared prefix, so all pages invalidate together", () => {
    expect(findingsKeys.page(2, 8).slice(0, 1)).toEqual(findingsKeys.all);
  });

  it("is stable for the same arguments", () => {
    expect(findingsKeys.page(2, 8)).toEqual(findingsKeys.page(2, 8));
  });
});

describe("useFindingsPage", () => {
  const renderPage = (page = 1, queryClient = makeTestQueryClient()) =>
    renderHook(({ page: p }) => useFindingsPage({ page: p }), {
      initialProps: { page },
      wrapper: queryWrapper(queryClient),
    });

  it("loads the requested page", async () => {
    const { result } = renderPage();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.page).toBe(1);
    expect(result.current.data?.findings.length).toBeGreaterThan(0);
  });

  it("starts pending with no data", () => {
    const { result } = renderPage();

    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("exposes the failure message for the UI to show", async () => {
    server.use(
      http.get(FINDINGS_ENDPOINT, () => new HttpResponse(null, { status: 500 }))
    );
    const { result } = renderPage();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(
      "The server could not return findings right now. Please try again."
    );
  });

  it("keeps the previous page on screen while the next one loads", async () => {
    // Without this both views blank on every page change, which reads as the
    // data having gone away rather than as a page turning.
    const queryClient = makeTestQueryClient();
    const { result, rerender } = renderPage(1, queryClient);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstPageIds = result.current.data?.findings.map((f) => f.id);

    rerender({ page: 2 });

    expect(result.current.data?.findings.map((f) => f.id)).toEqual(firstPageIds);
    expect(result.current.isPlaceholderData).toBe(true);

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
    expect(result.current.data?.page).toBe(2);
  });

  it("serves a cached page immediately on remount, with no loading state", async () => {
    // This is what the cache buys: the second mount renders data on its very
    // first pass instead of flashing a spinner. React Query still revalidates
    // in the background — the point is that the user never waits for it.
    const queryClient = makeTestQueryClient();

    const first = renderPage(1, queryClient);
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    const cachedIds = first.result.current.data?.findings.map((f) => f.id);
    first.unmount();

    const second = renderPage(1, queryClient);

    expect(second.result.current.isPending).toBe(false);
    expect(second.result.current.data?.findings.map((f) => f.id)).toEqual(cachedIds);
  });

  it("does not refetch a page that is still fresh", async () => {
    // `staleTime` in the production client keeps a recently fetched page from
    // being re-requested on every remount.
    let requests = 0;
    server.use(
      http.get(FINDINGS_ENDPOINT, () => {
        requests += 1;
        return HttpResponse.json({
          items: [{ id: 1, type: "absolute", x: 1, y: 2, label: "A" }],
          page: 1, pageSize: 8, total: 1, totalPages: 1,
        });
      })
    );
    const queryClient = createQueryClient();

    const first = renderPage(1, queryClient);
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();

    const second = renderPage(1, queryClient);
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));

    expect(requests).toBe(1);
  });
});

describe("retry policy", () => {
  it("does not retry a client error", async () => {
    // The production client is used here rather than the test one, because the
    // policy is the thing under test.
    let attempts = 0;
    server.use(
      http.get(FINDINGS_ENDPOINT, () => {
        attempts += 1;
        return HttpResponse.json({ error: "Nope" }, { status: 400 });
      })
    );

    const { result } = renderHook(() => useFindingsPage(), {
      wrapper: queryWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(attempts).toBe(1);
  });

  it("retries a server error before giving up", async () => {
    let attempts = 0;
    server.use(
      http.get(FINDINGS_ENDPOINT, () => {
        attempts += 1;
        return new HttpResponse(null, { status: 500 });
      })
    );

    const { result } = renderHook(() => useFindingsPage(), {
      wrapper: queryWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 10_000,
    });
    expect(attempts).toBeGreaterThan(1);
  }, 15_000);
});
