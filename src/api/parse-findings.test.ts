import { describe, expect, it } from "vitest";
import { parseFinding, parseFindings } from "./parse-findings";
import {
  FINDING_ABSOLUTE_TYPE,
  FINDING_RADIAL_TYPE,
  toFiniteNumber,
} from "../data-structures/data";
import payload from "../mocks/findings-db.json";

describe("toFiniteNumber", () => {
  it("passes numbers through", () => {
    expect(toFiniteNumber(10)).toBe(10);
    expect(toFiniteNumber(0)).toBe(0);
    expect(toFiniteNumber(-5.5)).toBe(-5.5);
  });

  it("coerces numeric strings, because the payload mixes both", () => {
    // The real data.json has `"y": "100"` on one finding and plain numbers on
    // every other. This is the reason this module exists.
    expect(toFiniteNumber("100")).toBe(100);
    expect(toFiniteNumber(" 42 ")).toBe(42);
  });

  it("rejects anything that is not a finite number", () => {
    expect(toFiniteNumber("abc")).toBeUndefined();
    expect(toFiniteNumber("")).toBeUndefined();
    expect(toFiniteNumber("   ")).toBeUndefined();
    expect(toFiniteNumber(null)).toBeUndefined();
    expect(toFiniteNumber(undefined)).toBeUndefined();
    expect(toFiniteNumber(NaN)).toBeUndefined();
    expect(toFiniteNumber(Infinity)).toBeUndefined();
    expect(toFiniteNumber({})).toBeUndefined();
  });
});

describe("parseFinding", () => {
  it("reads an absolute finding", () => {
    expect(
      parseFinding(
        { id: 1, type: "absolute", x: 10, y: 20, label: "Finding 1", note: "A note" })
    ).toEqual({
      id: 1,
      type: FINDING_ABSOLUTE_TYPE,
      label: "Finding 1",
      note: "A note",
      x: 10,
      y: 20,
    });
  });

  it("reads a radial finding", () => {
    expect(
      parseFinding(
        {
          id: 7,
          type: "radial",
          hours: 3,
          minutes: 30,
          distanceFromCenter: 100,
          label: "Radial 1",
        })
    ).toEqual({
      id: 7,
      type: FINDING_RADIAL_TYPE,
      label: "Radial 1",
      note: undefined,
      hours: 3,
      minutes: 30,
      distanceFromCenter: 100,
    });
  });

  it("normalises a coordinate that arrived as a string", () => {
    const finding = parseFinding(
      { id: 3, type: "absolute", x: 200, y: "100", label: "Finding 3" });

    // Not "100" — fabric would place the marker at a nonsense offset, and
    // arithmetic on it downstream would concatenate rather than add.
    expect(finding).toMatchObject({ x: 200, y: 100 });
    expect(typeof (finding as { y: number }).y).toBe("number");
  });

  it("drops a finding with no usable label", () => {
    expect(parseFinding({ id: 1, type: "absolute", x: 1, y: 2 })).toBeUndefined();
    expect(
      parseFinding({ id: 1, type: "absolute", x: 1, y: 2, label: "  " })
    ).toBeUndefined();
  });

  it("drops an absolute finding missing a coordinate", () => {
    expect(
      parseFinding({ id: 1, type: "absolute", x: 10, label: "No y" })
    ).toBeUndefined();
    expect(
      parseFinding({ id: 1, type: "absolute", x: 10, y: "over there", label: "Bad y" })
    ).toBeUndefined();
  });

  it("drops a radial finding missing any part of its bearing", () => {
    expect(
      parseFinding(
        { id: 1, type: "radial", hours: 3, distanceFromCenter: 100, label: "No minutes" })
    ).toBeUndefined();
  });

  it("keeps a radial finding at zero minutes, which is falsy but valid", () => {
    expect(
      parseFinding(
        {
          id: 1,
          type: "radial",
          hours: 7,
          minutes: 0,
          distanceFromCenter: 40,
          label: "Radial 2",
        })
    ).toMatchObject({ minutes: 0 });
  });

  it("drops a type it does not recognise rather than guessing", () => {
    // `children` in the payload contain `type: "relative"`. Rendering one in
    // the wrong coordinate space is worse than omitting it.
    expect(
      parseFinding({ id: 1, type: "relative", x: 10, y: 20, label: "Child" })
    ).toBeUndefined();
  });

  it("rejects values that are not objects", () => {
    expect(parseFinding(null)).toBeUndefined();
    expect(parseFinding("finding")).toBeUndefined();
    expect(parseFinding([])).toBeUndefined();
  });
});

describe("parseFindings", () => {
  it("returns an empty list for a payload that is not an array", () => {
    expect(parseFindings(null)).toEqual([]);
    expect(parseFindings({ findings: [] })).toEqual([]);
    expect(parseFindings(undefined)).toEqual([]);
  });

  it("takes identity from the payload rather than from position", () => {
    // Positional ids were fine while the whole list arrived at once. With
    // pagination, page two would restart at 1 and collide with page one.
    const findings = parseFindings([
      { id: 17, type: "absolute", x: 1, y: 1, label: "A" },
      { id: 18, type: "absolute", x: 2, y: 2, label: "B" },
    ]);

    expect(findings.map((finding) => finding.id)).toEqual([17, 18]);
  });

  it("drops a row with no usable id, since nothing could identify it", () => {
    expect(
      parseFindings([
        { type: "absolute", x: 1, y: 1, label: "No id" },
        { id: 0, type: "absolute", x: 1, y: 1, label: "Zero" },
        { id: -3, type: "absolute", x: 1, y: 1, label: "Negative" },
        { id: 1.5, type: "absolute", x: 1, y: 1, label: "Fractional" },
      ])
    ).toEqual([]);
  });

  it("keeps the surviving rows when one is malformed", () => {
    const findings = parseFindings([
      { id: 1, type: "absolute", x: 1, y: 1, label: "A" },
      { id: 2, type: "absolute", x: 2, label: "Broken" },
      { id: 3, type: "absolute", x: 3, y: 3, label: "C" },
    ]);

    expect(findings.map((finding) => finding.label)).toEqual(["A", "C"]);
    expect(findings.map((finding) => finding.id)).toEqual([1, 3]);
  });

  it("ignores fields the application does not model", () => {
    const findings = parseFindings([
      {
        id: 1,
        type: "absolute",
        x: 10,
        y: 20,
        label: "Finding 1",
        children: [{ id: 9, type: "relative", x: 10, y: 20, label: "Child" }],
      },
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0]).not.toHaveProperty("children");
  });

  it("parses the fixture the mock API serves", () => {
    // Guards the whole pipeline against a change to the dataset that the unit
    // cases above would not notice.
    const findings = parseFindings(payload);

    // The fixture holds 26 rows with four deliberate defects, but only three
    // are fatal: the row whose `y` is the string "100" is recovered by
    // coercion, which is exactly what this layer is for.
    expect(payload).toHaveLength(26);
    expect(findings).toHaveLength(23);
    expect(findings.filter((f) => f.type === FINDING_RADIAL_TYPE)).toHaveLength(6);
    expect(new Set(findings.map((f) => f.id)).size).toBe(findings.length);
  });
});
