import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: Joi.object({
        APP_PORT: Joi.number().default(3000),
        APP_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        DB_PATH: Joi.string().default('./data/app.db'),
        UPLOAD_MAX_SIZE: Joi.number().default(10485760),
        UPLOAD_DIR: Joi.string().default('./uploads'),
      }),
    }),
  ],
})
export class AppConfigModule {}
