# Frontend notes — security hardening, contract changes

**Backend contract date:** 22 September 2026

**Audience:** Sawitin web and mobile maintainers
**Scope:** Security and availability remediation, not a roadmap slice. Eleven changes are client-visible. See also [media-access-control.md](./media-access-control.md).

## 1. Roles and permissions are now tenant-scoped

`role` and `permission` gained an `org_id`. Previously they were global: any tenant with `mod_role` could edit a role that users in _other_ organizations were logged in with.

What changes for a client:

- `GET /role` and `GET /permission` return only your organization's rows.
- A role or permission id belonging to another organization now answers `404`, not `403`.
- Role names are unique **per organization**. "Nama role sudah ada" now means "already exists in your organization" — two tenants may both have a Mandor.
- Assigning a role that is not yours to a user comes back as `Invalid role IDs provided`.

Seeded template ids (`admin_role`, and so on) now exist only in the organization they were seeded into. Do not hardcode them; read the list from `GET /role`.

**A migration ran.** Where one role row was genuinely shared by several organizations, it was split into one row per organization and each tenant's users were repointed to their own copy. The first organization keeps the original id, the rest get new ones. Any role id a client has cached may therefore be stale for every tenant but one — refetch rather than trusting a stored id.

## 2. Delta sync cursor is now a pair

`POST /sync/delta` returns a new field:

```jsonc
{
  "changed": { ... },
  "cursor": "2026-09-01T00:00:00.000Z",
  "cursor_id": "a3f1...",   // NEW
  "has_more": false,
  "skipped": []
}
```

Send **both** back on the next call, as `since` and `since_id`.

**This matters more than it looks.** A bulk import writes many rows in the same millisecond. A timestamp alone cannot address a position inside that run, so the old response pulled in the entire rest of the timestamp with no limit — a single call could return an unbounded number of rows — and if the run was larger than one page the cursor could never move past it and the device looped forever.

A client that sends only `since` still works and still terminates for ordinary data, but it re-downloads every row sharing the cursor timestamp on each call, and it will still loop on a tie longer than `limit`. **Send `since_id`.**

Every model is now bounded by `limit` in every case.

## 3. `app_version` in sync telemetry must be semver-shaped

`POST /sync/telemetry` now rejects an `app_version` that does not look like `1.2.3`, optionally with a `-suffix` or `+suffix` of up to 16 characters. `1.4.2`, `1.4.2-beta.1` and `1.4.2+f00ba7` are fine; `v1.4.2`, `dev` and `1.4` are now `400`.

It becomes a Prometheus label, and labels live for the life of the process. The registry caps distinct label sets and folds the overflow into `__other__`, so a bad value degrades the metric rather than the server — but a client sending a free-form string will disappear into that bucket.

## 4. A stock count cannot be approved by the person who created it

`POST /stockOpname/:id/approve` now returns `403` when the approver is the creator:

```json
{ "error": "A stock count must be approved by someone other than the person who created it" }
```

Approving writes the counted figure straight into the stock balance, so one person could previously both declare what was on the shelf and ratify it.

**UI work:** hide or disable the approve action when `created_by` equals the current user, rather than letting them press it and read an error. The list and detail responses already carry `created_by`.

### The same rule applies to every document whose approval moves stock

Two more endpoints return `403` on the same condition:

| Endpoint                               | Error                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| `POST /pemakaianKendaraan/:id/approve` | `Vehicle usage must be approved by someone other than the person who recorded it` |
| `POST /bkmRawat/:id/approve`           | `BKM Rawat must be approved by someone other than the person who filed it`        |

All three deduct from real stock when approved, so the rule is the same in each: whoever declares what was consumed must not be the one who ratifies it.

The `approve` permission was never the whole rule. Mandor Panen and Asisten Afdeling hold `createReadUpdate` and cannot approve at all — but Administrator and Manajer Kebun hold write **and** approve together, so they could file and ratify their own consumption. That is the gap these checks close.

**Operational consequence worth raising before rollout:** on a small estate where one Manajer Kebun does everything, these documents now need a second person to approve. If that is not workable, the answer is a role that can file but not approve, not removing the check.

**UI work:** the same treatment on all three — hide or disable approve when `created_by` is the current user. `created_by` is already in the list and detail responses.

**Audit trail:** `approved_by` and the approval's audit-history actor now genuinely differ from `created_by`. Any screen that assumed they were the same person needs checking.

## 5. Sessions can now be ended, and logout actually ends them

A token was valid for three days and logout only cleared the cookie, so a token copied out of the login response could not be recalled. Every token now carries the version it was minted at, and the server compares it against the user's current version.

What a client must handle:

```json
{ "error": "Unauthorized: Session has ended" }
```

returned as `401` from any guarded route. Treat it exactly like an expired token: clear local credentials and send the user to login. Do not retry.

Three things now end a session:

- **Logout** — and it ends _every_ session for that user, not just the one on this device. A user logged in on a handset and on the web is signed out of both. Tell them so if your UI implies otherwise.
- **Password change** — `PUT /user/:id/password` now returns `"reauthenticate": true` alongside the success message, and the caller's own token is dead from that moment. Send them to login rather than leaving them on a screen whose next request will 401.
- An administrator deactivating the user, as before.

Tokens issued before this shipped keep working; they read as version 0, which is where every user starts. The first logout or password change ends them.

## 6. Login is throttled

`POST /login` returns `429` after 10 failed attempts against the same username, or from the same IP, inside 15 minutes:

```json
{
  "error": "Too many failed login attempts. Try again later.",
  "retry_after_seconds": 900
}
```

A successful login clears the username's tally, so someone mistyping a password twice before getting it right never accumulates. Show the message and the wait rather than a generic "login failed" — the two mean different things to the person holding the handset.

## 7. List endpoints: bounded depth, optional totals

Two changes to every endpoint that goes through the shared list query.

**Deep paging is refused.** Past an offset of 10,000 rows the response is `400`:

```json
{
  "message": "Query out of range",
  "error": "Cannot page beyond 10000 rows. Narrow the result with filters or a date range instead."
}
```

`OFFSET n` makes the database walk and discard n rows, so page 50,000 was a full table scan reachable by editing a query string. If a screen genuinely needs to reach that far, it needs a filter or a date range, not more pages.

**Totals are now optional.** Pass `?totals=false` and the extra `COUNT(*)` is skipped:

```jsonc
{
  "data": [ ... ],
  "meta": {
    "page": 3,
    "limit": 20,
    "total": null,      // null when totals=false
    "pages": null,      // null when totals=false
    "has_more": true    // NEW, always present
  }
}
```

`meta.has_more` is always returned now, so an infinite-scroll list can drop the count entirely — it was a second full pass over the same predicate on every page, to learn a number that had not changed.

Nothing breaks if you ignore this: totals are still returned by default. But `meta.total` is typed `number | null` now, so a client that does arithmetic on it should handle the null.

## 10. Access tokens are short-lived; there is now a refresh endpoint

**This is the largest client change in this note. Plan for it.**

The access token now lives **15 minutes** instead of 3 days. Login returns a refresh token beside it:

```jsonc
{
  "token": "Bearer eyJ...",
  "refresh_token": "4Xk9...",   // NEW — store it as securely as a password
  "expires_in": 900,            // NEW — seconds
  "user": { ... }, "roles": [ ... ], "permissions": { ... }
}
```

### Renewing

```
POST /refresh
{ "refresh_token": "4Xk9..." }
```

No `Authorization` header — the access token is expected to be expired. On the web the `refresh_token` cookie is sent automatically; it is scoped to `/refresh`, so it is not attached to ordinary API calls.

The response is a new `token` **and a new `refresh_token`**. Store both.

### The rule that will bite you if you get it wrong

**A refresh token is single-use.** Spending it returns a successor and kills the old one. Replaying a spent token is treated as theft and **revokes every session in that family** — the user is logged out and must sign in with their password.

Two mistakes cause this in honest clients:

- **Concurrent refreshes.** Five requests 401 at once, each fires `/refresh`, one wins and four replay a now-spent token — and the user is logged out. Funnel refreshes through a single in-flight promise and have the other callers await it.
- **Retrying a failed refresh with the same token.** If `/refresh` succeeded server-side but the response was lost, the token is already spent. Retry with the _new_ token or send the user to login; never retry with the old one.

`401` from `/refresh` carries a `reason` of `unknown`, `expired`, or `reused`. All three mean the same thing to the UI: log in again.

Refresh tokens last 30 days, so a handset that syncs at least monthly never sees a password prompt.

### What each client has to build

Both clients authenticate with the `Bearer` token from the login JSON. The web app cannot rely on the cookies: it runs on a different origin from the API, and the API's CORS does not allow credentials, so the browser will not send or accept them on a `fetch`. Web and mobile therefore need the same work:

1. **Store `refresh_token` from login and from every `/refresh` response.** It replaces the previous one each time. On mobile use the platform secure store (Keychain / Keystore), not AsyncStorage. On web, keep it out of `localStorage` if you can; if you cannot, accept that an XSS bug can now steal a 30-day credential rather than a 15-minute one.
2. **Never hardcode the 15 minutes.** The server's TTL is configurable (`ACCESS_TOKEN_TTL`). Both clients refresh reactively — on the first `401` — which needs no timer at all. A client that wants to refresh ahead of time should schedule from `expires_in`, which is read back from the token itself and is always the true lifetime.
3. **On a `401` from any other endpoint, refresh once and replay the request.** If `/refresh` itself returns `401`, go to login — do not loop.
4. **Single-flight the refresh** (see above). This is the one that logs real users out if it is missed.
5. **Send `refresh_token` in the body of `POST /logout`** so the server can end _this_ device's session. Without it the server cannot tell which device is leaving and ends every session instead.
6. **On password change** (`reauthenticate: true`), discard both tokens and go to login.

**Status (23 September 2026):** implemented in both clients — `Saweed-Reactjs` (`src/services/baseApi.ts`, `src/store/auth.store.tsx`) and `saweed-rnative/sawitin` (`services/api.ts`, `stores/useAuthStore.ts`). Neither is committed yet.

If a client build without this ships before the other, set `ACCESS_TOKEN_TTL=3d` in the backend `.env` and restart. Tokens then behave as they did before, `expires_in` reports the longer lifetime, and a client that ignores `refresh_token` keeps working. Remove it once both clients refresh.

### Logout is now per-device

`POST /logout` ends **only the device that called it** — the one whose refresh token is presented. Other devices stay signed in. This reverses what item 5 above described.

For "sign me out everywhere" — a lost handset — send `{ "all": true }`. That bumps the token version, so every access token on every device dies immediately as well.

A password change still ends everything, everywhere, and now revokes the refresh tokens too.

## 11. List endpoints support cursor pagination

`meta.next_cursor` is now returned on list responses:

```jsonc
{
  "data": [ ... ],
  "meta": {
    "page": 1, "limit": 20, "total": 340, "pages": 17,
    "has_more": true,
    "next_cursor": "eyJmIjoiY3JlYXRlZF9hdCI..."   // NEW, or null on the last page
  }
}
```

Pass it back as `?cursor=<value>` for the next page. Unlike `?page=`, a cursor costs the same no matter how deep you are, so it is the right tool for infinite scroll and for the offline sync pull.

- Pair it with `?totals=false` and neither the count nor the offset is paid for.
- The cursor is opaque. Do not parse it, build it, or persist it beyond a scroll session.
- **Do not change `sort` mid-scroll while reusing a cursor.** The cursor records the sort it was made for, and a mismatch returns `400` rather than silently skipping rows. Changing sort means starting from page one.
- Sorting by a nested field (`member.nama`) has no single cursor key, so `next_cursor` is `null` there. Use `?page=` for those lists.
- `?page=` keeps working exactly as before. Nothing has to migrate.

## Not changed

Upload and every BKM contract are untouched by this pass.
