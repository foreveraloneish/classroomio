import type { Config } from 'jest';

/** @type {import('ts-jest').JestConfigWithTsJest} */
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.svelte$': 'svelte-jester',
    '^.+\\.ts$': 'ts-jest',
    '\\.[jt]sx?$': 'babel-jest'
  },
  moduleNameMapper: {
    '^\\$lib/(.*)$': '<rootDir>/src/lib/$1'
  }
};

export default config;
