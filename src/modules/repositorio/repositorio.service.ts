import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, isValidObjectId } from 'mongoose';
import { GridFSBucketReadStream } from 'mongodb';
import { MongoGridFS } from 'mongo-gridfs';
import path = require('path');
import * as filepreview from 'filepreview-es6';
import * as sharp from 'sharp';
import { MetadataScanner } from '@nestjs/core';
import { parse } from 'path';
const sizeOf = require('image-size');

@Injectable()
export class RepositorioService {
  private fileModel: MongoGridFS;

  constructor(@InjectConnection() private connection: Connection) {
    this.fileModel = new MongoGridFS(this.connection.db, 'fs');
  }

  async findInfo(objOuId) {
    const id = this.getIdString(objOuId);

    const result = await this.fileModel
      .findById(id)
      .catch(err => {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      })
      .then(result => result);

    return {
      ...result.metadata,
      id: result._id,
      _id: result._id.toString(),
      filename: result.filename,
      length: result.length,
      chunkSize: result.chunkSize,
      md5: result.md5,
      contentType: result.contentType,
      imagem: this.isImagem(result),
      link_download: '/repositorio/download/' + result._id,
      link_preview: '/repositorio/preview/' + result._id,
    };
  }

  async prepara(arquivo, dto) {
    const novo = await this.redimensiona(arquivo, dto);
    return await this.findInfo(novo);
  }

  async redimensiona(arquivo, params) {
    const size: any = await this.getTamanhoImagem(arquivo);
    if (size.width <= 1000) {
      return arquivo;
    }

    const id = this.getIdString(arquivo);

    const buffer = await this.getBufer(id);

    const path = `/tmp/resizefile_${id}.png`;

    await sharp(buffer)
      .resize(1000)
      .png()
      .toFile(path);

    const infoFile = parse(arquivo.filename);

    return await this.fileModel.uploadFile(path, {
      filename: `${infoFile.name}.png`,
      contentType: 'image/png',
      metadata: {
        originalId: id,
        ...params,
      },
    });
  }

  async getBufer(objOuId) {
    return new Promise(async (resolve, reject) => {
      try {
        const id = this.getIdString(objOuId);
        if (!id) {
          throw new Error('Arquivo não localizado.');
        }

        const stream = await this.readStream(id);

        const chunks = [];

        stream
          .on('data', function(chunk) {
            chunks.push(chunk);
          })
          .on('end', function() {
            var buffer = Buffer.concat(chunks);
            return resolve(buffer);
          });
      } catch (error) {
        return reject(error);
      }
    });
  }

  getIdString(arquivo) {
    if (!arquivo) {
      return null;
    }

    if (typeof arquivo === 'string') {
      return arquivo;
    }

    if (arquivo.id) {
      if (typeof arquivo.id === 'object') {
        return arquivo.id.toString();
      }

      return arquivo.id;
    }

    return arquivo._id;
  }

  async getTamanhoImagem(arquivo) {
    const buffer = await this.getBufer(arquivo);
    if (!buffer) {
      throw new Error('Buffer do arquivo não disponível.');
    }

    return sizeOf(buffer);
  }

  readStream(id: string): Promise<GridFSBucketReadStream> {
    return this.fileModel.readFileStream(id);
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

  async geraPreview(id, params = null) {
    if (!id) {
      throw new Error('Nenhum ID informado.');
    }

    if (!isValidObjectId(id)) {
      throw new Error('ID do arquivo inválido.');
    }

    const info = await this.findInfo(id);
    if (!info) {
      throw new Error('Arquivo não localizado.');
    }

    var options = {
      width: 300,
      quality: 90,
      background: '#fff',
      pdf: true,
      keepAspect: false,
      pdf_path: '/tmp/pdfs',
      ...params,
    };

    const filePath = await this.fileModel.downloadFile(id, {
      filename: info.filename,
      targetDir: '/tmp',
    });

    const outPath = `/tmp/preview_${id}_${options.width}.png`;

    const previews = await this.fileModel.find({
      filename: outPath,
    });

    if (previews && previews.length) {
      return await this.findInfo(previews.shift());
    }

    const resposta = await filepreview.generateAsync(
      filePath,
      outPath,
      options,
    );

    const { thumbnail } = resposta;

    const resp = await this.fileModel.uploadFile(thumbnail, {
      filename: thumbnail,
      contentType: 'image/png',
    });

    return await this.findInfo(resp);
  }
}
