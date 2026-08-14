#!/usr/bin/env node
// @forge/scripts/audit-unused-deps
// Deterministic dependency audit: reports packages whose package.json declares a
// dependency (workspace or external) that is never imported by their source.
//
// Usage:
//   node scripts/audit-unused-deps.mjs            # report only
//   node scripts/audit-unused-deps.mjs --strict   # exit 1 if any unused deps found
//
// Rules:
//  - "Used" means any import/export/require/dynamic-import referencing the package
//    from any .ts/.mts/.cts/.js file under the package directory (src, tests, __tests__).
//    Type-only imports count as usage (they still require the declaration to typecheck).
//  - Subpath imports (@forge/core/result, lodash/fp) count as usage of the root package.
//  - A dependency listed in the package's own "scripts" is considered used (CLI tools
//    such as tsc/vitest are invoked by name, not imported).
//  - @types/* packages are considered used if the corresponding base package is used
//    or if the types are referenced by the package's tsconfig "types" array.
//  - Root devDependencies (typescript, vitest, eslint, ...) are not audited; they are
//    shared tooling declared at the workspace root.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const PACKAGES_DIR = join(ROOT, "packages");
const STRICT = process.argv.includes("--strict");

/** Recursively collect all files under a directory (optionally filtered by extension). */
function collectFiles(dir, exts) {
  const out = [];
  if (!existsSync(dir)) return out;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full, exts));
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

/** Extract package names referenced by import/export/require statements in a file. */
function extractImports(content) {
  const names = new Set();
  // import ... from "pkg" / export ... from "pkg" / import "pkg" / export * from "pkg"
  const fromRe = /(?:from\s*|import\s*|require\s*\()\s*["']([^"']+)["']/g;
  // dynamic import("pkg")
  const dynRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  // require("pkg")
  const reqRe = /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const re of [fromRe, dynRe, reqRe]) {
    let m;
    while ((m = re.exec(content)) !== null) {
      const spec = m[1];
      if (!spec || spec.startsWith(".") || spec.startsWith("/")) continue;
      // Keep scoped name (@forge/x) or first segment (lodash -> lodash/fp -> lodash)
      const parts = spec.split("/");
      names.add(parts[0]?.startsWith("@") ? `${parts[0]}/${parts[1] ?? ""}` : (parts[0] ?? ""));
    }
  }
  return names;
}

/** Read package.json for a directory. */
function readManifest(dir) {
  const p = join(dir, "package.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function auditPackage(pkgDir) {
  const manifest = readManifest(pkgDir);
  if (!manifest) return null;
  const name = manifest.name;
  const declared = { ...(manifest.dependencies ?? {}), ...(manifest.devDependencies ?? {}) };
  const depNames = Object.keys(declared);
  if (depNames.length === 0) return { name, unused: [] };

  const files = collectFiles(pkgDir, [".ts", ".mts", ".cts", ".js", ".mjs", ".cjs"]);
  const used = new Set();
  for (const f of files) {
    const content = readFileSync(f, "utf8");
    for (const n of extractImports(content)) used.add(n);
  }

  const scripts = manifest.scripts ?? {};
  const scriptText = Object.values(scripts).join(" ");

  // tsconfig "types" array (for @types/* detection)
  let tsconfigTypes = [];
  const tsconfigPath = join(pkgDir, "tsconfig.json");
  if (existsSync(tsconfigPath)) {
    try {
      const tc = JSON.parse(readFileSync(tsconfigPath, "utf8"));
      tsconfigTypes = tc.compilerOptions?.types ?? [];
    } catch {
      /* ignore */
    }
  }

  const unused = [];
  for (const dep of depNames) {
    if (dep.startsWith("@types/")) {
      const base = dep.slice("@types/".length);
      const baseUsed =
        used.has(base) || [...used].some((u) => u === base || u.startsWith(`${base}/`));
      if (baseUsed || tsconfigTypes.includes(base)) continue;
      // @types/x with no matching import: only flag when clearly orphaned
      unused.push({ dep, reason: "never imported (types)" });
      continue;
    }
    const depUsed = [...used].some((u) => u === dep || u.startsWith(`${dep}/`));
    if (depUsed) continue;
    if (scriptText.includes(dep)) continue;
    unused.push({ dep, reason: "never imported" });
  }
  return { name, unused };
}

const packages = readdirSync(PACKAGES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(PACKAGES_DIR, d.name))
  .map(auditPackage)
  .filter(Boolean);

let totalUnused = 0;
for (const pkg of packages) {
  if (pkg.unused.length === 0) continue;
  totalUnused += pkg.unused.length;
  console.log(`\n${pkg.name}`);
  for (const u of pkg.unused) {
    console.log(`  - ${u.dep}  (${u.reason})`);
  }
}

console.log(
  `\nAudited ${packages.length} packages. ${totalUnused} unused dependency declaration(s) found.`,
);
if (STRICT && totalUnused > 0) {
  console.error("STRICT mode: unused dependencies detected — failing.");
  process.exit(1);
}
