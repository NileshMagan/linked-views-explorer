import { createStore, applyMiddleware, type Middleware } from "redux";
import logger from "redux-logger";

import rootReducer from "./reducers/rootReducers";

/**
 * No async middleware. Fetching moved to React Query, so the store handles
 * only synchronous client state and a thunk or saga would have nothing to do.
 */
const middleware: Middleware[] =
  process.env.NODE_ENV === "production" ? [] : [logger];

const store = createStore(rootReducer, applyMiddleware(...middleware));

export type AppDispatch = typeof store.dispatch;

export default store;
