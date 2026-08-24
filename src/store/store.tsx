import { createStore, applyMiddleware, type Middleware } from "redux";
import createSagaMiddleware from "redux-saga";
import logger from "redux-logger";

import rootReducer from "./reducers/rootReducers";
import { rootSaga } from "./sagas/rootSaga";

const sagaMiddleware = createSagaMiddleware();

// The logger is a development aid. Shipping it would print every action to a
// user's console and keep a reference to every state it has seen.
const middleware: Middleware[] =
  process.env.NODE_ENV === "production"
    ? [sagaMiddleware]
    : [sagaMiddleware, logger];

const store = createStore(rootReducer, applyMiddleware(...middleware));

sagaMiddleware.run(rootSaga);

export type AppDispatch = typeof store.dispatch;

export default store;
