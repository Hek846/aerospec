# AeroSpec Documentation

Living docs use **[Mermaid](https://mermaid.js.org/)** diagrams — they render
natively on GitHub. Update diagrams in the **same commit** as any related code
change (see `.cursor/rules/` and `AGENTS.md`).

## Living documents (keep current)

| Document | Diagrams |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System overview, data-flow sequence, sync state machine, ER schema, onboarding, map privacy, deployment |
| [`PIPELINE.md`](./PIPELINE.md) | Pipeline overview, BLE protocol, ingestion, mobile sync, auth/RBAC |
| [`../README.md`](../README.md) | Top-level system diagram |
| [`../apps/api/README.md`](../apps/api/README.md) | Request lifecycle, module layout |
| [`../apps/mobile/README.md`](../apps/mobile/README.md) | Mobile data flow, feature map |
| [`../apps/mobile/docs/BLE_PROTOCOL.md`](../apps/mobile/docs/BLE_PROTOCOL.md) | Nordic UART services, history transfer, command set |
| [`../apps/mobile/docs/API_SPECIFICATION.md`](../apps/mobile/docs/API_SPECIFICATION.md) | Auth + client request flow |

## Historical / reference (update only when still relevant)

| Document | Notes |
|---|---|
| `apps/mobile/sensair_mobile_prd.md` | Original PRD (Sensair branding) |
| `apps/mobile/STAGE_*.md` | Phase planning checklists |
| `apps/mobile/docs/QUESTIONS_ANSWERED.md` | Early decisions — some superseded by Phase 1 implementation |
| `apps/web/README_DESIGN.md` | Visual design tokens (no workflow diagrams) |

When a historical doc conflicts with `PIPELINE.md` or `ARCHITECTURE.md`, the
living docs win.
