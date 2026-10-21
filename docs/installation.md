# Installing and Onboarding Forge

This guide gets a local Forge checkout from zero to a verified dry-run against a real
WordPress/Elementor page. It assumes the companion plugin and the live checks described in
[`elementor-live-integration.md`](elementor-live-integration.md).

## 1. Prerequisites

| Component | Requirement |
| --- | --- |
| Node.js | 20 or newer (`node --version`) |
| pnpm | 9 or newer (`pnpm --version`) |
| WordPress | 6.x or newer, with REST API access |
| Elementor | Installed and active on the target page |
| Rank Math | Installed and active (Forge's metadata contract) |
| Forge companion plugin | `forge-elementor-bridge` 0.2.0+ on the WordPress site |
| AI provider | Z.ai (`ZAI_API_KEY`) is the verified live provider; other providers are optional |

Forge is a local CLI. Deterministic analysis and metadata-only optimization run without a
cloud account; AI section writing uses the provider you configure. It never writes without an
explicit `--apply`.

## 2. Install the repository

```powershell
git clone <your-fork-or-repository-url> SEOforge
cd SEOforge
pnpm install
pnpm build
```

`pnpm build` is required before `pnpm forge ...` because the CLI runs from `apps/cli/dist`.

The repository exposes a convenience script:

```powershell
pnpm forge --help
pnpm forge doctor
```

If you prefer, run the built entry point directly:

```powershell
node apps/cli/dist/index.js doctor
```

## 3. Create your local environment file

Copy the template and edit only your local `.env`:

```powershell
Copy-Item .env.example .env
```

or:

```bash
cp .env.example .env
```

The important WordPress values are:

```dotenv
FORGE_WP_SITE_URL=http://127.0.0.1:8080
FORGE_WP_USERNAME=your-wordpress-username
FORGE_WP_APPLICATION_PASSWORD=your-application-password
FORGE_HOME_URL=http://127.0.0.1:8080
FORGE_WP_PAGE_ID=6
```

Create the application password in WordPress under **Users → Profile → Application
Passwords**. Use a dedicated low-privilege account for staging where possible.

Precedence rules:

1. Values already exported in your shell or CI environment win.
2. The local `.env` file fills in anything not already set.
3. `.env` is gitignored. Never commit it and never put real credentials in `.env.example`.

Forge will not fall back to `example.com`, `forge`, or `password`. Missing or malformed
WordPress configuration now fails with an actionable message.

## 4. Install the companion plugin

The write bridge is a small WordPress plugin in this repository:

```text
packages/providers-wordpress/companion/forge-elementor-bridge.php
```

On the WordPress host:

1. Create `wp-content/plugins/forge-elementor-bridge/`.
2. Copy `forge-elementor-bridge.php` into that directory.
3. Activate **Forge Elementor Bridge** in **Plugins**.
4. Confirm the plugin reports version `0.2.0` or newer.

For a local site served over plain HTTP, WordPress may reject application-password
authentication unless it is told this is a local environment. Add this to `wp-config.php`
only on local/staging installations:

```php
define('WP_ENVIRONMENT_TYPE', 'local');
```

Do not use that constant on a production site.

See [`elementor-live-integration.md`](elementor-live-integration.md) for the full live
integration report and the companion endpoint contract.

## 5. Configure AI generation

At least one provider key is needed for AI section writing. Z.ai is the verified path:

```dotenv
ZAI_API_KEY=your-zai-key
DEFAULT_PROVIDER=zai
DEFAULT_MODEL=glm-4.5-flash
```

`glm-4.5-flash` is the tested default. The previously used `glm-4.7-flash` was observed
returning intermittent `429`/`1305` responses.

Without an AI key, Forge still runs deterministic metadata-only optimization. It never
fabricates section copy as a fallback.

## 6. Verify configuration

Start with the offline check:

```powershell
pnpm forge doctor
```

`doctor` checks Node, `.env` loading, WordPress URL/credentials, AI provider keys, the
Ollama URL, and that `projects/` is writable. It never prints secrets and makes no network
calls.

Then run the live checks:

```powershell
pnpm forge ai test zai --model glm-4.5-flash
pnpm forge wp elementor doctor 6
```

`ai test` and `wp elementor doctor` are the only checks that contact a provider or the
site. They exit non-zero on failure.

## 7. First safe dry-run

The dry-run reads the real rendered page and Elementor document, builds a review session,
and writes nothing:

```powershell
pnpm forge optimize default `
  --url http://127.0.0.1:8080 `
  --page 6 `
  --provider zai `
  --model glm-4.5-flash `
  --keyword "accounting software" `
  --brand "Your Brand" `
  --audience "small businesses" `
  --dry-run `
  --json
```

Review the `reviewSession` and `metadataProposal` fields. Each content patch now includes a
deterministic `quality` report:

- `accurate`: numeric claims must be grounded in the existing section or brand/source
  evidence.
- `useful`: copy must contain concrete features, actions, or outcomes rather than generic
  marketing language.
- `warnings`: generic fluff, audience/keyword mismatch, readability, and prohibited brand
  language force manual review.

Accuracy errors invalidate a patch. A human `EDIT` is required before an invalid patch can
be executed.

## 8. Apply and roll back

Only after reviewing the dry-run:

```powershell
pnpm forge optimize default --url http://127.0.0.1:8080 --page 6 --provider zai --model glm-4.5-flash --keyword "accounting software" --apply
```

`--apply` explicitly approves the reviewed items and writes them. Execution re-reads and
verifies the write. A rollback artifact is saved under `projects/<project>/execution/`.

Restore the original document with the generated artifact:

```powershell
pnpm forge execution rollback --from projects/default/execution/<timestamp>-rollback.json
```

Always run apply against staging first, and rotate the WordPress application password after
shared testing.

## 9. Regression and release checks

Run the full local gate:

```powershell
pnpm release:check
```

That runs `pnpm typecheck`, `pnpm test`, and `pnpm build`.

Opt-in live suites are separate and are not run by default:

```powershell
$env:FORGE_WP_INTEGRATION='true'
pnpm test
pnpm elementor:e2e
```

Live suites require the `FORGE_WP_*` values described in
[`elementor-live-integration.md`](elementor-live-integration.md).

## 10. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `FORGE_WP_SITE_URL is not set` | Copy `.env.example` to `.env`, set the site URL, then run `pnpm forge doctor`. |
| `AI provider "zai" is not configured` | Set `ZAI_API_KEY` in `.env` or the shell, then run `pnpm forge ai test zai`. |
| `ai test` says unreachable | Check the key/model, network access, and provider status. For Ollama, start the local service and check `OLLAMA_BASE_URL`. |
| `ELEMENTOR_NOT_INSTALLED` | Activate Elementor and the companion plugin; run `pnpm forge wp elementor doctor <page>`. |
| `AUTHENTICATION_FAILED` | Recreate the WordPress application password and update `.env`. Local HTTP sites may need `WP_ENVIRONMENT_TYPE=local`. |
| `PATCH_STALE` | The page changed after the review snapshot. Re-run the dry-run and review the new patch. |
| `Rank Math metadata could not be read` | Confirm Rank Math is active and the companion endpoint is reachable. Content can still apply; metadata writes are skipped. |
| No AI key | Metadata-only optimization runs. Add a provider key when you want generated section copy. |

For architecture and the review/execution chain, see [`architecture.md`](architecture.md)
and the sprint records in `docs/`.
