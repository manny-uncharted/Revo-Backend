import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from './modules/logging/services/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = app.get(LoggerService);
  logger.setContext('Bootstrap');

  app.useLogger(logger);

  await app.listen(process.env.PORT ?? 3000);

  logger.info(
    `Application is running on: http://localhost:${process.env.PORT}`,
  );
}
bootstrap();
