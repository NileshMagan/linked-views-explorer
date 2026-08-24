/**
 * The domain model, defined as zod schemas.
 *
 * The schemas are the single source of truth: the TypeScript types are derived
 * from them with `z.infer`, so a field cannot be added to one and forgotten in
 * the other. Validation and typing stay in step by construction rather than by
 * discipline.
 *
 * The API returns findings in two shapes that share a label and a note but
 * describe their position completely differently, so `Finding` is a
 * discriminated union on `type`. That lets TypeScript prove which coordinate
 * fields are available in each branch instead of every consumer guarding
 * against combinations that cannot occur — and lets zod report a useful error
 * against the matching branch rather than a union of every failure.
 */

import { z } from "zod";

export const FINDING_ABSOLUTE_TYPE = "absolute";
export const FINDING_RADIAL_TYPE = "radial";

/**
 * Coordinates arrive as numbers on most rows and as the string `"100"` on at
 * least one. Coercing here rather than at each use site is the whole reason
 * this layer exists.
 *
 * Exported because it is the sharp edge worth testing directly: `Number("")`
 * is 0 and `Number(null)` is 0, either of which would silently place a finding
 * at the top-left corner.
 */
export const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

/** A number, or a string that unambiguously denotes one. */
const numeric = z.preprocess(
  (value) => toFiniteNumber(value) ?? value,
  z.number().finite()
);

/** Identity: a positive integer. Zero and negatives cannot name a row. */
const findingId = z.preprocess(
  (value) => toFiniteNumber(value) ?? value,
  z.number().int().positive()
);

/** Blank and whitespace-only notes are absent, not empty. */
const optionalNote = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? value : undefined),
  z.string().optional()
);

const findingBase = {
  id: findingId,
  label: z.string().trim().min(1),
  note: optionalNote,
};

export const absoluteFindingSchema = z.object({
  ...findingBase,
  type: z.literal(FINDING_ABSOLUTE_TYPE),
  /** Pixels from the top-left of the canvas. */
  x: numeric,
  y: numeric,
});

export const radialFindingSchema = z.object({
  ...findingBase,
  type: z.literal(FINDING_RADIAL_TYPE),
  /** Clock-face angle, measured from the centre of the canvas. */
  hours: numeric,
  minutes: numeric,
  distanceFromCenter: numeric,
});

/**
 * Unknown keys are stripped rather than kept: the payload nests a `children`
 * array of a type the application does not model, and carrying it forward
 * would imply something renders it.
 */
export const findingSchema = z.discriminatedUnion("type", [
  absoluteFindingSchema,
  radialFindingSchema,
]);

export type AbsoluteFinding = z.infer<typeof absoluteFindingSchema>;
export type RadialFinding = z.infer<typeof radialFindingSchema>;
export type Finding = z.infer<typeof findingSchema>;

/**
 * Narrows a `Finding` to its radial branch. Used by the canvas so the
 * coordinate conversion reads `hours`/`minutes` without a cast.
 */
export const isRadialFinding = (finding: Finding): finding is RadialFinding =>
  finding.type === FINDING_RADIAL_TYPE;

/**
 * Resolves a brushed id to the finding it names, or undefined when nothing is
 * brushed or the id refers to a finding that is no longer on the page.
 *
 * Lives here rather than in a selector because the findings are React Query's,
 * not Redux's — the store holds only the id.
 */
export const findFindingById = (
  findings: readonly Finding[],
  id: number
): Finding | undefined => findings.find((finding) => finding.id === id);
