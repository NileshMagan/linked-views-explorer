import { createStore, type StoreEnhancer } from "redux";

import rootReducer from "./reducers/rootReducers";

/**
 * No middleware. Fetching moved to React Query, so the store handles only
 * synchronous client state — a thunk or saga would have nothing to do, and a
 * logging middleware would be a dependency for inspecting one number.
 *
 * The Redux DevTools extension covers that instead, and costs nothing when it
 * is not installed.
 */
type WindowWithDevTools = Window & {
  __REDUX_DEVTOOLS_EXTENSION__?: () => StoreEnhancer;
};

const devTools =
  typeof window === "undefined"
    ? undefined
    : (window as WindowWithDevTools).__REDUX_DEVTOOLS_EXTENSION__?.();

const store = import.meta.env.PROD || !devTools
  ? createStore(rootReducer)
  : createStore(rootReducer, devTools);

export type AppDispatch = typeof store.dispatch;

export default store;
