#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readme = readFileSync(resolve(root, "README.md"), "utf8");
const imageRefs = [...readme.matchAll(/!\[[^\]]*\]\((docs\/images\/[^)]+)\)/g)].map((m) => m[1]);

let failed = false;
for (const ref of imageRefs) {
  const path = resolve(root, ref);
  if (!existsSync(path)) {
    console.error(`MISSING: ${ref}`);
    failed = true;
  } else {
    console.log(`OK: ${ref}`);
  }
}

if (failed) process.exit(1);
console.log(`\nAll ${imageRefs.length} README images verified.`);
