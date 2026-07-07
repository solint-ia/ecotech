import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { MulterError } from 'multer';
import { Response } from 'express';

/**
 * Maps multer parsing errors (notably LIMIT_FILE_SIZE) to a clean 413 response
 * instead of the default opaque 500. Registered globally in main.ts.
 */
@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    const message =
      exception.code === 'LIMIT_FILE_SIZE'
        ? 'Arquivo muito grande. Imagens devem ter até 5MB e vídeos até 30MB.'
        : 'Falha ao processar o arquivo enviado.';

    response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message,
      error: 'Payload Too Large',
    });
  }
}
