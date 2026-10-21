#!/usr/bin/env node
/* global process, console, fetch */
/* eslint-disable no-console */
// Real-site Elementor end-to-end proof.
//
// This script does NOT mock WordPress. It talks to a real site through the
// Forge Elementor bridge and proves the whole safety envelope:
//
//   doctor -> inspect -> preview -> validate -> dry-run apply
//          -> real apply -> verify live HTML -> inspect
//          -> rollback -> verify live HTML restored
//
// It is intentionally opt-in and mutates the target page for a few seconds.
// Always use a staging page. Credentials come from the environment only:
//
//   FORGE_WP_SITE_URL=https://staging.example.com
//   FORGE_WP_USERNAME=forge
//   FORGE_WP_APPLICATION_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx"
//   FORGE_WP_PAGE_ID=42
//
// Usage:
//   pnpm --filter @forge/cli build
//   node scripts/elementor-e2e.mjs
//
// Optional:
//   FORGE_CLI=apps/cli/dist/index.js     CLI entry point
//   FORGE_E2E_OUT=tmp/elementor-e2e       artifact directory
//
// The proposed heading includes an em dash (U+2014) on purpose. JSON escapes
// such as \u2014 must survive the REST + Elementor save round-trip; a regression
// here previously stored the literal string "u2014".

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = resolve(repoRoot, process.env.FORGE_CLI ?? "apps/cli/dist/index.js");
const siteUrl = required("FORGE_WP_SITE_URL");
const username = required("FORGE_WP_USERNAME");
const applicationPassword = required("FORGE_WP_APPLICATION_PASSWORD");
const pageId = required("FORGE_WP_PAGE_ID");

if (!existsSync(cliPath)) {
  fail(`CLI build not found at ${cliPath}. Run: pnpm --filter @forge/cli build`);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = resolve(repoRoot, process.env.FORGE_E2E_OUT ?? join("tmp", "elementor-e2e", stamp));
mkdirSync(outDir, { recursive: true });

const env = {
  ...process.env,
  FORGE_WP_SITE_URL: siteUrl,
  FORGE_WP_USERNAME: username,
  FORGE_WP_APPLICATION_PASSWORD: applicationPassword,
};

function required(name) {
  const value = process.env[name];
  if (!value) fail(`Missing required environment variable ${name}`);
  return value;
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function redact(value) {
  // Only the application password is secret. Do not redact the username:
  // values such as "forge" also appear in plugin names and URLs.
  return value.split(applicationPassword).join("***");
}

function run(args, label) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    env,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  writeFileSync(join(outDir, `${label}.stdout.txt`), redact(stdout));
  writeFileSync(join(outDir, `${label}.stderr.txt`), redact(stderr));
  writeFileSync(join(outDir, `${label}.exit.txt`), `${result.status ?? "null"}\n`);
  if (result.error) fail(`${label}: ${result.error.message}`);
  return { status: result.status ?? 1, stdout, stderr };
}

function jsonFrom(runResult, label) {
  const start = runResult.stdout.indexOf("{");
  if (start < 0) fail(`${label}: no JSON object in stdout`);
  try {
    return JSON.parse(runResult.stdout.slice(start));
  } catch (error) {
    fail(`${label}: invalid JSON output (${error.message})`);
  }
}

function must(result, label) {
  if (result.status !== 0) {
    fail(`${label} exited ${result.status}. See ${outDir}/${label}.stderr.txt`);
  }
  return result;
}

function inspect(label) {
  const result = must(run(["wp", "elementor", "inspect", pageId, "--json"], label), label);
  return jsonFrom(result, label);
}

function findHeading(document) {
  for (const widget of document.inventory?.widgets ?? []) {
    if (widget.widgetType !== "heading") continue;
    const field = (widget.supportedFields ?? []).find(
      (candidate) => candidate.settingsKey === "title",
    );
    if (field) return { widget, field };
  }
  return undefined;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

async function pageHtml(url, label) {
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}forge_e2e=${Date.now()}`, {
    headers: { "Cache-Control": "no-cache" },
  });
  const html = await response.text();
  writeFileSync(join(outDir, `${label}.html`), html);
  return { status: response.status, html };
}

const summary = {
  siteUrl,
  pageId: Number(pageId),
  outDir,
  steps: {},
  pass: false,
};

let rollbackFile;
let applied = false;
let rolledBack = false;
let originalFingerprint;
let originalTitle;

try {
  // 1. Health contract: auth, Elementor version, bridge version, page writable.
  const doctor = must(run(["wp", "elementor", "doctor", pageId, "--json"], "01-doctor"), "doctor");
  summary.steps.doctor = jsonFrom(doctor, "doctor");
  assert(summary.steps.doctor.ok === true, "doctor reported a failed check");

  // 2. Read the real document and select a patchable heading control.
  const before = inspect("02-inspect-before");
  const heading = findHeading(before);
  assert(before.fingerprint, "inspect returned no document fingerprint");
  assert(heading, "no patchable heading widget found on the target page");
  originalFingerprint = before.fingerprint;
  originalTitle = heading.field.normalizedText;
  summary.steps.inspectBefore = {
    title: before.title,
    fingerprint: before.fingerprint,
    widgetCount: before.inventory.widgetCount,
    universalMapping: before.universalMapping,
    heading: {
      elementId: heading.widget.elementId,
      settingsKey: heading.field.settingsKey,
      currentText: originalTitle,
    },
  };

  const proposedTitle = `${originalTitle} — Forge E2E ${Date.now()}`;
  const patch = {
    id: `forge-e2e-${Date.now()}`,
    currentContent: originalTitle,
    proposedContent: proposedTitle,
    sourceFingerprint: originalFingerprint,
    expectedWidgetType: heading.widget.widgetType,
    target: {
      format: "elementor",
      elementId: heading.widget.elementId,
      settingsKey: heading.field.settingsKey,
    },
  };
  const patchFile = join(outDir, "patch.json");
  writeFileSync(patchFile, JSON.stringify(patch, null, 2) + "\n");
  summary.patch = { file: patchFile, proposedTitle };

  // 3. Preview + validate: both must be read-only.
  must(run(["wp", "elementor", "preview", pageId, "--patch", patchFile], "03-preview"), "preview");
  must(
    run(["wp", "elementor", "validate", pageId, "--patch", patchFile], "04-validate"),
    "validate",
  );

  // 4. Dry-run apply: CLI exits 1 by contract, but performs zero writes.
  const dry = run(
    ["wp", "elementor", "apply", pageId, "--patch", patchFile, "--json"],
    "05-apply-dry-run",
  );
  const dryResult = jsonFrom(dry, "apply dry-run");
  assert(dry.status === 1, "dry-run should exit 1 because nothing was applied");
  assert(dryResult.applied === false, "dry-run reported applied=true");
  const afterDry = inspect("06-inspect-after-dry-run");
  assert(afterDry.fingerprint === originalFingerprint, "dry-run changed the remote fingerprint");

  // 5. Real apply. This is the only mutating step.
  rollbackFile = join(outDir, "rollback.json");
  must(
    run(
      [
        "wp",
        "elementor",
        "apply",
        pageId,
        "--patch",
        patchFile,
        "--apply",
        "--output",
        rollbackFile,
        "--json",
      ],
      "07-apply-real",
    ),
    "apply --apply",
  );
  applied = true;
  assert(existsSync(rollbackFile), "apply did not write a rollback payload");

  const afterApply = inspect("08-inspect-after-apply");
  const appliedHeading = findHeading(afterApply);
  assert(appliedHeading, "heading disappeared after apply");
  assert(
    appliedHeading.field.normalizedText === proposedTitle,
    `stored heading does not match proposed text: ${JSON.stringify(appliedHeading.field.normalizedText)}`,
  );
  assert(afterApply.fingerprint !== originalFingerprint, "fingerprint did not change after apply");
  summary.steps.apply = {
    fingerprintBefore: originalFingerprint,
    fingerprintAfter: afterApply.fingerprint,
    storedTitle: appliedHeading.field.normalizedText,
  };

  // 6. Verify the real front end, not just the REST document.
  assert(before.pageUrl, "inspect returned no page URL for rendered verification");
  const liveAfter = await pageHtml(before.pageUrl, "09-live-after-apply");
  assert(liveAfter.status === 200, `rendered page returned HTTP ${liveAfter.status}`);
  assert(
    liveAfter.html.includes(proposedTitle),
    "rendered HTML does not contain the applied heading",
  );
  summary.steps.liveAfterApply = {
    status: liveAfter.status,
    containsProposedTitle: true,
  };

  // 7. Roll back to the exact original document and verify both layers.
  must(
    run(
      ["wp", "elementor", "rollback", pageId, "--original", rollbackFile, "--json"],
      "10-rollback",
    ),
    "rollback",
  );
  rolledBack = true;
  const afterRollback = inspect("11-inspect-after-rollback");
  const restoredHeading = findHeading(afterRollback);
  assert(restoredHeading, "heading disappeared after rollback");
  assert(
    afterRollback.fingerprint === originalFingerprint,
    `rollback fingerprint ${afterRollback.fingerprint} != original ${originalFingerprint}`,
  );
  assert(
    restoredHeading.field.normalizedText === originalTitle,
    "rollback did not restore the original heading text",
  );
  const liveRestored = await pageHtml(before.pageUrl, "12-live-after-rollback");
  assert(liveRestored.status === 200, `restored page returned HTTP ${liveRestored.status}`);
  assert(
    liveRestored.html.includes(originalTitle),
    "rendered HTML does not contain the restored heading",
  );
  assert(
    !liveRestored.html.includes(proposedTitle),
    "rendered HTML still contains the applied heading",
  );
  summary.steps.rollback = {
    fingerprintRestored: afterRollback.fingerprint,
    restoredTitle: restoredHeading.field.normalizedText,
    liveStatus: liveRestored.status,
  };

  summary.pass = true;
  writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nPASS — artifacts: ${outDir}`);
} catch (error) {
  summary.error = error instanceof Error ? error.message : String(error);
  writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  console.error(`\nFAIL — artifacts: ${outDir}`);
  console.error(summary.error);
  process.exitCode = 1;
} finally {
  // Never leave a staging page mutated if a later assertion failed.
  if (applied && !rolledBack && rollbackFile && existsSync(rollbackFile)) {
    console.error("Attempting forced rollback after failure...");
    const recovery = run(
      ["wp", "elementor", "rollback", pageId, "--original", rollbackFile, "--force"],
      "99-recovery-rollback",
    );
    if (recovery.status === 0) {
      console.error("Recovery rollback succeeded.");
    } else {
      console.error(`Recovery rollback FAILED. Restore manually from ${rollbackFile}`);
      process.exitCode = 1;
    }
  }
}
