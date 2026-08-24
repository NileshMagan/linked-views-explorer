/**
 * The mock API.
 *
 * MSW intercepts at the network layer, so the application makes a genuine
 * `fetch` and receives a genuine `Response`. Nothing in `src/api` knows this
 * exists — which is the point: the same handlers back the dev server and the
 * test suite, and swapping in a real backend means deleting this folder.
 */

import { HttpResponse, http, delay } from "msw";

import findingsDb from "./findings-db.json";

export const FINDINGS_ENDPOINT = "/api/findings";
export const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 50;

export interface FindingsPageResponse {
  items: unknown[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Rejects anything that is not a positive integer, rather than coercing it. */
const readPositiveInt = (raw: string | null, fallback: number) => {
  if (raw === null) return fallback;
  if (!/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return value > 0 ? value : undefined;
};

const problem = (status: number, detail: string) =>
  HttpResponse.json({ error: detail }, { status });

export const handlers = [
  http.get(FINDINGS_ENDPOINT, async ({ request }) => {
    const url = new URL(request.url);

    const page = readPositiveInt(url.searchParams.get("page"), 1);
    const pageSize = readPositiveInt(
      url.searchParams.get("pageSize"),
      DEFAULT_PAGE_SIZE
    );

    if (page === undefined) return problem(400, "`page` must be a positive integer.");
    if (pageSize === undefined || pageSize > MAX_PAGE_SIZE) {
      return problem(400, `\`pageSize\` must be between 1 and ${MAX_PAGE_SIZE}.`);
    }

    const total = findingsDb.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (page > totalPages) return problem(404, "That page does not exist.");

    // A little latency, so loading and keep-previous-data states are real in
    // the browser rather than theoretical.
    await delay(process.env.NODE_ENV === "test" ? 0 : 300);

    const start = (page - 1) * pageSize;

    return HttpResponse.json<FindingsPageResponse>({
      items: findingsDb.slice(start, start + pageSize),
      page,
      pageSize,
      total,
      totalPages,
    });
  }),
];
