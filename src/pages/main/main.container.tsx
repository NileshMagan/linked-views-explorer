import { connect } from "react-redux";

import { clearSelection } from "../../store/selection/actions";
import { getSelectedFindingIdSelector } from "../../store/selection/selectors";
import type { AppState } from "../../store/reducers/rootReducers";
import Main from "./main";

const mapStateToProps = (state: AppState) => ({
  selectedFindingId: getSelectedFindingIdSelector(state),
});

const mapDispatchToProps = {
  clearSelection,
};

export default connect(mapStateToProps, mapDispatchToProps)(Main);
