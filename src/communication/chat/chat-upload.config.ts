import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { extname, join } from 'path';
import { diskStorage, type FileFilterCallback } from 'multer';
import type { Request } from 'express';

// Local disk, not S3/Cloudinary — same reasoning and layout as onboarding-upload.config.ts,
// just a separate subdirectory so the two features' files never collide.
export const CHAT_UPLOADS_DIR = join(
  process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads'),
  'chat-attachments',
);

export function ensureChatUploadsDir(): void {
  mkdirSync(CHAT_UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export const CHAT_ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const chatAttachmentMulterOptions = {
  storage: diskStorage({
    destination: CHAT_UPLOADS_DIR,
    // A random name, not the original filename — avoids collisions and path-traversal tricks
    // hiding in a user-supplied name. The original name is kept separately as metadata.
    filename: (
      _req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, filename: string) => void,
    ) => {
      callback(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    callback: FileFilterCallback,
  ) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(
        new BadRequestException(`Unsupported file type: ${file.mimetype}`),
      );
      return;
    }
    callback(null, true);
  },
  limits: { fileSize: CHAT_ATTACHMENT_MAX_SIZE_BYTES },
};
