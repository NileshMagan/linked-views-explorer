import React from "react";
import { render, screen } from "@testing-library/react";
import { act } from "react-dom/test-utils";

import Canvas from "./canvas";
import { NO_SELECTION } from "../../store/selection/types";
import {
  FINDING_FILL,
  FINDING_FILL_SELECTED,
  CANVAS_CENTER,
} from "../../constants/canvas-constants";
import { makeAbsoluteFinding, makeRadialFinding } from "../../test/test-utils";

// fabric is replaced with a recorder; see src/test/fabric-mock.ts for why.
jest.mock("fabric", () => require("../../test/fabric-mock"));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { latestScene: scene, resetFabricMock } = require("../../test/fabric-mock");

const findings = [
  makeAbsoluteFinding({ id: 1, label: "Finding 1", x: 10, y: 20 }),
  makeRadialFinding({ id: 2, label: "Radial 1", hours: 3, minutes: 0, distanceFromCenter: 100 }),
];

const renderCanvas = (
  props: Partial<React.ComponentProps<typeof Canvas>> = {}
) => {
  const onFindingHover = jest.fn();
  const result = render(
    <Canvas
      findings={findings}
      selectedFindingId={NO_SELECTION}
      onFindingHover={onFindingHover}
      {...props}
    />
  );
  return { ...result, onFindingHover };
};

beforeEach(resetFabricMock);

describe("Canvas", () => {
  it("renders a canvas element", () => {
    renderCanvas();

    expect(screen.getByTestId("findings-canvas")).toBeInTheDocument();
  });

  it("adds one marker per finding", () => {
    renderCanvas();

    expect(scene().objects).toHaveLength(2);
  });

  it("places an absolute finding at its own coordinates", () => {
    renderCanvas();

    expect(scene().objects[0].props).toMatchObject({ left: 10, top: 20 });
  });

  it("converts a radial finding to canvas coordinates", () => {
    // 3 o'clock at 100px sits directly right of the centre.
    renderCanvas();

    const marker = scene().objects[1];
    expect(marker.props.left).toBeCloseTo(CANVAS_CENTER.x + 100, 5);
    expect(marker.props.top).toBeCloseTo(CANVAS_CENTER.y, 5);
  });

  it("carries the finding id on the marker so hover can identify it", () => {
    renderCanvas();

    expect(scene().objects[1].props.data).toEqual({ findingId: 2 });
  });

  it("clears before redrawing, so a re-render does not stack duplicates", () => {
    const { rerender } = renderCanvas();

    rerender(
      <Canvas
        findings={[...findings]}
        selectedFindingId={NO_SELECTION}
        onFindingHover={jest.fn()}
      />
    );

    expect(scene().objects).toHaveLength(2);
  });

  it("reports the hovered finding's id", () => {
    const { onFindingHover } = renderCanvas();

    act(() => {
      scene().emit("mouse:over", { target: scene().objects[1] });
    });

    expect(onFindingHover).toHaveBeenCalledWith(2);
  });

  it("clears the selection when the pointer leaves a marker", () => {
    const { onFindingHover } = renderCanvas();

    act(() => {
      scene().emit("mouse:out", {});
    });

    expect(onFindingHover).toHaveBeenCalledWith(NO_SELECTION);
  });

  it("reports no selection when the pointer is over empty canvas", () => {
    const { onFindingHover } = renderCanvas();

    act(() => {
      scene().emit("mouse:over", { target: undefined });
    });

    expect(onFindingHover).toHaveBeenCalledWith(NO_SELECTION);
  });

  it("fills only the selected marker with the highlight colour", () => {
    renderCanvas({ selectedFindingId: 2 });

    const [first, second] = scene().objects;
    expect(first.getObjects!()[0].props.fill).toBe(FINDING_FILL);
    expect(second.getObjects!()[0].props.fill).toBe(FINDING_FILL_SELECTED);
  });

  it("returns a marker to its resting colour when the selection moves on", () => {
    const { rerender } = renderCanvas({ selectedFindingId: 2 });

    rerender(
      <Canvas
        findings={findings}
        selectedFindingId={1}
        onFindingHover={jest.fn()}
      />
    );

    const [first, second] = scene().objects;
    expect(first.getObjects!()[0].props.fill).toBe(FINDING_FILL_SELECTED);
    expect(second.getObjects!()[0].props.fill).toBe(FINDING_FILL);
  });

  it("disposes the fabric canvas on unmount", () => {
    // fabric attaches document-level listeners; leaking one per mount would
    // keep the whole scene alive.
    const { unmount } = renderCanvas();
    const created = scene();

    unmount();

    expect(created.disposed).toBe(true);
  });

  it("draws nothing for an empty list", () => {
    renderCanvas({ findings: [] });

    expect(scene().objects).toHaveLength(0);
  });
});
