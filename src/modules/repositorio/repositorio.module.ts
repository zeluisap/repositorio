import { Module, forwardRef } from '@nestjs/common';
import { RepositorioController } from './repositorio.controller';
import { RepositorioService } from './repositorio.service';
import { MulterModule } from '@nestjs/platform-express';
import * as GridFsStorage from 'multer-gridfs-storage';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        return {
          storage: new GridFsStorage({
            options: {
              useNewUrlParser: true,
              useUnifiedTopology: true,
            },
            url: config.get('MONGODB_URI'),
            file: (req, file) => {
              return new Promise((resolve, reject) => {
                let filename = file.originalname.normalize('NFD');
                filename = filename.replace(/ /gi, '_');
                filename = filename.replace(/[^a-zA-Z]+/g, '_');
                resolve({
                  filename: filename.toLocaleLowerCase(),
                });
              });
            },
          }),
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [RepositorioController],
  providers: [RepositorioService],
})
export class RepositorioModule {}
