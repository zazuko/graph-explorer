// @ts-check

import eslint from "@eslint/js";
import prettierConfig from 'eslint-config-prettier';
import stylisticTs from '@stylistic/eslint-plugin-ts';
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    plugins: {
      '@stylistic/ts': stylisticTs
    },
    ignores: [
      'node_modules',
      'dist',
      'webpack.config.js',
    ],
    rules: {
      '@stylistic/ts/indent': ['error', 2],
      '@stylistic/ts/semi': ['error', 'always'],
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
    }
  },
  prettierConfig,
);
