import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";

import App from "./App";
import rootReducer from "./store/reducers/rootReducers";
import { rootSaga } from "./store/sagas/rootSaga";

jest.mock("fabric", () => require("./test/fabric-mock"));

/**
 * The one integration test: a real store, real saga middleware, the real API
 * layer reading the real payload, and no component mocked below App.
 *
 * The suites either side of this one each prove a single layer in isolation.
 * This proves they are actually wired to each other — the failure mode unit
 * tests cannot catch, where every part works and nothing is connected.
 */
const renderApp = () => {
  const sagaMiddleware = createSagaMiddleware();
  const store = createStore(rootReducer, applyMiddleware(sagaMiddleware));
  sagaMiddleware.run(rootSaga);

  return {
    store,
    ...render(
      <Provider store={store}>
        <App />
      </Provider>
    ),
  };
};

describe("App", () => {
  it("renders the heading", async () => {
    renderApp();

    expect(
      screen.getByRole("heading", { name: /Linked Views Explorer/i })
    ).toBeInTheDocument();

    // The saga resolves after this assertion; awaiting it keeps that state
    // update inside `act` rather than leaking into the next test.
    await waitFor(() => expect(screen.getByText("Finding 1")).toBeInTheDocument());
  });

  it("loads the findings through the saga and renders them", async () => {
    renderApp();

    await waitFor(() =>
      expect(screen.getByText("Finding 1")).toBeInTheDocument()
    );
    expect(screen.getByText("Radial 1")).toBeInTheDocument();
  });

  it("puts every well-formed finding from the payload into the store", async () => {
    const { store } = renderApp();

    await waitFor(() =>
      expect(store.getState().findings.findings).toHaveLength(8)
    );
    expect(store.getState().findings.error).toBeNull();
    expect(store.getState().findings.pending).toBe(false);
  });

  it("normalises the string coordinate end to end", async () => {
    const { store } = renderApp();

    await waitFor(() =>
      expect(store.getState().findings.findings.length).toBeGreaterThan(0)
    );
    const finding3 = store
      .getState()
      .findings.findings.find((finding) => finding.label === "Finding 3");

    expect(finding3).toMatchObject({ y: 100 });
  });
});
