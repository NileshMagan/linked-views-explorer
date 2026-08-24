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
113 tests · 12 suites · 99.67% statements · 100% functions
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

## Getting started

```bash
npm install
npm start          # http://localhost:3000
```

| Script | Does |
| --- | --- |
| `npm start` | Development server |
| `npm run build` | Production build |
| `npm test` | Runs the suite once |
| `npm run test:watch` | Re-runs on change |
| `npm run test:coverage` | Coverage against the 90% threshold |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | Typecheck + tests — what CI would run |

---

# Design decisions

## Layering

```
src/
├── api/                  transport + validation; the only place raw payload exists
│   ├── api.ts            fetches, wraps failures in ApiError
│   └── parse-findings.ts payload → domain model (pure)
├── data-structures/      the domain model: Finding, a discriminated union
├── store/                redux; one folder per slice
│   └── findings/         actionTypes · actions · reducer · saga · selectors · types
├── components/           presentational + a .container.tsx that connects it
├── pages/                composition and load lifecycle
└── helpers/              pure logic extracted out of components to be testable
```

The rule the layout enforces: **data is validated once, at the boundary, and
everything above it works with a `Finding`.** No component defends itself
against a missing field.

## The domain model is a discriminated union

Modelling two shapes as one type with six optional fields would make every
consumer guard against combinations that can never occur.
`Finding = AbsoluteFinding | RadialFinding` lets the compiler prove which
coordinates exist in each branch, and `isRadialFinding` is the single place that
narrowing happens.

## The API layer validates, and distinguishes two kinds of nothing

The payload is not uniform. One finding carries `"y": "100"` as a string while
every other uses numbers, several omit `note`, and one nests a `children` array
of a third type the application does not model. `parse-findings.ts` normalises
all of it: coordinates are coerced, unusable rows are dropped rather than thrown
on — one bad finding should cost that finding, not the screen — and ids are
assigned after filtering so they stay contiguous.

`API.GetFindings` separates *"the endpoint failed"* from *"the endpoint returned
nothing"*. The first rejects with an `ApiError` carrying a message written for a
user; the second resolves with `[]`. The saga and the UI both depend on that
distinction, which is why an empty result is not an error state.

Its data source is an injected parameter with a default rather than a hard
import, so the failure path is reachable from a test without mocking the module
registry.

<a name="state-management"></a>

## State management

Redux with `redux-saga` and `reselect`. The store exists for one concrete
reason: brushing is a *shared* selection. Hovering a row in the table has to
highlight a shape on the canvas, so the selected id belongs to neither sibling
component and cannot live in either one. Lifting it to a store is what makes
adding a third linked view a matter of subscribing to it.

- **Sagas, not thunks.** `takeLatest` is the reason — if a second load starts
  before the first resolves, the stale response must not race the newer one into
  the store. Effects are also plain objects, so the saga's decisions are tested
  by stepping the generator with nothing mocked.
- **Selectors are the store's read API.** Components ask questions here rather
  than reaching into state shape, so the shape can change without touching a
  component. Only *derived* values are memoised with `createSelector` — wrapping
  a plain field read costs a cache slot and buys nothing.
- **Container/presenter.** `table.tsx` is pure and prop-driven;
  `table.container.tsx` holds the `connect`. That split is what makes the views
  testable without a store, and it is why the presentational components could be
  dropped into Storybook unchanged.

## Error handling

Three distinct mechanisms, because they catch different things:

| | Catches | Shows |
|---|---|---|
| `ApiError` + saga | Transport and parse failures | Message + a retry button |
| Four-state render in `main.tsx` | loading · failed · empty · loaded | The right one, never two |
| `ErrorBoundary` | Render-time throws | A fallback, per view |

The boundary is not decoration. The canvas hands coordinates to fabric.js — a
third-party imperative library drawing to a context the browser can refuse to
provide — and React unmounts the *entire* tree on an uncaught render error, so
without it a single bad finding would take the table down too. Each view gets
its own boundary, so one failing leaves the other readable.

## Testing

`npm run verify` typechecks and runs 113 tests across 12 suites. Coverage is
enforced at 90% by a `coverageThreshold`: a floor that fails the build when a
change lands without the test that should have come with it — not a target to
optimise.

The suites are deliberately different in kind:

- **Pure logic** (`parse-findings`, `coordinates`) — plain input and output, no
  React, no store.
- **Store** (`actions`, `reducer`, `selectors`, `saga`) — including that the
  reducer returns the *same object* for an unhandled action, since a new one
  would notify every subscriber and re-render the app.
- **Components** — behaviour through the DOM via Testing Library, never
  snapshots. A snapshot would have passed just as happily on every bug listed
  below.
- **One integration test** (`App.test.tsx`) — real store, real saga, real
  payload, nothing mocked below `App`. It catches the failure unit tests cannot:
  every part working and nothing wired together.

fabric.js is replaced by a recorder (`src/test/fabric-mock.ts`) because jsdom
has no 2D context — and because the thing worth asserting is *what the component
asks fabric to do*, not the pixels it would produce.

Test names state the behaviour and, where it is not obvious, a comment states
why it matters. `keeps ids contiguous when a malformed row is dropped` is a
requirement; `test reducer` is not.

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

## What would come next

- **Storybook** for the presentational components — they are already pure and
  prop-driven, so this is configuration rather than refactoring.
- **MSW** in place of the injected source, to exercise the real `fetch` path.
- **Virtualise the table** if the payload could ever be large; it renders every
  row today.
- **RTK Query** would collapse the saga, actions and reducer into a cached
  endpoint definition. Deliberately not done here — the hand-written slice is
  what makes the layering legible.
