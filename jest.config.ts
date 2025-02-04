import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  // ... other Jest options
  preset: "ts-jest",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};

export default config;
