/**
 * The domain model.
 *
 * The API returns findings in two shapes that share a label and a note but
 * describe their position completely differently, so `Finding` is a
 * discriminated union on `type`. That lets TypeScript prove which coordinate
 * fields are available in each branch instead of every consumer guarding with
 * optional chaining against fields that can never be set.
 */

export const FINDING_ABSOLUTE_TYPE = "absolute";
export const FINDING_RADIAL_TYPE = "radial";

interface FindingBase {
  /** Assigned by the API layer; the payload has no identifier of its own. */
  id: number;
  label: string;
  note?: string;
}

export interface AbsoluteFinding extends FindingBase {
  type: typeof FINDING_ABSOLUTE_TYPE;
  /** Pixels from the top-left of the canvas. */
  x: number;
  y: number;
}

export interface RadialFinding extends FindingBase {
  type: typeof FINDING_RADIAL_TYPE;
  /** Clock-face angle, measured from the centre of the canvas. */
  hours: number;
  minutes: number;
  distanceFromCenter: number;
}

export type Finding = AbsoluteFinding | RadialFinding;

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
