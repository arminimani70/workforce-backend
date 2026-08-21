import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true keeps req.rawBody populated alongside the parsed body — the billing webhook
  // needs the exact original bytes to verify Lemon Squeezy's HMAC signature.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  app.enableCors();
  // Default express JSON limit (100kb) is too small for a base64 profile photo — see
  // UpdateProfileDto's avatarUrl cap (~700,000 chars raw, comfortably under 2mb with request
  // overhead).
  app.useBodyParser('json', { limit: '2mb' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
