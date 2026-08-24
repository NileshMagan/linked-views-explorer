import React, { useEffect, type FC } from "react";

import Canvas from "../../components/canvas/canvas.container";
import Table from "../../components/table/table.container";
import ErrorBoundary from "../../components/error-boundary/error-boundary";
import type { Finding } from "../../data-structures/data";

export interface MainProps {
  pending: boolean;
  error: string | null;
  isEmpty: boolean;
  selectedFinding?: Finding;
  fetchFindings: () => void;
}

/**
 * The page. It owns the load lifecycle and decides which of the four states
 * the user sees — loading, failed, empty, or loaded — so neither view has to
 * carry that logic twice.
 */
const Main: FC<MainProps> = ({
  pending,
  error,
  isEmpty,
  selectedFinding,
  fetchFindings,
}) => {
  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  if (pending) {
    return (
      <div className="content-container" role="status">
        Loading findings…
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-container">
        <div role="alert" className="Error">
          <p>{error}</p>
          <button type="button" onClick={() => fetchFindings()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="content-container" role="status">
        No findings to display.
      </div>
    );
  }

  return (
    <div className="content-container">
      {/* Each view gets its own boundary so a failure in the canvas still
          leaves the table readable, and vice versa. */}
      <ErrorBoundary fallback={<p role="alert">The canvas could not be drawn.</p>}>
        <Canvas />
      </ErrorBoundary>
      <ErrorBoundary fallback={<p role="alert">The table could not be shown.</p>}>
        <Table />
      </ErrorBoundary>
      <p className="SelectedFinding" data-testid="selected-finding">
        {selectedFinding ? selectedFinding.label : "Nothing selected"}
      </p>
    </div>
  );
};

export default Main;
