import { isAxiosError } from 'axios';
import { apiClient } from './api';
import { bkmPanenApi } from './bkm-panen.service';
import { bkmCheckerApi } from './bkm-checker.service';
import { bkmRawatApi } from './bkm-rawat.service';
import { uploadApi } from './upload.service';
import { useSyncQueueStore } from '@/stores/useSyncQueueStore';
import type { CreateBkmPanenDetailPayload, CreateBkmPanenPayload, UpdateBkmPanenPayload } from '@/types/bkm-panen';
import type { CreateBkmCheckerDetailPayload, CreateBkmCheckerPayload, UpdateBkmCheckerPayload } from '@/types/bkm-checker';
import type { CreateBkmRawatDetailPayload, QueuedBkmRawatPayload, UpdateBkmRawatDetailPayload, UpdateBkmRawatPayload } from '@/types/bkm-rawat';
import type { SyncQueueItem } from '@/types/sync';

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
  header: CreateBkmCheckerPayload;
  details: Omit<CreateBkmCheckerDetailPayload, 'bkm_checker_id'>[];
}

interface ProcessorDependencies {
  panenApi: typeof bkmPanenApi;
  checkerApi: typeof bkmCheckerApi;
  rawatApi: typeof bkmRawatApi;
  upload: typeof uploadApi;
  updateQueuePayload: (id: string, payload: Record<string, unknown>) => Promise<void>;
}

const defaultDependencies: ProcessorDependencies = {
  panenApi: bkmPanenApi,
  checkerApi: bkmCheckerApi,
  rawatApi: bkmRawatApi,
  upload: uploadApi,
  updateQueuePayload: (id, payload) => useSyncQueueStore.getState().updatePayload(id, payload),
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
 */
export async function uploadAndCheckpoint<T extends { foto_url?: string }>(
  itemId: string,
  details: T[],
  buildPayload: (details: T[]) => Record<string, unknown>,
  dependencies: Pick<ProcessorDependencies, 'upload' | 'updateQueuePayload'> = defaultDependencies,
): Promise<T[]> {
  const checkpointed = details.map((detail) => ({ ...detail }));
  for (let index = 0; index < checkpointed.length; index++) {
    const detail = checkpointed[index];
    if (!detail.foto_url?.startsWith('file://')) continue;
    const { url } = await dependencies.upload.uploadImage(detail.foto_url, 'bkm-panen');
    checkpointed[index] = { ...detail, foto_url: url };
    await dependencies.updateQueuePayload(itemId, buildPayload(checkpointed));
  }
  return checkpointed;
}

export async function processItem(
  item: SyncQueueItem,
  dependencies: ProcessorDependencies = defaultDependencies,
) {
  if (!item.payload) throw new Error(`Sync item ${item.id} has no payload`);
  const { panenApi, checkerApi, rawatApi } = dependencies;

  if (item.module === 'bkm_panen') {
    if (item.action === 'CREATE') {
      const { header, details } = item.payload as unknown as BkmPanenQueuePayload;
      const uploaded = await uploadAndCheckpoint(
        item.id,
        details,
        (nextDetails) => ({ header, details: nextDetails }),
        dependencies,
      );
      const panen = await panenApi.create({ ...header, client_request_id: item.id });
      await Promise.all(uploaded.map((detail, index) =>
        panenApi.addDetail({ ...detail, client_detail_id: `${item.id}:${index}`, bkm_panen_id: panen.id })
      ));
      if (panen.status === 'DRAFT') await panenApi.update(panen.id, { status: 'SUBMITTED' });
    } else if (item.action === 'UPDATE') {
      const payload = item.payload as unknown as BkmPanenUpdateQueuePayload | { id: string; data: UpdateBkmPanenPayload };
      if ('header' in payload && 'details' in payload) {
        const { id, header, details, deletedDetailIds } = payload;
        const uploaded = await uploadAndCheckpoint(
          item.id,
          details,
          (nextDetails) => ({ id, header, details: nextDetails, deletedDetailIds }),
          dependencies,
        );
        const current = (await apiClient.get<{ status: string }>(`/bkmPanen/${id}`)).data;
        if (current.status === 'SUBMITTED') return;
        await panenApi.update(id, header);
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
        await panenApi.update(payload.id, payload.data);
      }
    } else if (item.action === 'DELETE') {
      await ignoreAlreadyDeleted(() => panenApi.delete((item.payload as { id: string }).id));
    } else throw new Error(`Unsupported sync action ${item.module}/${item.action}`);
    return;
  }

  if (item.module === 'bkm_checker') {
    if (item.action === 'CREATE') {
      const { header, details } = item.payload as unknown as BkmCheckerQueuePayload;
      const checker = await checkerApi.create({ ...header, client_request_id: item.id });
      await Promise.all(details.map((detail, index) =>
        checkerApi.addDetail({ ...detail, client_detail_id: `${item.id}:${index}`, bkm_checker_id: checker.id })
      ));
      if (checker.status === 'DRAFT') await checkerApi.update(checker.id, { status: 'SUBMITTED' });
    } else if (item.action === 'UPDATE') {
      const { id, data } = item.payload as unknown as { id: string; data: UpdateBkmCheckerPayload };
      await checkerApi.update(id, data);
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
      await rawatApi.update(id, data);
    } else if (item.action === 'DELETE') {
      await ignoreAlreadyDeleted(() => rawatApi.delete((item.payload as { id: string }).id));
    } else throw new Error(`Unsupported sync action ${item.module}/${item.action}`);
    return;
  }

  if (item.module === 'bkm_rawat_detail') {
    if (item.action === 'CREATE') {
      const data = item.payload as unknown as CreateBkmRawatDetailPayload;
      await rawatApi.addDetail({ ...data, client_detail_id: data.client_detail_id ?? item.id });
    } else if (item.action === 'UPDATE') {
      const { id, data } = item.payload as unknown as { id: string; data: UpdateBkmRawatDetailPayload };
      await rawatApi.updateDetail(id, data);
    } else if (item.action === 'DELETE') {
      await ignoreAlreadyDeleted(() => rawatApi.deleteDetail((item.payload as { id: string }).id));
    } else throw new Error(`Unsupported sync action ${item.module}/${item.action}`);
    return;
  }

  throw new Error(`Unsupported sync item ${item.module}/${item.action}`);
}
