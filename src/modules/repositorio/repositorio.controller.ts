import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  Get,
  Param,
  Res,
  Response,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RepositorioService } from './repositorio.service';
import { NegocioException } from 'src/exceptions/negocio-exception';

@Controller('repositorio')
export class RepositorioController {
  constructor(private service: RepositorioService) {}

  @UseInterceptors(FileInterceptor('arquivo'))
  @Post()
  upload(@UploadedFile() arquivo, @Body() dto) {
    return this.service.prepara(arquivo, dto);
  }

  @Get('download/:id')
  async downloadFile(@Param('id') id: string, @Res() res) {
    const file = await this.service.findInfo(id);
    const filestream = await this.service.readStream(id);
    if (!filestream) {
      throw new HttpException(
        'An error occurred while retrieving file',
        HttpStatus.EXPECTATION_FAILED,
      );
    }
    res.header('Content-Type', file.contentType);
    res.header('Content-Disposition', 'attachment; filename=' + file.filename);
    return filestream.pipe(res);
  }

  @Get('preview/:id')
  async preview(@Param('id') id: string, @Query() params, @Res() res) {
    const file = await this.service.geraPreview(id, params);
    if (!file) {
      throw new HttpException(
        'An error occurred while retrieving file',
        HttpStatus.EXPECTATION_FAILED,
      );
    }

    return await this.downloadFile(file._id.toString(), res);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const file = await this.service.findInfo(id);
    if (!file) {
      throw new NegocioException('Arquivo não localizado!');
    }
    return file;
  }
}
