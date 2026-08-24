/**
 * The anti-corruption layer between the API payload and the domain model.
 *
 * The payload is not uniform: coordinates arrive as numbers on most findings
 * but as the string `"100"` on at least one, `note` is frequently absent, and
 * some findings carry a nested `children` array of a type the application does
 * not model. Rather than let each component defend itself against that,
 * everything is validated once, here, and the rest of the app consumes a
 * `Finding`.
 *
 * The rules live in the schemas (`src/data-structures/data.ts`). What this
 * module adds is the *policy*: a row that fails validation is dropped rather
 * than thrown on. One bad row in a list of findings should cost that row, not
 * the whole screen — which is why `safeParse` is used per item instead of
 * parsing the array as a whole and losing all of it to one bad element.
 */

import { z } from "zod";

import { findingSchema, type Finding } from "../data-structures/data";

/**
 * Validates one raw payload entry, or returns undefined if it cannot be
 * trusted. Unrecognised `type` values fail the discriminated union and are
 * dropped: rendering a finding in the wrong coordinate space is worse than
 * omitting it.
 */
export const parseFinding = (raw: unknown): Finding | undefined => {
  const result = findingSchema.safeParse(raw);
  return result.success ? result.data : undefined;
};

/**
 * Normalises a whole payload, dropping rows that cannot be rendered. The
 * result may therefore be shorter than the page the server reported — which is
 * the honest outcome, and why the page count comes from the server's `total`
 * rather than from `items.length`.
 */
export const parseFindings = (payload: unknown): Finding[] => {
  const rows = z.array(z.unknown()).safeParse(payload);
  if (!rows.success) return [];

  return rows.data
    .map(parseFinding)
    .filter((finding): finding is Finding => finding !== undefined);
};
