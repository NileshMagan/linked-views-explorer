import { describe, expect, it, vi } from "vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import Pagination from "./pagination";

const renderPagination = (
  props: Partial<React.ComponentProps<typeof Pagination>> = {}
) => {
  const onPageChange = vi.fn();
  const result = render(
    <Pagination page={2} totalPages={4} onPageChange={onPageChange} {...props} />
  );
  return { ...result, onPageChange };
};

describe("Pagination", () => {
  it("says which page of how many", () => {
    renderPagination();

    expect(screen.getByTestId("page-status")).toHaveTextContent("Page 2 of 4");
  });

  it("asks for the next page", () => {
    const { onPageChange } = renderPagination();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("asks for the previous page", () => {
    const { onPageChange } = renderPagination();

    fireEvent.click(screen.getByRole("button", { name: /previous/i }));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("cannot go back from the first page", () => {
    renderPagination({ page: 1 });

    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
  });

  it("cannot go forward from the last page", () => {
    renderPagination({ page: 4 });

    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /previous/i })).toBeEnabled();
  });

  it("disables both when there is only one page", () => {
    renderPagination({ page: 1, totalPages: 1 });

    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("announces that a newer page is on its way", () => {
    // The pager keeps showing the old page number's content while the next one
    // loads, so a screen reader needs telling that it is being replaced.
    renderPagination({ isFetchingNext: true });

    expect(screen.getByTestId("page-status")).toHaveTextContent("updating");
  });

  it("says nothing extra when it is not fetching", () => {
    renderPagination();

    expect(screen.getByTestId("page-status")).not.toHaveTextContent("updating");
  });

  it("is a labelled landmark, so it can be jumped to", () => {
    renderPagination();

    expect(
      screen.getByRole("navigation", { name: /findings pages/i })
    ).toBeInTheDocument();
  });
});
