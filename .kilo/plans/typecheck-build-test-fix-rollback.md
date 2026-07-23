# Typecheck / Build / Test Sweep + rollback.ts Fix

**Status:** Plan
**Scope:** Entire project (all packages + CLI)
**Priority:** Fix `packages/optimization-composer/src/rollback.ts` first, then sweep

---

## Context observed so far

- `packages/optimization-composer/src/rollback.ts` imports `RollbackGroup` from `./types.ts`.
- `packages/optimization-composer/package.json` uses `"exports": { ".": { "import": "./src/index.ts" } }` — **no `dist` output**, so this package likely cannot be built by Turborepo as a normal output-producing package. That’s a likely root cause of build/test failures if Turborepo tries to collect outputs from it.
- `optimization-composer/tsconfig.json` extends root `tsconfig.base.json`, but no `tsc` build script is defined in `package.json` (only devDependency on `typescript`). So `pnpm build` at the root will skip/fail on this package unless Turborepo treats it differently.
- The rest of the repo (per sprint-1 and sprint-7 completion reports) expects: `pnpm install && pnpm build && pnpm lint && pnpm typecheck && pnpm test` to pass.

---

## Tasks (ordered)

### 1. Run diagnostics (no fixes yet)

- `pnpm typecheck` (or `pnpm -w typecheck` / `pnpm run typecheck --if-present`) — capture full error list.
- `pnpm build` — capture full failure log.
- `pnpm test` — capture failing tests.

If any of these commands lack root scripts, use `pnpm turbo run build --continue` etc. See `turbo.json` at repo root for defined pipelines.

Record every error with:
- package name
- file path
- line number (TS error) or test name (test failure)
- exact error text

---

### 2. Fix `packages/optimization-composer/src/rollback.ts`

After diagnostic data is in hand, fix the actual bugs in `rollback.ts`:

Common failure modes for exactly this file/package:
a) **Type mismatch with `RollbackGroup`** — open `packages/optimization-composer/src/types.ts` and confirm the `RollbackGroup` interface shape. If `createGroup` in `rollback.ts` omits required fields or assigns wrong types, fix them.
b) **`.js` extension resolution** — `rollback.ts` imports from `'./types.js'`. If tsconfig `moduleResolution` is `bundler`/`node16`, this is correct when built; if `node`, it can fail. Fix only if diagnostics flag this.
c) **package.json exports** — if Turborepo / bundler flags this package, change `exports` to point to `./dist/index.js` and add a `build` script:
   ```json
   "scripts": {
     "build": "tsc",
     "dev": "tsc --watch",
     "typecheck": "tsc --noEmit",
     "clean": "del /q dist 2>nul || rmdir /s /q dist"
   }
   ```
   Also add `"main": "./dist/index.js"` and `"types": "./dist/index.d.ts"` for compatibility.
d) **Tree-shake / circular import** — if `types.ts` re-exports from another file that imports `rollback.ts`, break the cycle.

Do **not** change the public API of `RollbackManager` (`createGroup`, `getGroup`, `listGroups`, `removeGroup`, `clear`) or `generateRollbackGroupId` unless a type mismatch forces it. Preserve the deterministic `rollback-${bundleId}` shape.

---

### 3. Sweep and fix all other project errors

Using the error log from Step 1:

- **TS errors**: fix types, add missing imports, correct generics, resolve `.js` extension paths, fix package.json `exports`/`types`/`main` for any package that declares `exports` but has no `dist` entry **or** has a `build` script that fails.
- **Build errors**: same category as TS errors, plus check `turbo.json` pipeline assumes every package has a `build` script. Add missing `build`/`typecheck`/`clean` scripts to any package that lacks them (follow homepage-engine or tools pattern).
- **Test errors**: fix the source bugs, not the tests, unless the tests themselves reference moved APIs (in which case update them to match current exports).
- **Lint errors**: fix import ordering, unused vars, formatting per existing ESLint/Prettier config.

Treat as **additive/minimal**: do not rename exports, do not refactor working packages, do not introduce new abstractions. Fix only what is broken.

---

### 4. Re-verify green

Re-run in order:
1. `pnpm build`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test`

All must pass. If any step still fails, loop back to Step 3 with the new error log.

---

## Out of scope (do not touch)

- `packages/content-intelligence` (new, not yet created — Sprint 16 plan is separate).
- homepage-engine, pipeline-engine, AI layer, CMS providers, CLI feature additions.
- Any file outside `packages/optimization-composer/src/rollback.ts` unless a diagnostic from Step 1 shows it is broken.

---

## Open question (for implementer to confirm from diagnostics)

Is `packages/optimization-composer` the *only* package missing a `build`/`typecheck` script, or are there other leaf packages in the same state? If multiple, apply the same minimal `package.json` script fix pattern to all of them.
