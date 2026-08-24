import { combineReducers } from "redux";

import selectionReducer from "../selection/reducer";

const rootReducer = combineReducers({
  selection: selectionReducer,
});

export type AppState = ReturnType<typeof rootReducer>;

export default rootReducer;
