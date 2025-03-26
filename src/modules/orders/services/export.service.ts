/* eslint-disable prettier/prettier */
import * as fs from 'fs';
import * as path from 'path';
import * as fastcsv from 'fast-csv';
import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';

@Injectable()
export class ExportService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly cacheService: CacheService) {}

  private ensureExportDirExists(exportDir: string): void {
    if (!fs.existsSync(exportDir)) {
      try {
        fs.mkdirSync(exportDir, { recursive: true });
        this.logger.log(`Export directory created at: ${exportDir}`);
      } catch (error) {
        this.logger.error(
          `Failed to create export directory: ${error.message}`,
        );
        throw new Error(`Failed to create export directory: ${error.message}`);
      }
    }
  }

  async streamExportToCSV(
    dataStream: AsyncIterable<any[]> | NodeJS.ReadableStream,
    filename: string,
  ): Promise<string> {
    if (!dataStream) {
      throw new Error('Data stream is required');
    }

    if (!filename || typeof filename !== 'string') {
      throw new Error('Filename must be a non-empty string');
    }
    let sanitizedFilename = filename
      .trim()
      .replace(/\.{2,}/g, '')
      .replace(/[^a-zA-Z0-9_.-]/g, '_')
      .replace(/^\./, '_');

    // Check cache first
    const cacheKey = `export:${sanitizedFilename}`;
    try {
      const cachedFilePath = await this.cacheService.getCache(cacheKey);
      if (cachedFilePath && fs.existsSync(cachedFilePath)) {
        this.logger.log(`Using cached export file: ${cachedFilePath}`);
        return cachedFilePath;
      }
    } catch (error) {
      this.logger.warn(`Error retrieving from cache: ${error.message}`);
      // Continue with export if cache retrieval fails
    }

    if (sanitizedFilename.length > 255) {
      sanitizedFilename = sanitizedFilename.substring(0, 255);
      this.logger.warn(`Filename truncated to 255 characters`);
    }
    if (sanitizedFilename !== filename) {
      this.logger.warn(
        `Filename sanitized from ${filename} to ${sanitizedFilename}`,
      );
    }

    filename = sanitizedFilename;
    const exportDir =
      process.env.EXPORT_DIR || path.resolve(process.cwd(), 'exports');
    this.ensureExportDirExists(exportDir);

    const filePath = path.resolve(exportDir, `${sanitizedFilename}.csv`);
    const ws = fs.createWriteStream(filePath);
    const csvStream = fastcsv.format({ headers: true });
    csvStream.pipe(ws);

    return new Promise(async (resolve, reject) => {
      const writeTimeout = setTimeout(
        () => {
          csvStream.end();
          reject(new Error('CSV export operation timed out'));
        },
        30 * 60 * 1000,
      );

      try {
        if (Symbol.asyncIterator in Object(dataStream)) {
          (async () => {
            for await (const chunk of dataStream as AsyncIterable<any[]>) {
              for (const row of chunk) {
                csvStream.write(row);
              }
            }
          })().catch((error) => reject(error));
        } else {
          const stream = dataStream as NodeJS.ReadableStream;
          stream.on('data', (chunk) => {
            if (Array.isArray(chunk)) {
              for (const row of chunk) {
                csvStream.write(row);
              }
            } else {
              csvStream.write(chunk);
            }
          });
          stream.on('error', (err) => reject(err));
          await new Promise((resolveStream) => stream.on('end', resolveStream));
        }

        csvStream.end();
        ws.on('finish', async () => {
          clearTimeout(writeTimeout);
          try {
            await this.cacheService.setCache(
              `export:${sanitizedFilename}`,
              filePath,
              this.CACHE_TTL,
            );
          } catch (error) {
            this.logger.warn(`Error saving to cache: ${error.message}`);
          }
          resolve(filePath);
        });
        ws.on('error', (error) => {
          clearTimeout(writeTimeout);
          reject(error);
        });
      } catch (error) {
        clearTimeout(writeTimeout);
        reject(error);
      }
    });
  }
}
