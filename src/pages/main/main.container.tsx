import { connect } from "react-redux";

import { fetchFindingsRequest } from "../../store/findings/actions";
import {
  getErrorSelector,
  getIsEmptySelector,
  getPendingSelector,
  getSelectedFindingSelector,
} from "../../store/findings/selectors";
import type { AppState } from "../../store/reducers/rootReducers";
import Main from "./main";

const mapStateToProps = (state: AppState) => ({
  pending: getPendingSelector(state),
  error: getErrorSelector(state),
  isEmpty: getIsEmptySelector(state),
  selectedFinding: getSelectedFindingSelector(state),
});

const mapDispatchToProps = {
  fetchFindings: fetchFindingsRequest,
};

export default connect(mapStateToProps, mapDispatchToProps)(Main);
