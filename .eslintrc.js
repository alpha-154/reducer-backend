export default {
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 11,
    sourceType: "module",
  },
  rules: {
    "no-undef": "error", // Flags undefined variables
    "no-unused-vars": "warn", // Warns for unused variables
    "no-console": "off", // Allows console statements
    "no-unresolved": "error", // Flags missing imports
  },
};
