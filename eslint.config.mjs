import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-empty-object-type": 0,
      "@typescript-eslint/no-require-imports": 0,
      "@typescript-eslint/no-empty-object-type": 0,
      "@typescript-eslint/no-explicit-any": 0, 
      "@typescript-eslint/ban-ts-comment": 0,
      "react-hooks/rules-of-hooks":0
    }
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
