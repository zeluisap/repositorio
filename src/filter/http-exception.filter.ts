import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Youch from 'youch';
import { NegocioException } from 'src/exceptions/negocio-exception';
import * as _ from 'lodash';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private configService: ConfigService) {}

  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const node_env = this.configService.get<string>('NODE_ENV');

    let messages = [];
    if (exception.status === 400) {
      messages = _.get(exception, 'response.message');
    }

    let errorMessage = exception.message || exception.error;

    if (node_env !== 'development') {
      errorMessage = 'Erro interno do servidor, avise o administrador!';
    }

    if (exception instanceof NegocioException) {
      errorMessage = exception.message;
    }

    if (exception instanceof UnauthorizedException) {
      errorMessage = 'Falha de Autenticação.';
    }

    // if (exception instanceof HttpException) {
    //   errorMessage = exception.message;
    // }

    return response.status(status).json({
      error: {
        message: errorMessage,
        messages,
      },
    });
  }
}
