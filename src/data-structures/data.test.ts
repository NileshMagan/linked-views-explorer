import { describe, expect, it } from "vitest";
import { findFindingById, isRadialFinding } from "./data";
import { NO_SELECTION } from "../store/selection/types";
import { makeAbsoluteFinding, makeRadialFinding } from "../test/test-utils";

const findings = [
  makeAbsoluteFinding({ id: 1 }),
  makeRadialFinding({ id: 2 }),
];

describe("isRadialFinding", () => {
  it("narrows a radial finding", () => {
    const finding = makeRadialFinding();
    expect(isRadialFinding(finding)).toBe(true);
    // The narrowing is the point: `hours` is only reachable in this branch.
    if (isRadialFinding(finding)) expect(finding.hours).toBe(3);
  });

  it("rejects an absolute finding", () => {
    expect(isRadialFinding(makeAbsoluteFinding())).toBe(false);
  });
});

describe("findFindingById", () => {
  it("resolves an id to the finding it names", () => {
    expect(findFindingById(findings, 2)).toBe(findings[1]);
  });

  it("returns undefined when nothing is brushed", () => {
    expect(findFindingById(findings, NO_SELECTION)).toBeUndefined();
  });

  it("returns undefined when the finding is not on this page", () => {
    // Reachable between a page change and the selection being cleared.
    expect(findFindingById(findings, 99)).toBeUndefined();
  });

  it("returns undefined for an empty page", () => {
    expect(findFindingById([], 1)).toBeUndefined();
  });
});
