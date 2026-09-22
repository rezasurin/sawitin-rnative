# Offline master data cache

**Date:** 22 September 2026
**Roadmap item:** Phase 2, "Cache all required master data for offline field forms"

## The problem

Every field form fetched its master data through plain `useQuery`, and `QueryProvider` created a bare `QueryClient` with no persistence. React Query's cache is in memory only, so restarting the app threw it away. A mandor who force-quit in a block with no signal reopened the harvest form to empty pickers and could not record anything.

Only BKM Rawat survived, through `rawatLookupCacheDb` and its read-through fallback on `/bkmRawat/lookups`.

## What was built

A read-through SQLite cache, following the pattern `bkmRawatApi.getLookups` already used.

- `lookup_cache` table in `services/database.ts`, plus `lookupCacheDb` with `save`, `get`, and `clearAll`.
- `services/master-cache.ts` holds `readThroughCache` and `masterCacheKey`, taking their storage and the current user as injected dependencies so the logic is testable without React or SQLite.
- The `getAll` method of `blok`, `lahan`, `tph`, `pekerja`, and `tipe-pekerjaan` is wrapped. Every master-data consumer in the app goes through those five methods, so all of them are covered: Panen form steps 1 to 4, Checker form steps 1 and 3, `FilterSortSheet`, and `usePekerja`.
- `hooks/useMasterCacheWarmup` fills the cache once per signed-in user from the root layout, so a form works offline even if it was never opened while connected.

Order of operations is network first, cache only on failure. A connected device always sees current data; a stale copy answers only when the request could not be made. A failure with nothing cached still throws, so a screen shows a real error rather than silently empty pickers.

## Two decisions worth knowing

**`networkMode: 'always'` is now set on the query client.** React Query v5 defaults to `'online'`, which *pauses* a query and never calls its query function once `onlineManager` reports offline. Nothing wires `onlineManager` today, so queries run and the fallback works — but this app already tracks connectivity in `useNetworkStore`, and the day someone connects NetInfo to React Query the offline cache would stop working with no visible cause. The mode is pinned so that cannot happen quietly.

**Transactional documents are deliberately not cached.** Only master data is. `BKMCheckerFormStep1` also loads approved BKM Panen documents to pick a source, and that request is left uncached: showing a stale approval offline is worse than showing nothing. Starting a Checker document therefore still needs connectivity. Offline document access belongs with the Phase 6 conflict rules.

## Shared devices

Cache keys are `userId:resource:params`, so one worker's master data cannot answer another worker's request. `logout` also calls `lookupCacheDb.clearAll()`, which drops both this cache and the Rawat lookup cache, costing one refetch after the next sign-in.

## Known limits

- The cache is keyed by the exact request parameters. `FilterSortSheet` asks for 100 blocks while the forms ask for 200, so those are separate entries; the warm-up only fills what the field forms use. A screen asking for a parameter set that has never been cached still fails offline.
- A cached copy has no age limit. It is replaced on the next successful fetch, and the staleness window is the time since a device last had signal.
- `rawat_lookup_cache_by_user` still exists alongside `lookup_cache`. Marked in the code to be folded in next time it is touched.

## Verification

`npm run typecheck` clean. `npm test` 24 passing, 9 of them new in `scripts/check-master-cache.cjs`: fetch-and-store, fallback on failure, throw when nothing is cached, one user not reading another's cache, no caching without a signed-in user, fresh data replacing stale, page sizes not reusing each other's entries, key normalisation, and per-resource separation.

Not verified on a physical device with real connectivity loss. That belongs to the Phase 6 field test.
