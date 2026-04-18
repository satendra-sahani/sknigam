import { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_URL_ENDPOINT } from '../utils/constants';
import api from './api';

interface UploadResult {
  url: string;
  fileId: string;
  name: string;
  thumbnailUrl: string;
}

/**
 * Upload an image to ImageKit via the backend auth endpoint.
 * The backend provides the authentication signature.
 */
export async function uploadImage(
  imageUri: string,
  fileName: string,
  folder: string = '/election',
): Promise<UploadResult> {
  // Step 1: Get auth params from our backend
  const authResponse = await api.get('/imagekit/auth');
  const { token, expire, signature } = authResponse.data.data;

  // Step 2: Upload to ImageKit
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: fileName,
  } as any);
  formData.append('publicKey', IMAGEKIT_PUBLIC_KEY);
  formData.append('signature', signature);
  formData.append('expire', expire.toString());
  formData.append('token', token);
  formData.append('fileName', fileName);
  formData.append('folder', folder);
  formData.append('useUniqueFileName', 'true');

  const uploadResponse = await fetch(
    'https://upload.imagekit.io/api/v1/files/upload',
    {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    },
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`ImageKit upload failed: ${errorText}`);
  }

  const result = await uploadResponse.json();

  return {
    url: result.url,
    fileId: result.fileId,
    name: result.name,
    thumbnailUrl: result.thumbnailUrl || result.url,
  };
}

/**
 * Upload multiple images in parallel.
 */
export async function uploadMultipleImages(
  images: Array<{ uri: string; fileName: string }>,
  folder: string = '/pollstics/uploads',
): Promise<UploadResult[]> {
  const uploadPromises = images.map((img) =>
    uploadImage(img.uri, img.fileName, folder),
  );
  return Promise.all(uploadPromises);
}

/**
 * Generate a unique file name for an upload.
 */
export function generateFileName(prefix: string, extension: string = 'jpg'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}.${extension}`;
}
