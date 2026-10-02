import { isAxiosError } from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { apiClient } from './api';
import { bkmPanenApi } from './bkm-panen.service';
import { bkmCheckerApi } from './bkm-checker.service';
import { bkmRawatApi } from './bkm-rawat.service';
import { observasiApi } from './observasi.service';
import { pemakaianKendaraanApi } from './vehicle-usage.service';
import { kraniTimbangApi } from './krani-timbang.service';
import { uploadApi, type UploadFolder } from './upload.service';
import { tiketPksApi } from './tiket-pks.service';
import { stagingApi } from './staging.service';
import { sameFiledTicket } from '@/utils/tiket-pks';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import type { CreateBkmPanenDetailPayload, CreateBkmPanenPayload, UpdateBkmPanenPayload } from '@/types/bkm-panen';
import type { CreateBkmCheckerDetailPayload, CreateBkmCheckerPayload, CreateTripPayload, UpdateBkmCheckerPayload } from '@/types/bkm-checker';
import type { CreateBkmRawatDetailPayload, QueuedBkmRawatPayload, UpdateBkmRawatDetailPayload, UpdateBkmRawatPayload } from '@/types/bkm-rawat';
import type { SyncQueueItem } from '@/types/sync';
import type { CreateObservasiPayload } from '@/types/observasi';
import type { CreatePemakaianKendaraanPayload } from '@/types/vehicle-usage';
import type { CreateTiketPksBySpbPayload, CreateTiketPksPayload } from '@/types/tiket-pks';
import type { SubmitStagingPayload } from '@/types/staging';
import { isSupportedSyncAction } from '@/utils/sync-support';
import { isTripHeader, spbConflictOf, spbConflictText, tripConflictOf, tripConflictText } from '@/utils/trip';

interface BkmPanenQueuePayload {
  header: CreateBkmPanenPayload;
  details: Omit<CreateBkmPanenDetailPayload, 'bkm_panen_id'>[];
}

interface BkmPanenUpdateQueuePayload extends BkmPanenQueuePayload {
  id: string;
  details: (Omit<CreateBkmPanenDetailPayload, 'bkm_panen_id'> & { serverId?: string })[];
  deletedDetailIds: string[];
}

interface BkmCheckerQueuePayload {
  header: CreateBkmCheckerPayload | CreateTripPayload;
  details: Omit<CreateBkmCheckerDetailPayload, 'bkm_checker_id'>[];
  server_id?: string;
  /** Restan lines the Mandor dropped after a conflict; any already on the server draft are deleted. */
  drop_restan_ids?: string[];
}

interface ProcessorDependencies {
  panenApi: typeof bkmPanenApi;
  checkerApi: typeof bkmCheckerApi;
  rawatApi: typeof bkmRawatApi;
  observasiApi: typeof observasiApi;
  usageApi: typeof pemakaianKendaraanApi;
  ticketApi: typeof tiketPksApi;
  staging: typeof stagingApi;
  upload: typeof uploadApi;
  updateQueuePayload: (id: string, payload: Record<string, unknown>) => Promise<void>;
  /** Where a Panen queued on this phone stands; null when it is no longer in the queue. */
  panenState: (queueId: string) => Promise<SyncQueueItem['status'] | null>;
}

const defaultDependencies: ProcessorDependencies = {
  panenApi: bkmPanenApi,
  checkerApi: bkmCheckerApi,
  rawatApi: bkmRawatApi,
  observasiApi,
  usageApi: pemakaianKendaraanApi,
  ticketApi: tiketPksApi,
  staging: stagingApi,
  upload: uploadApi,
  updateQueuePayload: (id, payload) => useSyncQueueStore.getState().updatePayload(id, payload),
  panenState: (queueId) => useSyncQueueStore.getState().queueStatus(queueId),
};

function isNotFound(error: unknown) {
  return (typeof error === 'object' && error !== null && 'status' in error && error.status === 404) ||
    (isAxiosError(error) && error.response?.status === 404);
}

async function ignoreAlreadyDeleted(action: () => Promise<unknown>) {
  try { await action(); }
  catch (error) { if (!isNotFound(error)) throw error; }
}

/**
 * Upload local images one at a time and persist every returned URL in SQLite
 * before continuing. A later API failure or app restart therefore reuses the
 * uploaded object instead of creating an unreferenced duplicate.
 *
 * The hash and byte size come back with the URL and are carried onto the detail
 * row, so a stored object can later be checked against the record that points
 * at it. The server keys objects by that hash, so an interrupted upload retried
 * whole costs one object, not two.
 */
export async function uploadAndCheckpoint<
  T extends { foto_url?: string | null; foto_hash?: string | null; foto_bytes?: number | null },
>(
  itemId: string,
  details: T[],
  buildPayload: (details: T[]) => Record<string, unknown>,
  dependencies: Pick<ProcessorDependencies, 'upload' | 'updateQueuePayload'> = defaultDependencies,
  folder: UploadFolder = 'bkm-panen',
): Promise<T[]> {
  const checkpointed = details.map((detail) => ({ ...detail }));
  for (let index = 0; index < checkpointed.length; index++) {
    const detail = checkpointed[index];
    if (!detail.foto_url?.startsWith('file://')) continue;
    const { url, hash, bytes } = await dependencies.upload.uploadImage(detail.foto_url, folder);
    checkpointed[index] = { ...detail, foto_url: url, foto_hash: hash, foto_bytes: bytes };
    await dependencies.updateQueuePayload(itemId, buildPayload(checkpointed));
  }
  return checkpointed;
}

/**
 * A taken ticket number, a second ticket or weighing for one SPB, or a retired
 * V3 QR is for the Krani to resolve, not to retry. Keep why on the payload so
 * the queue screen can offer the fix, then fail the item as a conflict.
 */
async function failOrKeepSpbConflict(
  itemId: string, payload: Record<string, unknown>, error: unknown, dependencies: ProcessorDependencies,
): Promise<never> {
  const conflict = spbConflictOf(error);
  if (!conflict) throw error;
  await dependencies.updateQueuePayload(itemId, { ...payload, conflict });
  throw Object.assign(new Error(spbConflictText(conflict, payload.nomor_spb)), {
    status: (error as { status?: number }).status ?? 409, code: conflict.code,
  });
}

export async function processItem(
  item: SyncQueueItem,
  dependencies: ProcessorDependencies = defaultDependencies,
) {
  // Old unsupported rows can still exist on a device. Mark them for recovery
  // immediately instead of retrying an operation that has no API route.
  if (!isSupportedSyncAction(item.module, item.action)) {
    throw Object.assign(new Error(`Pekerjaan offline ${item.module}/${item.action} belum didukung.`), { status: 422 });
  }
  if (!item.payload) throw new Error(`Sync item ${item.id} has no payload`);
  if ((item.payload.data as { status?: string } | undefined)?.status === 'CANCELLED' || /\/(approve|reject)$/.test(item.endpoint)) {
    throw Object.assign(new Error('Keputusan offline tidak didukung. Periksa dokumen saat online.'), { status: 409 });
  }
  const { panenApi, checkerApi, rawatApi } = dependencies;

  if (item.module === 'tiket_pks' && item.action === 'CREATE') {
    const [draft] = await uploadAndCheckpoint(item.id, [item.payload as unknown as CreateTiketPksPayload | CreateTiketPksBySpbPayload],
      (rows) => rows[0] as unknown as Record<string, unknown>, dependencies, 'tiket-pks');
    const { local_photo_uri: localPhoto, foto_hash: _photoHash, foto_bytes: _photoBytes, conflict: _conflict, ...sent } =
      draft as (CreateTiketPksPayload | CreateTiketPksBySpbPayload) & { local_photo_uri?: string; foto_hash?: string; foto_bytes?: number; conflict?: unknown };
    const cleanup = async () => {
      if (localPhoto?.startsWith('file://')) await FileSystem.deleteAsync(localPhoto, { idempotent: true }).catch(() => undefined);
    };
    if ('nomor_spb' in sent) {
      // By SPB number: a `202` means the server holds the ticket until its trip is dispatched. That is success.
      try {
        await dependencies.ticketApi.createBySpb(sent);
        await cleanup();
        return;
      } catch (error) {
        // A lost response replays as a 409 on the ticket this item already filed.
        if ((error as { status?: number }).status === 409) {
          const filed = await dependencies.ticketApi.byNumber(sent.nomor_tiket).catch(() => null);
          if (sameFiledTicket(filed, sent)) { await cleanup(); return filed; }
        }
        return failOrKeepSpbConflict(item.id, draft as unknown as Record<string, unknown>, error, dependencies);
      }
    }
    const data = sent;
    const existing = await dependencies.ticketApi.byTrip(data.krani_timbang_id);
    if (existing) {
      if (!sameFiledTicket(existing, data)) {
        throw Object.assign(new Error('Trip ini sudah memiliki tiket PKS berbeda. Periksa tiket di server.'), { status: 409 });
      }
      await cleanup();
      return existing;
    }
    try {
      const created = await dependencies.ticketApi.create(data);
      await cleanup();
      return created;
    } catch (error) {
      if ((error as { status?: number }).status !== 409) throw error;
      const filed = await dependencies.ticketApi.byTrip(data.krani_timbang_id);
      if (sameFiledTicket(filed, data)) { await cleanup(); return filed; }
      throw error;
    }
  }

  if (item.module === 'observasi' && item.action === 'CREATE') {
    const [data] = await uploadAndCheckpoint(item.id, [item.payload as unknown as CreateObservasiPayload],
      (rows) => rows[0] as unknown as Record<string, unknown>, dependencies, 'observasi');
    const created = await dependencies.observasiApi.create({ ...data, client_request_id: data.client_request_id ?? item.id });
    if (data.client_request_id?.startsWith('observasi_') && /^[\w-]+$/.test(data.client_request_id) && FileSystem.documentDirectory) {
      await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${data.client_request_id}.jpg`, { idempotent: true }).catch(() => undefined);
    }
    return created;
  }

  if (item.module === 'pemakaian_kendaraan') {
    if (item.action === 'CREATE') {
      const { data, submit } = item.payload as unknown as { data: CreatePemakaianKendaraanPayload; submit: boolean };
      const record = await dependencies.usageApi.create({ ...data, client_request_id: data.client_request_id ?? item.id });
      if (submit && record.status === 'DRAFT') await dependencies.usageApi.update(record.id, { status: 'SUBMITTED' });
      return;
    }
    if (item.action === 'UPDATE') {
      const { id, data } = item.payload as unknown as { id: string; data: { status: 'SUBMITTED' } };
      const current = await dependencies.usageApi.getById(id);
      if (current.status === 'SUBMITTED' || current.status === 'APPROVED') return;
      return dependencies.usageApi.update(id, data);
    }
  }

  if (item.module === 'bkm_panen') {
    if (item.action === 'CREATE') {
      const { header, details } = item.payload as unknown as BkmPanenQueuePayload;
      const uploaded = await uploadAndCheckpoint(
        item.id,
        details,
        (nextDetails) => ({ ...item.payload, header, details: nextDetails }),
        dependencies,
      );
      const panen = await panenApi.create({ ...header, client_request_id: item.id });
      await Promise.all(uploaded.map((detail, index) =>
        panenApi.addDetail({ ...detail, client_detail_id: `${item.id}:${index}`, bkm_panen_id: panen.id })
      ));
      if (item.payload.submit !== false && panen.status === 'DRAFT') await panenApi.update(panen.id, { status: 'SUBMITTED' });
    } else if (item.action === 'UPDATE') {
      const payload = item.payload as unknown as BkmPanenUpdateQueuePayload | { id: string; data: UpdateBkmPanenPayload };
      if ('header' in payload && 'details' in payload) {
        const { id, header, details, deletedDetailIds } = payload;
        const uploaded = await uploadAndCheckpoint(
          item.id,
          details,
          (nextDetails) => ({ ...item.payload, id, header, details: nextDetails, deletedDetailIds }),
          dependencies,
        );
        const current = (await apiClient.get<{ status: string }>(`/bkmPanen/${id}`)).data;
        if (current.status !== 'DRAFT') {
          throw Object.assign(new Error('Dokumen berubah. Periksa perubahan lokal sebelum mencoba kembali.'), { status: 409 });
        }
        await panenApi.update(id, header, item.precondition);
        await Promise.all((deletedDetailIds ?? []).map((detailId) =>
          ignoreAlreadyDeleted(() => panenApi.deleteDetail(detailId))
        ));
        await Promise.all(uploaded.map((detail, index) => {
          const { serverId, ...data } = detail;
          return serverId
            ? panenApi.updateDetail(serverId, data)
            : panenApi.addDetail({ ...data, client_detail_id: `${item.id}:${index}`, bkm_panen_id: id });
        }));
        await panenApi.update(id, { status: 'SUBMITTED' });
      } else {
        return panenApi.update(payload.id, payload.data, item.precondition);
      }
    } else if (item.action === 'DELETE') {
      await ignoreAlreadyDeleted(() => panenApi.delete((item.payload as { id: string }).id));
    } else throw new Error(`Unsupported sync action ${item.module}/${item.action}`);
    return;
  }

  if (item.module === 'bkm_checker') {
    if (item.action === 'CREATE') {
      const { header, details, server_id: serverId, drop_restan_ids: dropped } = item.payload as unknown as BkmCheckerQueuePayload;
      let saved = item.payload;
      // Hold the trip while any Panen it names is still queued here: a half-synced Panen
      // (created, details still failing) would otherwise dead-letter the trip as VALIDATION.
      for (const line of details) {
        const clientId = (line as { bkm_panen_client_request_id?: string }).bkm_panen_client_request_id;
        const state = clientId ? await dependencies.panenState(clientId) : null;
        if (state === 'PENDING' || state === 'IN_FLIGHT') throw Object.assign(new Error('Menunggu Panen terkirim'), { waiting: true });
      }
      try {
        // One item keeps the trip's order: header, then every line, then submit.
        const checker = serverId ? await checkerApi.getById(serverId) : await checkerApi.create({ ...header, client_request_id: item.id });
        if (!serverId) {
          saved = { ...item.payload, server_id: checker.id };
          await dependencies.updateQueuePayload(item.id, saved);
        }
        for (const line of dropped?.length ? checker.details ?? [] : []) {
          if (line.restan_id && dropped?.includes(line.restan_id)) await ignoreAlreadyDeleted(() => checkerApi.deleteDetail(line.id));
        }
        for (const [index, detail] of details.entries()) {
          // A trip line brings its own key so dropping a line never renumbers the rest.
          await checkerApi.addDetail({ client_detail_id: `${item.id}:${index}`, ...detail, bkm_checker_id: checker.id });
        }
        if (item.payload.submit !== false && checker.status === 'DRAFT') await checkerApi.update(checker.id, { status: 'SUBMITTED' });
      } catch (error) {
        // A taken SPB number or a collected restan is for the Mandor to resolve,
        // not to retry: keep why, so the queue screen can offer the fix.
        const conflict = isTripHeader(header) ? tripConflictOf(error) : null;
        if (!conflict) throw error;
        // The Panen is still on this phone's queue (or being sent): keep the trip and retry it later.
        // The server resolves the client id itself once the Panen has synced.
        if (conflict.code === 'PANEN_BELUM_SINKRON' && conflict.bkm_panen_client_request_id) {
          const state = await dependencies.panenState(conflict.bkm_panen_client_request_id);
          if (state === 'PENDING' || state === 'IN_FLIGHT') {
            throw Object.assign(new Error('Menunggu Panen terkirim'), { waiting: true });
          }
        }
        await dependencies.updateQueuePayload(item.id, { ...saved, conflict });
        throw Object.assign(new Error(tripConflictText(conflict, (header as CreateTripPayload).nomor_spb)), { status: 409, code: conflict.code });
      }
    } else if (item.action === 'UPDATE') {
      const { id, data } = item.payload as unknown as { id: string; data: UpdateBkmCheckerPayload };
      return checkerApi.update(id, data, item.precondition);
    } else if (item.action === 'DELETE') {
      await ignoreAlreadyDeleted(() => checkerApi.delete((item.payload as { id: string }).id));
    } else throw new Error(`Unsupported sync action ${item.module}/${item.action}`);
    return;
  }

  if (item.module === 'bkm_rawat') {
    if (item.action === 'CREATE') {
      const { header, details, submit } = item.payload as unknown as QueuedBkmRawatPayload;
      const rawat = await rawatApi.create({
        ...header,
        client_request_id: item.id,
        details: details.map((detail, index) => ({
          ...detail,
          client_detail_id: detail.client_detail_id ?? `${item.id}:${index}`,
        })),
      });
      if (submit && rawat.status === 'DRAFT') await rawatApi.update(rawat.id, { status: 'SUBMITTED' });
    } else if (item.action === 'UPDATE') {
      const { id, data } = item.payload as unknown as { id: string; data: UpdateBkmRawatPayload };
      return rawatApi.update(id, data, item.precondition);
    } else if (item.action === 'DELETE') {
      await ignoreAlreadyDeleted(() => rawatApi.delete((item.payload as { id: string }).id));
    } else throw new Error(`Unsupported sync action ${item.module}/${item.action}`);
    return;
  }

  if (item.module === 'bkm_rawat_detail') {
    if (item.action === 'CREATE') {
      const { documentId, expectedStatus, ...business } = item.payload;
      const data = business as unknown as CreateBkmRawatDetailPayload;
      await rawatApi.addDetail({ ...data, client_detail_id: data.client_detail_id ?? item.id });
    } else if (item.action === 'UPDATE') {
      const { id, data } = item.payload as unknown as { id: string; data: UpdateBkmRawatDetailPayload };
      return rawatApi.updateDetail(id, data, item.precondition);
    } else if (item.action === 'DELETE') {
      await ignoreAlreadyDeleted(() => rawatApi.deleteDetail((item.payload as { id: string }).id));
    } else throw new Error(`Unsupported sync action ${item.module}/${item.action}`);
    return;
  }

  if (item.module === 'bkm_checker_detail' || item.module === 'krani_timbang_detail') {
    const payload = item.payload as { id: string; data: Record<string, unknown> };
    if (item.action !== 'UPDATE') throw new Error('Unsupported detail action');
    if (item.module === 'bkm_checker_detail') return checkerApi.updateDetail(payload.id, payload.data, item.precondition);
    return kraniTimbangApi.updateDetail(payload.id, payload.data);
  }

  if (item.module === 'krani_timbang' && item.action === 'CREATE') {
    const { conflict: _conflict, ...rest } = item.payload as Record<string, unknown>;
    const data = rest as unknown as SubmitStagingPayload;
    try {
      // A `202` (menunggu SPB) is success: the server stores it and matches the trip later. Do not resend.
      await dependencies.staging.submitPayload(data);
      return;
    } catch (error) {
      // The server keys a weighing by its SPB. A duplicate with the same gross and
      // tare is this item's own earlier POST whose response was lost; anything else
      // is a different weighing of the same SPB and stays a conflict for review.
      const existingId = ((error as { data?: { existing_id?: unknown } }).data)?.existing_id;
      if ((error as { status?: number }).status === 409 && typeof existingId === 'string') {
        const filed = await dependencies.staging.getPendingLogById(existingId).catch(() => null);
        if (filed && Number(filed.timbang_isi) === data.timbang_isi && Number(filed.timbang_kosong) === data.timbang_kosong) return;
      }
      return failOrKeepSpbConflict(item.id, rest, error, dependencies);
    }
  }

  if (item.module === 'krani_timbang') {
    const payload = item.payload as { id: string; data: Parameters<typeof kraniTimbangApi.update>[1] };
    if (item.action === 'UPDATE') return kraniTimbangApi.update(payload.id, payload.data);
    else if (item.action === 'DELETE') await kraniTimbangApi.delete(payload.id);
    else throw new Error('Unsupported manual weighing sync action');
    return;
  }

  throw new Error(`Unsupported sync item ${item.module}/${item.action}`);
}
