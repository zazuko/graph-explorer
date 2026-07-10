import eslint from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    plugins: {
      "@stylistic": stylistic
    },
    ignores: [
      "node_modules",
      "dist",
    ],
    rules: {
      "@stylistic/indent": ["error", 2],
      "@stylistic/semi": ["error", "always"],
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/prefer-literal-enum-member": "off",
    }
  },
  prettierConfig,
);
