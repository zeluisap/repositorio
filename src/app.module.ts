import { Module, HttpModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './filter/http-exception.filter';
import { UtilService } from './util/util.service';
import { RepositorioModule } from './modules/repositorio/repositorio.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 7000,
      maxRedirects: 5,
    }),

    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          uri: configService.get<string>('MONGODB_URI'),
          useNewUrlParser: true,
          useUnifiedTopology: true,
          connectionName: 'repos',
        };
      },
      inject: [ConfigService],
    }),

    RepositorioModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    UtilService,
  ],
  exports: [UtilService],
})
export class AppModule {}
