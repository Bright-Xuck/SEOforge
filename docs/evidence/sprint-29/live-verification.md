# Sprint 29 — Live Verification Evidence

**Date:** 2026-10-22
**Target:** `https://thcgummieslondon.uk`
**Environment:** Windows, Node v24.18.0, repository root.
**Credentials:** Loaded from the local, gitignored `.env`. No credential value or hash is included in this record.

## What passed

### Offline configuration check

```text
pnpm forge doctor --json
```

Observed after the application-password format check was added:

- exit code `0` (warnings do not fail the offline check)
- `ok: true`
- `writeConfigPresent: false`
- `liveChecksRequired: true`
- Node, `.env`, WordPress URL/username, Z.ai key, Ollama URL, and `projects/` writability passed
- `1 warning`, `0 errors`
- the WordPress password check warns that the configured value is not the 24-character
  alphanumeric format WordPress generates for an application password; the value is never
  displayed

`forge doctor` is intentionally offline. It does not prove that the site accepts the
credentials, that the page exists, or that the companion plugin is active.

### Z.ai

```text
pnpm forge ai test zai --model glm-4.5-flash
Provider zai: ✓ healthy
```

## WordPress blockers

### 1. Application password rejected

Read-only authenticated request to the canonical current-user endpoint:

```text
GET https://thcgummieslondon.uk/wp-json/wp/v2/users/me
HTTP 401
{"code":"rest_not_logged_in","message":"You are not currently logged in.","data":{"status":401}}
```

Application Passwords are enabled on the site (the REST root advertises the
`authorization` endpoint). A format-only local check (no value printed) found that the
configured secret is not a 24-character WordPress application password; it contains
characters WordPress does not generate for one and is most likely the normal login password.
`forge doctor` now reports this as a warning and keeps `writeConfigPresent: false`.

Fix: create a new application password under **Users -> Profile -> Application Passwords**,
copy the generated 24-character value (spaces are allowed), and replace
`FORGE_WP_APPLICATION_PASSWORD` in `.env`. If a freshly generated value still returns 401,
check the login username and whether the host/WAF strips the `Authorization` header.

### 2. Companion plugin absent

```text
GET https://thcgummieslondon.uk/wp-json/forge/v1/system
HTTP 404
```

`forge/v1` is absent from the REST namespace list. Install and activate:

```text
packages/providers-wordpress/companion/forge-elementor-bridge.php
```

The repository source reports version `0.3.0`. After activation,
`/wp-json/forge/v1/system` must be registered; unauthenticated requests should return 401,
not 404.

### 3. Page id 6 is not a page on this site

Read-only checks:

```text
GET /wp-json/wp/v2/pages/6   → HTTP 404 rest_post_invalid_id
GET /wp-json/wp/v2/posts/6   → HTTP 404 rest_post_invalid_id
GET /wp-json/wp/v2/media/6   → HTTP 200 attachment "woocommerce-placeholder"
```

The site has 9 published pages: My Account, Contact Us, Terms & Privacy, Cart, Checkout,
Home, Shop, Blog, and About. None is a Forge/staging page. Do not use id 6 as a write
target; create a dedicated Elementor staging page (draft or private is acceptable) and use
its id.

## CLI failure-path regression

Before the fix, the failed live check ended with:

```text
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 94
exit code 3221226505
```

The CLI no longer calls `process.exit()` after asynchronous provider work. It sets
`process.exitCode` and lets Node close its handles. The same live check now ends cleanly:

```text
pnpm forge wp elementor doctor 6
Forge Elementor health check (page 6):
  ✗ Authentication valid — The WordPress REST API rejected the application password.
    Regenerate it in Users -> Profile -> Application Passwords, confirm
    FORGE_WP_USERNAME, and update .env. [AUTHENTICATION_FAILED]
exit code 1
```

A transient DNS failure (`getaddrinfo EAI_AGAIN`) caused an earlier opaque `fetch failed`.
The bridge now classifies that path as `[WORDPRESS_UNREACHABLE]` and includes the underlying
cause; a regression test covers it.

## Conclusion

The offline hardening and Z.ai connection are verified. Live optimization must not run yet:

1. Regenerate/correct the WordPress application password and confirm
   `/wp-json/wp/v2/users/me` returns 200.
2. Install and activate the companion plugin.
3. Create or identify a real staging page and record its id.
4. Re-run `forge wp elementor doctor <id>`, then the optimize dry-run, review, explicit
   apply, verification, and rollback sequence.

No remote content was written during this verification.
