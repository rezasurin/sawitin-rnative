import * as FileSystem from 'expo-file-system/legacy';
import { uploadApi, type UploadFolder } from './upload.service';
import { isLocalFoto, type FotoItem } from '@/utils/foto';

/**
 * Uploads each photo still on the device, keeping the order. `cache` maps a
 * local URI to its upload, so a save retried after an error uploads nothing twice.
 */
export async function uploadFotos(foto: FotoItem[], folder: UploadFolder, cache: Map<string, FotoItem>) {
  const uploaded: FotoItem[] = [];
  for (const item of foto) {
    if (!isLocalFoto(item.url)) { uploaded.push(item); continue; }
    let done = cache.get(item.url);
    if (!done) {
      const media = await uploadApi.uploadImage(item.url, folder);
      done = { url: media.url, hash: media.hash, bytes: media.bytes };
      cache.set(item.url, done);
    }
    uploaded.push(done);
  }
  return uploaded;
}

/**
 * Copies each camera or gallery photo into the document directory, beside the
 * queue, so it outlives the picker's cache and an app restart. The sync pass
 * uploads it. Named after the queue key and the source file, so a second save
 * attempt reuses the copy.
 */
export async function keepFotosOffline(foto: FotoItem[], key: string) {
  const dir = FileSystem.documentDirectory;
  if (!foto.some((item) => isLocalFoto(item.url))) return foto;
  if (!dir) throw new Error('Penyimpanan foto offline tidak tersedia.');
  return Promise.all(foto.map(async (item) => {
    if (!isLocalFoto(item.url) || item.url.startsWith(dir)) return item;
    const path = `${dir}${key}_${item.url.split('/').pop()}`;
    if (!(await FileSystem.getInfoAsync(path)).exists) await FileSystem.copyAsync({ from: item.url, to: path });
    return { url: path };
  }));
}
