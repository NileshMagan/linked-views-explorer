import { connect } from "react-redux";

import { setSelectedFindingId } from "../../store/findings/actions";
import {
  getFindingsSelector,
  getSelectedFindingIdSelector,
} from "../../store/findings/selectors";
import type { AppState } from "../../store/reducers/rootReducers";
import Table from "./table";

const mapStateToProps = (state: AppState) => ({
  findings: getFindingsSelector(state),
  selectedFindingId: getSelectedFindingIdSelector(state),
});

const mapDispatchToProps = {
  onFindingHover: setSelectedFindingId,
};

export default connect(mapStateToProps, mapDispatchToProps)(Table);
