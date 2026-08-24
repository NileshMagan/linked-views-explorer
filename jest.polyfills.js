/**
 * Polyfills required before the test framework loads.
 *
 * MSW v2 intercepts at the Fetch API level, but jsdom ships no `fetch`,
 * `Request`, `Response` or streams. These come from undici — the same
 * implementation Node itself uses — so the request the app makes in a test is
 * the request it would make in a browser.
 *
 * `setupFiles` rather than `setupFilesAfterEnv`: these must exist before
 * anything imports msw.
 */
const { TextDecoder, TextEncoder } = require("node:util");
const {
  ReadableStream,
  TransformStream,
  WritableStream,
} = require("node:stream/web");
const { Blob, File } = require("node:buffer");

const define = (entries) => {
  Object.entries(entries).forEach(([name, value]) => {
    Object.defineProperty(globalThis, name, {
      value,
      writable: true,
      configurable: true,
    });
  });
};

const v8 = require("node:v8");

// Order matters: undici reads TextDecoder and MessagePort at import time, so
// these have to be in place before it is required.
define({ TextDecoder, TextEncoder });
define({ ReadableStream, TransformStream, WritableStream });
// undici reads MessagePort at import time and jsdom does not expose one.
//
// MessageChannel is deliberately left undefined. React's scheduler prefers it
// when present, and a Node MessagePort re-refs itself the moment an onmessage
// handler is attached — so Jest would run the whole suite, pass, and then hang
// forever on a handle nothing can close. Without it React falls back to
// setTimeout, which is the right scheduler for a test run anyway.
if (typeof globalThis.MessagePort === "undefined") {
  define({ MessagePort: require("node:worker_threads").MessagePort });
}

// jsdom omits structuredClone; undici and msw both expect it.
if (typeof globalThis.structuredClone === "undefined") {
  define({ structuredClone: (value) => v8.deserialize(v8.serialize(value)) });
}

const { fetch, FormData, Headers, Request, Response } = require("undici");

define({ Blob, File, fetch, FormData, Headers, Request, Response });

// msw's WebSocket support reads BroadcastChannel at import time. Node's
// implementation depends on MessagePort, which is why it is defined after it.
if (typeof globalThis.BroadcastChannel === "undefined") {
  define({ BroadcastChannel: require("node:worker_threads").BroadcastChannel });
}
