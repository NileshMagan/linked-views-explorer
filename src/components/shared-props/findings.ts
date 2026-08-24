import type { Finding } from "../../data-structures/data";

/**
 * The props the canvas and the table both take. They render the same data two
 * ways and report hover the same way, so sharing one contract keeps them
 * interchangeable from the page's point of view.
 */
export interface FindingsViewProps {
  findings: Finding[];
  /** Id of the hovered finding, or `NO_SELECTION`. */
  selectedFindingId: number;
  /** Called with a finding's id on hover, and `NO_SELECTION` on leave. */
  onFindingHover: (id: number) => void;
}
