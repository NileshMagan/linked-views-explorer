import { clockAngleInDegrees, radialToAbsolute } from "./coordinates";

const CENTER = { x: 250, y: 250 };
const RADIUS = 100;

/** Canvas maths is floating point; compare to the nearest pixel. */
const expectPoint = (
  actual: { x: number; y: number },
  expected: { x: number; y: number }
) => {
  expect(actual.x).toBeCloseTo(expected.x, 5);
  expect(actual.y).toBeCloseTo(expected.y, 5);
};

describe("clockAngleInDegrees", () => {
  it("measures clockwise from twelve", () => {
    expect(clockAngleInDegrees(12, 0)).toBe(0);
    expect(clockAngleInDegrees(3, 0)).toBe(90);
    expect(clockAngleInDegrees(6, 0)).toBe(180);
    expect(clockAngleInDegrees(9, 0)).toBe(270);
  });

  it("treats twelve and zero as the same bearing", () => {
    expect(clockAngleInDegrees(12, 0)).toBe(clockAngleInDegrees(0, 0));
  });

  it("adds half a degree per minute", () => {
    expect(clockAngleInDegrees(0, 30)).toBe(15);
    expect(clockAngleInDegrees(3, 30)).toBe(105);
  });

  it("wraps hours past twelve", () => {
    expect(clockAngleInDegrees(15, 0)).toBe(90);
  });
});

describe("radialToAbsolute", () => {
  // These four are the whole point of the module. A clock face puts twelve at
  // the top and three on the right; the textbook polar conversion
  // (x = cos θ, y = sin θ) puts three at the *bottom*. The original
  // implementation used the textbook form, so every radial finding was drawn
  // a quarter turn away from where its data said it was.
  it("puts twelve o'clock directly above the centre", () => {
    expectPoint(radialToAbsolute(12, 0, RADIUS, CENTER), { x: 250, y: 150 });
  });

  it("puts three o'clock directly right of the centre", () => {
    expectPoint(radialToAbsolute(3, 0, RADIUS, CENTER), { x: 350, y: 250 });
  });

  it("puts six o'clock directly below the centre", () => {
    expectPoint(radialToAbsolute(6, 0, RADIUS, CENTER), { x: 250, y: 350 });
  });

  it("puts nine o'clock directly left of the centre", () => {
    expectPoint(radialToAbsolute(9, 0, RADIUS, CENTER), { x: 150, y: 250 });
  });

  it("places a half-past bearing between its two hours", () => {
    // 3:30 is 105°: past three, so below and right of the centre.
    const point = radialToAbsolute(3, 30, RADIUS, CENTER);

    expect(point.x).toBeGreaterThan(CENTER.x);
    expect(point.y).toBeGreaterThan(CENTER.y);
    expectPoint(point, { x: 250 + 100 * Math.sin((105 * Math.PI) / 180), y: 250 - 100 * Math.cos((105 * Math.PI) / 180) });
  });

  it("keeps every bearing on the circle it was given", () => {
    const distanceFrom = (point: { x: number; y: number }) =>
      Math.hypot(point.x - CENTER.x, point.y - CENTER.y);

    for (let hours = 0; hours < 12; hours += 1) {
      expect(distanceFrom(radialToAbsolute(hours, 0, RADIUS, CENTER))).toBeCloseTo(
        RADIUS,
        5
      );
    }
  });

  it("returns the centre when the distance is zero", () => {
    expectPoint(radialToAbsolute(7, 15, 0, CENTER), CENTER);
  });
});
