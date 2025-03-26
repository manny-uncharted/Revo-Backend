/* eslint-disable prettier/prettier */
import * as fs from 'fs';
import * as path from 'path';
import * as fastcsv from 'fast-csv';
import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';

@Injectable()
export class ExportService {
  private readonly cacheService: CacheService;
  private readonly CACHE_TTL = 3600; // 1 hour
  async exportToCSV(data: any[], filename: string): Promise<string> {
    const cacheKey = `export:${filename}`;
    const cachedFilePath = await this.cacheService.getCache(cacheKey);

    if (cachedFilePath && fs.existsSync(cachedFilePath)) {
      return cachedFilePath;
    }
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('Data must be a non-empty array');
    }
    if (!filename || typeof filename !== 'string') {
      throw new Error('Filename must be a non-empty string');
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (sanitizedFilename !== filename) {
      console.warn(
        `Filename sanitized from ${filename} to ${sanitizedFilename}`,
      );
    }
    filename = sanitizedFilename;
    const exportDir =
      process.env.EXPORT_DIR || path.resolve(process.cwd(), 'exports');

    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filePath = path.resolve(exportDir, `${filename}.csv`);

    const ws = fs.createWriteStream(filePath);

    return new Promise((resolve, reject) => {
      ws.on('finish', async () => {
        await this.cacheService.setCache(cacheKey, filePath, this.CACHE_TTL);
        resolve(filePath);
      });
      ws.on('error', (error) => reject(error));

      fastcsv.write(data, { headers: true }).pipe(ws);
    });
  }
}
