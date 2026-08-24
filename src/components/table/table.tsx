import React, { type FC } from "react";
import classnames from "classnames";

import "./table.scss";
import { NO_SELECTION } from "../../store/findings/types";
import type { FindingsViewProps } from "../shared-props/findings";

/**
 * The tabular view of the findings.
 *
 * Presentational and fully controlled: hover is reported upward and the
 * highlight comes back down as `selectedFindingId`. Keeping the selection in
 * one place is what lets hovering a row light up the matching shape on the
 * canvas — a local `useState` here could only ever highlight this view.
 */
const Table: FC<FindingsViewProps> = ({
  findings,
  selectedFindingId,
  onFindingHover,
}) => (
  <div className="Table">
    <h2>Findings</h2>
    <table className="FindingsTable">
      <tbody>
        {findings.map((finding) => (
          <tr
            key={finding.id}
            className={classnames({
              highlighted: finding.id === selectedFindingId,
            })}
            onMouseEnter={() => onFindingHover(finding.id)}
            onMouseLeave={() => onFindingHover(NO_SELECTION)}
            // Hover is a pointer-only affordance, so the row is also focusable
            // and reports the same selection from the keyboard.
            tabIndex={0}
            onFocus={() => onFindingHover(finding.id)}
            onBlur={() => onFindingHover(NO_SELECTION)}
            data-testid={`finding-row-${finding.id}`}
          >
            <td>{finding.label}</td>
            <td>{finding.note ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default Table;
