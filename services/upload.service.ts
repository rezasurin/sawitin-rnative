import { apiClient } from './api';

export const uploadApi = {
  uploadImage: async (uri: string, folder: string): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: `photo_${Date.now()}.jpg`,
    } as any);
    formData.append('folder', folder);

    const response = await apiClient.post('/upload/bkm-panen-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
