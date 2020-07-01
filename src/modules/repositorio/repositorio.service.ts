import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucketReadStream } from 'mongodb';
import { MongoGridFS } from 'mongo-gridfs';

@Injectable()
export class RepositorioService {
  private fileModel: MongoGridFS;

  constructor(@InjectConnection() private connection: Connection) {
    this.fileModel = new MongoGridFS(this.connection.db, 'fs');
  }

  async readStream(id: string): Promise<GridFSBucketReadStream> {
    return await this.fileModel.readFileStream(id);
  }

  async findInfo(id: string) {
    const result = await this.fileModel
      .findById(id)
      .catch(err => {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      })
      .then(result => result);

    return {
      id: result._id,
      filename: result.filename,
      length: result.length,
      chunkSize: result.chunkSize,
      md5: result.md5,
      contentType: result.contentType,
      imagem: this.isImagem(result),
      link_download: '/repositorio/download/' + result._id,
    };
  }

  async deleteFile(id: string): Promise<boolean> {
    return await this.fileModel.delete(id);
  }

  isImagem(arquivo) {
    if (!(arquivo && arquivo.contentType)) {
      return false;
    }
    return arquivo.contentType.toLowerCase().startsWith('image/');
  }
}
