# Elementor Live E2E — Evidence Index

Run date: **2026-10-20**
Site: real local WordPress 7.1.3 + Elementor 4.3.5 + Forge bridge 0.2.0
Page: ID `6`, “Forge Elementor E2E Staging Page”
Script: `scripts/elementor-e2e.mjs`

All files are sanitized: they contain no application password and no `Authorization` header.
The local site URL is a test address (`http://127.0.0.1:8080`), not a production host.

## Bridge workflow artifacts

| File                               | What it proves                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `doctor.json`                      | Auth, WordPress, Elementor 4.3.5, bridge 0.2.0, page readability/writability   |
| `inspect-before.json`              | Real `_elementor_data`, fingerprint `8qz5ct`, 5 widgets, 5/5 `data-id` mapping |
| `preview.txt`                      | Read-only resolved change for the heading                                      |
| `validate.txt`                     | Patch resolves and is compatible                                               |
| `apply-dry-run.json`               | `applied: false`; dry-run performs no write                                    |
| `patch.json`                       | Exact approved patch (heading `e1f2a3b4`, control `title`)                     |
| `apply-real.json`                  | Real write result; fingerprint moves to `ng7qr7`                               |
| `inspect-after-apply.json`         | Stored heading is the proposed text with U+2014; fingerprint `ng7qr7`          |
| `live-after-apply-heading.html`    | Rendered HTTP 200 `<h1>` with the applied text                                 |
| `rollback-payload.json`            | Exact original document captured before the write                              |
| `rollback-result.json`             | `restored: true`, final fingerprint `8qz5ct`                                   |
| `inspect-after-rollback.json`      | Original heading restored; fingerprint `8qz5ct`                                |
| `live-after-rollback-heading.html` | Rendered HTTP 200 `<h1>` with the original text                                |
| `summary.json`                     | Machine-readable pass/fail summary of the whole run                            |
| `sha256sums.txt`                   | SHA-256 of every file in this directory (excluding itself)                     |

The applied heading includes an em dash (U+2014). A quick code-point check:

```bash
node -e "const s=require('fs').readFileSync('docs/evidence/elementor-e2e/live-after-apply-heading.html','utf8'); console.log(s.includes('\u2014'))"
# true
```

## Official Elementor MCP probe artifacts

| File                                       | Observation                                                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `mcp-default-tools-list.json`              | Default WordPress MCP server exposes only the three `mcp-adapter-*` tools                                  |
| `mcp-default-abilities.json`               | Discovered abilities are only `core/get-site-info`, `core/get-user-info`, `core/get-environment-info`      |
| `mcp-routes.txt`                           | Registered routes include `/elementor/v1/mcp-proxy`; `/mcp/elementor-mcp` was not registered in this build |
| `mcp-proxy-get-page-structure.json`        | Proxy reads the 5 legacy widgets on page 6                                                                 |
| `mcp-proxy-get-page-structure-headers.txt` | HTTP 200 for the structure read                                                                            |
| `mcp-proxy-get-heading-content.json`       | `include_content=true` returns empty `settings`/`styles` for the V3 heading                                |
| `mcp-proxy-manage-elements-error.json`     | `manage-elements` returns HTTP 422 `elementor_v3_not_supported`                                            |
| `mcp-proxy-manage-elements-headers.txt`    | HTTP 422 for the legacy V3 edit attempt                                                                    |

These artifacts support the recommendation in
[`../../elementor-live-integration.md`](../../elementor-live-integration.md): the companion
bridge is the deterministic write path; official Elementor MCP is an optional complement.
