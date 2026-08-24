import React, { useEffect, useRef, useState, type FC } from "react";
import { fabric } from "fabric";

import {
  CANVAS_CENTER,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FINDING_FILL,
  FINDING_FILL_SELECTED,
  FINDING_RADIUS,
} from "../../constants/canvas-constants";
import { radialToAbsolute } from "../../helpers/coordinates";
import { isRadialFinding, type Finding } from "../../data-structures/data";
import { NO_SELECTION } from "../../store/selection/types";
import type { FindingsViewProps } from "../shared-props/findings";

/** Where a finding sits on the canvas, whichever way it described itself. */
const positionOf = (finding: Finding) =>
  isRadialFinding(finding)
    ? radialToAbsolute(
        finding.hours,
        finding.minutes,
        finding.distanceFromCenter,
        CANVAS_CENTER
      )
    : { x: finding.x, y: finding.y };

/**
 * Builds the marker for one finding: a dot, its label, and the finding's id
 * carried on the group itself. Storing the id as data rather than as a hidden
 * text child means hover can read it back directly instead of parsing it out
 * of the group's third item.
 */
const createMarker = (finding: Finding): fabric.Group => {
  const { x, y } = positionOf(finding);

  const dot = new fabric.Circle({
    radius: FINDING_RADIUS,
    fill: FINDING_FILL,
    left: 0,
    top: 0,
  });

  const label = new fabric.Text(finding.label, {
    fontFamily: "Arial",
    fontSize: 12,
    fill: "yellow",
    left: FINDING_RADIUS * 2 + 4,
    top: 0,
  });

  const marker = new fabric.Group([dot, label], {
    left: x,
    top: y,
    selectable: false,
    hasBorders: false,
    hasControls: false,
    hoverCursor: "pointer",
  });

  marker.set("data", { findingId: finding.id });
  return marker;
};

const findingIdOf = (target?: fabric.Object): number => {
  const data = target?.get("data") as { findingId?: number } | undefined;
  return data?.findingId ?? NO_SELECTION;
};

/**
 * The canvas view of the findings.
 *
 * fabric owns imperative objects that live outside React's tree, so this
 * component is a thin adapter: effects push declarative props into the fabric
 * scene, and every effect cleans up what it created.
 */
const Canvas: FC<FindingsViewProps> = ({
  findings,
  selectedFindingId,
  onFindingHover,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState<fabric.Canvas | null>(null);
  // Hover fires on every mouse move; keeping the callback in a ref lets the
  // fabric listeners be attached once instead of being torn down and rebound
  // whenever the parent re-renders with a new closure.
  const onFindingHoverRef = useRef(onFindingHover);
  onFindingHoverRef.current = onFindingHover;

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    const created = new fabric.Canvas(canvasRef.current, {
      selection: false,
    });
    setScene(created);

    return () => {
      setScene(null);
      created.dispose();
    };
  }, []);

  useEffect(() => {
    if (!scene) return undefined;

    const handleOver = (event: fabric.IEvent) =>
      onFindingHoverRef.current(findingIdOf(event.target));
    const handleOut = () => onFindingHoverRef.current(NO_SELECTION);

    scene.on("mouse:over", handleOver);
    scene.on("mouse:out", handleOut);

    return () => {
      scene.off("mouse:over", handleOver);
      scene.off("mouse:out", handleOut);
    };
  }, [scene]);

  // Redrawing clears first: without it a second render of the same findings
  // stacks a duplicate set of markers on top of the originals.
  useEffect(() => {
    if (!scene) return;

    scene.clear();
    findings.forEach((finding) => scene.add(createMarker(finding)));
    scene.renderAll();
  }, [scene, findings]);

  // Highlighting is a repaint, not a rebuild, so it is a separate effect from
  // the one that creates the markers.
  useEffect(() => {
    if (!scene) return;

    scene.getObjects().forEach((marker) => {
      const dot = (marker as fabric.Group).getObjects?.()[0];
      dot?.set({
        fill:
          findingIdOf(marker) === selectedFindingId
            ? FINDING_FILL_SELECTED
            : FINDING_FILL,
      });
    });
    scene.renderAll();
  }, [scene, selectedFindingId, findings]);

  return (
    <div className="Canvas">
      <h2>Canvas</h2>
      <div className="CanvasWrapper">
        <canvas
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          ref={canvasRef}
          data-testid="findings-canvas"
        />
      </div>
    </div>
  );
};

export default Canvas;
