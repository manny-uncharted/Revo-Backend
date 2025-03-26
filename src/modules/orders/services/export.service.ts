/* eslint-disable prettier/prettier */
import * as fs from 'fs';
import * as path from 'path';
import * as fastcsv from 'fast-csv';
import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';

@Injectable()
export class ExportService {
  ensureExportDirExists: any;
  constructor(private readonly cacheService: CacheService) {}
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly logger = new Logger(ExportService.name);
  async streamExportToCSV(
    dataStream: AsyncIterable<any[]> | NodeJS.ReadableStream,
    filename: string,
  ): Promise<string> {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');

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
        if (Symbol.asyncIterator in dataStream) {
          for await (const chunk of dataStream as AsyncIterable<any[]>) {
            for (const row of chunk) {
              csvStream.write(row);
            }
          }
        } else {
          const stream = dataStream as NodeJS.ReadableStream;
          stream.on('data', (chunk) => {
            for (const row of chunk) {
              csvStream.write(row);
            }
          });

          await new Promise((resolveStream) => {
            stream.on('end', resolveStream);
            stream.on('error', (err) => reject(err));
          });
        }

        csvStream.end();
        clearTimeout(writeTimeout);

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
      } catch (error) {
        clearTimeout(writeTimeout);
        csvStream.end();
        reject(error);
      }
    });
  }
}
