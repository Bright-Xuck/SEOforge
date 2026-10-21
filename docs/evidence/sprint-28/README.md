# Sprint 28 Evidence

Real run against local WordPress `http://127.0.0.1:8080`, page 6
(`Forge Elementor E2E Staging Page`), Elementor 4.3.5, Rank Math 1.0.280.

Credentials were provided through environment variables and are **not** present in
these files. The WordPress application password, Z.ai API key, `Authorization`
header, and `FORGE_WP_*` / `ZAI_API_KEY` values are intentionally absent.

## Files

| File | What it proves |
| --- | --- |
| `ai-preview.json` | Z.ai preview: 5 patches (3 Elementor + 2 Rank Math), all approved, prompt version `1.1.0`, model `glm-4.5-flash`, dry-run execution, no writes. |
| `ai-review-apply.json` | Applying the reviewed preview session with `review apply --apply`: all 5 actions completed, none failed or skipped, rollback artifact path recorded. |
| `ai-apply-live.json` | Live re-read after apply: optimized Elementor heading/body/button, optimized Rank Math fields, and rendered-HTML checks (new content present, old content absent). |
| `ai-rollback.json` | `review rollback` result: all 5 rollback operations restored, none failed. |
| `ai-rollback-live.json` | Live re-read after rollback: baseline Elementor content and Rank Math fields restored; optimized content absent from rendered HTML. |
| `ai-apply-failed-verification.json` | Earlier failed apply kept for audit: Elementor verification compared serialized JSON too strictly and later actions were marked stale by the shared document fingerprint. Both defects are fixed. |
| `preview.json` | Metadata-only preview run: real page read, 3 Elementor sections derived, 2 metadata patches, review session, dry-run execution, rollback artifact path. No writes. |
| `apply.json` | Metadata-only `--apply`: both metadata actions executed, rollback artifact persisted. |
| `apply-live-meta.json` | Rank Math fields re-read after the metadata-only apply. |
| `rollback-result.json` | Metadata-only `execution rollback --from` result. Captured before the rollback reporting fix, so `completedActions` is empty; the two restored `rollbackPlan` entries and the live re-read are the proof. |
| `rollback-live-meta.json` | Rank Math fields re-read after the metadata-only rollback: baseline restored. |
| `review-complete.json` | A decided preview session marked `completed`. |
| `review-apply.json` | Standalone `review apply --apply` on an earlier session. |
| `review-rollback.json` | Standalone `review rollback` for that earlier session. Also captured before the reporting fix. |

## AI-generated Elementor content

Applied values:

```json
{
  "heading": "Small Business Accounting Software Simplified",
  "body": "Save time and grow your business\n\n<p>Our accounting software helps small businesses manage finances efficiently, so you can focus on what matters most.</p>\n<ul>\n  <li>Trusted by 2,000+ teams to handle financial tasks accurately.</li>\n  <li>Automate invoicing and payments to reduce manual work.</li>\n  <li>Track expenses and income in real-time for clear insights.</li>\n  <li>Generate reports quickly without complex spreadsheets.</li>\n</ul>",
  "button": "Try Accounting Software Free"
}
```

The generated body preserves the existing trust statement (`Trusted by 2,000+
teams`) rather than inventing a new statistic, which is the required behavior.

## Metadata baseline and applied values

Baseline:

```json
{
  "title": "Forge Elementor E2E Staging Page",
  "description": "Staging page used by Forge end-to-end tests.",
  "focusKeyword": null,
  "canonical": null,
  "robots": []
}
```

Applied:

```json
{
  "title": "Accounting Software: Forge Elementor E2E Staging Page",
  "description": "Accounting Software: Staging page used by Forge end-to-end tests. SEO Forge.",
  "focusKeyword": null,
  "canonical": null,
  "robots": []
}
```

## What is not covered

- Internal-link insertion: links are recommendations only.
- Full-site page prioritization: `optimize` seeds one page.
- Per-field metadata rollback: a metadata action restores the full prior Rank Math snapshot.

See [`../../sprint-28.md`](../../sprint-28.md) for the commands and the
architecture notes.
