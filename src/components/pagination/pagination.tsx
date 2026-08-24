import { type FC } from "react";

import "./pagination.scss";

export interface PaginationProps {
  page: number;
  totalPages: number;
  /** True while the next page is loading and a stale one is still shown. */
  isFetchingNext?: boolean;
  onPageChange: (page: number) => void;
}

/**
 * Presentational pager. It reports the page it wants and is told which page it
 * is on — it never derives that itself, so the query and the control cannot
 * disagree about which page is current.
 */
const Pagination: FC<PaginationProps> = ({
  page,
  totalPages,
  isFetchingNext = false,
  onPageChange,
}) => {
  const canGoBack = page > 1;
  const canGoForward = page < totalPages;

  return (
    <nav className="Pagination" aria-label="Findings pages">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={!canGoBack}
      >
        Previous
      </button>

      <span aria-live="polite" data-testid="page-status">
        Page {page} of {totalPages}
        {/* Announced rather than shown as a spinner, so a screen reader is
            told the stale page is being replaced. */}
        {isFetchingNext ? " · updating…" : ""}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={!canGoForward}
      >
        Next
      </button>
    </nav>
  );
};

export default Pagination;
