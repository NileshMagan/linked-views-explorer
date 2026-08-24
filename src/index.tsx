import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";

import "./index.css";
import App from "./App";
import { createQueryClient } from "./api/query-client";
import store from "./store/store";

const queryClient = createQueryClient();

/**
 * This project has no backend, by design — it is a front-end reference. MSW
 * answers `/api/findings` from a service worker, so the application makes a
 * real request and the network tab shows a real response; the mock lives
 * outside the app rather than inside its API layer.
 *
 * It starts in production builds too, which is unusual and deliberate: without
 * it a deployed build would have nothing to talk to. Pointing this at a real
 * server means deleting `src/mocks` and this call — nothing in `src/api`
 * changes, because nothing in `src/api` knows the mock exists.
 */
const startMockApi = async () => {
  const { worker } = await import("./mocks/browser");
  await worker.start({
    onUnhandledRequest: "bypass",
    // Resolves correctly when the app is served from a sub-path.
    serviceWorker: { url: `${process.env.PUBLIC_URL || ""}/mockServiceWorker.js` },
  });
};

startMockApi().then(() => {
  const root = ReactDOM.createRoot(document.querySelector("main") as HTMLElement);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <App />
        </Provider>
      </QueryClientProvider>
    </React.StrictMode>
  );
});
