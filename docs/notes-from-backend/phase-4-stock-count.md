# Phase 4 frontend notes — physical stock count

**Backend contract date:** 22 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** In progress; this note covers the stock-count slice. Vehicle and fuel usage and consumption metrics are the remaining Phase 4 slices.

## Why this changed

Two things were wrong with stock. There was no way to tell the system what was actually on the shelf, and there *was* a way to silently rewrite the balance: `PUT /material/:id` accepted `stok` and wrote it straight to the snapshot with no movement row behind it. Any report built on the movement ledger would have disagreed with the balance and nobody could have said why.

**Breaking change:** `PUT /material/:id` no longer accepts `stok`. Sending it is not an error — the field is stripped — but the balance will not change. Remove the field from the material edit form.

## Contract shared by web and mobile

### The document

`stock_opname` follows the same shape as a BKM: `DRAFT` → `SUBMITTED` → `APPROVED`, with rejection sending it to `REVISION_REQUESTED`.

| Endpoint | Purpose |
| --- | --- |
| `POST /stockOpname` | Start a count (always `DRAFT`) |
| `GET /stockOpname`, `POST /stockOpname/list` | List, filterable by `status`, sortable by `tanggal` |
| `GET /stockOpname/:id` | One count with its lines |
| `PUT /stockOpname/:id` | Edit a draft, or move `DRAFT` ⇄ `SUBMITTED` |
| `DELETE /stockOpname/:id` | Draft only |
| `POST /stockOpname/:id/approve` | Approve and adjust stock |
| `POST /stockOpname/:id/reject` | Send back with `rejection_note` |
| `GET /stockOpname/:id/history` | Audit trail |

Create and update take `tanggal`, optional `catatan`, and `details[]` of `{ material_id, stok_fisik, catatan? }`. `client_request_id` is supported for offline replay.

### Do not send the system figure

Each line comes back with **two** numbers:

- `stok_sistem` — what the system believed **when the count was created**. The server reads it; the client cannot set it. Anything you send is ignored.
- `stok_fisik` — what was physically counted. This is the only number the client provides.

The variance is `stok_fisik - stok_sistem`. It is not stored — compute it for display.

### What approval actually does

Approval applies the **variance as a delta** to the current balance. It does not overwrite the balance with `stok_fisik`.

This matters and is worth getting right in the UI copy. If a count finds 480 against a book figure of 500, and 100 kg is then issued to an approved maintenance document before the count is approved, the final balance is 380 — not 480. The count corrected a 20 kg bookkeeping error; the 100 kg issue was real and stays.

So: **do not display "stock will become `stok_fisik`"** on the approval confirmation. Display the variance: *"Penyesuaian: −20 kg"*. A line whose variance is zero writes no movement at all.

### Permissions

`/stockOpname` is authorized through the **material module** (`mod_material`). No new module appears in the role editor. Approval requires `mod_material.approve` — and per the recorded product decision, the person who took the count may approve it if they hold that permission. There is no separate maker-checker flag; do not build a UI toggle for one.

### Errors worth handling distinctly

| Status | Meaning |
| --- | --- |
| `409 Only a submitted stock count can be approved` | Someone already approved it, or it is still a draft |
| `409 Stock opname is no longer submitted` | A concurrent approval won; refresh |
| `409 Only a draft stock count can be changed` | Editing after submission |
| `409 A stock count needs at least one counted material` | Submitting an empty sheet |
| `400 Invalid material_id for this organization` | A material from another tenant |
| `500` mentioning *would drive … negative* | The variance would push a balance below zero; the whole approval is refused, nothing is partially applied |

## Web direction

1. **New screen under Finance and inventory**, beside Material. This is the primary home for the feature — a count is a desk-and-warehouse activity more than a field one.
2. **Counting sheet layout**: one row per material, showing name, unit, `stok_sistem` read-only, `stok_fisik` as the single input, and a live variance column with sign and colour. Sort by material name; let the user add rows by search.
3. **A "count everything" starter** that seeds one line per active material is worth having — most counts are full counts. Let the user delete lines they skipped rather than making them add 60 rows by hand.
4. **Approval dialog shows the variance summary**, not the target balance: number of lines, total lines with a variance, and the largest few. See the warning above about wording.
5. **Print/export the approved sheet** — a signed count is the artefact an auditor asks for.
6. **Material edit form: remove the stock field.** Replace it with a read-only balance and a link to start a count.

## Mobile direction

1. **Read-only first.** A mandor does not run a stock count; a storekeeper does. Ship the list and detail views so an approved count is visible in the field, and leave creating and approving to web unless the pilot asks otherwise.
2. **If counting does land on mobile**, send `client_request_id` on create exactly as the Rawat flow does, and treat `200` and `201` as the same success.
3. **Never cache a balance for display in a count.** `stok_sistem` is captured server-side at create time; showing a stale cached balance beside it would invite the counter to "correct" a number that is not the one the server used.
4. **No offline approval.** Approval moves stock and must be transactional against the live balance; queue the count, not the approval.

## What is deliberately not here

- **No storage locations and no transfers** — the operation runs one store; recorded in [Product decisions](../product-decisions.md).
- **No batch, lot, or expiry** — not tracked in the operation being replaced.
- **No material issue or return documents** — BKM Rawat records what was consumed, and this count resolves the timing difference.
- **No stored variance column** — it is `stok_fisik - stok_sistem`, computed on display.

## Backend evidence

- Migration `20260922220000_stock_opname`
- `src/services/InventoryService.ts` (`applyStockCount`), `src/schemas/stockOpname.schema.ts`, `src/controllers/stockOpnameController.ts`, `src/routes/stockOpnameRoute.ts`
- `src/schemas/material.schema.ts` and `src/controllers/materialController.ts` for the closed `stok` write and the opening-balance movement
- `tests/integration/stockOpname.integration.test.ts` — 9 tests covering the server-owned system figure, signed shortage and surplus adjustments, the movement-between-count-and-approval case, a zero variance writing no row, double approval, a cross-tenant material, the stripped `stok` field, and the opening balance
