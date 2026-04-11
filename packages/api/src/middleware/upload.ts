import multer from 'multer';
import imagekit from '../config/imagekit';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only image and Excel files are allowed'));
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
