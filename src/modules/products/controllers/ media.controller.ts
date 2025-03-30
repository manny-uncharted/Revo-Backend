import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Param,
  Get,
  Delete,
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

  @Get('url/:media_id')
  async get_Publice_File_Url(@Param('media_id') media_id: number) {
    const url = await this.mediaService.Get_Public_Url(media_id);
    return { public_url: url };
  }

  @Delete('delete/:media_id')
  async delete_media_file(@Param('media_id') media_id: number) {
    const rep = await this.mediaService.Delete_Media_Files(media_id);
    return rep;
  }
}
