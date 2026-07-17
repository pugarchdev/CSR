/** Jest configuration for the MahaCSR backend (verification module tests). */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  setupFiles: ["<rootDir>/src/modules/verification/__tests__/setupEnv.js"],
  clearMocks: true,
  transform: {
    "^.+\\.ts$": ["ts-jest", { isolatedModules: true }]
  }
};
