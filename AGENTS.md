# Agent instructions (AeroSpec monorepo)

All agents working in this repository must follow these conventions.

## Documentation: Mermaid first

- Prefer **Mermaid diagrams** over ASCII art, bullet-only flow descriptions,
  or prose-only architecture explanations in Markdown files.
- GitHub renders Mermaid natively — use `flowchart`, `sequenceDiagram`,
  `stateDiagram-v2`, `erDiagram`, and `classDiagram` as appropriate.
- Keep diagram labels short; put details in prose below the fence.

## Keep docs in sync with code

When you change architecture, API routes, DB schema, BLE protocol, or
deployment:

1. Update the binding contract in [`docs/PIPELINE.md`](docs/PIPELINE.md).
2. Update the matching diagram(s) in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
3. Update app-level READMEs if their scope changed (`apps/api`, `apps/mobile`).
4. Do this in the **same commit** as the code change.

See [`.cursor/rules/keep-docs-current.mdc`](.cursor/rules/keep-docs-current.mdc)
and [`.cursor/rules/mermaid-docs.mdc`](.cursor/rules/mermaid-docs.mdc).

## Source-of-truth hierarchy

1. **Running code** (routes, migrations, mobile BLE implementation)
2. **`docs/PIPELINE.md`** — API + data contract
3. **`docs/ARCHITECTURE.md`** — diagrams and system map
4. App READMEs and mobile `docs/*` — scoped detail
5. Historical PRD/STAGE files — reference only

## Key paths

| Area | Path |
|---|---|
| API entry | `apps/api/src/index.ts` |
| DB migrations | `apps/api/src/db/migrations/` |
| Mobile BLE | `apps/mobile/lib/data/ble/` |
| Web map | `apps/web/src/pages/MapView.tsx` |
| Docker | `docker-compose.yml` |

## Demo credentials

`admin@aerospec.io` / `aerospec-admin` (seeded admin, real bcrypt auth).
