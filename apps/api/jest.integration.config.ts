import baseConfig from './jest.config';

export default {
  ...baseConfig,
  testRegex: '.*\\.integration-spec\\.ts$',
  passWithNoTests: true,
};
