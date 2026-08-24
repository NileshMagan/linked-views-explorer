import {
  parseFinding,
  parseFindings,
  toFiniteNumber,
} from "./parse-findings";
import {
  FINDING_ABSOLUTE_TYPE,
  FINDING_RADIAL_TYPE,
} from "../data-structures/data";

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
        { type: "absolute", x: 10, y: 20, label: "Finding 1", note: "A note" },
        1
      )
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
          type: "radial",
          hours: 3,
          minutes: 30,
          distanceFromCenter: 100,
          label: "Radial 1",
        },
        7
      )
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
      { type: "absolute", x: 200, y: "100", label: "Finding 3" },
      3
    );

    // Not "100" — fabric would place the marker at a nonsense offset, and
    // arithmetic on it downstream would concatenate rather than add.
    expect(finding).toMatchObject({ x: 200, y: 100 });
    expect(typeof (finding as { y: number }).y).toBe("number");
  });

  it("drops a finding with no usable label", () => {
    expect(parseFinding({ type: "absolute", x: 1, y: 2 }, 1)).toBeUndefined();
    expect(
      parseFinding({ type: "absolute", x: 1, y: 2, label: "  " }, 1)
    ).toBeUndefined();
  });

  it("drops an absolute finding missing a coordinate", () => {
    expect(
      parseFinding({ type: "absolute", x: 10, label: "No y" }, 1)
    ).toBeUndefined();
    expect(
      parseFinding({ type: "absolute", x: 10, y: "over there", label: "Bad y" }, 1)
    ).toBeUndefined();
  });

  it("drops a radial finding missing any part of its bearing", () => {
    expect(
      parseFinding(
        { type: "radial", hours: 3, distanceFromCenter: 100, label: "No minutes" },
        1
      )
    ).toBeUndefined();
  });

  it("keeps a radial finding at zero minutes, which is falsy but valid", () => {
    expect(
      parseFinding(
        {
          type: "radial",
          hours: 7,
          minutes: 0,
          distanceFromCenter: 40,
          label: "Radial 2",
        },
        1
      )
    ).toMatchObject({ minutes: 0 });
  });

  it("drops a type it does not recognise rather than guessing", () => {
    // `children` in the payload contain `type: "relative"`. Rendering one in
    // the wrong coordinate space is worse than omitting it.
    expect(
      parseFinding({ type: "relative", x: 10, y: 20, label: "Child" }, 1)
    ).toBeUndefined();
  });

  it("rejects values that are not objects", () => {
    expect(parseFinding(null, 1)).toBeUndefined();
    expect(parseFinding("finding", 1)).toBeUndefined();
    expect(parseFinding([], 1)).toBeUndefined();
  });
});

describe("parseFindings", () => {
  it("returns an empty list for a payload that is not an array", () => {
    expect(parseFindings(null)).toEqual([]);
    expect(parseFindings({ findings: [] })).toEqual([]);
    expect(parseFindings(undefined)).toEqual([]);
  });

  it("numbers findings from one", () => {
    const findings = parseFindings([
      { type: "absolute", x: 1, y: 1, label: "A" },
      { type: "absolute", x: 2, y: 2, label: "B" },
    ]);

    expect(findings.map((finding) => finding.id)).toEqual([1, 2]);
  });

  it("keeps ids contiguous when a malformed row is dropped", () => {
    // Ids index into the rendered list, so a gap would misalign the canvas
    // highlight against the table row.
    const findings = parseFindings([
      { type: "absolute", x: 1, y: 1, label: "A" },
      { type: "absolute", x: 2, label: "Broken" },
      { type: "absolute", x: 3, y: 3, label: "C" },
    ]);

    expect(findings.map((finding) => finding.label)).toEqual(["A", "C"]);
    expect(findings.map((finding) => finding.id)).toEqual([1, 2]);
  });

  it("ignores fields the application does not model", () => {
    const findings = parseFindings([
      {
        type: "absolute",
        x: 10,
        y: 20,
        label: "Finding 1",
        children: [{ type: "relative", x: 10, y: 20, label: "Child" }],
      },
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0]).not.toHaveProperty("children");
  });

  it("parses the real payload without dropping a well-formed finding", () => {
    // Guards the whole pipeline against a change to data.json that the unit
    // cases above would not notice.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const payload = require("./data.json");
    const findings = parseFindings(payload);

    expect(findings).toHaveLength(8);
    expect(findings.filter((f) => f.type === FINDING_RADIAL_TYPE)).toHaveLength(2);
    expect(findings.every((f) => typeof f.id === "number")).toBe(true);
  });
});
