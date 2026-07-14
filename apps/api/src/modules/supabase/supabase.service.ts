import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { extname } from 'path';
import * as WebSocket from 'ws';

// Injeta o suporte a WebSocket no escopo global para o Supabase no Node.js 20
if (!(globalThis as any).WebSocket) {
  (globalThis as any).WebSocket = WebSocket;
}

@Injectable()
export class SupabaseService {
  private readonly supabase: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SECRET_KEY');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn('Supabase URL or Key is missing. File uploads will fail.');
    }

    this.supabase = createClient(supabaseUrl || '', supabaseKey || '', {
      auth: {
        persistSession: false,
      },
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    return this.uploadBuffer(file.buffer, file.mimetype, file.originalname, folder);
  }

  /**
   * Uploads to an exact, caller-chosen path (no random suffix), overwriting in place
   * (upsert). Used for assets that must live at a stable, predictable location per
   * record (e.g. one PDF per educational point) so regeneration/replacement doesn't
   * leave the old file at a different path.
   */
  async uploadFileAt(file: Express.Multer.File, storagePath: string): Promise<string> {
    return this.uploadBufferAt(file.buffer, file.mimetype, storagePath);
  }

  async uploadBufferAt(buffer: Buffer, mimetype: string, storagePath: string): Promise<string> {
    const { error } = await this.supabase.storage
      .from('uploads')
      .upload(storagePath, buffer, {
        contentType: mimetype,
        upsert: true,
      });

    if (error) {
      this.logger.error(`Error uploading to Supabase at ${storagePath}: ${error.message}`);
      throw new Error('Falha ao enviar o arquivo.');
    }

    return this.getPublicUrl(storagePath);
  }

  /**
   * Resolves the public URL of a storage path without uploading anything. Lets a
   * caller reference an asset that lives at a deterministic path (e.g. a point's
   * generated PDF) before the file itself has been written.
   */
  getPublicUrl(storagePath: string): string {
    const { data } = this.supabase.storage.from('uploads').getPublicUrl(storagePath);
    return data.publicUrl;
  }

  async uploadBuffer(buffer: Buffer, mimetype: string, originalname: string, folder: string): Promise<string> {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(originalname) || '';
    const filename = `${folder}/${uniqueSuffix}${ext}`;

    const { data, error } = await this.supabase.storage
      .from('uploads')
      .upload(filename, buffer, {
        contentType: mimetype,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Error uploading to Supabase: ${error.message}`);
      throw new Error('Falha ao enviar o arquivo.');
    }

    const { data: publicUrlData } = this.supabase.storage.from('uploads').getPublicUrl(filename);
    return publicUrlData.publicUrl;
  }

  async deleteFile(publicUrl: string): Promise<void> {
    try {
      const urlParts = publicUrl.split('/uploads/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        const { error } = await this.supabase.storage.from('uploads').remove([filePath]);
        if (error) {
          this.logger.error(`Error deleting from Supabase: ${error.message}`);
        }
      }
    } catch (err) {
      this.logger.error(`Error processing delete for URL: ${publicUrl}`);
    }
  }
}
