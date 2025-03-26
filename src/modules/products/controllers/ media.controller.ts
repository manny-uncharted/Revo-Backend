import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Param,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from '../services/media.service';
import { storageConfig } from '../../../config/storage.config';

@Controller('media')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', storageConfig))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return await this.mediaService.Upload_Media(file);
  }

  @Get('secure-url/:media_id')
  async getSecureFileUrl(@Param('media_id') media_id: number) {
    const url = await this.mediaService.Generate_Signed_Url(media_id);
    return { secure_url: url };
  }
}
