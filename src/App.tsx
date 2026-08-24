import React from "react";

import "./App.scss";
import ErrorBoundary from "./components/error-boundary/error-boundary";
import Main from "./pages/main/main.container";

/**
 * The shell. Data loading belongs to the page, which is connected and can
 * actually dispatch — the previous version called the action creator here and
 * discarded the resulting object without ever reaching the store.
 */
const App: React.FC = () => (
  <div className="App">
    <header>
      <h1>Linked Views Explorer</h1>
    </header>
    <ErrorBoundary>
      <Main />
    </ErrorBoundary>
  </div>
);

export default App;
