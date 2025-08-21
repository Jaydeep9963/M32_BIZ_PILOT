import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 20000,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/app.ts',
    'src/auth.ts',
  ],
  coverageThreshold: {
    global: {
      lines: 90,
      statements: 90,
    },
  },
}

export default config


