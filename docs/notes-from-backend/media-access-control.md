# Frontend notes — stored evidence is no longer publicly readable

**Backend contract date:** 22 September 2026

**Audience:** Sawitin web and mobile maintainers
**Scope:** Security fix, not a roadmap slice. Affects every screen that displays an uploaded photograph or scanned ticket.

## Why this changed

`/media/**` was served by `express.static` mounted ahead of the router, so it never passed through authentication. The paths are content-addressed (`/media/<org>/<folder>/<sha256>.<ext>`), which makes them unguessable but not secret — the URL is stored on the document row and travels with every API response that returns one. Anyone holding a URL, including a former employee or another tenant who saw one, could fetch the file with no token at all.

The mount now sits behind the same `authenticationGuard` the rest of the API uses, plus a check that the `<org>` segment matches the caller's organization.

**Breaking change:** a request to `/media/**` without a valid session now returns `401`. A request for another tenant's object returns `404` (not `403` — confirming the object exists is most of what the URL was hiding). A URL that no longer resolves returns `404` instead of falling through to the router.

## What each client has to do

### Web

If the app is served from the same origin as the API, nothing changes: the `access_token` cookie is `httpOnly` and same-site, so the browser attaches it to `<img src="/media/...">` automatically.

If the web app runs on a **different origin** from the API, plain `<img>` will now fail. `sameSite: "strict"` means the browser will not send the cookie on a cross-site subresource request, and there is nowhere to put an `Authorization` header on an `<img>` tag. Fetch the bytes and hand the tag a blob instead:

```ts
const res = await fetch(url, { headers: { Authorization: token } });
const objectUrl = URL.createObjectURL(await res.blob());
// <img src={objectUrl} /> — revoke with URL.revokeObjectURL on unmount
```

### Mobile

The bearer token has to go on the image request. React Native's `Image` takes headers on the source:

```tsx
<Image source={{ uri, headers: { Authorization: token } }} />
```

Any image cache keyed only on the URI is still fine — the path is a content hash, so a cached file is never stale. But a cache that stores the *response* should not be shared between logged-in users.

### Both

- Treat `401` on a media fetch the same as `401` anywhere else: refresh the session or bounce to login. Do not silently render a broken-image icon.
- Treat `404` as "evidence missing", not "server error". It is the expected answer for a deleted object and for a URL belonging to another organization.
- Offline caches of previously downloaded evidence keep working; only new fetches are affected.

## Not changed

`POST /upload` is unchanged — same request, same `{ url, hash, bytes }` response, same dedupe-on-retry behaviour. Only reading is now guarded.
