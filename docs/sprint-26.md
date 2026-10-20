# Sprint 26 — Production Elementor Integration & End-to-End Workflow Hardening

**Version:** v0.26.0
**Goal:** Make the existing intelligence → generation → review → composer → execution → WordPress → Elementor chain trustworthy against a real Elementor + WordPress installation. This sprint adds NO engines, NO new packages, NO dashboard, NO MCP. It proves and hardens what Sprint 25 (and predecessors) already built.

```
REAL WORDPRESS / ELEMENTOR SITE
        ↓
Website Reader
        ↓
Universal Page Model
        ↓
Page DNA / Content Intelligence
        ↓
AI Section Generation
        ↓
ContentPatch
        ↓
Review Session
        ↓
Optimization Composer
        ↓
Execution Plan
        ↓
Elementor Resolver
        ↓
Preview
        ↓
Approved Apply
        ↓
Remote Verification
        ↓
Rollback if required
```

SEO Forge does NOT use Elementor MCP. The integration is:

```
SEO Forge CLI
  → WordPress Provider
    → Forge Elementor Bridge (companion plugin)
      → Elementor document APIs (Path C + Path D)
```

## 1. Repository audit (what already worked, what was broken)

Sprint 25 correctly established the architecture but left several defects that
would have failed on a real site. The audit (Phase 0) verified the source —
not the sprint reports — and found:

### What already worked
- ElementorDocument model + provider-neutral fingerprint (dom-engine).
- `_elementor_data` parser/serializer with data-id preservation and
  `__globals__` round-trip.
- UniversalPage ↔ Elementor mapping (data-id / widget-type / text-anchor).
- Patch resolution with typed codes (`PATCH_TARGET_NOT_FOUND/AMBIGUOUS/
  NOT_EDITABLE/STALE/UNSUPPORTED_WIDGET/UNSUPPORTED_VERSION/INVALID_TARGET`).
- Rich-text allowlist sanitizer for text-editor/heading controls.
- Transport with `expectedVersion/expectedFingerprint/expectedModified`
  optimistic concurrency + companion plugin saving through Elementor's native API.

### Real defects found and fixed in Sprint 26
1. **The write path could never succeed.** The plugin's write guard kept a
   leftover "incoming data must equal current data" check — every legitimate
   mutation differs from current, so all guarded writes were 409-rejected.
   (companion plugin § write.)
2. **Read/write modified timestamps used incompatible formats.** The read
   endpoint returned `$post->post_modified_gmt` (SQL) while the write guard
   compared it against `get_post_modified_time('c')` (ISO-8601) — a format
   mismatch that would also have rejected every guarded write.
3. **Rollback-after-apply could never succeed.** `attemptRollback` sent the
   ORIGINAL `modified` timestamp (T0) while the live document's modified had
   advanced to T1 after the apply → 409 on every rollback.
4. **Verification compared raw strings.** Client-side verification was
   `reRead.data === mutation.document.rawData`, but the local document is
   serialized pretty-printed (2-space) while Elementor stores compact JSON —
   every real write would fail verification.
5. **Typed failures were swallowed.** `WordPressProvider.getElementorDocument`
   collapsed every transport error into `null`, so the CLI printed a generic
   "endpoint unavailable" instead of actionable codes.
6. **No widget-type-change detection.** The patch resolver never captured the
   reviewed widget type, so a replaced widget would be patched silently.
7. **No health contract.** The only probe was `GET /documents/0`, which the
   permission callback rejects with 403 even when installed — indistinguishable
   from "endpoint missing".
8. **`href="javascript:..."` slipped through rich-text sanitization.** URL
   schemes were never validated by the sanitizer.
9. **Rollback had no client-side stale guard** (only `expectedModified`) and no
   structural payload validation — a rollback file could overwrite a newer
   unrelated document silently.
10. **No observability.** The memory event types `elementor-write` /
   `elementor-rollback` existed in `@forge/memory-engine` but nothing recorded them.

### Why no new package was necessary
Every change below lands in the existing architectural layer:
- Elementor document semantics live in `@forge/dom-engine` → extended.
- WordPress transport + companion plugin live in `@forge/providers-wordpress` → extended.
- The write composition root (dom-engine + provider + execution chain) lives in
  the CLI → extended. The CLI already depended on all three, so no package edge changed
  except the e2e test's `@forge/optimization-composer` import (declared in the CLI manifest).

## 2. What changed, by phase

### Phase 1 — Connection hardening (`@forge/providers-wordpress` + CLI)

- New `GET /wp-json/forge/v1/system` endpoint in the companion plugin (0.2.0):
  plugin version, WordPress version, Elementor installed/version/supported,
  authentication state, and the supported/unsupported widget capability list.
- New `ElementorDocumentTransport.readSystemStatus()` → typed
  `ElementorSystemStatus`; new provider methods `getElementorSystemStatus()` and
  the strict `readElementorDocument()` (typed `ElementorTransportError`s instead
  of an opaque `null`).
- The client (`WordPressClient.rawRequest`) now attaches the parsed error body
  to thrown failures, so the transport maps the plugin's *typed* `{ code,
  message }` bodies first and falls back to status-code mapping.
- New transport codes: `AUTHENTICATION_FAILED` (401), `WRITE_FAILED`,
  `VERIFICATION_FAILED`, `ELEMENTOR_VERSION_UNSUPPORTED`.
- The `validate_callback` for document routes is now a real id validator
  (`forge_elementor_validate_id`); the write guard compares consistent ISO-8601
  modified timestamps and enforces `expectedVersion`; structural payload
  validation (5 MB cap, recursive element-shape check) closes the generic
  "set arbitrary `_elementor_data`" interpretation of the endpoint.
- New CLI command: `forge wp elementor doctor [<page>]` — checks WordPress
  reachability, auth validity, Elementor presence, version support, and (when a
  page is given) existence, Elementor-managed state, readability, and writability.
- CLI failures are typed: `Error [CODE]: actionable message`. Raw PHP/HTTP
  errors never reach the user without mapping.

### Phase 2 — Real document inspection (`@forge/dom-engine` + CLI)

- New `inventoryElementorDocument()` in dom-engine (provider-neutral):
  per-widget classification (supported / unsupported reason), schema-declared
  editable controls with rich-text flags and normalized visible text, plus a
  deterministic locator (`section-path#elementId.settings.path`).
- `forge wp elementor inspect` now shows: page title + URL, Elementor version,
  edit mode, **document fingerprint**, builder support state, layout inventory,
  per-widget supported fields with text previews, unsupported fields, and the
  UniversalPage mapping summary. `--json` for machines, `--raw` for the full
  `_elementor_data` (no raw JSON dump by default — machine or human).

### Phase 3 — Patch resolution hardening (`@forge/dom-engine`)

- New codes: `PATCH_WIDGET_TYPE_CHANGED` (element exists but is a different
  widget than reviewed) and `PATCH_UNSUPPORTED_SETTING` (control exists on the
  element but is not a schema-declared editable control for that widget) —
  previously conflated with `PATCH_TARGET_NOT_FOUND`.
- Patches capture `expectedWidgetType` (and `sourceFingerprint`); the resolver
  rejects on mismatch. All seven Phase-3 cases are unit-tested: original
  succeeds; changed document → `PATCH_STALE`; widget removed →
  `PATCH_TARGET_NOT_FOUND`; widget type changed → `PATCH_WIDGET_TYPE_CHANGED`;
  setting unknown → `PATCH_UNSUPPORTED_SETTING`; different page / new
  fingerprint → `PATCH_STALE`.
- The fingerprint is now deeply structural (object keys recursively sorted),
  so post-save Elementor reformatting does not count as staleness.

### Phase 4 — Rich-text safety (`@forge/dom-engine`)

- New `isElementorUrlSafe()` allowlist enforced by the sanitizer: `http(s)`,
  `mailto`, `tel`, fragments, relative and protocol-relative URLs are kept;
  `javascript:`, `data:`, `vbscript:`, `file:` and malformed URLs have their
  `href` stripped while the link text survives.
- Tested for paragraph+bold, paragraph+link, ordered/unordered lists, nested
  inline emphasis, headings, script/iframe/form/object/embed removal, event
  handler stripping, malformed HTML, empty content, and URL classification
  (including case-variant `JaVaScRiPt:`).

### Phases 5–8 — End-to-end flow, dry-run, apply/verify, rollback (CLI bridge)

- A new regression suite (`apps/cli/src/elementor/e2e.test.ts`) proves the full
  production chain: ContentPatch → Review approve → Composer bundle →
  ExecutionPlan → bridge resolve → transport write → structural re-read
  verification → rollback restore, plus the stale-after-approval refusal.
- Dry-run is exhaustive and side-effect-free: preview/validate/apply-dry-run
  resolve + mutate + verify locally, produce the resulting document, diffs,
  affected widgets and compatibility problems, and perform zero writes
  (asserted by a dedicated regression test).
- Apply verifies by parsing the re-read and comparing the structural
  fingerprint — never by raw-string equality or by HTTP status alone. Failure
  triggers an automatic guarded rollback; success reports before/after
  fingerprints.
- Rollback payloads now carry `appliedFingerprint`. Rollback validates the
  payload structurally, reads the current document, **refuses by default when
  the remote changed since the apply** (`ROLLBACK_REFUSED`-style refusal with
  both fingerprints), restores atomically guarded by the fresh read, re-reads,
  and reports the final fingerprint. `--force` documents the deliberate
  override.

### Phase 9 — Real-site integration test harness

- Extended transport-level tests (`elementor-integration.test.ts`, opt-in) and
  added the full-chain developer test (`apps/cli/src/elementor/integration.test.ts`,
  opt-in, env-guarded): connect → detect → inspect → map → construct a safe
  patch from live content → preview → validate → apply → re-read → verify →
  rollback → re-read → verify restoration. Both suites read credentials strictly
  from `FORGE_WP_INTEGRATION/WP_URL/WP_USER/WP_APP_PASSWORD/WP_PAGE_ID` and
  never print them.

### Phases 10–12 — CLI workflow, security, observability

- The intended workflow is discoverable: bare `apply` is always dry-run
  (`Pass --apply to write for real`), positionals or `FORGE_WP_*` env vars,
  group-level safety help text, per-command descriptions, and non-zero exits on
  any failed outcome.
- Focused security audit of the bridge (see §3): auth + per-document
  authorization, strict payload/size/structure validation, no generic
  meta-writes, verified writes with fail-closed semantics, defensive rollback,
  safe rich-text policy. No PHP execution, no nonce substitute needed
  (application-password REST auth), no logging of sensitive data.
- Elementor write/rollback lifecycle events are recorded through the existing
  `@forge/memory-engine` event store (`apps/cli/src/elementor/memory.ts`) —
  target page, fingerprints, patch/execution ids, provider, verification and
  rollback status. Never credentials (recorded shapes are unit-tested).

## 3. Supported / unsupported widgets

**Supported for safe text-content patching** (conservative schema, unit-tested):
`heading` (`title`), `text-editor` (`editor`, rich text), `button` (`text`,
`link`), `image` (`alt` via `image.alt`, `caption`), `text-path`, `icon`,
`icon-list`, `video` (`video_url`), `divider`, `spacer` (`height`).
Patchability requires Elementor ≥ 2.x and a parseable element array.

**Refused (`PATCH_UNSUPPORTED_WIDGET`)**: `html`, `shortcode`, `template`,
`loop-grid`, `loop-carousel`, `form`, `nav-menu`, `popup`, `google_maps`,
`maps`, `lottie`, `code-highlight`, layout elements as patch targets, and any
widget/control not in the conservative schema. Unknown settings are never
guessed.

## 4. Security model (audit findings)

- **Authentication:** standard WordPress REST authentication (application
  passwords recommended). The document routes additionally require
  `edit_post` capability for the specific document; non-authenticated requests
  never reach handlers.
- **Authorization:** per-document (`edit_post` on the id), plus `page`/`post`
  type restriction — the endpoints cannot touch other post types or meta keys.
- **Validation:** strict id validation, 5 MB payload cap, JSON shape check,
  and a recursive Elementor element-structure check (non-empty list, string
  `id` + `elType`, object settings). `expectedModified`/`expectedVersion`
  optimistic-concurrency guards return 409 without writing.
- **No generic mutation surface:** the PUT route is constrained to a valid
  Elementor element array. There is no "set arbitrary `_elementor_data`" or
  arbitrary-meta endpoint; the transport is typed and consumer-constrained
  (schema-declared controls only).
- **Verified writes:** server-side re-read + structural compare (`verified`
  flag); client-side re-read + structural fingerprint compare. `verified:
  false` is not success.
- **Injection surface:** generated HTML passes the dom-engine rich-text policy
  (allowlisted block/inline tags, attribute filtering, URL-scheme allowlist).
  The plugin never executes, interpolates, or echoes content as PHP/HTML;
  nonces are not applicable for application-password REST auth.
- **Secrets:** no credentials, headers, passwords, keys, or tokens appear in
  source, tests, fixtures, logs, or docs. The integration tests read them only
  from the environment and never print them.

## 5. Known limitations / technical debt

- The companion plugin is PHP and is not executed by CI; it is covered by code
  review, deterministic TypeScript transport tests, the typed body-contract
  tests, and the opt-in integration suites (which a developer can run against a
  developer-owned site).
- Rollback payloads remain user-managed files (no new persistence system —
  forbidden by the sprint). `apply --apply --output <file>` → `rollback --original <file>`.
- `universal-mapper` text-anchor matching remains intentionally conservative
  (unique matches only).
- The `memory.ts` writer stores under the conventional `projects/` directory;
  the persistence semantics (merge vs overwrite) belong to the existing
  memory-engine storage layer and were not changed here.