---
name: sawitin-backend
description: >-
  Deep, code-verified knowledge of the sawitin-backend (Express + Prisma + BullMQ) API for building, porting, and
  debugging frontend features in Saweed-Reactjs (web) and saweed-rnative/sawitin (mobile). Use this skill whenever the
  user asks which endpoint to call, what a request body or response shape looks like, how auth/login/JWT/permissions
  work, or mentions bkmPanen, bkmChecker, bkmRawat, kraniTimbang, staging sync, QR payload, restan, hargaTbs,
  penjualan, reconciliation, org scoping, or a cross-stack bug. Also trigger when porting a feature from the web
  frontend to the mobile app, since both consume the same backend. The skill documents exactly which endpoints exist,
  their params and response envelopes, how permissionGuard and org_id scoping work, and where the backend's own docs
  disagree with the actual code — so the agent trusts the code, not stale docs.
---

# Sawitin Backend — API Consumer's Guide

You are working in a frontend (web `Saweed-Reactjs` or mobile `saweed-rnative/sawitin`) that consumes the
`sawitin-backend` (Express 4 + TypeScript, Prisma/PostgreSQL, BullMQ/Redis, Zod validation). This skill gives you the
code-verified truth about that backend so you can pick the right endpoint, build the right request, parse the right
response, and debug failures — without guessing and without trusting stale documentation.

## The one rule: trust the code, not the docs

The backend's own `docs/` are compiled snapshots and some are **outdated or aspirational**. When a reference file in
this skill, a backend doc, or your memory disagrees with `src/` source code — **the source code wins**. The most
important discrepancies are cataloged in `references/gotchas.md`; read it before doing anything else when you start
working.

## Mental model (30-second version)

- **Route → middleware → controller → Prisma.** There is **no domain service layer**. Controllers contain all business
  logic and call Prisma directly. The only services are `InventoryService`, `notificationService`, and an old
  `prismaQueryServices` (superseded, don't use it as a pattern).
- **Everything is org-scoped.** Almost every model carries `org_id`. Controllers read `req.orgId` (set by
  `permissionGuard`) and fail closed with `403 { error: "User or Organization not found" }`. Reads use
  `findFirst({ where: { id, org_id } })`, not `findUnique`.
- **List endpoints return `{ data, meta: { page, limit, total, pages } }`** via `applyQueryFilters`
  (`src/utils/queryHandlers.ts`). Detail-list and special endpoints return bare arrays or raw records. There is no
  unified envelope — see `references/api-catalog.md` for the exact shape of every endpoint.
- **Status transitions are guarded client-side** by `canTransitionStatus` (`src/utils/statusMachine.ts`).
  APPROVED and REVISION_REQUESTED are only reachable via approve/reject endpoints, never via PUT.
- **Auth is a Bearer JWT**, and the Authorization header is the reliable path (cookie names are inconsistent — see
  gotchas).

## Reference files

| File | When to read |
|---|---|
| `references/gotchas.md` | Always first — docs-vs-code discrepancies and per-module quirks |
| `references/api-catalog.md` | Picking an endpoint: method, path, body validation, permission, response shape |
| `references/data-model.md` | Fields, enums, relationships, unique constraints, status machine |
| `references/auth-rbac.md` | Login, JWT, permissionGuard, permission actions, Redis cache, dual-mode |
| `references/reconciliation.md` | Offline staging sync, QR V2 payloads, BullMQ worker, tolerance logic |

The files below are summaries of the reference files; read the reference when you need detail.

## Workflow A — Building or porting a frontend feature

1. **Read `references/gotchas.md`** so you don't reproduce known mistakes.
2. **Map the feature to a module** using the domain knowledge in this skill's section below (or
   `this-project-guidelines` for the business flow). Common modules: `bkmPanen` (harvest), `bkmChecker` (QC/loading),
   `kraniTimbang` (weighbridge), `staging` (offline sync), `restan` (leftover fruit), `bkmRawat` (maintenance),
   `hargaTbs`/`penjualan` (finance, gated on `mod_keuangan`), `lahan`/`blok`/`tph`/`kelompokLahan` (master data),
   `pekerja`/`grupPekerja` (workforce), `user`/`role`/`permission` (RBAC), `filterOptions` (dropdowns).
3. **Find the endpoints in `references/api-catalog.md`.** Note the conventions:
   - Parent documents use GET-list-with-pagination; **details live under `/detail` sub-routes** and are fetched with
     `?parent_id=` returning bare arrays (no `meta`).
   - Some modules use `POST /list` instead of GET (bkmRawat, hargaTbs, penjualan) — body carries filters.
   - Special endpoints: `/approve`, `/reject`, `/ready-for-weighing`, `/ready-to-load`, `/available-tph`,
     `/pending`, `/latest`, `/pickup`, `/changePassword`.
4. **Check the permission requirement** for each endpoint (from the catalog). A call returns 403 if the user's role
   lacks the action. Remember the quirks: kraniTimbang PUT/DELETE require `write`, bkmPanen CRUD has no per-route
   checks, hargaTbs/penjualan gate on `mod_keuangan`.
5. **Shape the request** to the Zod schema (validation failures return `400` with
   `{ error: [{ field, message }] }`). For list endpoints you can pass `filters`, `sort`, `page`, `limit` — see
   `references/auth-rbac.md` (queryParser) or the catalog.
6. **Shape the response handling** in the frontend per the catalog: `{ data, meta }` for lists, raw record for
   singletons, `{ error }` vs `{ message }` for failures, `204` (no body) for deletes. Handle `400/401/403/404/409`
   explicitly.
7. **For mobile offline flows**, read `references/reconciliation.md` — weighbridge submissions go through
   `POST /staging/krani-timbang`, never a direct `POST /kraniTimbang`.

## Workflow B — Debugging a cross-stack issue

1. **Identify the failing layer.** Trace: frontend request → route middleware (`validateRequest`,
   `checkPermission`) → controller → Prisma query. Error shapes identify the layer:
   - `400 { error: [{field, message}] }` — Zod validation (bad body/params)
   - `400 { error: "..." }` — domain logic (e.g. "Blok not found", "Lahan must belong to the selected blok")
   - `401` — no/invalid token (check header vs cookie mismatch, see gotchas)
   - `403 { error: "User or Organization not found" }` — missing org context; `403` other — permission or lahan PIC
     gate (Administrator typically escapes the PIC gate)
   - `404` — record not found (or org mismatch disguised as not-found via `findFirst`)
   - `400 { error: "Unmapped module for <path>" }` — the permissionGuard's `routeToModId` map has no entry (currently
     true for `/hargaTbs` and `/penjualan` — see gotchas)
   - `409` — duplicate (P2002) or staging duplicate transaction
   - `500` — Prisma error mapped by `errorHandler` (P2002→409, P2003→400, P2025→404, others→400; generic→500)
2. **Permission failures:** check the role→permission→mod_app chain and the Redis permission cache
   (`permissions:${userId}`, TTL 1800s). After role/permission changes the cache must be invalidated — `updateUser`,
   `updateRole`, `updatePermission`, and `custom/roleAndPermissions` do this; anything bypassing them can leave stale
   cache.
3. **Staging/reconciliation failures:** verify the BullMQ worker is running (`yarn dev:worker` — server alone cannot
   process staging). Check `pending_timbangan_log` status (PENDING/MATCHED/FAILED), the
   `@@unique([org_id, unique_transaction_id])` constraint, and the discrepancy tolerance.
4. **QR failures:** use `verifySignature` semantics from `references/reconciliation.md` — timestamp window is
   -5min/+48h (`QR_CLOCK_SKEW_MS`/`QR_EXPIRY_MS`), signature is HMAC-SHA256 base64url over
   `V2|<checkerId>|<tphId>|<qty>|<ts>` with `QR_SECRET_KEY`.
5. **When in doubt, open the actual source**: `sawitin/sawitin-backend/src/controllers/<module>Controller.ts` is the
   single source of truth for business rules and response shapes.

## Domain quick map (who does what, which endpoint family)

| Business need | Module | Endpoints to use |
|---|---|---|
| Field harvest entry | BKM Panen | `bkmPanen` + `bkmPanen/detail`, approve/reject |
| QC / truck loading, QR generation for krani | BKM Checker | `bkmChecker` + `bkmChecker/detail`, `/ready-for-weighing`, `/ready-to-load`, `/available-tph`, approve |
| Weighbridge ticket (mobile offline) | Staging | `staging/krani-timbang` (POST via QR, GET logs) |
| Weighbridge ticket (manual/desktop) | Krani Timbang | `kraniTimbang` + `kraniTimbang/detail` |
| Leftover fruit hauling | Restan | `restan`, `/pending`, `/:id/pickup` |
| Maintenance documents + inventory deduction | BKM Rawat | `bkmRawat` + `bkmRawat/detail` (POST /list), approve |
| TBS prices, sales | Finance | `hargaTbs` (`/latest`, POST /list), `penjualan` (POST /list) — `mod_keuangan` |
| Dropdown filter values | Filter options | `filterOptions`, `filterOptions/:module` (public) |
| Hierarchy master data | Fields | `kelompokLahan`, `blok`, `lahan`, `tph` |
| Workers & teams | Workforce | `pekerja`, `grupPekerja`, `member`, `tipePekerjaan` |
| Accounts & roles | RBAC | `user`, `role`, `permission`, `modApp`, `custom/roleAndPermissions` |
| Login / profile | Auth | `login`, `login/profile`, `logout` (public) |

## What NOT to do

- Don't invent endpoints that don't exist (e.g. there is no `GET /hargaTbs/:id` and no `DELETE /hargaTbs`, no
  `DELETE /penjualan`, no `reject` on bkmChecker — rejection is a status transition via PUT).
- Don't call `POST /kraniTimbang` for a QR-scanned weighbridge entry — that path is `POST /staging/krani-timbang`;
  direct creation is only for manual entries (`origin_source: MANUAL`).
- Don't trust `docs/api-and-security.md`'s QR scheme (old SHA-256 truncation) or `docs/database-schema.md`'s RLS —
  see `references/gotchas.md`.
- Don't rely on cookies for auth in your frontend code — send `Authorization: Bearer <token>` from the login
  response body (`token` field, which includes the `Bearer ` prefix).
