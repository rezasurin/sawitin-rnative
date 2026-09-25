# Phase 1 mobile workflow implementation

Implemented against `notes-from-backend/phase-1-operational-core.md` on 22 September 2026. This records mobile implementation and automated evidence; it is not Phase 1 sign-off.

## Delivered behavior

- `utils/operational-policy.ts` and `hooks/useOperationalPolicy.ts` combine server permissions, status, detail count, and connectivity. Create uses `write`; editing/submission/reopen use `update`; header/detail deletion uses `delete`; approval/rejection use `approve` without requiring `write`.
- Shared workflow actions and history are connected to Panen (Mandor/Asisten and inherited Administrator routes), Checker, Rawat, and manual Krani detail screens. Checker rejection sends `rejection_note`. Existing Checker and manual Krani records have draft correction forms.
- Revision-requested records require an explicit reopen before editing. Submitted records can also be withdrawn to draft, matching the executable backend `src/utils/statusMachine.ts`. Cancellation is restricted to submitted documents. Approval, rejection, cancellation, and audit reads require connectivity.
- Full transactional responses, including rejection/approval metadata, are cached as JSON under the authenticated user. Permission errors, conflicts, and missing records never fall back to stale cached data. Query memory clears on user change. The legacy Panen cache remains on disk but is no longer used for new transactional reads.
- Audit UI uses the actual `operational_audit_log` fields: `action`, `status_from`, `status_to`, `created_by`, `reason`, `created_at`. Events are read from the server and cached without synthesizing local events. Offline audit reads are disabled. Detail error views retain history access after draft deletion; list deletion confirmations offer a history link.
- SQLite migration v2 adds nullable `depends_on` without removing existing rows. A dependent queue item cannot be claimed until its predecessor is completed. Failed reopen prevents later edits/details/submit from running, including after restart. Successful predecessor completion advances the baseline only for the same record. Enqueue operations are serialized.
- Queue producers reject new non-draft detail edits and offline decisions. A queued submit prevents subsequent business edits. Stable detail replay keys and media URL checkpoints are preserved. A Panen upload that finishes after submission becomes a visible conflict instead of being silently removed.
- Conflicts retain payloads and stop automatic retries. The sync pass refreshes the document/history when permitted and online. Account recovery shows failed items and blocked dependents, with Periksa, Coba lagi, and Buang. Inspection compares retained local data to the latest server record. Explicit retry can adopt the inspected baseline; business mutations require server DRAFT. Discarding a predecessor requires discarding its dependents first.

## Automated evidence

- `scripts/check-operational.cjs`: all 32 permission combinations across five statuses; empty submit; offline decisions; approval without write; revision metadata cache; online audit reads; audit loading/error/empty/content UI; actual Checker rejection UI and 409 refresh; blocked recovery descendants; local/server inspection.
- `scripts/check-sync-queue.cjs`: real in-memory SQLite claim/lease and restart recovery; dependency chain reopen → edit → detail/media → submit; conflict retention and manual retry; baseline advancement.
- `scripts/check-sync.cjs`: stable detail keys and upload checkpoints; upload completing after server submission; legacy offline cancellation preserved for resolution.
- `scripts/check-audit.cjs`: persisted enqueue, shared-device ownership, draft-only detail enqueue, serialized dependencies, and rejection of edits behind a queued submit.

Validation: `npm run typecheck`, `npm test` (60 tests), and `git diff --check` pass. Graphify refreshed. Backend source/schema/routes were inspected for compatibility; no backend migration or deployment was performed.

## Device UAT still required

1. With `approve` but without `write`, approve and reject a submitted document. With `write` but without `approve`, verify neither decision appears. Change permissions while a screen is open and confirm server denial is explained.
2. Reject each module, confirm revision metadata survives offline/restart, reopen, correct a draft, and submit. For Checker/manual Krani, exercise header and existing detail corrections.
3. Offline, reopen Panen and edit details/photo; restart before reconnecting. Verify the server observes reopen, changes/media, then submit. Force a failed reopen and confirm dependent work remains blocked.
4. Submit from another device while a photo upload runs. Confirm the local payload remains visible under Account → Periksa and no new stale detail is accepted.
5. Exercise 409 Inspect/Retry/Discard, including blocked dependents and an explicitly confirmed retry against the current draft. Check that 401/403 retain unsent work.
6. Delete a draft, follow retained history access, and verify the server's DELETE event. Check audit loading/error/empty states and offline messaging.
7. Switch users on the handset and confirm neither documents/history nor queue payloads from the previous user are displayed.

Physical-device UAT and live backend end-to-end validation were not run. The backend migration `20260922100000_operational_workflow_audit` must be deployed. The central Phase 1 tracker remains unchanged because it also requires web parity and field sign-off.
