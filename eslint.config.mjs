import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  {
    rules: {
      // Our effects reset local state before fetching from the chain (a new CID, a new
      // file, a reconnect). That is the intended pattern here, not a derived-state bug.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    ".scratch/**",
    "sdk/dist/**",
    "contracts/**",
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
