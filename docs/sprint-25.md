# Sprint 25 — Universal Patch Application & Elementor/WordPress Write Bridge

**Version:** v0.25.0
**Goal:** Make the existing intelligence/generation/review/composer/execution chain safely modify **real Elementor-built WordPress pages** — without a new engine, without an MCP, without unsafe HTML replacement.

---

## 1. What already existed (audit findings)

| Capability | Where | Status |
|---|---|---|
| Elementor JSON parser / serializer (`_elementor_data` → `ContentNode` tree) | `@forge/dom-engine/src/elementor/` | Existing (Sprint 21) |
| Elementor patch target (`elementId` + `settingsKey`), widget schema, semantic-intent resolver | `@forge/dom-engine` | Existing (Sprint 21) |
| Format detection (`_elementor_data` + `_elementor_edit_mode`) | `@forge/dom-engine/src/format-detector.ts` | Existing |
| `applyContentPatch` routing by `target.format` | `@forge/dom-engine/src/patch/patch-engine.ts` | Existing |
| Universal Page Model + builder detection | `@forge/dom-engine` | Existing (Sprint 23) |
| ContentPatch / Review Session / Composer bundles / Execution Plan | `content-generation`, `review-engine`, `optimization-composer`, `action-engine` | Existing |
| `WriteProvider` contract (preview/apply/rollback) + WordPress REST client | `@forge/core`, `@forge/providers-wordpress` | Existing |
| Execution Engine `domEngine.resolve` hook | `@forge/execution-engine` | Existing |

**Not present:** an `ElementorDocument` model (version/fingerprint), a UniversalPage ↔ Elementor mapping, typed patch resolution with error codes, stale-patch protection, rich-text rules for Elementor controls, a REST transport for Elementor documents, a safe write/verify/rollback bridge, CLI commands, or Elementor MCP integration.

---

## 2. The real Elementor data path (research-backed)

Elementor stores page structure as **structured JSON in the private `_elementor_data` post meta**. That meta is **not exposed** through the standard `wp/v2` REST API (confirmed by Elementor docs and community reports). Therefore:

- **Path B (REST + registered meta) — rejected.** Private meta is not safely writable via standard REST without a custom registration.
- **Path C (companion plugin) — required.** A minimal optional plugin exposes a controlled, authenticated interface.
- **Path D (Elementor native save) — used inside the plugin.** The plugin saves through Elementor's own document API (`\Elementor\Plugin::$instance->documents->get($id)->save()`), so Elementor hooks/CSS/versioning behave exactly as in the editor.
- **No Elementor MCP.** None existed; none was added. SEO Forge works independently of any coding agent.

```
Rendered WordPress page
        ↓
Universal Page Model (dom-engine, understands rendered HTML)
        ↓
ElementorDocument (dom-engine, parses _elementor_data — the source of truth)
        ↓
resolve → mutate → verify (dom-engine, deterministic + conservative)
        ↓
ElementorDocumentTransport (providers-wordpress, REST via companion endpoint)
        ↓
ElementorWriteBridge (CLI composition root: dom-engine + provider + execution-engine)
        ↓
WordPress Provider → Elementor native save → re-read verification
```

**HTML ≠ Elementor source data.** The bridge never downloads rendered HTML, edits arbitrary HTML, and sends it back. It reads `_elementor_data`, mutates only approved settings on a clone, and writes the whole document atomically.

---

## 3. Architecture: where each piece lives

| Layer | Files | Knowledge |
|---|---|---|
| `@forge/dom-engine` | `src/elementor/document.ts`, `setting-path.ts`, `rich-text.ts`, `universal-mapper.ts`, `patch-resolver.ts`, `mutator.ts`; extended `widget-schema.ts`, `patch-engine.ts`, `page/builder.ts` | Elementor JSON structure, widget settings, rich-text rules — **provider-neutral** |
| `@forge/providers-wordpress` | `src/elementor-transport.ts`; extended `client.ts` (`rawRequest`), `wordpress-provider.ts` (read/write/verify/routing), plugin manifest; `companion/forge-elementor-bridge.php` | WordPress REST endpoints, `_elementor_data` meta names, auth — **provider-specific** |
| `apps/cli` | `src/elementor/bridge.ts`; `forge wp elementor` commands | Composition root: dom-engine + provider + execution-engine |
| `@forge/memory-engine` | `types.ts` | `elementor-write` / `elementor-rollback` event types (compatible extension) |

**Why the bridge lives in the CLI:** the bridge needs dom-engine (provider-neutral Elementor model), providers-wordpress (transport), and the execution chain (review → composer → execution-engine). The CLI already depends on all three, so it is the natural composition root with **zero new package edges**. Follow-up cleanup also removed dom-engine's unused workspace dependencies (`ai-engine`, `content-generation`, `core`, `execution-engine`, `knowledge-engine`, `prompt-registry`, `review-engine`) — its manifest now matches its real imports (`@forge/content-intelligence`, `cheerio`), and no `WriteProvider` interface was disturbed (execution-engine consumes the provider-agnostic `WriteProvider` from `@forge/core`).

**No new package was created.** No `@forge/elementor-engine`, no widget engine, no MCP.

---

## 4. What was implemented

### 4.1 Elementor document model (dom-engine)
- `ElementorDocument` = parsed `ContentNode` tree + `meta` (postId, title, `elementorVersion`, `editMode`, `modified`) + **stable structural fingerprint** + original `rawData`.
- `checkElementorDocumentSupport` — version gate: versions ≥ 2.x parse (legacy section/column included); unknown/invalid → `unsupported_document_version` / `invalid_document_data`.
- Unknown settings and `__globals__` references survive read → modify → write (verified by tests).

### 4.2 UniversalPage ↔ Elementor mapping (dom-engine)
- `mapUniversalPageToElementor(page, document)` — explicit mapping entries with strategy + confidence:
  1. **data-id** (confidence 1.0) — rendered Elementor HTML carries `data-id="<element id>"`; the page builder now captures it in `DomBlock.metadata.elementorElementId`.
  2. **widget-type** (0.8) — only when exactly one widget matches.
  3. **text-anchor** (0.6) — only when exactly one widget's text matches.
- Never nth-child / generated CSS classes / arbitrary text matching.

### 4.3 Patch resolution (dom-engine)
`resolveElementorPatch(document, patch, opts)` → `{ ok, targets }` or a typed error:

| Code | Meaning |
|---|---|
| `PATCH_TARGET_NOT_FOUND` | element id or setting absent |
| `PATCH_TARGET_AMBIGUOUS` | semantic intent matches multiple widgets |
| `PATCH_TARGET_NOT_EDITABLE` | layout element or unmapped control |
| `PATCH_STALE` | live value ≠ `currentContent`, or fingerprint mismatch |
| `PATCH_UNSUPPORTED_WIDGET` | html/shortcode/template/form/… refused |
| `PATCH_UNSUPPORTED_VERSION` | document version out of range |
| `PATCH_INVALID_TARGET` | no usable target |

Nested controls (e.g. image widget `settings.image.alt`) resolve via `settingsPath` (`src/elementor/setting-path.ts`).

### 4.4 Rich text (dom-engine)
- `sanitizeElementorRichText` — allowlist (headings, p, br, strong/b, em/i, a, ul/ol/li, span, code, blockquote, pre); unsafe tags stripped; unknown tags unwrapped.
- `isElementorRichTextSetting` / `isElementorPlainTextSetting` — per-widget control kinds.
- Plain-text controls reject markup at resolution; rich-text controls are sanitized at mutation time.

### 4.5 Mutation + verification (dom-engine)
- `applyElementorMutations` — clone the tree, touch only targeted leaves (immutable), preserve everything else.
- `verifyElementorMutation` — targeted settings changed AND unrelated settings/structure unchanged (structural compare).

### 4.6 Transport (providers-wordpress)
- `ElementorDocumentTransport` — `readDocument` / `writeDocument` against `wp-json/forge/v1/elementor/documents/{id}` with optimistic concurrency (`expectedVersion`/`expectedFingerprint`/`expectedModified`, 409 on conflict).
- `WordPressClient.rawRequest` — arbitrary site paths outside `wp/v2`.
- `WordPressProvider.getElementorDocument` / `updateElementorDocument` / `isElementorAvailable`; `applyWrite` routes `resourceType: "elementor-document"` to the companion endpoint and **verifies by re-read** (an HTTP 200 alone is not sufficient).

### 4.7 Bridge (CLI)
`createElementorBridge(provider)` — `inspect`, `resolve`, `preview`, `validate`, `apply`, `rollback`.
- `apply` dry-run (default): resolve + mutate + verify locally, produce the exact proposed change + rollback payload, **zero remote mutations**.
- `apply` real: resolve (blocks on error codes) → mutate → **atomic whole-document write** → verify by re-read → rollback payload. On write/verify failure the original document is restored.
- `rollback(payload)`: restore the exact original document and verify.
- Rollback payload = post id + original `_elementor_data` + original fingerprint — enough to restore the exact state SEO Forge modified.

### 4.8 CLI commands
```
forge wp elementor inspect  <site> <username> <password> <page>
forge wp elementor preview  <site> <username> <password> <page> --patch <file>
forge wp elementor validate <site> <username> <password> <page> --patch <file>
forge wp elementor apply    <site> <username> <password> <page> --patch <file> [--apply] [--output <file>]
forge wp elementor rollback <site> <username> <password> <page> --original <file>
```
- `<page>` accepts a post ID or a page URL.
- `apply` is **dry-run by default**; `--apply` performs the provider-backed write.
- Preview prints the exact target (page → section/element → Elementor ID → widget → control → current → proposed).
- Raw arbitrary JSON mutation is not a user workflow.

### 4.9 Companion plugin (Path C + D)
`packages/providers-wordpress/companion/forge-elementor-bridge.php` — optional, documented, security-reviewed:
- `GET/PUT /wp-json/forge/v1/elementor/documents/{id}`.
- Requires logged-in user with `edit_post` capability (application-password auth).
- Writes are atomic whole-document replacements with optimistic concurrency.
- Saves through Elementor's native document API when available; falls back to `update_post_meta`; clears Elementor CSS cache.

---

## 5. Testing (deterministic, no network, no AI, no WordPress writes)

| Suite | Coverage |
|---|---|
| `dom-engine/src/elementor/elementor.test.ts` (28 tests) | Fixtures A–I, round-trip losslessness, unknown settings + `__globals__` preservation, version gate, data-id mapping, every resolver error code, rich-text sanitization, mutation + verification, nested containers |
| `providers-wordpress/src/elementor-transport.test.ts` (6 tests) | read, 404/403 mapping, atomic write + re-read, 409 conflict, invalid response |
| `providers-wordpress/src/wordpress-provider.test.ts` (+1) | `elementor-document` routing through `applyWrite` with verification |
| `apps/cli/src/elementor/bridge.test.ts` (10 tests) | inspect, preview (zero writes), validate incompatibility, dry-run (zero writes), apply + verify + rollback payload, stale block, ambiguous block, `__globals__` round-trip, rollback restore, **Fixture J failed-write → rollback restores original** |
| `execution-engine/src/engine.test.ts` (+2) | `domEngine.resolve` + `fetchResource` hook path; dry-run never calls resolve/write |
| `providers-wordpress/src/elementor-integration.test.ts` | opt-in (`FORGE_WP_INTEGRATION=true`), skipped in CI, credentials from env only |

---

## 6. Final verification

```
pnpm install   ✅
pnpm build     ✅ 31/31 packages
pnpm typecheck ✅ 60/60 tasks
pnpm test      ✅ 412 passed, 2 skipped (opt-in integration), 70 files passed
```

- **dry-run = no remote mutation** — verified by bridge tests (mock provider records writes; dry-run leaves `writes` empty) and by the execution-engine test (dry-run never calls `domEngine.resolve`/`applyWrite`).
- **approved execution = provider-backed mutation** — bridge `apply` with `dryRun: false` writes + re-reads; provider `applyWrite` routes `elementor-document` to the companion endpoint.
- **rollback = original source restored** — bridge `rollback` restores and verifies; Fixture J proves write-failure rollback.
- **no AI/provider dependency leaked into dom-engine/content-intelligence** — dom-engine elementor modules import only `core`, `tools` (cheerio), and internal modules.
- **no Elementor logic leaked into generic execution-engine** — execution-engine unchanged (the existing `domEngine.resolve` hook is used).
- **no new redundant engine/package** — all logic extended existing packages; bridge lives in the CLI composition root.

---

## 7. Supported / partially supported / unsupported (honest claim)

### Supported (tested end-to-end)
- Safe **text-content patching** for Elementor **heading** (`title`), **text-editor** (`editor`, rich text), **button** (`text`), **image** (`image.alt`), **icon / text-path / icon-list / divider / spacer** via the conservative widget schema.
- Deterministic resolution, stale-patch rejection, dry-run, atomic write, re-read verification, rollback restore.

### Partially supported
- Other widget types may parse and inspect, but only schema-listed controls are patchable.

### Unsupported (intentionally refused)
- `html`, `shortcode`, `template`, `loop-grid`, `loop-carousel`, `form`, `nav-menu`, `popup`, `google_maps`, `lottie`, `code-highlight` widgets → `PATCH_UNSUPPORTED_WIDGET`.
- Layout elements (containers/sections/columns) as patch targets → `PATCH_TARGET_NOT_EDITABLE`.
- Elementor document versions < 2.x → `PATCH_UNSUPPORTED_VERSION`.
- Gutenberg / classic pages → existing WordPress write paths, not Elementor semantics.
- Any mutation that would require reconstructing unknown Elementor data.

**The tested claim is:** *SEO Forge supports safe text-content patching for tested Elementor widget types (heading, text-editor, button, image alt, and conservative text widgets), with preview, stale-patch protection, dry-run, atomic verification, and rollback.*

---

## 8. Known limitations / technical debt

- The companion plugin is PHP and is not executed by CI; its TypeScript counterpart is fully mock-tested. A real-site verification requires a developer-owned WordPress/Elementor installation and `FORGE_WP_INTEGRATION=true`.
- Rollback payloads are user-managed files (no new persistence system; the sprint forbids one). `apply --output <file>` → `rollback --original <file>`.
- `universal-mapper` text-anchor matching is intentionally conservative (unique matches only).
- `packages/dom-engine/package.json` declares unused deps (ai-engine, execution-engine, content-generation, review-engine, knowledge-engine, prompt-registry); cleaning them is out of scope for this sprint.
