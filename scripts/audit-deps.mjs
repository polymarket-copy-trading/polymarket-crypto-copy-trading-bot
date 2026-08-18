#!/usr/bin/env node
import { execSync } from "node:child_process";

console.log("Running dependency audit...\n");

try {
  const out = execSync("npm audit --json", { encoding: "utf8" });
  const report = JSON.parse(out);
  const vulns = report.metadata?.vulnerabilities ?? {};
  console.log("Vulnerability summary:", vulns);
  const total = Object.values(vulns as Record<string, number>).reduce((a, b) => a + b, 0);
  if (total > 0) {
    console.warn("\nReview npm audit output and upgrade affected packages.");
    process.exitCode = 1;
  } else {
    console.log("\nNo known vulnerabilities reported.");
  }
} catch (error) {
  const err = error as { stdout?: string; status?: number };
  if (err.stdout) {
    try {
      const report = JSON.parse(err.stdout);
      console.log(JSON.stringify(report.metadata?.vulnerabilities ?? report, null, 2));
    } catch {
      console.log(err.stdout);
    }
  }
  process.exitCode = err.status === 0 ? 0 : 1;
}
