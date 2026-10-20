# Forge Elementor Bridge (companion plugin)

**Version:** 0.2.0 (Sprint 26 hardened)

Optional WordPress companion plugin for **Sprint 25/26** (Universal Patch Application & Elementor/WordPress Write Bridge).

## Why it exists

Elementor stores page structure as structured JSON in the **private `_elementor_data` post meta**.
That meta is **not exposed through the standard `wp/v2` REST API**, so SEO Forge cannot safely
read or write Elementor source data via WordPress REST alone (Sprint 25, Path B rejected).

This plugin is **Path C + Path D**:

- **Path C** — a controlled, authenticated REST interface that bridges the gap left
  by private Elementor metadata:
  - `GET /wp-json/forge/v1/system` (Sprint 26) — typed site health and widget capabilities.
  - `GET /wp-json/forge/v1/elementor/documents/{id}` — reads an Elementor document.
  - `PUT /wp-json/forge/v1/elementor/documents/{id}` — atomically replaces an Elementor document.
- **Path D** — writes are performed through **Elementor's native server-side document API**
  (`\Elementor\Plugin::$instance->documents->get($id)->save()`), so Elementor hooks, CSS
  regeneration, and versioning behave exactly as they do in the editor. When Elementor's API
  is unavailable, the plugin falls back to a raw meta write (still atomic, still version-guarded).

It exists so SEO Forge never has to send arbitrary rendered HTML back to WordPress.

## Install

1. Copy `forge-elementor-bridge.php` into `wp-content/plugins/forge-elementor-bridge/`.
2. Activate the plugin from **Plugins → Installed Plugins**.
3. Ensure the WordPress user used by SEO Forge has `edit_post` capability on the target pages
   (application passwords are the recommended authentication method).

## API

All responses are typed JSON. Error responses carry `{ "code", "message" }`
with a stable code — raw PHP errors are never the primary error surface.

### `GET /wp-json/forge/v1/system` (Sprint 26)

Typed site health and widget capabilities (consumed by `forge wp elementor doctor`).
Requires authentication; reaching the endpoint proves REST authentication succeeded.

```json
{
  "plugin": "forge-elementor-bridge",
  "pluginVersion": "0.2.0",
  "generatedAt": "2026-08-14T12:00:00+00:00",
  "wordpress": { "version": "6.7.1" },
  "authentication": { "valid": true },
  "elementor": {
    "installed": true,
    "version": "3.24.0",
    "minimumSupportedMajor": 2,
    "supported": true
  },
  "capabilities": {
    "readDocument": true,
    "writeDocument": true,
    "supportedWidgets": ["heading", "text-editor", "button", "image", "..."],
    "unsupportedWidgets": ["html", "shortcode", "form", "..."]
  }
}
```

Errors: `401` (unreachable credentials), `404` (plugin missing / route absent).

### `GET /wp-json/forge/v1/elementor/documents/{id}`

Reads an Elementor document. Returns:

```json
{
  "postId": 42,
  "title": "Homepage",
  "type": "page",
  "url": "https://example.com/home",
  "elementorVersion": "3.24.0",
  "editMode": "builder",
  "data": "[{\"id\":\"abc123\",\"elType\":\"container\",...}]",
  "modified": "2026-08-14T12:00:00+00:00"
}
```

Errors: `404 page_not_found`, `501 not_elementor_document`.

### `PUT /wp-json/forge/v1/elementor/documents/{id}`

Atomically replaces the whole document. Body:

```json
{
  "data": "[... full _elementor_data JSON ...]",
  "expectedModified": "2026-08-14T12:00:00+00:00"
}
```

- **Request validation**: the payload must be a non-empty Elementor element array
  (recursive structure check) under 5 MB. Generic JSON is rejected with
  `400 invalid_structure` — there is no generic "set arbitrary `_elementor_data`" path.
- **Optimistic concurrency**: if `expectedModified` is provided and the post was modified since
  the caller's read, the write is rejected with `409 version_conflict` and **nothing is written**.
- **Server-side verification (Sprint 26)**: after saving, the document is re-read and
  compared structurally against the written payload. The response carries `verified`;
  `verified: false` is NOT success even though the HTTP request returned 200.
- The entire document is replaced in a single request — partial writes are impossible.
- Returns the re-read document so the caller can verify client-side as well.

Errors: `400 empty_data` / `400 invalid_json` / `400 invalid_structure` / `400 payload_too_large`,
`409 version_conflict`, `501 not_elementor_document`.

## Security model

- Standard WordPress REST authentication (application passwords) — **no credentials stored**.
- `permission_callback` requires `is_user_logged_in()` **and** `current_user_can('edit_post', $id)`
  for document routes; authentication alone for `/system`.
- No unauthenticated access is granted.
- Writes are atomic and version-guarded (optimistic concurrency).
- Only `page`/`post` types are readable/writable; nothing else on the site is exposed.
- Nothing sensitive is logged or returned (auth material, secrets, PHP internals are never emitted).

## Manual verification (no PHP runtime needed locally)

Run from a machine with the WordPress site reachable:

```bash
# Site health (typed contract)
curl -u USER:APP_PASSWORD \
  "https://site.test/wp-json/forge/v1/system"

# Health through the CLI (typed failures, machine-readable)
forge wp elementor doctor <site> <user> <app-password>
forge wp elementor doctor <site> <user> <app-password> 42 --json

# Inspect (read-only; no raw JSON dump without --raw)
forge wp elementor inspect <site> <user> <app-password> 42
forge wp elementor inspect <site> <user> <app-password> 42 --json

# Preview/validate (SAFE: full local resolution, zero remote writes)
forge wp elementor preview <site> <user> <app-password> 42 --patch patch.json
forge wp elementor validate <site> <user> <app-password> 42 --patch patch.json

# Apply a patch with verification (writes once, then re-reads and verifies)
# NOTE: bare `apply` is a DRY-RUN. Pass --apply to write for real.
forge wp elementor apply <site> <user> <app-password> 42 --patch patch.json
forge wp elementor apply <site> <user> <app-password> 42 --patch patch.json --apply --output rollback.json

# Roll back using the payload from apply
forge wp elementor rollback <site> <user> <app-password> 42 --original rollback.json
```

## Opt-in integration test

With `FORGE_WP_INTEGRATION=true` (plus `FORGE_WP_URL`, `FORGE_WP_USER`,
`FORGE_WP_APP_PASSWORD`, `FORGE_WP_PAGE_ID`), run:

```bash
npx vitest run packages/providers-wordpress/src/elementor-integration.test.ts
```

Never commit credentials — the integration test is skipped unless explicitly enabled and is
separated from normal CI.

## Notes

- This plugin is **not executed by CI** (no PHP runtime in the repo toolchain). It is validated
  by code review, the deterministic TypeScript transport tests, and the opt-in integration test.
- The plugin does not modify Elementor core; it only uses documented hooks/APIs where available.
