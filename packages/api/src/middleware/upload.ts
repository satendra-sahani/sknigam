import multer from 'multer';
import imagekit from '../config/imagekit';

const storage = multer.memoryStorage();

// Accepted mimetypes for the general-purpose `upload` middleware:
//   - images (profile pics, campaign posters, etc.)
//   - Excel (.xlsx / .xls) for bulk voter import
//   - PDF for bulk voter import (ECI electoral-roll PDFs, up to 25MB since
//     scanned per-part PDFs routinely hit 10-20MB)
const ALLOWED_MIMES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/pdf',
]);

export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB — ECI per-part PDFs can be 10-20MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image, Excel (.xlsx/.xls) or PDF files are allowed'));
    }
  },
});

export const uploadToImageKit = async (
  fileBuffer: Buffer,
  fileName: string,
  folder: string = '/election'
): Promise<{ url: string; fileId: string }> => {
  const response = await imagekit.upload({
    file: fileBuffer,
    fileName,
    folder,
  });
  return { url: response.url, fileId: response.fileId };
};
