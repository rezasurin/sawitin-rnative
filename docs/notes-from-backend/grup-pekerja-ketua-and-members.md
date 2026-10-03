# Grup Pekerja: Ketua, members, Mandor role

Migration `20261002090000_grup_pekerja_ketua` (additive, nullable column).

## Responses

- `GET /grupPekerja` rows carry `_count.list_pekerja`, the number of workers in the group.
- `GET /grupPekerja/:id` adds:
  - `ketua_pekerja_id: string | null` and `ketua: pekerja & { member } | null`
  - `list_pekerja: [{ id, pekerja: pekerja & { member } }]`, oldest first

## Writes

- `ketua_pekerja_id` is accepted on `PUT /grupPekerja/:id` only. It must be a worker already in the
  group (400 `Ketua must be a worker in this group`); `null` clears it. Members are still assigned
  from the worker side (`selectedGrupPekerjaID` on `/pekerja`), so a new group has no members and
  no Ketua.
- When a worker is removed from a group they lead, or deleted, the group's Ketua is cleared.
- `mandor_id` must be a user holding an active role with `write` on `mod_bkm_panen` or
  `mod_bkm_rawat`, whatever the organization names that role. Otherwise 400
  `Mandor must be a user allowed to write BKM Panen or BKM Rawat`. Pickers list these users with
  `GET /user?mandor=true`. With the seeded roles that is Mandor Panen, Asisten Afdeling, Manajer
  Kebun and Administrator.
- `blok_id` is optional on create. `deskripsi` and `status` are now saved; before this they were
  dropped by validation.

Ketua is a label only: no approval, signing or premi rule uses it.

## Mobile

No change needed. Mobile reads `grup_pekerja.nama` only; the new fields are optional.
