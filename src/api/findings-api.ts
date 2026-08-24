/**
 * The findings endpoint.
 *
 * This is the only module that knows the app speaks HTTP. It owns three jobs
 * and nothing else: build the request, turn every failure into an `ApiError`
 * with a message fit to show a user, and hand the response to the parser so
 * everything above works with validated `Finding`s.
 *
 * In development and test the request is intercepted by MSW, but nothing here
 * is aware of that — it makes a real `fetch` and reads a real `Response`.
 */

import { z } from "zod";

import { ApiError } from "./api-error";
import { parseFindings } from "./parse-findings";
import { toFiniteNumber, type Finding } from "../data-structures/data";

export const FINDINGS_ENDPOINT = "/api/findings";
export const DEFAULT_PAGE_SIZE = 8;

export interface FindingsPage {
  findings: Finding[];
  page: number;
  pageSize: number;
  /** Rows the server holds, which may exceed the findings it could render. */
  total: number;
  totalPages: number;
}

export interface FetchFindingsParams {
  page?: number;
  pageSize?: number;
  /** Supplied by React Query so a superseded request is actually cancelled. */
  signal?: AbortSignal;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const positiveInt = z.preprocess(
  (value) => toFiniteNumber(value) ?? value,
  z.number().int().positive()
);

/**
 * The response envelope.
 *
 * Each count falls back rather than failing the whole response: a server that
 * omits `totalPages` should leave the pager able to work it out, not take the
 * page down. `items` is deliberately `unknown[]` — the rows are validated
 * individually by `parseFindings`, so one malformed finding costs that finding
 * rather than the page.
 */
const findingsPageSchema = z.object({
  items: z.array(z.unknown()).catch([]),
  page: positiveInt.optional(),
  pageSize: positiveInt.optional(),
  total: positiveInt.catch(0),
  totalPages: positiveInt.optional(),
});

/**
 * Prefers the server's own explanation when it sent one. A body it cannot read
 * is not itself worth reporting, so it falls back to a message derived from
 * the status.
 */
const messageForResponse = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as unknown;
    if (isRecord(body) && typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
  } catch {
    // Fall through to the status-derived message.
  }

  if (response.status === 404) return "Those findings could not be found.";
  if (response.status >= 500) {
    return "The server could not return findings right now. Please try again.";
  }
  return "That request for findings was not accepted.";
};

export const fetchFindingsPage = async ({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  signal,
}: FetchFindingsParams = {}): Promise<FindingsPage> => {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  let response: Response;
  try {
    response = await fetch(`${FINDINGS_ENDPOINT}?${query}`, { signal });
  } catch (originalError) {
    // An abort is React Query cancelling a superseded request, not a failure —
    // rethrow it untouched so the query layer can recognise it. Matched by
    // name rather than `instanceof DOMException`, because Node's fetch throws
    // a plain Error while browsers throw a DOMException.
    if (originalError instanceof Error && originalError.name === "AbortError") {
      throw originalError;
    }
    throw new ApiError("Could not reach the server. Check your connection.", {
      originalError,
    });
  }

  if (!response.ok) {
    throw new ApiError(await messageForResponse(response), {
      status: response.status,
    });
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (originalError) {
    throw new ApiError("The server sent a response we could not read.", {
      status: response.status,
      originalError,
    });
  }

  const envelope = findingsPageSchema.safeParse(body);
  if (!envelope.success) {
    throw new ApiError("The server sent a response we could not read.", {
      status: response.status,
      originalError: envelope.error,
    });
  }

  const resolvedPageSize = envelope.data.pageSize ?? pageSize;
  const { total } = envelope.data;

  return {
    findings: parseFindings(envelope.data.items),
    page: envelope.data.page ?? page,
    pageSize: resolvedPageSize,
    total,
    // Derived rather than trusted: a server that omits totalPages should not
    // leave the pager unable to count.
    totalPages:
      envelope.data.totalPages ?? Math.max(1, Math.ceil(total / resolvedPageSize)),
  };
};
