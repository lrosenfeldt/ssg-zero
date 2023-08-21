/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  env: {
    browser: false,
    es2023: true,
    node: true,
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint", "prettier"],
  rules: {
    "prettier/prettier": "warn",
  },
};

module.exports = config;
