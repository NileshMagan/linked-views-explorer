/**
 * The anti-corruption layer between the API payload and the domain model.
 *
 * The payload is not uniform: coordinates arrive as numbers on most findings
 * but as the string `"100"` on at least one, `note` is frequently absent, and
 * some findings carry a nested `children` array the application does not use.
 * Rather than let each component defend itself against that, everything is
 * normalised once, here, and the rest of the app consumes a `Finding`.
 *
 * Malformed entries are dropped rather than thrown on. One bad row in a list
 * of findings should cost that row, not the whole screen.
 *
 * Identity comes from the payload's own `id`. It used to be assigned by
 * position, which was fine while the whole list arrived at once — but with
 * pagination page two would restart at 1 and collide with page one, breaking
 * the link between the two views.
 */

import {
  FINDING_ABSOLUTE_TYPE,
  FINDING_RADIAL_TYPE,
  type Finding,
} from "../data-structures/data";

/**
 * Coerces the numeric fields, which arrive as either `number` or a numeric
 * string. Anything genuinely non-numeric (null, "", "abc", NaN, Infinity)
 * returns undefined so the caller can reject the row.
 */
export const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const toLabel = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined;

const toNote = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A usable id is a positive integer; anything else cannot identify a row. */
const toId = (value: unknown): number | undefined => {
  const id = toFiniteNumber(value);
  return id !== undefined && Number.isInteger(id) && id > 0 ? id : undefined;
};

/**
 * Converts one raw payload entry into a `Finding`, or returns undefined if it
 * cannot be trusted.
 */
export const parseFinding = (raw: unknown): Finding | undefined => {
  if (!isRecord(raw)) return undefined;

  const id = toId(raw.id);
  if (id === undefined) return undefined;

  const label = toLabel(raw.label);
  if (!label) return undefined;

  const note = toNote(raw.note);

  if (raw.type === FINDING_ABSOLUTE_TYPE) {
    const x = toFiniteNumber(raw.x);
    const y = toFiniteNumber(raw.y);
    if (x === undefined || y === undefined) return undefined;
    return { id, type: FINDING_ABSOLUTE_TYPE, label, note, x, y };
  }

  if (raw.type === FINDING_RADIAL_TYPE) {
    const hours = toFiniteNumber(raw.hours);
    const minutes = toFiniteNumber(raw.minutes);
    const distanceFromCenter = toFiniteNumber(raw.distanceFromCenter);
    if (
      hours === undefined ||
      minutes === undefined ||
      distanceFromCenter === undefined
    ) {
      return undefined;
    }
    return {
      id,
      type: FINDING_RADIAL_TYPE,
      label,
      note,
      hours,
      minutes,
      distanceFromCenter,
    };
  }

  // An unrecognised `type` is dropped rather than guessed at: rendering a
  // finding in the wrong coordinate space is worse than omitting it.
  return undefined;
};

/**
 * Normalises a whole payload, dropping rows that cannot be rendered. The
 * result may therefore be shorter than the page the server reported — which is
 * the honest outcome, and why the page count comes from the server's `total`
 * rather than from `items.length`.
 */
export const parseFindings = (payload: unknown): Finding[] => {
  if (!Array.isArray(payload)) return [];

  return payload
    .map(parseFinding)
    .filter((finding): finding is Finding => finding !== undefined);
};
