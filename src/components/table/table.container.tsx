import { connect } from "react-redux";

import { setSelectedFindingId } from "../../store/selection/actions";
import { getSelectedFindingIdSelector } from "../../store/selection/selectors";
import type { AppState } from "../../store/reducers/rootReducers";
import Table from "./table";

/**
 * Only the selection comes from the store. `findings` arrives as an ownProp
 * from the page, which owns the query — so server state and client state reach
 * the view down two separate paths, and neither knows about the other.
 */
const mapStateToProps = (state: AppState) => ({
  selectedFindingId: getSelectedFindingIdSelector(state),
});

const mapDispatchToProps = {
  onFindingHover: setSelectedFindingId,
};

export default connect(mapStateToProps, mapDispatchToProps)(Table);
