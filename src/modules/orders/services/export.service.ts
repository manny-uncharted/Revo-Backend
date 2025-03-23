/* eslint-disable prettier/prettier */
import * as fs from 'fs';
import * as path from 'path';
import * as fastcsv from 'fast-csv';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ExportService {
  async exportToCSV(data: any[], filename: string) {
    const ws = fs.createWriteStream(path.resolve(__dirname, `${filename}.csv`));
    fastcsv.write(data, { headers: true }).pipe(ws);
  }
}
