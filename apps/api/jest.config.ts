export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@bus-tracking/shared-types$': '<rootDir>/../../packages/shared-types/src',
    '^@bus-tracking/validation$': '<rootDir>/../../packages/validation/src',
    '^@bus-tracking/api-contracts$': '<rootDir>/../../packages/api-contracts/src',
    '^@bus-tracking/shared-utils$': '<rootDir>/../../packages/shared-utils/src',
  },
  passWithNoTests: true,
};
