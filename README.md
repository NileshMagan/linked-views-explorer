# Linked Views Explorer

A small React + TypeScript application demonstrating **brushing and linking** —
the information-visualisation technique where one dataset is shown in several
coordinated views, and selecting an item in any view highlights its counterpart
in all the others.

Here the same set of findings is drawn twice: spatially, as markers on a canvas,
and tabularly, as rows in a table. Hovering either view is the *brush*; the
highlight that appears in the other view is the *link*.

It is deliberately small. The point is not the feature set but the structure
around it: where validation lives, how shared state is managed, how failure is
handled, and what each layer's tests are actually for. Every decision below is
written down with the reasoning, because a choice you cannot justify is not a
standard.

```
React 18 · TypeScript · Vite · Vitest · TanStack Query · Redux · zod · MSW
135 tests · 15 suites · 98.2% statements · 100% functions
```

## What it does

A finding is a labelled point. They arrive from an endpoint in two shapes:

- **Absolute** findings carry `x` and `y` in pixels from the canvas's top-left.
- **Radial** findings carry `hours`, `minutes` and `distanceFromCenter` — a
  clock-face bearing measured from the centre of the canvas.

Both render as labelled markers. Hovering a table row highlights the matching
marker; hovering a marker highlights the matching row. That shared selection is
the reason the application has a store at all — see
[State management](#state-management).

Findings are served a page at a time by a mock API. There is no backend and
that is deliberate: this is a front-end reference, so the server is
[MSW](https://mswjs.io) intercepting a real `fetch` at the network layer.
Nothing in `src/api` knows the mock exists — pointing it at a real server means
deleting `src/mocks`.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

No `--legacy-peer-deps`, no overrides, no postinstall patching.

| Script | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Typecheck, then production build |
| `npm run preview` | Serve the production build |
| `npm test` | Runs the suite once |
| `npm run test:watch` | Re-runs on change |
| `npm run test:ui` | Vitest's browser UI |
| `npm run test:coverage` | Coverage against the 90% threshold |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | Typecheck + tests — what CI would run |

---

# Design decisions

## Layering

```
src/
├── api/                  the network boundary — the only place HTTP exists
│   ├── findings-api.ts   builds the request, normalises every failure
│   ├── api-error.ts      the one error type, and the retry policy
│   ├── parse-findings.ts applies the schemas, drops what it cannot render
│   ├── use-findings.ts   React Query hooks and cache keys
│   └── query-client.ts   cache defaults
├── mocks/                MSW handlers + the fixture they serve
├── data-structures/      zod schemas; the types are inferred from them
├── store/                redux — client state only
│   └── selection/        actionTypes · actions · reducer · selectors · types
├── components/           presentational + a .container.tsx that connects it
├── pages/                composition, the query, and the load lifecycle
└── helpers/              pure logic extracted out of components to be testable
```

Two rules the layout enforces:

1. **Data is validated once, at the boundary.** Everything above `src/api`
   works with a `Finding`; no component defends itself against a missing field.
2. **Server state and client state travel separately.** They reach a view down
   two different paths and neither knows about the other.

## The domain model is a schema

The types are not written by hand. `src/data-structures/data.ts` defines zod
schemas and derives the TypeScript types from them with `z.infer`, so the
validator and the type are the same declaration — a field cannot be added to
one and forgotten in the other.

Findings arrive in two shapes. An absolute finding has `x`/`y`; a radial one
has `hours`/`minutes`/`distanceFromCenter`. Modelling that as one type with six
optional fields would make every consumer guard against combinations that can
never occur, so it is a `z.discriminatedUnion` on `type`. That buys two things:
the compiler proves which coordinates exist in each branch, and zod reports a
failure against the matching branch rather than a union of every possible
error. `isRadialFinding` is the one place that narrowing happens.

Unknown keys are stripped rather than kept — the payload nests a `children`
array of a type the application does not model, and carrying it forward would
imply something renders it.

## The API layer

`src/api` is the only part of the app that knows it speaks HTTP. It owns three
jobs:

**Build the request.** `fetchFindingsPage({ page, pageSize, signal })` puts the
paging into query parameters and forwards React Query's `AbortSignal`, so
clicking through pages quickly cancels the requests left behind instead of
letting them land out of order.

**Turn every failure into one type.** `ApiError` carries a message already
written for a person and, when there was a response, its status. That status is
not decoration — `isRetryable` reads it, so a 400 is not retried (asking again
unchanged fails identically) while a 500 or a dropped connection is. The retry
policy lives with the error rather than being re-derived at each call site.

The failure modes are enumerated rather than assumed: network unreachable, 4xx
with a server-supplied explanation, 5xx, a body that is not JSON, and a body
that is JSON but not the shape promised. Each has a test.

**Validate.** The payload is not uniform. One finding carries `"y": "100"` as a
string while every other uses numbers, several omit `note`, and one nests a
`children` array of a third type the app does not model.

The rules live in the schemas; `parse-findings.ts` owns the *policy*. It calls
`safeParse` **per row** rather than parsing the array as a whole, because
parsing the array would lose every finding to one bad element. A row that fails
is dropped — one bad finding should cost that finding, not the screen.

Coercion is explicit rather than `z.coerce.number()`, which accepts `null`,
`""` and `true` and turns each into a number. `""` becoming `0` would silently
place a finding in the top-left corner, which is worse than dropping the row.

The response envelope has its own schema, where the counts `.catch()` a
fallback instead of failing: a server that omits `totalPages` should leave the
pager able to work it out, not take the page down.

Identity comes from the payload's own `id`. It used to be assigned by position,
which was fine while the whole list arrived at once; pagination broke that,
because page two would restart at 1 and collide with page one. Brushing matches
on identity, so colliding ids would have highlighted the wrong finding.

One consequence is worth stating plainly: `total` counts rows the *server*
holds, not findings the client could render, so the page count comes from the
server rather than from `items.length`. The last page of the fixture holds only
malformed rows, so it renders the empty state — honest, and pinned by a test.

<a name="state-management"></a>

## Server state and client state are different problems

The store used to hold the findings, with a saga to fetch them, three actions
for the outcomes, and a reducer branch each. That was a lot of machinery to
re-implement caching, loading flags and error handling by hand.

Server state is not client state. It is fetched, shared between views, cached,
and can go stale without anyone touching it. **React Query owns it.** What
remains is the cache key and the policy — retry, `staleTime`, and
`keepPreviousData` so paging does not blank both views while the next page
loads.

**Redux keeps the brushing selection**, because that genuinely is client state:
owned by this tab, and no server has an opinion about it. It is also the one
thing two sibling views share, which is the whole reason a store exists here.
Lifting it out is what would make adding a third linked view a matter of
subscribing.

The page number is neither — it is local `useState` in the page component,
because nothing else reads it. State lives at the lowest level that needs it.

Those two paths meet in the containers: `findings` arrives as an ownProp from
the page that owns the query, `selectedFindingId` comes from the store, and the
view is handed both without knowing where either came from.

- **Container/presenter.** `table.tsx` is pure and prop-driven;
  `table.container.tsx` holds the `connect`. That split is what makes the views
  testable without a store, and why they could be dropped into Storybook
  unchanged.
- **Selectors are the store's read API**, so state shape can change without
  touching a component. Nothing is memoised, because nothing is derived — the
  slice holds one number, and wrapping a field read in `createSelector` costs a
  cache slot and buys nothing.
- **The reducer returns the same object** when the id has not moved. Hover
  fires on every pointer move, so re-selecting the row already under the cursor
  must not cost a render.

## Error handling

Four mechanisms, because they catch different things:

| | Catches | Shows |
|---|---|---|
| `ApiError` | Network, HTTP status, unreadable body | A message written for a person |
| Retry policy | Transient server failures | Nothing — it just succeeds |
| Four-state render in `main.tsx` | loading · failed · empty · loaded | The right one, never two |
| `ErrorBoundary` | Render-time throws | A fallback, per view |

An empty result is not a failure and does not share its treatment, which is why
the API layer resolves with `[]` rather than rejecting when a page has nothing
to render.

The boundary is not decoration. The canvas hands coordinates to fabric.js — a
third-party imperative library drawing to a context the browser can refuse to
provide — and React unmounts the *entire* tree on an uncaught render error, so
without it a single bad finding would take the table down too. Each view gets
its own boundary, so one failing leaves the other readable.

## Testing

`npm run verify` typechecks and runs 135 tests across 15 suites in about six
seconds. Coverage is enforced at 90% by a `thresholds` block: a floor that
fails the build when a change lands without the test that should have come with
it — not a target to optimise.

The runner is **Vitest**, which matters more than it sounds. This suite ran on
Jest first, and MSW v2 intercepts at the Fetch API level while jsdom ships no
`fetch`, `Request`, `Response` or streams — so it needed a 40-line polyfill
file, a `transformIgnorePatterns` regex listing every ESM-only package MSW
pulls in, and a Babel transform for `node_modules`. One of those polyfills
(`MessagePort`, which React's scheduler picks up as `MessageChannel`) made the
suite pass every test and then hang forever.

Vitest transforms with Vite, which is ESM-native, and supplies those primitives
itself. All of that configuration is deleted, not replaced.

The suites are deliberately different in kind:

- **Pure logic** (`parse-findings`, `coordinates`, `data`) — plain input and
  output, no React, no network.
- **The API layer over real HTTP.** MSW intercepts a genuine `fetch`, so what
  is exercised is the actual request the browser would make and the actual
  `Response` it would receive — status codes, headers, JSON parsing and all.
  Individual tests override a handler to force a 500, a malformed body or a
  dropped connection.
- **The query layer** — cache keys, that a cached page renders with no loading
  state, that a fresh page is not refetched, that the previous page stays on
  screen while the next loads, and that the retry policy tells 4xx and 5xx
  apart.
- **Store** (`actions`, `reducer`, `selectors`) — including that the reducer
  returns the *same object* when nothing changed, since a new one would notify
  every subscriber.
- **Components** — behaviour through the DOM via Testing Library, never
  snapshots. A snapshot would have passed just as happily on every bug listed
  below.
- **One integration test** (`App.test.tsx`) — real store, real query client,
  real `fetch`, nothing mocked below `App`. It pages through the whole dataset
  and brushes across both views. This catches the failure unit tests cannot:
  every part working and nothing wired together.

fabric.js is replaced by a recorder (`src/test/fabric-mock.ts`) because jsdom
has no 2D context — and because the thing worth asserting is *what the
component asks fabric to do*, not the pixels it would produce. The `vi.mock`
factory returns that module directly, so the mock the component receives and
the helpers the test reads it back through are the same instance.

Test names state the behaviour and, where it is not obvious, a comment states
why it matters. `keeps ids unique across pages, so brushing cannot confuse two
findings` is a requirement; `test api` is not.

## Bugs this structure surfaced

Extracting logic so it could be tested is what found these — worth recording,
because it is the argument for the structure:

1. **Radial findings were drawn a quarter-turn out of place.** The conversion
   used the textbook polar form (`x = cos θ`, `y = sin θ`), but θ is measured
   clockwise from twelve o'clock while canvas y runs downward. Three o'clock
   rendered at the bottom of the canvas instead of the right. The correct
   mapping is `x = sin θ`, `y = -cos θ`. Invisible by eye; obvious the moment
   the function had a name and four assertions.
2. **Hover never cleared.** The table called its handler with no argument, so
   `undefined` reached the reducer and the highlight stuck on.
3. **An action creator was called without being dispatched** — it built an
   object and discarded it.
4. **Re-rendering stacked duplicate markers**, because the canvas added findings
   without clearing first.
5. **`pending` and `error` were in the store but nothing rendered them.** There
   was no loading state, no failure state and no retry.
6. **Ids would have collided across pages.** They were assigned by position in
   the payload, so page two restarted at 1. Since brushing matches on identity,
   hovering row 1 of page two would have highlighted whatever page one had put
   there. Caught by asking the obvious question of the new feature — *do these
   ids stay unique?* — which is now a test.

## What would come next

- **Storybook** for the presentational components — they are already pure and
  prop-driven, so this is configuration rather than refactoring.
- **The page number in the URL**, so a page is linkable and survives a reload.
  `?page=2` is the natural home for it; it is local state today.
- **Sorting the table.** Cheap to add, because brushing matches on identity
  rather than position — rows can reorder without the canvas link breaking.
- **Virtualise the table** if pages could ever be large.
- **Prefetch the next page** on hover of the Next button; React Query has
  `prefetchQuery` and the cache key factory already supports it.
- **Lazy-load the canvas.** fabric.js is most of the main bundle, and the table
  alone is a usable view — `React.lazy` would defer it. MSW already
  code-splits itself out via its dynamic import.
