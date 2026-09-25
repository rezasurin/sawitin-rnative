import { apiClient } from './api';

export interface UploadedMedia {
  url: string;
  /** SHA-256 of the stored bytes; record it on the document row. */
  hash: string;
  bytes: number;
}

export type UploadFolder =
  | 'bkm-panen'
  | 'bkm-checker'
  | 'bkm-rawat'
  | 'observasi'
  | 'tiket-pks';

export const uploadApi = {
  /**
   * Store one photograph and get back the URL, hash and size to record on the
   * detail row.
   *
   * The server keys objects by content hash, so re-uploading the same file
   * after a dropped connection returns the original URL with `200` rather than
   * writing a second object — which is what makes retrying a whole upload safe
   * and is why no chunked resume protocol exists. Both `200` and `201` are
   * success; axios treats them alike.
   */
  uploadImage: async (uri: string, folder: UploadFolder): Promise<UploadedMedia> => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: `photo_${Date.now()}.jpg`,
    } as any);
    formData.append('folder', folder);

    const response = await apiClient.post<UploadedMedia>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
