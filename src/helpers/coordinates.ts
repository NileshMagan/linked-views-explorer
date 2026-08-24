/**
 * Geometry for radial findings.
 *
 * Kept separate from the canvas component because it is the only genuinely
 * tricky logic in the view layer, and inside a component that talks to fabric
 * it could only be verified by looking at the screen.
 */

export interface Point {
  x: number;
  y: number;
}

/** A clock face is 360° over 12 hours, and 30° over 60 minutes. */
const DEGREES_PER_HOUR = 360 / 12;
const DEGREES_PER_MINUTE = 30 / 60;
const DEGREES_TO_RADIANS = Math.PI / 180;

/**
 * Converts a clock-face bearing to degrees clockwise from twelve o'clock.
 * Hours wrap, so 12:00 and 0:00 describe the same direction.
 */
export const clockAngleInDegrees = (hours: number, minutes: number): number =>
  ((hours % 12) * DEGREES_PER_HOUR + minutes * DEGREES_PER_MINUTE + 360) % 360;

/**
 * Places a radial finding on the canvas.
 *
 * The mapping is `x = sin θ`, `y = -cos θ` rather than the more familiar
 * `x = cos θ`, `y = sin θ`, because θ is measured clockwise from twelve
 * o'clock (straight up) while the canvas measures y downward from the top
 * left. Using the textbook form here rotates every radial finding by 90° —
 * three o'clock lands at the bottom of the canvas instead of the right.
 */
export const radialToAbsolute = (
  hours: number,
  minutes: number,
  distanceFromCenter: number,
  center: Point
): Point => {
  const radians = clockAngleInDegrees(hours, minutes) * DEGREES_TO_RADIANS;
  return {
    x: center.x + distanceFromCenter * Math.sin(radians),
    y: center.y - distanceFromCenter * Math.cos(radians),
  };
};
