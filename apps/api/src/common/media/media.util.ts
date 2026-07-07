import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import sharp = require('sharp');

/** Max sizes enforced for user-uploaded feed/story media. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024; // 30MB

/** Max width (px) images are downscaled to before upload (aspect kept). */
export const MAX_IMAGE_WIDTH = 1080;

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/quicktime', 'video/webm'];

/**
 * Shared multer options for feed/story uploads. The hard fileSize cap is the
 * video limit; the finer per-type validation (image ≤ 5MB) runs in
 * {@link assertValidMediaFiles}. A multer LIMIT_FILE_SIZE error is mapped to a
 * clean 413 by MulterExceptionFilter.
 */
export const mediaMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES },
};

/**
 * Validates mimetype and per-type size for each uploaded file. Throws a
 * BadRequestException (400) with a user-friendly message on the first offender.
 */
export function assertValidMediaFiles(files: Express.Multer.File[]): void {
  for (const file of files) {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');

    if (!ALLOWED_IMAGE_MIME.includes(file.mimetype) && !ALLOWED_VIDEO_MIME.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato de arquivo não suportado. Envie imagens (JPG, PNG, WEBP, GIF) ou vídeos (MP4, MOV, WEBM).',
      );
    }

    if (isImage && file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Imagens devem ter no máximo 5MB.');
    }

    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      throw new BadRequestException('Vídeos devem ter no máximo 30MB.');
    }
  }
}

export interface ProcessedMedia {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

/**
 * Downscales images to at most {@link MAX_IMAGE_WIDTH} wide (keeping aspect,
 * never upscaling) and normalizes EXIF orientation. Videos and animated GIFs
 * are passed through untouched.
 */
export async function processImageBuffer(file: Express.Multer.File): Promise<ProcessedMedia> {
  const passthrough: ProcessedMedia = {
    buffer: file.buffer,
    mimetype: file.mimetype,
    originalname: file.originalname,
  };

  if (!file.mimetype.startsWith('image/') || file.mimetype === 'image/gif') {
    return passthrough;
  }

  try {
    const buffer = await sharp(file.buffer)
      .rotate() // auto-orient based on EXIF, then strip metadata
      .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
      .toBuffer();
    return { buffer, mimetype: file.mimetype, originalname: file.originalname };
  } catch {
    // If processing fails (corrupt/unsupported), fall back to the original.
    return passthrough;
  }
}
