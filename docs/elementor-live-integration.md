# Elementor Live Integration — Validation Report

**Status:** PASS (real WordPress + real Elementor, no mocked provider)
**Date:** 2026-10-20
**Scope:** Sprint 26 Elementor write bridge and the long-term Elementor integration path.

This report records a live end-to-end run against a local, real WordPress installation. It
is not a unit-test summary: every read, preview, apply, verification, and rollback step
below used the actual `_elementor_data` JSON of an Elementor page through the companion
plugin.

## 1. Environment

| Component              | Version / value                                                |
| ---------------------- | -------------------------------------------------------------- |
| WordPress              | 7.1.3                                                          |
| PHP                    | 8.3.35                                                         |
| Database               | MariaDB 11.4.8                                                 |
| Elementor              | 4.3.5                                                          |
| Forge companion plugin | `forge-elementor-bridge` 0.2.0                                 |
| Site URL               | `http://127.0.0.1:8080`                                        |
| Target page            | ID `6`, “Forge Elementor E2E Staging Page”                     |
| Page layout            | Root container → two Elementor 4 containers → 5 legacy widgets |

The page contains the legacy widgets the current dom-engine schema supports:

| Elementor ID | Widget        | Role                   |
| ------------ | ------------- | ---------------------- |
| `e1f2a3b4`   | `heading`     | Patch target (`title`) |
| `c3d4e5f6`   | `text-editor` | Rich-text body         |
| `f7a8b9c0`   | `button`      | Call to action         |
| `d4e5f6a7`   | `icon-list`   | Feature list           |
| `a7b8c9d0`   | `divider`     | Layout                 |

“Legacy” here means the widget JSON model used by Elementor 3.x/4.x. Elementor 4.3.5 is
installed, but the test page deliberately uses legacy widgets because
`packages/dom-engine/src/elementor/widget-schema.ts` currently targets those widget
schemas, not atomic V4 elements.

## 2. What was proven

The reproducible script is `scripts/elementor-e2e.mjs` (root script: `pnpm elementor:e2e`).
It performs:

1. `doctor` — reachability, application-password auth, Elementor 4.3.5 detection, bridge
   0.2.0 detection, page existence, Elementor-managed status, readability, writability.
2. `inspect` — reads the real document, inventories 5 patchable widgets, and maps rendered
   HTML to Elementor elements.
3. `preview` / `validate` — resolves the patch and prints the exact before/after change with
   zero remote writes.
4. Dry-run `apply` — exits non-zero by contract and performs zero mutations.
5. Real `apply --apply` — writes the approved heading and produces a rollback payload.
6. Verification — re-reads `_elementor_data`, checks the stored heading, and fetches the
   rendered page over HTTP.
7. `rollback` — restores the exact original document and verifies both the document and the
   rendered page.

### Result

| Check                             | Result                                                          |
| --------------------------------- | --------------------------------------------------------------- |
| Document fingerprint before       | `8qz5ct`                                                        |
| Fingerprint after apply           | `ng7qr7`                                                        |
| Fingerprint after rollback        | `8qz5ct`                                                        |
| Universal mapping                 | `5 matched, 0 unmatched` (all via `data-id`)                    |
| Live rendered page after apply    | HTTP 200, applied heading present                               |
| Live rendered page after rollback | HTTP 200, original heading restored, applied text absent        |
| Non-ASCII round-trip              | em dash (U+2014) preserved, no literal `u2014`                  |
| Dry-run writes                    | 0                                                               |
| Structural verification           | `ok: true`, `targetedChanged: true`, `unrelatedUnchanged: true` |

Final regression run after the fixes:

| Suite                                                        | Result                      |
| ------------------------------------------------------------ | --------------------------- |
| `packages/dom-engine` (includes nested-container regression) | 62 passed                   |
| `apps/cli/src/elementor` unit suite                          | 21 passed, 1 opt-in skipped |
| Provider live integration (opt-in)                           | 3 passed                    |
| Full CLI live integration (opt-in, 13 steps)                 | 1 passed                    |
| `pnpm elementor:e2e` live script (final code)                | PASS, page restored         |
| `pnpm --filter @forge/dom-engine build` / `@forge/cli build` | passed                      |

The applied heading was:

```text
Accounting Software for Small Businesses — Forge E2E 1792505029779
```

After apply, the rendered HTML contained exactly that heading (including U+2014). After
rollback it contained exactly:

```text
Accounting Software for Small Businesses
```

The `u2014` check matters: an earlier version of the companion plugin called
`wp_unslash()` on `_elementor_data`, which removed the backslash from JSON escapes. The
em dash was then decoded/stored as the six literal characters `u2014`. The live run is the
regression proof that the fix works through the full REST → Elementor save → re-read →
rendered-HTML path.

## 3. Evidence

All evidence is sanitized (no application password, no `Authorization` header) and lives in
[`evidence/elementor-e2e/`](evidence/elementor-e2e/README.md).

Key files:

- [`summary.json`](evidence/elementor-e2e/summary.json) — machine-readable pass/fail summary.
- [`doctor.json`](evidence/elementor-e2e/doctor.json) — typed health contract.
- [`inspect-before.json`](evidence/elementor-e2e/inspect-before.json) — document,
  fingerprint, 5-widget inventory, and 5/5 mapping.
- [`apply-dry-run.json`](evidence/elementor-e2e/apply-dry-run.json) — `applied: false`.
- [`apply-real.json`](evidence/elementor-e2e/apply-real.json) — successful write and
  verification result.
- [`inspect-after-apply.json`](evidence/elementor-e2e/inspect-after-apply.json) — stored
  em-dash heading and fingerprint `ng7qr7`.
- [`rollback-payload.json`](evidence/elementor-e2e/rollback-payload.json) — exact original
  document used for restoration.
- [`rollback-result.json`](evidence/elementor-e2e/rollback-result.json) — `restored: true`,
  final fingerprint `8qz5ct`.
- [`inspect-after-rollback.json`](evidence/elementor-e2e/inspect-after-rollback.json) —
  restored heading and fingerprint.
- [`live-after-apply-heading.html`](evidence/elementor-e2e/live-after-apply-heading.html) —
  HTTP 200 rendered `<h1>`.
- [`live-after-rollback-heading.html`](evidence/elementor-e2e/live-after-rollback-heading.html)
  — HTTP 200 restored `<h1>`.

The evidence directory also contains the official Elementor MCP probe results described in
§5.

## 4. Defects found and fixed during live validation

The live run exposed defects that unit tests with synthetic JSON could not catch.

| Defect                                                        | Impact                                                                                   | Fix                                                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `wp_unslash()` on read/write/verify                           | JSON escapes lost their backslash; `—` became `u2014`                                    | Removed all three `wp_unslash()` calls; raw `_elementor_data` is already valid JSON after `update_metadata()` |
| `doctor <page>` parsed the page ID as the site URL            | False `ELEMENTOR_NOT_INSTALLED` on a healthy site                                        | Normalize arguments the same way as the other Elementor commands (`apps/cli/src/index.ts`)                    |
| Elementor drops `isInner: false` when saving                  | Server-side structural verification failed even though the write succeeded               | Normalize false `isInner` on both sides before comparison (`forge-elementor-bridge.php`)                      |
| Rollback after a post-write transport error                   | Rollback guard expected only the pre-write fingerprint, so it refused a safe restore     | Accept either the pre-write or intended post-write fingerprint (`apps/cli/src/elementor/bridge.ts`)           |
| Universal mapping returned 0 blocks on Elementor 4 containers | `.e-con > .e-con-inner > .elementor-widget` was invisible to the direct-children scanner | Recursive container descent in `packages/dom-engine/src/page/builder.ts`, plus a regression test              |
| Preview printed `Page: [object Object]`                       | WordPress REST returns `title.rendered`, not a string                                    | Normalize at the CLI display boundary                                                                         |
| `apply --json --output` did not write the rollback file       | A JSON-mode apply could leave no rollback artifact                                       | Honor `--output` in JSON mode without corrupting stdout                                                       |
| Abrupt `process.exit(1)` after dry-run                        | Intermittent libuv assertion while HTTP/memory handles were still open                   | Set `process.exitCode` and let the process shut down cleanly                                                  |
| Opt-in test timeouts                                          | Live network calls exceeded the 5s default                                               | Explicit 60s/120s timeouts on the opt-in suites                                                               |

Each fix has a focused test or is covered by the live script. The dom-engine regression test
is in `packages/dom-engine/src/elementor/elementor.test.ts` (“maps widgets nested inside
Elementor 4 containers”).

## 5. Official Elementor MCP research (live)

The local site was used to test the official Elementor MCP surfaces, not just documentation.

### 5.1 Default WordPress MCP server

`POST /wp-json/mcp/mcp-adapter-default-server` works with application-password auth and
returns a session. Its tool list contains only the WordPress MCP adapter tools:

- `mcp-adapter-discover-abilities`
- `mcp-adapter-get-ability-info`
- `mcp-adapter-execute-ability`

Discovering abilities returns only:

- `core/get-site-info`
- `core/get-user-info`
- `core/get-environment-info`

No `elementor/*` abilities were exposed. The Elementor module registers its abilities only
when site-level MCP exposure is enabled (`McpSettingsController::is_enabled()`); it is off by
default. `/wp-json/mcp/elementor-mcp` returned HTTP 404 on this installation.

### 5.2 Elementor MCP proxy

`POST /wp-json/elementor/v1/mcp-proxy` is available and authenticated. It returned:

- `get-page-structure` for page 6: the 5 widgets with IDs and types.
- `get-page-structure` with `element_id=e1f2a3b4` and `include_content=true`:
  `settings: {}` and `styles: {}` for the legacy V3 heading.
- `manage-elements` updating that heading: HTTP 422
  `elementor_v3_not_supported`:

```json
{
  "code": "elementor_v3_not_supported",
  "message": "Legacy V3 element cannot be modified through this MCP. Edit V3 elements directly in the Elementor editor."
}
```

The source confirms why: V4/atomic tools such as `manage-elements` are gated by
`Mcp_V4_Gate`, which requires the Atomic Editor experiment. The proxy can describe legacy
V3 structure, but it cannot edit legacy V3 widget content.

### 5.3 Conclusion

| Capability                                | Forge companion bridge                                    | Official Elementor MCP                                 |
| ----------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| Read real Elementor structure             | Yes                                                       | Yes, for structure                                     |
| Read legacy V3 widget settings/content    | Yes                                                       | No (empty `settings` for V3)                           |
| Write legacy V3 widget content            | Yes                                                       | No (`elementor_v3_not_supported`)                      |
| Write V4 atomic elements                  | Document-level JSON; schema support still required        | Yes, when Atomic Editor + MCP exposure are enabled     |
| Preview before write                      | Yes                                                       | No SEO Forge preview contract                          |
| Verified re-read                          | Yes                                                       | Not part of the MCP call                               |
| Rollback with original document           | Yes                                                       | Not provided by the MCP                                |
| Works without an MCP-capable coding agent | Yes                                                       | No (requires an MCP client/server setup)               |
| Auth/exposure model                       | WordPress application password + per-document `edit_post` | WordPress MCP settings + adapter/proxy; off by default |

## 6. Recommendation

**Keep the companion bridge as the primary, deterministic write path.** It is the only path
that currently reads and writes the actual legacy `_elementor_data` used by the target page,
with explicit preview, approval, verification, and rollback semantics.

**Treat official Elementor MCP as an optional complement, not the core integration.** It is
useful for read-only structure discovery and for a future V4/atomic-editor path, but it
cannot replace the bridge today:

- it does not edit legacy V3 widgets;
- its V4 tools are gated by an editor experiment;
- its site-level exposure is off by default;
- it has no SEO Forge preview/approval/rollback contract;
- it would make the write path dependent on an external MCP client/server.

If V4 atomic editing becomes a product requirement, add an Elementor MCP adapter behind the
existing provider abstraction. The core packages and the CLI should continue to depend on
the provider contract, not on Elementor MCP directly. See
[ADR-055](decisions.md#adr-055-companion-bridge-is-the-deterministic-elementor-write-path-elementor-mcp-is-optional).

## 7. Reproduce

### 7.1 Site prerequisites

1. A WordPress site with Elementor installed and activated.
2. The companion plugin copied to
   `wp-content/plugins/forge-elementor-bridge/forge-elementor-bridge.php` and activated.
3. A WordPress user with `edit_post` on the target page and an application password.
4. For plain-HTTP local sites, set `WP_ENVIRONMENT_TYPE=local` in `wp-config.php`; WordPress
   otherwise refuses application-password authentication over HTTP.
5. An Elementor page with at least one supported `heading` widget.

### 7.2 Build and run

```bash
pnpm install
pnpm --filter @forge/cli build

export FORGE_WP_SITE_URL="http://127.0.0.1:8080"
export FORGE_WP_USERNAME="forge"
export FORGE_WP_APPLICATION_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx"
export FORGE_WP_PAGE_ID="6"

pnpm elementor:e2e
```

On Windows PowerShell:

```powershell
$env:FORGE_WP_SITE_URL = "http://127.0.0.1:8080"
$env:FORGE_WP_USERNAME = "forge"
$env:FORGE_WP_APPLICATION_PASSWORD = "xxxx xxxx xxxx xxxx xxxx xxxx"
$env:FORGE_WP_PAGE_ID = "6"
pnpm elementor:e2e
```

The script writes artifacts to `tmp/elementor-e2e/<timestamp>/` by default. Override with
`FORGE_E2E_OUT`. It applies a temporary heading containing an em dash, verifies the live HTML,
then rolls back. If an assertion fails after the write, it attempts a forced recovery
rollback from the saved payload.

### 7.3 Opt-in test suites

```bash
export FORGE_WP_INTEGRATION=true
export FORGE_WP_URL="$FORGE_WP_SITE_URL"
export FORGE_WP_USER="$FORGE_WP_USERNAME"
export FORGE_WP_APP_PASSWORD="$FORGE_WP_APPLICATION_PASSWORD"
export FORGE_WP_PAGE_ID="6"

npx vitest run packages/providers-wordpress/src/elementor-integration.test.ts
npx vitest run apps/cli/src/elementor/integration.test.ts
```

These suites are skipped unless `FORGE_WP_INTEGRATION=true` and are never part of normal CI.

## 8. Limitations and follow-up

- The companion plugin is PHP and is not executed by CI. The live script and the opt-in
  integration suites are the runtime proof; a PHP-lint step could be added to CI or to a
  release checklist.
- dom-engine supports legacy Elementor widget schemas. Atomic V4 element editing remains a
  separate future adapter, whether implemented through the MCP proxy or a V4 document
  mapper.
- The current live target is a local site. The same commands work against staging; only the
  four `FORGE_WP_*` values change.
- `rollback-payload.json` is a user-managed artifact. There is no new persistence system.
