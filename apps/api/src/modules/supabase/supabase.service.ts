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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    const filename = `${folder}/${uniqueSuffix}${ext}`;

    const { data, error } = await this.supabase.storage
      .from('uploads')
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
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
