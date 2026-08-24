// jest-dom's custom matchers: toBeInTheDocument, toHaveClass, and friends.
import "@testing-library/jest-dom";

import { server } from "./mocks/server";

/**
 * The mock API runs for every test.
 *
 * `onUnhandledRequest: "error"` is deliberate: a request nobody wrote a
 * handler for is a test quietly hitting the network, and it should fail loudly
 * rather than time out.
 */
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Handlers a single test overrode are reset, so no test inherits another's
// idea of what the server does.
afterEach(() => server.resetHandlers());

afterAll(() => server.close());
