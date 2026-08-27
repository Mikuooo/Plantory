/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/__tests__'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'components/navigation-config.ts',
    'components/pots/pot-options.ts',
    'stores/asset-store.ts',
  ],
};
