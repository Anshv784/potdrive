#!/usr/bin/env bun
// Regenerates sdk/src/abi.ts from the Foundry build, so the SDK can never drift from the
// contracts.   (cd contracts && forge build) && bun scripts/gen-abi.ts
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const art = (file: string, name: string) => JSON.parse(readFileSync(`${root}/contracts/out/${file}/${name}.json`, "utf8"));
const errors = (a: { abi: { type: string }[] }) => a.abi.filter((x) => x.type === "error");

const registry = art("PotDriveRegistry.sol", "PotDriveRegistry");
const permits = art("PotDrivePermits.sol", "PotDrivePermits");
const check = art("PotDriveVerifier.sol", "PotDriveCheck");
const verifier = art("PotDriveVerifier.sol", "PotDriveVerifier");
const unixfs = art("UnixFs.sol", "UnixFs");
const permit = art("Permit.sol", "Permit");

const exp = (name: string, v: unknown) => `export const ${name} = ${JSON.stringify(v, null, 2)} as const;\n`;
const out =
  `// Generated from contracts/out by scripts/gen-abi.ts (forge build, via-ir, runs=1). Do not edit.\n\n` +
  exp("registryAbi", [...registry.abi, ...errors(unixfs)]) +
  `\nexport const registryBytecode = ${JSON.stringify(registry.bytecode.object)} as const;\n\n` +
  exp("permitsAbi", [...permits.abi, ...errors(permit)]) +
  `\nexport const permitsBytecode = ${JSON.stringify(permits.bytecode.object)} as const;\n\n` +
  exp("verifierAbi", [...verifier.abi, ...errors(unixfs)]) +
  `\nexport const verifierBytecode = ${JSON.stringify(verifier.bytecode.object)} as const;\n\n` +
  `// Never deployed: run through eth_call; the constructor returns the report.\n` +
  exp("checkAbi", [...check.abi, ...errors(unixfs)]) +
  `\nexport const checkBytecode = ${JSON.stringify(check.bytecode.object)} as const;\n`;
writeFileSync(`${root}/sdk/src/abi.ts`, out);
console.log(`sdk/src/abi.ts: registry ${(registry.bytecode.object.length - 2) / 2} B, permits ${(permits.bytecode.object.length - 2) / 2} B, check ${(check.bytecode.object.length - 2) / 2} B`);
