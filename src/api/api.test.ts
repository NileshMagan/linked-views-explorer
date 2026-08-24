import { API, ApiError } from "./api";
import { FINDING_RADIAL_TYPE } from "../data-structures/data";

describe("API.GetFindings", () => {
  it("resolves with normalised findings from the default source", async () => {
    const findings = await API.GetFindings();

    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]).toMatchObject({ id: 1, type: "absolute" });
  });

  it("hands back numbers even where the payload used a string", async () => {
    const findings = await API.GetFindings();
    const finding3 = findings.find((f) => f.label === "Finding 3");

    expect(finding3).toMatchObject({ y: 100 });
  });

  it("keeps radial findings intact", async () => {
    const findings = await API.GetFindings();

    expect(findings.some((f) => f.type === FINDING_RADIAL_TYPE)).toBe(true);
  });

  it("reads from the supplied source instead of the bundled payload", async () => {
    const source = jest.fn().mockResolvedValue([
      { type: "absolute", x: 1, y: 2, label: "Injected" },
    ]);

    await expect(API.GetFindings(source)).resolves.toEqual([
      { id: 1, type: "absolute", label: "Injected", note: undefined, x: 1, y: 2 },
    ]);
    expect(source).toHaveBeenCalledTimes(1);
  });

  it("wraps a transport failure in an ApiError with a message fit to show", async () => {
    const source = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(API.GetFindings(source)).rejects.toBeInstanceOf(ApiError);
    await expect(API.GetFindings(source)).rejects.toThrow(
      "Unable to load findings. Please try again."
    );
  });

  it("keeps the original failure for logging without exposing it", async () => {
    const cause = new Error("ECONNREFUSED");
    const source = jest.fn().mockRejectedValue(cause);

    await expect(API.GetFindings(source)).rejects.toMatchObject({
      originalError: cause,
    });
  });

  it("resolves empty rather than throwing when the payload is unusable", async () => {
    // An empty result is a legitimate answer; only a transport failure is an
    // error. The saga relies on that distinction.
    await expect(API.GetFindings(async () => null)).resolves.toEqual([]);
    await expect(API.GetFindings(async () => ({}))).resolves.toEqual([]);
  });
});
