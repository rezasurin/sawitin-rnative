# Phase 5 mobile implementation record

Implemented in the mobile and backend worktrees on 24 September 2026 against the [Phase 5 plan](phase-5-mobile-implementation-plan.md). The backend Phase 5 checklist remains `READY_FOR_REVIEW`; deployment and device sign-off have not been performed.

## Delivered in the mobile app

- Checker creation and draft correction accept registered vehicles and drivers with manual text fallback. The selected IDs and text snapshots survive online creation and offline replay. A local one-truck check includes RESTAN rows; the create review, Checker detail, and SPB show the truck. A new-document action carries the source header into a separate draft for another truck. Partial queued Checker creation checkpoints the server document ID and replays details sequentially, leaving a server conflict available in queue inspection.
- QR weighing starts with the Checker truck and driver, allows an explicit master or manual choice, and sends optional `kendaraan_id`, `supir_id`, and `nomor_dokumen` through staging. Draft correction can preserve, set, or clear master links. The trip number appears in weighing detail and history.
- Krani and Admin can open a ticket from weighing detail. Ticket capture supports camera/gallery evidence, mill timestamp, ticket number, weight validation with a 1 kg tolerance, online correction and deletion, and audit history. Offline creation for a known server trip copies the photo into durable local storage; replay checkpoints its upload and checks the existing server ticket after an uncertain result. Conflicting tickets remain in the queue for review. Stored media is loaded with the session token.
- A read-only live trace shows server flags, source Panen and Checker, workers, grading, truck and weighing, PKS ticket, sale, evidence, approvals, and history. Janjang, brondol, and kilogram figures remain separate; null weights stay unavailable and decimal strings are rendered as received. The trace is fetched online and is not queued.
- Ticket and trace routes sit under the Krani and Admin weighing stacks, with the existing weighing module permissions. No new permission module or approval action was added.

## Backend staging extension in the separate worktree

`POST /staging/krani-timbang` now accepts optional registered vehicle and driver IDs and a trip document number. It validates tenant ownership, preserves plate/name snapshots, checks source truck identity and trip-number uniqueness, and carries the values through direct and pending-log reconciliation. The additive migration `20260924150000_staging_transport_identity` adds the three pending-log columns. Existing text-only submissions remain valid. This migration was applied to the local integration database only.

## Automated verification

- Mobile: `npm run typecheck`, `npm test` (85 passing), `git diff --check`, and `npx expo export --platform android` passed. Focused checks cover one-truck validation including RESTAN, old text-only Checker replay after a partial response, ticket weight tolerance, photo upload checkpoint plus lost-response replay, and a conflicting ticket. The existing suite also covers queue reopen, user isolation, permission navigation, and earlier operational flows.
- Backend: `prisma validate`, `yarn build`, `yarn test` (152 passing), and the focused reliability integration test (15 passing) passed. The reconciliation unit suite passed all 8 tests, including selected master IDs and a source-truck mismatch. The migration was deployed to the local integration database.

## Deployment and device verification still required

1. Deploy the backend Phase 5 migrations and routes, including `20260924150000_staging_transport_identity`, before using a new mobile build against a live environment. Verify the protected media URL is reachable from the device with its token.
2. On a device, create separate Checker documents for two trucks; test a registered truck and an explicit manual plate through QR weighing. Confirm the server trip retains IDs, text snapshots, source links, and the entered document number. Also test a mismatched truck and duplicate number.
3. Create a photographed PKS ticket offline for an existing trip, restart, reconnect, and verify one server ticket and its photo. Correct the weight group, inspect history, delete only through the explicit correction flow, and confirm conflict recovery retains a different server ticket.
4. Open the live trace and verify flags, source links, restan subset labeling, grading reconciliation, ticket/sale disagreement, protected evidence, and read-only permission behavior. Record backend phase-gate sign-off separately.
