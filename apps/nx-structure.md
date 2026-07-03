# Apex — NX monorepo structure

## Repo layout
```
apex/
├── apps/
│   ├── web/          # Next.js frontend (Apex UI)
│   └── api/          # Node.js backend (REST/GraphQL)
├── libs/
│   ├── shared/ui/    # Shared React component library
│   ├── shared/types/ # Shared TypeScript types and interfaces
│   ├── shared/utils/ # Common utilities and helpers
│   └── domain/       # Business logic translated from Delphi
├── legacy/           # Original Delphi source — read-only AI reference
├── docs/             # Domain context and migration tracking
├── nx.json
└── package.json
```

## Path aliases
- `@apex/ui`     → libs/shared/ui/src/index.ts
- `@apex/types`  → libs/shared/types/src/index.ts
- `@apex/utils`  → libs/shared/utils/src/index.ts
- `@apex/domain` → libs/domain/src/index.ts

## Key NX commands
```bash
nx serve web                          # Run frontend dev server
nx serve api                          # Run API dev server
nx test domain                        # Test domain lib only
nx affected --target=test             # Test only what changed
nx generate @nx/react:lib shared/ui   # Add a new lib
nx generate @nx/react:component Button --project=shared-ui
```

## Branch rules
- `main`       → Delphi production (do not touch)
- `dev`        → Active Delphi development (do not touch)
- `web/main`   → Apex modernization trunk (all web work lives here)
- `web/feat-*` → Individual feature branches off web/main

## Dependency graph
- apps/web    → @apex/ui, @apex/types, @apex/domain
- apps/api    → @apex/types, @apex/domain
- libs/domain → @apex/types, @apex/utils