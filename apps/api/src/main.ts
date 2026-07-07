import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { MulterExceptionFilter } from './common/filters/multer-exception.filter';

import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  const configService = app.get(ConfigService);
  const frontendUrls = configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  const origins = frontendUrls.split(',').map(url => url.trim());
  
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.useGlobalFilters(new MulterExceptionFilter());

  const port = configService.get('PORT') || 3333;
  await app.listen(port);
}
bootstrap();

