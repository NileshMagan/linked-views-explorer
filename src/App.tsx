import React from "react";

import "./App.scss";
import ErrorBoundary from "./components/error-boundary/error-boundary";
import Main from "./pages/main/main.container";

/**
 * The shell. Providers are mounted in `index.tsx` so this stays renderable in
 * a test with whichever providers that test actually needs.
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
