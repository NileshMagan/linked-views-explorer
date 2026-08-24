import React, { useCallback, useState, type FC } from "react";

import Canvas from "../../components/canvas/canvas.container";
import Table from "../../components/table/table.container";
import Pagination from "../../components/pagination/pagination";
import ErrorBoundary from "../../components/error-boundary/error-boundary";
import { useFindingsPage } from "../../api/use-findings";
import { findFindingById } from "../../data-structures/data";

export interface MainProps {
  selectedFindingId: number;
  /** Raised when the page changes: the brushed finding is no longer on screen. */
  clearSelection: () => void;
}

/**
 * The page owns the query and the page number, and decides which of four
 * states the user sees — loading, failed, empty, or loaded — so neither view
 * has to carry that logic twice.
 *
 * The page number is local `useState` rather than store state on purpose:
 * nothing outside this component reads it, and lifting it would be ceremony.
 * The selection is the opposite case — two sibling views share it — which is
 * why that one is in Redux.
 */
const Main: FC<MainProps> = ({ selectedFindingId, clearSelection }) => {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, isPlaceholderData, refetch } =
    useFindingsPage({ page });

  const goToPage = useCallback(
    (next: number) => {
      setPage(next);
      // The selected finding almost certainly is not on the new page, and a
      // highlight pointing at a row that is no longer rendered is a lie.
      clearSelection();
    },
    [clearSelection]
  );

  if (isPending) {
    return (
      <div className="content-container" role="status">
        Loading findings…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="content-container">
        <div role="alert" className="Error">
          <p>{error.message}</p>
          <button type="button" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { findings, totalPages } = data;
  const selectedFinding = findFindingById(findings, selectedFindingId);

  return (
    <div className="content-container">
      {findings.length === 0 ? (
        <p role="status">No findings to display.</p>
      ) : (
        <div
          className="views"
          // Dimmed while a newer page is in flight, so the page still on screen
          // is not mistaken for the one that was asked for.
          data-stale={isPlaceholderData || undefined}
        >
          {/* Each view gets its own boundary so a failure in the canvas still
              leaves the table readable, and vice versa. */}
          <ErrorBoundary fallback={<p role="alert">The canvas could not be drawn.</p>}>
            <Canvas findings={findings} />
          </ErrorBoundary>
          <ErrorBoundary fallback={<p role="alert">The table could not be shown.</p>}>
            <Table findings={findings} />
          </ErrorBoundary>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        isFetchingNext={isPlaceholderData}
        onPageChange={goToPage}
      />

      <p className="SelectedFinding" data-testid="selected-finding">
        {selectedFinding ? selectedFinding.label : "Nothing selected"}
      </p>
    </div>
  );
};

export default Main;
