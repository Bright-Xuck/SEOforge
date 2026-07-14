# Forge

AI Operating System for Websites.

Forge is a modular, extensible platform for understanding, improving, operating, and maintaining websites. It is not an SEO tool, chatbot, or WordPress plugin — SEO is one capability among many.

---

## Requirements

- **Node.js** >= 20
- **pnpm** >= 9

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the CLI
node apps/cli/dist/index.js
```

---

## Workspace Structure

```
forge/
├── apps/
│   └── cli/              # Command-line interface
├── packages/
│   ├── core/             # Domain models, interfaces, base contracts
│   ├── config/           # Configuration loading and validation
│   ├── logger/           # Structured logging
│   └── shared/           # Reusable utilities and constants
├── docs/                 # Architecture and design documentation
├── tests/                # Repository-level tests
└── scripts/              # Development utilities
```

---

## Commands

| Command             | Description             |
| ------------------- | ----------------------- |
| `pnpm build`        | Build all packages      |
| `pnpm dev`          | Watch mode              |
| `pnpm test`         | Run tests               |
| `pnpm lint`         | Lint all packages       |
| `pnpm format`       | Format all files        |
| `pnpm format:check` | Check formatting        |
| `pnpm typecheck`    | Type-check all packages |
| `pnpm clean`        | Remove build outputs    |

---

## Packages

### `@forge/core`

Core domain models, interfaces, and base contracts. Platform-independent with no runtime dependencies.

### `@forge/config`

Configuration loading from environment variables with validation. Missing required variables fail immediately.

### `@forge/logger`

Structured JSON logging with configurable levels, timestamps, and output streams. Every package uses this logger.

### `@forge/shared`

Reusable constants and pure utility functions. No business logic, providers, or AI.

---

## Architecture

Forge follows a layered architecture where dependency direction flows inward:

```
Apps → Workflows → Skills → Tools → Providers → Core
```

Lower layers never depend on higher layers. Core is platform-independent. Business logic never depends on implementations.

---

## Development

### Adding a new package

1. Create the package directory under `packages/`
2. Add `package.json` with `@forge/{name}` scope
3. Add `tsconfig.json` extending `../../tsconfig.base.json`
4. Create `src/index.ts` as the single public entry point
5. Add the package to any dependent `package.json` files

### Code standards

- TypeScript strict mode
- No `any`, `@ts-ignore`, or `@ts-nocheck`
- Maximum 300 lines per file (500 hard limit)
- Maximum 40 lines per function
- kebab-case for files and folders
- PascalCase for classes and interfaces
- camelCase for functions and variables

---

## License

Private. All rights reserved.
