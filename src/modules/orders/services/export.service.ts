/* eslint-disable prettier/prettier */
import * as fs from 'fs';
import * as path from 'path';
import * as fastcsv from 'fast-csv';
import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';

@Injectable()
export class ExportService {
  constructor(private readonly cacheService: CacheService) {}
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly logger = new Logger(ExportService.name);
  async exportToCSV(data: any[], filename: string): Promise<string> {
    const cacheKey = `export:${filename}`;
    let cachedFilePath;
    try {
      cachedFilePath = await this.cacheService.getCache(cacheKey);
    } catch (error) {
      this.logger.warn(`Error retrieving from cache: ${error.message}`);
      cachedFilePath = null;
    }
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
      this.logger.warn(
        `Filename sanitized from ${filename} to ${sanitizedFilename}`,
      );
    }
    filename = sanitizedFilename;
    const exportDir =
      process.env.EXPORT_DIR || path.resolve(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      try {
        fs.mkdirSync(exportDir, { recursive: true });
      } catch (error) {
        this.logger.error(
          `Failed to create export directory: ${error.message}`,
        );
        throw new Error(`Failed to create export directory: ${error.message}`);
      }
    }
    const filePath = path.resolve(exportDir, `${filename}.csv`);
    const ws = fs.createWriteStream(filePath);
    return new Promise((resolve, reject) => {
      ws.on('finish', async () => {
        try {
          await this.cacheService.setCache(cacheKey, filePath, this.CACHE_TTL);
        } catch (error) {
          this.logger.warn(`Error saving to cache: ${error.message}`);
          // Continue despite cache error
        }
        resolve(filePath);
      });
      ws.on('error', (error) => reject(error));
      fastcsv.write(data, { headers: true }).pipe(ws);
    });
  }
}
