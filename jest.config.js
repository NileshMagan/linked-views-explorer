module.exports = {
  roots: ['<rootDir>/src'],

  // Components render into a DOM, so the suite needs jsdom rather than Jest's
  // default `node` environment.
  testEnvironment: 'jsdom',

  // TypeScript is compiled by ts-jest using the project's own tsconfig, so the
  // tests are type-checked with exactly the same rules as `npm run build`.
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },

  // Registers jest-dom's matchers. React Testing Library cleans up after each
  // test on its own since v9, so no explicit cleanup hook is needed.
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],

  // Stylesheet imports resolve to an inert object.
  moduleNameMapper: {
    '\\.(css|scss|sass)$': '<rootDir>/src/test/styleMock.ts',
  },

  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    // Excluded deliberately: composition roots and ambient declarations. They
    // are wiring with no branches, and covering them would mean asserting that
    // `createStore` was called rather than that anything works.
    '!src/index.tsx',
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
