# Phase 2 frontend notes — farm register import

**Backend contract date:** 22 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** In progress; this note covers the farm register import slice.

## There is no client work in this slice

Onboarding is operator-run through a CLI (`yarn import:farm`), not a screen. No endpoint, no upload control, no import UI. This note exists so neither client team builds one speculatively, and so both know what appears in their data after an onboarding run.

Deciding factor: the first customer's register is roughly 1,900 records, loaded once by us. A self-serve uploader needs multipart handling, an async job with status polling (1,900 rows will exceed a request timeout), RBAC, and an error-report screen — none of which a customer needs before they have used the product. If self-serve import is ever requested, the validation and planning logic is already separated in `src/services/FarmRegisterImport.ts` and can be wrapped in an endpoint without being rewritten.

## What changes in the data you render

**`member.kode` is new.** A nullable, tenant-unique string holding the customer's own person code (`KTJ.1`, `PEMA-14`). It is *not* a national ID; `nik` is unchanged and separate.

- Show `kode` alongside the name wherever a person is picked or listed. It is how the customer refers to their own people, and matching a pekebun by name alone is ambiguous in their register.
- Treat it as optional. People created through the normal screens have no `kode`, and nothing generates one.
- If you add it to a create/edit form, remember the uniqueness is per organization: a duplicate returns the standard Prisma conflict through the error handler.

**Imported records are sparse by design.** After an onboarding run, a `blok` has a name and nothing else — no area, no tree count, no planting year — and a `lahan` has a name, an owner, and a parent. Every nullable-rendering rule from [Phase 2 master data](phase-2-master-data.md) applies immediately and visibly, not hypothetically. A newly onboarded customer's screens will be mostly empty cells until someone fills the attributes in.

That makes the attribute edit screens the first thing a new customer touches. Prioritise them accordingly, and make a partially filled record look intentional rather than broken.

**A TPH created by the import has `basis_jjg_perbulan` and `basis_jjg_perhari` of `0`,** because a register does not carry harvest basis figures. Do not treat `0` as a configured value: a basis of zero means "not set yet". If any screen divides by or validates against the basis, guard it.

## Web implementation checklist

- Add `kode` to the member list, member detail, and any person picker, and to the member search fields if search is server-side.
- Verify the blok and lahan list and detail screens read cleanly when every optional attribute is null, since that is the state of a freshly onboarded customer.
- Add an "attributes not set" affordance on blok and lahan that routes to the edit form, so filling in a newly imported hierarchy is a guided task rather than hunting through records.
- Guard any calculation or display that assumes a non-zero TPH basis.

## Mobile implementation checklist

- Add `kode` to the member/pekerja types and the local cache so a mandor can recognise a person by the code the farm actually uses.
- Confirm master-data pickers render a blok or lahan that has a name and no other attributes. A freshly onboarded organization is entirely this shape.
- Guard any TPH basis calculation against `0`.

## Compatibility notes

- Fully backward compatible. `member.kode` is nullable and additive; nothing was renamed or removed.
- Migration `20260922180000_member_external_code` must be deployed before an import runs. It adds one nullable column and a unique index, safe on a populated database.
- The importer never updates or deletes. If a stored name differs from the file, the stored value wins and the difference is reported as a warning, so an import cannot overwrite a correction someone made in the UI.
- A parcel or TPH that the file would move under a different parent is reported as an error, not reparented. Relocations stay a deliberate action through the normal screens.
