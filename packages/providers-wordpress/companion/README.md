# Forge Elementor Bridge (companion plugin)

Optional WordPress companion plugin for **Sprint 25** (Universal Patch Application & Elementor/WordPress Write Bridge).

## Why it exists

Elementor stores page structure as structured JSON in the **private `_elementor_data` post meta**.
That meta is **not exposed through the standard `wp/v2` REST API**, so SEO Forge cannot safely
read or write Elementor source data via WordPress REST alone (Sprint 25, Path B rejected).

This plugin is **Path C + Path D**:

- **Path C** — a controlled, authenticated REST endpoint (`/wp-json/forge/v1/elementor/documents/{id}`)
  that bridges the gap left by private Elementor metadata.
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

### `GET /wp-json/forge/v1/elementor/documents/{id}`

Reads an Elementor document. Returns:

```json
{
  "postId": 42,
  "title": "Homepage",
  "type": "page",
  "elementorVersion": "3.24.0",
  "editMode": "builder",
  "data": "[{\"id\":\"abc123\",\"elType\":\"container\",...}]",
  "modified": "2026-08-14T12:00:00Z"
}
```

Errors: `404 document_not_found`, `501 elementor_not_active`.

### `PUT /wp-json/forge/v1/elementor/documents/{id}`

Atomically replaces the whole document. Body:

```json
{
  "data": "[... full _elementor_data JSON ...]",
  "expectedModified": "2026-08-14T12:00:00Z"
}
```

- **Optimistic concurrency**: if `expectedModified` is provided and the post was modified since
  the caller's read, the write is rejected with `409 version_conflict` and **nothing is written**.
- **Structural equivalence check**: if the raw strings differ but the JSON is structurally
  equivalent (Elementor may reformat whitespace/key order), the write proceeds.
- The entire document is replaced in a single request — partial writes are impossible.
- Returns the re-read document so the caller can verify.

Errors: `400 empty_data` / `400 invalid_json`, `409 version_conflict`, `501 elementor_not_active`.

## Security model

- Standard WordPress REST authentication (application passwords) — **no credentials stored**.
- `permission_callback` requires `is_user_logged_in()` **and** `current_user_can('edit_post', $id)`.
- No unauthenticated access is granted.
- Writes are atomic and version-guarded (optimistic concurrency).

## Manual verification (no PHP runtime needed locally)

Run from a machine with the WordPress site reachable:

```bash
# Read a document
curl -u USER:APP_PASSWORD \
  "https://site.test/wp-json/forge/v1/elementor/documents/42"

# Dry-run flow via SEO Forge CLI (no mutation)
forge wp elementor inspect <site> 42

# Apply a patch with verification (writes once, then re-reads and verifies)
forge wp elementor apply <site> 42 patches.json --output rollback.json

# Roll back using the payload from apply
forge wp elementor rollback <site> --original rollback.json
```

## Opt-in integration test

With `FORGE_WP_INTEGRATION=true` (plus `FORGE_WP_URL`, `FORGE_WP_USER`,
`FORGE_WP_APP_PASSWORD`), run:

```bash
pnpm test -- packages/providers-wordpress/src/elementor-integration.test.ts
```

Never commit credentials — the integration test is skipped unless explicitly enabled and is
separated from normal CI.

## Notes

- This plugin is **not executed by CI** (no PHP runtime in the repo toolchain). It is validated
  by code review, the deterministic TypeScript transport tests, and the opt-in integration test.
- The plugin does not modify Elementor core; it only uses documented hooks/APIs where available.
