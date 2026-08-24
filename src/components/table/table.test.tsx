import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";

import Table from "./table";
import TableContainer from "./table.container";
import { NO_SELECTION } from "../../store/findings/types";
import {
  makeAbsoluteFinding,
  makeRadialFinding,
  renderWithStore,
} from "../../test/test-utils";

const findings = [
  makeAbsoluteFinding({ id: 1, label: "Finding 1", note: "First note" }),
  makeRadialFinding({ id: 2, label: "Radial 1", note: undefined }),
];

const renderTable = (props: Partial<React.ComponentProps<typeof Table>> = {}) => {
  const onFindingHover = jest.fn();
  const result = render(
    <Table
      findings={findings}
      selectedFindingId={NO_SELECTION}
      onFindingHover={onFindingHover}
      {...props}
    />
  );
  return { ...result, onFindingHover };
};

describe("Table", () => {
  it("renders a row per finding", () => {
    renderTable();

    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("Finding 1")).toBeInTheDocument();
    expect(screen.getByText("Radial 1")).toBeInTheDocument();
  });

  it("shows each finding's note", () => {
    renderTable();

    expect(screen.getByText("First note")).toBeInTheDocument();
  });

  it("renders a finding with no note without printing undefined", () => {
    renderTable();

    const row = screen.getByTestId("finding-row-2");
    expect(within(row).queryByText(/undefined/)).not.toBeInTheDocument();
  });

  it("renders nothing but an empty table body for an empty list", () => {
    renderTable({ findings: [] });

    expect(screen.queryAllByRole("row")).toHaveLength(0);
  });

  it("reports the finding's id on hover", () => {
    const { onFindingHover } = renderTable();

    fireEvent.mouseEnter(screen.getByTestId("finding-row-2"));

    expect(onFindingHover).toHaveBeenCalledWith(2);
  });

  it("clears the selection when the pointer leaves", () => {
    // The original called the handler with no argument at all, which reached
    // the reducer as `undefined` and left the canvas highlight stuck on.
    const { onFindingHover } = renderTable();

    fireEvent.mouseLeave(screen.getByTestId("finding-row-1"));

    expect(onFindingHover).toHaveBeenCalledWith(NO_SELECTION);
  });

  it("reports the same selection from the keyboard", () => {
    const { onFindingHover } = renderTable();

    fireEvent.focus(screen.getByTestId("finding-row-1"));
    expect(onFindingHover).toHaveBeenCalledWith(1);

    fireEvent.blur(screen.getByTestId("finding-row-1"));
    expect(onFindingHover).toHaveBeenLastCalledWith(NO_SELECTION);
  });

  it("highlights only the selected row", () => {
    renderTable({ selectedFindingId: 2 });

    expect(screen.getByTestId("finding-row-1")).not.toHaveClass("highlighted");
    expect(screen.getByTestId("finding-row-2")).toHaveClass("highlighted");
  });

  it("highlights nothing when the selection is cleared", () => {
    renderTable({ selectedFindingId: NO_SELECTION });

    screen
      .getAllByRole("row")
      .forEach((row) => expect(row).not.toHaveClass("highlighted"));
  });

  it("does not report hover during render", () => {
    // A previous version fired the handler from an effect on mount, which
    // dispatched a selection of 0 before the user had touched anything.
    const { onFindingHover } = renderTable();

    expect(onFindingHover).not.toHaveBeenCalled();
  });
});

describe("Table container", () => {
  it("takes its findings from the store", () => {
    renderWithStore(<TableContainer />, { findings: { findings } });

    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("dispatches the hovered finding into the store", () => {
    const { store } = renderWithStore(<TableContainer />, {
      findings: { findings },
    });

    fireEvent.mouseEnter(screen.getByTestId("finding-row-2"));

    expect(store.getState().findings.selectedFindingId).toBe(2);
  });

  it("highlights the row the store says is selected", () => {
    renderWithStore(<TableContainer />, {
      findings: { findings, selectedFindingId: 1 },
    });

    expect(screen.getByTestId("finding-row-1")).toHaveClass("highlighted");
  });
});
