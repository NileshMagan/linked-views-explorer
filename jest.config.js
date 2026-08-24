// ts-jest warns that TypeScript 5 is newer than it was tested against. The
// suite and `npm run build` both pass on it, so the notice is only noise.
process.env.TS_JEST_DISABLE_VER_CHECKER = 'true';

module.exports = {
  roots: ['<rootDir>/src'],

  // Components render into a DOM, so the suite needs jsdom rather than Jest's
  // default `node` environment.
  testEnvironment: 'jsdom',

  // msw/node resolves to its browser build under jsdom unless the export
  // conditions are cleared; without this its Node interceptors never load.
  testEnvironmentOptions: { customExportConditions: [''] },

  // Fetch primitives, installed before anything imports msw.
  setupFiles: ['<rootDir>/jest.polyfills.js'],

  // TypeScript is compiled by ts-jest using the project's own tsconfig, so the
  // tests are type-checked with exactly the same rules as `npm run build`.
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
    // msw and several of its dependencies ship ESM only, so the JavaScript in
    // node_modules has to be transpiled rather than ignored.
    '^.+\\.m?jsx?$': [
      'babel-jest',
      { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] },
    ],
  },

  // Everything in node_modules is left alone except the ESM-only packages msw
  // pulls in; transpiling all of node_modules would be far slower.
  transformIgnorePatterns: [
    'node_modules/(?!(msw|@mswjs|@bundled-es-modules|rettime|until-async|strict-event-emitter|outvariant|is-node-process|headers-polyfill|@open-draft|tough-cookie|universalify)/)',
  ],

  // Registers jest-dom's matchers. React Testing Library cleans up after each
  // test on its own since v9, so no explicit cleanup hook is needed.
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],

  // Stylesheet imports resolve to an inert object.
  moduleNameMapper: {
    '\\.(css|scss|sass)$': '<rootDir>/src/test/styleMock.ts',
  },

  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'mjs', 'jsx', 'json', 'node'],

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    // Excluded deliberately: composition roots and ambient declarations. They
    // are wiring with no branches, and covering them would mean asserting that
    // `createStore` was called rather than that anything works.
    '!src/index.tsx',
    '!src/mocks/**',
    '!src/store/store.tsx',
    '!src/**/*.d.ts',
    '!src/test/**',
  ],

  // A floor, not a target. It fails the build if a change lands without the
  // test that should have come with it.
  coverageThreshold: {
    global: { statements: 90, branches: 85, functions: 90, lines: 90 },
  },
};
