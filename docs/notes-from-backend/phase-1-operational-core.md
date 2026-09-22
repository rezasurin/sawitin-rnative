# Phase 1 frontend notes — operational workflow hardening

**Backend contract date:** 22 September 2026  
**Audience:** Sawitin web and mobile maintainers  
**Phase status:** In progress; this note covers the workflow/audit backend slice and is not Phase 1 sign-off.

## Contract shared by web and mobile

Panen, Checker, Rawat, and manual Krani Timbang now use the same server-owned workflow rules:

```text
DRAFT -> SUBMITTED -> APPROVED
                    -> REVISION_REQUESTED -> DRAFT -> SUBMITTED
                    -> CANCELLED
```

- Header and detail business fields can change only while the header is `DRAFT`.
- A document needs at least one detail before it can enter `SUBMITTED`.
- `POST /<module>/:id/approve` accepts only `SUBMITTED` records.
- `POST /<module>/:id/reject` accepts only `SUBMITTED` records and now returns `REVISION_REQUESTED`, not `DRAFT`.
- Only `DRAFT` headers and details can be deleted.
- A state race or stale client action returns `409`; clients must refresh the record instead of silently retrying a different action.
- Checker now has `POST /bkmChecker/:id/reject` with optional `{ "rejection_note": string }`.
- Krani Timbang responses now expose `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, and `rejection_note`.
- Each module exposes `GET /<module>/:id/history`: `/bkmPanen`, `/bkmChecker`, `/bkmRawat`, and `/kraniTimbang`. The response is an ordered array of `CREATE`, `SUBMIT`, `REVISE`, `APPROVE`, `REJECT`, `CANCEL`, and `DELETE` audit events.

Action visibility must combine current status and the backend permission returned at login/profile:

| UI action | Required module permission | Allowed status |
| --- | --- | --- |
| Create | `write` | Not applicable |
| Edit/add/delete detail | `update` or route-specific write/delete permission | `DRAFT` only |
| Submit/reopen/cancel | `update` | Per transition map |
| Approve/reject | `approve` | `SUBMITTED` only |
| Delete header | `delete` | `DRAFT` only |
| View history | `read` | Any status, including a retained link after draft deletion |

The UI rule is only presentation. Always send the request and handle `401`, `403`, and `409`, because permissions and status can change after a screen loads.

## Web implementation checklist

- Replace module-specific status/button conditions with one shared operational action policy using the table above.
- Add `REVISION_REQUESTED` badges, filters, and detail-page messaging. Show `rejection_note`, rejecting user, and timestamp.
- Add Checker reject UI using `POST /bkmChecker/:id/reject`.
- Add an audit-history panel/timeline backed by `GET /<module>/:id/history`; render actor, action, from/to status, reason, and timestamp.
- Disable all header/detail form controls outside `DRAFT`. A revision-requested document must first be reopened to `DRAFT` with `PUT /<module>/:id` and `{ "status": "DRAFT" }`.
- On `409`, discard optimistic status changes, refetch document and history, and explain that another action changed the record.
- Do not show approve/reject from the generic `write` flag; use only the module's `approve` flag.
- Add component/integration coverage for every status/permission pair, stale-action `409`, missing `approve`, audit empty/loading/error states, and Checker rejection.

## Mobile implementation checklist

- Apply the same shared action policy to list cards, detail screens, forms, swipe actions, and offline menus.
- Persist `REVISION_REQUESTED` and the rejection metadata in the local cache; do not translate it to `DRAFT`.
- Queue the explicit reopen-to-draft transition before any revised header/detail mutation. Preserve dependency order: reopen, edits, details/media, submit.
- Never queue a new detail mutation for a submitted/approved/cancelled document. Existing idempotent detail replays may return `200`; a genuinely new stale detail returns `409` and must remain visible for user resolution.
- Treat approval, rejection, cancellation, and audit-history reads as online-only until Phase 6 defines conflict semantics for offline decisions.
- On `409`, stop automatic retry for that item, refresh when online, and show an inspect/retry/discard choice without deleting the local payload.
- Cache audit history only as read-through data; the server remains authoritative and audit events must never be synthesized locally.
- Add queue/restart tests for revision reopen ordering, stale status, a detail upload finishing after submit, and user-visible recovery from `409`.

## Compatibility notes

- New history endpoints require the module's `read` permission because they are nested `GET` routes.
- Approve and reject continue to require only `approve`; they do not require `write` in addition.
- Existing code that assumes rejection immediately makes a document editable must change: editing starts only after the explicit `REVISION_REQUESTED -> DRAFT` transition.
- The backend migration `20260922100000_operational_workflow_audit` must be deployed before clients call history endpoints or depend on Krani approval metadata.
